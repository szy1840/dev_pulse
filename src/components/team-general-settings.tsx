"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { renameTeam } from "@/lib/actions";

export function TeamGeneralSettings({
  teamId,
  teamName,
  canManage,
}: {
  teamId: string;
  teamName: string;
  canManage: boolean;
}) {
  const t = useTranslations("settings");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(teamName);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const dirty = name.trim() !== teamName && name.trim().length > 0;

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await renameTeam(teamId, name);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      router.refresh();
    });
  }

  if (!canManage) {
    return (
      <div className="space-y-1">
        <Label>{t("general.teamName")}</Label>
        <p className="text-sm">{teamName}</p>
        <p className="text-xs text-muted-foreground">{t("general.renameRestricted")}</p>
      </div>
    );
  }

  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (dirty && !pending) save();
      }}
    >
      <Label htmlFor="team-name">{t("general.teamName")}</Label>
      <div className="flex max-w-md gap-2">
        <Input
          id="team-name"
          value={name}
          maxLength={64}
          disabled={pending}
          onChange={(e) => setName(e.target.value)}
        />
        <Button type="submit" disabled={!dirty || pending} className="shrink-0">
          {saved ? <Check className="h-4 w-4" /> : null}
          {saved ? t("general.saved") : pending ? t("general.saving") : t("general.save")}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{t("general.helper")}</p>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
}
