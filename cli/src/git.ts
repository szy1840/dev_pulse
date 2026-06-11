import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import type { CommitMetadata } from "./types.js";

/** First run looks this far back; later runs are incremental via state.json. */
const INITIAL_LOOKBACK_DAYS = 90;
/** Re-scan overlap so commits pushed/rebased around the last sync aren't missed. */
const RESYNC_OVERLAP_MS = 7 * 24 * 60 * 60 * 1000;
/** Hard cap per repo per sync so a monorepo first-run stays bounded. */
const MAX_COMMITS_PER_REPO = 2000;

function git(cwd: string, args: string[]): string | null {
  try {
    return execFileSync("git", ["-C", cwd, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 30_000,
      maxBuffer: 32 * 1024 * 1024,
    });
  } catch {
    return null;
  }
}

export function hashRepoRoot(root: string): string {
  return createHash("sha256").update(root).digest("hex").slice(0, 32);
}

/** Resolve the git repo root for a session cwd. Null when not a repo (or no git). */
export function resolveRepoRoot(cwd: string): string | null {
  if (!existsSync(cwd)) return null;
  const out = git(cwd, ["rev-parse", "--show-toplevel"]);
  return out?.trim() || null;
}

export interface RepoCollection {
  repoRoot: string;
  repoRootHash: string;
  commits: CommitMetadata[];
}

// Record/field separators keep parsing immune to newlines in subjects.
const REC = "\x1e";
const FIELD = "\x1f";

/**
 * Collect commits authored by the local git user from one repo. Only the
 * syncing user's own commits are collected — teammates sync their own machines,
 * and the server dedupes on (team, repo, sha) anyway.
 */
export function collectCommits(repoRoot: string, since: Date): CommitMetadata[] {
  const email = git(repoRoot, ["config", "user.email"])?.trim();
  if (!email) return [];

  const out = git(repoRoot, [
    "log",
    "--all",
    "--source",
    `--author=${email}`,
    `--since=${since.toISOString()}`,
    `--max-count=${MAX_COMMITS_PER_REPO}`,
    "--no-merges",
    "--shortstat",
    `--pretty=format:${REC}%H${FIELD}%aE${FIELD}%aI${FIELD}%S${FIELD}%s`,
  ]);
  if (!out) return [];

  const repoRootHash = hashRepoRoot(repoRoot);
  const commits: CommitMetadata[] = [];
  for (const record of out.split(REC)) {
    if (!record.trim()) continue;
    const [head, ...rest] = record.split("\n");
    const [sha, authorEmail, authoredAt, sourceRef, subject] = head.split(FIELD);
    if (!sha || !authoredAt) continue;
    // %S is the ref the commit was reached from, e.g. refs/heads/feature-x.
    const branch =
      sourceRef
        ?.replace(/^refs\/heads\//, "")
        .replace(/^refs\/remotes\/[^/]+\//, "")
        .replace(/^refs\/tags\//, "") || null;

    // --shortstat appends e.g. " 3 files changed, 40 insertions(+), 2 deletions(-)"
    const stat = rest.join(" ");
    const filesChanged = parseInt(/(\d+) files? changed/.exec(stat)?.[1] ?? "0", 10);
    const insertions = parseInt(/(\d+) insertions?\(\+\)/.exec(stat)?.[1] ?? "0", 10);
    const deletions = parseInt(/(\d+) deletions?\(-\)/.exec(stat)?.[1] ?? "0", 10);

    commits.push({
      repoRootHash,
      sha,
      authorEmail: authorEmail ?? email,
      authoredAt: new Date(authoredAt).toISOString(),
      subject: (subject ?? "").slice(0, 200),
      branch: branch ? branch.slice(0, 300) : null,
      filesChanged,
      insertions,
      deletions,
    });
  }
  return commits;
}

/**
 * Resolve unique repos from session cwds and collect their commits.
 * `lastCollectedAt` (per repoRootHash) drives the incremental window.
 */
export function collectFromCwds(
  cwds: string[],
  lastCollectedAt: Record<string, string>
): RepoCollection[] {
  const roots = new Map<string, string>(); // root -> hash
  for (const cwd of new Set(cwds)) {
    const root = resolveRepoRoot(cwd);
    if (root) roots.set(root, hashRepoRoot(root));
  }

  const collections: RepoCollection[] = [];
  for (const [root, hash] of roots) {
    const prev = lastCollectedAt[hash] ? Date.parse(lastCollectedAt[hash]) : NaN;
    const since = Number.isNaN(prev)
      ? new Date(Date.now() - INITIAL_LOOKBACK_DAYS * 24 * 60 * 60 * 1000)
      : new Date(prev - RESYNC_OVERLAP_MS);
    const commits = collectCommits(root, since);
    collections.push({ repoRoot: root, repoRootHash: hash, commits });
  }
  return collections;
}
