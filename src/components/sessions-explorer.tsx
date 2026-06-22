"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatDistanceToNow, format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { isLocale, type Locale } from "@/lib/locale";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Download,
  LayoutGrid,
  Rows3,
  Search,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToolBadge } from "@/components/tool-badge";
import { isUnknownLabel, UnknownValue } from "@/components/unknown-hint";
import { formatCompact, formatDuration, prettyModel, prettyTool } from "@/lib/format";
import { cn } from "@/lib/utils";

export type ExplorerSession = {
  id: string;
  tool: string;
  model: string | null;
  projectName: string | null;
  summary: string | null;
  messageCount: number;
  inputTokens: number;
  outputTokens: number;
  engagedMs: number;
  startedAt: Date | null;
  userName: string | null;
  userImage: string | null;
  intentMessages: {
    index: number;
    occurredAt: Date | null;
    text: string;
    source: string | null;
  }[];
  taskSpans: {
    index: number;
    title: string;
    summary: string | null;
    intent: string | null;
    object: string | null;
    action: string | null;
    outcome: string | null;
    startedAt: Date | null;
    endedAt: Date | null;
    confidence: number | null;
    sourceModel: string | null;
  }[];
};

type SortKey = "when" | "tokens" | "duration" | "messages";
type SortDir = "asc" | "desc";
type ViewMode = "table" | "cards";

const PAGE_SIZE = 25;
const ALL = "__all__";

function FilterSelect({
  value,
  onChange,
  options,
  allLabel,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  allLabel: string;
  ariaLabel: string;
}) {
  if (options.length <= 1) return null;
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-9 rounded-md border border-input bg-background px-2.5 text-sm",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        value !== ALL && "border-primary/40 text-foreground"
      )}
    >
      <option value={ALL}>{allLabel}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function IntentMessagesPreview({
  messages,
}: {
  messages: ExplorerSession["intentMessages"];
}) {
  const t = useTranslations("sessions");
  if (messages.length === 0) return null;
  const shown = messages.slice(0, 6);
  const hidden = messages.length - shown.length;
  return (
    <details className="mt-2 rounded-md border border-border/70 bg-muted/25 px-2 py-1.5 text-xs">
      <summary className="cursor-pointer select-none font-medium text-muted-foreground hover:text-foreground">
        {t("intentMessages", { count: messages.length })}
      </summary>
      <ol className="mt-2 space-y-1.5">
        {shown.map((m) => (
          <li key={`${m.index}:${m.text}`} className="flex gap-2">
            <span className="mt-0.5 w-10 shrink-0 tabular-nums text-muted-foreground">
              {m.occurredAt ? format(m.occurredAt, "HH:mm") : `#${m.index + 1}`}
            </span>
            <span className="line-clamp-2 min-w-0 text-foreground/80" title={m.source ?? undefined}>
              {m.text}
            </span>
          </li>
        ))}
      </ol>
      {hidden > 0 && (
        <div className="mt-1.5 text-muted-foreground">{t("moreCount", { count: hidden })}</div>
      )}
    </details>
  );
}

function TaskSpansPreview({
  tasks,
}: {
  tasks: ExplorerSession["taskSpans"];
}) {
  const t = useTranslations("sessions");
  if (tasks.length === 0) return null;
  const shown = tasks.slice(0, 5);
  const hidden = tasks.length - shown.length;
  return (
    <details className="mt-2 rounded-md border border-primary/20 bg-primary/5 px-2 py-1.5 text-xs">
      <summary className="cursor-pointer select-none font-medium text-foreground hover:text-primary">
        {t("dreamCycle", { count: tasks.length })}
      </summary>
      <ol className="mt-2 space-y-2">
        {shown.map((task) => (
          <li key={`${task.index}:${task.title}`} className="space-y-0.5">
            <div className="flex gap-2">
              <span className="shrink-0 tabular-nums text-muted-foreground">#{task.index + 1}</span>
              <span className="line-clamp-1 min-w-0 font-medium text-foreground">{task.title}</span>
            </div>
            {(task.summary || task.outcome || task.intent) && (
              <div className="line-clamp-2 pl-6 text-muted-foreground">
                {task.summary || task.outcome || task.intent}
              </div>
            )}
          </li>
        ))}
      </ol>
      {hidden > 0 && (
        <div className="mt-1.5 text-muted-foreground">{t("moreCount", { count: hidden })}</div>
      )}
    </details>
  );
}

