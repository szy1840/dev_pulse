import Link from "next/link";
import { ArrowRight, Terminal } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";

/**
 * Empty-state guide block shown at the top of the dashboard while the viewer
 * has zero synced sessions in the active team. Driven by server-side session
 * count (see DashboardLayout), so it disappears automatically after the first
 * successful `devpulse sync` — no localStorage dismiss, no client interaction.
 */
export async function CliSetupBanner() {
  const t = await getTranslations("settings");

  const steps = [
    { label: t("banner.step1"), cmd: "npm install -g devpulse-ai" },
    { label: t("banner.step2"), cmd: "devpulse login" },
    { label: t("banner.step3"), cmd: "devpulse sync" },
  ];

  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-b from-primary/5 to-transparent">
      <div className="flex flex-col gap-6 p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Terminal className="h-5 w-5" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-semibold leading-tight">{t("banner.title")}</h2>
            <p className="max-w-2xl text-sm text-muted-foreground">{t("banner.body")}</p>
          </div>
        </div>

        <ol className="grid gap-3 sm:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.cmd} className="flex flex-col gap-1.5 rounded-lg border bg-muted/40 p-3">
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/15 text-[10px] text-primary">
                  {i + 1}
                </span>
                {s.label}
              </span>
              <code className="block overflow-x-auto rounded bg-background px-2 py-1.5 font-mono text-xs">
                {s.cmd}
              </code>
            </li>
          ))}
        </ol>

        <div className="flex flex-wrap items-center gap-3">
          <Button asChild size="sm">
            <Link href="/onboarding/cli">
              {t("banner.setupGuide")}
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
          <p className="text-xs text-muted-foreground">{t("banner.note")}</p>
        </div>
      </div>
    </section>
  );
}
