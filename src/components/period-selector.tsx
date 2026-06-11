"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const views: { value: string; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "all", label: "All time" },
];

/**
 * Calendar-period navigation: granularity tabs plus prev/next arrows over the
 * concrete period (a specific day / week / month). The server resolves anchors
 * and labels; this component only writes URL params.
 */
export function PeriodSelector({
  view,
  label,
  prevAnchor,
  nextAnchor,
  isCurrent,
}: {
  view: string;
  label: string;
  prevAnchor: string | null;
  nextAnchor: string | null;
  isCurrent: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function navigate(nextView: string, anchor?: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("period"); // drop legacy param
    params.set("view", nextView);
    if (anchor) params.set("anchor", anchor);
    else params.delete("anchor"); // current period
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {view !== "all" && (
        <div className="inline-flex items-center gap-1 rounded-lg border px-1 py-0.5">
          <button
            onClick={() => prevAnchor && navigate(view, prevAnchor)}
            disabled={!prevAnchor}
            aria-label="Previous period"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => navigate(view)}
            title={isCurrent ? undefined : "Jump to current"}
            className={cn(
              "min-w-[8rem] px-1 text-center text-sm font-medium tabular-nums",
              isCurrent ? "cursor-default" : "hover:text-foreground text-foreground/80"
            )}
          >
            {label}
          </button>
          <button
            onClick={() => nextAnchor && navigate(view, nextAnchor)}
            disabled={!nextAnchor}
            aria-label="Next period"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="inline-flex rounded-lg border p-0.5">
        {views.map((opt) => (
          <button
            key={opt.value}
            onClick={() => navigate(opt.value)}
            className={cn(
              "rounded-md px-3 py-1 text-sm font-medium transition-colors",
              view === opt.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
