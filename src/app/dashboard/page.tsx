import { Activity, Clock, Cpu, Layers, Users, Wrench, FolderGit2 } from "lucide-react";
import { requireUserId, getActiveTeam, getViewerTimezone } from "@/lib/auth";
import {
  getTeamStats,
  getModelBreakdown,
  getToolBreakdown,
  getProjectBreakdown,
  getDailyActivityWithMembers,
  getHourlyHeatmapWithMembers,
  getMemberActivity,
  getSessionsForSummary,
} from "@/lib/queries";
import { resolveRange, type PeriodRange } from "@/lib/period";
import { getTeamPeriodSummary, getUserPeriodSummary } from "@/lib/daily-summary";
import { getCommitCosts } from "@/lib/attribution";
import { formatTimezoneLabel } from "@/lib/timezone";
import { formatCompact, formatNumber, formatDuration, formatActivityHint, prettyModel, prettyTool } from "@/lib/format";
import { StatCard } from "@/components/stat-card";
import { PeriodSelector } from "@/components/period-selector";
import { ChartCard } from "@/components/charts/chart-card";
import { ActivityTrendChart } from "@/components/charts/activity-trend-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { RadialChart } from "@/components/charts/radial-chart";
import { BarListChart } from "@/components/charts/bar-list-chart";
import { ActivityHeatmapPanel } from "@/components/charts/activity-heatmap-panel";
import { TokenCompositionBar } from "@/components/charts/token-composition-bar";
import { Sparkline } from "@/components/charts/sparkline";
import { TeamTodaySummary } from "@/components/team-today-summary";
import { CommitCosts } from "@/components/commit-costs";

