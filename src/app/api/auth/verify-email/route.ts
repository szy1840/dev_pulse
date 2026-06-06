import { NextResponse } from "next/server";
import { createServerClient, setAuthCookies } from "@insforge/sdk/ssr";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.email || !body?.otp) {
    return NextResponse.json({ error: "Email and code are required." }, { status: 400 });
  }

  const client = createServerClient();
  const { data, error } = await client.auth.verifyEmail({ email: body.email, otp: body.otp });

  if (error || !data?.accessToken) {
    return NextResponse.json(
      { error: error?.message ?? "Invalid or expired code", code: error?.error },
      { status: error?.statusCode ?? 400 }
    );
  }

  // verifyEmail signs the user in — persist the session as cookies.
  const response = NextResponse.json({ user: data.user });
  setAuthCookies(response.cookies, {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
  });
  return response;
}
