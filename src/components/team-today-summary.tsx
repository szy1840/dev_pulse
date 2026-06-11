import { Sparkles, Users, Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TeamTodayMembersExpand, type TeamMemberToday } from "@/components/team-today-members-expand";

export function TeamTodaySummary({
  teamName,
  summary,
  heading,
  periodLabel,
  timezoneLabel,
  sessionCount,
  activeMembers,
  members = [],
}: {
  teamName: string;
  summary: string;
  /** e.g. "Today's team summary" / "This week's team summary". */
  heading: string;
  /** Concrete period label, e.g. "Jun 9 – Jun 15, 2026". */
  periodLabel: string;
  timezoneLabel?: string;
  sessionCount: number;
  activeMembers: number;
  members?: TeamMemberToday[];
}) {
  const isEmpty = sessionCount === 0;

  return (
    <Card className="relative overflow-hidden shadow-sm">
      <span
        className="absolute inset-x-0 top-0 h-1"
        style={{
          background:
            "linear-gradient(90deg, hsl(var(--chart-2)), hsl(var(--chart-3)), hsl(var(--chart-4)))",
        }}
      />
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
              "bg-gradient-to-br from-violet-500/12 via-sky-500/10 to-transparent",
              "ring-1 ring-inset ring-violet-500/15",
              "text-violet-600 dark:text-violet-300"
            )}
          >
            <Sparkles className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-0.5">
                <h2 className="text-base font-semibold tracking-tight">{heading}</h2>
                <p className="text-xs text-muted-foreground">
                  {periodLabel}
                  {timezoneLabel ? ` (${timezoneLabel})` : ""} · {teamName}
                </p>
              </div>

              {!isEmpty && (
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="gap-1 font-normal tabular-nums">
                    <Activity className="h-3 w-3 opacity-70" />
                    {sessionCount} session{sessionCount === 1 ? "" : "s"}
                  </Badge>
                  <Badge variant="secondary" className="gap-1 font-normal tabular-nums">
                    <Users className="h-3 w-3 opacity-70" />
                    {activeMembers} active
                  </Badge>
                </div>
              )}
            </div>

            <p
              className={cn(
                "text-[15px] leading-relaxed",
                isEmpty ? "text-muted-foreground italic" : "text-foreground/90"
              )}
            >
              {summary}
            </p>

            <TeamTodayMembersExpand members={members} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
