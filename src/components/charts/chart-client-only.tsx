"use client";

import { useEffect, useState, type ReactNode } from "react";

/** Skip SSR for chart libraries that render different markup on server vs client. */
export function ChartClientOnly({
  fallback,
  children,
}: {
  fallback: ReactNode;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return fallback;
  return children;
}
