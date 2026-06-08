import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, rmSync } from "node:fs";
import { CURSOR_CREDENTIALS_PATH, CURSOR_CACHE_DIR } from "./paths.js";
import { paths as devpulsePaths } from "../config.js";

export interface CursorCredentials {
  sessionToken: string;
  userId?: string;
  createdAt: string;
  label?: string;
}

interface CursorCredentialsStoreV1 {
  version: 1;
  activeAccountId: string;
  accounts: Record<string, CursorCredentials>;
}

function ensureDir() {
  if (!existsSync(devpulsePaths.CONFIG_DIR)) {
    mkdirSync(devpulsePaths.CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
}

function extractUserIdFromSessionToken(sessionToken: string): string | null {
  const token = sessionToken.trim();
  const sep = token.includes("%3A%3A") ? "%3A%3A" : token.includes("::") ? "::" : null;
  if (!sep) return null;
  const userId = token.split(sep)[0]?.trim();
  return userId || null;
}

function deriveAccountId(sessionToken: string): string {
  const userId = extractUserIdFromSessionToken(sessionToken);
  if (userId) return userId;
  return `anon-${createHash("sha256").update(sessionToken).digest("hex").slice(0, 12)}`;
}

function isStoreV1(data: unknown): data is CursorCredentialsStoreV1 {
  if (!data || typeof data !== "object") return false;
  const o = data as CursorCredentialsStoreV1;
  return o.version === 1 && typeof o.activeAccountId === "string" && typeof o.accounts === "object";
}

function loadStore(): CursorCredentialsStoreV1 | null {
  if (!existsSync(CURSOR_CREDENTIALS_PATH)) return null;
  try {
    const parsed = JSON.parse(readFileSync(CURSOR_CREDENTIALS_PATH, "utf8")) as unknown;
    if (isStoreV1(parsed)) {
      if (!parsed.accounts[parsed.activeAccountId]) {
        const first = Object.keys(parsed.accounts)[0];
        if (!first) return null;
        parsed.activeAccountId = first;
      }
      return parsed;
    }
    // Legacy single-object schema.
    const legacy = parsed as CursorCredentials;
    if (typeof legacy.sessionToken !== "string") return null;
    const accountId = deriveAccountId(legacy.sessionToken);
    return {
      version: 1,
      activeAccountId: accountId,
      accounts: {
        [accountId]: {
          sessionToken: legacy.sessionToken,
          userId: legacy.userId ?? extractUserIdFromSessionToken(legacy.sessionToken) ?? undefined,
          createdAt: legacy.createdAt ?? new Date().toISOString(),
          label: legacy.label,
        },
      },
    };
  } catch {
    return null;
  }
}

function saveStore(store: CursorCredentialsStoreV1) {
  ensureDir();
  writeFileSync(CURSOR_CREDENTIALS_PATH, JSON.stringify(store, null, 2), { mode: 0o600 });
}

function resolveAccountId(store: CursorCredentialsStoreV1, nameOrId?: string): string | null {
  if (!nameOrId?.trim()) return store.activeAccountId;
  const needle = nameOrId.trim();
  if (store.accounts[needle]) return needle;
  const lower = needle.toLowerCase();
  for (const [id, acct] of Object.entries(store.accounts)) {
    if (acct.label?.toLowerCase() === lower) return id;
  }
  return null;
}

export function isCursorApiLoggedIn(): boolean {
  const store = loadStore();
  return !!store && Object.keys(store.accounts).length > 0;
}

export function loadCursorCredentials(nameOrId?: string): CursorCredentials | null {
  const store = loadStore();
  if (!store) return null;
  const id = resolveAccountId(store, nameOrId);
  return id ? store.accounts[id] ?? null : null;
}

export function listCursorAccounts(): Array<{
  id: string;
  label?: string;
  userId?: string;
  createdAt: string;
  isActive: boolean;
}> {
  const store = loadStore();
  if (!store) return [];
  return Object.entries(store.accounts)
    .map(([id, acct]) => ({
      id,
      label: acct.label,
      userId: acct.userId,
      createdAt: acct.createdAt,
      isActive: id === store.activeAccountId,
    }))
    .sort((a, b) => (a.isActive === b.isActive ? 0 : a.isActive ? -1 : 1));
}

export function saveCursorCredentials(
  sessionToken: string,
  options?: { label?: string; setActive?: boolean }
): { accountId: string } {
  const token = sessionToken.trim();
  if (!token) throw new Error("Session token is required.");

  const accountId = deriveAccountId(token);
  const store = loadStore() ?? { version: 1, activeAccountId: accountId, accounts: {} };

  if (options?.label) {
    const needle = options.label.trim().toLowerCase();
    for (const [id, acct] of Object.entries(store.accounts)) {
      if (id !== accountId && acct.label?.trim().toLowerCase() === needle) {
        throw new Error(`Account label already exists: ${options.label}`);
      }
    }
  }

  store.accounts[accountId] = {
    sessionToken: token,
    userId: extractUserIdFromSessionToken(token) ?? undefined,
    createdAt: store.accounts[accountId]?.createdAt ?? new Date().toISOString(),
    label: options?.label ?? store.accounts[accountId]?.label,
  };
  if (options?.setActive !== false) store.activeAccountId = accountId;
  saveStore(store);
  return { accountId };
}

export function setActiveCursorAccount(nameOrId: string): { ok: boolean; error?: string } {
  const store = loadStore();
  if (!store) return { ok: false, error: "Not authenticated." };
  const id = resolveAccountId(store, nameOrId);
  if (!id) return { ok: false, error: `Account not found: ${nameOrId}` };
  store.activeAccountId = id;
  saveStore(store);
  return { ok: true };
}

export function removeCursorCredentials(options?: { purgeCache?: boolean }): boolean {
  const store = loadStore();
  if (!store) return false;
  try {
    unlinkSync(CURSOR_CREDENTIALS_PATH);
  } catch {
    return false;
  }
  if (options?.purgeCache) {
    try {
      if (existsSync(CURSOR_CACHE_DIR)) rmSync(CURSOR_CACHE_DIR, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
  return true;
}
