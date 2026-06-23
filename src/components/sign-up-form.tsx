"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Activity } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { insforge } from "@/lib/insforge/client";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

export function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("auth");
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState<"details" | "verify">("details");
  const [inviteCode, setInviteCode] = useState(() =>
    (searchParams.get("code") ?? "").toUpperCase()
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function signInWithGoogle() {
    sessionStorage.setItem("dp_pending_invite", inviteCode);
    insforge.auth.signInWithOAuth("google", {
      redirectTo: `${window.location.origin}/api/auth/callback`,
      additionalParams: { prompt: "select_account" },
    });
  }

  function register() {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/auth/sign-up", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, password, inviteCode }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? t("signUp.failed"));
        return;
      }
      if (json.requireEmailVerification) {
        setNotice(t("signUp.verificationNotice"));
        setStep("verify");
      } else {
        router.push("/onboarding");
        router.refresh();
      }
    });
  }

  function verify() {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? t("verify.failed"));
        return;
      }
      router.push("/onboarding");
      router.refresh();
    });
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="space-y-2 text-center">
        <div className="mx-auto flex items-center gap-2 font-semibold">
          <Activity className="h-5 w-5" /> DevPulse AI
        </div>
        <CardTitle>{step === "details" ? t("signUp.title") : t("verify.title")}</CardTitle>
        <CardDescription>
          {step === "details"
            ? t("signUp.subtitle")
            : t("verify.subtitle", { email })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === "details" ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="invite-code">{t("fields.inviteCode")}</Label>
              <Input
                id="invite-code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder={t("fields.inviteCodePlaceholder")}
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">{t("fields.name")}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("fields.namePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t("fields.email")}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("fields.password")}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && register()}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="w-full" onClick={register} disabled={pending}>
              {pending ? t("signUp.submitting") : t("signUp.submit")}
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">{t("signUp.orDivider")}</span>
              </div>
            </div>
            <Button type="button" variant="outline" className="w-full" onClick={signInWithGoogle}>
              <GoogleIcon />
              {t("signUp.continueWithGoogle")}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {t("signUp.haveAccount")}{" "}
              <Link href="/sign-in" className="font-medium text-foreground underline-offset-4 hover:underline">
                {t("signUp.signIn")}
              </Link>
            </p>
          </>
        ) : (
          <>
            {notice && <p className="text-sm text-muted-foreground">{notice}</p>}
            <div className="space-y-2">
              <Label htmlFor="otp">{t("verify.codeLabel")}</Label>
              <Input
                id="otp"
                inputMode="numeric"
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                onKeyDown={(e) => e.key === "Enter" && verify()}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="w-full" onClick={verify} disabled={pending}>
              {pending ? t("verify.submitting") : t("verify.submit")}
            </Button>
            <button
              type="button"
              className="w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
              onClick={() => setStep("details")}
            >
              {t("verify.back")}
            </button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
