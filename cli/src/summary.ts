/**
 * Rule-based, session-level summary built locally during sync. No transcript
 * content is uploaded — only this short derived string. An LLM-generated
 * summary could replace this later behind the same signature.
 */
export function buildSessionSummary(input: {
  firstUserText: string | null;
  explicitSummary: string | null;
  projectName: string | null;
  messageCount: number;
}): string | null {
  const { firstUserText, explicitSummary, projectName, messageCount } = input;

  // Prefer Claude Code's own "summary" entry when present.
  if (explicitSummary && explicitSummary.trim()) {
    return truncate(explicitSummary.trim(), 200);
  }

  if (firstUserText && firstUserText.trim()) {
    const cleaned = firstUserText.replace(/\s+/g, " ").trim();
    return truncate(cleaned, 200);
  }

  if (projectName) {
    return `Worked in ${projectName} (${messageCount} messages).`;
  }

  return null;
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + "…";
}
