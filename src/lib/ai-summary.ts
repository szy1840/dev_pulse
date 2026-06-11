import OpenAI from "openai";
import {
  buildDailyUserSummary,
  buildDailyUserToolSummary,
  buildDailyTeamSummary,
  type SessionLike,
} from "./summary";
import { prettyTool } from "./format";

const MODEL = process.env.OPENROUTER_CHAT_MODEL || "anthropic/claude-haiku-4.5";
export const SUMMARY_VERSION = "v2";

export type GeneratedSummary = { text: string; model: string | null };

function client(): OpenAI | null {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ baseURL: "https://openrouter.ai/api/v1", apiKey });
}

function topCounts(values: (string | null)[], n: number): string[] {
  const counts = new Map<string, number>();
  for (const v of values) if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k);
}

function sessionNotes(sessions: SessionLike[]): string[] {
  return sessions
    .map((s) => {
      const bits = [s.summary, s.projectName ? `Project: ${s.projectName}` : null].filter(Boolean);
      return bits.join(" — ");
    })
    .filter(Boolean)
    .slice(0, 25);
}

function workContext(sessions: SessionLike[]) {
  const projects = topCounts(sessions.map((s) => s.projectName), 5);
  const notes = sessionNotes(sessions);
  return { projects, notes };
}

async function complete(system: string, user: string): Promise<string | null> {
  const ai = client();
  if (!ai) return null;
  try {
    const res = await ai.chat.completions.create({
      model: MODEL,
      max_tokens: 220,
      temperature: 0.3,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    const text = res.choices?.[0]?.message?.content?.trim();
    return text || null;
  } catch (err) {
    console.error("AI summary generation failed", err);
    return null;
  }
}

const WORK_FOCUS =
  "Focus ONLY on concrete engineering work: features shipped, bugs fixed, refactors, investigations, config or infra changes. " +
  "Do NOT mention token counts, model names, session counts, or generic phrases like 'AI-assisted code change'. " +
  "Write 1-2 plain sentences. No markdown, no preamble, no bullet points.";

// Period phrase ("today" / "this week" / "in June 2026") flows into the prompt
// so the same machinery summarizes any calendar period.
const userSystem = (phrase: string) =>
  `You write a concise recap of one engineer's AI coding activity ${phrase} for a team dashboard. ` + WORK_FOCUS;

const userToolSystem = (phrase: string) =>
  `You write a concise recap of one engineer's work with a specific AI coding agent ${phrase} for a team dashboard. ` +
  WORK_FOCUS;

const teamSystem = (phrase: string) =>
  `You write a concise recap of an engineering team's AI coding activity ${phrase} for a dashboard. ` + WORK_FOCUS;

function storedModel(model: string | null): string {
  return model ? `${model}:${SUMMARY_VERSION}` : SUMMARY_VERSION;
}

export function isStoredSummaryFresh(storedModel: string | null): boolean {
  if (!storedModel) return false;
  return storedModel === SUMMARY_VERSION || storedModel.endsWith(`:${SUMMARY_VERSION}`);
}

/** LLM daily summary for one user, falling back to the rule-based version. */
export async function generateUserDaily(
  name: string,
  sessions: SessionLike[],
  periodPhrase = "today"
): Promise<GeneratedSummary> {
  const fallback = buildDailyUserSummary(name, sessions);
  if (sessions.length === 0) return { text: fallback, model: null };

  const { projects, notes } = workContext(sessions);
  const prompt = [
    `Engineer: ${name}`,
    `Projects touched: ${projects.join(", ") || "unknown"}`,
    notes.length ? `Session notes:\n- ${notes.join("\n- ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const text = await complete(userSystem(periodPhrase), prompt);
  return text ? { text, model: storedModel(MODEL) } : { text: fallback, model: SUMMARY_VERSION };
}

/** LLM daily summary for one user scoped to a single agent/tool. */
export async function generateUserToolDaily(
  name: string,
  tool: string,
  sessions: SessionLike[],
  periodPhrase = "today"
): Promise<GeneratedSummary> {
  const fallback = buildDailyUserToolSummary(name, tool, sessions);
  if (sessions.length === 0) return { text: fallback, model: null };

  const agent = prettyTool(tool);
  const { projects, notes } = workContext(sessions);
  const prompt = [
    `Engineer: ${name}`,
    `Agent: ${agent}`,
    `Projects touched: ${projects.join(", ") || "unknown"}`,
    notes.length ? `Session notes:\n- ${notes.join("\n- ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const text = await complete(userToolSystem(periodPhrase), prompt);
  return text ? { text, model: storedModel(MODEL) } : { text: fallback, model: SUMMARY_VERSION };
}

/** LLM daily summary for a whole team, falling back to the rule-based version. */
export async function generateTeamDaily(
  teamName: string,
  sessions: SessionLike[],
  activeMembers: number,
  periodPhrase = "today"
): Promise<GeneratedSummary> {
  const fallback = buildDailyTeamSummary(teamName, sessions, activeMembers);
  if (sessions.length === 0) return { text: fallback, model: null };

  const { projects, notes } = workContext(sessions);
  const prompt = [
    `Team: ${teamName}`,
    `Active members: ${activeMembers}`,
    `Projects touched: ${projects.join(", ") || "unknown"}`,
    notes.length ? `Session notes:\n- ${notes.join("\n- ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const text = await complete(teamSystem(periodPhrase), prompt);
  return text ? { text, model: storedModel(MODEL) } : { text: fallback, model: SUMMARY_VERSION };
}
