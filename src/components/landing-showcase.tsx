"use client";

import { useState, useEffect, useRef, useCallback, useLayoutEffect } from "react";
import { flushSync } from "react-dom";
import Image from "next/image";

type Slide = { tab: string; title: string; desc: string; img: string };

const AR: Record<string, number> = {
  overview: 825 / 1600,
  ranking:  906 / 1600,
  summary:  908 / 1600,
  sessions: 902 / 1600,
  insights: 855 / 1600,
  hours:    697 / 1600,
  cost:     848 / 1600,
};
const KEYS = ["overview", "ranking", "summary", "sessions", "insights", "hours", "cost"];

type LState = "center" | "from-right" | "from-left" | "exit-left" | "exit-right" | "idle";
interface Layer { src: string; state: LState; anim: boolean }

const TRANSFORMS: Record<LState, React.CSSProperties> = {
  center:       { transform: "none",                                         opacity: 1, filter: "none"       },
  "from-right": { transform: "translateX(11%) rotateY(-13deg) scale(0.88)", opacity: 0, filter: "blur(11px)" },
  "from-left":  { transform: "translateX(-11%) rotateY(13deg) scale(0.88)", opacity: 0, filter: "blur(11px)" },
  "exit-left":  { transform: "translateX(-11%) rotateY(13deg) scale(0.88)", opacity: 0, filter: "blur(11px)" },
  "exit-right": { transform: "translateX(11%) rotateY(-13deg) scale(0.88)", opacity: 0, filter: "blur(11px)" },
  idle:         { transform: "none",                                         opacity: 0, filter: "none"       },
};

function layerStyle(l: Layer): React.CSSProperties {
  return {
    position: "absolute", top: 0, left: 0, width: "100%",
    transformOrigin: "center center",
    backfaceVisibility: "hidden",
    willChange: "transform, opacity, filter",
    pointerEvents: l.state === "idle" ? "none" : "auto",
    ...TRANSFORMS[l.state],
    transition: l.anim
      ? "transform 0.8s cubic-bezier(0.18,0.9,0.28,1.06), opacity 0.55s ease, filter 0.55s ease"
      : "none",
  };
}

