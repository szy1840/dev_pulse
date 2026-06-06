import OpenAI from "openai";
import { prettyTool } from "./format";

const MODEL = process.env.OPENROUTER_CHAT_MODEL || "anthropic/claude-haiku-4.5";

function client(): OpenAI | null {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ baseURL: "https://openrouter.ai/api/v1", apiKey });
}

const SYSTEM =
  "You write a single concise summary of one engineer's AI coding session for a team dashboard. " +
  "State what they worked on, fixed, or asked the agent to do — concrete engineering outcomes only. " +
  "Ignore sender metadata, JSON blobs, usernames, token counts, and tool internals. " +
  "One plain sentence, no markdown, no quotes, max 200 characters.";

export type SessionSummaryInput = {
  tool: string;
  projectName: string | null;
  fallbackSummary: string | null;
  summaryNotes: string | null;
};

/** LLM session summary from CLI-provided notes; falls back to rule-based client summary. */
export async function generateSessionSummary(input: SessionSummaryInput): Promise<string | null> {
  const { summaryNotes, fallbackSummary } = input;
  if (!summaryNotes?.trim()) return fallbackSummary;

  const ai = client();
  if (!ai) return fallbackSummary;

  const user = [
    `Agent: ${prettyTool(input.tool)}`,
    input.projectName ? `Project: ${input.projectName}` : "",
    summaryNotes.trim(),
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const res = await ai.chat.completions.create({
      model: MODEL,
      max_tokens: 120,
      temperature: 0.2,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: user },
      ],
    });
    const text = res.choices?.[0]?.message?.content?.trim();
    if (!text) return fallbackSummary;
    return text.length <= 240 ? text : text.slice(0, 239).trimEnd() + "…";
  } catch (err) {
    console.error("session summary LLM failed", err);
    return fallbackSummary;
  }
}

/** Batch with modest concurrency so sync stays responsive. */
export async function generateSessionSummaries(
  items: SessionSummaryInput[]
): Promise<(string | null)[]> {
  const out: (string | null)[] = new Array(items.length);
  const CONCURRENCY = 4;
  let i = 0;

  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await generateSessionSummary(items[idx]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, () => worker()));
  return out;
}
