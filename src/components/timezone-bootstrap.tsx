"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ensureTimezone } from "@/lib/actions";

/** Detect browser timezone on first visit and persist it when profile has none. */
export function TimezoneBootstrap({ savedTimezone }: { savedTimezone: string | null }) {
  const router = useRouter();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current || savedTimezone) return;
    ran.current = true;

    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!browserTz) return;

    void ensureTimezone(browserTz).then((res) => {
      if (res.ok) router.refresh();
    });
  }, [savedTimezone, router]);

  return null;
}
