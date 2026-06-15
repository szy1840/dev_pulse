"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export type SettingsSection = { id: string; label: string };
export type SettingsNavGroup = { label: string; sections: SettingsSection[] };

/**
 * Anchor navigation for the settings page with scroll-spy highlighting.
 * Sections are plain ids on the page; sticky on large screens, horizontal
 * scroller on small ones.
 */
export function SettingsNav({ groups }: { groups: SettingsNavGroup[] }) {
  const t = useTranslations("settings");
  const sectionIds = groups.flatMap((g) => g.sections.map((s) => s.id));
  const [active, setActive] = useState(sectionIds[0] ?? "");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // Highlight the topmost visible section.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -60% 0px" }
    );
    for (const id of sectionIds) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionIds.join(",")]);

  return (
    <nav
      aria-label={t("nav.ariaLabel")}
      className={cn(
        "flex gap-x-4 gap-y-1 overflow-x-auto pb-2",
        "lg:sticky lg:top-32 lg:flex-col lg:gap-0 lg:self-start lg:pb-0"
      )}
    >
      {groups.map((group) => (
        <div key={group.label} className="flex shrink-0 items-center gap-1 lg:block lg:pb-4">
          <p className="hidden px-3 pb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground lg:block">
            {group.label}
          </p>
          {group.sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className={cn(
                "block whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors",
                active === s.id
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {s.label}
            </a>
          ))}
        </div>
      ))}
    </nav>
  );
}
