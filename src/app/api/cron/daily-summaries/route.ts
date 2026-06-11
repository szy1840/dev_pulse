import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/insforge/admin";
import { getSessionsForSummary } from "@/lib/queries";
import { getTeamDailySummary, getUserDailySummary } from "@/lib/daily-summary";
import { DEFAULT_TIMEZONE } from "@/lib/timezone";
import { resolveRange } from "@/lib/period";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Pre-generate today's summaries for every team so dashboard loads are warm.
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
  const range = resolveRange("day", undefined, timeZone);
  const today = range.anchor;
  let teamsDone = 0;
  let usersDone = 0;

  for (const team of teams) {
    const sessions = await getSessionsForSummary(team.id, range);
    const activeMembers = new Set(sessions.map((s) => s.userId)).size;

    await getTeamDailySummary(team.id, team.name, today, timeZone, sessions, activeMembers);
    teamsDone++;

    // Per active member for the day.
    const byUser = new Map<string, typeof sessions>();
    for (const s of sessions) {
      const list = byUser.get(s.userId) ?? [];
      list.push(s);
      byUser.set(s.userId, list);
    }
    const { data: profileData } = await admin.database
      .from("profiles")
      .select("id, name")
      .in("id", [...byUser.keys()].length ? [...byUser.keys()] : ["00000000-0000-0000-0000-000000000000"]);
    const names = new Map(
      ((profileData as { id: string; name: string | null }[] | null) ?? []).map((p) => [p.id, p.name])
    );

    for (const [userId, userSessions] of byUser) {
      await getUserDailySummary(team.id, userId, names.get(userId) ?? "Member", today, timeZone, userSessions);
      usersDone++;
    }
  }

  return NextResponse.json({ ok: true, teams: teamsDone, users: usersDone, day: today });
}
