import Link from "next/link";
import { requireUserId, getActiveTeam } from "@/lib/auth";
import { CliAuthorizeForm } from "@/components/cli-authorize-form";
import { Button } from "@/components/ui/button";

const STATE_RE = /^[0-9a-f]{32}$/;

function parsePort(value: string | undefined): number | null {
  const port = parseInt(value ?? "", 10);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) return null;
  return port;
}

export default async function CliAuthorizePage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; port?: string; hostname?: string }>;
}) {
  const { state, port: portRaw, hostname } = await searchParams;
  const port = parsePort(portRaw);
  const valid = Boolean(state && STATE_RE.test(state) && port !== null);

  const userId = await requireUserId();
  const team = await getActiveTeam(userId);

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-semibold">Authorize DevPulse CLI</h1>
          <p className="text-sm text-muted-foreground">
            Approve access so your terminal can sync AI coding sessions.
          </p>
        </div>

        {!valid ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
            <p className="font-medium text-destructive">Invalid login link</p>
            <p className="mt-1 text-muted-foreground">
              Run <code className="rounded bg-muted px-1">devpulse login</code> in your terminal
              to open a fresh authorization page.
            </p>
          </div>
        ) : !team ? (
          <div className="space-y-4 rounded-lg border p-4 text-sm">
            <p>You need to join or create a team before connecting the CLI.</p>
            <Button asChild className="w-full">
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
          </div>
        ) : (
          <CliAuthorizeForm
            state={state!}
            port={port!}
            hostname={hostname?.trim() || "my-laptop"}
            teamName={team.name}
          />
        )}
      </div>
    </div>
  );
}