export function LandingShowcase({ slides }: { slides: Slide[] }) {
  const N = slides.length;

  const [layerA, setLayerA] = useState<Layer>({ src: slides[0].img, state: "center", anim: false });
  const [layerB, setLayerB] = useState<Layer>({ src: slides[0].img, state: "idle",   anim: false });
  const curRef  = useRef<"A" | "B">("A");
  const siRef   = useRef(0);
  const busyRef = useRef(false);

  const [active, setActive] = useState(0);
  const [captionVisible, setCaptionVisible] = useState(true);
  const [sheenKey, setSheenKey] = useState(0);

  // pill — uses el.offsetLeft (relative to offsetParent = the relative container)
  // MUST also set left:0 on the pill element, otherwise absolute elements
  // in a justify-center flex container start at the "static position" (middle),
  // and adding translateX doubles the offset → pill flies off to the right.
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [pill, setPill] = useState({ x: 0, w: 0 });

  const movePill = useCallback((idx: number) => {
    const el = tabRefs.current[idx];
    if (!el) return;
    setPill({ x: el.offsetLeft, w: el.offsetWidth });
  }, []);

  // progress bar
  const [prog, setProg] = useState(0);
  const progTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pausedRef = useRef(false);

  // wrapper height
  const wrapRef = useRef<HTMLDivElement>(null);
  const [wrapH, setWrapH] = useState(0);

  const setH = useCallback((idx: number) => {
    if (!wrapRef.current) return;
    setWrapH(wrapRef.current.clientWidth * (AR[KEYS[idx] ?? KEYS[0]] ?? 0.56));
  }, []);

  const startProg = useCallback(() => {
    clearInterval(progTimer.current!);
    setProg(0);
    progTimer.current = setInterval(() => setProg(p => Math.min(p + 100 / 52, 100)), 100);
  }, []);

  const flip = useCallback((to: number, dir: 1 | -1) => {
    if (busyRef.current) return;
    to = ((to % N) + N) % N;
    if (to === siRef.current) return;
    busyRef.current = true;

    const isA = curRef.current === "A";
    const setInc = isA ? setLayerB : setLayerA;
    const setOut = isA ? setLayerA : setLayerB;
    const nextCur: "A" | "B" = isA ? "B" : "A";

    // flushSync = React equivalent of `void el.offsetWidth` from the original HTML.
    // Forces a synchronous DOM commit so the incoming layer is painted at its
    // off-screen start position BEFORE the CSS transition begins.
    // Without this, React 18 batches both setState calls into one render,
    // skipping the start frame and breaking the animation.
    flushSync(() => {
      setInc({ src: slides[to].img, state: dir > 0 ? "from-right" : "from-left", anim: false });
    });

    requestAnimationFrame(() => {
      setInc(p => ({ ...p, state: "center",                              anim: true }));
      setOut(p => ({ ...p, state: dir > 0 ? "exit-left" : "exit-right", anim: true }));
    });

    setSheenKey(k => k + 1);
    setCaptionVisible(false);
    siRef.current = to;
    setActive(to);
    setH(to);
    setTimeout(() => setCaptionVisible(true), 150);
    setTimeout(() => {
      setOut(p => ({ ...p, state: "idle", anim: false }));
      setInc(p => ({ ...p, anim: false }));
      curRef.current = nextCur;
      busyRef.current = false;
    }, 820);

    startProg();
  }, [N, slides, setH, startProg]);

  const restart = useCallback(() => {
    clearInterval(autoTimer.current!);
    autoTimer.current = setInterval(() => {
      if (!pausedRef.current) flip((siRef.current + 1) % N, 1);
    }, 5200);
  }, [N, flip]);

  // Measure before first paint to avoid initial jump
  useLayoutEffect(() => {
    setH(0);
    movePill(0);
  }, [setH, movePill]);

  useEffect(() => {
    startProg();
    restart();
    return () => { clearInterval(autoTimer.current!); clearInterval(progTimer.current!); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { movePill(active); }, [active, movePill]);

  useEffect(() => {
    let rt: ReturnType<typeof setTimeout>;
    const fn = () => { clearTimeout(rt); rt = setTimeout(() => { setH(siRef.current); movePill(siRef.current); }, 120); };
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, [setH, movePill]);

  const go = (to: number, dir: 1 | -1) => { flip(to, dir); restart(); };

  return (
    <div className="mx-auto max-w-[980px]">
      {/* Tabs */}
      <div
        className="relative mb-[30px] flex justify-center gap-1.5 overflow-x-auto pb-1"
        onMouseEnter={() => { pausedRef.current = true; }}
        onMouseLeave={() => { pausedRef.current = false; }}
      >
        {/* left:0 anchors the pill to the container's left edge.
            Without it, absolute in justify-center flex uses "static position"
            (≈ center of container), so translateX doubles the offset. */}
        <span
          aria-hidden
          className="pointer-events-none absolute z-0 h-9 rounded-full bg-[#1d1d1f]"
          style={{
            top: 0,
            left: 0,
            width: pill.w,
            transform: `translateX(${pill.x}px)`,
            transition: "transform 0.55s cubic-bezier(0.22,1,0.36,1), width 0.55s cubic-bezier(0.22,1,0.36,1)",
            willChange: "transform, width",
          }}
        />
        {slides.map((s, i) => (
          <button
            key={i}
            ref={el => { tabRefs.current[i] = el; }}
            onClick={() => go(i, i > siRef.current ? 1 : -1)}
            className={`relative z-10 h-9 shrink-0 whitespace-nowrap rounded-full border-0 bg-transparent px-4 text-[14px] font-medium ${
              i === active ? "text-white" : "text-[#6e6e73] hover:text-[#1d1d1f]"
            }`}
            style={{ transition: "color 0.35s" }}
          >
            {s.tab}
          </button>
        ))}
      </div>

      {/* Browser frame */}
      <div className="overflow-hidden rounded-2xl border border-black/[0.09] bg-white shadow-[0_30px_60px_-20px_rgba(0,0,0,0.18),0_8px_24px_-12px_rgba(0,0,0,0.12)]">
        <div className="flex items-center gap-[7px] border-b border-black/[0.06] bg-[#fbfbfd] px-3.5 py-[11px]">
          <span className="h-[11px] w-[11px] shrink-0 rounded-full bg-[#ff5f57]" />
          <span className="h-[11px] w-[11px] shrink-0 rounded-full bg-[#febc2e]" />
          <span className="h-[11px] w-[11px] shrink-0 rounded-full bg-[#28c840]" />
          <span className="mx-auto max-w-[60%] truncate rounded-[7px] border border-black/[0.08] bg-white px-4 py-1 font-mono text-[12px] text-[#86868b]">
            trydevpulse.com/dashboard
          </span>
        </div>

        <div
          ref={wrapRef}
          className="relative overflow-hidden"
          style={{ perspective: "1700px", height: wrapH || undefined, transition: "height 0.6s cubic-bezier(0.22,1,0.36,1)" }}
          onMouseEnter={() => { pausedRef.current = true; }}
          onMouseLeave={() => { pausedRef.current = false; }}
        >
          <div style={layerStyle(layerA)}>
            <Image src={layerA.src} alt="" width={1600} height={900} className="w-full" priority />
          </div>
          <div style={layerStyle(layerB)}>
            <Image src={layerB.src} alt="" width={1600} height={900} className="w-full" />
          </div>

          <span
            key={sheenKey}
            className="pointer-events-none absolute inset-0 z-[3] opacity-0"
            style={{
              background: "linear-gradient(105deg,transparent 32%,rgba(255,255,255,0.85) 48%,transparent 64%)",
              mixBlendMode: "overlay",
              animation: sheenKey > 0 ? "devpulse-sheen 1s cubic-bezier(0.22,1,0.36,1)" : "none",
            }}
          />

          <button
            onClick={() => go(siRef.current - 1, -1)}
            className="absolute left-4 top-1/2 z-[4] flex h-[42px] w-[42px] -translate-y-1/2 items-center justify-center rounded-full border border-black/[0.09] bg-white/90 text-[20px] leading-none shadow-[0_6px_18px_rgba(0,0,0,0.12)] backdrop-blur-md transition hover:scale-[1.07] hover:bg-white"
          >‹</button>
          <button
            onClick={() => go(siRef.current + 1, 1)}
            className="absolute right-4 top-1/2 z-[4] flex h-[42px] w-[42px] -translate-y-1/2 items-center justify-center rounded-full border border-black/[0.09] bg-white/90 text-[20px] leading-none shadow-[0_6px_18px_rgba(0,0,0,0.12)] backdrop-blur-md transition hover:scale-[1.07] hover:bg-white"
          >›</button>

          <div className="absolute bottom-0 left-0 z-[4] h-[3px] w-full bg-black/[0.05]">
            <div className="h-full bg-[#0066cc] shadow-[0_0_8px_rgba(0,102,204,0.5)]" style={{ width: `${prog}%` }} />
          </div>
        </div>
      </div>

      {/* Caption */}
      <div
        className="mx-auto mt-[30px] max-w-[640px] text-center"
        style={{ opacity: captionVisible ? 1 : 0, transition: "opacity 0.3s" }}
      >
        <h3 className="mb-2.5 text-[24px] font-semibold leading-snug tracking-[-0.022em]">
          {slides[active].title}
        </h3>
        <p className="text-[17px] leading-relaxed text-[#6e6e73]">{slides[active].desc}</p>
      </div>

      <style>{`
        @keyframes devpulse-sheen {
          0%   { opacity: 0; transform: translateX(-110%); }
          28%  { opacity: 0.9; }
          100% { opacity: 0; transform: translateX(110%); }
        }
      `}</style>
    </div>
  );
}
