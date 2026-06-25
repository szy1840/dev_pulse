import { getLocale } from "next-intl/server";
import { getSessionsForSummary, getMemberActivity } from "@/lib/queries";
import { getTeamPeriodSummary, getUserPeriodSummary } from "@/lib/daily-summary";
import { TeamTodaySummary } from "@/components/team-today-summary";
import { type Locale } from "@/lib/locale";
import type { PeriodRange } from "@/lib/period";

/**
 * LLM-backed team summary card, isolated as its own async server component so it
 * can stream behind a <Suspense> boundary. Fetching its sessions and running the
 * (potentially slow, uncached) OpenRouter calls here keeps period navigation
 * snappy — the page shell and charts render immediately while this fills in.
 */
export async function TeamSummarySection({
  teamId,
  teamName,
  range,
  timeZone,
  heading,
  periodLabel,
  timezoneLabel,
  sessionCount,
  activeMembers,
}: {
  teamId: string;
  teamName: string;
  range: PeriodRange;
  timeZone: string;
  heading: string;
  periodLabel: string;
  timezoneLabel?: string;
  sessionCount: number;
  activeMembers: number;
}) {
  if ((range.view === "week" || range.view === "month") && range.isCurrent) return null;

  const locale = (await getLocale()) as Locale;
  const [periodSessions, members] = await Promise.all([
    getSessionsForSummary(teamId, range),
    getMemberActivity(teamId, range),
  ]);

  const byUser = new Map<string, typeof periodSessions>();
  for (const s of periodSessions) {
    const list = byUser.get(s.userId) ?? [];
    list.push(s);
    byUser.set(s.userId, list);
  }

  const teamSummary = await getTeamPeriodSummary(
    teamId,
    teamName,
    range,
    timeZone,
    periodSessions,
    activeMembers,
    locale
  );

  const memberSummaries = await Promise.all(
    members
      .filter((m) => m.sessionCount > 0)
      .map(async (m) => ({
        userId: m.userId,
        name: m.name ?? "Member",
        imageUrl: m.imageUrl,
        sessionCount: m.sessionCount,
        overall: await getUserPeriodSummary(
          teamId,
          m.userId,
          m.name ?? "Member",
          range,
          timeZone,
          byUser.get(m.userId) ?? [],
          locale
        ),
      }))
  );

  return (
    <TeamTodaySummary
      teamName={teamName}
      summary={teamSummary}
      heading={heading}
      periodLabel={periodLabel}
      timezoneLabel={timezoneLabel}
      sessionCount={sessionCount}
      activeMembers={activeMembers}
      members={memberSummaries}
    />
  );
}
