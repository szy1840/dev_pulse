"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createTeam, joinTeam } from "@/lib/actions";

export function OnboardingForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [teamName, setTeamName] = useState("");
  const [code, setCode] = useState("");

  function handleCreate() {
    setError(null);
    startTransition(async () => {
      const res = await createTeam(teamName);
      if (res.ok) router.push("/onboarding/cli");
      else setError(res.error);
    });
  }

  function handleJoin() {
    setError(null);
    startTransition(async () => {
      const res = await joinTeam(code);
      if (res.ok) router.push("/onboarding/cli");
      else setError(res.error);
    });
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Set up your team</CardTitle>
        <CardDescription>Create a new team or join one with an invite code.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="create">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">Create team</TabsTrigger>
            <TabsTrigger value="join">Join team</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="team-name">Team name</Label>
              <Input
                id="team-name"
                placeholder="Acme Engineering"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <Button className="w-full" onClick={handleCreate} disabled={pending}>
              {pending ? "Creating…" : "Create team"}
            </Button>
          </TabsContent>

          <TabsContent value="join" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-code">Invite code</Label>
              <Input
                id="invite-code"
                placeholder="ABCD2345"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              />
            </div>
            <Button className="w-full" onClick={handleJoin} disabled={pending}>
              {pending ? "Joining…" : "Join team"}
            </Button>
          </TabsContent>
        </Tabs>

        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
