"use client";

import { useTranslations } from "next-intl";
import {
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  PolarAngleAxis,
} from "recharts";
import { formatNumber } from "@/lib/format";
import { colorAt } from "./chart-theme";
import { ChartClientOnly } from "./chart-client-only";

export type RadialItem = { name: string; value: number };

export function RadialChart({ data }: { data: RadialItem[] }) {
  const t = useTranslations("charts");
  if (data.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">{t("empty.noData")}</p>;
  }

  const max = Math.max(...data.map((d) => d.value), 1);
  const chartData = data.slice(0, 6).map((d, i) => ({ ...d, fill: colorAt(i) }));

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="h-[180px] w-[180px] shrink-0">
        <ChartClientOnly fallback={null}>
          <ResponsiveContainer width={180} height={180} minWidth={180}>
            <RadialBarChart
            innerRadius="30%"
            outerRadius="100%"
            data={chartData}
            startAngle={90}
            endAngle={-270}
          >
            <PolarAngleAxis type="number" domain={[0, max]} tick={false} />
            <RadialBar background dataKey="value" cornerRadius={6} />
          </RadialBarChart>
        </ResponsiveContainer>
        </ChartClientOnly>
      </div>
      <ul className="w-full space-y-2">
        {chartData.map((d, i) => (
          <li key={d.name} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colorAt(i) }} />
            <span className="truncate capitalize">{d.name}</span>
            <span className="ml-auto shrink-0 tabular-nums text-muted-foreground">
              {formatNumber(d.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
