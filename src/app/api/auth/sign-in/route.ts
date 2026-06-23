import { NextResponse } from "next/server";
import { createServerClient, setAuthCookies } from "@insforge/sdk/ssr";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.email || !body?.password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const client = createServerClient();
  const { data, error } = await client.auth.signInWithPassword({
    email: body.email,
    password: body.password,
  });

  if (error || !data?.accessToken) {
    const msg = error?.message ?? "";
    if (msg.toLowerCase().includes("verification") || msg.toLowerCase().includes("verified")) {
      return NextResponse.json({ requireEmailVerification: true }, { status: 200 });
    }
    return NextResponse.json(
      { error: msg || "Sign in failed", code: error?.error },
      { status: error?.statusCode ?? 401 }
    );
  }

  const response = NextResponse.json({ user: data.user });
  setAuthCookies(response.cookies, {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
  });
  return response;
}
