import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import {
  Building2,
  Clock,
  Globe,
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
import { LanguageSettings } from "@/components/language-settings";
import { SettingsNav } from "@/components/settings-nav";
import { formatTimezoneLabel } from "@/lib/timezone";

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

  const tLang = await getTranslations("language");
  const t = await getTranslations("settings");

  const navGroups = [
    {
      label: t("nav.workspace"),
      sections: [
        { id: "general", label: t("nav.general") },
        { id: "members", label: t("nav.members") },
        { id: "invites", label: t("nav.invites") },
      ],
    },
    {
      label: t("nav.personal"),
      sections: [
        { id: "cli", label: t("nav.cli") },
        { id: "devices", label: t("nav.devices") },
        { id: "timezone", label: t("nav.timezone") },
        { id: "language", label: t("nav.language") },
      ],
    },
  ];

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
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t.rich("subtitle", {
            team: team.name,
            strong: (c) => <span className="font-medium text-foreground">{c}</span>,
          })}
        </p>
      </div>

      <div className="lg:grid lg:grid-cols-[180px_1fr] lg:gap-8">
        <SettingsNav groups={navGroups} />

        <div className="min-w-0 space-y-6">
          <SettingsSection
            id="general"
            title={t("sections.generalTitle")}
            description={t("sections.generalDescription")}
            icon={<Building2 className="h-4 w-4" />}
          >
            <TeamGeneralSettings teamId={team.id} teamName={team.name} canManage={canManage} />
          </SettingsSection>

          <SettingsSection
            id="members"
            title={t("sections.membersTitle")}
            description={t("sections.membersDescription", { count: members.length })}
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
            title={t("sections.invitesTitle")}
            description={t("sections.invitesDescription")}
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
            title={t("sections.cliTitle")}
            description={t.rich("cliSectionDescription", {
              code: (c) => <code className="rounded bg-muted px-1">{c}</code>,
            })}
            icon={<TerminalSquare className="h-4 w-4" />}
          >
            <CliSetupGuide compact />
          </SettingsSection>

          <SettingsSection
            id="devices"
            title={t("sections.devicesTitle")}
            description={
              <>
                {activeDeviceCount === 0
                  ? t("sections.devicesDescriptionEmpty")
                  : t("sections.devicesDescriptionActive", { count: activeDeviceCount })}{" "}
                {t("sections.devicesDescriptionSuffix")}
              </>
            }
            icon={<Laptop className="h-4 w-4" />}
          >
            <ConnectedDevices devices={devices} />
          </SettingsSection>

          <SettingsSection
            id="timezone"
            title={t("sections.timezoneTitle")}
            description={t("sections.timezoneDescription", {
              tz: timeZone,
              label: formatTimezoneLabel(timeZone),
            })}
            icon={<Clock className="h-4 w-4" />}
          >
            <TimezoneSettings currentTimezone={timeZone} />
          </SettingsSection>

          <SettingsSection
            id="language"
            title={tLang("section")}
            description={tLang("sectionDescription")}
            icon={<Globe className="h-4 w-4" />}
          >
            <LanguageSettings />
          </SettingsSection>
        </div>
      </div>
    </div>
  );
}
