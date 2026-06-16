import OpenAI from "openai";
import { z } from "zod";
import { getAdmin } from "@/lib/insforge/admin";

const MODEL =
  process.env.DREAM_CYCLE_MODEL ||
  process.env.OPENROUTER_CHAT_MODEL ||
  "openai/gpt-4o-mini";
const MAX_JOBS_PER_RUN = 10;

type JobRow = {
  id: string;
  session_id: string;
  user_id: string;
  team_id: string;
  source_hash: string;
  attempts: number;
};

type IntentMessageRow = {
  message_index: number;
  occurred_at: string | null;
  text: string;
};

type SessionRow = {
  id: string;
  tool: string;
  project_name: string | null;
  summary: string | null;
  started_at: string | null;
  ended_at: string | null;
};

const extractedTaskSchema = z.object({
  title: z.string().min(1).max(120),
  summary: z.string().max(500).nullish(),
  intent: z.string().max(500).nullish(),
  object: z.string().max(200).nullish(),
  action: z.string().max(200).nullish(),
  outcome: z.string().max(300).nullish(),
  message_start_index: z.number().int().min(0),
  message_end_index: z.number().int().min(0),
  confidence: z.number().min(0).max(1).default(0.7),
});

const extractionSchema = z.object({
  tasks: z.array(extractedTaskSchema).max(20),
});

type ExtractedTask = z.infer<typeof extractedTaskSchema>;

function client(): OpenAI | null {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ baseURL: "https://openrouter.ai/api/v1", apiKey });
}

function jsonFromText(text: string): unknown {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) return JSON.parse(trimmed);
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Model did not return JSON");
  return JSON.parse(match[0]);
}

async function extractTasks(
  session: SessionRow | null,
  messages: IntentMessageRow[]
): Promise<{ tasks: ExtractedTask[]; model: string }> {
  if (messages.length === 0) throw new Error("No intent messages found for session");

  const ai = client();
  if (!ai) throw new Error("OPENROUTER_API_KEY is not configured");

  const system = [
    "You segment AI coding user messages into semantic task spans.",
    "A task span is an intent loop: same goal, same object, same action, and a stage result.",
    "Use semantic understanding, not keyword matching. Merge adjacent duplicate transport copies.",
    "Return JSON only with shape: {\"tasks\":[{title, summary, intent, object, action, outcome, message_start_index, message_end_index, confidence}]}",
    "Use the original message_index values. Keep titles short. Chinese output is fine when source messages are Chinese.",
  ].join(" ");

  const user = JSON.stringify({
    session: {
      tool: session?.tool ?? null,
      projectName: session?.project_name ?? null,
      summary: session?.summary ?? null,
      startedAt: session?.started_at ?? null,
      endedAt: session?.ended_at ?? null,
    },
    messages: messages.map((m) => ({
      index: m.message_index,
      t: m.occurred_at,
      text: m.text,
    })),
  });

  const res = await ai.chat.completions.create({
    model: MODEL,
    max_tokens: 1200,
    temperature: 0.1,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  const text = res.choices?.[0]?.message?.content;
  if (!text) throw new Error("Model returned empty content");
  const parsed = extractionSchema.parse(jsonFromText(text));
  return { tasks: parsed.tasks, model: MODEL };
}

function timeForMessage(messages: IntentMessageRow[], index: number): string | null {
  return messages.find((m) => m.message_index === index)?.occurred_at ?? null;
}

async function processJob(job: JobRow): Promise<"succeeded" | "failed" | "skipped"> {
  const admin = getAdmin();
  const now = new Date().toISOString();
  const { data: claimed, error: claimError } = await admin.database
    .from("semantic_task_extraction_jobs")
    .update({
      status: "running",
      attempts: job.attempts + 1,
      started_at: now,
      finished_at: null,
      last_error: null,
    })
    .eq("id", job.id)
    .eq("status", "pending")
    .select("id");

  if (claimError) throw new Error(`Failed to claim Dream Cycle job: ${claimError.message}`);
  if (((claimed as { id: string }[] | null) ?? []).length === 0) return "skipped";

  try {
    const [{ data: sessionData }, { data: messageData, error: messageError }] = await Promise.all([
      admin.database
        .from("sessions")
        .select("id, tool, project_name, summary, started_at, ended_at")
        .eq("id", job.session_id)
        .maybeSingle(),
      admin.database
        .from("session_intent_messages")
        .select("message_index, occurred_at, text")
        .eq("session_id", job.session_id)
        .order("message_index", { ascending: true }),
    ]);

    if (messageError) throw new Error(`Failed to fetch intent messages: ${messageError.message}`);

    const session = (sessionData as SessionRow | null) ?? null;
    const messages = (messageData as IntentMessageRow[] | null) ?? [];
    const { tasks, model } = await extractTasks(session, messages);

    const spanRows = tasks.map((task, idx) => ({
      session_id: job.session_id,
      user_id: job.user_id,
      team_id: job.team_id,
      task_index: idx,
      title: task.title,
      summary: task.summary ?? null,
      intent: task.intent ?? null,
      object: task.object ?? null,
      action: task.action ?? null,
      outcome: task.outcome ?? null,
      message_start_index: task.message_start_index,
      message_end_index: task.message_end_index,
      started_at: timeForMessage(messages, task.message_start_index),
      ended_at: timeForMessage(messages, task.message_end_index),
      confidence: task.confidence,
      source_model: model,
      source_hash: job.source_hash,
    }));

    const { error: deleteError } = await admin.database
      .from("task_spans")
      .delete()
      .eq("session_id", job.session_id);
    if (deleteError) throw new Error(`Failed to replace task spans: ${deleteError.message}`);

    if (spanRows.length > 0) {
      const { error: insertError } = await admin.database.from("task_spans").insert(spanRows);
      if (insertError) throw new Error(`Failed to insert task spans: ${insertError.message}`);
    }

    await admin.database
      .from("semantic_task_extraction_jobs")
      .update({
        status: "succeeded",
        model,
        last_error: null,
        finished_at: new Date().toISOString(),
      })
      .eq("id", job.id);
    return "succeeded";
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await admin.database
      .from("semantic_task_extraction_jobs")
      .update({
        status: "failed",
        last_error: message.slice(0, 2000),
        finished_at: new Date().toISOString(),
      })
      .eq("id", job.id);
    console.error("Dream Cycle job failed", { jobId: job.id, error });
    return "failed";
  }
}

export async function processDreamCycleJobs(limit = MAX_JOBS_PER_RUN) {
  const admin = getAdmin();
  const safeLimit = Math.max(1, Math.min(Math.floor(limit), MAX_JOBS_PER_RUN));
  const { data, error } = await admin.database
    .from("semantic_task_extraction_jobs")
    .select("id, session_id, user_id, team_id, source_hash, attempts")
    .eq("status", "pending")
    .order("queued_at", { ascending: true })
    .limit(safeLimit);

  if (error) throw new Error(`Failed to fetch Dream Cycle jobs: ${error.message}`);

  const jobs = (data as JobRow[] | null) ?? [];
  let succeeded = 0;
  let failed = 0;

  for (const job of jobs) {
    const status = await processJob(job);
    if (status === "succeeded") succeeded++;
    else if (status === "failed") failed++;
  }

  return { picked: jobs.length, succeeded, failed, limit: safeLimit };
}
