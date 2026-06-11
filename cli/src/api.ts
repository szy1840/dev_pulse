import type { Config } from "./config.js";
import type { CommitMetadata, SessionMetadata } from "./types.js";

export interface VerifyResponse {
  ok: true;
  user: { id: string; name?: string; email?: string };
  team: { id: string; name?: string };
}

export interface SyncResponse {
  ok: true;
  created: number;
  updated: number;
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(config: Config, path: string, body: unknown): Promise<T> {
  if (!config.token) throw new ApiError(401, "Not logged in. Run `devpulse login` first.");

  const res = await fetch(new URL(path, config.apiUrl), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const json = (await res.json()) as { error?: string; details?: unknown };
      if (json.error) detail = json.error;
      if (json.details) detail += `: ${JSON.stringify(json.details)}`;
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, detail);
  }

  return (await res.json()) as T;
}

export function verifyToken(config: Config): Promise<VerifyResponse> {
  return request<VerifyResponse>(config, "/api/cli/verify", {});
}

export function uploadSessions(
  config: Config,
  sessions: SessionMetadata[]
): Promise<SyncResponse> {
  // localCwd is a machine-local path used by the git collector — never uploaded.
  const sanitized = sessions.map(({ localCwd: _localCwd, ...rest }) => rest);
  return request<SyncResponse>(config, "/api/cli/sync", { sessions: sanitized });
}

export interface CommitSyncResponse {
  ok: true;
  upserted: number;
}

export function uploadCommits(
  config: Config,
  commits: CommitMetadata[]
): Promise<CommitSyncResponse> {
  return request<CommitSyncResponse>(config, "/api/cli/commits", { commits });
}

export { ApiError };
