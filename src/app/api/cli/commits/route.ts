import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdmin } from "@/lib/insforge/admin";
import { authenticateCliRequest } from "@/lib/cli-auth";

export const runtime = "nodejs";

const commitSchema = z.object({
  repoRootHash: z.string().min(1).max(80),
  sha: z.string().min(7).max(64),
  authorEmail: z.string().max(320),
  authoredAt: z.string().datetime(),
  subject: z.string().max(200).default(""),
  branch: z.string().max(300).nullish(),
  filesChanged: z.number().int().min(0).default(0),
  insertions: z.number().int().min(0).default(0),
  deletions: z.number().int().min(0).default(0),
});

const payloadSchema = z.object({
  commits: z.array(commitSchema).max(5000),
});

export async function POST(req: Request) {
  const principal = await authenticateCliRequest(req);
  if (!principal) {
    return NextResponse.json({ error: "Invalid or revoked token" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { userId, teamId } = principal;
  const incoming = parsed.data.commits;
  if (incoming.length === 0) {
    return NextResponse.json({ ok: true, upserted: 0 });
  }

  // Dedupe within the batch on the conflict key (team, repo, sha) — Postgres
  // rejects an upsert that touches the same key twice.
  const unique = new Map<string, (typeof incoming)[number]>();
  for (const c of incoming) {
    unique.set(`${c.repoRootHash}:${c.sha}`, c);
  }

  const rows = [...unique.values()].map((c) => ({
    team_id: teamId,
    user_id: userId,
    repo_root_hash: c.repoRootHash,
    sha: c.sha,
    author_email: c.authorEmail,
    authored_at: c.authoredAt,
    subject: c.subject,
    branch: c.branch ?? null,
    files_changed: c.filesChanged,
    insertions: c.insertions,
    deletions: c.deletions,
  }));

  const admin = getAdmin();
  const { error } = await admin.database
    .from("commits")
    .upsert(rows, { onConflict: "team_id,repo_root_hash,sha" });

  if (error) {
    console.error("commit upsert failed", error);
    return NextResponse.json({ error: "Failed to store commits" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, upserted: rows.length });
}
