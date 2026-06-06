"use client";

import type { ReactNode } from "react";

export type TooltipRow = { label: string; value: ReactNode; color?: string };

/** A themed tooltip card used across recharts charts. */
export function TooltipCard({ title, rows }: { title?: string; rows: TooltipRow[] }) {
  return (
    <div className="rounded-lg border bg-popover/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      {title && <p className="mb-1 font-medium text-popover-foreground">{title}</p>}
      <div className="space-y-0.5">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-2 text-muted-foreground">
            {r.color && (
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: r.color }} />
            )}
            <span>{r.label}</span>
            <span className="ml-auto font-medium tabular-nums text-popover-foreground">
              {r.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
