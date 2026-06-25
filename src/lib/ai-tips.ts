import OpenAI from "openai";
import { getAdmin } from "./insforge/admin";
import type { SessionLike } from "./summary";
import type { Locale } from "./locale";
import type { PeriodRange } from "./period";

const MODEL = process.env.OPENROUTER_CHAT_MODEL || "anthropic/claude-haiku-4.5";
const TIPS_VERSION = "v1";
const TIPS_TOOL_KEY = "__tips__";

const LANGUAGE_DIRECTIVE: Record<Locale, string> = {
  en: "Respond in English.",
  zh: "请用简体中文回复，所有内容均使用中文。",
};

export type AiTip = { emoji: string; title: string; body: string };

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

async function generate(
  sessions: SessionLike[],
  periodPhrase: string,
  locale: Locale
): Promise<AiTip[] | null> {
  const ai = client();
  if (!ai || sessions.length === 0) return null;

  const tools = topCounts(sessions.map((s) => s.tool), 3);
  const projects = topCounts(sessions.map((s) => s.projectName), 5);
  const notes = sessions.map((s) => s.summary).filter(Boolean).slice(0, 20);
  const totalTokens = sessions.reduce((a, s) => a + (s.inputTokens ?? 0) + (s.outputTokens ?? 0), 0);
  const avgTokens = sessions.length ? Math.round(totalTokens / sessions.length) : 0;

  const system =
    `You are writing a short "what's working this week" digest for a team's internal dashboard. ` +
    `Based on ${periodPhrase} AI usage data, write exactly 3 tips that highlight a specific workflow or habit a real team member used effectively. ` +
    `Return a JSON array: [{"emoji":"...","title":"...","body":"..."}] ` +
    `Rules for each tip: ` +
    `emoji = one relevant emoji. ` +
    `title = short noun phrase naming the method, 4-7 words, no verbs, no imperative. ` +
    `body = 2-3 sentences. Start by naming what someone actually did (e.g. "Ray broke his research into three separate prompts instead of one long conversation"). Then explain the concrete result. End with one specific thing anyone can try right now. Write like a colleague sharing a tip at a standup, not like a blog post. No dashes, no arrows, no buzzwords, no abstract phrases like "leverage" or "optimize". Base tips ONLY on the actual usage data. ` +
    LANGUAGE_DIRECTIVE[locale];

  const prompt = [
    `AI tools used: ${tools.join(", ") || "unknown"}`,
    `Projects: ${projects.join(", ") || "unknown"}`,
    `Sessions: ${sessions.length}, avg tokens/session: ${avgTokens}`,
    notes.length ? `Sample session notes:\n- ${notes.join("\n- ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const res = await ai.chat.completions.create({
      model: MODEL,
      max_tokens: 500,
      temperature: 0.5,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    });
    const text = res.choices?.[0]?.message?.content?.trim();
    if (!text) return null;
    // Strip markdown code fences if model wraps output
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const parsed = JSON.parse(cleaned);
    const arr: AiTip[] = Array.isArray(parsed)
      ? parsed
      : (parsed.tips ?? parsed.items ?? Object.values(parsed)[0]);
    if (!Array.isArray(arr) || arr.length === 0) return null;
    return arr.slice(0, 3) as AiTip[];
  } catch (err) {
    console.error("[ai-tips] generate failed:", err);
    return null;
  }
}

async function getStored(
  teamId: string,
  anchor: string,
  timeZone: string,
  locale: Locale,
  granularity: string
): Promise<{ tips: AiTip[]; fresh: boolean } | null> {
  const admin = getAdmin();
  const { data } = await admin.database
    .from("daily_summaries")
    .select("summary, session_count, model")
    .eq("team_id", teamId)
    .eq("scope", "team")
    .eq("scope_id", teamId)
    .eq("day", anchor)
    .eq("tool", TIPS_TOOL_KEY)
    .eq("timezone", timeZone)
    .eq("granularity", granularity)
    .eq("locale", locale)
    .maybeSingle();
  if (!data?.summary) return null;
  try {
    const tips = JSON.parse(data.summary) as AiTip[];
    const model = data.model as string | null;
    const fresh =
      model !== null &&
      (model === TIPS_VERSION || model.endsWith(`:${TIPS_VERSION}`)) &&
      (data.session_count ?? 0) > 0;
    return { tips, fresh };
  } catch {
    return null;
  }
}

async function store(
  teamId: string,
  anchor: string,
  timeZone: string,
  locale: Locale,
  granularity: string,
  tips: AiTip[],
  sessionCount: number
) {
  const admin = getAdmin();
  const { error } = await admin.database.from("daily_summaries").upsert(
    [
      {
        team_id: teamId,
        scope: "team",
        scope_id: teamId,
        day: anchor,
        tool: TIPS_TOOL_KEY,
        timezone: timeZone,
        granularity,
        locale,
        summary: JSON.stringify(tips),
        model: `${MODEL}:${TIPS_VERSION}`,
        session_count: sessionCount,
      },
    ],
    { onConflict: "team_id,scope,scope_id,day,tool,timezone,granularity,locale" }
  );
  if (error) console.error("ai_tips upsert failed", error);
}

/** Returns AI usage tips for week/month views only. Returns null for other views. */
export async function getTeamAiTips(
  teamId: string,
  range: PeriodRange,
  timeZone: string,
  sessions: SessionLike[],
  locale: Locale = "en"
): Promise<AiTip[] | null> {
  if (range.view !== "week" && range.view !== "month") return null;
  if (range.isCurrent) return null;
  if (sessions.length === 0) return null;

  const stored = await getStored(teamId, range.anchor, timeZone, locale, range.view);
  if (stored?.fresh) return stored.tips;

  const tips = await generate(sessions, range.phrase, locale);
  if (!tips) return stored?.tips ?? null; // fall back to stale cache on generation failure

  await store(teamId, range.anchor, timeZone, locale, range.view, tips, sessions.length);
  return tips;
}
