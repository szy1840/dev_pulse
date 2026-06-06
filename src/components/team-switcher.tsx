"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { setActiveTeam } from "@/lib/actions";

type TeamOption = { id: string; name: string };

export function TeamSwitcher({
  teams,
  activeTeamId,
}: {
  teams: TeamOption[];
  activeTeamId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const active = teams.find((t) => t.id === activeTeamId);

  function select(teamId: string) {
    if (teamId === activeTeamId) return;
    startTransition(async () => {
      await setActiveTeam(teamId);
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={pending} className="gap-2">
          {active?.name ?? "Select team"}
          <ChevronsUpDown className="h-3.5 w-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {teams.map((team) => (
          <DropdownMenuItem key={team.id} onSelect={() => select(team.id)}>
            <span className="truncate">{team.name}</span>
            {team.id === activeTeamId && <Check className="ml-auto h-4 w-4" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push("/onboarding")}>
          <Plus className="mr-2 h-4 w-4" /> Create or join team
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
