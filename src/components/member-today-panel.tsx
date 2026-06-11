"use client";

import { AgentBreakdownDetails } from "@/components/agent-breakdown-details";
import type { ToolTodaySummary } from "@/lib/daily-summary";

export function MemberTodayPanel({
  overall,
  byTool,
  periodWord = "Today",
}: {
  overall: string;
  byTool: ToolTodaySummary[];
  /** Inline label for the period, e.g. "Today" / "This week" / "Jun 9 – 15". */
  periodWord?: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm leading-relaxed text-muted-foreground">
        <span className="font-medium text-foreground">{periodWord}: </span>
        {overall}
      </p>
      <AgentBreakdownDetails byTool={byTool} />
    </div>
  );
}
