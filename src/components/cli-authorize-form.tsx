"use client";

import { useState, useTransition } from "react";
import { Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  state: string;
  port: number;
  hostname: string;
  teamName: string;
};

export function CliAuthorizeForm({ state, port, hostname, teamName }: Props) {
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(hostname || "my-laptop");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function authorize() {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/cli/authorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state, port, name }),
      });

      const data = (await res.json()) as {
        ok?: boolean;
        token?: string;
        state?: string;
        error?: string;
      };

      if (!res.ok || !data.token || data.state !== state) {
        setError(data.error ?? "Authorization failed. Try running devpulse login again.");
        return;
      }

      setDone(true);
      const callback = new URL(`http://127.0.0.1:${port}/callback`);
      callback.searchParams.set("token", data.token);
      callback.searchParams.set("state", state);
      window.location.href = callback.toString();
    });
  }

  if (done) {
    return (
      <div className="space-y-2 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Authorized — connecting your terminal…</p>
        <p>
          Your browser will briefly open <code className="rounded bg-muted px-1">127.0.0.1</code>{" "}
          to hand the token to the CLI on your machine. That localhost step is expected.
        </p>
        <p>You can close this tab once the terminal shows a success message.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-4">
        <Terminal className="h-8 w-8 shrink-0 text-primary" />
        <div>
          <p className="font-medium">DevPulse CLI wants to connect</p>
          <p className="text-sm text-muted-foreground">
            Team: <span className="font-medium text-foreground">{teamName}</span>
          </p>
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="device-name" className="text-sm font-medium">
          Device name
        </label>
        <Input
          id="device-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="my-laptop"
          onKeyDown={(e) => e.key === "Enter" && authorize()}
        />
        <p className="text-xs text-muted-foreground">
          Shown in Settings → Connected devices so you can revoke access later.
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button className="w-full" onClick={authorize} disabled={pending}>
        {pending ? "Authorizing…" : "Authorize CLI"}
      </Button>
    </div>
  );
}