function SortableHead({
  label,
  sortKey,
  sort,
  dir,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  sort: SortKey;
  dir: SortDir;
  onSort: (k: SortKey) => void;
  className?: string;
}) {
  const active = sort === sortKey;
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex items-center gap-1 transition-colors hover:text-foreground",
          active && "text-foreground"
        )}
      >
        {label}
        {active ? (
          dir === "desc" ? (
            <ArrowDown className="h-3 w-3" />
          ) : (
            <ArrowUp className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </button>
    </TableHead>
  );
}

function exportCsv(rows: ExplorerSession[]) {
  const esc = (v: string | number | null) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = [
    "member",
    "project",
    "summary",
    "agent",
    "model",
    "input_tokens",
    "output_tokens",
    "messages",
    "duration_ms",
    "started_at",
  ];
  const lines = [
    header.join(","),
    ...rows.map((s) =>
      [
        esc(s.userName),
        esc(s.projectName),
        esc(s.summary),
        esc(prettyTool(s.tool)),
        esc(prettyModel(s.model)),
        s.inputTokens,
        s.outputTokens,
        s.messageCount,
        s.engagedMs,
        esc(s.startedAt ? s.startedAt.toISOString() : ""),
      ].join(",")
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `devpulse-sessions-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Interactive session browser: text search, member/agent/model/project filters,
 * sortable columns, table/card display modes, pagination and CSV export.
 * Purely client-side over the rows the server already fetched for the period.
 */
export function SessionsExplorer({
  sessions,
  showMember = true,
}: {
  sessions: ExplorerSession[];
  showMember?: boolean;
}) {
  const t = useTranslations("sessions");
  const rawLocale = useLocale();
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const dateLocale = locale === "zh" ? zhCN : undefined;
  const [query, setQuery] = useState("");
  const [member, setMember] = useState(ALL);
  const [tool, setTool] = useState(ALL);
  const [model, setModel] = useState(ALL);
  const [project, setProject] = useState(ALL);
  const [sort, setSort] = useState<SortKey>("when");
  const [dir, setDir] = useState<SortDir>("desc");
  const [view, setView] = useState<ViewMode>("table");
  const [page, setPage] = useState(0);

  const unknownLabel = t("unknown");
  const facets = useMemo(() => {
    const count = <T,>(map: Map<string, number>, key: string) =>
      map.set(key, (map.get(key) ?? 0) + 1);
    const members = new Map<string, number>();
    const tools = new Map<string, number>();
    const models = new Map<string, number>();
    const projects = new Map<string, number>();
    for (const s of sessions) {
      if (s.userName) count(members, s.userName);
      count(tools, s.tool);
      if (s.model) count(models, s.model);
      if (s.projectName) count(projects, s.projectName);
    }
    const toOptions = (map: Map<string, number>, pretty?: (v: string) => string) =>
      [...map.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([value, n]) => {
          let label = pretty ? pretty(value) : value;
          if (isUnknownLabel(label)) label = unknownLabel;
          return { value, label: `${label} (${n})` };
        });
    return {
      members: toOptions(members),
      tools: toOptions(tools, prettyTool),
      models: toOptions(models, prettyModel),
      projects: toOptions(projects).slice(0, 30),
    };
  }, [sessions, unknownLabel]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = sessions.filter((s) => {
      if (member !== ALL && s.userName !== member) return false;
      if (tool !== ALL && s.tool !== tool) return false;
      if (model !== ALL && s.model !== model) return false;
      if (project !== ALL && s.projectName !== project) return false;
      if (q) {
        const hay = [
          s.summary,
          s.projectName,
          s.userName,
          s.model,
          s.tool,
          s.taskSpans.map((t) => [t.title, t.summary, t.intent, t.object, t.action, t.outcome].filter(Boolean).join(" ")).join(" "),
          s.intentMessages.map((m) => m.text).join(" "),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const sign = dir === "desc" ? -1 : 1;
    const value = (s: ExplorerSession): number => {
      switch (sort) {
        case "tokens":
          return s.inputTokens + s.outputTokens;
        case "duration":
          return s.engagedMs;
        case "messages":
          return s.messageCount;
        case "when":
          return s.startedAt ? s.startedAt.getTime() : 0;
      }
    };
    return rows.sort((a, b) => sign * (value(a) - value(b)));
  }, [sessions, query, member, tool, model, project, sort, dir]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const hasFilters =
    query.trim() !== "" || member !== ALL || tool !== ALL || model !== ALL || project !== ALL;

  function resetFilters() {
    setQuery("");
    setMember(ALL);
    setTool(ALL);
    setModel(ALL);
    setProject(ALL);
    setPage(0);
  }

  function onSort(k: SortKey) {
    if (sort === k) setDir(dir === "desc" ? "asc" : "desc");
    else {
      setSort(k);
      setDir("desc");
    }
    setPage(0);
  }

  const withReset =
    <T,>(setter: (v: T) => void) =>
    (v: T) => {
      setter(v);
      setPage(0);
    };

  if (sessions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          {t.rich("emptyPeriod", {
            code: () => <code className="rounded bg-muted px-1">devpulse sync</code>,
          })}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-5">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder={t("searchPlaceholder")}
              className="h-9 pl-8"
            />
          </div>
          {showMember && (
            <FilterSelect
              value={member}
              onChange={withReset(setMember)}
              options={facets.members}
              allLabel={t("allMembers")}
              ariaLabel={t("filterByMember")}
            />
          )}
          <FilterSelect
            value={tool}
            onChange={withReset(setTool)}
            options={facets.tools}
            allLabel={t("allAgents")}
            ariaLabel={t("filterByAgent")}
          />
          <FilterSelect
            value={model}
            onChange={withReset(setModel)}
            options={facets.models}
            allLabel={t("allModels")}
            ariaLabel={t("filterByModel")}
          />
          <FilterSelect
            value={project}
            onChange={withReset(setProject)}
            options={facets.projects}
            allLabel={t("allProjects")}
            ariaLabel={t("filterByProject")}
          />
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="h-9 gap-1 px-2">
              <X className="h-3.5 w-3.5" />
              {t("clear")}
            </Button>
          )}
          <div className="ml-auto flex items-center gap-2">
            <div className="inline-flex rounded-lg border p-0.5">
              <button
                type="button"
                onClick={() => setView("table")}
                aria-label={t("tableView")}
                className={cn(
                  "rounded-md p-1.5 transition-colors",
                  view === "table"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Rows3 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setView("cards")}
                aria-label={t("cardView")}
                className={cn(
                  "rounded-md p-1.5 transition-colors",
                  view === "cards"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportCsv(filtered)}
              className="h-9 gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              {t("exportCsv")}
            </Button>
          </div>
        </div>

        {/* Results */}
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            {t("noMatch")}
            <button
              type="button"
              onClick={resetFilters}
              className="ml-1.5 font-medium text-foreground underline-offset-2 hover:underline"
            >
              {t("clearFilters")}
            </button>
          </div>
        ) : view === "table" ? (
          <Table>
            <TableHeader>
              <TableRow>
                {showMember && <TableHead>{t("colMember")}</TableHead>}
                <TableHead>{t("colProject")}</TableHead>
                <TableHead className="min-w-[220px]">{t("colSummary")}</TableHead>
                <TableHead className="w-[108px] text-center">{t("colAgent")}</TableHead>
                <TableHead>{t("colModel")}</TableHead>
                <SortableHead
                  label={t("colTokens")}
                  sortKey="tokens"
                  sort={sort}
                  dir={dir}
                  onSort={onSort}
                  className="text-right"
                />
                <SortableHead
                  label={t("colDuration")}
                  sortKey="duration"
                  sort={sort}
                  dir={dir}
                  onSort={onSort}
                  className="text-right"
                />
                <SortableHead
                  label={t("colWhen")}
                  sortKey="when"
                  sort={sort}
                  dir={dir}
                  onSort={onSort}
                  className="text-right"
                />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((s) => {
                const tokens = s.inputTokens + s.outputTokens;
                return (
                  <TableRow key={s.id}>
                    {showMember && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar name={s.userName} imageUrl={s.userImage} className="h-6 w-6" />
                          <span className="whitespace-nowrap text-sm">{s.userName}</span>
                        </div>
                      </TableCell>
                    )}
                    <TableCell className="max-w-[140px]">
                      <span className="text-sm font-medium">
                        {s.projectName ?? <UnknownValue />}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <div className="text-sm leading-snug text-muted-foreground">
                        {s.summary?.trim() || (
                          <span className="italic">{t("noSummary", { count: s.messageCount })}</span>
                        )}
                        <TaskSpansPreview tasks={s.taskSpans} />
                        {s.taskSpans.length === 0 && (
                          <IntentMessagesPreview messages={s.intentMessages} />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <ToolBadge tool={s.tool} />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="whitespace-nowrap">
                        {isUnknownLabel(prettyModel(s.model)) ? <UnknownValue /> : prettyModel(s.model)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatCompact(tokens)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {s.engagedMs > 0 ? formatDuration(s.engagedMs, locale) : "—"}
                    </TableCell>
                    <TableCell
                      className="whitespace-nowrap text-right text-muted-foreground"
                      title={s.startedAt ? format(s.startedAt, "PPpp", { locale: dateLocale }) : undefined}
                    >
                      {s.startedAt ? formatDistanceToNow(s.startedAt, { addSuffix: true, locale: dateLocale }) : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {pageRows.map((s) => {
              const tokens = s.inputTokens + s.outputTokens;
              return (
                <div key={s.id} className="rounded-lg border p-4">
                  <div className="flex items-center gap-2">
                    {showMember && (
                      <>
                        <Avatar name={s.userName} imageUrl={s.userImage} className="h-6 w-6" />
                        <span className="text-sm font-medium">{s.userName}</span>
                        <span className="text-muted-foreground">·</span>
                      </>
                    )}
                    <span className="truncate text-sm font-medium">
                      {s.projectName ?? <UnknownValue />}
                    </span>
                    <span
                      className="ml-auto whitespace-nowrap text-xs text-muted-foreground"
                      title={s.startedAt ? format(s.startedAt, "PPpp", { locale: dateLocale }) : undefined}
                    >
                      {s.startedAt ? formatDistanceToNow(s.startedAt, { addSuffix: true, locale: dateLocale }) : "—"}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-3 text-sm leading-snug text-muted-foreground">
                    {s.summary?.trim() || (
                      <span className="italic">{t("noSummary", { count: s.messageCount })}</span>
                    )}
                  </p>
                  <TaskSpansPreview tasks={s.taskSpans} />
                  {s.taskSpans.length === 0 && (
                    <IntentMessagesPreview messages={s.intentMessages} />
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <ToolBadge tool={s.tool} className="text-xs" />
                    <Badge variant="outline">
                      {isUnknownLabel(prettyModel(s.model)) ? <UnknownValue /> : prettyModel(s.model)}
                    </Badge>
                    <span className="ml-auto tabular-nums">
                      {t("tokensShort", { value: formatCompact(tokens) })}
                      {s.engagedMs > 0 ? ` · ${formatDuration(s.engagedMs, locale)}` : ""}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-sm text-muted-foreground">
            <span className="tabular-nums">
              {t("paginationRange", {
                from: safePage * PAGE_SIZE + 1,
                to: Math.min((safePage + 1) * PAGE_SIZE, filtered.length),
                count: filtered.length,
              })}
              {hasFilters ? t("filteredFrom", { total: sessions.length }) : ""}
            </span>
            {pageCount > 1 && (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage === 0}
                  onClick={() => setPage(safePage - 1)}
                >
                  {t("previous")}
                </Button>
                <span className="px-2 tabular-nums">
                  {safePage + 1} / {pageCount}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage >= pageCount - 1}
                  onClick={() => setPage(safePage + 1)}
                >
                  {t("next")}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
