import { NextResponse } from "next/server";
import { createServerClient, setAuthCookies } from "@insforge/sdk/ssr";
import { getAdmin } from "@/lib/insforge/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.email || !body?.password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const requiredCodes = process.env.SIGNUP_INVITE_CODE;
  if (requiredCodes) {
    const valid = requiredCodes.split(",").map((c) => c.trim().toUpperCase());
    const provided = ((body.inviteCode as string) ?? "").trim().toUpperCase();
    if (!provided) {
      return NextResponse.json({ error: "An invite code is required to create an account." }, { status: 403 });
    }
    if (!valid.includes(provided)) {
      return NextResponse.json({ error: "Invalid invite code." }, { status: 403 });
    }
  }

  const client = createServerClient();
  const { data, error } = await client.auth.signUp({
    email: body.email,
    password: body.password,
    name: body.name || undefined,
  });

  if (error) {
    const msg = error.message ?? "";
    // Account exists but email not verified — treat as needing verification instead of an error.
    if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("exists")) {
      return NextResponse.json({ requireEmailVerification: true });
    }
    return NextResponse.json(
      { error: msg || "Sign up failed", code: error.error },
      { status: error.statusCode ?? 400 }
    );
  }

  // Save the invite code used to the user's profile (best-effort).
  const usedCode = ((body.inviteCode as string) ?? "").trim().toUpperCase() || null;
  if (data?.user?.id && usedCode) {
    const admin = getAdmin();
    await admin.database.from("profiles").upsert(
      [{ id: data.user.id, signup_invite_code: usedCode, updated_at: new Date().toISOString() }],
      { onConflict: "id" }
    );
  }

  // Email verification required — client switches to the 6-digit code step.
  if (data?.requireEmailVerification || !data?.accessToken) {
    return NextResponse.json({ requireEmailVerification: true });
  }

  // No verification configured — user is signed in immediately.
  const response = NextResponse.json({ user: data.user, requireEmailVerification: false });
  setAuthCookies(response.cookies, {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
  });
  return response;
}
