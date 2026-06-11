import { getAdmin } from "@/lib/insforge/admin";

/**
 * Span ↔ commit time-window attribution.
 *
 * work_spans say where the tokens went; commits say what shipped. This module
 * joins the two halves: a commit matches a span when both belong to the same
 * team member and repo, and the commit was authored inside the span's window
 * (or within a short trailing window — people review, then commit).
 *
 * Every span is assigned to AT MOST one commit (the nearest match in time),
 * so per-commit costs sum exactly to the attributed total — no double
 * counting. Spans with no matching commit are the honest remainder
 * (exploration, abandoned work, uncommitted changes); the coverage ratio
 * surfaces them instead of hiding them.
 */

/** Commits usually land shortly after the work: allow this much trailing gap. */
const COMMIT_TRAIL_MS = 30 * 60 * 1000;

type SpanRow = {
  id: string;
  session_id: string;
  user_id: string;
  started_at: string;
  ended_at: string;
  git_branch: string | null;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_creation_tokens: number;
  message_count: number;
};

type CommitRow = {
  id: string;
  user_id: string;
  repo_root_hash: string;
  sha: string;
  author_email: string;
  authored_at: string;
  subject: string;
  branch: string | null;
  files_changed: number;
  insertions: number;
  deletions: number;
};

type SessionRepoRow = {
  id: string;
  repo_root_hash: string | null;
  project_name: string | null;
  tool: string;
};

export type AttributedCommit = {
  sha: string;
  subject: string;
  authoredAt: Date;
  userId: string;
  repoRootHash: string;
  projectName: string | null;
  filesChanged: number;
  insertions: number;
  deletions: number;
  /** Cost side, summed over the spans assigned to this commit. */
  spanCount: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  /** Wall-clock work time: sum of assigned span durations. */
  workMs: number;
};

export type AttributionCoverage = {
  totalSpans: number;
  attributedSpans: number;
  /** input+output tokens (cache excluded — it's priced differently). */
  totalSpanTokens: number;
  attributedSpanTokens: number;
  /** attributedSpanTokens / totalSpanTokens; null when there are no spans. */
  coverageRatio: number | null;
};

export type CommitAttribution = {
  commits: AttributedCommit[];
  coverage: AttributionCoverage;
};

/**
 * Join the team's work spans against its commits within a time window and
 * compute per-commit cost plus the attribution-coverage ratio (the badge).
 */
