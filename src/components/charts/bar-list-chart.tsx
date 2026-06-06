"use client";

import {
  Bar,
  BarChart,
  Cell,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartSize } from "./chart-size";
import { formatNumber } from "@/lib/format";
import { colorAt, AXIS_PROPS } from "./chart-theme";
import { TooltipCard } from "./chart-tooltip";

export type BarItem = { name: string; value: number; sub?: number };

/** Horizontal bar ranking. `valueLabel`/`subLabel` name the metrics in tooltips. */
export function BarListChart({
  data,
  valueLabel = "Value",
  subLabel,
  height = 240,
}: {
  data: BarItem[];
  valueLabel?: string;
  subLabel?: string;
  height?: number;
}) {
  if (data.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No data yet.</p>;
  }

  // Reserve right margin for bar-end labels so multi-digit values aren't clipped.
  const maxLabelChars = Math.max(...data.map((d) => formatNumber(d.value).length));
  const rightMargin = Math.max(32, maxLabelChars * 8 + 8);

  return (
    <ChartSize height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: rightMargin, bottom: 0, left: 0 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          {...AXIS_PROPS}
          width={110}
          tickFormatter={(v: string) => (v.length > 16 ? v.slice(0, 15) + "…" : v)}
        />
        <Tooltip
          cursor={{ fill: "hsl(var(--muted) / 0.5)" }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const item = payload[0].payload as BarItem;
            const rows = [{ label: valueLabel, value: formatNumber(item.value) }];
            if (subLabel && item.sub !== undefined) {
              rows.push({ label: subLabel, value: formatNumber(item.sub) });
            }
            return <TooltipCard title={item.name} rows={rows} />;
          }}
        />
        <Bar
          dataKey="value"
          radius={[4, 4, 4, 4]}
          label={{
            position: "right",
            fontSize: 11,
            fill: "hsl(var(--muted-foreground))",
            formatter: (v) => formatNumber(Number(v)),
          }}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={colorAt(i)} />
          ))}
        </Bar>
      </BarChart>
    </ChartSize>
  );
}
