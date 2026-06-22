import { Suspense } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { Activity, Clock, Cpu, Layers, Users, Wrench, FolderGit2 } from "lucide-react";
import { requireUserId, getActiveTeam, getViewerTimezone } from "@/lib/auth";
import {
  getTeamStats,
  getModelBreakdown,
  getToolBreakdown,
  getProjectBreakdown,
  getDailyActivityWithMembers,
  getHourlyHeatmapWithMembers,
} from "@/lib/queries";
import { resolveRange, previousQueryRange, previousPeriodWord, type PeriodRange } from "@/lib/period";
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
import { TeamSummarySection } from "@/components/team-summary-section";
import { SummaryCardSkeleton } from "@/components/dashboard-skeletons";
import { CommitCosts } from "@/components/commit-costs";

function summaryHeading(
  range: PeriodRange,
  t: Awaited<ReturnType<typeof getTranslations<"dashboard">>>
): string {
  switch (range.view) {
    case "day":
      return range.isCurrent ? t("summaryHeading.dayCurrent") : t("summaryHeading.day");
    case "week":
      return range.isCurrent ? t("summaryHeading.weekCurrent") : t("summaryHeading.week");
    case "month":
      return range.isCurrent ? t("summaryHeading.monthCurrent") : t("summaryHeading.month");
    case "all":
      return t("summaryHeading.all");
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

  const t = await getTranslations("dashboard");

  const params = await searchParams;
  const timeZone = await getViewerTimezone(userId);
  const locale = await getLocale();
  const range = resolveRange(params.view ?? params.period, params.anchor, timeZone, locale);
  const activityGranularity = range.view === "day" ? "hour" : "day";

  const prevRange = previousQueryRange(range, timeZone, locale);
  const [stats, prevStats, dailyActivity, models, tools, projects, heatmap, commitCosts] =
    await Promise.all([
      getTeamStats(team.id, range),
      prevRange ? getTeamStats(team.id, prevRange) : Promise.resolve(null),
      getDailyActivityWithMembers(team.id, range, { granularity: activityGranularity, timeZone }),
      getModelBreakdown(team.id, range),
      getToolBreakdown(team.id, range),
      getProjectBreakdown(team.id, range),
      getHourlyHeatmapWithMembers(team.id, range, timeZone),
      getCommitCosts(team.id, range),
    ]);

  const totalTokens = stats.inputTokens + stats.outputTokens;
  const deltaWord = previousPeriodWord(range.view, locale);
  const deltaFor = (current: number, previous: number | undefined) =>
    prevStats && previous !== undefined ? { current, previous, word: deltaWord } : undefined;
  const daily = dailyActivity.team;
  const memberDaily = dailyActivity.members;
  const sessionSpark = daily.map((d) => ({ value: d.sessions }));
  const tokenSpark = daily.map((d) => ({ value: d.tokens }));

  const modelSlices = models.slice(0, 6).map((m) => ({ name: prettyModel(m.model), value: m.sessionCount }));
  const toolItems = tools.map((t) => ({ name: prettyTool(t.tool), value: t.sessionCount }));
  const projectItems = projects.slice(0, 7).map((p) => ({ name: p.project, value: p.sessions, sub: p.tokens }));

  const tokenSegments = [
    { label: t("tokenSegments.input"), value: stats.inputTokens, color: "hsl(var(--chart-1))" },
    { label: t("tokenSegments.output"), value: stats.outputTokens, color: "hsl(var(--chart-2))" },
    { label: t("tokenSegments.cacheRead"), value: stats.cacheReadTokens, color: "hsl(var(--chart-4))" },
    { label: t("tokenSegments.cacheWrite"), value: stats.cacheCreationTokens, color: "hsl(var(--chart-5))" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{team.name}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <PeriodSelector
          view={range.view}
          label={range.shortLabel}
          prevAnchor={range.prevAnchor}
          nextAnchor={range.nextAnchor}
          isCurrent={range.isCurrent}
        />
      </div>

      <Suspense key={`${range.view}:${range.anchor}`} fallback={<SummaryCardSkeleton />}>
        <TeamSummarySection
          teamId={team.id}
          teamName={team.name}
          range={range}
          timeZone={timeZone}
          heading={summaryHeading(range, t)}
          periodLabel={range.label}
          timezoneLabel={range.view === "all" ? undefined : formatTimezoneLabel(timeZone)}
          sessionCount={stats.sessionCount}
          activeMembers={stats.activeMembers}
        />
      </Suspense>

      {/* Headline stats with sparklines */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("stats.sessions")}
          value={formatNumber(stats.sessionCount)}
          hint={t("stats.sessionsHint", { count: formatNumber(stats.messageCount) })}
          icon={<Activity className="h-5 w-5" />}
          accent={3}
          chart={<Sparkline data={sessionSpark} accent={3} />}
          delta={deltaFor(stats.sessionCount, prevStats?.sessionCount)}
        />
        <StatCard
          label={t("stats.totalTokens")}
          value={formatCompact(totalTokens)}
          hint={t("stats.totalTokensHint", { count: formatCompact(stats.outputTokens) })}
          icon={<Layers className="h-5 w-5" />}
          accent={0}
          chart={<Sparkline data={tokenSpark} accent={0} />}
          delta={deltaFor(
            totalTokens,
            prevStats ? prevStats.inputTokens + prevStats.outputTokens : undefined
          )}
        />
        <StatCard
          label={t("stats.activeMembers")}
          value={formatNumber(stats.activeMembers)}
          hint={t("stats.activeMembersHint")}
          icon={<Users className="h-5 w-5" />}
          accent={2}
          delta={deltaFor(stats.activeMembers, prevStats?.activeMembers)}
        />
        <StatCard
          label={t("stats.activeTime")}
          value={formatDuration(stats.activeMs)}
          hint={formatActivityHint(stats.peakConcurrency, stats.parallelFactor)}
          icon={<Clock className="h-5 w-5" />}
          accent={4}
          delta={deltaFor(stats.activeMs, prevStats?.activeMs)}
        />
      </div>

      {/* Activity trend */}
      <ChartCard
        title={t("charts.activityTitle")}
        description={
          range.view === "day"
            ? t("charts.activityDescHourly")
            : t("charts.activityDescDaily")
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
          title={t("charts.modelsTitle")}
          description={t("charts.modelsDesc")}
          icon={<Cpu className="h-4 w-4" />}
        >
          <DonutChart data={modelSlices} centerLabel={t("charts.modelsCenterLabel")} />
        </ChartCard>

        <ChartCard
          title={t("charts.tokenCompositionTitle")}
          description={t("charts.tokenCompositionDesc")}
          icon={<Layers className="h-4 w-4" />}
        >
          <TokenCompositionBar segments={tokenSegments} />
        </ChartCard>
      </div>

      {/* Tools + projects */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title={t("charts.toolsTitle")}
          description={t("charts.toolsDesc")}
          icon={<Wrench className="h-4 w-4" />}
        >
          <RadialChart data={toolItems} />
        </ChartCard>

        <ChartCard
          title={t("charts.topProjectsTitle")}
          description={t("charts.topProjectsDesc")}
          icon={<FolderGit2 className="h-4 w-4" />}
        >
          <BarListChart data={projectItems} valueLabel={t("charts.topProjectsValueLabel")} subLabel={t("charts.topProjectsSubLabel")} height={Math.max(160, projectItems.length * 34)} />
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
        title={t("charts.heatmapTitle")}
        description={t("charts.heatmapDesc")}
        icon={<Clock className="h-4 w-4" />}
      >
        <ActivityHeatmapPanel team={heatmap.team} members={heatmap.members} />
      </ChartCard>
    </div>
  );
}
