"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createTeam, joinTeam } from "@/lib/actions";

export function OnboardingForm() {
  const router = useRouter();
  const t = useTranslations("onboarding");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [teamName, setTeamName] = useState("");
  const [code, setCode] = useState("");

  function handleCreate() {
    setError(null);
    startTransition(async () => {
      const res = await createTeam(teamName);
      if (res.ok) router.push("/onboarding/cli");
      else setError(res.error);
    });
  }

  function handleJoin() {
    setError(null);
    startTransition(async () => {
      const res = await joinTeam(code);
      if (res.ok) router.push("/onboarding/cli");
      else setError(res.error);
    });
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{t("form.title")}</CardTitle>
        <CardDescription>{t("form.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="create">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">{t("form.createTab")}</TabsTrigger>
            <TabsTrigger value="join">{t("form.joinTab")}</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="team-name">{t("form.teamNameLabel")}</Label>
              <Input
                id="team-name"
                placeholder={t("form.teamNamePlaceholder")}
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <Button className="w-full" onClick={handleCreate} disabled={pending}>
              {pending ? t("form.creating") : t("form.createTeam")}
            </Button>
          </TabsContent>

          <TabsContent value="join" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-code">{t("form.inviteCodeLabel")}</Label>
              <Input
                id="invite-code"
                placeholder="ABCD2345"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              />
            </div>
            <Button className="w-full" onClick={handleJoin} disabled={pending}>
              {pending ? t("form.joining") : t("form.joinTeam")}
            </Button>
          </TabsContent>
        </Tabs>

        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
