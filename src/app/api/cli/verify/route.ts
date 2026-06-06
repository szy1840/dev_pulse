import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/insforge/admin";
import { authenticateCliRequest } from "@/lib/cli-auth";

export const runtime = "nodejs";

// `devpulse login` calls this to validate a token and show who/what it maps to.
export async function POST(req: Request) {
  const principal = await authenticateCliRequest(req);
  if (!principal) {
    return NextResponse.json({ error: "Invalid or revoked token" }, { status: 401 });
  }

  const admin = getAdmin();
  const [{ data: user }, { data: team }] = await Promise.all([
    admin.database.from("profiles").select("name, email").eq("id", principal.userId).maybeSingle(),
    admin.database.from("teams").select("name").eq("id", principal.teamId).maybeSingle(),
  ]);

  const u = user as { name: string | null; email: string | null } | null;
  const t = team as { name: string | null } | null;

  return NextResponse.json({
    ok: true,
    user: { id: principal.userId, name: u?.name, email: u?.email },
    team: { id: principal.teamId, name: t?.name },
  });
}
