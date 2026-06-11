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
  periodStart,
  type Period,
} from "@/lib/queries";
import { getTeamDailySummary, getUserDailySummary } from "@/lib/daily-summary";
import { getCommitCosts } from "@/lib/attribution";
import { dayKeyInTimezone, formatDayLabel, formatTimezoneLabel } from "@/lib/timezone";
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

function resolvePeriod(raw?: string): Period {
  return raw === "7d" || raw === "30d" || raw === "all" || raw === "today" ? raw : "7d";
}

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const userId = await requireUserId();
  const team = await getActiveTeam(userId);
  if (!team) return null; // layout redirects to onboarding

  const period = resolvePeriod((await searchParams).period);
  const timeZone = await getViewerTimezone(userId);
  const since = periodStart(period, timeZone);
  const activityGranularity = period === "today" ? "hour" : "day";
  const todaySince = periodStart("today", timeZone);

  const [stats, dailyActivity, models, tools, projects, heatmap, todaySessions, todayStats, membersToday, commitCosts] =
    await Promise.all([
      getTeamStats(team.id, since),
      getDailyActivityWithMembers(team.id, since, { granularity: activityGranularity, timeZone }),
      getModelBreakdown(team.id, since),
      getToolBreakdown(team.id, since),
      getProjectBreakdown(team.id, since),
      getHourlyHeatmapWithMembers(team.id, since, timeZone),
      getSessionsForSummary(team.id, todaySince),
      getTeamStats(team.id, todaySince),
      getMemberActivity(team.id, todaySince),
      getCommitCosts(team.id, since),
    ]);

  const today = dayKeyInTimezone(new Date(), timeZone);
  const todayLabel = formatDayLabel(today, timeZone);
  const byUser = new Map<string, typeof todaySessions>();
  for (const s of todaySessions) {
    const list = byUser.get(s.userId) ?? [];
    list.push(s);
    byUser.set(s.userId, list);
  }

  const teamSummary = await getTeamDailySummary(
    team.id,
    team.name,
    today,
    timeZone,
    todaySessions,
    todayStats.activeMembers
  );

  const memberSummaries = await Promise.all(
    membersToday
      .filter((m) => m.sessionCount > 0)
      .map(async (m) => ({
        userId: m.userId,
        name: m.name ?? "Member",
        imageUrl: m.imageUrl,
        sessionCount: m.sessionCount,
        overall: await getUserDailySummary(
          team.id,
          m.userId,
          m.name ?? "Member",
          today,
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
        <PeriodSelector value={period} />
      </div>

      <TeamTodaySummary
        teamName={team.name}
        summary={teamSummary}
        todayLabel={todayLabel}
        timezoneLabel={formatTimezoneLabel(timeZone)}
        sessionCount={todayStats.sessionCount}
        activeMembers={todayStats.activeMembers}
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
          period === "today"
            ? "Hourly tokens and sessions today — team total or split by member"
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
