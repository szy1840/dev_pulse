"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ActivityHeatmap } from "@/components/charts/activity-heatmap";
import type { HeatmapData, MemberHeatmap } from "@/lib/queries";
import { cn } from "@/lib/utils";

const TEAM = "__team__";

export function ActivityHeatmapPanel({
  team,
  members,
}: {
  team: HeatmapData;
  members: MemberHeatmap[];
}) {
  const t = useTranslations("charts");
  const [selected, setSelected] = useState(TEAM);
  const showSelector = members.length > 0;

  const options = useMemo(
    () => [{ id: TEAM, name: t("heatmap.allTeam") }, ...members.map((m) => ({ id: m.memberId, name: m.name }))],
    [members, t]
  );

  const active = useMemo(() => {
    if (selected === TEAM) return team;
    return members.find((m) => m.memberId === selected) ?? team;
  }, [selected, team, members]);

  return (
    <div className="space-y-4">
      {showSelector && (
        <div className="flex justify-end overflow-x-auto">
          <div className="inline-flex shrink-0 rounded-lg border p-0.5">
            {options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelected(opt.id)}
                className={cn(
                  "whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-colors",
                  selected === opt.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {opt.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <ActivityHeatmap grid={active.grid} max={active.max} />
    </div>
  );
}
