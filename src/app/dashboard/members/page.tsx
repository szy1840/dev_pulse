import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Coins, Clock, ChevronRight } from "lucide-react";
import { requireUserId, getActiveTeam, getViewerTimezone } from "@/lib/auth";
import { getTranslations, getLocale } from "next-intl/server";
import { getMemberActivity, getSessionsForSummary } from "@/lib/queries";
import { getUserPeriodSummaries } from "@/lib/daily-summary";
import { resolveRange, type PeriodRange } from "@/lib/period";
import { type Locale } from "@/lib/locale";
import { cn } from "@/lib/utils";
import { MemberTodayPanel } from "@/components/member-today-panel";
import { formatCompact, formatNumber, formatDuration, formatActivityHint } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ToolBadge } from "@/components/tool-badge";
import { PeriodSelector } from "@/components/period-selector";
import { ChartCard } from "@/components/charts/chart-card";
import { DonutChart } from "@/components/charts/donut-chart";
import { BarListChart } from "@/components/charts/bar-list-chart";
import { MemberLeaderboard, rankMedal } from "@/components/member-leaderboard";
import { MembersViewToggle } from "@/components/members-view-toggle";

type MemberRow = Awaited<ReturnType<typeof getMemberActivity>>[number];

function memberHref(memberId: string, range: PeriodRange): string {
  const q = new URLSearchParams();
  if (range.view !== "week") q.set("view", range.view);
  if (!range.isCurrent && range.anchor) q.set("anchor", range.anchor);
  return `/dashboard/members/${memberId}${q.size ? `?${q}` : ""}`;
}

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; anchor?: string; period?: string }>;
}) {
  const userId = await requireUserId();
  const team = await getActiveTeam(userId);
  if (!team) return null;

  const t = await getTranslations("members");
  const params = await searchParams;
  const timeZone = await getViewerTimezone(userId);
  const range = resolveRange(params.view ?? params.period, params.anchor, timeZone);
  const [members, periodSessions] = await Promise.all([
    getMemberActivity(team.id, range),
    getSessionsForSummary(team.id, range),
  ]);

  // Group the period's sessions per user for the per-member summary line.
  const byUser = new Map<string, typeof periodSessions>();
  for (const s of periodSessions) {
    const list = byUser.get(s.userId) ?? [];
    list.push(s);
    byUser.set(s.userId, list);
  }

  // Generate (or read cached) period summaries per member in parallel.
  const locale = (await getLocale()) as Locale;
  const periodSummaries = new Map(
    await Promise.all(
      members.map(async (m) => [
        m.userId,
        await getUserPeriodSummaries(
          team.id,
          m.userId,
          m.name ?? t("thisMemberFallback"),
          range,
          timeZone,
          byUser.get(m.userId) ?? [],
          locale
        ),
      ] as const)
    )
  );

  const active = members.filter((m) => m.sessionCount > 0);
  const tokenShare = active.map((m) => ({ name: m.name ?? t("memberFallback"), value: m.tokens }));
  const activeTimeRanking = active
    .filter((m) => m.activeMs > 0)
    .sort((a, b) => b.activeMs - a.activeMs)
    .map((m) => ({ name: m.name ?? t("memberFallback"), value: m.activeMs }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("summary", { count: members.length, active: active.length })}
          </p>
        </div>
        <PeriodSelector
          view={range.view}
          label={range.shortLabel}
          prevAnchor={range.prevAnchor}
          nextAnchor={range.nextAnchor}
          isCurrent={range.isCurrent}
        />
      </div>

      {active.length > 0 && (
        <div className="space-y-4">
          <MemberLeaderboard
            members={active}
            viewerId={userId}
            periodWord={range.shortLabel}
            hrefFor={(id) => memberHref(id, range)}
          />
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard
              title={t("charts.tokenShareTitle")}
              description={t("charts.tokenShareDescription")}
              icon={<Coins className="h-4 w-4" />}
            >
              <DonutChart
                data={tokenShare}
                centerLabel={t("charts.tokensCenterLabel")}
                centerValue={formatCompact(tokenShare.reduce((a, m) => a + m.value, 0))}
              />
            </ChartCard>
            <ChartCard
              title={t("charts.activeTimeByMemberTitle")}
              description={t("charts.activeTimeByMemberDescription")}
              icon={<Clock className="h-4 w-4" />}
            >
              <BarListChart
                data={activeTimeRanking}
                valueLabel={t("charts.activeTimeValueLabel")}
                format="duration"
                height={Math.max(160, activeTimeRanking.length * 36)}
              />
            </ChartCard>
          </div>
        </div>
      )}

      <MembersViewToggle
        cards={<MemberCards members={members} viewerId={userId} range={range} summaries={periodSummaries} />}
        table={<MemberTable members={members} viewerId={userId} range={range} />}
      />
    </div>
  );
}

