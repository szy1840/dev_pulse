import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdmin } from "@/lib/insforge/admin";
import { authenticateCliRequest } from "@/lib/cli-auth";
import { generateSessionSummaries } from "@/lib/session-summary";
import {
  engagedMsFromIntervalsIso,
  mergeActivityIntervalsIso,
  type ActivityInterval,
} from "@/lib/activity";

export const runtime = "nodejs";

const workSpanSchema = z.object({
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime(),
  gitBranch: z.string().max(300).nullish(),
  inputTokens: z.number().int().min(0).default(0),
  outputTokens: z.number().int().min(0).default(0),
  cacheReadTokens: z.number().int().min(0).default(0),
  cacheCreationTokens: z.number().int().min(0).default(0),
  messageCount: z.number().int().min(0).default(0),
  fileHashes: z.array(z.string().max(32)).max(50).default([]),
});

const sessionSchema = z.object({
  externalId: z.string().min(1).max(200),
  tool: z.string().min(1).max(60).default("claude-code"),
  model: z.string().max(120).nullish(),
  projectPathHash: z.string().max(80).nullish(),
  repoRootHash: z.string().max(80).nullish(),
  projectName: z.string().max(200).nullish(),
  summary: z.string().max(2000).nullish(),
  /** Cleaned local notes for server LLM — never persisted. */
  summaryNotes: z.string().max(12000).nullish(),
  messageCount: z.number().int().min(0).max(1_000_000).default(0),
  inputTokens: z.number().int().min(0).default(0),
  outputTokens: z.number().int().min(0).default(0),
  cacheReadTokens: z.number().int().min(0).default(0),
  cacheCreationTokens: z.number().int().min(0).default(0),
  startedAt: z.string().datetime().nullish(),
  endedAt: z.string().datetime().nullish(),
  engagedMs: z.number().int().min(0).default(0),
  activityIntervals: z
    .array(
      z.object({
        start: z.string().datetime(),
        end: z.string().datetime(),
      })
    )
    .max(200)
    .default([]),
  spans: z.array(workSpanSchema).max(100).default([]),
});

const payloadSchema = z.object({
  sessions: z.array(sessionSchema).max(1000),
});

// ISO-string min/max that treat null/undefined as "no value".
function minDate(a?: string | null, b?: string | null): string | null {
  if (!a) return b ?? null;
  if (!b) return a;
  return a < b ? a : b;
}
function maxDate(a?: string | null, b?: string | null): string | null {
  if (!a) return b ?? null;
  if (!b) return a;
  return a > b ? a : b;
}

