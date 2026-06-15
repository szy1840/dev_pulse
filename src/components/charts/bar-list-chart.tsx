"use client";

import {
  Bar,
  BarChart,
  Cell,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTranslations } from "next-intl";
import { ChartSize } from "./chart-size";
import { formatNumber, formatCompact, formatDuration } from "@/lib/format";
import { isUnknownLabel, UnknownHint } from "@/components/unknown-hint";
import { colorAt, AXIS_PROPS } from "./chart-theme";
import { TooltipCard } from "./chart-tooltip";

export type BarItem = { name: string; value: number; sub?: number };

/** Value formatters selectable from server components (functions aren't serializable). */
const VALUE_FORMATTERS = {
  number: formatNumber,
  compact: formatCompact,
  duration: formatDuration,
} as const;

export type ValueFormat = keyof typeof VALUE_FORMATTERS;

type CategoryTickProps = {
  x?: number;
  y?: number;
  payload?: { value?: string };
};

function CategoryTick({ x = 0, y = 0, payload }: CategoryTickProps) {
  const value = String(payload?.value ?? "");
  const label = value.length > 16 ? `${value.slice(0, 15)}…` : value;
  const showHint = isUnknownLabel(value);

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={4}
        textAnchor="end"
        fill="hsl(var(--muted-foreground))"
        fontSize={12}
      >
        {label}
      </text>
      {showHint && (
        <foreignObject x={4} y={-10} width={24} height={24} className="overflow-visible">
          <div className="flex h-5 w-5 items-center justify-center">
            <UnknownHint />
          </div>
        </foreignObject>
      )}
    </g>
  );
}

/** Horizontal bar ranking. `valueLabel`/`subLabel` name the metrics in tooltips. */
export function BarListChart({
  data,
  valueLabel,
  subLabel,
  height = 240,
  format = "number",
}: {
  data: BarItem[];
  valueLabel?: string;
  subLabel?: string;
  height?: number;
  /** How to format the bar-end label and tooltip value (e.g. "duration"). */
  format?: ValueFormat;
}) {
  const t = useTranslations("charts");
  if (data.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">{t("empty.noData")}</p>;
  }

  const resolvedValueLabel = valueLabel ?? t("barList.value");

  const formatValue = VALUE_FORMATTERS[format];

  // Reserve right margin for bar-end labels so multi-digit values aren't clipped.
  const maxLabelChars = Math.max(...data.map((d) => formatValue(d.value).length));
  const rightMargin = Math.max(32, maxLabelChars * 8 + 8);

  return (
    <ChartSize height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: rightMargin, bottom: 0, left: 0 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          {...AXIS_PROPS}
          width={128}
          tick={<CategoryTick />}
        />
        <Tooltip
          cursor={{ fill: "hsl(var(--muted) / 0.5)" }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const item = payload[0].payload as BarItem;
            const rows = [{ label: resolvedValueLabel, value: formatValue(item.value) }];
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
            formatter: (v) => formatValue(Number(v)),
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
