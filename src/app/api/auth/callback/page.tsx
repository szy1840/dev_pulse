"use client";

import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import Link from "next/link";

const PKCE_KEY = "insforge_pkce_verifier";

export default function OAuthCallbackPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handle() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("insforge_code");
      const oauthError = params.get("error");

      if (oauthError || !code) {
        setError(oauthError === "access_denied" ? "Sign-in was cancelled." : "Authentication failed. Please try again.");
        return;
      }

      const codeVerifier = sessionStorage.getItem(PKCE_KEY);
      const inviteCode = sessionStorage.getItem("dp_pending_invite") ?? "";
      const redirectTo = sessionStorage.getItem("dp_oauth_redirect") ?? "/dashboard";
      sessionStorage.removeItem("dp_pending_invite");
      sessionStorage.removeItem("dp_oauth_redirect");

      const res = await fetch("/api/auth/oauth/callback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, codeVerifier, inviteCode }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Authentication failed. Please try again.");
        return;
      }

      window.location.href = json.redirect ?? redirectTo;
    }

    handle();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex items-center gap-2 font-semibold">
          <Activity className="h-5 w-5" /> DevPulse AI
        </div>
        {error ? (
          <div className="space-y-3">
            <p className="text-sm text-destructive max-w-xs">{error}</p>
            <Link href="/sign-up" className="text-sm underline underline-offset-4 text-muted-foreground">
              Back to sign up
            </Link>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Signing in…</p>
        )}
      </div>
    </div>
  );
}
