"use client";

import { useState } from "react";
import Link from "next/link";
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

const AGENT_PROMPT = `Set up DevPulse CLI on this machine (Node.js 22+):

npm install -g devpulse-ai
devpulse login
devpulse sync

Run in order. devpulse login opens a browser — ask me if needed. Then run devpulse status and report the result.`;

const STEPS = [
  {
    n: 1,
    icon: Download,
    title: "Install the CLI",
    body: "Requires Node.js 22+. Run once per machine.",
    command: "npm install -g devpulse-ai",
  },
  {
    n: 2,
    icon: KeyRound,
    title: "Log in on this machine",
    body: "Opens your browser to authorize the CLI — similar to Claude Code device login.",
    command: "devpulse login",
  },
  {
    n: 3,
    icon: RefreshCw,
    title: "Sync your usage data",
    body: "Scans local AI tool logs and uploads usage metadata — tokens, activity, summaries, and more. Run again anytime.",
    command: "devpulse sync",
  },
] as const;

function CopyBlock({ text, multiline = false }: { text: string; multiline?: boolean }) {
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
        <span className="sr-only">{copied ? "Copied" : "Copy"}</span>
      </Button>
    </div>
  );
}

export function CliSetupGuide({
  className,
  showDashboardCta = false,
}: {
  className?: string;
  showDashboardCta?: boolean;
}) {
  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
        <Terminal className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="space-y-1 text-sm">
          <p className="font-medium">Connect your machine to see data here</p>
          <p className="text-muted-foreground">
            The dashboard fills in after you install the CLI and run{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">devpulse sync</code> on
            your laptop. Only lightweight usage metadata is uploaded — never code or transcripts.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <section className="rounded-xl border bg-background p-4 shadow-sm">
          <h3 className="mb-3 font-medium">Copy this prompt and let your AI agent handle setup</h3>
          <CopyBlock text={AGENT_PROMPT} multiline />
        </section>

        <section className="space-y-4">
          <h3 className="font-medium">Manual setup</h3>
          <ol className="space-y-4">
            {STEPS.map(({ n, icon: Icon, title, body, command }) => (
              <li key={n} className="rounded-xl border bg-background p-4 shadow-sm">
                <div className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {n}
                  </span>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <h4 className="font-medium">{title}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">{body}</p>
                    <CopyBlock text={command} />
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {showDashboardCta && (
        <div className="flex flex-col items-center gap-3 border-t pt-6 sm:flex-row sm:justify-between">
          <p className="text-center text-sm text-muted-foreground sm:text-left">
            After syncing, refresh the dashboard to see your data.
          </p>
          <Button asChild>
            <Link href="/dashboard">Open dashboard</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
