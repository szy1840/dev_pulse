import { requireUserId, getActiveTeam, getViewerTimezone } from "@/lib/auth";
import { getMyTokens, getTeamMembers } from "@/lib/queries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InviteCodeCard } from "@/components/invite-code-card";
import { ConnectedDevices } from "@/components/connected-devices";
import { TeamMembersSettings } from "@/components/team-members-settings";
import { CliSetupGuide } from "@/components/cli-setup-guide";
import { TimezoneSettings } from "@/components/timezone-settings";
import { formatTimezoneLabel } from "@/lib/timezone";

export default async function SettingsPage() {
  const userId = await requireUserId();
  const team = await getActiveTeam(userId);
  if (!team) return null;

  const [devices, timeZone, members] = await Promise.all([
    getMyTokens(team.id, userId),
    getViewerTimezone(userId),
    getTeamMembers(team.id),
  ]);

  const activeDeviceCount = devices.filter((d) => !d.revokedAt).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          CLI, devices, team members, timezone, and invites for{" "}
          <span className="font-medium text-foreground">{team.name}</span>.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Connect the CLI</CardTitle>
          <CardDescription>
            Run these commands on each developer machine.{" "}
            <code className="rounded bg-muted px-1">devpulse login</code> opens your browser to
            authorize — no manual tokens needed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CliSetupGuide compact />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Connected devices</CardTitle>
          <CardDescription>
            {activeDeviceCount === 0
              ? "Devices appear here after you run devpulse login on a machine."
              : `${activeDeviceCount} active device${activeDeviceCount === 1 ? "" : "s"} can sync sessions for this team.`}{" "}
            Revoke access if a laptop is lost or replaced.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ConnectedDevices devices={devices} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Timezone</CardTitle>
          <CardDescription>
            Currently using {timeZone} ({formatTimezoneLabel(timeZone)}) for daily summaries and
            &quot;Today&quot; filters.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TimezoneSettings currentTimezone={timeZone} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Team members</CardTitle>
          <CardDescription>
            {members.length} member{members.length === 1 ? "" : "s"} in this team. Removing someone
            only revokes their access — synced sessions stay in team history.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TeamMembersSettings
            teamId={team.id}
            members={members}
            viewerId={userId}
            viewerRole={team.role}
          />
        </CardContent>
      </Card>

      <InviteCodeCard teamName={team.name} inviteCode={team.inviteCode} />
    </div>
  );
}
