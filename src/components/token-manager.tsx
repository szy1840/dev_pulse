"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { format } from "date-fns";
import { Check, Copy, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { generateToken, revokeToken } from "@/lib/actions";

type TokenRow = {
  id: string;
  name: string;
  prefix: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
};

export function TokenManager({ teamId, tokens }: { teamId: string; tokens: TokenRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [freshToken, setFreshToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function create() {
    setError(null);
    setFreshToken(null);
    startTransition(async () => {
      const res = await generateToken(teamId, name);
      if (res.ok && res.data) {
        setFreshToken(res.data.token);
        setName("");
        router.refresh();
      } else if (!res.ok) {
        setError(res.error);
      }
    });
  }

  function revoke(id: string) {
    startTransition(async () => {
      await revokeToken(id);
      router.refresh();
    });
  }

  function copyToken() {
    if (!freshToken) return;
    navigator.clipboard.writeText(freshToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1 space-y-1">
          <Input
            placeholder="Token name (e.g. my-laptop)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && create()}
          />
        </div>
        <Button onClick={create} disabled={pending}>
          <Plus className="h-4 w-4" /> Generate token
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {freshToken && (
        <div className="rounded-lg border border-primary/40 bg-primary/5 p-4">
          <p className="mb-2 text-sm font-medium">
            Copy this token now — you won&apos;t be able to see it again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded-md border bg-background px-3 py-2 text-xs">
              {freshToken}
            </code>
            <Button variant="outline" size="sm" onClick={copyToken}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}

      <div className="divide-y rounded-lg border">
        {tokens.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">No tokens yet.</p>
        )}
        {tokens.map((t) => (
          <div key={t.id} className="flex items-center gap-3 p-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium">{t.name}</span>
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{t.prefix}…</code>
                {t.revokedAt && <Badge variant="destructive">Revoked</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">
                Created {format(new Date(t.createdAt), "MMM d, yyyy")}
                {t.lastUsedAt
                  ? ` · last used ${format(new Date(t.lastUsedAt), "MMM d, HH:mm")}`
                  : " · never used"}
              </p>
            </div>
            {!t.revokedAt && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => revoke(t.id)}
                disabled={pending}
                aria-label="Revoke token"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
