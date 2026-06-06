"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatNumber } from "@/lib/format";
import { colorAt } from "./chart-theme";
import { TooltipCard } from "./chart-tooltip";
import { ChartClientOnly } from "./chart-client-only";

export type DonutSlice = { name: string; value: number };

export function DonutChart({
  data,
  centerLabel,
  centerValue,
  unit = "",
}: {
  data: DonutSlice[];
  centerLabel?: string;
  centerValue?: string;
  unit?: string;
}) {
  const total = data.reduce((a, s) => a + s.value, 0);

  if (total === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No data yet.</p>;
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative h-[180px] w-[180px] shrink-0">
        <ChartClientOnly fallback={null}>
          <ResponsiveContainer width={180} height={180} minWidth={180}>
            <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={58}
              outerRadius={84}
              paddingAngle={2}
              strokeWidth={0}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={colorAt(i)} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const s = payload[0].payload as DonutSlice;
                const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
                return (
                  <TooltipCard
                    rows={[
                      {
                        label: s.name,
                        value: `${formatNumber(s.value)}${unit} · ${pct}%`,
                        color: colorAt(data.findIndex((d) => d.name === s.name)),
                      },
                    ]}
                  />
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        </ChartClientOnly>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tracking-tight">
            {centerValue ?? formatNumber(total)}
          </span>
          {centerLabel && (
            <span className="text-xs text-muted-foreground">{centerLabel}</span>
          )}
        </div>
      </div>

      <ul className="w-full space-y-2">
        {data.map((s, i) => {
          const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
          return (
            <li key={s.name} className="flex items-center gap-2 text-sm">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colorAt(i) }} />
              <span className="truncate">{s.name}</span>
              <span className="ml-auto shrink-0 tabular-nums text-muted-foreground">
                {formatNumber(s.value)}
                {unit} · {pct}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
