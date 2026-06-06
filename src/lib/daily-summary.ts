import { getAdmin } from "./insforge/admin";
import { generateUserDaily, generateUserToolDaily, generateTeamDaily, isStoredSummaryFresh } from "./ai-summary";
import type { SessionLike } from "./summary";

/** Local YYYY-MM-DD, matching the dashboard's local "today" window. */
export function dayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type StoredRow = { summary: string; session_count: number; model: string | null };

async function getStored(
  teamId: string,
  scope: "user" | "team",
  scopeId: string,
  day: string,
  tool = ""
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
    .maybeSingle();
  return (data as StoredRow | null) ?? null;
}

async function store(
  teamId: string,
  scope: "user" | "team",
  scopeId: string,
  day: string,
  summary: string,
  model: string | null,
  sessionCount: number,
  tool = ""
) {
  const admin = getAdmin();
  const { error } = await admin.database.from("daily_summaries").upsert(
    [{ team_id: teamId, scope, scope_id: scopeId, day, tool, summary, model, session_count: sessionCount }],
    { onConflict: "team_id,scope,scope_id,day,tool" }
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
  sessions: SessionLike[],
  activeMembers: number
): Promise<string> {
  const existing = await getStored(teamId, "team", teamId, day);
  if (existing && isFresh(existing, sessions.length)) return existing.summary;

  const { text, model } = await generateTeamDaily(teamName, sessions, activeMembers);
  await store(teamId, "team", teamId, day, text, model, sessions.length);
  return text;
}

/** Same as the team variant, scoped to one user within a team. */
export async function getUserDailySummary(
  teamId: string,
  userId: string,
  name: string,
  day: string,
  sessions: SessionLike[]
): Promise<string> {
  const existing = await getStored(teamId, "user", userId, day);
  if (existing && isFresh(existing, sessions.length)) return existing.summary;

  const { text, model } = await generateUserDaily(name, sessions);
  await store(teamId, "user", userId, day, text, model, sessions.length);
  return text;
}

/** Per-agent daily summary for one user. */
export async function getUserToolDailySummary(
  teamId: string,
  userId: string,
  name: string,
  tool: string,
  day: string,
  sessions: SessionLike[]
): Promise<string> {
  const existing = await getStored(teamId, "user", userId, day, tool);
  if (existing && isFresh(existing, sessions.length)) return existing.summary;

  const { text, model } = await generateUserToolDaily(name, tool, sessions);
  await store(teamId, "user", userId, day, text, model, sessions.length, tool);
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

/** Overall + per-agent summaries for a member's sessions today. */
export async function getUserTodaySummaries(
  teamId: string,
  userId: string,
  name: string,
  day: string,
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
    getUserDailySummary(teamId, userId, name, day, sessions),
    ...tools.map((tool) =>
      getUserToolDailySummary(teamId, userId, name, tool, day, byToolMap.get(tool) ?? [])
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