export async function getCommitAttribution(
  teamId: string,
  since: Date | null,
  options?: { userId?: string }
): Promise<CommitAttribution> {
  const admin = getAdmin();

  // Sessions provide the span→repo join key (repo_root_hash lives on the session).
  let sessionQ = admin.database
    .from("sessions")
    .select("id, repo_root_hash, project_name, tool")
    .eq("team_id", teamId)
    .not("repo_root_hash", "is", null);
  if (since) sessionQ = sessionQ.gte("started_at", since.toISOString());
  if (options?.userId) sessionQ = sessionQ.eq("user_id", options.userId);

  let spanQ = admin.database
    .from("work_spans")
    .select(
      "id, session_id, user_id, started_at, ended_at, git_branch, input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens, message_count"
    )
    .eq("team_id", teamId);
  if (since) spanQ = spanQ.gte("started_at", since.toISOString());
  if (options?.userId) spanQ = spanQ.eq("user_id", options.userId);

  // Commits slightly outside the window can still claim in-window spans.
  let commitQ = admin.database
    .from("commits")
    .select(
      "id, user_id, repo_root_hash, sha, author_email, authored_at, subject, branch, files_changed, insertions, deletions"
    )
    .eq("team_id", teamId);
  if (since) commitQ = commitQ.gte("authored_at", since.toISOString());
  if (options?.userId) commitQ = commitQ.eq("user_id", options.userId);

  const [{ data: sessionData }, { data: spanData }, { data: commitData }] = await Promise.all([
    sessionQ.limit(10000),
    spanQ.limit(10000),
    commitQ.limit(10000),
  ]);

  const sessions = (sessionData as SessionRepoRow[] | null) ?? [];
  const spans = (spanData as SpanRow[] | null) ?? [];
  const commits = (commitData as CommitRow[] | null) ?? [];

  const sessionById = new Map(sessions.map((s) => [s.id, s]));

  // Index commits by (user, repo) for the candidate lookup.
  const commitsByKey = new Map<string, CommitRow[]>();
  for (const c of commits) {
    const key = `${c.user_id}:${c.repo_root_hash}`;
    const list = commitsByKey.get(key) ?? [];
    list.push(c);
    commitsByKey.set(key, list);
  }
  for (const list of commitsByKey.values()) {
    list.sort((a, b) => Date.parse(a.authored_at) - Date.parse(b.authored_at));
  }

  // Assign each span to the nearest commit authored within
  // [span start, span end + trail]. Nearest = smallest |authored - span end|,
  // because work accumulates toward the commit that ships it.
  const spansByCommit = new Map<string, SpanRow[]>();
  let attributedSpans = 0;
  let attributedSpanTokens = 0;
  let totalSpanTokens = 0;

  for (const span of spans) {
    const session = sessionById.get(span.session_id);
    const spanTokens = span.input_tokens + span.output_tokens;
    totalSpanTokens += spanTokens;
    if (!session?.repo_root_hash) continue;

    const candidates = commitsByKey.get(`${span.user_id}:${session.repo_root_hash}`);
    if (!candidates) continue;

    const start = Date.parse(span.started_at);
    const end = Date.parse(span.ended_at);
    // Branch agreement (when both sides know it) beats pure time proximity:
    // a branch-matching commit wins over a nearer commit on another branch.
    let best: CommitRow | null = null;
    let bestDist = Infinity;
    let bestBranchMatch = false;
    for (const c of candidates) {
      const t = Date.parse(c.authored_at);
      if (t < start) continue;
      if (t > end + COMMIT_TRAIL_MS) break; // candidates are time-sorted
      const branchMatch = Boolean(span.git_branch && c.branch && span.git_branch === c.branch);
      const dist = Math.abs(t - end);
      if (branchMatch && !bestBranchMatch) {
        best = c;
        bestDist = dist;
        bestBranchMatch = true;
      } else if (branchMatch === bestBranchMatch && dist < bestDist) {
        best = c;
        bestDist = dist;
      }
    }
    if (!best) continue;

    attributedSpans++;
    attributedSpanTokens += spanTokens;
    const list = spansByCommit.get(best.id) ?? [];
    list.push(span);
    spansByCommit.set(best.id, list);
  }

  // Project names for display, via any session that matched the commit's repo.
  const projectByRepo = new Map<string, string | null>();
  for (const s of sessions) {
    if (s.repo_root_hash && !projectByRepo.has(s.repo_root_hash)) {
      projectByRepo.set(s.repo_root_hash, s.project_name);
    }
  }

  const attributed: AttributedCommit[] = commits
    .map((c) => {
      const assigned = spansByCommit.get(c.id) ?? [];
      let input = 0;
      let output = 0;
      let cacheRead = 0;
      let cacheCreation = 0;
      let workMs = 0;
      for (const s of assigned) {
        input += s.input_tokens;
        output += s.output_tokens;
        cacheRead += s.cache_read_tokens;
        cacheCreation += s.cache_creation_tokens;
        workMs += Math.max(0, Date.parse(s.ended_at) - Date.parse(s.started_at));
      }
      return {
        sha: c.sha,
        subject: c.subject,
        authoredAt: new Date(c.authored_at),
        userId: c.user_id,
        repoRootHash: c.repo_root_hash,
        projectName: projectByRepo.get(c.repo_root_hash) ?? null,
        filesChanged: c.files_changed,
        insertions: c.insertions,
        deletions: c.deletions,
        spanCount: assigned.length,
        inputTokens: input,
        outputTokens: output,
        cacheReadTokens: cacheRead,
        cacheCreationTokens: cacheCreation,
        workMs,
      };
    })
    .sort((a, b) => b.authoredAt.getTime() - a.authoredAt.getTime());

  return {
    commits: attributed,
    coverage: {
      totalSpans: spans.length,
      attributedSpans,
      totalSpanTokens,
      attributedSpanTokens,
      coverageRatio: totalSpanTokens > 0 ? attributedSpanTokens / totalSpanTokens : null,
    },
  };
}

export type CommitCostRow = AttributedCommit & { userName: string | null };

/** Attribution plus display names, ready for the dashboard card. */
export async function getCommitCosts(
  teamId: string,
  since: Date | null,
  limit = 10
): Promise<{
  commits: CommitCostRow[];
  coverage: AttributionCoverage;
  unmatchedCommitCount: number;
}> {
  const { commits, coverage } = await getCommitAttribution(teamId, since);

  const attributed = commits.filter((c) => c.spanCount > 0);
  const userIds = [...new Set(attributed.map((c) => c.userId))];
  const namesById = new Map<string, string>();
  if (userIds.length > 0) {
    const admin = getAdmin();
    const { data } = await admin.database.from("profiles").select("id, name").in("id", userIds);
    for (const p of (data as { id: string; name: string | null }[] | null) ?? []) {
      namesById.set(p.id, p.name?.trim() || "Member");
    }
  }

  return {
    commits: attributed
      .slice(0, limit)
      .map((c) => ({ ...c, userName: namesById.get(c.userId) ?? null })),
    coverage,
    unmatchedCommitCount: commits.length - attributed.length,
  };
}
