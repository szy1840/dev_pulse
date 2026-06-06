import { NextResponse } from "next/server";
import { createServerClient, setAuthCookies } from "@insforge/sdk/ssr";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.email || !body?.password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const client = createServerClient();
  const { data, error } = await client.auth.signUp({
    email: body.email,
    password: body.password,
    name: body.name || undefined,
  });

  if (error) {
    return NextResponse.json(
      { error: error.message ?? "Sign up failed", code: error.error },
      { status: error.statusCode ?? 400 }
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
