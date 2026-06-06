"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Terminal, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "dp_cli_banner_dismissed";

export function CliSetupBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!localStorage.getItem(DISMISS_KEY));
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3">
        <Terminal className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="space-y-1 text-sm">
          <p className="font-medium">No usage data yet — connect the CLI on your machine</p>
          <p className="text-muted-foreground">
            Install with{" "}
            <code className="rounded bg-muted px-1 font-mono text-xs">npm install -g devpulse-ai</code>
            , then run{" "}
            <code className="rounded bg-muted px-1 font-mono text-xs">devpulse login</code> and{" "}
            <code className="rounded bg-muted px-1 font-mono text-xs">devpulse sync</code>.
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 pl-8 sm:pl-0">
        <Button asChild size="sm">
          <Link href="/onboarding/cli">Setup guide</Link>
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={dismiss} aria-label="Dismiss">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
