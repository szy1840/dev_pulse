import { NextResponse } from "next/server";
import { createServerClient } from "@insforge/sdk/ssr";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const client = createServerClient();
  const { error } = await client.auth.resendVerificationEmail({ email: body.email });

  if (error) {
    return NextResponse.json({ error: error.message ?? "Failed to resend." }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
