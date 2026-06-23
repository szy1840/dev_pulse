import { getLocale, getTranslations } from "next-intl/server";
import { Lightbulb } from "lucide-react";
import { getSessionsForSummary } from "@/lib/queries";
import { getTeamAiTips } from "@/lib/ai-tips";
import type { PeriodRange } from "@/lib/period";
import type { Locale } from "@/lib/locale";

export async function AiTipsSection({
  teamId,
  range,
  timeZone,
}: {
  teamId: string;
  range: PeriodRange;
  timeZone: string;
}) {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("dashboard");
  const sessions = await getSessionsForSummary(teamId, range);
  const tips = await getTeamAiTips(teamId, range, timeZone, sessions, locale);

  if (!tips || tips.length === 0) return null;

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-amber-500" />
        <span className="text-sm font-semibold">{t("tips.title")}</span>
        <span className="ml-auto text-xs text-muted-foreground">{t("tips.powered")}</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {tips.map((tip, i) => (
          <div key={i} className="rounded-lg bg-muted/40 p-3.5">
            <div className="mb-1.5 flex items-center gap-2">
              <span className="text-base leading-none">{tip.emoji}</span>
              <span className="text-sm font-medium leading-snug">{tip.title}</span>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">{tip.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
