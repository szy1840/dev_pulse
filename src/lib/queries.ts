import { getAdmin } from "@/lib/insforge/admin";

export type Period = "today" | "7d" | "30d" | "all";

export function periodStart(period: Period): Date | null {
  const now = new Date();
  switch (period) {
    case "today": {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case "7d":
      return new Date(now.getTime() - 7 * 24 * 3600 * 1000);
    case "30d":
      return new Date(now.getTime() - 30 * 24 * 3600 * 1000);
    case "all":
      return null;
  }
}

// Raw session row as returned by PostgREST (snake_case).
type SessionRow = {
  id: string;
  user_id: string;
  tool: string;
  model: string | null;
  project_name: string | null;
  summary: string | null;
  message_count: number;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_creation_tokens: number;
  started_at: string | null;
  ended_at: string | null;
};

const SESSION_COLUMNS =
  "id, user_id, tool, model, project_name, summary, message_count, input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens, started_at, ended_at";

/** Fetch every session for a team within an optional time window. */
async function fetchTeamSessions(teamId: string, since: Date | null): Promise<SessionRow[]> {
  const admin = getAdmin();
  let q = admin.database.from("sessions").select(SESSION_COLUMNS).eq("team_id", teamId);
  if (since) q = q.gte("started_at", since.toISOString());
  const { data, error } = await q.limit(10000);
  if (error || !data) return [];
  return data as SessionRow[];
}

function toDate(v: string | null): Date | null {
  return v ? new Date(v) : null;
}

function dayKeyLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function hourKeyLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  return `${y}-${m}-${day}T${h}:00`;
}

export type ActivityGranularity = "day" | "hour";

export async function getTeamStats(teamId: string, since: Date | null) {
  const rows = await fetchTeamSessions(teamId, since);
  const members = new Set<string>();
  let inputTokens = 0;
  let outputTokens = 0;
  let cacheReadTokens = 0;
  let cacheCreationTokens = 0;
  let messageCount = 0;
  let activeMs = 0;
  for (const r of rows) {
    members.add(r.user_id);
    inputTokens += r.input_tokens;
    outputTokens += r.output_tokens;
    cacheReadTokens += r.cache_read_tokens;
    cacheCreationTokens += r.cache_creation_tokens;
    messageCount += r.message_count;
    const start = toDate(r.started_at);
    const end = toDate(r.ended_at);
    if (start && end && end > start) activeMs += end.getTime() - start.getTime();
  }
  return {
    sessionCount: rows.length,
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheCreationTokens,
    messageCount,
    activeMs,
    activeMembers: members.size,
  };
}

/**
 * Sessions and tokens aggregated per calendar day, with empty days filled in so
 * trend charts render a continuous axis. Range is `since`→today, or the first
 * session→today when `since` is null (all-time).
 */
export type DailyActivityPoint = {
  date: string;
  sessions: number;
  inputTokens: number;
  outputTokens: number;
  tokens: number;
};

export type MemberDailyActivity = {
  memberId: string;
  name: string;
  data: DailyActivityPoint[];
};

type DayAgg = { sessions: number; inputTokens: number; outputTokens: number };

function fillDailySeries(
  since: Date | null,
  earliest: Date | null,
  map: Map<string, DayAgg>
): DailyActivityPoint[] {
  const start = since ?? earliest;
  if (!start) return [];

  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(0, 0, 0, 0);

  const out: DailyActivityPoint[] = [];
  let guard = 0;
  while (cursor <= end && guard < 400) {
    const k = dayKeyLocal(cursor);
    const v = map.get(k) ?? { sessions: 0, inputTokens: 0, outputTokens: 0 };
    out.push({ date: k, ...v, tokens: v.inputTokens + v.outputTokens });
    cursor.setDate(cursor.getDate() + 1);
    guard++;
  }
  return out;
}

function fillHourlySeries(dayStart: Date, map: Map<string, DayAgg>): DailyActivityPoint[] {
  const out: DailyActivityPoint[] = [];
  const endHour = new Date().getHours();
  for (let h = 0; h <= endHour; h++) {
    const cursor = new Date(dayStart);
    cursor.setHours(h, 0, 0, 0);
    const k = hourKeyLocal(cursor);
    const v = map.get(k) ?? { sessions: 0, inputTokens: 0, outputTokens: 0 };
    out.push({ date: k, ...v, tokens: v.inputTokens + v.outputTokens });
  }
  return out;
}

