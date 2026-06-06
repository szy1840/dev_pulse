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
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";

const TOOLS = ["Claude Code", "Cursor", "OpenClaw"];

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 font-semibold">
            <Activity className="h-5 w-5" />
            DevPulse AI
          </div>
          <div className="flex items-center gap-2">
            {user ? (
              <Button asChild size="sm">
                <Link href="/dashboard">Open dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/sign-in">Sign in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/sign-up">Get started</Link>
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
            CLI-first · Team dashboard · No code uploaded
          </span>

          <h1 className="mx-auto mt-6 max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            See how your team uses AI coding tools
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-balance text-lg leading-relaxed text-muted-foreground">
            DevPulse turns local AI coding sessions into team-level usage insights, cost
            visibility, and daily work summaries.
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {TOOLS.map((t) => (
              <span
                key={t}
                className="rounded-md border bg-background px-2.5 py-1 text-xs text-muted-foreground"
              >
                {t}
              </span>
            ))}
          </div>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            {user ? (
              <Button asChild size="lg" className="gap-2">
                <Link href="/dashboard">
                  Go to dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild size="lg" className="gap-2">
                  <Link href="/sign-up">
                    Create free account
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/sign-in">I already have an account</Link>
                </Button>
              </>
            )}
          </div>

          {!user && (
            <p className="mt-4 text-sm text-muted-foreground">
              Account first → create or join a team → then connect the CLI on your machine.
            </p>
          )}
        </section>

        {/* How it works */}
        <section className="border-y bg-muted/30">
          <div className="mx-auto max-w-5xl px-6 py-14">
            <h2 className="text-center text-sm font-medium uppercase tracking-wide text-muted-foreground">
              How it works
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-center text-lg font-semibold">
              From sign-up to team visibility in four steps
            </p>

            <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <Step
                n={1}
                icon={<Users className="h-5 w-5" />}
                title="Sign up & join a team"
                body="Create an account, then create a new team or join with an invite code."
                cta={user ? undefined : { label: "Sign up", href: "/sign-up" }}
              />
              <Step
                n={2}
                icon={<Terminal className="h-5 w-5" />}
                title="Log in on your machine"
                body="Install the CLI and run login — your browser opens to authorize this computer."
                code="devpulse login"
              />
              <Step
                n={3}
                icon={<KeyRound className="h-5 w-5" />}
                title="Manage tokens (optional)"
                body="Revoke devices or create manual tokens anytime under Settings."
                cta={user ? { label: "Open Settings", href: "/dashboard/settings" } : undefined}
              />
              <Step
                n={4}
                icon={<Activity className="h-5 w-5" />}
                title="Sync your sessions"
                body="Scan local AI tool logs and upload metadata — run again anytime."
                code="devpulse sync"
              />
            </ol>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-5xl px-6 py-14">
          <h2 className="text-center text-sm font-medium uppercase tracking-wide text-muted-foreground">
            What you get
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-lg font-semibold">
            A team dashboard built from local session metadata
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Feature
              icon={<Wrench className="h-5 w-5" />}
              title="Tools & models"
              body="See which coding agents (Cursor, Claude Code, OpenClaw) and models each session used."
            />
            <Feature
              icon={<BarChart3 className="h-5 w-5" />}
              title="Tokens & activity"
              body="Track token usage, session counts, active time, and trends over time — by team or member."
            />
            <Feature
              icon={<Users className="h-5 w-5" />}
              title="Member activity"
              body="Per-person views: who was active, what they worked on, and how agents split their day."
            />
            <Feature
              icon={<Sparkles className="h-5 w-5" />}
              title="Daily summaries"
              body="AI-generated recaps for each member and the whole team — focused on what shipped, not token counts."
            />
            <Feature
              icon={<Cpu className="h-5 w-5" />}
              title="Session history"
              body="Browse synced sessions with project, agent, model, and a short summary per session."
            />
            <Feature
              icon={<Shield className="h-5 w-5" />}
              title="Privacy by design"
              body="Only derived metadata and summaries are uploaded — never full transcripts, prompts, or code."
            />
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="border-t bg-muted/20">
          <div className="mx-auto max-w-5xl px-6 py-12 text-center">
            <h2 className="text-xl font-semibold">Ready to make AI work visible?</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              {user
                ? "Run devpulse login on your machine to connect, then devpulse sync to upload sessions."
                : "Start with a free account. The CLI connects after your team is set up."}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {user ? (
                <>
                  <Button asChild variant="outline">
                    <Link href="/dashboard/settings">CLI settings</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/dashboard">View dashboard</Link>
                  </Button>
                </>
              ) : (
                <Button asChild size="lg">
                  <Link href="/sign-up">Get started free</Link>
                </Button>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t px-6 py-6 text-center text-sm text-muted-foreground">
        DevPulse AI · Lightweight AI work intelligence for small teams
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
        <code className="mt-3 block rounded-md border bg-muted/60 px-2.5 py-1.5 font-mono text-xs">
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
