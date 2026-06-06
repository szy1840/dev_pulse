"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function InviteCodeCard({
  teamName,
  inviteCode,
}: {
  teamName: string;
  inviteCode: string;
}) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Invite teammates</CardTitle>
        <CardDescription>
          Share this code so teammates can join <strong>{teamName}</strong> from the onboarding
          screen.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <code className="rounded-lg border bg-muted px-4 py-2 text-lg font-semibold tracking-widest">
            {inviteCode}
          </code>
          <Button variant="outline" size="sm" onClick={copy}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