export async function POST(req: Request) {
  const principal = await authenticateCliRequest(req);
  if (!principal) {
    return NextResponse.json({ error: "Invalid or revoked token" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { userId, teamId } = principal;
  const incoming = parsed.data.sessions;
  if (incoming.length === 0) {
    return NextResponse.json({ ok: true, created: 0, updated: 0 });
  }

  const admin = getAdmin();

  // A single Claude Code session can span multiple transcript files (same
  // sessionId), so the batch may contain several fragments with the same
  // externalId. Postgres rejects an upsert that touches a conflict key twice,
  // so merge fragments into one row per externalId first.
  const merged = new Map<string, (typeof incoming)[number]>();
  for (const s of incoming) {
    const prev = merged.get(s.externalId);
    if (!prev) {
      merged.set(s.externalId, { ...s });
      continue;
    }
    merged.set(s.externalId, {
      ...prev,
      tool: prev.tool ?? s.tool,
      model: prev.model ?? s.model,
      projectPathHash: prev.projectPathHash ?? s.projectPathHash,
      repoRootHash: prev.repoRootHash ?? s.repoRootHash,
      spans: [...(prev.spans ?? []), ...(s.spans ?? [])].sort((a, b) =>
        a.startedAt < b.startedAt ? -1 : 1
      ),
      projectName: prev.projectName ?? s.projectName,
      summary: prev.summary ?? s.summary,
      summaryNotes: [prev.summaryNotes, s.summaryNotes].filter(Boolean).join("\n\n") || undefined,
      messageCount: prev.messageCount + s.messageCount,
      inputTokens: prev.inputTokens + s.inputTokens,
      outputTokens: prev.outputTokens + s.outputTokens,
      cacheReadTokens: prev.cacheReadTokens + s.cacheReadTokens,
      cacheCreationTokens: prev.cacheCreationTokens + s.cacheCreationTokens,
      startedAt: minDate(prev.startedAt, s.startedAt),
      endedAt: maxDate(prev.endedAt, s.endedAt),
      activityIntervals: mergeActivityIntervalsIso(
        (prev.activityIntervals ?? []) as ActivityInterval[],
        (s.activityIntervals ?? []) as ActivityInterval[]
      ),
      engagedMs: 0,
    });
  }
  for (const s of merged.values()) {
    s.engagedMs = engagedMsFromIntervalsIso((s.activityIntervals ?? []) as ActivityInterval[]);
  }
  const unique = [...merged.values()];
  const externalIds = unique.map((s) => s.externalId);

  const summaries = await generateSessionSummaries(
    unique.map((s) => ({
      tool: s.tool,
      projectName: s.projectName ?? null,
      fallbackSummary: s.summary ?? null,
      summaryNotes: s.summaryNotes ?? null,
    }))
  );

  // Figure out which externalIds already exist so we can report created vs updated.
  const { data: existing } = await admin.database
    .from("sessions")
    .select("external_id")
    .eq("user_id", userId)
    .in("external_id", externalIds);
  const existingSet = new Set(
    ((existing as { external_id: string }[] | null) ?? []).map((e) => e.external_id)
  );

  const rows = unique.map((s, i) => ({
    user_id: userId,
    team_id: teamId,
    external_id: s.externalId,
    tool: s.tool,
    model: s.model ?? null,
    project_path_hash: s.projectPathHash ?? null,
    repo_root_hash: s.repoRootHash ?? null,
    project_name: s.projectName ?? null,
    summary: summaries[i] ?? s.summary ?? null,
    message_count: s.messageCount,
    input_tokens: s.inputTokens,
    output_tokens: s.outputTokens,
    cache_read_tokens: s.cacheReadTokens,
    cache_creation_tokens: s.cacheCreationTokens,
    started_at: s.startedAt ?? null,
    ended_at: s.endedAt ?? null,
    engaged_ms: s.engagedMs ?? 0,
    activity_intervals: s.activityIntervals ?? [],
  }));

  // Upsert on (user_id, external_id). Re-syncs refresh mutable fields and
  // re-home the session to the token's current team.
  const { error } = await admin.database
    .from("sessions")
    .upsert(rows, { onConflict: "user_id,external_id" });

  if (error) {
    console.error("session upsert failed", error);
    return NextResponse.json({ error: "Failed to store sessions" }, { status: 500 });
  }

  // Replace work spans for the sessions that carried any. Spans derive from a
  // single transcript parse, so delete + insert is the natural idempotent shape.
  const withSpans = unique.filter((s) => (s.spans?.length ?? 0) > 0);
  if (withSpans.length > 0) {
    const { data: idRows, error: idError } = await admin.database
      .from("sessions")
      .select("id, external_id")
      .eq("user_id", userId)
      .in("external_id", withSpans.map((s) => s.externalId));

    if (idError) {
      console.error("span session lookup failed", idError);
    } else {
      const idByExternal = new Map(
        ((idRows as { id: string; external_id: string }[]) ?? []).map((r) => [r.external_id, r.id])
      );
      const sessionIds = withSpans
        .map((s) => idByExternal.get(s.externalId))
        .filter((id): id is string => Boolean(id));

      const spanRows = withSpans.flatMap((s) => {
        const sessionId = idByExternal.get(s.externalId);
        if (!sessionId) return [];
        return (s.spans ?? []).map((sp, idx) => ({
          session_id: sessionId,
          user_id: userId,
          team_id: teamId,
          span_index: idx,
          started_at: sp.startedAt,
          ended_at: sp.endedAt,
          git_branch: sp.gitBranch ?? null,
          message_count: sp.messageCount,
          input_tokens: sp.inputTokens,
          output_tokens: sp.outputTokens,
          cache_read_tokens: sp.cacheReadTokens,
          cache_creation_tokens: sp.cacheCreationTokens,
          file_hashes: sp.fileHashes ?? [],
        }));
      });

      const { error: delError } = await admin.database
        .from("work_spans")
        .delete()
        .in("session_id", sessionIds);
      if (delError) {
        console.error("span delete failed", delError);
      } else if (spanRows.length > 0) {
        const { error: spanError } = await admin.database.from("work_spans").insert(spanRows);
        if (spanError) console.error("span insert failed", spanError);
      }
    }
  }

  const created = unique.filter((s) => !existingSet.has(s.externalId)).length;
  const updated = unique.length - created;

  return NextResponse.json({ ok: true, created, updated });
}
