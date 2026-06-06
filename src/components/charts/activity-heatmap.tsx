"use client";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOUR_TICKS = [0, 6, 12, 18, 23];

/** GitHub-style weekday×hour heatmap. `grid[day][hour]` = session count. */
export function ActivityHeatmap({ grid, max }: { grid: number[][]; max: number }) {
  if (max === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No activity yet.</p>;
  }

  const intensity = (v: number) => {
    if (v === 0) return 0;
    // 4 buckets so light values stay visible.
    return Math.min(4, Math.ceil((v / max) * 4));
  };
  const bg = ["hsl(var(--muted))", "hsl(var(--chart-1) / 0.3)", "hsl(var(--chart-1) / 0.55)", "hsl(var(--chart-1) / 0.8)", "hsl(var(--chart-1))"];

  return (
    <div className="space-y-2 overflow-x-auto">
      <div className="min-w-[480px]">
        {grid.map((row, day) => (
          <div key={day} className="flex items-center gap-1">
            <span className="w-9 shrink-0 text-right text-[10px] text-muted-foreground">
              {DAYS[day]}
            </span>
            <div className="flex flex-1 gap-1">
              {row.map((v, hour) => (
                <div
                  key={hour}
                  title={`${DAYS[day]} ${String(hour).padStart(2, "0")}:00 — ${v} session${v === 1 ? "" : "s"}`}
                  className="aspect-square flex-1 rounded-[3px] transition-transform hover:scale-125"
                  style={{ background: bg[intensity(v)] }}
                />
              ))}
            </div>
          </div>
        ))}
        <div className="mt-1 flex items-center gap-1 pl-10">
          {Array.from({ length: 24 }).map((_, h) => (
            <span key={h} className="flex-1 text-center text-[9px] text-muted-foreground">
              {HOUR_TICKS.includes(h) ? String(h).padStart(2, "0") : ""}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground">
        <span>Less</span>
        {bg.map((c, i) => (
          <span key={i} className="h-3 w-3 rounded-[3px]" style={{ background: c }} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
