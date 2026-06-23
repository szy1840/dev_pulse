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
