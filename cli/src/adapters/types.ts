import type { SessionMetadata } from "../types.js";

export interface DiscoverOptions {
  /** Override the source directory (currently only honored by claude-code). */
  dir?: string;
}

/**
 * A session the adapter found locally. `stateKey` is a stable per-source key used
 * for change detection in state.json; `fingerprint` changes when the source
 * changes; `load()` does the (more expensive) parse into the upload payload.
 * The uploaded identity is `metadata.externalId`, which is namespaced per tool.
 */
export interface DiscoveredSession {
  stateKey: string;
  fingerprint: string;
  load: () => SessionMetadata | null;
}

/** A source of local AI coding sessions (Claude Code, OpenClaw, Cursor, …). */
export interface ToolAdapter {
  /** Stable tool id stored on every session (matches the dashboard's `tool`). */
  tool: string;
  /** Human-friendly name for CLI output. */
  label: string;
  /** True when this tool's data is present on this machine. */
  available: (opts?: DiscoverOptions) => boolean;
  /** Cheap discovery of candidate sessions (no heavy parsing). */
  discover: (opts?: DiscoverOptions) => DiscoveredSession[] | Promise<DiscoveredSession[]>;
}
