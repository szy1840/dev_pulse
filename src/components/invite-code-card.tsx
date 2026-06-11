"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { regenerateInviteCode } from "@/lib/actions";

export function InviteCodeCard({
  teamId,
  teamName,
  inviteCode,
  canManage = false,
}: {
  teamId: string;
  teamName: string;
  inviteCode: string;
  canManage?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function copy() {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function regenerate() {
    setError(null);
    startTransition(async () => {
      const res = await regenerateInviteCode(teamId);
      setConfirming(false);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Share this code so teammates can join <strong>{teamName}</strong> from the onboarding
        screen.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <code className="rounded-lg border bg-muted px-4 py-2 text-lg font-semibold tracking-widest">
          {inviteCode}
        </code>
        <Button variant="outline" size="sm" onClick={copy}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy"}
        </Button>
        {canManage && !confirming && (
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => setConfirming(true)}
            className="text-muted-foreground"
          >
            <RefreshCw className="h-4 w-4" />
            Regenerate
          </Button>
        )}
      </div>

      {confirming && (
        <div className="space-y-3 rounded-md border bg-muted/40 p-3">
          <p className="text-sm text-muted-foreground">
            Generate a new invite code? The current code stops working immediately — anyone you
            already shared it with will need the new one. Existing members are unaffected.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="destructive" disabled={pending} onClick={regenerate}>
              {pending ? "Regenerating…" : "Regenerate code"}
            </Button>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
