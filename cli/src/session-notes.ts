export const INTENT_MESSAGES_VERSION = "im1";
export const MAX_INTENT_MESSAGES = 100;

const INTENT_TEXT_LIMIT = 1000;

const SHORT_INTENT_SIGNALS = new Set([
  "ok",
  "okay",
  "done",
  "yes",
  "no",
  "nope",
  "继续",
  "接着",
  "可以",
  "可以了",
  "行",
  "好",
  "好的",
  "对",
  "是",
  "不是",
  "不对",
  "不行",
  "错了",
  "算了",
  "停",
  "暂停",
]);

function stripTransportWrappers(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;

  let text = raw.trim();
  text = text.replace(/Sender\s*\([^)]*\):\s*```[\s\S]*?```/gi, "");
  text = text.replace(/```json\s*\{[\s\S]*?\}\s*```/g, "");
  text = text.replace(/<environment_context>[\s\S]*?<\/environment_context>/gi, "");
  text = text.replace(
    /#\s*Context from my IDE setup:[\s\S]*?## My request for Codex:\s*/gi,
    ""
  );
  text = text.replace(/<user_query>\s*/g, "").replace(/<\/user_query>/g, "");
  text = text.replace(/<[^>]+>/g, " ");
  text = text.replace(/\[(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[^\]]*\]\s*/g, "");
  text = text.replace(/\s+/g, " ").trim();
  return text || null;
}

function isShortIntentSignal(text: string): boolean {
  const normalized = text
    .trim()
    .toLowerCase()
    .replace(/[。.!！?？]+$/g, "");
  return SHORT_INTENT_SIGNALS.has(normalized);
}

function isIntentNoise(text: string): boolean {
  return (
    /^openclaw-tui/i.test(text) ||
    /^filesystem sandboxing defines/i.test(text) ||
    /^#?\s*agents\.md instructions/i.test(text) ||
    /^knowledge cutoff:/i.test(text) ||
    /^tools are grouped by namespace/i.test(text) ||
    /^you are codex/i.test(text) ||
    /^you are an ai assistant/i.test(text)
  );
}

function truncateIntentText(text: string): string {
  return text.length > INTENT_TEXT_LIMIT ? text.slice(0, INTENT_TEXT_LIMIT - 1).trimEnd() + "…" : text;
}

/** Strip transport/metadata wrappers so LLM sees the actual user intent. */
export function cleanUserText(raw: string | null | undefined): string | null {
  const text = stripTransportWrappers(raw);
  if (!text) return null;
  if (text.length < 6) return null;
  if (/^openclaw-tui/i.test(text) && text.length < 40) return null;

  return text;
}

/**
 * Cleaner for Dream Cycle source material.
 * Unlike summary notes, this keeps short boundary replies such as "可以了" or "不对".
 */
export function cleanIntentMessageText(raw: string | null | undefined): string | null {
  const text = stripTransportWrappers(raw);
  if (!text) return null;
  if (isShortIntentSignal(text)) return text;
  if (text.length < 2) return null;
  if (isIntentNoise(text)) return null;
  return truncateIntentText(text);
}

export function intentMessageDedupeKey(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Lightweight context for server-side LLM session summaries (not stored in DB). */
export function buildSummaryNotes(input: {
  tool: string;
  projectName?: string | null;
  title?: string | null;
  userMessages: string[];
  files?: string[];
}): string | null {
  const messages = input.userMessages.map(cleanUserText).filter(Boolean);
  const hasTitle = !!input.title?.trim();
  if (messages.length === 0 && !hasTitle && !(input.files?.length)) return null;

  const parts: string[] = [`Tool: ${input.tool}`];
  if (input.projectName) parts.push(`Project: ${input.projectName}`);
  if (hasTitle) parts.push(`Session title: ${input.title!.trim()}`);
  if (input.files?.length) {
    parts.push(`Files edited: ${input.files.slice(0, 20).join(", ")}`);
  }
  if (messages.length) {
    parts.push(`User requests:\n- ${messages.slice(0, 15).join("\n- ")}`);
  }
  const joined = parts.join("\n");
  return joined.length > 8000 ? joined.slice(0, 7999).trimEnd() + "…" : joined;
}
