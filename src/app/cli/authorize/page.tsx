import Link from "next/link";
import { getTranslations } from "next-intl/server";
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
  const t = await getTranslations("auth");

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-semibold">{t("authorize.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("authorize.subtitle")}
          </p>
        </div>

        {!valid ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
            <p className="font-medium text-destructive">{t("authorize.invalidTitle")}</p>
            <p className="mt-1 text-muted-foreground">
              {t.rich("authorize.invalidBody", {
                code: (c) => <code className="rounded bg-muted px-1">{c}</code>,
              })}
            </p>
          </div>
        ) : !team ? (
          <div className="space-y-4 rounded-lg border p-4 text-sm">
            <p>{t("authorize.needTeam")}</p>
            <Button asChild className="w-full">
              <Link href="/dashboard">{t("authorize.goToDashboard")}</Link>
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
