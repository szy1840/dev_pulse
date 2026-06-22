"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Check,
  Copy,
  Download,
  KeyRound,
  RefreshCw,
  Terminal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STEPS = [
  { n: 1, icon: Download, command: "npm install -g devpulse-ai" },
  { n: 2, icon: KeyRound, command: "devpulse login" },
  { n: 3, icon: RefreshCw, command: "devpulse sync" },
] as const;

function CopyBlock({ text, multiline = false }: { text: string; multiline?: boolean }) {
  const t = useTranslations("settings");
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className={cn("flex gap-2", multiline ? "items-start" : "items-center")}>
      {multiline ? (
        <pre className="min-w-0 flex-1 overflow-x-auto whitespace-pre-wrap rounded-md border bg-muted/60 px-3 py-2 font-mono text-xs leading-relaxed">
          {text}
        </pre>
      ) : (
        <code className="min-w-0 flex-1 overflow-x-auto rounded-md border bg-muted/60 px-3 py-2 font-mono text-xs">
          {text}
        </code>
      )}
      <Button
        variant="outline"
        size="sm"
        className={cn("shrink-0", multiline && "mt-0.5")}
        onClick={copy}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        <span className="sr-only">{copied ? t("cli.copied") : t("cli.copy")}</span>
      </Button>
    </div>
  );
}

function StepList({ className }: { className?: string }) {
  const t = useTranslations("settings");
  return (
    <ol className={cn("space-y-3", className)}>
      {STEPS.map(({ n, icon: Icon, command }) => (
        <li key={n} className="rounded-xl border bg-background p-4 shadow-sm">
          <div className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {n}
            </span>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-medium">{t(`cli.step${n}Title`)}</h4>
              </div>
              <p className="text-sm text-muted-foreground">{t(`cli.step${n}Body`)}</p>
              <CopyBlock text={command} />
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

function MethodLabel({ label, primary }: { label: string; primary?: boolean }) {
  return (
    <span
      className={cn(
        "inline-block rounded-full px-3 py-0.5 text-xs font-semibold",
        primary
          ? "bg-primary text-primary-foreground"
          : "border bg-muted text-muted-foreground"
      )}
    >
      {label}
    </span>
  );
}

function InfoBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
      <Terminal className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
      <div className="space-y-1 text-sm">{children}</div>
    </div>
  );
}

export function CliSetupGuide({
  className,
  showDashboardCta = false,
  compact = false,
}: {
  className?: string;
  showDashboardCta?: boolean;
  compact?: boolean;
}) {
  const t = useTranslations("settings");

  const methods = (
    <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
      {/* Method 1: OpenClaw */}
      <div className="space-y-2">
        <MethodLabel label={t("cli.method1Label")} primary />
        <section className="rounded-xl border bg-background p-4 shadow-sm">
          <h3 className="mb-1 font-medium">{t("cli.openclawTitle")}</h3>
          <p className="mb-3 text-xs text-muted-foreground">{t("cli.openclawBody")}</p>
          <CopyBlock text={t("cli.openclawPrompt")} multiline />
        </section>
      </div>

      {/* Method 2: Manual */}
      <div className="space-y-2">
        <MethodLabel label={t("cli.method2Label")} />
        <div className="space-y-1">
          <p className="px-1 text-sm font-medium text-foreground">{t("cli.manualTitle")}</p>
          <StepList />
        </div>
      </div>
    </div>
  );

  if (compact) {
    return (
      <div className={cn("space-y-4", className)}>
        {methods}
        <div className="rounded-lg border bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground">
            {t.rich("cli.compactNote", {
              code: (c) => <code className="rounded bg-muted px-1 font-mono">{c}</code>,
            })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {methods}

      <InfoBanner>
        <p className="font-medium">{t("cli.connectTitle")}</p>
        <p className="text-muted-foreground">
          {t.rich("cli.connectBody", {
            code: (c) => (
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">{c}</code>
            ),
          })}
        </p>
      </InfoBanner>

      {showDashboardCta && (
        <div className="flex flex-col items-center gap-3 border-t pt-6 sm:flex-row sm:justify-between">
          <p className="text-center text-sm text-muted-foreground sm:text-left">
            {t("cli.afterSync")}
          </p>
          <Button asChild>
            <Link href="/dashboard">{t("cli.openDashboard")}</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
