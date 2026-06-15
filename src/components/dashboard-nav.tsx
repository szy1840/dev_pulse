"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", key: "overview" },
  { href: "/dashboard/sessions", key: "sessions" },
  { href: "/dashboard/members", key: "members" },
  { href: "/dashboard/settings", key: "settings" },
] as const;

export function DashboardNav() {
  const pathname = usePathname();
  const t = useTranslations("nav");
  return (
    <nav className="flex gap-1 px-4 sm:px-6">
      {links.map((link) => {
        const active =
          link.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "-mb-px border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t(link.key)}
          </Link>
        );
      })}
    </nav>
  );
}
