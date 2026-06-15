"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { ensureLocale } from "@/lib/actions";

/**
 * Sync the saved profile language into the locale cookie when they diverge (e.g.
 * a new device where the cookie is missing), so rendering matches the user's
 * stored preference.
 */
export function LocaleBootstrap({ savedLocale }: { savedLocale: string | null }) {
  const router = useRouter();
  const current = useLocale();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current || !savedLocale || savedLocale === current) return;
    ran.current = true;
    void ensureLocale(savedLocale).then((res) => {
      if (res.ok) router.refresh();
    });
  }, [savedLocale, current, router]);

  return null;
}
