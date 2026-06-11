import { Cpu, Wrench } from "lucide-react";
import { requireUserId, getActiveTeam, getViewerTimezone } from "@/lib/auth";
import { getRecentSessions, getModelBreakdown, getToolBreakdown } from "@/lib/queries";
import { resolveRange } from "@/lib/period";
import { prettyModel, prettyTool } from "@/lib/format";
import { PeriodSelector } from "@/components/period-selector";
import { ChartCard } from "@/components/charts/chart-card";
import { DonutChart } from "@/components/charts/donut-chart";
import { RadialChart } from "@/components/charts/radial-chart";
import { SessionsExplorer } from "@/components/sessions-explorer";

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
    getRecentSessions(team.id, range, 500),
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
          <p className="text-sm text-muted-foreground">
            Search, filter and export your team&apos;s AI coding sessions
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

      <SessionsExplorer sessions={rows} />
    </div>
  );
}
