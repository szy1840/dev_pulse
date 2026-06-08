import { homedir } from "node:os";
import { join } from "node:path";
import { existsSync, readdirSync } from "node:fs";
import { paths as devpulsePaths } from "../config.js";

/** DevPulse Cursor API credentials (WorkosCursorSessionToken). */
export const CURSOR_CREDENTIALS_PATH = join(devpulsePaths.CONFIG_DIR, "cursor-credentials.json");

/** DevPulse Cursor usage CSV cache (mirrors tokscale layout). */
export const CURSOR_CACHE_DIR = join(devpulsePaths.CONFIG_DIR, "cursor-cache");
export const CURSOR_CACHE_FILE = join(CURSOR_CACHE_DIR, "usage.csv");

/** Tokscale cache — read-only fallback when the user already syncs via tokscale. */
export const TOKSCALE_CACHE_DIR = join(homedir(), ".config", "tokscale", "cursor-cache");

function isUsageCsvName(name: string): boolean {
  if (name === "usage.csv") return true;
  if (!name.startsWith("usage.") || !name.endsWith(".csv")) return false;
  if (name.startsWith("usage.backup")) return false;
  const stem = name.slice("usage.".length, -".csv".length);
  return stem.length > 0 && /^[a-z0-9._-]+$/i.test(stem);
}

/** All Cursor usage CSV files from DevPulse cache and optional tokscale cache. */
export function listUsageCsvPaths(): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  const scanDir = (dir: string) => {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir)) {
      if (!isUsageCsvName(name)) continue;
      const p = join(dir, name);
      if (seen.has(p)) continue;
      seen.add(p);
      out.push(p);
    }
  };

  scanDir(CURSOR_CACHE_DIR);
  scanDir(TOKSCALE_CACHE_DIR);
  return out.sort();
}

export function hasUsageCache(): boolean {
  return listUsageCsvPaths().length > 0;
}
