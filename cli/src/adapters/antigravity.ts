import { homedir } from "node:os";
import { join, basename } from "node:path";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { buildSessionSummary } from "../summary.js";
import { buildSummaryNotes, INTENT_MESSAGES_VERSION } from "../session-notes.js";
import { ACTIVITY_ALGO_VERSION, buildActivityFromEvents } from "../activity.js";
import { SPAN_ALGO_VERSION, buildSpans, type SpanEvent } from "../spans.js";
import type { SessionMetadata } from "../types.js";
import type { DiscoveredSession, ToolAdapter } from "./types.js";

const TOOL = "antigravity";

/** Tokscale caches Antigravity IDE sessions here after `tokscale antigravity sync`. */
function cacheDir(): string {
  return join(homedir(), ".config", "tokscale", "antigravity-cache", "sessions");
}

function listFiles(): string[] {
  const dir = cacheDir();
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".jsonl"))
    .map((e) => join(dir, e.name));
}

interface UsageRow {
  type?: string;
  sessionId?: string;
  timestamp?: number;
  modelId?: string;
  input?: number;
  output?: number;
  cacheRead?: number;
  cacheWrite?: number;
  reasoning?: number;
  responseId?: string;
}

function parseFile(filePath: string): SessionMetadata | null {
  const lines = readFileSync(filePath, "utf8").split("\n");

  let sessionId: string | null = null;
  let model: string | null = null;
  const timestamps: number[] = [];
  let inputTokens = 0, outputTokens = 0, cacheReadTokens = 0, cacheCreationTokens = 0;
  const seenResponseIds = new Set<string>();
  const spanEvents: SpanEvent[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let row: UsageRow;
    try { row = JSON.parse(trimmed); } catch { continue; }

    if (row.type === "session_meta") {
      if (row.sessionId && !sessionId) sessionId = row.sessionId;
      if (row.modelId && !model) model = row.modelId;
      continue;
    }
    if (row.type !== "usage") continue;

    if (row.sessionId && !sessionId) sessionId = row.sessionId;
    if (row.modelId && !model) model = row.modelId;

    if (row.responseId) {
      if (seenResponseIds.has(row.responseId)) continue;
      seenResponseIds.add(row.responseId);
    }

    const ts = row.timestamp;
    if (typeof ts !== "number" || ts <= 0) continue;

    const inp = row.input ?? 0;
    // Fold reasoning tokens into output (no separate field in DevPulse schema).
    const out = (row.output ?? 0) + (row.reasoning ?? 0);
    const cr = row.cacheRead ?? 0;
    const cw = row.cacheWrite ?? 0;

    inputTokens += inp;
    outputTokens += out;
    cacheReadTokens += cr;
    cacheCreationTokens += cw;
    timestamps.push(ts);
    spanEvents.push({
      ts,
      usage: { inputTokens: inp, outputTokens: out, cacheReadTokens: cr, cacheCreationTokens: cw },
    });
  }

  if (timestamps.length === 0) return null;

  const rawId = sessionId ?? basename(filePath, ".jsonl");
  const activity = buildActivityFromEvents(timestamps);

  return {
    externalId: `${TOOL}:${rawId}`,
    tool: TOOL,
    model,
    projectPathHash: null,
    projectName: null,
    summary: buildSessionSummary({
      firstUserText: null,
      explicitSummary: null,
      projectName: null,
      messageCount: spanEvents.length,
    }),
    summaryNotes: buildSummaryNotes({ tool: TOOL, projectName: null, userMessages: [] }),
    messageCount: spanEvents.length,
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheCreationTokens,
    startedAt: activity.startedAt,
    endedAt: activity.endedAt,
    engagedMs: activity.engagedMs,
    activityIntervals: activity.activityIntervals,
    spans: buildSpans(spanEvents),
    intentMessages: [],
    localCwd: null,
  };
}

export const antigravityAdapter: ToolAdapter = {
  tool: TOOL,
  label: "Antigravity",

  available(): boolean {
    return existsSync(cacheDir());
  },

  discover(): DiscoveredSession[] {
    return listFiles().map((file) => ({
      stateKey: `${TOOL}:${file}`,
      fingerprint: `${safeFingerprint(file)}:${ACTIVITY_ALGO_VERSION}:${SPAN_ALGO_VERSION}:${INTENT_MESSAGES_VERSION}`,
      load: () => parseFile(file),
    }));
  },
};

function safeFingerprint(file: string): string {
  try {
    const st = statSync(file);
    return `${Math.round(st.mtimeMs)}:${st.size}`;
  } catch {
    return "";
  }
}
