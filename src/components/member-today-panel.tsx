"use client";

import { AgentBreakdownDetails } from "@/components/agent-breakdown-details";
import type { ToolTodaySummary } from "@/lib/daily-summary";

export function MemberTodayPanel({
  overall,
  byTool,
}: {
  overall: string;
  byTool: ToolTodaySummary[];
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm leading-relaxed text-muted-foreground">
        <span className="font-medium text-foreground">Today: </span>
        {overall}
      </p>
      <AgentBreakdownDetails byTool={byTool} />
    </div>
  );
}
