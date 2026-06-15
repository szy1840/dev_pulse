"use client";

import { useTranslations } from "next-intl";
import { formatCompact, formatNumber } from "@/lib/format";

export type TokenSegment = { label: string; value: number; color: string };

/** A single stacked horizontal bar breaking down token usage by category. */
export function TokenCompositionBar({ segments }: { segments: TokenSegment[] }) {
  const t = useTranslations("charts");
  const total = segments.reduce((a, s) => a + s.value, 0);
  if (total === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">{t("empty.noTokens")}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
        {segments.map((s) =>
          s.value > 0 ? (
            <div
              key={s.label}
              className="h-full transition-all"
              style={{ width: `${(s.value / total) * 100}%`, background: s.color }}
              title={`${s.label}: ${formatNumber(s.value)}`}
            />
          ) : null
        )}
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
        {segments.map((s) => {
          const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
          return (
            <li key={s.label} className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
              <p className="text-sm font-semibold tabular-nums">{formatCompact(s.value)}</p>
              <p className="text-[10px] text-muted-foreground">{pct}%</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
