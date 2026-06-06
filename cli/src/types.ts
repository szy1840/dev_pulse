/** The session payload uploaded to the backend. Matches the server's zod schema. */
export interface SessionMetadata {
  externalId: string;
  tool: string;
  model: string | null;
  projectPathHash: string | null;
  projectName: string | null;
  summary: string | null;
  /** Cleaned notes for server LLM summarization — not a stored field on the server. */
  summaryNotes?: string | null;
  messageCount: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  startedAt: string | null; // ISO
  endedAt: string | null; // ISO
}

/** A parsed session plus the source file fingerprint used for dedupe. */
export interface ParsedSession {
  metadata: SessionMetadata;
  filePath: string;
  fingerprint: string;
}
