import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { formatNumber, formatCompact, formatDuration } from "@/lib/format";

const MEDALS = ["🥇", "🥈", "🥉"];

/** Emoji medal for the top 3, otherwise a "#n" rank label. */
export function rankMedal(rank: number): string {
  return MEDALS[rank] ?? `#${rank + 1}`;
}

/** Progress-bar fill color: warm gold for the podium, cool blue for the rest. */
function barColor(rank: number): string {
  const podium = ["hsl(var(--chart-5))", "hsl(var(--chart-3))", "hsl(var(--chart-2))"];
  return podium[rank] ?? "hsl(var(--chart-1) / 0.55)";
}

type LeaderMember = {
  userId: string;
  name: string | null;
  imageUrl: string | null;
  role: string;
  sessionCount: number;
  tokens: number;
  activeMs: number;
};

/**
 * Gamified, full-width ranking of active members by sessions for the period.
 * Presentational server component — the parent passes already-sorted member rows
 * and an href builder so each row links through to the member's profile.
 */
export function MemberLeaderboard({
  members,
  viewerId,
  periodWord,
  hrefFor,
  className,
}: {
  members: LeaderMember[];
  viewerId: string;
  /** e.g. "This week" — shown in the subheading. */
  periodWord: string;
  hrefFor: (memberId: string) => string;
  className?: string;
}) {
  const ranked = members.filter((m) => m.sessionCount > 0);
  if (ranked.length === 0) return null;
  const topSessions = ranked[0].sessionCount || 1;

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <span
        className="absolute inset-x-0 top-0 h-1"
        style={{
          background:
            "linear-gradient(90deg, hsl(var(--chart-5)), hsl(var(--chart-3)), hsl(var(--chart-2)))",
        }}
      />
      <CardContent className="p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400/20 via-amber-300/10 to-transparent text-xl ring-1 ring-inset ring-amber-400/20"
            aria-hidden
          >
            🏆
          </span>
          <div className="space-y-0.5">
            <h2 className="text-base font-semibold tracking-tight">Leaderboard</h2>
            <p className="text-xs text-muted-foreground">
              Top contributors by sessions · {periodWord}
            </p>
          </div>
        </div>

        {/* Column headers (wide screens only). */}
        <div className="hidden items-center gap-3 px-2 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:flex">
          <span className="w-7 shrink-0" />
          <span className="w-9 shrink-0" />
          <span className="flex-1">Member</span>
          <span className="w-16 shrink-0 text-right">Sessions</span>
          <span className="w-20 shrink-0 text-right">Tokens</span>
          <span className="hidden w-20 shrink-0 text-right md:block">Active</span>
        </div>

        <ol className="space-y-0.5">
          {ranked.map((m, i) => {
            const isYou = m.userId === viewerId;
            const pct = Math.max(6, Math.round((m.sessionCount / topSessions) * 100));
            return (
              <li key={m.userId}>
                <Link
                  href={hrefFor(m.userId)}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/60",
                    i === 0 && "bg-[hsl(var(--chart-5)/0.06)]",
                    isYou && "bg-primary/5 ring-1 ring-inset ring-primary/15"
                  )}
                >
                  <span
                    className={cn(
                      "w-7 shrink-0 text-center tabular-nums",
                      i < 3 ? "text-lg leading-none" : "text-sm font-semibold text-muted-foreground"
                    )}
                    aria-hidden
                  >
                    {rankMedal(i)}
                  </span>
                  <Avatar name={m.name} imageUrl={m.imageUrl} className="h-9 w-9" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium underline-offset-4 group-hover:underline">
                        {m.name ?? "Member"}
                      </span>
                      {m.role === "owner" && (
                        <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                          Owner
                        </Badge>
                      )}
                      {isYou && (
                        <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                          You
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1.5 h-1.5 w-full max-w-md overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, background: barColor(i) }}
                      />
                    </div>
                  </div>
                  {/* Metrics: aligned columns on wide screens, compact stack on mobile. */}
                  <div className="w-16 shrink-0 text-right text-sm font-semibold tabular-nums">
                    {formatNumber(m.sessionCount)}
                    <span className="ml-1 text-[11px] font-normal text-muted-foreground sm:hidden">
                      sess
                    </span>
                  </div>
                  <div className="hidden w-20 shrink-0 text-right text-sm tabular-nums text-muted-foreground sm:block">
                    {formatCompact(m.tokens)}
                  </div>
                  <div className="hidden w-20 shrink-0 text-right text-sm tabular-nums text-muted-foreground md:block">
                    {m.activeMs > 0 ? formatDuration(m.activeMs) : "—"}
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
