import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Cpu,
  KeyRound,
  Shield,
  Sparkles,
  Terminal,
  Users,
  Wrench,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { getCurrentUser } from "@/lib/auth";

const TOOLS = ["Claude Code", "Codex", "Cursor", "OpenClaw"];

export default async function Home() {
  const user = await getCurrentUser();
  const t = await getTranslations("landing");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 font-semibold">
            <Activity className="h-5 w-5" />
            DevPulse AI
          </div>
          <div className="flex items-center gap-2">
            <LocaleSwitcher />
            {user ? (
              <Button asChild size="sm">
                <Link href="/dashboard">{t("nav.openDashboard")}</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/sign-in">{t("nav.signIn")}</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/sign-up">{t("nav.getStarted")}</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-5xl px-6 pb-16 pt-16 text-center sm:pt-20">
          <span className="inline-flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
            <Terminal className="h-3.5 w-3.5" />
            {t("hero.badge")}
          </span>

          <h1 className="mx-auto mt-6 max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            {t("hero.headline")}
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-balance text-lg leading-relaxed text-muted-foreground">
            {t("hero.subhead")}
          </p>

          <div className="mt-4 flex flex-col items-center gap-2">
            <span className="text-xs text-muted-foreground">{t("hero.toolsLabel")}</span>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {TOOLS.map((tool) => (
                <span
                  key={tool}
                  className="rounded-md border bg-background px-2.5 py-1 text-xs text-muted-foreground"
                >
                  {tool}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            {user ? (
              <Button asChild size="lg" className="gap-2">
                <Link href="/dashboard">
                  {t("hero.goToDashboard")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild size="lg" className="gap-2">
                  <Link href="/sign-up">
                    {t("hero.createAccount")}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/sign-in">{t("hero.haveAccount")}</Link>
                </Button>
              </>
            )}
          </div>

          {!user && (
            <p className="mt-4 text-sm text-muted-foreground">
              {t("hero.flow")}
            </p>
          )}
        </section>

        {/* How it works */}
        <section className="border-y bg-muted/30">
          <div className="mx-auto max-w-5xl px-6 py-14">
            <h2 className="text-center text-sm font-medium uppercase tracking-wide text-muted-foreground">
              {t("how.eyebrow")}
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-center text-lg font-semibold">
              {t("how.title")}
            </p>

            <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <Step
                n={1}
                icon={<Users className="h-5 w-5" />}
                title={t("how.step1Title")}
                body={t("how.step1Body")}
                cta={user ? undefined : { label: t("how.step1Cta"), href: "/sign-up" }}
              />
              <Step
                n={2}
                icon={<Terminal className="h-5 w-5" />}
                title={t("how.step2Title")}
                body={t("how.step2Body")}
                code={"npm install -g devpulse-ai\ndevpulse login"}
              />
              <Step
                n={3}
                icon={<KeyRound className="h-5 w-5" />}
                title={t("how.step3Title")}
                body={t("how.step3Body")}
                cta={user ? { label: t("how.step3Cta"), href: "/dashboard/settings" } : undefined}
              />
              <Step
                n={4}
                icon={<Activity className="h-5 w-5" />}
                title={t("how.step4Title")}
                body={t("how.step4Body")}
                code="devpulse sync"
              />
            </ol>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-5xl px-6 py-14">
          <h2 className="text-center text-sm font-medium uppercase tracking-wide text-muted-foreground">
            {t("features.eyebrow")}
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-lg font-semibold">
            {t("features.title")}
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Feature
              icon={<Wrench className="h-5 w-5" />}
              title={t("features.toolsTitle")}
              body={t("features.toolsBody")}
            />
            <Feature
              icon={<BarChart3 className="h-5 w-5" />}
              title={t("features.tokensTitle")}
              body={t("features.tokensBody")}
            />
            <Feature
              icon={<Users className="h-5 w-5" />}
              title={t("features.memberTitle")}
              body={t("features.memberBody")}
            />
            <Feature
              icon={<Sparkles className="h-5 w-5" />}
              title={t("features.summariesTitle")}
              body={t("features.summariesBody")}
            />
            <Feature
              icon={<Cpu className="h-5 w-5" />}
              title={t("features.historyTitle")}
              body={t("features.historyBody")}
            />
            <Feature
              icon={<Shield className="h-5 w-5" />}
              title={t("features.privacyTitle")}
              body={t("features.privacyBody")}
            />
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="border-t bg-muted/20">
          <div className="mx-auto max-w-5xl px-6 py-12 text-center">
            <h2 className="text-xl font-semibold">{t("cta.title")}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              {user ? t("cta.bodyUser") : t("cta.bodyGuest")}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {user ? (
                <>
                  <Button asChild variant="outline">
                    <Link href="/dashboard/settings">{t("cta.settings")}</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/dashboard">{t("cta.viewDashboard")}</Link>
                  </Button>
                </>
              ) : (
                <Button asChild size="lg">
                  <Link href="/sign-up">{t("cta.getStartedFree")}</Link>
                </Button>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t px-6 py-6 text-center text-sm text-muted-foreground">
        DevPulse AI · {t("footer.tagline")}
      </footer>
    </div>
  );
}

function Step({
  n,
  icon,
  title,
  body,
  code,
  cta,
}: {
  n: number;
  icon: React.ReactNode;
  title: string;
  body: string;
  code?: string;
  cta?: { label: string; href: string };
}) {
  return (
    <li className="relative flex flex-col rounded-xl border bg-background p-5 text-left shadow-sm">
      <span className="absolute -top-2.5 left-4 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
        {n}
      </span>
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        {icon}
      </div>
      <h3 className="font-medium">{title}</h3>
      <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
      {code && (
        <code className="mt-3 block whitespace-pre-wrap rounded-md border bg-muted/60 px-2.5 py-1.5 font-mono text-xs">
          {code}
        </code>
      )}
      {cta && (
        <Link
          href={cta.href}
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          {cta.label}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </li>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-xl border bg-background p-5 text-left">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        {icon}
      </div>
      <h3 className="font-medium">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
