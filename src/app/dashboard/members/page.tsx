import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Users, Coins, ChevronRight } from "lucide-react";
import { requireUserId, getActiveTeam, getViewerTimezone } from "@/lib/auth";
import { getMemberActivity, getSessionsForSummary } from "@/lib/queries";
import { getUserPeriodSummaries } from "@/lib/daily-summary";
import { resolveRange, type PeriodRange } from "@/lib/period";
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
import { BarListChart } from "@/components/charts/bar-list-chart";
import { DonutChart } from "@/components/charts/donut-chart";
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
          <p className="text-sm text-muted-foreground">
            {members.length} member{members.length === 1 ? "" : "s"} · {active.length} active in this
            period
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
            <DonutChart
              data={tokenShare}
              centerLabel="tokens"
              centerValue={formatCompact(tokenShare.reduce((a, m) => a + m.value, 0))}
            />
          </ChartCard>
        </div>
      )}

      <MembersViewToggle
        cards={<MemberCards members={members} viewerId={userId} range={range} summaries={periodSummaries} />}
        table={<MemberTable members={members} viewerId={userId} range={range} />}
      />
    </div>
  );
}

function MemberCards({
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
  return (
    <div className="grid gap-4">
      {members.map((m) => (
        <Card key={m.userId} className="transition-shadow hover:shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <Avatar name={m.name} imageUrl={m.imageUrl} className="h-10 w-10" />
              <div className="min-w-0">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Link
                    href={memberHref(m.userId, range)}
                    className="truncate underline-offset-4 hover:underline"
                  >
                    {m.name ?? "Member"}
                  </Link>
                  {m.role === "owner" && <Badge variant="secondary">Owner</Badge>}
                  {m.userId === viewerId && <Badge variant="outline">You</Badge>}
                </CardTitle>
                <CardDescription className="truncate">{m.email}</CardDescription>
              </div>
              <div className="ml-auto flex items-center gap-3">
                <span className="text-right text-sm text-muted-foreground">
                  {m.lastActive
                    ? `Active ${formatDistanceToNow(m.lastActive, { addSuffix: true })}`
                    : "No activity yet"}
                </span>
                <Link
                  href={memberHref(m.userId, range)}
                  aria-label={`View ${m.name ?? "member"}'s profile`}
                  className="flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <ChevronRight className="h-4 w-4" />
                </Link>
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
                summaries.get(m.userId)?.overall ??
                `${m.name ?? "Member"} had no AI coding sessions in this period.`
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

function MemberTable({
  members,
  viewerId,
  range,
}: {
  members: MemberRow[];
  viewerId: string;
  range: PeriodRange;
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead className="text-right">Sessions</TableHead>
              <TableHead className="text-right">Tokens</TableHead>
              <TableHead className="text-right">Active time</TableHead>
              <TableHead>Agents</TableHead>
              <TableHead className="text-right">Last active</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => (
              <TableRow key={m.userId}>
                <TableCell>
                  <Link href={memberHref(m.userId, range)} className="flex items-center gap-2.5">
                    <Avatar name={m.name} imageUrl={m.imageUrl} className="h-7 w-7" />
                    <span className="font-medium underline-offset-4 hover:underline">
                      {m.name ?? "Member"}
                    </span>
                    {m.role === "owner" && <Badge variant="secondary">Owner</Badge>}
                    {m.userId === viewerId && <Badge variant="outline">You</Badge>}
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
                    aria-label={`View ${m.name ?? "member"}'s profile`}
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
