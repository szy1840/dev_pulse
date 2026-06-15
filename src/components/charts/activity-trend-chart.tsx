"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartSize } from "./chart-size";
import { format, parseISO } from "date-fns";
import { formatCompact, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AXIS_PROPS, colorAt } from "./chart-theme";
import { TooltipCard } from "./chart-tooltip";

export type DailyPoint = {
  date: string;
  sessions: number;
  inputTokens: number;
  outputTokens: number;
  tokens: number;
};

export type MemberSeries = {
  memberId: string;
  name: string;
  data: DailyPoint[];
};

type Metric = "tokens" | "sessions";
type View = "team" | "members";

function formatBucket(d: string, granularity: "day" | "hour"): string {
  try {
    return granularity === "hour" ? format(parseISO(d), "ha") : format(parseISO(d), "MMM d");
  } catch {
    return d;
  }
}

function formatBucketTitle(d: string, granularity: "day" | "hour"): string {
  try {
    return granularity === "hour" ? format(parseISO(d), "h:mm a") : format(parseISO(d), "MMM d, yyyy");
  } catch {
    return d;
  }
}

function ToggleGroup<T extends string>({
  options,
  value,
  onChange,
  labels,
}: {
  options: T[];
  value: T;
  onChange: (v: T) => void;
  labels?: Partial<Record<T, string>>;
}) {
  return (
    <div className="inline-flex rounded-lg border p-0.5 text-xs">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={cn(
            "rounded-md px-2.5 py-1 font-medium capitalize transition-colors",
            value === opt
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {labels?.[opt] ?? opt}
        </button>
      ))}
    </div>
  );
}

export function ActivityTrendChart({
  teamData,
  memberSeries = [],
  granularity = "day",
}: {
  teamData: DailyPoint[];
  memberSeries?: MemberSeries[];
  granularity?: "day" | "hour";
}) {
  const t = useTranslations("charts");
  const [metric, setMetric] = useState<Metric>("tokens");
  const [view, setView] = useState<View>("team");
  const tickStep = Math.max(1, Math.ceil(teamData.length / 8));
  const showMembers = memberSeries.length > 0;

  const memberChartData = useMemo(() => {
    if (!showMembers) return [];
    return teamData.map((row) => {
      const point: Record<string, string | number> = { date: row.date };
      for (const m of memberSeries) {
        const day = m.data.find((d) => d.date === row.date);
        point[m.memberId] = metric === "tokens" ? (day?.tokens ?? 0) : (day?.sessions ?? 0);
      }
      return point;
    });
  }, [teamData, memberSeries, metric, showMembers]);

  const memberColors = useMemo(
    () => new Map(memberSeries.map((m, i) => [m.memberId, colorAt(i)])),
    [memberSeries]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {showMembers && (
          <ToggleGroup
            options={["team", "members"] as View[]}
            value={view}
            onChange={setView}
            labels={{ team: t("trend.team"), members: t("trend.byMember") }}
          />
        )}
        <ToggleGroup
          options={["tokens", "sessions"] as Metric[]}
          value={metric}
          onChange={setMetric}
          labels={{ tokens: t("trend.tokens"), sessions: t("trend.sessions") }}
        />
      </div>

      <ChartSize height={260}>
        {view === "team" || !showMembers ? (
          <AreaChart data={teamData} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
            <defs>
              <linearGradient id="gradInput" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.5} />
                <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradOutput" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={0.5} />
                <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradSessions" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--chart-4))" stopOpacity={0.5} />
                <stop offset="100%" stopColor="hsl(var(--chart-4))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="date"
              {...AXIS_PROPS}
              tickFormatter={(d) => formatBucket(String(d), granularity)}
              interval={tickStep - 1}
              minTickGap={8}
            />
            <YAxis {...AXIS_PROPS} width={44} tickFormatter={(v) => formatCompact(Number(v))} />
            <Tooltip
              cursor={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1, strokeDasharray: "3 3" }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as DailyPoint;
                const rows =
                  metric === "tokens"
                    ? [
                        { label: t("trend.input"), value: formatNumber(p.inputTokens), color: "hsl(var(--chart-1))" },
                        { label: t("trend.output"), value: formatNumber(p.outputTokens), color: "hsl(var(--chart-2))" },
                        { label: t("trend.sessions"), value: formatNumber(p.sessions) },
                      ]
                    : [
                        { label: t("trend.sessions"), value: formatNumber(p.sessions), color: "hsl(var(--chart-4))" },
                        { label: t("trend.tokens"), value: formatNumber(p.tokens) },
                      ];
                return <TooltipCard title={formatBucketTitle(String(label), granularity)} rows={rows} />;
              }}
            />
            {metric === "tokens" ? (
              <>
                <Area
                  type="monotone"
                  dataKey="inputTokens"
                  stackId="t"
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={2}
                  fill="url(#gradInput)"
                />
                <Area
                  type="monotone"
                  dataKey="outputTokens"
                  stackId="t"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  fill="url(#gradOutput)"
                />
              </>
            ) : (
              <Area
                type="monotone"
                dataKey="sessions"
                stroke="hsl(var(--chart-4))"
                strokeWidth={2}
                fill="url(#gradSessions)"
              />
            )}
          </AreaChart>
        ) : (
          <AreaChart data={memberChartData} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="date"
              {...AXIS_PROPS}
              tickFormatter={(d) => formatBucket(String(d), granularity)}
              interval={tickStep - 1}
              minTickGap={8}
            />
            <YAxis {...AXIS_PROPS} width={44} tickFormatter={(v) => formatCompact(Number(v))} />
            <Tooltip
              cursor={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1, strokeDasharray: "3 3" }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const rows = payload
                  .filter((p) => Number(p.value) > 0)
                  .sort((a, b) => Number(b.value) - Number(a.value))
                  .map((p) => {
                    const m = memberSeries.find((s) => s.memberId === p.dataKey);
                    return {
                      label: m?.name ?? String(p.name),
                      value: formatNumber(Number(p.value)),
                      color: memberColors.get(String(p.dataKey)),
                    };
                  });
                return <TooltipCard title={formatBucketTitle(String(label), granularity)} rows={rows} />;
              }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              formatter={(value) => memberSeries.find((m) => m.memberId === value)?.name ?? value}
            />
            {memberSeries.map((m, i) => (
              <Area
                key={m.memberId}
                type="monotone"
                dataKey={m.memberId}
                name={m.memberId}
                stackId="members"
                stroke={colorAt(i)}
                strokeWidth={1.5}
                fill={colorAt(i)}
                fillOpacity={0.35}
              />
            ))}
          </AreaChart>
        )}
      </ChartSize>
    </div>
  );
}
