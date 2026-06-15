import { useTranslations } from "next-intl";
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
  const t = useTranslations("dashboard");
  const pct =
    coverage.coverageRatio === null ? null : Math.round(coverage.coverageRatio * 100);

  return (
    <ChartCard
      title={t("commitCosts.title")}
      description={t("commitCosts.description")}
      icon={<GitCommitHorizontal className="h-4 w-4" />}
      action={
        pct !== null ? (
          <Badge variant="secondary" title={t("commitCosts.attributedTooltip")}>
            {t("commitCosts.attributedBadge", { pct })}
          </Badge>
        ) : undefined
      }
    >
      {commits.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {t("commitCosts.empty")}
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
                  <span className="ml-1 text-xs font-normal text-muted-foreground">{t("commitCosts.tokUnit")}</span>
                </p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {formatDuration(c.workMs)}
                </p>
              </div>
            </div>
          ))}
          <p className="px-2 pt-2 text-xs text-muted-foreground">
            {t("commitCosts.footer", {
              attributed: formatCompact(coverage.attributedSpanTokens),
              total: formatCompact(coverage.totalSpanTokens),
            })}
            {unmatchedCommitCount > 0 && <> · {t("commitCosts.footerUnmatched", { count: unmatchedCommitCount })}</>}
          </p>
        </div>
      )}
    </ChartCard>
  );
}
