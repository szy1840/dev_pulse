import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import {
  Activity,
  ArrowLeft,
  Clock,
  Cpu,
  FolderGit2,
  Layers,
  MessageSquare,
  Wrench,
} from "lucide-react";
import { requireUserId, getActiveTeam, getViewerTimezone } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import {
  getTeamMemberProfile,
  getTeamStats,
  getMemberDailyActivity,
  getModelBreakdown,
  getToolBreakdown,
  getProjectBreakdown,
  getMemberHeatmap,
  getRecentSessions,
} from "@/lib/queries";
import { resolveRange, previousQueryRange, previousPeriodWord } from "@/lib/period";
import { MemberSummarySection } from "@/components/member-summary-section";
import { SummaryCardSkeleton } from "@/components/dashboard-skeletons";
import {
  formatCompact,
  formatNumber,
  formatDuration,
  formatActivityHint,
  prettyModel,
  prettyTool,
} from "@/lib/format";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ToolBadge } from "@/components/tool-badge";
import { PeriodSelector } from "@/components/period-selector";
import { StatCard } from "@/components/stat-card";
import { ChartCard } from "@/components/charts/chart-card";
import { ActivityTrendChart } from "@/components/charts/activity-trend-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { RadialChart } from "@/components/charts/radial-chart";
import { BarListChart } from "@/components/charts/bar-list-chart";
import { ActivityHeatmap } from "@/components/charts/activity-heatmap";
import { Sparkline } from "@/components/charts/sparkline";
import { SessionsExplorer } from "@/components/sessions-explorer";

