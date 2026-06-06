"use client";

import { Area, AreaChart } from "recharts";
import { ChartSize } from "./chart-size";

/** Tiny inline trend line for stat cards. */
export function Sparkline({
  data,
  dataKey = "value",
  accent = 0,
  height = 36,
}: {
  data: Record<string, number>[];
  dataKey?: string;
  accent?: number;
  height?: number;
}) {
  if (data.length < 2) return null;
  const id = `spark-${accent}-${dataKey}`;
  const color = `hsl(var(--chart-${(accent % 6) + 1}))`;
  return (
    <ChartSize height={height}>
      <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#${id})`}
          isAnimationActive={false}
        />
      </AreaChart>
    </ChartSize>
  );
}
