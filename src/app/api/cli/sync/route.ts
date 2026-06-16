import { createHash } from "node:crypto";
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

const intentMessageSchema = z.object({
  index: z.number().int().min(0).max(100_000),
  t: z.string().datetime().nullish(),
  text: z.string().min(1).max(1000),
  source: z.string().max(120).nullish(),
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
  intentMessages: z.array(intentMessageSchema).max(100).default([]),
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

type IntentMessagePayload = z.infer<typeof intentMessageSchema>;

function intentDedupeKey(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeIntentMessages(messages: IntentMessagePayload[]): IntentMessagePayload[] {
  const seen = new Set<string>();
  return messages
    .filter((m) => m.text.trim())
    .sort((a, b) => {
      if (a.t && b.t && a.t !== b.t) return a.t < b.t ? -1 : 1;
      if (a.t && !b.t) return -1;
      if (!a.t && b.t) return 1;
      return a.index - b.index;
    })
    .filter((m) => {
      const key = intentDedupeKey(m.text);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((m, index) => ({
      index,
      t: m.t ?? null,
      text: m.text.trim(),
      source: m.source ?? null,
    }));
}

function intentTextHash(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 32);
}

function intentSourceHash(messages: IntentMessagePayload[]): string {
  const material = normalizeIntentMessages(messages)
    .map((m) => `${m.index}:${m.t ?? ""}:${intentDedupeKey(m.text)}`)
    .join("\n");
  return createHash("sha256").update(material).digest("hex").slice(0, 32);
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function lookupSessionIds(
  admin: ReturnType<typeof getAdmin>,
  userId: string,
  externalIds: string[]
): Promise<Map<string, string> | null> {
  const idByExternal = new Map<string, string>();
  const uniqueExternalIds = [...new Set(externalIds)];
  for (const group of chunk(uniqueExternalIds, 50)) {
    const { data, error } = await admin.database
      .from("sessions")
      .select("id, external_id")
      .eq("user_id", userId)
      .in("external_id", group);
    if (error) {
      console.error("session id lookup failed", error);
      return null;
    }
    for (const row of (data as { id: string; external_id: string }[] | null) ?? []) {
      idByExternal.set(row.external_id, row.id);
    }
  }
  return idByExternal;
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
      intentMessages: normalizeIntentMessages([
        ...(prev.intentMessages ?? []),
        ...(s.intentMessages ?? []),
      ]),
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
    s.intentMessages = normalizeIntentMessages(s.intentMessages ?? []);
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

  // Replace cleaned user intent messages for every uploaded session. These are
  // the local raw materials that later Dream Cycle jobs can segment semantically.
  const intentIdByExternal = await lookupSessionIds(admin, userId, externalIds);
  if (!intentIdByExternal) {
    console.error("intent session lookup failed");
  } else {
    const sessionIds = unique
      .map((s) => intentIdByExternal.get(s.externalId))
      .filter((id): id is string => Boolean(id));

    const intentRows = unique.flatMap((s) => {
      const sessionId = intentIdByExternal.get(s.externalId);
      if (!sessionId) return [];
      return (s.intentMessages ?? []).map((message, idx) => ({
        session_id: sessionId,
        user_id: userId,
        team_id: teamId,
        message_index: idx,
        occurred_at: message.t ?? null,
        text: message.text,
        source: message.source ?? null,
        text_hash: intentTextHash(message.text),
      }));
    });

    if (sessionIds.length > 0) {
      const { error: delError } = await admin.database
        .from("session_intent_messages")
        .delete()
        .in("session_id", sessionIds);
      if (delError) {
        console.error("intent message delete failed", delError);
      } else if (intentRows.length > 0) {
        const { error: intentError } = await admin.database
          .from("session_intent_messages")
          .insert(intentRows);
        if (intentError) console.error("intent message insert failed", intentError);
      }
    }

    const jobCandidates = unique
      .map((s) => {
        const sessionId = intentIdByExternal.get(s.externalId);
        const intentMessages = s.intentMessages ?? [];
        if (!sessionId || intentMessages.length === 0) return null;
        return {
          session_id: sessionId,
          user_id: userId,
          team_id: teamId,
          source_hash: intentSourceHash(intentMessages),
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row));

    if (jobCandidates.length > 0) {
      const sessionIdsWithJobs = jobCandidates.map((j) => j.session_id);
      const { data: existingJobs, error: jobLookupError } = await admin.database
        .from("semantic_task_extraction_jobs")
        .select("session_id, status, source_hash")
        .in("session_id", sessionIdsWithJobs);

      if (jobLookupError) {
        console.error("semantic job lookup failed", jobLookupError);
      } else {
        const existingBySession = new Map(
          (
            (existingJobs as
              | { session_id: string; status: string; source_hash: string }[]
              | null) ?? []
          ).map((j) => [j.session_id, j])
        );
        const now = new Date().toISOString();
        const jobRows = jobCandidates
          .filter((j) => {
            const existing = existingBySession.get(j.session_id);
            if (!existing) return true;
            if (existing.source_hash !== j.source_hash) return true;
            return false;
          })
          .map((j) => ({
            ...j,
            status: "pending",
            attempts: 0,
            model: null,
            last_error: null,
            queued_at: now,
            started_at: null,
            finished_at: null,
          }));

        if (jobRows.length > 0) {
          const { error: jobError } = await admin.database
            .from("semantic_task_extraction_jobs")
            .upsert(jobRows, { onConflict: "session_id" });
          if (jobError) console.error("semantic job enqueue failed", jobError);
        }
      }
    }
  }

  // Replace work spans for the sessions that carried any. Spans derive from a
  // single transcript parse, so delete + insert is the natural idempotent shape.
  const withSpans = unique.filter((s) => (s.spans?.length ?? 0) > 0);
  if (withSpans.length > 0) {
    const idByExternal = await lookupSessionIds(
      admin,
      userId,
      withSpans.map((s) => s.externalId)
    );

    if (!idByExternal) {
      console.error("span session lookup failed");
    } else {
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
