/**
 * One contiguous unit of work within a session, cut on branch changes and
 * idle gaps. Token sums are exact (per-message usage); cut points are heuristic.
 */
export interface WorkSpan {
  startedAt: string; // ISO
  endedAt: string; // ISO
  /** Branch recorded by the tool during this span (claude-code only today). */
  gitBranch: string | null;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  messageCount: number;
  /** sha256-truncated hashes of files touched — paths never leave the machine. */
  fileHashes: string[];
}

/** Cleaned user-side message material for later semantic task extraction. */
export interface IntentMessage {
  index: number;
  /** Event time when the source transcript exposes it. */
  t: string | null;
  text: string;
  source?: string | null;
}

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
  /** Milliseconds of active bursts within this session (idle gaps removed). */
  engagedMs: number;
  /** Burst intervals used for per-user union and concurrency stats. */
  activityIntervals: { start: string; end: string }[];
  /** Work spans for task attribution (tools without per-event usage upload none). */
  spans?: WorkSpan[];
  /** Cleaned user intent messages for Dream Cycle task extraction. */
  intentMessages?: IntentMessage[];
  /** Hash of the git repo root containing cwd — join key against commits. */
  repoRootHash?: string | null;
  /** Local-only absolute cwd for the git collector. Stripped before upload. */
  localCwd?: string | null;
}

/** A commit observed locally, uploaded for span/task attribution. */
export interface CommitMetadata {
  repoRootHash: string;
  sha: string;
  authorEmail: string;
  authoredAt: string; // ISO
  subject: string;
  /** Branch (source ref) the commit was reached from — extra match signal. */
  branch: string | null;
  filesChanged: number;
  insertions: number;
  deletions: number;
}

/** A parsed session plus the source file fingerprint used for dedupe. */
export interface ParsedSession {
  metadata: SessionMetadata;
  filePath: string;
  fingerprint: string;
}