/** Team-wide activity plus per-member series (top contributors + Others). */
export async function getDailyActivityWithMembers(
  teamId: string,
  since: Date | null,
  options?: { granularity?: ActivityGranularity }
) {
  const granularity = options?.granularity ?? "day";
  const bucketKey = granularity === "hour" ? hourKeyLocal : dayKeyLocal;
  const rows = await fetchTeamSessions(teamId, since);
  const teamMap = new Map<string, DayAgg>();
  const byUser = new Map<string, Map<string, DayAgg>>();
  const userTotals = new Map<string, number>();
  let earliest: Date | null = null;

  for (const r of rows) {
    const d = toDate(r.started_at);
    if (!d) continue;
    if (!earliest || d < earliest) earliest = d;
    const k = bucketKey(d);

    const team = teamMap.get(k) ?? { sessions: 0, inputTokens: 0, outputTokens: 0 };
    team.sessions += 1;
    team.inputTokens += r.input_tokens;
    team.outputTokens += r.output_tokens;
    teamMap.set(k, team);

    let userDays = byUser.get(r.user_id);
    if (!userDays) {
      userDays = new Map();
      byUser.set(r.user_id, userDays);
    }
    const day = userDays.get(k) ?? { sessions: 0, inputTokens: 0, outputTokens: 0 };
    day.sessions += 1;
    day.inputTokens += r.input_tokens;
    day.outputTokens += r.output_tokens;
    userDays.set(k, day);

    userTotals.set(r.user_id, (userTotals.get(r.user_id) ?? 0) + r.input_tokens + r.output_tokens);
  }

  const team =
    granularity === "hour" && since
      ? fillHourlySeries(since, teamMap)
      : fillDailySeries(since, earliest, teamMap);
  if (team.length === 0) return { team, members: [] as MemberDailyActivity[] };

  const fillSeries = (map: Map<string, DayAgg>) =>
    granularity === "hour" && since
      ? fillHourlySeries(since, map)
      : fillDailySeries(since, earliest, map);

  const userIds = [...byUser.keys()];
  const profilesById = new Map<string, string>();
  if (userIds.length > 0) {
    const admin = getAdmin();
    const { data: profileData } = await admin.database
      .from("profiles")
      .select("id, name")
      .in("id", userIds);
    for (const p of (profileData as { id: string; name: string | null }[] | null) ?? []) {
      profilesById.set(p.id, p.name?.trim() || "Member");
    }
  }

  const ranked = userIds
    .map((id) => ({ id, total: userTotals.get(id) ?? 0 }))
    .sort((a, b) => b.total - a.total);

  const TOP = 6;
  const top = ranked.slice(0, TOP);
  const rest = ranked.slice(TOP);

  const members: MemberDailyActivity[] = top.map(({ id }) => ({
    memberId: id,
    name: profilesById.get(id) ?? "Member",
    data: fillSeries(byUser.get(id) ?? new Map()),
  }));

  if (rest.length > 0) {
    const othersMap = new Map<string, DayAgg>();
    for (const { id } of rest) {
      for (const [day, v] of byUser.get(id) ?? []) {
        const cur = othersMap.get(day) ?? { sessions: 0, inputTokens: 0, outputTokens: 0 };
        cur.sessions += v.sessions;
        cur.inputTokens += v.inputTokens;
        cur.outputTokens += v.outputTokens;
        othersMap.set(day, cur);
      }
    }
    members.push({
      memberId: "__others__",
      name: "Others",
      data: fillSeries(othersMap),
    });
  }

  return { team, members };
}

export async function getDailyActivity(teamId: string, since: Date | null) {
  const { team } = await getDailyActivityWithMembers(teamId, since);
  return team;
}

/** 7×24 grid (weekday × hour) of session counts for an activity heatmap. */
export type HeatmapData = { grid: number[][]; max: number };

export type MemberHeatmap = HeatmapData & {
  memberId: string;
  name: string;
};

function buildHeatmapGrid(rows: Pick<SessionRow, "started_at">[]): HeatmapData {
  const grid: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0));
  let max = 0;
  for (const r of rows) {
    const d = toDate(r.started_at);
    if (!d) continue;
    const cell = ++grid[d.getDay()][d.getHours()];
    if (cell > max) max = cell;
  }
  return { grid, max };
}

