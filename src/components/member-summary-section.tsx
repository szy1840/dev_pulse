import { getLocale } from "next-intl/server";
import { getSessionsForSummary } from "@/lib/queries";
import { getUserPeriodSummaries } from "@/lib/daily-summary";
import { Card, CardContent } from "@/components/ui/card";
import { MemberTodayPanel } from "@/components/member-today-panel";
import { type Locale } from "@/lib/locale";
import type { PeriodRange } from "@/lib/period";

/**
 * LLM-backed per-member summary card, isolated as its own async server component
 * so it can stream behind a <Suspense> boundary — period navigation stays snappy
 * because the page shell and charts no longer wait on the (uncached) OpenRouter
 * calls this triggers.
 */
export async function MemberSummarySection({
  teamId,
  memberId,
  memberName,
  range,
  timeZone,
}: {
  teamId: string;
  memberId: string;
  memberName: string;
  range: PeriodRange;
  timeZone: string;
}) {
  const locale = (await getLocale()) as Locale;
  const summarySessions = await getSessionsForSummary(teamId, range, memberId);
  const summaries = await getUserPeriodSummaries(
    teamId,
    memberId,
    memberName,
    range,
    timeZone,
    summarySessions,
    locale
  );

  return (
    <Card className="relative overflow-hidden">
      <span
        className="absolute inset-x-0 top-0 h-1"
        style={{
          background:
            "linear-gradient(90deg, hsl(var(--chart-2)), hsl(var(--chart-3)), hsl(var(--chart-4)))",
        }}
      />
      <CardContent className="pt-5">
        <MemberTodayPanel
          overall={summaries.overall}
          byTool={summaries.byTool}
          periodWord={range.shortLabel}
        />
      </CardContent>
    </Card>
  );
}
