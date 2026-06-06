"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { clearAuthCookies } from "@insforge/sdk/ssr";
import { getAdmin } from "@/lib/insforge/admin";
import { requireUserId, syncProfile, requireMembership, ACTIVE_TEAM_COOKIE } from "@/lib/auth";
import { newInviteCode } from "@/lib/ids";
import { createCliTokenForUser } from "@/lib/create-cli-token";

type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

const ACTIVE_TEAM_COOKIE_OPTS = { path: "/", maxAge: 60 * 60 * 24 * 365 };

export async function createTeam(name: string): Promise<ActionResult<{ teamId: string }>> {
  const userId = await requireUserId();
  await syncProfile();

  const trimmed = name.trim();
  if (trimmed.length < 2) return { ok: false, error: "Team name must be at least 2 characters." };

  const admin = getAdmin();
  const { data, error } = await admin.database
    .from("teams")
    .insert([{ name: trimmed, invite_code: newInviteCode(), created_by: userId }])
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: "Could not create team. Try again." };
  const teamId = (data as { id: string }).id;

  const { error: memberError } = await admin.database
    .from("team_members")
    .insert([{ team_id: teamId, user_id: userId, role: "owner" }]);
  if (memberError) return { ok: false, error: "Could not add you to the team." };

  (await cookies()).set(ACTIVE_TEAM_COOKIE, teamId, ACTIVE_TEAM_COOKIE_OPTS);
  revalidatePath("/dashboard");
  return { ok: true, data: { teamId } };
}

export async function joinTeam(code: string): Promise<ActionResult<{ teamId: string }>> {
  const userId = await requireUserId();
  await syncProfile();

  const normalized = code.trim().toUpperCase();
  if (!normalized) return { ok: false, error: "Enter an invite code." };

  const admin = getAdmin();
  const { data: team } = await admin.database
    .from("teams")
    .select("id")
    .eq("invite_code", normalized)
    .maybeSingle();

  if (!team) return { ok: false, error: "No team found for that invite code." };
  const teamId = (team as { id: string }).id;

  const { data: existing } = await admin.database
    .from("team_members")
    .select("user_id")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!existing) {
    const { error } = await admin.database
      .from("team_members")
      .insert([{ team_id: teamId, user_id: userId, role: "member" }]);
    if (error) return { ok: false, error: "Could not join the team." };
  }

  (await cookies()).set(ACTIVE_TEAM_COOKIE, teamId, ACTIVE_TEAM_COOKIE_OPTS);
  revalidatePath("/dashboard");
  return { ok: true, data: { teamId } };
}

export async function setActiveTeam(teamId: string): Promise<ActionResult> {
  const userId = await requireUserId();
  await requireMembership(userId, teamId);
  (await cookies()).set(ACTIVE_TEAM_COOKIE, teamId, ACTIVE_TEAM_COOKIE_OPTS);
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Returns the plaintext token exactly once — it is never recoverable later. */
export async function generateToken(
  teamId: string,
  name: string
): Promise<ActionResult<{ token: string; prefix: string }>> {
  const userId = await requireUserId();
  await requireMembership(userId, teamId);

  const result = await createCliTokenForUser(userId, teamId, name.trim() || "CLI token");
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/dashboard/settings");
  return { ok: true, data: { token: result.token, prefix: result.prefix } };
}

export async function revokeToken(tokenId: string): Promise<ActionResult> {
  const userId = await requireUserId();
  const admin = getAdmin();

  // A user can only revoke their own tokens.
  const { data: tok } = await admin.database
    .from("cli_tokens")
    .select("id, user_id")
    .eq("id", tokenId)
    .maybeSingle();

  if (!tok || (tok as { user_id: string }).user_id !== userId) {
    return { ok: false, error: "Token not found." };
  }

  await admin.database
    .from("cli_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", tokenId);

  revalidatePath("/dashboard/settings");
  return { ok: true };
}

export async function signOut(): Promise<void> {
  clearAuthCookies(await cookies());
  (await cookies()).delete(ACTIVE_TEAM_COOKIE);
}