export async function getHourlyHeatmapWithMembers(
  teamId: string,
  since: Date | null
): Promise<{ team: HeatmapData; members: MemberHeatmap[] }> {
  const rows = await fetchTeamSessions(teamId, since);
  const team = buildHeatmapGrid(rows);

  const byUser = new Map<string, SessionRow[]>();
  for (const r of rows) {
    const list = byUser.get(r.user_id) ?? [];
    list.push(r);
    byUser.set(r.user_id, list);
  }

  const userIds = [...byUser.keys()];
  const profilesById = new Map<string, string>();
  if (userIds.length > 0) {
    const admin = getAdmin();
    const { data: profileData } = await admin.database
      .from("profiles")
      .select("id, name")
      .in("id", userIds);
    for (const p of (profileData as { id: string; name: string | null }[] | null) ?? []) {
      profilesById.set(p.id, p.name?.trim() || "Member");
    }
  }

  const sessionTotal = (grid: number[][]) => grid.reduce((sum, row) => sum + row.reduce((a, b) => a + b, 0), 0);

  const members: MemberHeatmap[] = userIds
    .map((id) => {
      const { grid, max } = buildHeatmapGrid(byUser.get(id) ?? []);
      return {
        memberId: id,
        name: profilesById.get(id) ?? "Member",
        grid,
        max,
      };
    })
    .filter((m) => sessionTotal(m.grid) > 0)
    .sort((a, b) => sessionTotal(b.grid) - sessionTotal(a.grid));

  return { team, members };
}

/** @deprecated Prefer getHourlyHeatmapWithMembers */
export async function getHourlyHeatmap(teamId: string, since: Date | null) {
  const { team } = await getHourlyHeatmapWithMembers(teamId, since);
  return team;
}

/** Sessions and tokens grouped by project, busiest first. */
export async function getProjectBreakdown(teamId: string, since: Date | null) {
  const rows = await fetchTeamSessions(teamId, since);
  const map = new Map<string, { sessions: number; tokens: number }>();
  for (const r of rows) {
    const key = r.project_name ?? "Unknown";
    const cur = map.get(key) ?? { sessions: 0, tokens: 0 };
    cur.sessions += 1;
    cur.tokens += r.input_tokens + r.output_tokens;
    map.set(key, cur);
  }
  return [...map.entries()]
    .map(([project, v]) => ({ project, ...v }))
    .sort((a, b) => b.sessions - a.sessions);
}

export async function getModelBreakdown(teamId: string, since: Date | null) {
  const rows = await fetchTeamSessions(teamId, since);
  const map = new Map<string, { sessionCount: number; tokens: number }>();
  for (const r of rows) {
    const key = r.model ?? "unknown";
    const cur = map.get(key) ?? { sessionCount: 0, tokens: 0 };
    cur.sessionCount += 1;
    cur.tokens += r.input_tokens + r.output_tokens;
    map.set(key, cur);
  }
  return [...map.entries()]
    .map(([model, v]) => ({ model, ...v }))
    .sort((a, b) => b.sessionCount - a.sessionCount);
}

export async function getToolBreakdown(teamId: string, since: Date | null) {
  const rows = await fetchTeamSessions(teamId, since);
  const map = new Map<string, number>();
  for (const r of rows) map.set(r.tool, (map.get(r.tool) ?? 0) + 1);
  return [...map.entries()]
    .map(([tool, sessionCount]) => ({ tool, sessionCount }))
    .sort((a, b) => b.sessionCount - a.sessionCount);
}