function summaryHeading(range: PeriodRange): string {
  switch (range.view) {
    case "day":
      return range.isCurrent ? "Today's team summary" : "Daily team summary";
    case "week":
      return range.isCurrent ? "This week's team summary" : "Weekly team summary";
    case "month":
      return range.isCurrent ? "This month's team summary" : "Monthly team summary";
    case "all":
      return "All-time team summary";
  }
}

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; anchor?: string; period?: string }>;
}) {
  const userId = await requireUserId();
  const team = await getActiveTeam(userId);
  if (!team) return null; // layout redirects to onboarding

  const params = await searchParams;
  const timeZone = await getViewerTimezone(userId);
  const range = resolveRange(params.view ?? params.period, params.anchor, timeZone);
  const activityGranularity = range.view === "day" ? "hour" : "day";

  const [stats, dailyActivity, models, tools, projects, heatmap, periodSessions, members, commitCosts] =
    await Promise.all([
      getTeamStats(team.id, range),
      getDailyActivityWithMembers(team.id, range, { granularity: activityGranularity, timeZone }),
      getModelBreakdown(team.id, range),
      getToolBreakdown(team.id, range),
      getProjectBreakdown(team.id, range),
      getHourlyHeatmapWithMembers(team.id, range, timeZone),
      getSessionsForSummary(team.id, range),
      getMemberActivity(team.id, range),
      getCommitCosts(team.id, range),
    ]);

  const byUser = new Map<string, typeof periodSessions>();
  for (const s of periodSessions) {
    const list = byUser.get(s.userId) ?? [];
    list.push(s);
    byUser.set(s.userId, list);
  }

  const teamSummary = await getTeamPeriodSummary(
    team.id,
    team.name,
    range,
    timeZone,
    periodSessions,
    stats.activeMembers
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
          team.id,
          m.userId,
          m.name ?? "Member",
          range,
          timeZone,
          byUser.get(m.userId) ?? []
        ),
      }))
  );

  const totalTokens = stats.inputTokens + stats.outputTokens;
  const daily = dailyActivity.team;
  const memberDaily = dailyActivity.members;
  const sessionSpark = daily.map((d) => ({ value: d.sessions }));
  const tokenSpark = daily.map((d) => ({ value: d.tokens }));

  const modelSlices = models.slice(0, 6).map((m) => ({ name: prettyModel(m.model), value: m.sessionCount }));
  const toolItems = tools.map((t) => ({ name: prettyTool(t.tool), value: t.sessionCount }));
  const projectItems = projects.slice(0, 7).map((p) => ({ name: p.project, value: p.sessions, sub: p.tokens }));

  const tokenSegments = [
    { label: "Input", value: stats.inputTokens, color: "hsl(var(--chart-1))" },
    { label: "Output", value: stats.outputTokens, color: "hsl(var(--chart-2))" },
    { label: "Cache read", value: stats.cacheReadTokens, color: "hsl(var(--chart-4))" },
    { label: "Cache write", value: stats.cacheCreationTokens, color: "hsl(var(--chart-5))" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{team.name}</h1>
          <p className="text-sm text-muted-foreground">Team AI usage overview</p>
        </div>
        <PeriodSelector
          view={range.view}
          label={range.shortLabel}
          prevAnchor={range.prevAnchor}
          nextAnchor={range.nextAnchor}
          isCurrent={range.isCurrent}
        />
      </div>

      <TeamTodaySummary
        teamName={team.name}
        summary={teamSummary}
        heading={summaryHeading(range)}
        periodLabel={range.label}
        timezoneLabel={range.view === "all" ? undefined : formatTimezoneLabel(timeZone)}
        sessionCount={stats.sessionCount}
        activeMembers={stats.activeMembers}
        members={memberSummaries}
      />

      {/* Headline stats with sparklines */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Sessions"
          value={formatNumber(stats.sessionCount)}
          hint={`${formatNumber(stats.messageCount)} messages`}
          icon={<Activity className="h-5 w-5" />}
          accent={3}
          chart={<Sparkline data={sessionSpark} accent={3} />}
        />
        <StatCard
          label="Total tokens"
          value={formatCompact(totalTokens)}
          hint={`${formatCompact(stats.outputTokens)} generated`}
          icon={<Layers className="h-5 w-5" />}
          accent={0}
          chart={<Sparkline data={tokenSpark} accent={0} />}
        />
        <StatCard
          label="Active members"
          value={formatNumber(stats.activeMembers)}
          hint="synced in this period"
          icon={<Users className="h-5 w-5" />}
          accent={2}
        />
        <StatCard
          label="Active time"
          value={formatDuration(stats.activeMs)}
          hint={formatActivityHint(stats.peakConcurrency, stats.parallelFactor)}
          icon={<Clock className="h-5 w-5" />}
          accent={4}
        />
      </div>

      {/* Activity trend */}
      <ChartCard
        title="Activity over time"
        description={
          range.view === "day"
            ? "Hourly tokens and sessions — team total or split by member"
            : "Daily tokens and sessions — team total or split by member"
        }
        icon={<Activity className="h-4 w-4" />}
      >
        <ActivityTrendChart
          teamData={daily}
          memberSeries={memberDaily}
          granularity={activityGranularity}
        />
      </ChartCard>

      {/* Models + token composition */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Models"
          description="Session share by model"
          icon={<Cpu className="h-4 w-4" />}
        >
          <DonutChart data={modelSlices} centerLabel="sessions" />
        </ChartCard>

        <ChartCard
          title="Token composition"
          description="Where this period's tokens went"
          icon={<Layers className="h-4 w-4" />}
        >
          <TokenCompositionBar segments={tokenSegments} />
        </ChartCard>
      </div>

      {/* Tools + projects */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Tools"
          description="Which AI coding tools are in use"
          icon={<Wrench className="h-4 w-4" />}
        >
          <RadialChart data={toolItems} />
        </ChartCard>

        <ChartCard
          title="Top projects"
          description="Busiest projects by sessions"
          icon={<FolderGit2 className="h-4 w-4" />}
        >
          <BarListChart data={projectItems} valueLabel="Sessions" subLabel="Tokens" height={Math.max(160, projectItems.length * 34)} />
        </ChartCard>
      </div>

      {/* Commit costs — what the tokens shipped */}
      <CommitCosts
        commits={commitCosts.commits}
        coverage={commitCosts.coverage}
        unmatchedCommitCount={commitCosts.unmatchedCommitCount}
      />

      {/* Heatmap */}
      <ChartCard
        title="When the team codes"
        description="Sessions by weekday and hour — all team or one member"
        icon={<Clock className="h-4 w-4" />}
      >
        <ActivityHeatmapPanel team={heatmap.team} members={heatmap.members} />
      </ChartCard>
    </div>
  );
}
