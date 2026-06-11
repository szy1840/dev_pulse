import { GitCommitHorizontal } from "lucide-react";
import { ChartCard } from "@/components/charts/chart-card";
import { Badge } from "@/components/ui/badge";
import { formatCompact, formatDuration } from "@/lib/format";
import type { AttributionCoverage, CommitCostRow } from "@/lib/attribution";

/**
 * "What did the tokens ship?" — commits matched to work spans, with the cost
 * (tokens + active time) each one absorbed. The coverage badge is deliberately
 * honest: unattributed spend (exploration, abandoned work, uncommitted
 * changes) is reported, not hidden.
 */
export function CommitCosts({
  commits,
  coverage,
  unmatchedCommitCount,
}: {
  commits: CommitCostRow[];
  coverage: AttributionCoverage;
  unmatchedCommitCount: number;
}) {
  const pct =
    coverage.coverageRatio === null ? null : Math.round(coverage.coverageRatio * 100);

  return (
    <ChartCard
      title="Commit costs"
      description="AI spend attributed to shipped commits"
      icon={<GitCommitHorizontal className="h-4 w-4" />}
      action={
        pct !== null ? (
          <Badge variant="secondary" title="Share of span tokens matched to a commit">
            {pct}% attributed
          </Badge>
        ) : undefined
      }
    >
      {commits.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No commits matched to AI work yet. Costs appear here once synced sessions
          overlap with local git commits.
        </p>
      ) : (
        <div className="space-y-1">
          {commits.map((c) => (
            <div
              key={c.sha}
              className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-muted/50"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium" title={c.subject}>
                  {c.subject || c.sha.slice(0, 8)}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  <span className="font-mono">{c.sha.slice(0, 8)}</span>
                  {c.projectName && <> · {c.projectName}</>}
                  {c.userName && <> · {c.userName}</>}
                  {" · "}
                  <span className="text-emerald-600 dark:text-emerald-500">
                    +{formatCompact(c.insertions)}
                  </span>
                  /
                  <span className="text-red-600 dark:text-red-500">
                    -{formatCompact(c.deletions)}
                  </span>
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold tabular-nums">
                  {formatCompact(c.inputTokens + c.outputTokens)}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">tok</span>
                </p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {formatDuration(c.workMs)}
                </p>
              </div>
            </div>
          ))}
          <p className="px-2 pt-2 text-xs text-muted-foreground">
            {formatCompact(coverage.attributedSpanTokens)} of{" "}
            {formatCompact(coverage.totalSpanTokens)} span tokens attributed
            {unmatchedCommitCount > 0 && <> · {unmatchedCommitCount} commits without matched AI work</>}
          </p>
        </div>
      )}
    </ChartCard>
  );
}
