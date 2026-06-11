import { formatDistanceToNow } from "date-fns";
import { Cpu, Wrench } from "lucide-react";
import { requireUserId, getActiveTeam, getViewerTimezone } from "@/lib/auth";
import { getRecentSessions, getModelBreakdown, getToolBreakdown } from "@/lib/queries";
import { resolveRange } from "@/lib/period";
import { formatCompact, formatDuration, prettyModel, prettyTool } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ToolBadge } from "@/components/tool-badge";
import { PeriodSelector } from "@/components/period-selector";
import { ChartCard } from "@/components/charts/chart-card";
import { DonutChart } from "@/components/charts/donut-chart";
import { RadialChart } from "@/components/charts/radial-chart";

export default async function SessionsPage({
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
  const [rows, models, tools] = await Promise.all([
    getRecentSessions(team.id, range, 100),
    getModelBreakdown(team.id, range),
    getToolBreakdown(team.id, range),
  ]);

  const modelSlices = models.slice(0, 6).map((m) => ({ name: prettyModel(m.model), value: m.sessionCount }));
  const toolItems = tools.map((t) => ({ name: prettyTool(t.tool), value: t.sessionCount }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Sessions</h1>
          <p className="text-sm text-muted-foreground">AI coding sessions synced by your team</p>
        </div>
        <PeriodSelector
          view={range.view}
          label={range.shortLabel}
          prevAnchor={range.prevAnchor}
          nextAnchor={range.nextAnchor}
          isCurrent={range.isCurrent}
        />
      </div>

      {rows.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="By model" description="Session share by model" icon={<Cpu className="h-4 w-4" />}>
            <DonutChart data={modelSlices} centerLabel="sessions" />
          </ChartCard>
          <ChartCard title="By tool" description="Sessions per AI tool" icon={<Wrench className="h-4 w-4" />}>
            <RadialChart data={toolItems} />
          </ChartCard>
        </div>
      )}

      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base">{rows.length} session{rows.length === 1 ? "" : "s"}</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No sessions in this period. Run{" "}
              <code className="rounded bg-muted px-1">devpulse sync</code> to upload.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead className="min-w-[220px]">Summary</TableHead>
                  <TableHead className="w-[108px] text-center">Agent</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                  <TableHead className="text-right">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((s) => {
                  const tokens = s.inputTokens + s.outputTokens;
                  const duration = s.engagedMs > 0 ? s.engagedMs : 0;
                  return (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar name={s.userName} imageUrl={s.userImage} className="h-6 w-6" />
                          <span className="text-sm">{s.userName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[140px]">
                        <span className="text-sm font-medium">{s.projectName ?? "Unknown"}</span>
                      </TableCell>
                      <TableCell className="max-w-md">
                        <p className="text-sm leading-snug text-muted-foreground">
                          {s.summary?.trim() || (
                            <span className="italic">{s.messageCount} messages — no summary yet</span>
                          )}
                        </p>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <ToolBadge tool={s.tool} />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{prettyModel(s.model)}</Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatCompact(tokens)}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {duration > 0 ? formatDuration(duration) : "—"}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {s.startedAt
                          ? formatDistanceToNow(s.startedAt, { addSuffix: true })
                          : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
