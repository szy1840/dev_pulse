import { prettyTool } from "./format";

export type SessionLike = {
  model: string | null;
  tool: string;
  projectName: string | null;
  summary: string | null;
  inputTokens: number;
  outputTokens: number;
  startedAt: Date | null;
  endedAt: Date | null;
};

function topByCount(values: (string | null)[]): { label: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const v of values) {
    if (!v) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

function uniqueSummaries(sessions: SessionLike[], limit = 5): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of sessions) {
    const text = s.summary?.trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
    if (out.length >= limit) break;
  }
  return out;
}

function joinWork(summaries: string[]): string {
  if (summaries.length === 0) return "";
  if (summaries.length === 1) return summaries[0];
  if (summaries.length === 2) return `${summaries[0]}; ${summaries[1]}`;
  return `${summaries.slice(0, 2).join("; ")}; and ${summaries.length - 2} more task${summaries.length - 2 === 1 ? "" : "s"}`;
}

/**
 * Rule-based daily summary focused on concrete work, not usage metrics.
 */
export function buildDailyUserSummary(name: string, sessions: SessionLike[]): string {
  if (sessions.length === 0) return `${name} had no AI coding sessions today.`;

  const work = uniqueSummaries(sessions);
  if (work.length > 0) return `${name}: ${joinWork(work)}.`;

  const projects = topByCount(sessions.map((s) => s.projectName));
  if (projects.length > 0) {
    const projNames = projects.slice(0, 3).map((p) => p.label);
    return `${name} worked in ${projNames.join(", ")}${projects.length > 3 ? " and more" : ""}.`;
  }

  return `${name} ran ${sessions.length} AI session${sessions.length === 1 ? "" : "s"} today.`;
}

/** Per-agent variant of the rule-based daily summary. */
export function buildDailyUserToolSummary(
  name: string,
  tool: string,
  sessions: SessionLike[]
): string {
  if (sessions.length === 0) return `No ${prettyTool(tool)} sessions today.`;

  const work = uniqueSummaries(sessions);
  const agent = prettyTool(tool);
  if (work.length > 0) return `${agent}: ${joinWork(work)}.`;

  const projects = topByCount(sessions.map((s) => s.projectName));
  if (projects.length > 0) {
    return `${agent} — work in ${projects.slice(0, 2).map((p) => p.label).join(", ")}.`;
  }

  return `${agent}: ${sessions.length} session${sessions.length === 1 ? "" : "s"}.`;
}

/** Rule-based daily team summary aggregating across members. */
export function buildDailyTeamSummary(
  teamName: string,
  sessions: SessionLike[],
  activeMembers: number
): string {
  if (sessions.length === 0) return `No AI coding activity for ${teamName} today.`;

  const work = uniqueSummaries(sessions, 6);
  if (work.length > 0) {
    return `${teamName} (${activeMembers} active): ${joinWork(work)}.`;
  }

  const projects = topByCount(sessions.map((s) => s.projectName));
  if (projects.length > 0) {
    return `${teamName}: ${activeMembers} member${activeMembers === 1 ? "" : "s"} focused on ${projects[0].label}.`;
  }

  return `${teamName}: ${sessions.length} session${sessions.length === 1 ? "" : "s"} across ${activeMembers} member${activeMembers === 1 ? "" : "s"}.`;
}
