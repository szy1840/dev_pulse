import type { SessionMetadata } from "../types.js";
import { cacheWriteTokens, type CursorUsageRow, parseCursorCsv } from "./parse-csv.js";
import { readAllUsageRows, usageCacheFingerprint } from "./sync-cache.js";
import { hasUsageCache } from "./paths.js";

const API_SUMMARY_VERSION = "v1";

function slugifyModel(model: string): string {
  return model
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

type DayModelAgg = {
  model: string;
  date: string;
  events: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  t0: number | null;
  t1: number | null;
};

function aggregateByDayModel(rows: CursorUsageRow[]): DayModelAgg[] {
  const map = new Map<string, DayModelAgg>();
  for (const row of rows) {
    const key = `${row.date}:${row.model}`;
    const a =
      map.get(key) ??
      {
        model: row.model,
        date: row.date,
        events: 0,
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheCreationTokens: 0,
        t0: null,
        t1: null,
      };
    a.events++;
    a.inputTokens += row.inputWithoutCacheWrite;
    a.outputTokens += row.outputTokens;
    a.cacheReadTokens += row.cacheRead;
    a.cacheCreationTokens += cacheWriteTokens(row);
    if (row.timestamp > 0) {
      a.t0 = a.t0 === null ? row.timestamp : Math.min(a.t0, row.timestamp);
      a.t1 = a.t1 === null ? row.timestamp : Math.max(a.t1, row.timestamp);
    }
    map.set(key, a);
  }
  return [...map.values()].sort((a, b) => b.date.localeCompare(a.date) || b.events - a.events);
}

/** Official Cursor billing rows → DevPulse sessions (one per calendar day + model). */
export function buildApiUsageSessions(): { metadata: SessionMetadata; fingerprint: string }[] {
  if (!hasUsageCache()) return [];

  const rows = readAllUsageRows();
  if (rows.length === 0) return [];

  const cacheFp = usageCacheFingerprint();
  const out: { metadata: SessionMetadata; fingerprint: string }[] = [];

  for (const agg of aggregateByDayModel(rows)) {
    const slug = slugifyModel(agg.model);
    const externalId = `cursor:api:${agg.date}:${slug}`;
    out.push({
      fingerprint: `${cacheFp}:${agg.date}:${slug}:${agg.events}:${API_SUMMARY_VERSION}`,
      metadata: {
        externalId,
        tool: "cursor",
        model: agg.model,
        projectPathHash: null,
        projectName: null,
        summary: `Cursor billing (API) · ${agg.model} · ${agg.date}`,
        summaryNotes: null,
        messageCount: agg.events,
        inputTokens: agg.inputTokens,
        outputTokens: agg.outputTokens,
        cacheReadTokens: agg.cacheReadTokens,
        cacheCreationTokens: agg.cacheCreationTokens,
        startedAt: agg.t0 ? new Date(agg.t0).toISOString() : `${agg.date}T00:00:00.000Z`,
        endedAt: agg.t1 ? new Date(agg.t1).toISOString() : `${agg.date}T23:59:59.999Z`,
      },
    });
  }
  return out;
}

export { parseCursorCsv };
