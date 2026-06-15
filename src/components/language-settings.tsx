"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import { updateLocale } from "@/lib/actions";
import { LOCALES, LOCALE_LABELS } from "@/lib/locale";

export function LanguageSettings() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("language");
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(locale);

  function save(next: string) {
    setValue(next);
    startTransition(async () => {
      const res = await updateLocale(next);
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="language">{t("label")}</Label>
      <select
        id="language"
        value={value}
        disabled={pending}
        onChange={(e) => save(e.target.value)}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {LOCALES.map((l) => (
          <option key={l} value={l}>
            {LOCALE_LABELS[l]}
          </option>
        ))}
      </select>
      <p className="text-xs text-muted-foreground">{t("description")}</p>
    </div>
  );
}
