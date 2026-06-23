import { NextResponse } from "next/server";
import { createServerClient, setAuthCookies } from "@insforge/sdk/ssr";
import { getAdmin } from "@/lib/insforge/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const { code, codeVerifier, inviteCode } = (body ?? {}) as {
    code?: string;
    codeVerifier?: string;
    inviteCode?: string;
  };

  if (!code || !codeVerifier) {
    return NextResponse.json({ error: "Missing OAuth code or verifier." }, { status: 400 });
  }

  const client = createServerClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (client.auth as any).exchangeOAuthCode(code, codeVerifier);

  if (error || !data?.accessToken) {
    return NextResponse.json({ error: "OAuth exchange failed. Please try again." }, { status: 401 });
  }

  const userId = data.user?.id as string | undefined;
  if (!userId) {
    return NextResponse.json({ error: "Could not identify user after sign-in." }, { status: 500 });
  }

  const admin = getAdmin();

  // New user = no DevPulse profile row yet (profile is created during onboarding via syncProfile).
  const { data: existingProfile } = await admin.database
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  const isNewUser = !existingProfile;

  if (isNewUser) {
    const requiredCodes = process.env.SIGNUP_INVITE_CODE;
    if (requiredCodes) {
      const valid = requiredCodes.split(",").map((c) => c.trim().toUpperCase());
      const provided = (inviteCode ?? "").trim().toUpperCase();
      if (!provided || !valid.includes(provided)) {
        return NextResponse.json(
          { error: "Invalid or missing invite code. Please go back and enter a valid code." },
          { status: 403 }
        );
      }
    }

    // Pre-create the profile so syncProfile (called during onboarding) can update it.
    const user = data.user as { email?: string; profile?: { name?: string; avatar_url?: string } };
    await admin.database.from("profiles").upsert(
      [
        {
          id: userId,
          email: user.email ?? null,
          name: user.profile?.name ?? user.email ?? null,
          avatar_url: user.profile?.avatar_url ?? null,
          signup_invite_code: (inviteCode ?? "").trim().toUpperCase() || null,
          updated_at: new Date().toISOString(),
        },
      ],
      { onConflict: "id" }
    );
  }

  const response = NextResponse.json({ redirect: isNewUser ? "/onboarding" : "/dashboard" });
  setAuthCookies(response.cookies, {
    accessToken: data.accessToken as string,
    refreshToken: data.refreshToken as string | undefined,
  });
  return response;
}
