export interface ActivityInterval {
  start: string;
  end: string;
}

type MsInterval = { start: number; end: number };

/** Billing-only Cursor API rows must not contribute to engaged/active time. */
export function isTimeTrackableExternalId(externalId: string): boolean {
  return !externalId.startsWith("cursor:api:");
}

export function parseActivityIntervals(raw: unknown): MsInterval[] {
  if (!Array.isArray(raw)) return [];
  const out: MsInterval[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const start = Date.parse(String((item as ActivityInterval).start ?? ""));
    const end = Date.parse(String((item as ActivityInterval).end ?? ""));
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) continue;
    out.push({ start, end });
  }
  return out;
}

/** Merge overlapping/adjacent intervals and return total covered milliseconds. */
export function mergedDurationMs(intervals: MsInterval[]): number {
  if (!intervals.length) return 0;
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  let total = 0;
  let curStart = sorted[0].start;
  let curEnd = sorted[0].end;

  for (let i = 1; i < sorted.length; i++) {
    const iv = sorted[i];
    if (iv.start <= curEnd) {
      curEnd = Math.max(curEnd, iv.end);
    } else {
      total += curEnd - curStart;
      curStart = iv.start;
      curEnd = iv.end;
    }
  }
  total += curEnd - curStart;
  return total;
}

/** Peak number of simultaneously active intervals (parallel sessions). */
export function peakConcurrency(intervals: MsInterval[]): number {
  if (!intervals.length) return 0;
  const events: { t: number; delta: number }[] = [];
  for (const iv of intervals) {
    events.push({ t: iv.start, delta: 1 }, { t: iv.end, delta: -1 });
  }
  events.sort((a, b) => a.t - b.t || a.delta - b.delta);

  let cur = 0;
  let peak = 0;
  for (const e of events) {
    cur += e.delta;
    peak = Math.max(peak, cur);
  }
  return peak;
}

export function mergeActivityIntervalsIso(a: ActivityInterval[], b: ActivityInterval[]): ActivityInterval[] {
  const combined = [...parseActivityIntervals(a), ...parseActivityIntervals(b)];
  if (!combined.length) return [];
  return toIsoIntervals(unionIntervals(combined));
}

function unionIntervals(intervals: MsInterval[]): MsInterval[] {
  if (!intervals.length) return [];
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const out: MsInterval[] = [{ start: sorted[0].start, end: sorted[0].end }];

  for (let i = 1; i < sorted.length; i++) {
    const iv = sorted[i];
    const last = out[out.length - 1];
    if (iv.start <= last.end) {
      last.end = Math.max(last.end, iv.end);
    } else {
      out.push({ start: iv.start, end: iv.end });
    }
  }
  return out;
}

function toIsoIntervals(intervals: MsInterval[]): ActivityInterval[] {
  return intervals.map((iv) => ({
    start: new Date(iv.start).toISOString(),
    end: new Date(iv.end).toISOString(),
  }));
}

export function engagedMsFromIntervalsIso(intervals: ActivityInterval[]): number {
  return mergedDurationMs(parseActivityIntervals(intervals));
}

export type SessionActivityInput = {
  external_id: string;
  engaged_ms: number;
  activity_intervals: unknown;
  started_at: string | null;
  ended_at: string | null;
};

export function sessionActivityIntervals(row: SessionActivityInput): MsInterval[] {
  if (!isTimeTrackableExternalId(row.external_id)) return [];

  const parsed = parseActivityIntervals(row.activity_intervals);
  if (parsed.length) return parsed;

  if (row.engaged_ms > 0) {
    const start = row.started_at ? Date.parse(row.started_at) : NaN;
    const end = row.ended_at ? Date.parse(row.ended_at) : NaN;
    if (!Number.isNaN(start) && !Number.isNaN(end) && end > start) {
      return [{ start, end: Math.min(end, start + row.engaged_ms) }];
    }
  }

  const start = row.started_at ? Date.parse(row.started_at) : NaN;
  const end = row.ended_at ? Date.parse(row.ended_at) : NaN;
  if (!Number.isNaN(start) && !Number.isNaN(end) && end > start) {
    return [{ start, end }];
  }
  return [];
}

export type TeamActivityStats = {
  activeMs: number;
  sessionEngagedMs: number;
  peakConcurrency: number;
  parallelFactor: number;
};

export function computeTeamActivityStats<T extends SessionActivityInput>(
  rows: T[],
  userIdForRow: (row: T) => string
): TeamActivityStats {
  const byUser = new Map<string, MsInterval[]>();
  let sessionEngagedMs = 0;

  for (const row of rows) {
    if (!isTimeTrackableExternalId(row.external_id)) continue;
    const intervals = sessionActivityIntervals(row);
    if (!intervals.length) continue;

    sessionEngagedMs += row.engaged_ms > 0 ? row.engaged_ms : mergedDurationMs(intervals);

    const uid = userIdForRow(row);
    const list = byUser.get(uid) ?? [];
    list.push(...intervals);
    byUser.set(uid, list);
  }

  let activeMs = 0;
  let peakConcurrencyTeam = 0;
  for (const intervals of byUser.values()) {
    activeMs += mergedDurationMs(intervals);
    peakConcurrencyTeam = Math.max(peakConcurrencyTeam, peakConcurrency(intervals));
  }

  const parallelFactor = activeMs > 0 ? sessionEngagedMs / activeMs : 1;

  return {
    activeMs,
    sessionEngagedMs,
    peakConcurrency: peakConcurrencyTeam,
    parallelFactor,
  };
}

export function computeUserActivityStats(rows: SessionActivityInput[]): {
  activeMs: number;
  sessionEngagedMs: number;
  peakConcurrency: number;
  parallelFactor: number;
} {
  const intervals: MsInterval[] = [];
  let sessionEngagedMs = 0;

  for (const row of rows) {
    if (!isTimeTrackableExternalId(row.external_id)) continue;
    const ivs = sessionActivityIntervals(row);
    if (!ivs.length) continue;
    intervals.push(...ivs);
    sessionEngagedMs += row.engaged_ms > 0 ? row.engaged_ms : mergedDurationMs(ivs);
  }

  const activeMs = mergedDurationMs(intervals);
  return {
    activeMs,
    sessionEngagedMs,
    peakConcurrency: peakConcurrency(intervals),
    parallelFactor: activeMs > 0 ? sessionEngagedMs / activeMs : 1,
  };
}
