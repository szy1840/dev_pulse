import { formatDistanceToNow } from "date-fns";
import { Users, Coins } from "lucide-react";
import { requireUserId, getActiveTeam, getViewerTimezone } from "@/lib/auth";
import { getMemberActivity, getSessionsForSummary } from "@/lib/queries";
import { getUserPeriodSummaries } from "@/lib/daily-summary";
import { resolveRange } from "@/lib/period";
import { MemberTodayPanel } from "@/components/member-today-panel";
import { formatCompact, formatNumber, formatDuration, formatActivityHint } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ToolBadge } from "@/components/tool-badge";
import { PeriodSelector } from "@/components/period-selector";
import { ChartCard } from "@/components/charts/chart-card";
import { BarListChart } from "@/components/charts/bar-list-chart";
import { DonutChart } from "@/components/charts/donut-chart";

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; anchor?: string; period?: string }>;
}) {
  const userId = await requireUserId();
  const team = await getActiveTeam(userId);
  if (!team) return null;

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
  const periodSummaries = new Map(
    await Promise.all(
      members.map(async (m) => [
        m.userId,
        await getUserPeriodSummaries(
          team.id,
          m.userId,
          m.name ?? "This member",
          range,
          timeZone,
          byUser.get(m.userId) ?? []
        ),
      ] as const)
    )
  );

  const active = members.filter((m) => m.sessionCount > 0);
  const sessionRanking = active.map((m) => ({
    name: m.name ?? "Member",
    value: m.sessionCount,
    sub: m.tokens,
  }));
  const tokenShare = active.map((m) => ({ name: m.name ?? "Member", value: m.tokens }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Members</h1>
          <p className="text-sm text-muted-foreground">Per-member activity and daily summaries</p>
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
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard
            title="Sessions by member"
            description="Who ran the most AI sessions"
            icon={<Users className="h-4 w-4" />}
          >
            <BarListChart
              data={sessionRanking}
              valueLabel="Sessions"
              subLabel="Tokens"
              height={Math.max(160, sessionRanking.length * 36)}
            />
          </ChartCard>
          <ChartCard
            title="Token share"
            description="Token consumption across the team"
            icon={<Coins className="h-4 w-4" />}
          >
            <DonutChart data={tokenShare} centerLabel="tokens" centerValue={formatCompact(tokenShare.reduce((a, m) => a + m.value, 0))} />
          </ChartCard>
        </div>
      )}

      <div className="grid gap-4">
        {members.map((m) => (
          <Card key={m.userId}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <Avatar name={m.name} imageUrl={m.imageUrl} className="h-10 w-10" />
                <div className="min-w-0">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span className="truncate">{m.name ?? "Member"}</span>
                    {m.role === "owner" && <Badge variant="secondary">Owner</Badge>}
                    {m.userId === userId && <Badge variant="outline">You</Badge>}
                  </CardTitle>
                  <CardDescription className="truncate">{m.email}</CardDescription>
                </div>
                <div className="ml-auto text-right text-sm text-muted-foreground">
                  {m.lastActive
                    ? `Active ${formatDistanceToNow(m.lastActive, { addSuffix: true })}`
                    : "No activity yet"}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-6 text-sm">
                <Stat label="Sessions" value={formatNumber(m.sessionCount)} />
                <Stat label="Tokens" value={formatCompact(m.tokens)} />
                <Stat label="Active time" value={formatDuration(m.activeMs)} />
                {m.peakConcurrency > 1 && (
                  <Stat
                    label="Peak concurrent"
                    value={String(m.peakConcurrency)}
                    hint={formatActivityHint(m.peakConcurrency, m.parallelFactor)}
                  />
                )}
              </div>
              {m.toolBreakdown.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground">Agents:</span>
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
                  periodSummaries.get(m.userId)?.overall ??
                  `${m.name ?? "Member"} had no AI coding sessions in this period.`
                }
                byTool={periodSummaries.get(m.userId)?.byTool ?? []}
                periodWord={range.shortLabel}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
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
