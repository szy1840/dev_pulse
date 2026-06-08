import { homedir, platform } from "node:os";
import { join, basename } from "node:path";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { buildSessionSummary } from "../summary.js";
import { buildSummaryNotes } from "../session-notes.js";

/** Bump when summary derivation or token/model logic changes so sessions re-sync once. */
export const CURSOR_SUMMARY_VERSION = "v5";

/** Map Cursor internal model placeholders to friendlier ids. */
export function normalizeCursorModel(model: string | null | undefined): string | null {
  if (!model) return null;
  const m = model.trim();
  if (!m) return null;
  const lower = m.toLowerCase();
  if (lower === "default") return "cursor-auto";
  if (lower === "premium") return "cursor-premium";
  return m;
}

export interface SqliteDb {
  prepare(sql: string): {
    all: (...params: unknown[]) => Record<string, unknown>[];
    get?: (...params: unknown[]) => Record<string, unknown> | undefined;
  };
  close(): void;
}

export function cursorHome(): string {
  return process.env.CURSOR_HOME ?? join(homedir(), ".cursor");
}

export function globalStateDbPath(): string | null {
  const home = homedir();
  let path: string;
  switch (platform()) {
    case "darwin":
      path = join(home, "Library", "Application Support", "Cursor", "User", "globalStorage", "state.vscdb");
      break;
    case "win32":
      path = join(process.env.APPDATA ?? join(home, "AppData", "Roaming"), "Cursor", "User", "globalStorage", "state.vscdb");
      break;
    default:
      path = join(home, ".config", "Cursor", "User", "globalStorage", "state.vscdb");
  }
  return existsSync(path) ? path : null;
}

/** Map composerId → agent-transcripts jsonl path (scan once per sync). */
export function indexAgentTranscripts(): Map<string, string> {
  const map = new Map<string, string>();
  const root = join(cursorHome(), "projects");
  if (!existsSync(root)) return map;

  for (const proj of readdirSync(root)) {
    const dir = join(root, proj, "agent-transcripts");
    if (!existsSync(dir)) continue;

    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        const convId = entry.name;
        for (const file of readdirSync(join(dir, convId))) {
          if (file.endsWith(".jsonl")) {
            map.set(convId, join(dir, convId, file));
            break;
          }
        }
      } else if (entry.name.endsWith(".jsonl")) {
        map.set(entry.name.replace(/\.jsonl$/, ""), join(dir, entry.name));
      }
    }
  }
  return map;
}

function stripTags(text: string): string {
  return text
    .replace(/<user_query>\s*/g, "")
    .replace(/<\/user_query>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function userMessagesFromTranscript(filePath: string, limit = 12): string[] {
  const out: string[] = [];
  try {
    const lines = readFileSync(filePath, "utf8").trim().split("\n");
    for (const line of lines) {
      if (!line.trim() || out.length >= limit) break;
      const o = JSON.parse(line) as {
        role?: string;
        message?: { content?: { type?: string; text?: string }[] };
      };
      if (o.role !== "user") continue;
      const text = (o.message?.content ?? [])
        .filter((c) => c.type === "text" && c.text)
        .map((c) => c.text!)
        .join("\n");
      const cleaned = stripTags(text);
      if (cleaned) out.push(cleaned);
    }
  } catch {
    /* ignore */
  }
  return out;
}

export function relativeFilePaths(files: string[]): string[] {
  return [...new Set(files.map((f) => {
    const parts = f.split("/");
    const idx = parts.findIndex((p) => p === "src" || p === "cli");
    if (idx > 0) return parts.slice(idx - 1).join("/");
    return basename(f);
  }))];
}

export function composerTitleFromState(db: SqliteDb, conversationId: string): string | null {
  try {
    const row = db.prepare("SELECT value FROM cursorDiskKV WHERE key = ?").all(`composerData:${conversationId}`)[0];
    if (!row?.value) return null;
    const data = JSON.parse(String(row.value)) as { name?: string; title?: string };
    const title = data.name ?? data.title ?? null;
    return title?.trim() || null;
  } catch {
    return null;
  }
}

export function firstUserFromState(db: SqliteDb, conversationId: string): string | null {
  try {
    const rows = db
      .prepare("SELECT value FROM cursorDiskKV WHERE key LIKE ? ORDER BY key LIMIT 40")
      .all(`bubbleId:${conversationId}:%`);
    for (const row of rows) {
      if (!row?.value) continue;
      const v = JSON.parse(String(row.value)) as { type?: number; text?: string };
      if (v.type !== 1) continue;
      const cleaned = stripTags(String(v.text ?? ""));
      if (cleaned) return cleaned;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function guessProjectName(files: string[]): string | null {
  const counts = new Map<string, number>();
  for (const file of files) {
    const parts = file.split("/");
    for (let i = parts.length - 2; i >= 0; i--) {
      const name = parts[i];
      if (!name || ["src", "lib", "cli", "app", "components", "node_modules", "dist"].includes(name)) continue;
      counts.set(name, (counts.get(name) ?? 0) + 1);
      break;
    }
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return top?.[0] ?? null;
}

function buildFileSummary(files: string[]): string {
  const rel = files.map((f) => {
    const parts = f.split("/");
    const idx = parts.findIndex((p) => p === "src" || p === "cli");
    if (idx > 0) return parts.slice(idx - 1).join("/");
    return basename(f);
  });
  const unique = [...new Set(rel)];
  const head = unique.slice(0, 4).join(", ");
  return `Edited ${unique.length} file${unique.length === 1 ? "" : "s"}: ${head}${unique.length > 4 ? ", …" : ""}`;
}

/**
 * Resolve a human-readable session summary without uploading transcript content.
 * Priority: vscdb title → tracking title → transcript user → vscdb user → files → generic.
 */
export function buildCursorSummary(input: {
  conversationId: string;
  trackingTitle: string | null;
  files: string[];
  messageCount: number;
  stateDb: SqliteDb | null;
  transcriptPath: string | null;
}): { summary: string; summaryNotes: string | null } {
  const { trackingTitle, files, messageCount, stateDb, transcriptPath } = input;
  const projectName = guessProjectName(files);
  const base = { projectName, messageCount };
  const relFiles = relativeFilePaths(files);

  let composerTitle: string | null = null;
  if (stateDb) composerTitle = composerTitleFromState(stateDb, input.conversationId);

  const userMessages = transcriptPath ? userMessagesFromTranscript(transcriptPath) : [];
  if (userMessages.length === 0 && stateDb) {
    const first = firstUserFromState(stateDb, input.conversationId);
    if (first) userMessages.push(first);
  }

  const summaryNotes = buildSummaryNotes({
    tool: "cursor",
    projectName,
    title: composerTitle ?? trackingTitle,
    userMessages,
    files: relFiles,
  });

  if (stateDb && composerTitle) {
    const s = buildSessionSummary({ ...base, explicitSummary: composerTitle, firstUserText: null });
    if (s) return { summary: s, summaryNotes };
  }

  if (trackingTitle?.trim()) {
    const s = buildSessionSummary({ ...base, explicitSummary: trackingTitle, firstUserText: null });
    if (s) return { summary: s, summaryNotes };
  }

  if (userMessages[0]) {
    const s = buildSessionSummary({ ...base, explicitSummary: null, firstUserText: userMessages[0] });
    if (s) return { summary: s, summaryNotes };
  }

  if (files.length > 0) return { summary: buildFileSummary(files), summaryNotes };

  return {
    summary: `Cursor session — ${messageCount} AI request${messageCount === 1 ? "" : "s"}.`,
    summaryNotes,
  };
}
