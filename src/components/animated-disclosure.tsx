"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function AnimatedDisclosure({
  label,
  children,
  className,
}: {
  label: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className={cn("overflow-hidden rounded-lg border bg-muted/15", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm font-medium",
          "transition-colors hover:bg-muted/40",
          open && "bg-muted/25"
        )}
      >
        <span>{label}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
            open && "rotate-180"
          )}
        />
      </button>

      <div
        id={panelId}
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className={cn(
              "border-t px-3 pb-4 pt-3 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
              open ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
            )}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
