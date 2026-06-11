import { homedir } from "node:os";
import { join, basename } from "node:path";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { buildSessionSummary } from "../summary.js";
import { buildSummaryNotes, cleanUserText } from "../session-notes.js";
import { ACTIVITY_ALGO_VERSION, buildActivityFromEvents } from "../activity.js";
import { SPAN_ALGO_VERSION, buildSpans, type SpanEvent } from "../spans.js";
import type { SessionMetadata } from "../types.js";
import type { DiscoveredSession, ToolAdapter } from "./types.js";

const TOOL = "codex";

type SessionIndexRow = { id: string; thread_name?: string };

function codexHome(): string {
  return process.env.CODEX_HOME?.replace(/\/$/, "") || join(homedir(), ".codex");
}

function loadSessionIndex(): Map<string, SessionIndexRow> {
  const path = join(codexHome(), "session_index.jsonl");
  const map = new Map<string, SessionIndexRow>();
  if (!existsSync(path)) return map;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const row = JSON.parse(trimmed) as SessionIndexRow;
      if (row.id) map.set(row.id, row);
    } catch {
      /* skip malformed index line */
    }
  }
  return map;
}

/** Active + archived Codex rollout transcripts. */
function listCodexSessionFiles(): string[] {
  const roots = [join(codexHome(), "sessions"), join(codexHome(), "archived_sessions")];
  const out: string[] = [];
  for (const root of roots) {
    if (!existsSync(root)) continue;
    collectRollouts(root, out);
  }
  return out;
}

function collectRollouts(dir: string, out: string[]) {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) collectRollouts(p, out);
    else if (ent.isFile() && ent.name.startsWith("rollout-") && ent.name.endsWith(".jsonl")) {
      out.push(p);
    }
  }
}

function sessionIdFromFile(filePath: string): string | null {
  const m = filePath.match(
    /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jsonl$/i
  );
  return m?.[1] ?? null;
}

function extractMessageText(payload: { content?: unknown; text?: string }): string | null {
  if (typeof payload.text === "string") return payload.text;
  const content = payload.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object") {
          const p = part as { text?: string; input_text?: string };
          return p.text ?? p.input_text ?? "";
        }
        return "";
      })
      .join("\n")
      .trim();
  }
  return null;
}

/** File paths from an apply_patch body: `*** Update File: <path>` etc. */
function filePathsFromPatch(patch: string): string[] {
  const out: string[] = [];
  const re = /^\*\*\* (?:Update|Add|Delete) File: (.+)$/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(patch)) !== null) out.push(m[1].trim());
  return out;
}

interface CodexTokenUsage {
  input_tokens?: number;
  output_tokens?: number;
  cached_input_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
}

function isNoiseUserText(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  if (t.startsWith("<permissions instructions>")) return true;
  if (t.startsWith("Response MUST end with a remark-directive")) return true;
  if (t.startsWith("<skills_instructions>")) return true;
  if (t.startsWith("<plugins_instructions>")) return true;
  if (t.startsWith("<app-context>")) return true;
  if (t.startsWith("The user interrupted the previous turn")) return true;
  return false;
}

