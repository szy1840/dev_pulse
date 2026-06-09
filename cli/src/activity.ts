/** Bump when burst/engaged logic changes so sessions re-sync once. */
export const ACTIVITY_ALGO_VERSION = "v3";

/** Gap between events before starting a new active burst. */
export const IDLE_GAP_MS = 10 * 60 * 1000;

/** Minimum credit for a burst that collapses to a single timestamp. */
export const MIN_BURST_MS = 30 * 1000;

/** Pad each burst at start/end for likely review/context switching near session edges. */
export const BURST_PADDING_MS = 5 * 60 * 1000;

export interface ActivityInterval {
  start: string;
  end: string;
}

export function burstsFromEvents(
  events: number[],
  options?: { idleGapMs?: number; minBurstMs?: number; paddingMs?: number }
): [number, number][] {
  const idleGap = options?.idleGapMs ?? IDLE_GAP_MS;
  const minBurst = options?.minBurstMs ?? MIN_BURST_MS;
  const padding = options?.paddingMs ?? BURST_PADDING_MS;
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

  // No max cap: dense logs within a burst mean continuous agent work.
  // Idle gaps (> IDLE_GAP_MS) split long breaks; padding credits brief review at burst edges.
  return raw.map(([s, e]) => {
    const coreEnd = Math.max(e, s + minBurst);
    return [s - padding, coreEnd + padding] as [number, number];
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
  const lastBurstEnd = bursts.length ? bursts[bursts.length - 1][1] : sorted[sorted.length - 1];
  return {
    startedAt: new Date(sorted[0]).toISOString(),
    endedAt: new Date(Math.max(sorted[sorted.length - 1], lastBurstEnd)).toISOString(),
    engagedMs: engagedMsFromBursts(bursts),
    activityIntervals,
  };
}
