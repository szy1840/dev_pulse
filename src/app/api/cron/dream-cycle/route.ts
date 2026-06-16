import { NextResponse } from "next/server";
import { processDreamCycleJobs } from "@/lib/dream-cycle";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Process pending semantic task extraction jobs. Protect by setting CRON_SECRET
 * and calling with `Authorization: Bearer <secret>`.
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") ?? "10");
  const result = await processDreamCycleJobs(Number.isFinite(limit) ? limit : 10);
  return NextResponse.json({ ok: true, ...result });
}
