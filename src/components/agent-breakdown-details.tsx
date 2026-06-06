"use client";

import { ToolBadge } from "@/components/tool-badge";
import { AnimatedDisclosure } from "@/components/animated-disclosure";
import type { ToolTodaySummary } from "@/lib/daily-summary";

export function AgentBreakdownDetails({ byTool }: { byTool: ToolTodaySummary[] }) {
  if (byTool.length === 0) return null;

  return (
    <AnimatedDisclosure label={`By agent (${byTool.length})`}>
      <div className="space-y-4">
        {byTool.map(({ tool, summary, sessions }, i) => (
          <div
            key={tool}
            className={i > 0 ? "space-y-2 border-t border-border/60 pt-4" : "space-y-2"}
          >
            <ToolBadge tool={tool} />
            <p className="text-sm leading-relaxed text-muted-foreground">{summary}</p>
            {sessions.length > 0 && (
              <ul className="space-y-1.5 border-l-2 border-border/60 pl-3">
                {sessions.map((s, j) => (
                  <li key={j} className="text-xs leading-relaxed text-muted-foreground">
                    {s.summary ?? s.projectName ?? "Session"}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </AnimatedDisclosure>
  );
}
