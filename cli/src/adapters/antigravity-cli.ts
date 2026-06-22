import { homedir } from "node:os";
import { join, basename } from "node:path";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, statSync } from "node:fs";
import Database from "better-sqlite3";
import { buildSessionSummary } from "../summary.js";
import { buildSummaryNotes, INTENT_MESSAGES_VERSION } from "../session-notes.js";
import { ACTIVITY_ALGO_VERSION, buildActivityFromEvents } from "../activity.js";
import { SPAN_ALGO_VERSION, buildSpans, type SpanEvent } from "../spans.js";
import type { SessionMetadata } from "../types.js";
import type { DiscoveredSession, ToolAdapter } from "./types.js";

const TOOL = "antigravity-cli";

/**
 * Antigravity CLI stores each conversation as a SQLite database.
 * `GEMINI_CLI_HOME` overrides the default `~/.gemini` root (same env var the
 * Gemini CLI uses; Antigravity CLI inherits it).
 */
function conversationsDir(): string {
  const geminiHome = process.env.GEMINI_CLI_HOME ?? join(homedir(), ".gemini");
  return join(geminiHome, "antigravity-cli", "conversations");
}

function listDbFiles(): string[] {
  const dir = conversationsDir();
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".db"))
    .map((e) => join(dir, e.name));
}

// ---------------------------------------------------------------------------
// Minimal protobuf wire-format reader — no prost / schema dependency.
// Field numbers are reverse-engineered from real Antigravity CLI databases and
// documented in tokscale's antigravity_cli.rs (the reference implementation).
// ---------------------------------------------------------------------------

function readVarint(buf: Buffer, ctx: { pos: number }): bigint | null {
  let result = 0n, shift = 0n;
  while (ctx.pos < buf.length) {
    const byte = BigInt(buf[ctx.pos++]);
    result |= (byte & 0x7fn) << shift;
    if ((byte & 0x80n) === 0n) return result;
    shift += 7n;
    if (shift >= 64n) return null;
  }
  return null;
}

type ProtoField =
  | { kind: "varint"; field: number; value: bigint }
  | { kind: "len"; field: number; data: Buffer }
  | { kind: "skip"; field: number };

function nextProtoField(buf: Buffer, ctx: { pos: number }): ProtoField | null {
  if (ctx.pos >= buf.length) return null;
  const tag = readVarint(buf, ctx);
  if (tag === null) return null;
  const field = Number(tag >> 3n);
  switch (Number(tag & 7n)) {
    case 0: {
      const value = readVarint(buf, ctx);
      if (value === null) return null;
      return { kind: "varint", field, value };
    }
    case 1: {
      ctx.pos += 8;
      if (ctx.pos > buf.length) return null;
      return { kind: "skip", field };
    }
    case 2: {
      const len = readVarint(buf, ctx);
      if (len === null) return null;
      const n = Number(len);
      const end = ctx.pos + n;
      if (end > buf.length) return null;
      const data = buf.slice(ctx.pos, end);
      ctx.pos = end;
      return { kind: "len", field, data };
    }
    case 5: {
      ctx.pos += 4;
      if (ctx.pos > buf.length) return null;
      return { kind: "skip", field };
    }
    default:
      return null;
  }
}

function messageField(buf: Buffer, fieldNo: number): Buffer | null {
  const ctx = { pos: 0 };
  let f: ProtoField | null;
  while ((f = nextProtoField(buf, ctx)) !== null) {
    if (f.field === fieldNo && f.kind === "len") return f.data;
  }
  return null;
}

function varintField(buf: Buffer, fieldNo: number): bigint | null {
  const ctx = { pos: 0 };
  let f: ProtoField | null;
  while ((f = nextProtoField(buf, ctx)) !== null) {
    if (f.field === fieldNo && f.kind === "varint") return f.value;
  }
  return null;
}

function stringField(buf: Buffer, fieldNo: number): string | null {
  const data = messageField(buf, fieldNo);
  if (!data) return null;
  try { return data.toString("utf8"); } catch { return null; }
}

/** Decode a protobuf `{#1: seconds, #2: nanos}` Timestamp to epoch ms. */
function protoTimestampMs(tsBuf: Buffer): number | null {
  const sec = varintField(tsBuf, 1);
  if (sec === null) return null;
  const nsRaw = varintField(tsBuf, 2);
  const nanos = nsRaw !== null ? Number(nsRaw) : 0;
  if (nanos < 0 || nanos > 999_999_999) return null;
  const ms = Number(sec) * 1000 + Math.floor(nanos / 1_000_000);
  return ms > 0 ? ms : null;
}

/** Convert a `file://` URI to a filesystem path, handling Windows and UNC. */
function fileUriToPath(uri: string): string | null {
  if (!uri.startsWith("file://")) return null;
  const decoded = decodeURIComponent(uri.slice("file://".length));
  if (decoded.startsWith("/")) {
    // Drop leading slash before a Windows drive letter (`/C:/...` → `C:/...`).
    if (decoded.length >= 3 && decoded[2] === ":") return decoded.slice(1);
    return decoded;
  }
  return `//${decoded}`; // non-empty authority = UNC path
}

// ---------------------------------------------------------------------------
// gen_metadata protobuf schema (field numbers from reverse-engineering):
//   #1 → chatModel message
//     #4  → usage { #1: sysPrompt, #2: newInput, #5: cacheRead, #9: output, #10: thinking, #11: responseId }
//     #9  → generationTime { #4: { #1: seconds, #2: nanos } }
//     #19 → responseModel string
// ---------------------------------------------------------------------------

interface GenResult {
  model: string | null;
  timestamp: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
}

