import { getAdmin } from "@/lib/insforge/admin";
import { requireMembership } from "@/lib/auth";
import { generateCliToken } from "@/lib/tokens";

export async function createCliTokenForUser(
  userId: string,
  teamId: string,
  name: string
): Promise<{ ok: true; token: string; prefix: string } | { ok: false; error: string }> {
  try {
    await requireMembership(userId, teamId);
  } catch {
    return { ok: false, error: "Not a member of this team." };
  }

  const { token, hash, prefix } = generateCliToken();
  const admin = getAdmin();
  const { error } = await admin.database.from("cli_tokens").insert([
    {
      user_id: userId,
      team_id: teamId,
      name: name.trim() || "CLI token",
      token_hash: hash,
      token_prefix: prefix,
    },
  ]);

  if (error) return { ok: false, error: "Could not generate token." };
  return { ok: true, token, prefix };
}
