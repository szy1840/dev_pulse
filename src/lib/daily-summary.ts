import { getAdmin } from "./insforge/admin";
import { generateUserDaily, generateUserToolDaily, generateTeamDaily, isStoredSummaryFresh } from "./ai-summary";
import { buildDailyTeamSummary, buildDailyUserSummary, type SessionLike } from "./summary";
import { dayKeyInTimezone, DEFAULT_TIMEZONE } from "./timezone";
import type { PeriodRange } from "./period";

/** @deprecated Use dayKeyInTimezone from ./timezone */
export function dayKey(d = new Date()): string {
  return dayKeyInTimezone(d, DEFAULT_TIMEZONE);
}

type StoredRow = { summary: string; session_count: number; model: string | null };

async function getStored(
  teamId: string,
  scope: "user" | "team",
  scopeId: string,
  day: string,
  timeZone: string,
  tool = "",
  granularity = "day"
): Promise<StoredRow | null> {
  const admin = getAdmin();
  const { data } = await admin.database
    .from("daily_summaries")
    .select("summary, session_count, model")
    .eq("team_id", teamId)
    .eq("scope", scope)
    .eq("scope_id", scopeId)
    .eq("day", day)
    .eq("tool", tool)
    .eq("timezone", timeZone)
    .eq("granularity", granularity)
    .maybeSingle();
  return (data as StoredRow | null) ?? null;
}

async function store(
  teamId: string,
  scope: "user" | "team",
  scopeId: string,
  day: string,
  timeZone: string,
  summary: string,
  model: string | null,
  sessionCount: number,
  tool = "",
  granularity = "day"
) {
  const admin = getAdmin();
  const { error } = await admin.database.from("daily_summaries").upsert(
    [
      {
        team_id: teamId,
        scope,
        scope_id: scopeId,
        day,
        tool,
        timezone: timeZone,
        granularity,
        summary,
        model,
        session_count: sessionCount,
      },
    ],
    { onConflict: "team_id,scope,scope_id,day,tool,timezone,granularity" }
  );
  if (error) console.error("daily_summaries upsert failed", error);
}

function isFresh(existing: StoredRow, sessionCount: number): boolean {
  return isStoredSummaryFresh(existing.model) && existing.session_count >= sessionCount;
}

/**
 * Return today's stored team summary, generating + storing it on first request
 * (and regenerating only when more sessions have arrived since it was cached).
 */
export async function getTeamDailySummary(
  teamId: string,
  teamName: string,
  day: string,
  timeZone: string,
  sessions: SessionLike[],
  activeMembers: number
): Promise<string> {
  const existing = await getStored(teamId, "team", teamId, day, timeZone);
  if (existing && isFresh(existing, sessions.length)) return existing.summary;

  const { text, model } = await generateTeamDaily(teamName, sessions, activeMembers);
  await store(teamId, "team", teamId, day, timeZone, text, model, sessions.length);
  return text;
}

/** Same as the team variant, scoped to one user within a team. */
export async function getUserDailySummary(
  teamId: string,
  userId: string,
  name: string,
  day: string,
  timeZone: string,
  sessions: SessionLike[]
): Promise<string> {
  const existing = await getStored(teamId, "user", userId, day, timeZone);
  if (existing && isFresh(existing, sessions.length)) return existing.summary;

  const { text, model } = await generateUserDaily(name, sessions);
  await store(teamId, "user", userId, day, timeZone, text, model, sessions.length);
  return text;
}

/** Per-agent daily summary for one user. */
export async function getUserToolDailySummary(
  teamId: string,
  userId: string,
  name: string,
  tool: string,
  day: string,
  timeZone: string,
  sessions: SessionLike[]
): Promise<string> {
  const existing = await getStored(teamId, "user", userId, day, timeZone, tool);
  if (existing && isFresh(existing, sessions.length)) return existing.summary;

  const { text, model } = await generateUserToolDaily(name, tool, sessions);
  await store(teamId, "user", userId, day, timeZone, text, model, sessions.length, tool);
  return text;
}

