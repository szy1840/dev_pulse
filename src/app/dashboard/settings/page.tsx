import { requireUserId, getActiveTeam } from "@/lib/auth";
import { getMyTokens } from "@/lib/queries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InviteCodeCard } from "@/components/invite-code-card";
import { TokenManager } from "@/components/token-manager";

export default async function SettingsPage() {
  const userId = await requireUserId();
  const team = await getActiveTeam(userId);
  if (!team) return null;

  const tokens = await getMyTokens(team.id, userId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your team invite and CLI tokens</p>
      </div>

      <InviteCodeCard teamName={team.name} inviteCode={team.inviteCode} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">CLI tokens</CardTitle>
          <CardDescription>
            Browser login creates tokens automatically. You can also generate one manually for CI
            or headless machines, then run{" "}
            <code className="rounded bg-muted px-1">devpulse login --no-browser</code>. Tokens are
            scoped to this team and to you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TokenManager teamId={team.id} tokens={tokens} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Connect the CLI</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-muted-foreground">Run these on each developer&apos;s machine:</p>
          <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-xs leading-relaxed">
{`# install once per machine (Node.js 22+)
npm install -g devpulse-ai

# authenticate (opens your browser)
devpulse login

# or paste a token manually
devpulse login --no-browser

# scan local AI tool logs and upload new sessions
devpulse sync

# check what's configured and what would sync
devpulse status`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
