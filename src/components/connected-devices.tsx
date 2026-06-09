"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { format } from "date-fns";
import { Laptop, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { revokeToken } from "@/lib/actions";

type DeviceRow = {
  id: string;
  name: string;
  prefix: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
};

export function ConnectedDevices({ devices }: { devices: DeviceRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const active = devices.filter((d) => !d.revokedAt);
  const revoked = devices.filter((d) => d.revokedAt);

  function revoke(id: string) {
    startTransition(async () => {
      await revokeToken(id);
      router.refresh();
    });
  }

  if (devices.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center">
        <Laptop className="mx-auto h-8 w-8 text-muted-foreground/60" />
        <p className="mt-3 text-sm font-medium">No devices connected yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Run <code className="rounded bg-muted px-1">devpulse login</code> on your machine — your
          browser will open to authorize this computer.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="divide-y rounded-lg border">
        {active.map((d) => (
          <DeviceRow key={d.id} device={d} pending={pending} onRevoke={revoke} />
        ))}
        {active.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">No active devices.</p>
        )}
      </div>

      {revoked.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Revoked
          </p>
          <div className="divide-y rounded-lg border opacity-60">
            {revoked.map((d) => (
              <DeviceRow key={d.id} device={d} pending={pending} onRevoke={revoke} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DeviceRow({
  device,
  pending,
  onRevoke,
}: {
  device: DeviceRow;
  pending: boolean;
  onRevoke: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 p-3">
      <Laptop className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{device.name}</span>
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{device.prefix}…</code>
          {device.revokedAt && <Badge variant="destructive">Revoked</Badge>}
        </div>
        <p className="text-xs text-muted-foreground">
          Connected {format(new Date(device.createdAt), "MMM d, yyyy")}
          {device.lastUsedAt
            ? ` · last sync ${format(new Date(device.lastUsedAt), "MMM d, HH:mm")}`
            : " · never synced"}
        </p>
      </div>
      {!device.revokedAt && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onRevoke(device.id)}
          disabled={pending}
          aria-label={`Revoke ${device.name}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
