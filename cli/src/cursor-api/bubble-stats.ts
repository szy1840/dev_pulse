import type { SqliteDb } from "../adapters/cursor-sources.js";
import { normalizeCursorModel } from "../adapters/cursor-sources.js";

export interface BubbleStats {
  inputTokens: number;
  outputTokens: number;
  messageCount: number;
  models: string[];
}

interface BubbleJson {
  type?: number;
  text?: string;
  tokenCount?: { inputTokens?: number; outputTokens?: number };
  modelInfo?: { modelName?: string };
}

function estimateTokensFromText(text: string): number {
  const len = text.trim().length;
  return len > 0 ? Math.ceil(len / 4) : 0;
}

/** Sum bubble tokenCount (and chars/4 fallback) for one composer conversation. */
export function aggregateBubbleStats(db: SqliteDb, conversationId: string): BubbleStats {
  const stats: BubbleStats = { inputTokens: 0, outputTokens: 0, messageCount: 0, models: [] };

  try {
    const rows = db
      .prepare("SELECT value FROM cursorDiskKV WHERE key LIKE ?")
      .all(`bubbleId:${conversationId}:%`);

    for (const row of rows) {
      if (!row?.value) continue;
      let v: BubbleJson;
      try {
        v = JSON.parse(String(row.value)) as BubbleJson;
      } catch {
        continue;
      }

      stats.messageCount++;

      const modelName = v.modelInfo?.modelName?.trim();
      if (modelName) stats.models.push(modelName);

      let input = v.tokenCount?.inputTokens ?? 0;
      let output = v.tokenCount?.outputTokens ?? 0;

      if (input + output === 0 && v.text) {
        const est = estimateTokensFromText(v.text);
        if (v.type === 1) input = est;
        else output = est;
      }

      stats.inputTokens += input;
      stats.outputTokens += output;
    }
  } catch {
    /* ignore */
  }

  return stats;
}

export function resolveSessionModel(
  trackingModels: string[],
  bubbleModels: string[],
  summaryModel: string | null
): string | null {
  const pick = (values: string[]): string | null => {
    if (values.length === 0) return null;
    const counts = new Map<string, number>();
    for (const raw of values) {
      const m = normalizeCursorModel(raw);
      if (!m) continue;
      counts.set(m, (counts.get(m) ?? 0) + 1);
    }
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    return top?.[0] ?? null;
  };

  return pick(bubbleModels) ?? pick(trackingModels.map(normalizeCursorModel).filter(Boolean) as string[]) ?? normalizeCursorModel(summaryModel);
}
