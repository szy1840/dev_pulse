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

function mostFrequent(values: string[]): string | null {
  if (values.length === 0) return null;
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

/**
 * Cursor session metadata from local stores:
 * - ai-code-tracking.db — files, models, timestamps (no prompts)
 * - state.vscdb — composer titles + user bubble text
 * - agent-transcripts/*.jsonl — first user query per session
 *
 * Token usage is not available locally (Cursor API only).
 */
function buildCursorSessions(): { metadata: SessionMetadata; fingerprint: string }[] {
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
    try {
      for (const r of db
        .prepare(`SELECT conversationId, title FROM conversation_summaries WHERE title IS NOT NULL`)
        .all() as unknown as { conversationId: string; title: string }[]) {
        trackingTitles.set(r.conversationId, r.title);
      }
    } catch {
      /* optional table */
    }

    type Agg = {
      models: string[];
      requestIds: Set<string>;
      files: Set<string>;
      hashes: number;
      t0: number | null;
      t1: number | null;
    };
    const byConv = new Map<string, Agg>();
    for (const r of rows) {
      const a =
        byConv.get(r.conversationId) ??
        { models: [], requestIds: new Set(), files: new Set(), hashes: 0, t0: null, t1: null };
      a.hashes++;
      if (r.model) a.models.push(r.model);
      if (r.requestId) a.requestIds.add(r.requestId);
      if (r.fileName) a.files.add(r.fileName);
      if (typeof r.timestamp === "number") {
        a.t0 = a.t0 === null ? r.timestamp : Math.min(a.t0, r.timestamp);
        a.t1 = a.t1 === null ? r.timestamp : Math.max(a.t1, r.timestamp);
      }
      byConv.set(r.conversationId, a);
    }

    const out: { metadata: SessionMetadata; fingerprint: string }[] = [];
    for (const [convId, a] of byConv) {
      const files = [...a.files];
      const messageCount = a.requestIds.size || a.hashes;
      const projectName = guessProjectName(files);
      const { summary, summaryNotes } = buildCursorSummary({
        conversationId: convId,
        trackingTitle: trackingTitles.get(convId) ?? null,
        files,
        messageCount,
        stateDb,
        transcriptPath: transcripts.get(convId) ?? null,
      });

      out.push({
        fingerprint: `${a.hashes}:${a.t1 ?? 0}:${CURSOR_SUMMARY_VERSION}`,
        metadata: {
          externalId: `${TOOL}:${convId}`,
          tool: TOOL,
          model: mostFrequent(a.models),
          projectPathHash: null,
          projectName,
          summary,
          summaryNotes,
          messageCount,
          inputTokens: 0,
          outputTokens: 0,
          cacheReadTokens: 0,
          cacheCreationTokens: 0,
          startedAt: a.t0 ? new Date(a.t0).toISOString() : null,
          endedAt: a.t1 ? new Date(a.t1).toISOString() : null,
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

export const cursorAdapter: ToolAdapter = {
  tool: TOOL,
  label: "Cursor",

  available() {
    return loadSqlite() !== null && existsSync(cursorDbPath());
  },

  discover(): DiscoveredSession[] {
    return buildCursorSessions().map(({ metadata, fingerprint }) => ({
      stateKey: metadata.externalId,
      fingerprint,
      load: () => metadata,
    }));
  },
};