async function MemberCards({
  members,
  viewerId,
  range,
  summaries,
}: {
  members: MemberRow[];
  viewerId: string;
  range: PeriodRange;
  summaries: Map<string, { overall: string; byTool: { tool: string; summary: string; sessions: { summary: string | null; projectName: string | null }[] }[] }>;
}) {
  const t = await getTranslations("members");
  return (
    <div className="grid gap-4">
      {members.map((m, i) => (
        <Card
          key={m.userId}
          className={cn(
            "transition-shadow hover:shadow-md",
            i === 0 && m.sessionCount > 0 && "ring-1 ring-inset ring-primary/15"
          )}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <Avatar name={m.name} imageUrl={m.imageUrl} className="h-10 w-10" />
              <div className="min-w-0">
                <CardTitle className="flex items-center gap-2 text-base">
                  {m.sessionCount > 0 && i < 3 && (
                    <span aria-hidden className="text-lg leading-none">
                      {rankMedal(i)}
                    </span>
                  )}
                  <Link
                    href={memberHref(m.userId, range)}
                    className="truncate underline-offset-4 hover:underline"
                  >
                    {m.name ?? t("memberFallback")}
                  </Link>
                  {m.role === "owner" && <Badge variant="secondary">{t("owner")}</Badge>}
                  {m.userId === viewerId && <Badge variant="outline">{t("you")}</Badge>}
                </CardTitle>
                <CardDescription className="truncate">{m.email}</CardDescription>
              </div>
              <div className="ml-auto flex items-center gap-3">
                <span className="text-right text-sm text-muted-foreground">
                  {m.lastActive
                    ? t("activeAgo", { time: formatDistanceToNow(m.lastActive, { addSuffix: true }) })
                    : t("noActivity")}
                </span>
                <Link
                  href={memberHref(m.userId, range)}
                  aria-label={t("viewProfile", { name: m.name ?? t("memberFallback") })}
                  className="flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-6 text-sm">
              <Stat label={t("stats.sessions")} value={formatNumber(m.sessionCount)} />
              <Stat label={t("stats.tokens")} value={formatCompact(m.tokens)} />
              <Stat label={t("stats.activeTime")} value={formatDuration(m.activeMs)} />
              {m.peakConcurrency > 1 && (
                <Stat
                  label={t("stats.peakConcurrent")}
                  value={String(m.peakConcurrency)}
                  hint={formatActivityHint(m.peakConcurrency, m.parallelFactor)}
                />
              )}
            </div>
            {m.toolBreakdown.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">{t("agents")}</span>
                {m.toolBreakdown.map(({ tool, count }) => (
                  <span key={tool} className="inline-flex items-center gap-1.5">
                    <ToolBadge tool={tool} className="text-xs" />
                    <span className="text-xs tabular-nums text-muted-foreground">×{count}</span>
                  </span>
                ))}
              </div>
            )}
            <MemberTodayPanel
              overall={
                summaries.get(m.userId)?.overall ??
                t("noSessionsInPeriod", { name: m.name ?? t("memberFallback") })
              }
              byTool={summaries.get(m.userId)?.byTool ?? []}
              periodWord={range.shortLabel}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

async function MemberTable({
  members,
  viewerId,
  range,
}: {
  members: MemberRow[];
  viewerId: string;
  range: PeriodRange;
}) {
  const t = await getTranslations("members");
  return (
    <Card>
      <CardContent className="pt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">#</TableHead>
              <TableHead>{t("table.member")}</TableHead>
              <TableHead className="text-right">{t("stats.sessions")}</TableHead>
              <TableHead className="text-right">{t("stats.tokens")}</TableHead>
              <TableHead className="text-right">{t("stats.activeTime")}</TableHead>
              <TableHead>{t("detail.agentsTitle")}</TableHead>
              <TableHead className="text-right">{t("stats.lastActive")}</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m, i) => (
              <TableRow key={m.userId}>
                <TableCell className="text-center tabular-nums">
                  {m.sessionCount > 0 ? (
                    <span className={cn(i < 3 ? "text-base" : "text-sm text-muted-foreground")}>
                      {rankMedal(i)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <Link href={memberHref(m.userId, range)} className="flex items-center gap-2.5">
                    <Avatar name={m.name} imageUrl={m.imageUrl} className="h-7 w-7" />
                    <span className="font-medium underline-offset-4 hover:underline">
                      {m.name ?? t("memberFallback")}
                    </span>
                    {m.role === "owner" && <Badge variant="secondary">{t("owner")}</Badge>}
                    {m.userId === viewerId && <Badge variant="outline">{t("you")}</Badge>}
                  </Link>
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatNumber(m.sessionCount)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCompact(m.tokens)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {m.activeMs > 0 ? formatDuration(m.activeMs) : "—"}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1.5">
                    {m.toolBreakdown.slice(0, 3).map(({ tool }) => (
                      <ToolBadge key={tool} tool={tool} className="text-xs" />
                    ))}
                    {m.toolBreakdown.length === 0 && (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap text-right text-sm text-muted-foreground">
                  {m.lastActive ? formatDistanceToNow(m.lastActive, { addSuffix: true }) : "—"}
                </TableCell>
                <TableCell>
                  <Link
                    href={memberHref(m.userId, range)}
                    aria-label={t("viewProfile", { name: m.name ?? t("memberFallback") })}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
      {hint ? <div className="text-xs text-muted-foreground/80">{hint}</div> : null}
    </div>
  );
}
