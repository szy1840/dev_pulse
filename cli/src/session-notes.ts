/** Strip transport/metadata wrappers so LLM sees the actual user intent. */
export function cleanUserText(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;

  let text = raw.trim();
  text = text.replace(/Sender\s*\([^)]*\):\s*```[\s\S]*?```/gi, "");
  text = text.replace(/```json\s*\{[\s\S]*?\}\s*```/g, "");
  text = text.replace(/<user_query>\s*/g, "").replace(/<\/user_query>/g, "");
  text = text.replace(/<[^>]+>/g, " ");
  text = text.replace(/\[(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[^\]]*\]\s*/g, "");
  text = text.replace(/\s+/g, " ").trim();

  if (text.length < 6) return null;
  if (/^openclaw-tui/i.test(text) && text.length < 40) return null;

  return text;
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
  return parts.join("\n");
}
