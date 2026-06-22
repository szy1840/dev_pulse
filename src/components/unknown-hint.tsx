"use client";

import { CircleHelp } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export function isUnknownLabel(value: string | null | undefined) {
  return value?.trim().toLowerCase() === "unknown";
}

export function UnknownHint({ className }: { className?: string }) {
  const t = useTranslations("sessions");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef(false);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0, placement: "top" as "top" | "bottom" });

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const tooltipWidth = 288;
    const margin = 8;
    const left = Math.min(
      Math.max(rect.left + rect.width / 2, tooltipWidth / 2 + margin),
      window.innerWidth - tooltipWidth / 2 - margin
    );
    const showBelow = rect.top < 88;
    setPosition({
      left,
      top: showBelow ? rect.bottom + margin : rect.top - margin,
      placement: showBelow ? "bottom" : "top",
    });
  }, []);

  const show = useCallback(() => {
    updatePosition();
    setOpen(true);
  }, [updatePosition]);

  const close = useCallback(() => {
    pinnedRef.current = false;
    setOpen(false);
    setPinned(false);
  }, []);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || tooltipRef.current?.contains(target)) return;
      close();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [close, open, updatePosition]);

  const hintText = t("unknownHint");

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={cn(
          "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-muted-foreground/80 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          className
        )}
        aria-label={hintText}
        aria-expanded={open}
        title={hintText}
        onBlur={() => {
          if (!pinnedRef.current) setOpen(false);
        }}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (open && pinned) {
            close();
            return;
          }
          updatePosition();
          pinnedRef.current = true;
          setOpen(true);
          setPinned(true);
        }}
        onMouseEnter={show}
        onMouseLeave={() => {
          if (!pinnedRef.current) setOpen(false);
        }}
        onPointerEnter={show}
        onPointerLeave={() => {
          if (!pinnedRef.current) setOpen(false);
        }}
      >
        <CircleHelp className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      {mounted &&
        open &&
        createPortal(
          <div
            ref={tooltipRef}
            role="tooltip"
            className="fixed z-[1000] w-72 rounded-md border bg-popover px-3 py-2 text-left text-xs font-normal leading-snug text-popover-foreground shadow-xl"
            style={{
              left: position.left,
              top: position.top,
              transform: position.placement === "top" ? "translate(-50%, -100%)" : "translate(-50%, 0)",
            }}
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => {
              if (!pinnedRef.current) setOpen(false);
            }}
          >
            {hintText}
          </div>,
          document.body
        )}
    </>
  );
}

export function UnknownValue({ className }: { className?: string }) {
  const t = useTranslations("sessions");
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span>{t("unknown")}</span>
      <UnknownHint />
    </span>
  );
}
