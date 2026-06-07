import { redirect } from "next/navigation";
import Link from "next/link";
import { Activity } from "lucide-react";
import { syncProfile, getActiveTeam, getMyTeams, getProfileTimezone } from "@/lib/auth";
import { getUserSessionCount } from "@/lib/queries";
import { DashboardNav } from "@/components/dashboard-nav";
import { TeamSwitcher } from "@/components/team-switcher";
import { UserMenu } from "@/components/user-menu";
import { CliSetupBanner } from "@/components/cli-setup-banner";
import { TimezoneBootstrap } from "@/components/timezone-bootstrap";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await syncProfile();
  if (!user) redirect("/sign-in");

  const activeTeam = await getActiveTeam(user.id);
  if (!activeTeam) redirect("/onboarding");

  const myTeams = await getMyTeams(user.id);
  const mySessionCount = await getUserSessionCount(activeTeam.id, user.id);
  const savedTimezone = await getProfileTimezone(user.id);
  const showCliBanner = mySessionCount === 0;

  return (
    <div className="min-h-screen">
      <TimezoneBootstrap savedTimezone={savedTimezone} />
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center gap-4 px-4 sm:px-6">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <Activity className="h-5 w-5" />
            <span className="hidden sm:inline">DevPulse</span>
          </Link>
          <TeamSwitcher teams={myTeams} activeTeamId={activeTeam.id} />
          <div className="ml-auto">
            <UserMenu name={user.name} email={user.email} avatarUrl={user.avatarUrl} />
          </div>
        </div>
        <DashboardNav />
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        {showCliBanner && <CliSetupBanner />}
        {children}
      </main>
    </div>
  );
}
