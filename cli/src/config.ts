import { homedir } from "node:os";
import { join } from "node:path";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";

const CONFIG_DIR = join(homedir(), ".devpulse");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");
const STATE_PATH = join(CONFIG_DIR, "state.json");

/** Public dashboard URL (InsForge Deployments). */
export const PRODUCTION_API_URL = "https://7aj5nkyd.insforge.site";
const LEGACY_LOCAL_API_URL = "http://localhost:3000";

const DEFAULT_API_URL = process.env.DEVPULSE_API_URL?.replace(/\/$/, "") || PRODUCTION_API_URL;

function resolveApiUrl(stored?: string): string {
  if (process.env.DEVPULSE_API_URL) {
    return process.env.DEVPULSE_API_URL.replace(/\/$/, "");
  }
  // Upgrade configs that only ever had the old localhost default.
  if (!stored || stored.replace(/\/$/, "") === LEGACY_LOCAL_API_URL) {
    return DEFAULT_API_URL;
  }
  return stored.replace(/\/$/, "");
}

export interface Config {
  apiUrl: string;
  token?: string;
  /** Cached identity from the last successful `login`, for display only. */
  user?: { id: string; name?: string; email?: string };
  team?: { id: string; name?: string };
}

/** Per-session sync fingerprint so we skip unchanged transcripts on re-sync. */
export interface SessionState {
  fingerprint: string; // mtimeMs + size, cheap change detection
  lastSyncedAt: string;
}

export interface State {
  sessions: Record<string, SessionState>; // keyed by externalId
  lastSyncAt?: string;
  /** Per-repo incremental commit collection watermark, keyed by repoRootHash. */
  gitRepos?: Record<string, { lastCollectedAt: string }>;
}

function ensureDir() {
  if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
}

export function loadConfig(): Config {
  if (!existsSync(CONFIG_PATH)) return { apiUrl: DEFAULT_API_URL };
  try {
    const parsed = JSON.parse(readFileSync(CONFIG_PATH, "utf8")) as Config;
    return { ...parsed, apiUrl: resolveApiUrl(parsed.apiUrl) };
  } catch {
    return { apiUrl: DEFAULT_API_URL };
  }
}

export function saveConfig(config: Config) {
  ensureDir();
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), { mode: 0o600 });
}

export function loadState(): State {
  if (!existsSync(STATE_PATH)) return { sessions: {} };
  try {
    const parsed = JSON.parse(readFileSync(STATE_PATH, "utf8")) as State;
    return {
      sessions: parsed.sessions ?? {},
      lastSyncAt: parsed.lastSyncAt,
      gitRepos: parsed.gitRepos ?? {},
    };
  } catch {
    return { sessions: {} };
  }
}

export function saveState(state: State) {
  ensureDir();
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), { mode: 0o600 });
}

export const paths = { CONFIG_DIR, CONFIG_PATH, STATE_PATH };
