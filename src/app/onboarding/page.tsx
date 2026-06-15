import Link from "next/link";
import { Activity } from "lucide-react";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { syncProfile, getMyTeams } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { OnboardingForm } from "@/components/onboarding-form";

export default async function OnboardingPage() {
  const user = await syncProfile();
  if (!user) redirect("/sign-in");
  const myTeams = await getMyTeams(user.id);
  const t = await getTranslations("onboarding");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <div className="flex items-center gap-2 text-lg font-semibold">
        <Activity className="h-5 w-5" /> DevPulse AI
      </div>
      <OnboardingForm />
      {myTeams.length > 0 && (
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard">{t("page.backToDashboard")}</Link>
        </Button>
      )}
    </div>
  );
}
