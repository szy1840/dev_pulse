/** Compact number formatting for dashboard stats (e.g. 12_300 -> "12.3K"). */
export function formatCompact(n: number): string {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(
    n
  );
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en").format(n);
}

/** Human-friendly duration from milliseconds (e.g. "1h 12m", "4m", "38s"). */
export function formatDuration(ms: number): string {
  if (!ms || ms < 0) return "—";
  const totalSeconds = Math.round(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

/** Secondary line for active-time stats (parallel sessions). */
export function formatActivityHint(peakConcurrency: number, parallelFactor: number): string {
  const parts: string[] = [];
  if (peakConcurrency > 1) {
    parts.push(`peak ${peakConcurrency} concurrent`);
  }
  if (parallelFactor > 1.05) {
    parts.push(`${parallelFactor.toFixed(1)}× parallel`);
  }
  return parts.length ? parts.join(" · ") : "mostly single-session";
}

const TOOL_LABELS: Record<string, string> = {
  "claude-code": "Claude Code",
  codex: "Codex",
  cursor: "Cursor",
  openclaw: "OpenClaw",
};

/** Normalize tool slug for lookups, e.g. "Codex" -> "codex". */
export function normalizeToolSlug(tool: string | null | undefined): string {
  if (!tool) return "unknown";
  const slug = tool.trim().toLowerCase().replace(/\s+/g, "-");
  if (slug === "claude" || slug === "claude-code") return "claude-code";
  return slug;
}

/** Human-readable coding agent name, e.g. "claude-code" -> "Claude Code". */
export function prettyTool(tool: string | null | undefined): string {
  if (!tool || normalizeToolSlug(tool) === "unknown") return "Unknown";
  return TOOL_LABELS[normalizeToolSlug(tool)] ?? tool.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Shorten a model id for display, e.g. "claude-opus-4-8" -> "Opus 4.8". */
export function prettyModel(model: string | null | undefined): string {
  if (!model || model.trim().toLowerCase() === "unknown") return "Unknown";
  const m = model.toLowerCase();
  const match = m.match(/(opus|sonnet|haiku)-?(\d+)[-.]?(\d+)?/);
  if (match) {
    const family = match[1][0].toUpperCase() + match[1].slice(1);
    const version = match[3] ? `${match[2]}.${match[3]}` : match[2];
    return `${family} ${version}`;
  }
  return model;
}
