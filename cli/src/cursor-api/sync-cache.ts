import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { loadCursorCredentials } from "./credentials.js";
import { fetchCursorUsageCsv } from "./client.js";
import { parseCursorCsv } from "./parse-csv.js";
import { CURSOR_CACHE_DIR, CURSOR_CACHE_FILE, listUsageCsvPaths } from "./paths.js";

export function ensureCacheDir() {
  if (!existsSync(CURSOR_CACHE_DIR)) {
    mkdirSync(CURSOR_CACHE_DIR, { recursive: true, mode: 0o700 });
  }
}

export async function syncCursorUsageCache(nameOrId?: string): Promise<{
  synced: boolean;
  rows: number;
  path: string;
  error?: string;
}> {
  const credentials = loadCursorCredentials(nameOrId);
  if (!credentials) {
    return { synced: false, rows: 0, path: CURSOR_CACHE_FILE, error: "Not authenticated." };
  }

  try {
    const csvText = await fetchCursorUsageCsv(credentials.sessionToken);
    ensureCacheDir();
    writeFileSync(CURSOR_CACHE_FILE, csvText, { encoding: "utf8", mode: 0o600 });
    const rows = parseCursorCsv(csvText).length;
    return { synced: true, rows, path: CURSOR_CACHE_FILE };
  } catch (err) {
    return {
      synced: false,
      rows: 0,
      path: CURSOR_CACHE_FILE,
      error: (err as Error).message,
    };
  }
}

export function readAllUsageRows() {
  const paths = listUsageCsvPaths();
  const all: ReturnType<typeof parseCursorCsv> = [];
  for (const p of paths) {
    try {
      all.push(...parseCursorCsv(readFileSync(p, "utf8")));
    } catch {
      /* skip unreadable cache */
    }
  }
  return all;
}

export function getCursorCacheStatus(): {
  exists: boolean;
  paths: string[];
  lastModified?: Date;
  rowCount: number;
} {
  const paths = listUsageCsvPaths();
  if (paths.length === 0) {
    return { exists: false, paths: [], rowCount: 0 };
  }
  let latest: Date | undefined;
  for (const p of paths) {
    try {
      const m = statSync(p).mtime;
      if (!latest || m > latest) latest = m;
    } catch {
      /* ignore */
    }
  }
  return {
    exists: true,
    paths,
    lastModified: latest,
    rowCount: readAllUsageRows().length,
  };
}

export function usageCacheFingerprint(): string {
  const paths = listUsageCsvPaths();
  if (paths.length === 0) return "none";
  const parts: string[] = [];
  for (const p of paths) {
    try {
      const st = statSync(p);
      parts.push(`${p}:${st.size}:${st.mtimeMs}`);
    } catch {
      parts.push(`${p}:missing`);
    }
  }
  parts.push(`rows:${readAllUsageRows().length}`);
  return parts.join("|");
}
