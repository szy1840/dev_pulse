import { join } from "node:path";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import type { SessionMetadata } from "../types.js";
import type { DiscoveredSession, ToolAdapter } from "./types.js";
import {
  buildCursorSummary,
  cursorHome,
  CURSOR_SUMMARY_VERSION,
  globalStateDbPath,
  guessProjectName,
  indexAgentTranscripts,
  type SqliteDb,
} from "./cursor-sources.js";
import { aggregateBubbleStats, resolveSessionModel } from "../cursor-api/bubble-stats.js";
import { buildApiUsageSessions } from "../cursor-api/usage-sessions.js";
import { buildActivityFromEvents, ACTIVITY_ALGO_VERSION } from "../activity.js";

const TOOL = "cursor";
const require = createRequire(import.meta.url);

function cursorDbPath(): string {
  return join(cursorHome(), "ai-tracking", "ai-code-tracking.db");
}

function loadSqlite(): { DatabaseSync: new (path: string, opts?: { readOnly?: boolean }) => SqliteDb } | null {
  try {
    return require("node:sqlite");
  } catch {
    return null;
  }
}

interface CodeRow {
  conversationId: string;
  model: string | null;
  requestId: string | null;
  fileName: string | null;
  timestamp: number | null;
}

/**
 * Cursor sessions from local stores + optional API usage cache:
 * - ai-code-tracking.db — composer sessions (files, timestamps)
 * - state.vscdb — titles, user text, bubble tokenCount / modelInfo
 * - agent-transcripts/*.jsonl — user queries for summary
 * - ~/.devpulse/cursor-cache/ or tokscale cache — official billing tokens (API)
 */
function buildComposerSessions(): { metadata: SessionMetadata; fingerprint: string }[] {
  const sqlite = loadSqlite();
  const dbPath = cursorDbPath();
  if (!sqlite || !existsSync(dbPath)) return [];

  let db: SqliteDb;
  try {
    db = new sqlite.DatabaseSync(dbPath, { readOnly: true });
  } catch {
    return [];
  }

  let stateDb: SqliteDb | null = null;
  const statePath = globalStateDbPath();
  if (statePath && sqlite) {
    try {
      stateDb = new sqlite.DatabaseSync(statePath, { readOnly: true });
    } catch {
      stateDb = null;
    }
  }

  const transcripts = indexAgentTranscripts();

  try {
    const rows = db
      .prepare(
        `SELECT conversationId, model, requestId, fileName, timestamp
         FROM ai_code_hashes
         WHERE source = 'composer' AND conversationId IS NOT NULL AND conversationId <> ''`
      )
      .all() as unknown as CodeRow[];

    const trackingTitles = new Map<string, string>();
    const summaryModels = new Map<string, string>();
    try {
      for (const r of db
        .prepare(
          `SELECT conversationId, title, model FROM conversation_summaries WHERE conversationId IS NOT NULL`
        )
        .all() as unknown as { conversationId: string; title: string | null; model: string | null }[]) {
        if (r.title) trackingTitles.set(r.conversationId, r.title);
        if (r.model) summaryModels.set(r.conversationId, r.model);
      }
    } catch {
      /* optional table */
    }

    type Agg = {
      models: string[];
      requestIds: Set<string>;
      files: Set<string>;
      hashes: number;
      eventTimes: number[];
    };
    const byConv = new Map<string, Agg>();
    for (const r of rows) {
      const a =
        byConv.get(r.conversationId) ??
        { models: [], requestIds: new Set(), files: new Set(), hashes: 0, eventTimes: [] };
      a.hashes++;
      if (r.model) a.models.push(r.model);
      if (r.requestId) a.requestIds.add(r.requestId);
      if (r.fileName) a.files.add(r.fileName);
      if (typeof r.timestamp === "number" && r.timestamp > 0) {
        a.eventTimes.push(r.timestamp);
      }
      byConv.set(r.conversationId, a);
    }

    const out: { metadata: SessionMetadata; fingerprint: string }[] = [];
    for (const [convId, a] of byConv) {
      const files = [...a.files];
      const bubble = stateDb ? aggregateBubbleStats(stateDb, convId) : null;
      const messageCount = Math.max(a.requestIds.size || a.hashes, bubble?.messageCount ?? 0);
      const projectName = guessProjectName(files);
      const { summary, summaryNotes, intentMessages } = buildCursorSummary({
        conversationId: convId,
        trackingTitle: trackingTitles.get(convId) ?? null,
        files,
        messageCount,
        stateDb,
        transcriptPath: transcripts.get(convId) ?? null,
      });

      const model = resolveSessionModel(
        a.models,
        bubble?.models ?? [],
        summaryModels.get(convId) ?? null
      );

      const inputTokens = bubble?.inputTokens ?? 0;
      const outputTokens = bubble?.outputTokens ?? 0;
      const activity = buildActivityFromEvents(a.eventTimes);

      out.push({
        fingerprint: `${a.hashes}:${inputTokens}:${outputTokens}:${activity.engagedMs}:${CURSOR_SUMMARY_VERSION}:${ACTIVITY_ALGO_VERSION}`,
        metadata: {
          externalId: `${TOOL}:${convId}`,
          tool: TOOL,
          model,
          projectPathHash: null,
          projectName,
          summary,
          summaryNotes,
          messageCount,
          inputTokens,
          outputTokens,
          cacheReadTokens: 0,
          cacheCreationTokens: 0,
          startedAt: activity.startedAt,
          endedAt: activity.endedAt,
          engagedMs: activity.engagedMs,
          activityIntervals: activity.activityIntervals,
          intentMessages,
        },
      });
    }
    return out;
  } catch {
    return [];
  } finally {
    try {
      db.close();
    } catch {
      /* ignore */
    }
    try {
      stateDb?.close();
    } catch {
      /* ignore */
    }
  }
}

function buildAllCursorSessions(): { metadata: SessionMetadata; fingerprint: string }[] {
  return [...buildComposerSessions(), ...buildApiUsageSessions()];
}

export const cursorAdapter: ToolAdapter = {
  tool: TOOL,
  label: "Cursor",

  available() {
    if (loadSqlite() === null) return false;
    return existsSync(cursorDbPath()) || buildApiUsageSessions().length > 0;
  },

  discover(): DiscoveredSession[] {
    return buildAllCursorSessions().map(({ metadata, fingerprint }) => ({
      stateKey: metadata.externalId,
      fingerprint,
      load: () => metadata,
    }));
  },
};
