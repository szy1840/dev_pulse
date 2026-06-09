import { homedir } from "node:os";
import { join, basename } from "node:path";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { buildSessionSummary } from "../summary.js";
import { buildSummaryNotes, cleanUserText } from "../session-notes.js";
import { ACTIVITY_ALGO_VERSION, buildActivityFromEvents } from "../activity.js";
import type { SessionMetadata } from "../types.js";
import type { DiscoveredSession, ToolAdapter } from "./types.js";

const TOOL = "openclaw";

/** Root of OpenClaw's per-agent session transcripts. */
function openclawAgentsDir(): string {
  return process.env.OPENCLAW_HOME
    ? join(process.env.OPENCLAW_HOME, "agents")
    : join(homedir(), ".openclaw", "agents");
}

/** Active session transcripts: `<agents>/<agent>/sessions/*.jsonl`.
 *  Archived files (`*.jsonl.reset.*`, `*.jsonl.deleted.*`) are skipped. */
function listOpenclawSessions(): string[] {
  const root = openclawAgentsDir();
  if (!existsSync(root)) return [];
  const out: string[] = [];
  for (const agent of readdirSync(root, { withFileTypes: true })) {
    if (!agent.isDirectory()) continue;
    const sessionsDir = join(root, agent.name, "sessions");
    if (!existsSync(sessionsDir)) continue;
    for (const entry of readdirSync(sessionsDir, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith(".jsonl")) {
        out.push(join(sessionsDir, entry.name));
      }
    }
  }
  return out;
}

interface OpenclawUsage {
  input?: number;
  output?: number;
  cacheRead?: number;
  cacheWrite?: number;
}
interface OpenclawMessage {
  role?: string;
  model?: string;
  content?: unknown;
  usage?: OpenclawUsage;
}
interface OpenclawEntry {
  type?: string;
  id?: string;
  timestamp?: string;
  cwd?: string;
  modelId?: string;
  message?: OpenclawMessage;
}

function textFromContent(content: unknown): string | null {
  if (!content) return null;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    for (const part of content) {
      if (part && typeof part === "object") {
        const p = part as { type?: string; text?: string };
        if (p.text) return p.text;
      }
    }
  }
  return null;
}

function mostFrequent(values: string[]): string | null {
  if (values.length === 0) return null;
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

function parseOpenclawSession(filePath: string): SessionMetadata | null {
  const lines = readFileSync(filePath, "utf8").split("\n");

  let sessionId: string | null = null;
  let cwd: string | null = null;
  const userMessages: string[] = [];
  let messageCount = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  let cacheReadTokens = 0;
  let cacheCreationTokens = 0;
  const models: string[] = [];
  const timestamps: number[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let entry: OpenclawEntry;
    try {
      entry = JSON.parse(trimmed) as OpenclawEntry;
    } catch {
      continue;
    }

    if (entry.type === "session") {
      if (entry.id && !sessionId) sessionId = entry.id;
      if (entry.cwd && !cwd) cwd = entry.cwd;
    }
    if (entry.type === "model_change" && entry.modelId) models.push(entry.modelId);
    if (entry.timestamp) {
      const t = Date.parse(entry.timestamp);
      if (!Number.isNaN(t)) timestamps.push(t);
    }

    const msg = entry.message;
    if (entry.type === "message" && msg) {
      messageCount++;
      if (msg.role === "user") {
        const text = textFromContent(msg.content);
        if (text) {
          const cleaned = cleanUserText(text);
          if (cleaned) userMessages.push(cleaned);
        }
      }
      if (msg.model) models.push(msg.model);
      const u = msg.usage;
      if (u) {
        inputTokens += u.input ?? 0;
        outputTokens += u.output ?? 0;
        cacheReadTokens += u.cacheRead ?? 0;
        cacheCreationTokens += u.cacheWrite ?? 0;
      }
    }
  }

  const rawId = sessionId ?? basename(filePath, ".jsonl");
  if (messageCount === 0 && timestamps.length === 0) return null;

  const projectName = cwd ? basename(cwd) : null;
  const projectPathHash = cwd ? createHash("sha256").update(cwd).digest("hex").slice(0, 32) : null;

  const firstUserText = userMessages[0] ?? null;
  const summaryNotes = buildSummaryNotes({
    tool: TOOL,
    projectName,
    userMessages,
  });

  const activity = buildActivityFromEvents(timestamps);

  return {
    externalId: `${TOOL}:${rawId}`,
    tool: TOOL,
    model: mostFrequent(models),
    projectPathHash,
    projectName,
    summary: buildSessionSummary({ firstUserText, explicitSummary: null, projectName, messageCount }),
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
  };
}

export const openclawAdapter: ToolAdapter = {
  tool: TOOL,
  label: "OpenClaw",

  available() {
    return existsSync(openclawAgentsDir());
  },

  discover(): DiscoveredSession[] {
    return listOpenclawSessions().map((file) => ({
      stateKey: `${TOOL}:${file}`,
      fingerprint: `${safeFingerprint(file)}:${ACTIVITY_ALGO_VERSION}`,
      load: () => parseOpenclawSession(file),
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
