import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/insforge/admin";
import { getSessionsForSummary } from "@/lib/queries";
import { getTeamPeriodSummary, getUserPeriodSummary } from "@/lib/daily-summary";
import { DEFAULT_TIMEZONE } from "@/lib/timezone";
import { resolveRange, type ViewGranularity } from "@/lib/period";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Calendar periods the overview dashboard can land on; warmed so loads are instant. */
const VIEWS: ViewGranularity[] = ["day", "week", "month"];

/**
 * Pre-generate the current day/week/month summaries for every team so dashboard
 * loads are warm (team summary + each active member's overall line — the exact
 * cache keys the overview page reads). Per-tool member-detail summaries stay lazy.
 *
 * Protect by setting CRON_SECRET and calling with `Authorization: Bearer <secret>`.
 * Schedule via: `npx @insforge/cli schedules create --name "DevPulse summaries"
 *   --cron "30 0 * * *" --url <APP_URL>/api/cron/daily-summaries --method POST
 *   --headers '{"Authorization":"Bearer ${{secrets.CRON_SECRET}}"}'`
 *
 * Note: only DEFAULT_TIMEZONE is warmed; viewers in other timezones still
 * generate lazily on first view (handled gracefully by the page's Suspense).
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
  let teamsDone = 0;
  let usersDone = 0;

  for (const team of teams) {
    for (const view of VIEWS) {
      const range = resolveRange(view, undefined, timeZone);
      const sessions = await getSessionsForSummary(team.id, range);
      if (sessions.length === 0) continue; // empty period → cheap rule-based fallback, leave it lazy

      const activeMembers = new Set(sessions.map((s) => s.userId)).size;
      await getTeamPeriodSummary(team.id, team.name, range, timeZone, sessions, activeMembers);
      teamsDone++;

      // Per active member: overall line for this period.
      const byUser = new Map<string, typeof sessions>();
      for (const s of sessions) {
        const list = byUser.get(s.userId) ?? [];
        list.push(s);
        byUser.set(s.userId, list);
      }
      const userIds = [...byUser.keys()];
      const { data: profileData } = await admin.database
        .from("profiles")
        .select("id, name")
        .in("id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);
      const names = new Map(
        ((profileData as { id: string; name: string | null }[] | null) ?? []).map((p) => [p.id, p.name])
      );

      for (const [userId, userSessions] of byUser) {
        await getUserPeriodSummary(team.id, userId, names.get(userId) ?? "Member", range, timeZone, userSessions);
        usersDone++;
      }
    }
  }

  return NextResponse.json({ ok: true, teamSummaries: teamsDone, userSummaries: usersDone });
}
