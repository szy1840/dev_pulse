"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const RESEND_COOLDOWN = 60;

export function VerifyOtpStep({
  email,
  onSuccess,
  onBack,
}: {
  email: string;
  onSuccess: () => void;
  onBack: () => void;
}) {
  const t = useTranslations("auth");
  const [pending, startTransition] = useTransition();
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startCountdown() {
    setCountdown(RESEND_COOLDOWN);
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(timerRef.current!); return 0; }
        return c - 1;
      });
    }, 1000);
  }

  useEffect(() => () => { clearInterval(timerRef.current!); }, []);

  function verify() {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setError(json.error ?? t("verify.failed")); return; }
      onSuccess();
    });
  }

  function resend() {
    if (countdown > 0) return;
    startCountdown();
    fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
  }

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="otp">{t("verify.codeLabel")}</Label>
        <Input
          id="otp"
          inputMode="numeric"
          placeholder="123456"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
          onKeyDown={(e) => e.key === "Enter" && verify()}
          autoFocus
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button className="w-full" onClick={verify} disabled={pending}>
        {pending ? t("verify.submitting") : t("verify.submit")}
      </Button>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <button type="button" className="underline-offset-4 hover:underline" onClick={onBack}>
          {t("verify.back")}
        </button>
        <button
          type="button"
          onClick={resend}
          disabled={countdown > 0}
          className="underline-offset-4 hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {countdown > 0 ? t("verify.resendIn", { s: countdown }) : t("verify.resend")}
        </button>
      </div>
    </>
  );
}