/**
 * Period-scoped team summary: same caching machinery as the daily path, keyed
 * by (period start day, granularity). "all" is uncacheable and low-value as an
 * LLM call — it gets the rule-based recap.
 */
export async function getTeamPeriodSummary(
  teamId: string,
  teamName: string,
  range: PeriodRange,
  timeZone: string,
  sessions: SessionLike[],
  activeMembers: number
): Promise<string> {
  if (range.view === "all") {
    return buildDailyTeamSummary(teamName, sessions, activeMembers);
  }

  const existing = await getStored(teamId, "team", teamId, range.anchor, timeZone, "", range.view);
  if (existing && isFresh(existing, sessions.length)) return existing.summary;

  const { text, model } = await generateTeamDaily(teamName, sessions, activeMembers, range.phrase);
  await store(teamId, "team", teamId, range.anchor, timeZone, text, model, sessions.length, "", range.view);
  return text;
}

/** Period-scoped per-user summary (overall line). */
export async function getUserPeriodSummary(
  teamId: string,
  userId: string,
  name: string,
  range: PeriodRange,
  timeZone: string,
  sessions: SessionLike[]
): Promise<string> {
  if (range.view === "all") {
    return buildDailyUserSummary(name, sessions);
  }

  const existing = await getStored(teamId, "user", userId, range.anchor, timeZone, "", range.view);
  if (existing && isFresh(existing, sessions.length)) return existing.summary;

  const { text, model } = await generateUserDaily(name, sessions, range.phrase);
  await store(teamId, "user", userId, range.anchor, timeZone, text, model, sessions.length, "", range.view);
  return text;
}

/** Period-scoped per-user-per-tool summary. */
async function getUserToolPeriodSummary(
  teamId: string,
  userId: string,
  name: string,
  tool: string,
  range: PeriodRange,
  timeZone: string,
  sessions: SessionLike[]
): Promise<string> {
  if (range.view === "all") {
    return buildDailyUserSummary(name, sessions);
  }

  const existing = await getStored(teamId, "user", userId, range.anchor, timeZone, tool, range.view);
  if (existing && isFresh(existing, sessions.length)) return existing.summary;

  const { text, model } = await generateUserToolDaily(name, tool, sessions, range.phrase);
  await store(teamId, "user", userId, range.anchor, timeZone, text, model, sessions.length, tool, range.view);
  return text;
}

export type ToolTodaySummary = {
  tool: string;
  summary: string;
  sessions: { summary: string | null; projectName: string | null }[];
};

export type UserTodaySummaries = {
  overall: string;
  byTool: ToolTodaySummary[];
};

/** Overall + per-agent summaries for a member's sessions in a period. */
export async function getUserPeriodSummaries(
  teamId: string,
  userId: string,
  name: string,
  range: PeriodRange,
  timeZone: string,
  sessions: SessionLike[]
): Promise<UserTodaySummaries> {
  const byToolMap = new Map<string, SessionLike[]>();
  for (const s of sessions) {
    const list = byToolMap.get(s.tool) ?? [];
    list.push(s);
    byToolMap.set(s.tool, list);
  }

  const tools = [...byToolMap.keys()].sort(
    (a, b) => (byToolMap.get(b)?.length ?? 0) - (byToolMap.get(a)?.length ?? 0)
  );

  const [overall, ...toolSummaries] = await Promise.all([
    getUserPeriodSummary(teamId, userId, name, range, timeZone, sessions),
    ...tools.map((tool) =>
      getUserToolPeriodSummary(teamId, userId, name, tool, range, timeZone, byToolMap.get(tool) ?? [])
    ),
  ]);

  const byTool: ToolTodaySummary[] = tools.map((tool, i) => ({
    tool,
    summary: toolSummaries[i],
    sessions: (byToolMap.get(tool) ?? []).map((s) => ({
      summary: s.summary,
      projectName: s.projectName,
    })),
  }));

  return { overall, byTool };
}