export async function getMemberActivity(teamId: string, since: Date | null) {
  const admin = getAdmin();

  const [{ data: memberData }, sessions] = await Promise.all([
    admin.database.from("team_members").select("user_id, role").eq("team_id", teamId),
    fetchTeamSessions(teamId, since),
  ]);

  const members = (memberData as { user_id: string; role: string }[] | null) ?? [];
  const memberIds = members.map((m) => m.user_id);

  const profilesById = new Map<string, { name: string | null; email: string | null; avatar_url: string | null }>();
  if (memberIds.length > 0) {
    const { data: profileData } = await admin.database
      .from("profiles")
      .select("id, name, email, avatar_url")
      .in("id", memberIds);
    for (const p of (profileData as { id: string; name: string | null; email: string | null; avatar_url: string | null }[] | null) ?? []) {
      profilesById.set(p.id, { name: p.name, email: p.email, avatar_url: p.avatar_url });
    }
  }

  // Aggregate sessions per user.
  const agg = new Map<
    string,
    { sessionCount: number; tokens: number; lastActive: Date | null; tools: Map<string, number> }
  >();
  for (const s of sessions) {
    const cur = agg.get(s.user_id) ?? {
      sessionCount: 0,
      tokens: 0,
      lastActive: null,
      tools: new Map<string, number>(),
    };
    cur.sessionCount += 1;
    cur.tokens += s.input_tokens + s.output_tokens;
    cur.tools.set(s.tool, (cur.tools.get(s.tool) ?? 0) + 1);
    const started = toDate(s.started_at);
    if (started && (!cur.lastActive || started > cur.lastActive)) cur.lastActive = started;
    agg.set(s.user_id, cur);
  }

  return members
    .map((m) => {
      const profile = profilesById.get(m.user_id);
      const a = agg.get(m.user_id) ?? {
        sessionCount: 0,
        tokens: 0,
        lastActive: null,
        tools: new Map<string, number>(),
      };
      const toolBreakdown = [...a.tools.entries()]
        .map(([tool, count]) => ({ tool, count }))
        .sort((x, y) => y.count - x.count);
      return {
        userId: m.user_id,
        name: profile?.name ?? null,
        email: profile?.email ?? null,
        imageUrl: profile?.avatar_url ?? null,
        role: m.role,
        sessionCount: a.sessionCount,
        tokens: a.tokens,
        lastActive: a.lastActive,
        toolBreakdown,
      };
    })
    .sort((a, b) => b.sessionCount - a.sessionCount);
}

export async function getRecentSessions(teamId: string, since: Date | null, limit = 50) {
  const admin = getAdmin();
  let q = admin.database.from("sessions").select(SESSION_COLUMNS).eq("team_id", teamId);
  if (since) q = q.gte("started_at", since.toISOString());
  const { data, error } = await q.order("started_at", { ascending: false }).limit(limit);
  if (error || !data) return [];
  const rows = data as SessionRow[];

  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const profilesById = new Map<string, { name: string | null; avatar_url: string | null }>();
  if (userIds.length > 0) {
    const { data: profileData } = await admin.database
      .from("profiles")
      .select("id, name, avatar_url")
      .in("id", userIds);
    for (const p of (profileData as { id: string; name: string | null; avatar_url: string | null }[] | null) ?? []) {
      profilesById.set(p.id, { name: p.name, avatar_url: p.avatar_url });
    }
  }

  return rows.map((s) => ({
    id: s.id,
    tool: s.tool,
    model: s.model,
    projectName: s.project_name,
    summary: s.summary,
    messageCount: s.message_count,
    inputTokens: s.input_tokens,
    outputTokens: s.output_tokens,
    startedAt: toDate(s.started_at),
    endedAt: toDate(s.ended_at),
    userName: profilesById.get(s.user_id)?.name ?? null,
    userImage: profilesById.get(s.user_id)?.avatar_url ?? null,
  }));
}

/** Raw sessions for summary building (single user or whole team) within a window. */
export async function getSessionsForSummary(teamId: string, since: Date | null, userId?: string) {
  const rows = await fetchTeamSessions(teamId, since);
  const filtered = userId ? rows.filter((r) => r.user_id === userId) : rows;
  return filtered.map((s) => ({
    userId: s.user_id,
    model: s.model,
    tool: s.tool,
    projectName: s.project_name,
    summary: s.summary,
    inputTokens: s.input_tokens,
    outputTokens: s.output_tokens,
    startedAt: toDate(s.started_at),
    endedAt: toDate(s.ended_at),
  }));
}

/** CLI tokens owned by this user within a team, newest first. */
export async function getMyTokens(teamId: string, userId: string) {
  const admin = getAdmin();
  const { data, error } = await admin.database
    .from("cli_tokens")
    .select("id, name, token_prefix, created_at, last_used_at, revoked_at")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  type Row = {
    id: string;
    name: string;
    token_prefix: string;
    created_at: string;
    last_used_at: string | null;
    revoked_at: string | null;
  };
  return (data as Row[]).map((t) => ({
    id: t.id,
    name: t.name,
    prefix: t.token_prefix,
    createdAt: new Date(t.created_at),
    lastUsedAt: t.last_used_at ? new Date(t.last_used_at) : null,
    revokedAt: t.revoked_at ? new Date(t.revoked_at) : null,
  }));
}
