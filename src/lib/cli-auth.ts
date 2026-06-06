import { getAdmin } from "@/lib/insforge/admin";
import { hashToken } from "./tokens";

export type CliPrincipal = {
  tokenId: string;
  userId: string;
  teamId: string;
};

/**
 * Authenticate a CLI request from its `Authorization: Bearer <token>` header.
 * Returns the principal (user + team the token is scoped to) or null.
 * Touches `last_used_at` on success.
 */
export async function authenticateCliRequest(req: Request): Promise<CliPrincipal | null> {
  const header = req.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  const token = match[1].trim();
  if (!token.startsWith("dp_live_")) return null;

  const admin = getAdmin();
  const hash = hashToken(token);
  const { data, error } = await admin.database
    .from("cli_tokens")
    .select("id, user_id, team_id, revoked_at")
    .eq("token_hash", hash)
    .maybeSingle();

  const row = data as { id: string; user_id: string; team_id: string; revoked_at: string | null } | null;
  if (error || !row || row.revoked_at) return null;

  await admin.database
    .from("cli_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", row.id);

  return { tokenId: row.id, userId: row.user_id, teamId: row.team_id };
}
