"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { updateLocale } from "@/lib/actions";
import { LOCALE_LABELS, type Locale } from "@/lib/locale";

const NEXT: Record<Locale, Locale> = { en: "zh", zh: "en" };

export function LocaleSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const res = await updateLocale(NEXT[locale]);
      if (res.ok) router.refresh();
    });
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className="rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
    >
      {LOCALE_LABELS[NEXT[locale]]}
    </button>
  );
}
