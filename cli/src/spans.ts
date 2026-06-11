import { createHash } from "node:crypto";
import { IDLE_GAP_MS } from "./activity.js";
import type { WorkSpan } from "./types.js";

/** Bump when span segmentation changes so sessions re-sync once. */
export const SPAN_ALGO_VERSION = "s1";

/** Cap uploaded spans per session; beyond this the tail merges into the last span. */
const MAX_SPANS = 100;

/**
 * One attributable unit of work observed in a transcript: a timestamped
 * message/tool event with whatever attribution signals the tool provides.
 * Tools without a signal simply leave it null/empty (codex/openclaw have no
 * branch; cursor has none of these and produces no spans).
 */
export interface SpanEvent {
  /** Epoch ms. Events with no timestamp should not be emitted. */
  ts: number;
  /** Git branch the tool recorded for this event (claude-code only today). */
  gitBranch?: string | null;
  /** Token usage delta attributable to this event. */
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    cacheReadTokens?: number;
    cacheCreationTokens?: number;
  };
  /** Absolute file paths touched by this event (Edit/Write/Read tool calls). */
  filePaths?: string[];
  /** Counts toward the span's messageCount. */
  isMessage?: boolean;
}

/** Privacy: file paths never leave the machine in clear text. */
export function hashFilePath(path: string): string {
  return createHash("sha256").update(path).digest("hex").slice(0, 16);
}

/**
 * Segment a session's events into work spans. A new span starts when:
 *  - the git branch changes (hard signal: the user switched tasks), or
 *  - the gap since the previous event exceeds the idle threshold (the same
 *    10-minute boundary the burst/active-time logic uses).
 *
 * Token sums are exact per span (usage is attached to individual events);
 * only the cut points are heuristic.
 */
export function buildSpans(
  events: SpanEvent[],
  options?: { idleGapMs?: number }
): WorkSpan[] {
  const idleGap = options?.idleGapMs ?? IDLE_GAP_MS;
  const sorted = [...events].filter((e) => e.ts > 0).sort((a, b) => a.ts - b.ts);
  if (!sorted.length) return [];

  interface Accumulator {
    start: number;
    end: number;
    branch: string | null;
    input: number;
    output: number;
    cacheRead: number;
    cacheCreation: number;
    messages: number;
    files: Set<string>;
  }

  const spans: Accumulator[] = [];
  let cur: Accumulator | null = null;
  let lastBranch: string | null = null;

  for (const ev of sorted) {
    const branch = ev.gitBranch ?? null;
    const branchChanged = branch !== null && lastBranch !== null && branch !== lastBranch;
    if (branch !== null) lastBranch = branch;

    if (!cur || ev.ts - cur.end > idleGap || branchChanged) {
      cur = {
        start: ev.ts,
        end: ev.ts,
        branch: branch ?? (branchChanged ? branch : lastBranch),
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheCreation: 0,
        messages: 0,
        files: new Set(),
      };
      spans.push(cur);
    }

    cur.end = Math.max(cur.end, ev.ts);
    if (branch !== null && cur.branch === null) cur.branch = branch;
    if (ev.usage) {
      cur.input += ev.usage.inputTokens ?? 0;
      cur.output += ev.usage.outputTokens ?? 0;
      cur.cacheRead += ev.usage.cacheReadTokens ?? 0;
      cur.cacheCreation += ev.usage.cacheCreationTokens ?? 0;
    }
    if (ev.isMessage) cur.messages++;
    for (const p of ev.filePaths ?? []) cur.files.add(hashFilePath(p));
  }

  // Merge an over-long tail so the payload stays bounded.
  while (spans.length > MAX_SPANS) {
    const tail = spans.pop()!;
    const prev = spans[spans.length - 1];
    prev.end = Math.max(prev.end, tail.end);
    prev.input += tail.input;
    prev.output += tail.output;
    prev.cacheRead += tail.cacheRead;
    prev.cacheCreation += tail.cacheCreation;
    prev.messages += tail.messages;
    for (const f of tail.files) prev.files.add(f);
  }

  return spans.map((s) => ({
    startedAt: new Date(s.start).toISOString(),
    endedAt: new Date(s.end).toISOString(),
    gitBranch: s.branch,
    inputTokens: s.input,
    outputTokens: s.output,
    cacheReadTokens: s.cacheRead,
    cacheCreationTokens: s.cacheCreation,
    messageCount: s.messages,
    fileHashes: [...s.files].slice(0, 50),
  }));
}
