"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { LogOut, UserMinus } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { leaveTeam, removeTeamMember } from "@/lib/actions";

type MemberRow = {
  userId: string;
  role: string;
  joinedAt: Date;
  name: string | null;
  email: string | null;
  imageUrl: string | null;
};

export function TeamMembersSettings({
  teamId,
  members,
  viewerId,
  viewerRole,
}: {
  teamId: string;
  members: MemberRow[];
  viewerId: string;
  viewerRole: string;
}) {
  const t = useTranslations("settings");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState<{ userId: string; action: "remove" | "leave" } | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  const canManage = viewerRole === "owner" || viewerRole === "admin";
  const viewer = members.find((m) => m.userId === viewerId);
  const canLeave =
    viewer &&
    (viewer.role !== "owner" ||
      members.filter((m) => m.role === "owner").length > 1);

  function run(action: "remove" | "leave", targetUserId: string) {
    setError(null);
    startTransition(async () => {
      const res =
        action === "leave"
          ? await leaveTeam(teamId)
          : await removeTeamMember(teamId, targetUserId);

      if (!res.ok) {
        setError(res.error);
        setConfirming(null);
        return;
      }

      setConfirming(null);
      if (action === "leave") {
        router.push("/dashboard");
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="divide-y rounded-lg border">
        {members.map((m) => {
          const isSelf = m.userId === viewerId;
          const showRemove = canManage && !isSelf;
          const isConfirmingRemove =
            confirming?.action === "remove" && confirming.userId === m.userId;

          return (
            <div key={m.userId} className="p-3">
              <div className="flex items-center gap-3">
                <Avatar name={m.name} imageUrl={m.imageUrl} className="h-9 w-9" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium">{m.name ?? t("members.memberFallback")}</span>
                    {m.role === "owner" && <Badge variant="secondary">{t("members.owner")}</Badge>}
                    {m.role === "admin" && <Badge variant="secondary">{t("members.admin")}</Badge>}
                    {isSelf && <Badge variant="outline">{t("members.you")}</Badge>}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {m.email ?? t("members.noEmail")} ·{" "}
                    {t("members.joined", { date: format(new Date(m.joinedAt), "MMM d, yyyy") })}
                  </p>
                </div>
                {showRemove && !isConfirmingRemove && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() => setConfirming({ userId: m.userId, action: "remove" })}
                  >
                    <UserMinus className="h-4 w-4" />
                    {t("members.remove")}
                  </Button>
                )}
              </div>

              {isConfirmingRemove && (
                <ConfirmPanel
                  message={t("members.removeConfirm", {
                    name: m.name ?? t("members.thisMemberFallback"),
                  })}
                  confirmLabel={t("members.removeConfirmLabel")}
                  pending={pending}
                  onCancel={() => setConfirming(null)}
                  onConfirm={() => run("remove", m.userId)}
                />
              )}
            </div>
          );
        })}
      </div>

      {canLeave && (
        <div className="rounded-lg border border-dashed p-4">
          {confirming?.action === "leave" ? (
            <ConfirmPanel
              message={members.length > 1 ? t("members.leaveConfirmThis") : t("members.leaveConfirmThe")}
              confirmLabel={t("members.leaveConfirmLabel")}
              pending={pending}
              onCancel={() => setConfirming(null)}
              onConfirm={() => run("leave", viewerId)}
            />
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">{t("members.leaveDescription")}</p>
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => setConfirming({ userId: viewerId, action: "leave" })}
              >
                <LogOut className="h-4 w-4" />
                {t("members.leave")}
              </Button>
            </div>
          )}
        </div>
      )}

      {viewer?.role === "owner" && members.filter((m) => m.role === "owner").length === 1 && (
        <p className="text-xs text-muted-foreground">{t("members.onlyOwnerNote")}</p>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function ConfirmPanel({
  message,
  confirmLabel,
  pending,
  onCancel,
  onConfirm,
}: {
  message: string;
  confirmLabel: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const t = useTranslations("settings");
  return (
    <div className="mt-3 space-y-3 rounded-md border bg-muted/40 p-3">
      <p className="text-sm text-muted-foreground">{message}</p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="destructive" disabled={pending} onClick={onConfirm}>
          {confirmLabel}
        </Button>
        <Button size="sm" variant="outline" disabled={pending} onClick={onCancel}>
          {t("members.cancel")}
        </Button>
      </div>
    </div>
  );
}
