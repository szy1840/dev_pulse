"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const views = ["day", "week", "month", "all"] as const;

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
  const t = useTranslations("period");
  const [isPending, startTransition] = useTransition();
  // Optimistic granularity: highlight the clicked tab instantly instead of
  // waiting for the server round-trip to update the `view` prop.
  const [pendingView, setPendingView] = useState<string | null>(null);

  const activeView = isPending && pendingView ? pendingView : view;

  function navigate(nextView: string, anchor?: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("period"); // drop legacy param
    params.set("view", nextView);
    if (anchor) params.set("anchor", anchor);
    else params.delete("anchor"); // current period
    setPendingView(nextView);
    // Wrapping the push in a transition keeps the current page mounted (no
    // full-screen loading.tsx flash) and exposes isPending for inline feedback.
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 transition-opacity",
        isPending && "opacity-60"
      )}
      aria-busy={isPending}
    >
      {activeView !== "all" && (
        <div className="inline-flex items-center gap-1 rounded-lg border px-1 py-0.5">
          <button
            onClick={() => prevAnchor && navigate(view, prevAnchor)}
            disabled={!prevAnchor}
            aria-label={t("previous")}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => navigate(view)}
            title={isCurrent ? undefined : t("jumpToCurrent")}
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
            aria-label={t("next")}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="inline-flex rounded-lg border p-0.5">
        {views.map((opt) => (
          <button
            key={opt}
            onClick={() => navigate(opt)}
            className={cn(
              "rounded-md px-3 py-1 text-sm font-medium transition-colors",
              activeView === opt
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t(opt)}
          </button>
        ))}
      </div>
    </div>
  );
}
