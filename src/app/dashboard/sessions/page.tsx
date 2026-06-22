import { Cpu, Wrench } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
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

  const t = await getTranslations("sessions");

  const params = await searchParams;
  const timeZone = await getViewerTimezone(userId);
  const locale = await getLocale();
  const range = resolveRange(params.view ?? params.period, params.anchor, timeZone, locale);
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
          <h1 className="text-xl font-semibold">{t("heading")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
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
          <ChartCard title={t("byModelTitle")} description={t("byModelDescription")} icon={<Cpu className="h-4 w-4" />}>
            <DonutChart data={modelSlices} centerLabel={t("sessionsCenterLabel")} />
          </ChartCard>
          <ChartCard title={t("byToolTitle")} description={t("byToolDescription")} icon={<Wrench className="h-4 w-4" />}>
            <RadialChart data={toolItems} />
          </ChartCard>
        </div>
      )}

      <SessionsExplorer sessions={rows} />
    </div>
  );
}
