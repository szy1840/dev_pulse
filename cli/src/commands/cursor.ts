import { ui, prompt } from "../ui.js";
import {
  isCursorApiLoggedIn,
  listCursorAccounts,
  loadCursorCredentials,
  removeCursorCredentials,
  saveCursorCredentials,
  setActiveCursorAccount,
} from "../cursor-api/credentials.js";
import { validateCursorSession } from "../cursor-api/client.js";
import { syncCursorUsageCache, getCursorCacheStatus } from "../cursor-api/sync-cache.js";
import { CURSOR_CREDENTIALS_PATH, CURSOR_CACHE_DIR } from "../cursor-api/paths.js";

interface CursorLoginOptions {
  name?: string;
  token?: string;
}

export async function cursorLogin(opts: CursorLoginOptions) {
  ui.heading("Cursor API login");
  ui.dim("Paste your WorkosCursorSessionToken from https://www.cursor.com/settings");
  ui.dim("  Application → Cookies → cursor.com → WorkosCursorSessionToken");
  ui.dim("  or copy from a cursor.com/api/* request Cookie header.\n");

  let sessionToken = opts.token?.trim();
  if (!sessionToken) {
    sessionToken = await prompt("WorkosCursorSessionToken:\n> ");
  }
  if (!sessionToken) {
    ui.error("No token provided.");
    process.exit(1);
  }

  ui.dim("Validating session…");
  const check = await validateCursorSession(sessionToken);
  if (!check.valid) {
    ui.error(check.error ?? "Invalid session token.");
    process.exit(1);
  }

  try {
    const { accountId } = saveCursorCredentials(sessionToken, { label: opts.name });
    ui.success(
      `Cursor account saved${opts.name ? ` as "${opts.name}"` : ""}${check.membershipType ? ` (${check.membershipType})` : ""}.`
    );
    ui.dim(`  Account id: ${accountId}`);
    ui.dim(`  Credentials: ${CURSOR_CREDENTIALS_PATH}`);
    ui.dim("\nRun `devpulse cursor sync` to download usage CSV, then `devpulse sync` to upload.");
  } catch (err) {
    ui.error((err as Error).message);
    process.exit(1);
  }
}

interface CursorSyncOptions {
  json?: boolean;
}

export async function cursorSync(opts: CursorSyncOptions) {
  if (!isCursorApiLoggedIn()) {
    ui.error("Not logged in to Cursor. Run `devpulse cursor login` first.");
    process.exit(1);
  }

  ui.info("Fetching usage CSV from Cursor API…");
  const result = await syncCursorUsageCache();
  if (!result.synced) {
    ui.error(result.error ?? "Sync failed.");
    process.exit(1);
  }

  if (opts.json) {
    console.log(JSON.stringify({ ok: true, rows: result.rows, path: result.path }, null, 2));
    return;
  }

  ui.success(`Cached ${result.rows} usage row(s) → ${result.path}`);
  ui.dim("Run `devpulse sync` to upload billing sessions to your dashboard.");
}

export async function cursorStatus() {
  ui.heading("Cursor API status");
  ui.dim(`  Credentials: ${CURSOR_CREDENTIALS_PATH}`);
  ui.dim(`  Cache dir:   ${CURSOR_CACHE_DIR}`);

  const accounts = listCursorAccounts();
  if (accounts.length === 0) {
    ui.warn("\n  Not logged in. Run `devpulse cursor login`.");
    ui.dim("  You can still sync composer sessions from ~/.cursor without API login.");
    return;
  }

  ui.info(`\n  Accounts (${accounts.length}):`);
  for (const a of accounts) {
    const label = a.label ?? a.id;
    ui.info(`    ${a.isActive ? "●" : "○"} ${label}${a.userId ? ` (${a.userId})` : ""}`);
  }

  const active = loadCursorCredentials();
  if (active) {
    ui.dim("\n  Validating active session…");
    const check = await validateCursorSession(active.sessionToken);
    if (check.valid) {
      ui.success(`  Session valid${check.membershipType ? ` · ${check.membershipType}` : ""}.`);
    } else {
      ui.warn(`  Session invalid: ${check.error ?? "unknown"}`);
      ui.dim("  Run `devpulse cursor login` to refresh.");
    }
  }

  const cache = getCursorCacheStatus();
  if (cache.exists) {
    ui.info(`\n  Usage cache: ${cache.rowCount} row(s) from ${cache.paths.length} file(s)`);
    if (cache.lastModified) {
      ui.dim(`  Last updated: ${cache.lastModified.toLocaleString()}`);
    }
    for (const p of cache.paths) ui.dim(`    ${p}`);
  } else {
    ui.warn("\n  No usage cache yet. Run `devpulse cursor sync`.");
  }
}

interface CursorLogoutOptions {
  purgeCache?: boolean;
}

export async function cursorLogout(opts: CursorLogoutOptions) {
  if (!isCursorApiLoggedIn()) {
    ui.warn("No Cursor credentials stored.");
    return;
  }
  const ok = removeCursorCredentials({ purgeCache: opts.purgeCache });
  if (ok) {
    ui.success("Cursor credentials removed.");
    if (opts.purgeCache) ui.dim("Usage cache deleted.");
  } else {
    ui.error("Failed to remove credentials.");
    process.exit(1);
  }
}

export async function cursorSwitch(nameOrId: string) {
  const result = setActiveCursorAccount(nameOrId);
  if (!result.ok) {
    ui.error(result.error ?? "Switch failed.");
    process.exit(1);
  }
  ui.success(`Active Cursor account set to "${nameOrId}".`);
  ui.dim("Run `devpulse cursor sync` to refresh usage.csv for this account.");
}
