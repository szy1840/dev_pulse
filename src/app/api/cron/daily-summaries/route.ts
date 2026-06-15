import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/insforge/admin";
import { getSessionsForSummary } from "@/lib/queries";
import { getTeamPeriodSummary, getUserPeriodSummary } from "@/lib/daily-summary";
import { DEFAULT_TIMEZONE } from "@/lib/timezone";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/locale";
import { resolveRange, type ViewGranularity } from "@/lib/period";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Calendar periods the overview dashboard can land on; warmed so loads are instant. */
const VIEWS: ViewGranularity[] = ["day", "week", "month"];

type MemberProfile = { id: string; name: string | null; locale: string | null };

/**
 * Pre-generate the current day/week/month summaries for every team so dashboard
 * loads are warm (team summary + each active member's overall line — the exact
 * cache keys the overview page reads). Per-tool member-detail summaries stay lazy.
 *
 * Summaries are warmed in the languages the team's members have actually chosen
 * (profiles.locale); a team with only English users never pays for Chinese, and
 * vice versa. Unset members fall back to the default locale. Other languages /
 * timezones still generate lazily on first view (handled by the page's Suspense).
 *
 * Protect by setting CRON_SECRET and calling with `Authorization: Bearer <secret>`.
 * Schedule via: `npx @insforge/cli schedules create --name "DevPulse summaries"
 *   --cron "30 0 * * *" --url <APP_URL>/api/cron/daily-summaries --method POST
 *   --headers '{"Authorization":"Bearer ${{secrets.CRON_SECRET}}"}'`
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getAdmin();
  const { data: teamData } = await admin.database.from("teams").select("id, name");
  const teams = (teamData as { id: string; name: string }[] | null) ?? [];

  const timeZone = DEFAULT_TIMEZONE;
  let teamSummaries = 0;
  let userSummaries = 0;

  for (const team of teams) {
    // Roster + each member's chosen language for this team.
    const { data: memberRows } = await admin.database
      .from("team_members")
      .select("user_id")
      .eq("team_id", team.id);
    const memberIds = ((memberRows as { user_id: string }[] | null) ?? []).map((m) => m.user_id);
    if (memberIds.length === 0) continue;

    const { data: profileData } = await admin.database
      .from("profiles")
      .select("id, name, locale")
      .in("id", memberIds);
    const profiles = (profileData as MemberProfile[] | null) ?? [];
    const names = new Map(profiles.map((p) => [p.id, p.name]));

    // Distinct languages actually in use by this team; default when nobody chose one.
    const locales = [...new Set(profiles.map((p) => p.locale).filter(isLocale))] as Locale[];
    if (locales.length === 0) locales.push(DEFAULT_LOCALE);

    for (const view of VIEWS) {
      const range = resolveRange(view, undefined, timeZone);
      const sessions = await getSessionsForSummary(team.id, range);
      if (sessions.length === 0) continue; // empty period → cheap fallback, leave it lazy

      const activeMembers = new Set(sessions.map((s) => s.userId)).size;
      const byUser = new Map<string, typeof sessions>();
      for (const s of sessions) {
        const list = byUser.get(s.userId) ?? [];
        list.push(s);
        byUser.set(s.userId, list);
      }

      for (const locale of locales) {
        await getTeamPeriodSummary(team.id, team.name, range, timeZone, sessions, activeMembers, locale);
        teamSummaries++;

        for (const [userId, userSessions] of byUser) {
          await getUserPeriodSummary(
            team.id,
            userId,
            names.get(userId) ?? "Member",
            range,
            timeZone,
            userSessions,
            locale
          );
          userSummaries++;
        }
      }
    }
  }

  return NextResponse.json({ ok: true, teamSummaries, userSummaries });
}
