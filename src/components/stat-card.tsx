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

export function StatCard({
  label,
  value,
  hint,
  icon,
  accent = 0,
  chart,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ReactNode;
  /** Index into the chart palette for the accent color. */
  accent?: number;
  /** Optional visual (e.g. a sparkline) rendered at the bottom. */
  chart?: React.ReactNode;
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
            <p className="text-2xl font-semibold tracking-tight">{value}</p>
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
