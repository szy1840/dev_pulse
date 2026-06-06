import { redirect } from "next/navigation";
import Link from "next/link";
import { Activity } from "lucide-react";
import { syncProfile, getActiveTeam, getMyTeams } from "@/lib/auth";
import { DashboardNav } from "@/components/dashboard-nav";
import { TeamSwitcher } from "@/components/team-switcher";
import { UserMenu } from "@/components/user-menu";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await syncProfile();
  if (!user) redirect("/sign-in");

  const activeTeam = await getActiveTeam(user.id);
  if (!activeTeam) redirect("/onboarding");

  const myTeams = await getMyTeams(user.id);

  return (
    <div className="min-h-screen">
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
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
