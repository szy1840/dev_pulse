"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";

type Slide = { tab: string; title: string; desc: string; img: string };

export function LandingShowcase({ slides }: { slides: Slide[] }) {
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [pillStyle, setPillStyle] = useState({ transform: "translateX(0px)", width: "0px" });
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const go = useCallback(
    (idx: number) => {
      const next = ((idx % slides.length) + slides.length) % slides.length;
      setActive(next);
      setProgress(0);
    },
    [slides.length]
  );

  // Move sliding pill to active tab
  useEffect(() => {
    const el = tabRefs.current[active];
    const container = el?.parentElement;
    if (!el || !container) return;
    const containerLeft = container.getBoundingClientRect().left;
    const { left, width } = el.getBoundingClientRect();
    setPillStyle({ transform: `translateX(${left - containerLeft}px)`, width: `${width}px` });
  }, [active]);

  // Auto-advance
  useEffect(() => {
    if (paused) return;
    setProgress(0);
    progRef.current = setInterval(() => setProgress((p) => Math.min(p + 2, 100)), 100);
    timerRef.current = setTimeout(() => go(active + 1), 5000);
    return () => {
      clearInterval(progRef.current!);
      clearTimeout(timerRef.current!);
    };
  }, [active, paused, go]);

  return (
    <div
      className="mx-auto max-w-[980px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Tabs row */}
      <div className="relative mb-[30px] flex gap-1.5 overflow-x-auto pb-1">
        {/* Sliding indicator */}
        <span
          aria-hidden
          className="pointer-events-none absolute top-0 h-9 rounded-full bg-[#1d1d1f] transition-[transform,width] duration-[550ms] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]"
          style={pillStyle}
        />
        {slides.map((s, i) => (
          <button
            key={i}
            ref={(el) => { tabRefs.current[i] = el; }}
            onClick={() => go(i)}
            className={`relative z-10 h-9 shrink-0 whitespace-nowrap rounded-full border-0 bg-transparent px-4 text-[14px] font-medium transition-colors duration-[350ms] ${
              i === active ? "text-white" : "text-[#6e6e73] hover:text-[#1d1d1f]"
            }`}
          >
            {s.tab}
          </button>
        ))}
      </div>

      {/* Screenshot frame */}
      <div className="relative overflow-hidden rounded-2xl border border-black/[0.09] bg-white shadow-[0_30px_60px_-20px_rgba(0,0,0,0.18),0_8px_24px_-12px_rgba(0,0,0,0.12)]">
        {/* Browser chrome */}
        <div className="flex items-center gap-[7px] border-b border-black/[0.06] bg-[#fbfbfd] px-3.5 py-[11px]">
          <span className="h-[11px] w-[11px] shrink-0 rounded-full bg-[#ff5f57]" />
          <span className="h-[11px] w-[11px] shrink-0 rounded-full bg-[#febc2e]" />
          <span className="h-[11px] w-[11px] shrink-0 rounded-full bg-[#28c840]" />
          <span className="mx-auto max-w-[60%] truncate rounded-[7px] border border-black/[0.08] bg-white px-4 py-1 font-mono text-[12px] text-[#86868b]">
            trydevpulse.com/dashboard
          </span>
        </div>

        {/* Image */}
        <Image
          key={active}
          src={slides[active].img}
          alt={slides[active].title}
          width={980}
          height={600}
          className="w-full"
          priority={active === 0}
        />

        {/* Left / Right arrows */}
        <button
          onClick={() => go(active - 1)}
          className="absolute left-4 top-1/2 z-10 flex h-[42px] w-[42px] -translate-y-1/2 items-center justify-center rounded-full border border-black/[0.09] bg-white/90 text-[20px] leading-none shadow-[0_6px_18px_rgba(0,0,0,0.12)] backdrop-blur-md transition hover:scale-105 hover:bg-white"
          aria-label="prev"
        >
          ‹
        </button>
        <button
          onClick={() => go(active + 1)}
          className="absolute right-4 top-1/2 z-10 flex h-[42px] w-[42px] -translate-y-1/2 items-center justify-center rounded-full border border-black/[0.09] bg-white/90 text-[20px] leading-none shadow-[0_6px_18px_rgba(0,0,0,0.12)] backdrop-blur-md transition hover:scale-105 hover:bg-white"
          aria-label="next"
        >
          ›
        </button>

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 h-[3px] w-full bg-black/[0.05]">
          <div
            className="h-full bg-[#0066cc] shadow-[0_0_8px_rgba(0,102,204,0.5)]"
            style={{ width: `${progress}%`, transition: paused ? "none" : "width 0.1s linear" }}
          />
        </div>
      </div>

      {/* Caption */}
      <div className="mx-auto mt-[30px] max-w-[640px] text-center">
        <h3 className="mb-2.5 text-[24px] font-semibold leading-snug tracking-[-0.022em]">
          {slides[active].title}
        </h3>
        <p className="text-[17px] leading-relaxed text-[#6e6e73]">{slides[active].desc}</p>
      </div>
    </div>
  );
}