function parseGenMetadata(
  blob: Buffer,
  sessionTs: number,
  seenResponseIds: Set<string>
): GenResult | null {
  const chatModel = messageField(blob, 1);
  if (!chatModel) return null;
  const usage = messageField(chatModel, 4);
  if (!usage) return null;

  // Per-generation wall-clock stamp: chatModel.#9.#4 = { #1: seconds, #2: nanos }
  const genTimeSub = messageField(chatModel, 9);
  const genTsBuf = genTimeSub ? messageField(genTimeSub, 4) : null;
  const genTs = genTsBuf ? protoTimestampMs(genTsBuf) : null;
  const timestamp = genTs && genTs > 0 ? genTs : sessionTs;

  // Clamp bigint token counts into safe integers.
  const toNum = (v: bigint | null) =>
    v !== null ? Math.min(Number(v), Number.MAX_SAFE_INTEGER) : 0;

  const sysPrompt = toNum(varintField(usage, 1));
  const newInput = toNum(varintField(usage, 2));
  const cacheRead = toNum(varintField(usage, 5));
  const output = toNum(varintField(usage, 9));
  const reasoning = toNum(varintField(usage, 10));

  if (sysPrompt + newInput + cacheRead + output + reasoning === 0) return null;

  const responseId = stringField(usage, 11);
  if (responseId) {
    if (seenResponseIds.has(responseId)) return null;
    seenResponseIds.add(responseId);
  }

  return {
    model: stringField(chatModel, 19),
    timestamp,
    inputTokens: sysPrompt + newInput,
    // Fold reasoning (thinking) into outputTokens — DevPulse schema has no separate field.
    outputTokens: output + reasoning,
    cacheReadTokens: cacheRead,
  };
}

function parseDbFile(filePath: string): SessionMetadata | null {
  let db: InstanceType<typeof Database>;
  try {
    db = new Database(filePath, { readonly: true });
  } catch {
    return null;
  }

  try {
    const sessionId = basename(filePath, ".db");

    // trajectory_metadata_blob: session created-at timestamp + workspace URI.
    let sessionTs = 0;
    let projectPath: string | null = null;
    try {
      const trajRow = db
        .prepare("SELECT data FROM trajectory_metadata_blob LIMIT 1")
        .get() as { data: Buffer } | undefined;
      if (trajRow) {
        const blob = Buffer.from(trajRow.data);
        const tsBuf = messageField(blob, 2);
        if (tsBuf) sessionTs = protoTimestampMs(tsBuf) ?? 0;
        const folder = messageField(blob, 1);
        if (folder) {
          const uri = stringField(folder, 1);
          if (uri) projectPath = fileUriToPath(uri);
        }
      }
    } catch { /* table may not exist in older databases */ }

    // Fall back to file mtime when trajectory blob is absent or empty.
    if (!sessionTs) {
      try { sessionTs = Math.round(statSync(filePath).mtimeMs); } catch { sessionTs = 0; }
    }

    let rows: { data: Buffer }[];
    try {
      rows = db.prepare("SELECT data FROM gen_metadata ORDER BY idx").all() as { data: Buffer }[];
    } catch {
      return null;
    }

    const seenResponseIds = new Set<string>();
    const timestamps: number[] = [];
    const spanEvents: SpanEvent[] = [];
    let inputTokens = 0, outputTokens = 0, cacheReadTokens = 0;
    let model: string | null = null;

    for (const row of rows) {
      const blob = Buffer.from(row.data);
      const gen = parseGenMetadata(blob, sessionTs, seenResponseIds);
      if (!gen) continue;
      if (!model && gen.model) model = gen.model;
      timestamps.push(gen.timestamp);
      inputTokens += gen.inputTokens;
      outputTokens += gen.outputTokens;
      cacheReadTokens += gen.cacheReadTokens;
      spanEvents.push({
        ts: gen.timestamp,
        usage: {
          inputTokens: gen.inputTokens,
          outputTokens: gen.outputTokens,
          cacheReadTokens: gen.cacheReadTokens,
          cacheCreationTokens: 0,
        },
      });
    }

    if (timestamps.length === 0) return null;

    const projectName = projectPath ? basename(projectPath) : null;
    const projectPathHash = projectPath
      ? createHash("sha256").update(projectPath).digest("hex").slice(0, 32)
      : null;
    const activity = buildActivityFromEvents(timestamps);

    return {
      externalId: `${TOOL}:${sessionId}`,
      tool: TOOL,
      model,
      projectPathHash,
      projectName,
      summary: buildSessionSummary({
        firstUserText: null,
        explicitSummary: null,
        projectName,
        messageCount: spanEvents.length,
      }),
      summaryNotes: buildSummaryNotes({ tool: TOOL, projectName, userMessages: [] }),
      messageCount: spanEvents.length,
      inputTokens,
      outputTokens,
      cacheReadTokens,
      cacheCreationTokens: 0,
      startedAt: activity.startedAt,
      endedAt: activity.endedAt,
      engagedMs: activity.engagedMs,
      activityIntervals: activity.activityIntervals,
      spans: buildSpans(spanEvents),
      intentMessages: [],
      localCwd: projectPath,
    };
  } finally {
    db.close();
  }
}

export const antigravityCliAdapter: ToolAdapter = {
  tool: TOOL,
  label: "Antigravity CLI",

  available(): boolean {
    return existsSync(conversationsDir());
  },

  discover(): DiscoveredSession[] {
    return listDbFiles().map((file) => ({
      stateKey: `${TOOL}:${file}`,
      fingerprint: `${safeFingerprint(file)}:${ACTIVITY_ALGO_VERSION}:${SPAN_ALGO_VERSION}:${INTENT_MESSAGES_VERSION}`,
      load: () => parseDbFile(file),
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
