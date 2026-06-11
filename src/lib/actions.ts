"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { clearAuthCookies } from "@insforge/sdk/ssr";
import { getAdmin } from "@/lib/insforge/admin";
import {
  requireUserId,
  syncProfile,
  requireMembership,
  getMyTeams,
  ACTIVE_TEAM_COOKIE,
  TIMEZONE_COOKIE,
} from "@/lib/auth";
import { isValidTimezone } from "@/lib/timezone";
import { newInviteCode } from "@/lib/ids";
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

async function revokeTeamCliTokens(teamId: string, userId: string) {
  const admin = getAdmin();
  await admin.database
    .from("cli_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .is("revoked_at", null);
}

async function countTeamOwners(teamId: string): Promise<number> {
  const admin = getAdmin();
  const { count, error } = await admin.database
    .from("team_members")
    .select("user_id", { count: "exact", head: true })
    .eq("team_id", teamId)
    .eq("role", "owner");
  if (error) return 0;
  return count ?? 0;
}

/** Rename the team. Owners and admins only. */
export async function renameTeam(teamId: string, name: string): Promise<ActionResult> {
  const userId = await requireUserId();
  const role = await requireMembership(userId, teamId);
  if (role !== "owner" && role !== "admin") {
    return { ok: false, error: "Only team owners can rename the team." };
  }

  const trimmed = name.trim();
  if (trimmed.length < 2) return { ok: false, error: "Team name must be at least 2 characters." };
  if (trimmed.length > 64) return { ok: false, error: "Team name must be 64 characters or fewer." };

  const admin = getAdmin();
  const { error } = await admin.database.from("teams").update({ name: trimmed }).eq("id", teamId);
  if (error) return { ok: false, error: "Could not rename the team. Try again." };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  return { ok: true };
}

/** Rotate the invite code so previously shared codes stop working. Owners and admins only. */
export async function regenerateInviteCode(
  teamId: string
): Promise<ActionResult<{ inviteCode: string }>> {
  const userId = await requireUserId();
  const role = await requireMembership(userId, teamId);
  if (role !== "owner" && role !== "admin") {
    return { ok: false, error: "Only team owners can regenerate the invite code." };
  }

  const admin = getAdmin();
  const inviteCode = newInviteCode();
  const { error } = await admin.database
    .from("teams")
    .update({ invite_code: inviteCode })
    .eq("id", teamId);
  if (error) return { ok: false, error: "Could not regenerate the invite code. Try again." };

  revalidatePath("/dashboard/settings");
  return { ok: true, data: { inviteCode } };
}

/** Remove a member from the team. Sessions and profile data are kept. */
export async function removeTeamMember(
  teamId: string,
  targetUserId: string
): Promise<ActionResult> {
  const actorId = await requireUserId();
  const actorRole = await requireMembership(actorId, teamId);

  if (actorRole !== "owner" && actorRole !== "admin") {
    return { ok: false, error: "Only team owners can remove members." };
  }
  if (targetUserId === actorId) {
    return { ok: false, error: "Use “Leave team” to remove yourself." };
  }

  const admin = getAdmin();
  const { data: target } = await admin.database
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (!target) return { ok: false, error: "Member not found." };

  const targetRole = (target as { role: string }).role;
  if (targetRole === "owner") {
    const owners = await countTeamOwners(teamId);
    if (owners <= 1) return { ok: false, error: "Cannot remove the only team owner." };
  }

  const { error } = await admin.database
    .from("team_members")
    .delete()
    .eq("team_id", teamId)
    .eq("user_id", targetUserId);
  if (error) return { ok: false, error: "Could not remove member." };

  await revokeTeamCliTokens(teamId, targetUserId);
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/members");
  return { ok: true };
}

/** Leave the current team. Historical sessions stay with the team. */
export async function leaveTeam(teamId: string): Promise<ActionResult> {
  const userId = await requireUserId();
  const role = await requireMembership(userId, teamId);

  if (role === "owner") {
    const owners = await countTeamOwners(teamId);
    if (owners <= 1) {
      return {
        ok: false,
        error: "You are the only owner. Transfer ownership or remove other members first.",
      };
    }
  }

  const admin = getAdmin();
  const { error } = await admin.database
    .from("team_members")
    .delete()
    .eq("team_id", teamId)
    .eq("user_id", userId);
  if (error) return { ok: false, error: "Could not leave the team." };

  await revokeTeamCliTokens(teamId, userId);

  const cookieStore = await cookies();
  if (cookieStore.get(ACTIVE_TEAM_COOKIE)?.value === teamId) {
    const remaining = (await getMyTeams(userId)).filter((t) => t.id !== teamId);
    if (remaining.length > 0) {
      cookieStore.set(ACTIVE_TEAM_COOKIE, remaining[0].id, ACTIVE_TEAM_COOKIE_OPTS);
    } else {
      cookieStore.delete(ACTIVE_TEAM_COOKIE);
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  return { ok: true };
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
  (await cookies()).delete(TIMEZONE_COOKIE);
}

const TIMEZONE_COOKIE_OPTS = { path: "/", maxAge: 60 * 60 * 24 * 365 };

/** Persist the viewer timezone and refresh dashboard caches. */
export async function updateTimezone(timeZone: string): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!isValidTimezone(timeZone)) return { ok: false, error: "Invalid timezone." };

  const admin = getAdmin();
  const { error } = await admin.database
    .from("profiles")
    .update({ timezone: timeZone, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) return { ok: false, error: "Could not save timezone." };

  (await cookies()).set(TIMEZONE_COOKIE, timeZone, TIMEZONE_COOKIE_OPTS);
  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * Set the timezone cookie on first dashboard visit and save to profile when unset.
 * Called from TimezoneBootstrap on the client.
 */
export async function ensureTimezone(timeZone: string): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!isValidTimezone(timeZone)) return { ok: false, error: "Invalid timezone." };

  (await cookies()).set(TIMEZONE_COOKIE, timeZone, TIMEZONE_COOKIE_OPTS);

  const admin = getAdmin();
  const { data } = await admin.database
    .from("profiles")
    .select("timezone")
    .eq("id", userId)
    .maybeSingle();
  const saved = (data as { timezone: string | null } | null)?.timezone;
  if (saved && isValidTimezone(saved)) return { ok: true };

  const { error } = await admin.database
    .from("profiles")
    .update({ timezone: timeZone, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) return { ok: false, error: "Could not save timezone." };

  revalidatePath("/dashboard");
  return { ok: true };
}
