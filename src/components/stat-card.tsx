import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const ACCENTS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
] as const;

export type StatDelta = {
  /** Current period value (raw, not formatted). */
  current: number;
  /** Previous period value to compare against. */
  previous: number;
  /** Suffix after the percentage, e.g. "vs prev week". */
  word?: string;
};

function DeltaBadge({ delta }: { delta: StatDelta }) {
  // No baseline to compare against — stay quiet rather than show "+∞%".
  if (delta.previous <= 0 && delta.current <= 0) return null;
  if (delta.previous <= 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
        <ArrowUpRight className="h-3 w-3" />
        new
        {delta.word ? <span className="ml-0.5 font-normal text-muted-foreground">{delta.word}</span> : null}
      </span>
    );
  }
  const pct = ((delta.current - delta.previous) / delta.previous) * 100;
  const flat = Math.abs(pct) < 0.5;
  const up = pct > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium tabular-nums",
        flat
          ? "text-muted-foreground"
          : up
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-rose-600 dark:text-rose-400"
      )}
    >
      {flat ? (
        <Minus className="h-3 w-3" />
      ) : up ? (
        <ArrowUpRight className="h-3 w-3" />
      ) : (
        <ArrowDownRight className="h-3 w-3" />
      )}
      {flat ? "flat" : `${up ? "+" : ""}${Math.abs(pct) >= 100 ? Math.round(pct) : pct.toFixed(1)}%`}
      {delta.word ? <span className="ml-0.5 font-normal text-muted-foreground">{delta.word}</span> : null}
    </span>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  accent = 0,
  chart,
  delta,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ReactNode;
  /** Index into the chart palette for the accent color. */
  accent?: number;
  /** Optional visual (e.g. a sparkline) rendered at the bottom. */
  chart?: React.ReactNode;
  /** Optional period-over-period comparison badge. */
  delta?: StatDelta;
}) {
  const color = ACCENTS[accent % ACCENTS.length];
  return (
    <Card className="relative overflow-hidden transition-shadow hover:shadow-md">
      <span
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: `hsl(${color})` }}
      />
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{label}</p>
            <div className="flex flex-wrap items-baseline gap-2">
              <p className="text-2xl font-semibold tracking-tight">{value}</p>
              {delta && <DeltaBadge delta={delta} />}
            </div>
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
          </div>
          {icon && (
            <div
              className={cn("flex h-9 w-9 items-center justify-center rounded-lg")}
              style={{ background: `hsl(${color} / 0.12)`, color: `hsl(${color})` }}
            >
              {icon}
            </div>
          )}
        </div>
        {chart && <div className="mt-3 -mb-1 w-full min-w-0">{chart}</div>}
      </CardContent>
    </Card>
  );
}
