"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

type ChartSizeProps = {
  height: number;
  className?: string;
  children: ReactNode;
};

/** Mount Recharts only on the client after the wrapper has a real size. */
export function ChartSize({ height, className, children }: ChartSizeProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const el = ref.current;
    if (!el) return;

    const measure = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w > 0 && h > 0) setSize({ w, h });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [mounted, height]);

  return (
    <div ref={ref} className={cn("w-full min-w-0", className)} style={{ height }}>
      {mounted && size ? (
        <ResponsiveContainer width={size.w} height={size.h} minWidth={0}>
          {children}
        </ResponsiveContainer>
      ) : null}
    </div>
  );
}
