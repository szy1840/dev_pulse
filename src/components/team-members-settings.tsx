"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { LogOut, ShieldCheck, ShieldMinus, UserMinus } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { leaveTeam, removeTeamMember, setMemberRole } from "@/lib/actions";

type MemberRow = {
  userId: string;
  role: string;
  joinedAt: Date;
  name: string | null;
  email: string | null;
  imageUrl: string | null;
};

type ConfirmAction =
  | { type: "remove"; userId: string; name: string }
  | { type: "leave" }
  | { type: "makeAdmin"; userId: string; name: string }
  | { type: "removeAdmin"; userId: string; name: string };

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
  const [confirming, setConfirming] = useState<ConfirmAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isOwner = viewerRole === "owner";
  const canManage = viewerRole === "owner" || viewerRole === "admin";
  const viewer = members.find((m) => m.userId === viewerId);
  const canLeave =
    viewer &&
    (viewer.role !== "owner" ||
      members.filter((m) => m.role === "owner").length > 1);

  function run(action: ConfirmAction) {
    setError(null);
    startTransition(async () => {
      let res: { ok: boolean; error?: string };

      if (action.type === "leave") {
        res = await leaveTeam(teamId);
      } else if (action.type === "remove") {
        res = await removeTeamMember(teamId, action.userId);
      } else if (action.type === "makeAdmin") {
        res = await setMemberRole(teamId, action.userId, "admin");
      } else {
        res = await setMemberRole(teamId, action.userId, "member");
      }

      if (!res.ok) {
        setError(res.error ?? "Something went wrong.");
        setConfirming(null);
        return;
      }

      setConfirming(null);
      if (action.type === "leave") {
        router.push("/dashboard");
      } else {
        router.refresh();
      }
    });
  }

  function memberName(m: MemberRow) {
    return m.name ?? t("members.thisMemberFallback");
  }

  return (
    <div className="space-y-4">
      <div className="divide-y rounded-lg border">
        {members.map((m) => {
          const isSelf = m.userId === viewerId;
          const showRemove = canManage && !isSelf && m.role !== "owner";
          const showMakeAdmin = isOwner && !isSelf && m.role === "member";
          const showRemoveAdmin = isOwner && !isSelf && m.role === "admin";

          return (
            <div key={m.userId} className="flex items-center gap-3 p-3">
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
              <div className="flex shrink-0 gap-1">
                {showMakeAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirming({ type: "makeAdmin", userId: m.userId, name: memberName(m) })}
                  >
                    <ShieldCheck className="h-4 w-4" />
                    {t("members.makeAdmin")}
                  </Button>
                )}
                {showRemoveAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirming({ type: "removeAdmin", userId: m.userId, name: memberName(m) })}
                  >
                    <ShieldMinus className="h-4 w-4" />
                    {t("members.removeAdmin")}
                  </Button>
                )}
                {showRemove && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirming({ type: "remove", userId: m.userId, name: memberName(m) })}
                  >
                    <UserMinus className="h-4 w-4" />
                    {t("members.remove")}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {canLeave && (
        <div className="rounded-lg border border-dashed p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{t("members.leaveDescription")}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirming({ type: "leave" })}
            >
              <LogOut className="h-4 w-4" />
              {t("members.leave")}
            </Button>
          </div>
        </div>
      )}

      {viewer?.role === "owner" && members.filter((m) => m.role === "owner").length === 1 && (
        <p className="text-xs text-muted-foreground">{t("members.onlyOwnerNote")}</p>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Confirm dialog */}
      <Dialog open={confirming !== null} onOpenChange={(open) => { if (!open) setConfirming(null); }}>
        <DialogContent>
          {confirming && <ConfirmDialogBody action={confirming} pending={pending} onCancel={() => setConfirming(null)} onConfirm={() => run(confirming)} t={t} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ConfirmDialogBody({
  action,
  pending,
  onCancel,
  onConfirm,
  t,
}: {
  action: ConfirmAction;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  t: ReturnType<typeof useTranslations<"settings">>;
}) {
  if (action.type === "makeAdmin") {
    return (
      <>
        <DialogHeader>
          <DialogTitle>{t("members.makeAdmin")}</DialogTitle>
          <DialogDescription>{t("members.makeAdminConfirm", { name: action.name })}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" size="sm" disabled={pending} onClick={onCancel}>{t("members.cancel")}</Button>
          <Button size="sm" disabled={pending} onClick={onConfirm}>{t("members.makeAdminConfirmLabel")}</Button>
        </DialogFooter>
      </>
    );
  }

  if (action.type === "removeAdmin") {
    return (
      <>
        <DialogHeader>
          <DialogTitle>{t("members.removeAdmin")}</DialogTitle>
          <DialogDescription>{t("members.removeAdminConfirm", { name: action.name })}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" size="sm" disabled={pending} onClick={onCancel}>{t("members.cancel")}</Button>
          <Button size="sm" disabled={pending} onClick={onConfirm}>{t("members.removeAdminConfirmLabel")}</Button>
        </DialogFooter>
      </>
    );
  }

  if (action.type === "remove") {
    return (
      <>
        <DialogHeader>
          <DialogTitle>{t("members.remove")}</DialogTitle>
          <DialogDescription>{t("members.removeConfirm", { name: action.name })}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" size="sm" disabled={pending} onClick={onCancel}>{t("members.cancel")}</Button>
          <Button variant="destructive" size="sm" disabled={pending} onClick={onConfirm}>{t("members.removeConfirmLabel")}</Button>
        </DialogFooter>
      </>
    );
  }

  // leave
  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("members.leave")}</DialogTitle>
        <DialogDescription>{t("members.leaveConfirmThis")}</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" size="sm" disabled={pending} onClick={onCancel}>{t("members.cancel")}</Button>
        <Button variant="destructive" size="sm" disabled={pending} onClick={onConfirm}>{t("members.leaveConfirmLabel")}</Button>
      </DialogFooter>
    </>
  );
}
