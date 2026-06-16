import { homedir } from "node:os";
import { join, basename } from "node:path";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import type { IntentMessage, ParsedSession, SessionMetadata } from "../types.js";
import { buildActivityFromEvents } from "../activity.js";
import { buildSpans, type SpanEvent } from "../spans.js";
import { buildSessionSummary } from "../summary.js";
import {
  buildSummaryNotes,
  cleanIntentMessageText,
  cleanUserText,
  MAX_INTENT_MESSAGES,
} from "../session-notes.js";

const TOOL_NAME = "claude-code";

/** Where Claude Code stores per-project session transcripts. */
export function claudeProjectsDir(): string {
  return process.env.CLAUDE_PROJECTS_DIR || join(homedir(), ".claude", "projects");
}

export function fingerprintFile(filePath: string): string {
  const st = statSync(filePath);
  return `${Math.round(st.mtimeMs)}:${st.size}`;
}

/** Recursively list every `*.jsonl` transcript under the projects directory. */
export function listSessionFiles(dir = claudeProjectsDir()): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  const walk = (d: string) => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const full = join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name.endsWith(".jsonl")) out.push(full);
    }
  };
  walk(dir);
  return out;
}

// --- loose transcript entry shapes ---------------------------------------
interface Usage {
  input_tokens?: number;
  output_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
}
interface MessageContentPart {
  type?: string;
  text?: string;
  /** tool_use blocks: tool name + structured input (file_path for Edit/Write/Read). */
  name?: string;
  input?: { file_path?: string };
}
interface Message {
  role?: string;
  model?: string;
  content?: string | MessageContentPart[];
  usage?: Usage;
}
interface Entry {
  type?: string;
  timestamp?: string;
  sessionId?: string;
  cwd?: string;
  gitBranch?: string;
  isMeta?: boolean;
  summary?: string;
  message?: Message;
}

function textFromContent(content: Message["content"]): string | null {
  if (!content) return null;
  if (typeof content === "string") return content;
  const textPart = content.find((p) => p.type === "text" && p.text);
  return textPart?.text ?? null;
}

function mostFrequent(values: string[]): string | null {
  if (values.length === 0) return null;
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

/**
 * Parse a single transcript file into one session's metadata. Returns null if
 * the file has no usable entries. Malformed lines are skipped, not fatal.
 */
export function parseSessionFile(filePath: string): ParsedSession | null {
  const raw = readFileSync(filePath, "utf8");
  const lines = raw.split("\n");

  let sessionId: string | null = null;
  let cwd: string | null = null;
  let firstUserText: string | null = null;
  let explicitSummary: string | null = null;
  const userMessages: string[] = [];
  const intentMessages: IntentMessage[] = [];
  let messageCount = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  let cacheReadTokens = 0;
  let cacheCreationTokens = 0;
  const models: string[] = [];
  const timestamps: number[] = [];
  const spanEvents: SpanEvent[] = [];

  for (let lineNo = 0; lineNo < lines.length; lineNo++) {
    const line = lines[lineNo];
    const trimmed = line.trim();
    if (!trimmed) continue;
    let entry: Entry;
    try {
      entry = JSON.parse(trimmed) as Entry;
    } catch {
      continue; // skip malformed line
    }

    if (entry.sessionId && !sessionId) sessionId = entry.sessionId;
    if (entry.cwd && !cwd) cwd = entry.cwd;
    let entryTs: number | null = null;
    if (entry.timestamp) {
      const t = Date.parse(entry.timestamp);
      if (!Number.isNaN(t)) {
        timestamps.push(t);
        entryTs = t;
      }
    }

    if (entry.type === "summary" && entry.summary) {
      explicitSummary = entry.summary;
      continue;
    }

    const msg = entry.message;
    if (entry.type === "user" && !entry.isMeta && msg) {
      const text = textFromContent(msg.content);
      if (text) {
        const intentText = cleanIntentMessageText(text);
        if (intentText && intentMessages.length < MAX_INTENT_MESSAGES) {
          intentMessages.push({
            index: intentMessages.length,
            t: entryTs === null ? null : new Date(entryTs).toISOString(),
            text: intentText,
            source: `line:${lineNo + 1}`,
          });
        }
        const cleaned = cleanUserText(text);
        if (cleaned) {
          userMessages.push(cleaned);
          if (!firstUserText) firstUserText = cleaned;
        }
      }
      messageCount++;
      if (entryTs !== null) {
        spanEvents.push({ ts: entryTs, gitBranch: entry.gitBranch ?? null, isMessage: true });
      }
    } else if (entry.type === "assistant" && msg) {
      messageCount++;
      if (msg.model) models.push(msg.model);
      const u = msg.usage;
      if (u) {
        inputTokens += u.input_tokens ?? 0;
        outputTokens += u.output_tokens ?? 0;
        cacheReadTokens += u.cache_read_input_tokens ?? 0;
        cacheCreationTokens += u.cache_creation_input_tokens ?? 0;
      }
      if (entryTs !== null) {
        const filePaths = Array.isArray(msg.content)
          ? msg.content
              .filter((p) => p.type === "tool_use" && p.input?.file_path)
              .map((p) => p.input!.file_path!)
          : [];
        spanEvents.push({
          ts: entryTs,
          gitBranch: entry.gitBranch ?? null,
          isMessage: true,
          filePaths,
          usage: u
            ? {
                inputTokens: u.input_tokens ?? 0,
                outputTokens: u.output_tokens ?? 0,
                cacheReadTokens: u.cache_read_input_tokens ?? 0,
                cacheCreationTokens: u.cache_creation_input_tokens ?? 0,
              }
            : undefined,
        });
      }
    }
  }

  // Fall back to the filename (which is the session uuid) for the dedupe key.
  const externalId = sessionId ?? basename(filePath, ".jsonl");
  if (messageCount === 0 && timestamps.length === 0) return null;

  const projectName = cwd ? basename(cwd) : decodeProjectDir(filePath);
  const projectPathHash = cwd ? createHash("sha256").update(cwd).digest("hex").slice(0, 32) : null;

  const activity = buildActivityFromEvents(timestamps);

  const summaryNotes = buildSummaryNotes({
    tool: TOOL_NAME,
    projectName,
    title: explicitSummary,
    userMessages,
  });

  const metadata: SessionMetadata = {
    externalId,
    tool: TOOL_NAME,
    model: mostFrequent(models),
    projectPathHash,
    projectName,
    summary: buildSessionSummary({ firstUserText, explicitSummary, projectName, messageCount }),
    summaryNotes,
    messageCount,
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheCreationTokens,
    startedAt: activity.startedAt,
    endedAt: activity.endedAt,
    engagedMs: activity.engagedMs,
    activityIntervals: activity.activityIntervals,
    spans: buildSpans(spanEvents),
    intentMessages,
    localCwd: cwd,
  };

  return { metadata, filePath, fingerprint: fingerprintFile(filePath) };
}

/** Claude Code encodes the project path into the directory name (slashes -> dashes). */
function decodeProjectDir(filePath: string): string | null {
  const parts = filePath.split("/");
  const dirName = parts[parts.length - 2];
  if (!dirName) return null;
  const segments = dirName.split("-").filter(Boolean);
  return segments.length ? segments[segments.length - 1] : dirName;
}
