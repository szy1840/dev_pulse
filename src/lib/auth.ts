import { cookies } from "next/headers";
import { createInsForgeServerClient } from "@/lib/insforge/server";
import { getAdmin } from "@/lib/insforge/admin";
import { DEFAULT_TIMEZONE, isValidTimezone } from "@/lib/timezone";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "@/lib/locale";

const ACTIVE_TEAM_COOKIE = "dp_active_team";
export const TIMEZONE_COOKIE = "dp_timezone";

export type AppUser = {
  id: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
};

export type MyTeam = {
  id: string;
  name: string;
  inviteCode: string;
  role: string;
  createdAt: string;
};

/** Resolve the signed-in InsForge user from the request cookies, or null. */
export async function getCurrentUser(): Promise<AppUser | null> {
  let client: Awaited<ReturnType<typeof createInsForgeServerClient>>;
  try {
    client = await createInsForgeServerClient();
  } catch (error) {
    if (
      process.env.NODE_ENV !== "production" &&
      error instanceof Error &&
      error.message.includes("Missing InsForge baseUrl or anonKey")
    ) {
      return null;
    }
    throw error;
  }

  const { data, error } = await client.auth.getCurrentUser();
  if (error || !data?.user) return null;

  const u = data.user;
  const profile = (u.profile ?? {}) as { name?: string; avatar_url?: string };
  return {
    id: u.id,
    email: u.email ?? null,
    name: profile.name ?? u.email ?? null,
    avatarUrl: profile.avatar_url ?? null,
  };
}

export async function requireUserId(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

/**
 * Ensure a `profiles` row exists for the signed-in user and keep the cached
 * display fields fresh. Call from authenticated server entrypoints.
 */
export async function syncProfile(): Promise<AppUser | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const admin = getAdmin();
  const { error } = await admin.database.from("profiles").upsert(
    [
      {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatarUrl,
        updated_at: new Date().toISOString(),
      },
    ],
    { onConflict: "id" }
  );
  if (error) console.error("syncProfile failed", error);

  return user;
}

/** All teams the user belongs to, with their role, oldest first. */
export async function getMyTeams(userId: string): Promise<MyTeam[]> {
  const admin = getAdmin();
  const { data, error } = await admin.database
    .from("team_members")
    .select("role, teams(id, name, invite_code, created_at)")
    .eq("user_id", userId);

  if (error || !data) return [];

  type Row = { role: string; teams: { id: string; name: string; invite_code: string; created_at: string } | null };
  // PostgREST infers the to-one embed as an array type; at runtime it is a single object.
  return (data as unknown as Row[])
    .filter((r) => r.teams)
    .map((r) => ({
      id: r.teams!.id,
      name: r.teams!.name,
      inviteCode: r.teams!.invite_code,
      role: r.role,
      createdAt: r.teams!.created_at,
    }))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** Resolve the user's active team from cookie, falling back to their first team. */
export async function getActiveTeam(userId: string): Promise<MyTeam | null> {
  const myTeams = await getMyTeams(userId);
  if (myTeams.length === 0) return null;

  const preferred = (await cookies()).get(ACTIVE_TEAM_COOKIE)?.value;
  return myTeams.find((t) => t.id === preferred) ?? myTeams[0];
}

/** Throw unless the user is a member of the given team; returns their role. */
export async function requireMembership(userId: string, teamId: string): Promise<string> {
  const admin = getAdmin();
  const { data, error } = await admin.database
    .from("team_members")
    .select("role")
    .eq("user_id", userId)
    .eq("team_id", teamId)
    .maybeSingle();

  if (error || !data) throw new Error("Not a member of this team");
  return (data as { role: string }).role;
}

/** Profile timezone, or null when the user has not chosen one yet. */
export async function getProfileTimezone(userId: string): Promise<string | null> {
  const admin = getAdmin();
  const { data } = await admin.database
    .from("profiles")
    .select("timezone")
    .eq("id", userId)
    .maybeSingle();
  const tz = (data as { timezone: string | null } | null)?.timezone ?? null;
  return tz && isValidTimezone(tz) ? tz : null;
}

/**
 * Timezone for dashboard "today" calculations: saved profile value, then
 * browser cookie from TimezoneBootstrap, then UTC.
 */
export async function getViewerTimezone(userId: string): Promise<string> {
  const saved = await getProfileTimezone(userId);
  if (saved) return saved;

  const cookieTz = (await cookies()).get(TIMEZONE_COOKIE)?.value;
  if (cookieTz && isValidTimezone(cookieTz)) return cookieTz;

  return DEFAULT_TIMEZONE;
}

/** Profile UI language, or null when the user has not chosen one yet. */
export async function getProfileLocale(userId: string): Promise<Locale | null> {
  const admin = getAdmin();
  const { data } = await admin.database
    .from("profiles")
    .select("locale")
    .eq("id", userId)
    .maybeSingle();
  const loc = (data as { locale: string | null } | null)?.locale ?? null;
  return isLocale(loc) ? loc : null;
}

/** Viewer UI language: saved profile value, then locale cookie, then default. */
export async function getViewerLocale(userId: string): Promise<Locale> {
  const saved = await getProfileLocale(userId);
  if (saved) return saved;

  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(cookieLocale)) return cookieLocale;

  return DEFAULT_LOCALE;
}

export { ACTIVE_TEAM_COOKIE };
