import Link from "next/link";
import { Activity } from "lucide-react";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { syncProfile, getActiveTeam } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CliSetupGuide } from "@/components/cli-setup-guide";

export default async function CliOnboardingPage() {
  const user = await syncProfile();
  if (!user) redirect("/sign-in");

  const team = await getActiveTeam(user.id);
  if (!team) redirect("/onboarding");

  const t = await getTranslations("onboarding");

  return (
    <div className="flex min-h-screen flex-col items-center gap-6 p-6">
      <div className="flex items-center gap-2 text-lg font-semibold">
        <Activity className="h-5 w-5" /> DevPulse AI
      </div>

      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle>{t("cli.title")}</CardTitle>
          <CardDescription>
            {t.rich("cli.description", {
              teamName: team.name,
              strong: (c) => <strong>{c}</strong>,
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CliSetupGuide showDashboardCta />
        </CardContent>
      </Card>

      <Button asChild variant="ghost" size="sm">
        <Link href="/dashboard">{t("cli.skipForNow")}</Link>
      </Button>
    </div>
  );
}
