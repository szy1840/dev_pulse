import type { ReactNode } from "react";
import {
  Building2,
  Clock,
  Laptop,
  TerminalSquare,
  UserPlus,
  Users,
} from "lucide-react";
import { requireUserId, getActiveTeam, getViewerTimezone } from "@/lib/auth";
import { getMyTokens, getTeamMembers } from "@/lib/queries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InviteCodeCard } from "@/components/invite-code-card";
import { ConnectedDevices } from "@/components/connected-devices";
import { TeamMembersSettings } from "@/components/team-members-settings";
import { TeamGeneralSettings } from "@/components/team-general-settings";
import { CliSetupGuide } from "@/components/cli-setup-guide";
import { TimezoneSettings } from "@/components/timezone-settings";
import { SettingsNav } from "@/components/settings-nav";
import { formatTimezoneLabel } from "@/lib/timezone";

const NAV_GROUPS = [
  {
    label: "Workspace",
    sections: [
      { id: "general", label: "General" },
      { id: "members", label: "Members" },
      { id: "invites", label: "Invites" },
    ],
  },
  {
    label: "Personal",
    sections: [
      { id: "cli", label: "CLI setup" },
      { id: "devices", label: "Devices" },
      { id: "timezone", label: "Timezone" },
    ],
  },
];

function SettingsSection({
  id,
  title,
  description,
  icon,
  children,
}: {
  id: string;
  title: string;
  description: ReactNode;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card id={id} className="scroll-mt-32">
      <CardHeader>
        <div className="flex items-start gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            {icon}
          </span>
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription className="mt-0.5">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

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
  const canManage = team.role === "owner" || team.role === "admin";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Workspace and personal settings for{" "}
          <span className="font-medium text-foreground">{team.name}</span>.
        </p>
      </div>

      <div className="lg:grid lg:grid-cols-[180px_1fr] lg:gap-8">
        <SettingsNav groups={NAV_GROUPS} />

        <div className="min-w-0 space-y-6">
          <SettingsSection
            id="general"
            title="General"
            description="The team's name across the dashboard."
            icon={<Building2 className="h-4 w-4" />}
          >
            <TeamGeneralSettings teamId={team.id} teamName={team.name} canManage={canManage} />
          </SettingsSection>

          <SettingsSection
            id="members"
            title="Team members"
            description={
              <>
                {members.length} member{members.length === 1 ? "" : "s"} in this team. Removing
                someone only revokes their access — synced sessions stay in team history.
              </>
            }
            icon={<Users className="h-4 w-4" />}
          >
            <TeamMembersSettings
              teamId={team.id}
              members={members}
              viewerId={userId}
              viewerRole={team.role}
            />
          </SettingsSection>

          <SettingsSection
            id="invites"
            title="Invite teammates"
            description="Anyone with this code can join the team."
            icon={<UserPlus className="h-4 w-4" />}
          >
            <InviteCodeCard
              teamId={team.id}
              teamName={team.name}
              inviteCode={team.inviteCode}
              canManage={canManage}
            />
          </SettingsSection>

          <SettingsSection
            id="cli"
            title="Connect the CLI"
            description={
              <>
                Run these commands on each developer machine.{" "}
                <code className="rounded bg-muted px-1">devpulse login</code> opens your browser to
                authorize — no manual tokens needed.
              </>
            }
            icon={<TerminalSquare className="h-4 w-4" />}
          >
            <CliSetupGuide compact />
          </SettingsSection>

          <SettingsSection
            id="devices"
            title="Connected devices"
            description={
              <>
                {activeDeviceCount === 0
                  ? "Devices appear here after you run devpulse login on a machine."
                  : `${activeDeviceCount} active device${activeDeviceCount === 1 ? "" : "s"} can sync sessions for this team.`}{" "}
                Revoke access if a laptop is lost or replaced.
              </>
            }
            icon={<Laptop className="h-4 w-4" />}
          >
            <ConnectedDevices devices={devices} />
          </SettingsSection>

          <SettingsSection
            id="timezone"
            title="Timezone"
            description={
              <>
                Currently using {timeZone} ({formatTimezoneLabel(timeZone)}) for daily summaries
                and &quot;Today&quot; filters.
              </>
            }
            icon={<Clock className="h-4 w-4" />}
          >
            <TimezoneSettings currentTimezone={timeZone} />
          </SettingsSection>
        </div>
      </div>
    </div>
  );
}
