"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";

type Slide = {
  tab: string;
  title: string;
  desc: string;
  img: string;
};

export function LandingShowcase({ slides }: { slides: Slide[] }) {
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [paused, setPaused] = useState(false);

  const go = useCallback((idx: number) => {
    setActive(((idx % slides.length) + slides.length) % slides.length);
    setProgress(0);
  }, [slides.length]);

  useEffect(() => {
    if (paused) return;
    setProgress(0);
    progRef.current = setInterval(() => {
      setProgress((p) => Math.min(p + 100 / 50, 100));
    }, 100);
    timerRef.current = setTimeout(() => {
      setActive((a) => (a + 1) % slides.length);
      setProgress(0);
    }, 5000);
    return () => {
      clearInterval(progRef.current!);
      clearTimeout(timerRef.current!);
    };
  }, [active, paused, slides.length]);

  return (
    <div
      className="overflow-hidden rounded-2xl border border-black/[0.09] bg-white shadow-[0_30px_60px_-20px_rgba(0,0,0,0.18),0_8px_24px_-12px_rgba(0,0,0,0.12)]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Browser chrome */}
      <div className="flex items-center gap-1.5 border-b border-black/[0.06] bg-[#fbfbfd] px-3.5 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        <span className="mx-auto rounded-md border border-black/[0.08] bg-white px-4 py-1 font-mono text-[11px] text-[#86868b]">
          trydevpulse.com/dashboard
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto border-b border-black/[0.06] bg-[#fafafa] px-4 py-2 scrollbar-hide">
        {slides.map((s, i) => (
          <button
            key={i}
            onClick={() => go(i)}
            className={`shrink-0 rounded-full px-3 py-1 text-[13px] font-medium transition-colors ${
              i === active
                ? "bg-[#1d1d1f] text-white"
                : "text-[#6e6e73] hover:text-[#1d1d1f]"
            }`}
          >
            {s.tab}
          </button>
        ))}
      </div>

      {/* Screenshot */}
      <div className="relative">
        <Image
          key={active}
          src={slides[active].img}
          alt={slides[active].title}
          width={980}
          height={600}
          className="w-full"
          priority={active === 0}
        />
        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 h-[3px] w-full bg-black/[0.05]">
          <div
            className="h-full bg-[#0066cc] shadow-[0_0_8px_rgba(0,102,204,0.5)] transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Caption */}
      <div className="px-6 py-5">
        <h3 className="mb-1.5 text-[18px] font-semibold leading-snug tracking-[-0.02em]">
          {slides[active].title}
        </h3>
        <p className="text-[15px] leading-relaxed text-[#6e6e73]">{slides[active].desc}</p>
      </div>
    </div>
  );
}
