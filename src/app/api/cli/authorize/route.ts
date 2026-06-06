import { NextResponse } from "next/server";
import { getCurrentUser, getActiveTeam } from "@/lib/auth";
import { createCliTokenForUser } from "@/lib/create-cli-token";

export const runtime = "nodejs";

const STATE_RE = /^[0-9a-f]{32}$/;

function parsePort(value: unknown): number | null {
  const port = typeof value === "number" ? value : parseInt(String(value ?? ""), 10);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) return null;
  return port;
}

/** Session-authenticated endpoint used by the browser authorize page during `devpulse login`. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { state?: string; port?: number; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const state = body.state?.trim();
  const port = parsePort(body.port);
  if (!state || !STATE_RE.test(state) || port === null) {
    return NextResponse.json({ error: "Invalid authorization request" }, { status: 400 });
  }

  const team = await getActiveTeam(user.id);

  if (!team) {
    return NextResponse.json({ error: "Join or create a team first" }, { status: 400 });
  }

  const name =
    typeof body.name === "string" && body.name.trim()
      ? body.name.trim()
      : "CLI browser login";

  const result = await createCliTokenForUser(user.id, team.id, name);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    token: result.token,
    state,
    port,
    team: { id: team.id, name: team.name },
  });
}
