"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("auth");
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
        setError(data.error ?? t("authorize.failed"));
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
        <p className="font-medium text-foreground">{t("authorize.doneTitle")}</p>
        <p>
          {t.rich("authorize.doneBody", {
            code: (c) => <code className="rounded bg-muted px-1">{c}</code>,
          })}
        </p>
        <p>{t("authorize.doneClose")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-4">
        <Terminal className="h-8 w-8 shrink-0 text-primary" />
        <div>
          <p className="font-medium">{t("authorize.wantsToConnect")}</p>
          <p className="text-sm text-muted-foreground">
            {t("authorize.teamLabel")}{" "}
            <span className="font-medium text-foreground">{teamName}</span>
          </p>
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="device-name" className="text-sm font-medium">
          {t("authorize.deviceName")}
        </label>
        <Input
          id="device-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="my-laptop"
          onKeyDown={(e) => e.key === "Enter" && authorize()}
        />
        <p className="text-xs text-muted-foreground">
          {t("authorize.deviceNameHelp")}
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button className="w-full" onClick={authorize} disabled={pending}>
        {pending ? t("authorize.submitting") : t("authorize.submit")}
      </Button>
    </div>
  );
}