export default async function MemberDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ memberId: string }>;
  searchParams: Promise<{ view?: string; anchor?: string; period?: string }>;
}) {
  const userId = await requireUserId();
  const team = await getActiveTeam(userId);
  if (!team) return null;

  const t = await getTranslations("members");
  const { memberId } = await params;
  const member = await getTeamMemberProfile(team.id, memberId);
  if (!member) notFound();

  const sp = await searchParams;
  const timeZone = await getViewerTimezone(userId);
  const range = resolveRange(sp.view ?? sp.period, sp.anchor, timeZone);
  const granularity = range.view === "day" ? "hour" : "day";
  const prevRange = previousQueryRange(range, timeZone);

  const [stats, prevStats, daily, models, tools, projects, heatmap, sessions] =
    await Promise.all([
      getTeamStats(team.id, range, memberId),
      prevRange ? getTeamStats(team.id, prevRange, memberId) : Promise.resolve(null),
      getMemberDailyActivity(team.id, memberId, range, { granularity, timeZone }),
      getModelBreakdown(team.id, range, memberId),
      getToolBreakdown(team.id, range, memberId),
      getProjectBreakdown(team.id, range, memberId),
      getMemberHeatmap(team.id, memberId, range, timeZone),
      getRecentSessions(team.id, range, 500, memberId),
    ]);

  const memberName = member.name ?? t("memberFallback");

  const totalTokens = stats.inputTokens + stats.outputTokens;
  const deltaWord = previousPeriodWord(range.view);
  const deltaFor = (current: number, previous: number | undefined) =>
    prevStats && previous !== undefined ? { current, previous, word: deltaWord } : undefined;

  const sessionSpark = daily.map((d) => ({ value: d.sessions }));
  const tokenSpark = daily.map((d) => ({ value: d.tokens }));
  const modelSlices = models.slice(0, 6).map((m) => ({ name: prettyModel(m.model), value: m.sessionCount }));
  const toolItems = tools.map((t) => ({ name: prettyTool(t.tool), value: t.sessionCount }));
  const projectItems = projects.slice(0, 7).map((p) => ({ name: p.project, value: p.sessions, sub: p.tokens }));

  const backQuery = new URLSearchParams();
  if (range.view !== "week") backQuery.set("view", range.view);
  if (!range.isCurrent && range.anchor) backQuery.set("anchor", range.anchor);
  const backHref = `/dashboard/members${backQuery.size ? `?${backQuery}` : ""}`;

  return (
    <div className="space-y-6">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("detail.allMembers")}
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar name={member.name} imageUrl={member.imageUrl} className="h-12 w-12 text-sm" />
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-xl font-semibold">
              <span className="truncate">{memberName}</span>
              {member.role === "owner" && <Badge variant="secondary">{t("owner")}</Badge>}
              {member.userId === userId && <Badge variant="outline">{t("you")}</Badge>}
            </h1>
            <p className="truncate text-sm text-muted-foreground">
              {member.email}
              {" · "}{t("detail.joined", { date: format(member.joinedAt, "MMM d, yyyy") })}
            </p>
          </div>
        </div>
        <PeriodSelector
          view={range.view}
          label={range.shortLabel}
          prevAnchor={range.prevAnchor}
          nextAnchor={range.nextAnchor}
          isCurrent={range.isCurrent}
        />
      </div>

      {/* AI period summary */}
      <Suspense key={`${range.view}:${range.anchor}`} fallback={<SummaryCardSkeleton />}>
        <MemberSummarySection
          teamId={team.id}
          memberId={memberId}
          memberName={memberName}
          range={range}
          timeZone={timeZone}
        />
      </Suspense>

      {/* Headline stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("stats.sessions")}
          value={formatNumber(stats.sessionCount)}
          hint={t("detail.messages", { count: formatNumber(stats.messageCount) })}
          icon={<Activity className="h-5 w-5" />}
          accent={3}
          chart={<Sparkline data={sessionSpark} accent={3} />}
          delta={deltaFor(stats.sessionCount, prevStats?.sessionCount)}
        />
        <StatCard
          label={t("stats.totalTokens")}
          value={formatCompact(totalTokens)}
          hint={t("detail.generated", { count: formatCompact(stats.outputTokens) })}
          icon={<Layers className="h-5 w-5" />}
          accent={0}
          chart={<Sparkline data={tokenSpark} accent={0} />}
          delta={deltaFor(
            totalTokens,
            prevStats ? prevStats.inputTokens + prevStats.outputTokens : undefined
          )}
        />
        <StatCard
          label={t("stats.activeTime")}
          value={formatDuration(stats.activeMs)}
          hint={formatActivityHint(stats.peakConcurrency, stats.parallelFactor)}
          icon={<Clock className="h-5 w-5" />}
          accent={4}
          delta={deltaFor(stats.activeMs, prevStats?.activeMs)}
        />
        <StatCard
          label={t("stats.avgSession")}
          value={
            stats.sessionCount > 0
              ? formatDuration(stats.sessionEngagedMs / stats.sessionCount)
              : "—"
          }
          hint={
            stats.sessionCount > 0
              ? t("detail.tokensEach", { count: formatCompact(Math.round(totalTokens / stats.sessionCount)) })
              : t("detail.noSessions")
          }
          icon={<MessageSquare className="h-5 w-5" />}
          accent={1}
        />
      </div>

      {/* Activity trend */}
      <ChartCard
        title={t("detail.activityOverTimeTitle")}
        description={
          granularity === "hour"
            ? t("detail.activityOverTimeHourly", { name: memberName })
            : t("detail.activityOverTimeDaily", { name: memberName })
        }
        icon={<Activity className="h-4 w-4" />}
      >
        <ActivityTrendChart teamData={daily} granularity={granularity} />
      </ChartCard>

      {/* Breakdowns */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title={t("detail.modelsTitle")} description={t("detail.modelsDescription")} icon={<Cpu className="h-4 w-4" />}>
          <DonutChart data={modelSlices} centerLabel={t("detail.modelsCenterLabel")} />
        </ChartCard>
        <ChartCard title={t("detail.agentsTitle")} description={t("detail.agentsDescription")} icon={<Wrench className="h-4 w-4" />}>
          <RadialChart data={toolItems} />
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title={t("detail.topProjectsTitle")}
          description={t("detail.topProjectsDescription")}
          icon={<FolderGit2 className="h-4 w-4" />}
        >
          <BarListChart
            data={projectItems}
            valueLabel={t("detail.projectsValueLabel")}
            subLabel={t("detail.projectsSubLabel")}
            height={Math.max(160, projectItems.length * 34)}
          />
        </ChartCard>
        <ChartCard
          title={t("detail.whenTheyCodeTitle")}
          description={t("detail.whenTheyCodeDescription")}
          icon={<Clock className="h-4 w-4" />}
        >
          <ActivityHeatmap grid={heatmap.grid} max={heatmap.max} />
        </ChartCard>
      </div>

      {/* Sessions */}
      <div className="space-y-3">
        <div>
          <h2 className="text-base font-semibold">{t("detail.sessionsHeading")}</h2>
          <p className="text-sm text-muted-foreground">{t("detail.sessionsSubheading", { name: memberName })}</p>
        </div>
        <SessionsExplorer sessions={sessions} showMember={false} />
      </div>
    </div>
  );
}
