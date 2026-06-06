"use client";

import { Avatar } from "@/components/ui/avatar";
import { AnimatedDisclosure } from "@/components/animated-disclosure";

export type TeamMemberToday = {
  userId: string;
  name: string;
  imageUrl: string | null;
  sessionCount: number;
  overall: string;
};

export function TeamTodayMembersExpand({ members }: { members: TeamMemberToday[] }) {
  if (members.length === 0) return null;

  return (
    <AnimatedDisclosure label={`By member (${members.length})`}>
      <div className="space-y-4">
        {members.map((m, i) => (
          <div
            key={m.userId}
            className={i > 0 ? "space-y-2 border-t border-border/60 pt-4" : "space-y-2"}
          >
            <div className="flex items-center gap-2.5">
              <Avatar name={m.name} imageUrl={m.imageUrl} className="h-7 w-7" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{m.name}</p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {m.sessionCount} session{m.sessionCount === 1 ? "" : "s"} today
                </p>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">{m.overall}</p>
          </div>
        ))}
      </div>
    </AnimatedDisclosure>
  );
}