function parseCodexSession(filePath: string, index: Map<string, SessionIndexRow>): SessionMetadata | null {
  const lines = readFileSync(filePath, "utf8").split("\n");

  let sessionId: string | null = sessionIdFromFile(filePath);
  let cwd: string | null = null;
  let model: string | null = null;
  const userMessages: string[] = [];
  const seenUserMessages = new Set<string>();
  let messageCount = 0;
  const timestamps: number[] = [];
  let lastTokenUsage: CodexTokenUsage | null = null;
  const spanEvents: SpanEvent[] = [];
  // token_count carries cumulative totals; successive diffs give per-turn deltas.
  // Compaction resets the counter mid-session, so "last total" undercounts —
  // summing deltas across resets is the accurate session total.
  const prevTotal = { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 };
  const summed = { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 };
  let sawUsageDelta = false;

  function pushUserMessage(raw: string | null | undefined) {
    const cleaned = raw ? cleanUserText(raw) : null;
    if (!cleaned || isNoiseUserText(cleaned) || seenUserMessages.has(cleaned)) return;
    seenUserMessages.add(cleaned);
    userMessages.push(cleaned);
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let row: {
      type?: string;
      timestamp?: string;
      payload?: Record<string, unknown>;
    };
    try {
      row = JSON.parse(trimmed);
    } catch {
      continue;
    }

    let rowTs: number | null = null;
    if (row.timestamp) {
      const t = Date.parse(row.timestamp);
      if (!Number.isNaN(t)) {
        timestamps.push(t);
        rowTs = t;
      }
    }

    if (row.type === "session_meta" && row.payload) {
      const p = row.payload as { id?: string; cwd?: string };
      sessionId = p.id ?? sessionId;
      cwd = p.cwd ?? cwd;
    }

    if (row.type === "turn_context" && row.payload) {
      const p = row.payload as { model?: string };
      if (p.model) model = p.model;
    }

    if (row.type === "event_msg" && row.payload) {
      const p = row.payload as {
        type?: string;
        message?: string;
        info?: {
          total_token_usage?: CodexTokenUsage;
          last_token_usage?: CodexTokenUsage;
        };
      };
      if (p.type === "user_message" && typeof p.message === "string") {
        pushUserMessage(p.message);
      }
      if (p.type === "token_count") {
        lastTokenUsage = p.info?.total_token_usage ?? p.info?.last_token_usage ?? lastTokenUsage;

        // Per-turn usage delta from cumulative totals (clamped: compaction can
        // reset the counter). Falls back to last_token_usage when totals are absent.
        const total = p.info?.total_token_usage;
        const last = p.info?.last_token_usage;
        if (rowTs !== null && (total || last)) {
          const cur = total
            ? {
                input: total.input_tokens ?? 0,
                output: total.output_tokens ?? 0,
                cacheRead: total.cached_input_tokens ?? total.cache_read_input_tokens ?? 0,
                cacheCreation: total.cache_creation_input_tokens ?? 0,
              }
            : null;
          // A drop in cumulative input means the counter reset (compaction):
          // the new cumulative is a fresh count, so take it whole.
          const isReset = cur !== null && cur.input < prevTotal.input;
          const delta = cur
            ? {
                inputTokens: isReset ? cur.input : Math.max(0, cur.input - prevTotal.input),
                outputTokens: isReset ? cur.output : Math.max(0, cur.output - prevTotal.output),
                cacheReadTokens: isReset
                  ? cur.cacheRead
                  : Math.max(0, cur.cacheRead - prevTotal.cacheRead),
                cacheCreationTokens: isReset
                  ? cur.cacheCreation
                  : Math.max(0, cur.cacheCreation - prevTotal.cacheCreation),
              }
            : {
                inputTokens: last!.input_tokens ?? 0,
                outputTokens: last!.output_tokens ?? 0,
                cacheReadTokens: last!.cached_input_tokens ?? last!.cache_read_input_tokens ?? 0,
                cacheCreationTokens: last!.cache_creation_input_tokens ?? 0,
              };
          if (cur) Object.assign(prevTotal, cur);
          summed.input += delta.inputTokens;
          summed.output += delta.outputTokens;
          summed.cacheRead += delta.cacheReadTokens;
          summed.cacheCreation += delta.cacheCreationTokens;
          sawUsageDelta = true;
          spanEvents.push({ ts: rowTs, usage: delta });
        }
      }
    }

    if (row.type === "response_item" && row.payload) {
      const p = row.payload as {
        type?: string;
        role?: string;
        content?: unknown;
        text?: string;
        name?: string;
        input?: string;
        arguments?: string;
      };
      if (p.type === "message") {
        messageCount++;
        if (p.role === "user") {
          pushUserMessage(extractMessageText(p));
        }
        if (rowTs !== null) spanEvents.push({ ts: rowTs, isMessage: true });
      }
      // apply_patch carries file paths (custom_tool_call: input; function_call: JSON arguments).
      if (p.name === "apply_patch" && rowTs !== null) {
        let patch = typeof p.input === "string" ? p.input : "";
        if (!patch && typeof p.arguments === "string") {
          try {
            const args = JSON.parse(p.arguments) as { input?: string };
            if (typeof args.input === "string") patch = args.input;
          } catch {
            /* not JSON — ignore */
          }
        }
        const filePaths = filePathsFromPatch(patch);
        if (filePaths.length > 0) spanEvents.push({ ts: rowTs, filePaths });
      }
    }
  }

  if (messageCount === 0 && timestamps.length === 0 && !lastTokenUsage) return null;

  const rawId = sessionId ?? basename(filePath, ".jsonl");
  const threadName = rawId ? index.get(rawId)?.thread_name ?? null : null;
  const projectName = cwd ? basename(cwd) : null;
  const projectPathHash = cwd ? createHash("sha256").update(cwd).digest("hex").slice(0, 32) : null;

  const nonAutomation = userMessages.filter((m) => !/^Automation:/i.test(m));
  const firstUserText =
    nonAutomation[0] ??
    (threadName && !/^ClawMatrix scheduled run/i.test(threadName) ? threadName : null) ??
    userMessages[0] ??
    threadName;

  const summaryNotes = buildSummaryNotes({
    tool: TOOL,
    projectName,
    title: threadName,
    userMessages: nonAutomation.length ? nonAutomation : userMessages,
  });

  // Delta sums survive mid-session counter resets; fall back to the last
  // cumulative snapshot for old transcripts without usable token_count events.
  const inputTokens = sawUsageDelta ? summed.input : lastTokenUsage?.input_tokens ?? 0;
  const outputTokens = sawUsageDelta ? summed.output : lastTokenUsage?.output_tokens ?? 0;
  const cacheReadTokens = sawUsageDelta
    ? summed.cacheRead
    : lastTokenUsage?.cached_input_tokens ?? lastTokenUsage?.cache_read_input_tokens ?? 0;
  const cacheCreationTokens = sawUsageDelta
    ? summed.cacheCreation
    : lastTokenUsage?.cache_creation_input_tokens ?? 0;
  const activity = buildActivityFromEvents(timestamps);

  return {
    externalId: `${TOOL}:${rawId}`,
    tool: TOOL,
    model,
    projectPathHash,
    projectName,
    summary: buildSessionSummary({
      firstUserText,
      explicitSummary: threadName,
      projectName,
      messageCount,
    }),
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
    localCwd: cwd,
  };
}

export const codexAdapter: ToolAdapter = {
  tool: TOOL,
  label: "Codex",

  available() {
    return existsSync(join(codexHome(), "sessions")) || existsSync(join(codexHome(), "archived_sessions"));
  },

  discover(): DiscoveredSession[] {
    const index = loadSessionIndex();
    return listCodexSessionFiles().map((file) => ({
      stateKey: `${TOOL}:${file}`,
      fingerprint: `${safeFingerprint(file)}:${ACTIVITY_ALGO_VERSION}:${SPAN_ALGO_VERSION}`,
      load: () => parseCodexSession(file, index),
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
