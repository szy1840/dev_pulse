/** Gap between events before starting a new active burst. */
export const IDLE_GAP_MS = 10 * 60 * 1000;

/** Cap a single burst so one long agent run cannot dominate engaged time. */
export const MAX_BURST_MS = 30 * 60 * 1000;

export interface ActivityInterval {
  start: string;
  end: string;
}

export function burstsFromEvents(
  events: number[],
  options?: { idleGapMs?: number; maxBurstMs?: number }
): [number, number][] {
  const idleGap = options?.idleGapMs ?? IDLE_GAP_MS;
  const maxBurst = options?.maxBurstMs ?? MAX_BURST_MS;
  const sorted = [...new Set(events)].filter((t) => t > 0).sort((a, b) => a - b);
  if (!sorted.length) return [];

  const raw: [number, number][] = [];
  let start = sorted[0];
  let prev = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - prev > idleGap) {
      raw.push([start, prev]);
      start = sorted[i];
    }
    prev = sorted[i];
  }
  raw.push([start, prev]);

  return raw.map(([s, e]) => {
    const cappedEnd = Math.min(e, s + maxBurst);
    return [s, Math.max(s, cappedEnd)] as [number, number];
  });
}

export function intervalsToIso(bursts: [number, number][]): ActivityInterval[] {
  return bursts.map(([s, e]) => ({
    start: new Date(s).toISOString(),
    end: new Date(e).toISOString(),
  }));
}

export function engagedMsFromBursts(bursts: [number, number][]): number {
  return bursts.reduce((sum, [s, e]) => sum + Math.max(0, e - s), 0);
}

/** Derive wall-clock span, burst intervals, and engaged duration from raw event timestamps. */
export function buildActivityFromEvents(events: number[]): {
  startedAt: string | null;
  endedAt: string | null;
  engagedMs: number;
  activityIntervals: ActivityInterval[];
} {
  const sorted = [...new Set(events)].filter((t) => t > 0).sort((a, b) => a - b);
  if (!sorted.length) {
    return { startedAt: null, endedAt: null, engagedMs: 0, activityIntervals: [] };
  }
  const bursts = burstsFromEvents(sorted);
  const activityIntervals = intervalsToIso(bursts);
  return {
    startedAt: new Date(sorted[0]).toISOString(),
    endedAt: new Date(sorted[sorted.length - 1]).toISOString(),
    engagedMs: engagedMsFromBursts(bursts),
    activityIntervals,
  };
}
