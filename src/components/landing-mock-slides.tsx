"use client";

import {
  Area, AreaChart, Bar, BarChart, Cell, Pie, PieChart,
  ResponsiveContainer, CartesianGrid, XAxis, YAxis,
} from "recharts";
import {
  Activity, ArrowUpRight, Clock, Cpu, Download,
  GitCommitHorizontal, Layers, Search, Sparkles, Users, Wrench,
} from "lucide-react";

// ─── Chart palette (CSS vars defined in globals.css, resolved at runtime) ────
const C = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

// ─── Fake data ─────────────────────────────────────────────────────────────

const TREND = [
  { d: "9",  s: 72,  t: 210 }, { d: "10", s: 88,  t: 256 },
  { d: "11", s: 105, t: 302 }, { d: "12", s: 95,  t: 278 },
  { d: "13", s: 118, t: 341 }, { d: "14", s: 42,  t: 121 },
  { d: "15", s: 38,  t: 108 }, { d: "16", s: 124, t: 358 },
  { d: "17", s: 138, t: 399 }, { d: "18", s: 131, t: 378 },
  { d: "19", s: 145, t: 419 }, { d: "20", s: 152, t: 437 },
  { d: "21", s: 61,  t: 176 }, { d: "22", s: 184, t: 531 },
];

const SPARK = TREND.map((d) => ({ v: d.t }));

const EN_MEMBERS = [
  { name: "Maya Lin",  role: "Content",    ini: "M", w: 100, s: "1,284", tk: "84K", tm: "24 m", up: true, pct: "+38%" },
  { name: "Ray Chen",  role: "Paid Media", ini: "R", w: 86,  s: "1,102", tk: "62K", tm: "18 m", up: true, pct: "+21%" },
  { name: "Sophie Su", role: "Design",     ini: "S", w: 75,  s: "968",   tk: "91K", tm: "31 m", up: true, pct: "+54%" },
  { name: "Hao Wang",  role: "Strategy",   ini: "H", w: 58,  s: "743",   tk: "47K", tm: "15 m", up: true, pct: "+12%" },
  { name: "Lin Zhou",  role: "Operations", ini: "L", w: 48,  s: "612",   tk: "73K", tm: "22 m", up: true, pct: "+29%" },
];
const ZH_MEMBERS = [
  { name: "林悦", role: "内容组", ini: "林", w: 100, s: "1,284", tk: "84K", tm: "24 分", up: true,  pct: "+38%" },
  { name: "陈睿", role: "投放组", ini: "陈", w: 86,  s: "1,102", tk: "62K", tm: "18 分", up: true,  pct: "+21%" },
  { name: "苏晴", role: "设计组", ini: "苏", w: 75,  s: "968",   tk: "91K", tm: "31 分", up: true,  pct: "+54%" },
  { name: "王浩", role: "策略组", ini: "王", w: 58,  s: "743",   tk: "47K", tm: "15 分", up: true,  pct: "+12%" },
  { name: "周琳", role: "运营组", ini: "周", w: 48,  s: "612",   tk: "73K", tm: "22 分", up: true,  pct: "+29%" },
];
const EN_PROJS = ["content-q2", "ad-research", "design-sys", "strategy-h2", "ops-review"];
const ZH_PROJS = ["内容-Q2",    "投放研究",    "设计系统",   "策略-H2",    "运营复盘"];
const MODELS   = ["claude-3.7-sonnet", "gpt-4o", "claude-3.5-sonnet", "claude-3.7-sonnet", "claude-3.5-sonnet"];

const MODEL_DONUT = [
  { name: "Claude 3.7", value: 52 },
  { name: "Claude 3.5", value: 31 },
  { name: "GPT-4o",     value: 17 },
];
const TOOL_BARS = [
  { name: "Claude Code", value: 44 },
  { name: "Cursor",      value: 28 },
  { name: "OpenClaw",    value: 18 },
  { name: "Other",       value: 10 },
];

// 7-day × 24-hour heatmap grid (Mon–Sun)
const HEAT: number[][] = [
  [0,0,0,0,0,0,0,0,0,2,4,4,3,2,1,3,4,3,2,1,0,0,0,0],
  [0,0,0,0,0,0,0,0,1,3,4,4,3,2,4,4,3,2,2,1,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,3,5,5,4,3,4,5,4,3,2,1,1,0,0,0],
  [0,0,0,0,0,0,0,0,0,2,4,5,4,3,3,4,4,3,1,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,3,4,4,4,3,2,2,2,1,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,1,2,2,1,1,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0],
];
const HEAT_MAX = 5;
const HEAT_DAYS_EN = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const HEAT_DAYS_ZH = ["日","一","二","三","四","五","六"];
const HEAT_TICKS = [0, 6, 12, 18, 23];
const HEAT_BG = [
  "hsl(var(--muted))",
  "hsl(var(--chart-1) / 0.3)",
  "hsl(var(--chart-1) / 0.55)",
  "hsl(var(--chart-1) / 0.8)",
  "hsl(var(--chart-1))",
];

const EN_COMMITS = [
  { sha: "a3f8bc1", subject: "feat: Q2 content templates system", proj: "content-q2", user: "Maya Lin", tk: "284K", tm: "4h 12m", ins: "+412", del: "-38" },
  { sha: "d9e2c04", subject: "feat: ad campaign research pipeline", proj: "ad-research", user: "Ray Chen", tk: "198K", tm: "2h 51m", ins: "+287", del: "-14" },
  { sha: "f1a6d37", subject: "refactor: design system component library", proj: "design-sys", user: "Sophie Su", tk: "156K", tm: "2h 18m", ins: "+534", del: "-201" },
  { sha: "c8b3e90", subject: "docs: H2 strategy deck", proj: "strategy-h2", user: "Hao Wang", tk: "122K", tm: "1h 47m", ins: "+189", del: "-22" },
];
const ZH_COMMITS = [
  { sha: "a3f8bc1", subject: "feat: Q2 内容模板系统", proj: "内容-Q2", user: "林悦", tk: "284K", tm: "4h 12m", ins: "+412", del: "-38" },
  { sha: "d9e2c04", subject: "feat: 投放调研自动化流水线", proj: "投放研究", user: "陈睿", tk: "198K", tm: "2h 51m", ins: "+287", del: "-14" },
  { sha: "f1a6d37", subject: "refactor: 设计系统组件库", proj: "设计系统", user: "苏晴", tk: "156K", tm: "2h 18m", ins: "+534", del: "-201" },
  { sha: "c8b3e90", subject: "docs: H2 策略文档", proj: "策略-H2", user: "王浩", tk: "122K", tm: "1h 47m", ins: "+189", del: "-22" },
];

// ─── Shared primitives ─────────────────────────────────────────────────────

function barColor(i: number) {
  return [C[4], C[2], C[1], "hsl(var(--chart-1) / 0.55)"][i] ?? C[0];
}

// Inlined tiny avatar without the real Avatar component (avoids server deps)
function Avt({ ini, size = "sm" }: { ini: string; size?: "sm" | "md" }) {
  const cls = size === "sm" ? "h-7 w-7 text-[11px]" : "h-8 w-8 text-xs";
  return (
    <span className={`${cls} inline-flex shrink-0 items-center justify-center rounded-full bg-muted font-semibold uppercase text-muted-foreground ring-1 ring-inset ring-border`}>
      {ini.slice(0, 2)}
    </span>
  );
}

function Delta({ up, pct }: { up: boolean; pct: string }) {
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium tabular-nums ${up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600"}`}>
      <ArrowUpRight className="h-3 w-3" />
      {pct}
    </span>
  );
}

// Recharts tiny sparkline (matches the real Sparkline component)
function Spark({ data, color }: { data: { v: number }[]; color: string }) {
  const id = `mock-spark-${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <div className="mt-3 h-9 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#${id})`} isAnimationActive={false} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// Matches ChartCard's header section
function MockChartCard({ icon, title, description, children, action }: {
  icon: React.ReactNode; title: string; description?: string;
  children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            {icon}
          </span>
          <div>
            <p className="text-sm font-semibold leading-none">{title}</p>
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className="px-5 pb-5">{children}</div>
    </div>
  );
}

// Inlined StatCard (matches the real one exactly)
function MockStatCard({ label, value, hint, icon, topColor, spark, pct }: {
  label: string; value: string; hint?: string; icon: React.ReactNode;
  topColor: string; spark: { v: number }[]; pct?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md">
      <span className="absolute inset-x-0 top-0 h-0.5" style={{ background: topColor }} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">{label}</p>
            <div className="flex flex-wrap items-baseline gap-1.5">
              <p className="text-xl font-semibold tracking-tight">{value}</p>
              {pct && <Delta up pct={pct} />}
            </div>
            {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
          </div>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted" style={{ color: topColor }}>
            {icon}
          </div>
        </div>
        <Spark data={spark} color={topColor} />
      </div>
    </div>
  );
}

// ─── Page frame ──────────────────────────────────────────────────────────────

function PageFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full w-full overflow-auto bg-background p-4">
      <div className="space-y-3">{children}</div>
    </div>
  );
}

// ─── 1. Overview ─────────────────────────────────────────────────────────────

export function MockOverview({ locale = "en" }: { locale?: string }) {
  const zh = locale === "zh";
  const spark = SPARK;
  const stats = zh
    ? [
        { label: "会话数",   value: "1,284", hint: "4,081 条消息",   icon: <Activity className="h-4 w-4" />,  topColor: C[3], spark, pct: "+23%" },
        { label: "Token 数", value: "4.2M",  hint: "1.1M 输出",     icon: <Layers className="h-4 w-4" />,    topColor: C[0], spark, pct: "+18%" },
        { label: "活跃成员", value: "12",    hint: "共 15 人",       icon: <Users className="h-4 w-4" />,     topColor: C[2], spark, pct: "+9%" },
        { label: "人均时长", value: "6.4h",  hint: "峰值并发 3",     icon: <Clock className="h-4 w-4" />,     topColor: C[4], spark, pct: "+9%" },
      ]
    : [
        { label: "Sessions",     value: "1,284", hint: "4,081 messages",    icon: <Activity className="h-4 w-4" />, topColor: C[3], spark, pct: "+23%" },
        { label: "Tokens",       value: "4.2M",  hint: "1.1M output",       icon: <Layers className="h-4 w-4" />,   topColor: C[0], spark, pct: "+18%" },
        { label: "Members",      value: "12",    hint: "of 15 in team",     icon: <Users className="h-4 w-4" />,    topColor: C[2], spark, pct: "+9%" },
        { label: "Active time",  value: "6.4h",  hint: "peak concurrency 3",icon: <Clock className="h-4 w-4" />,    topColor: C[4], spark, pct: "+9%" },
      ];

  return (
    <PageFrame>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold">{zh ? "Acme 团队" : "Acme Team"}</h1>
          <p className="text-xs text-muted-foreground">{zh ? "AI 使用概览" : "AI usage overview"}</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border bg-card px-3 py-1.5 text-xs font-medium">
          {zh ? "本周" : "This week"}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="ml-1"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {stats.map((s) => (
          <MockStatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Activity trend */}
      <MockChartCard
        icon={<Activity className="h-4 w-4" />}
        title={zh ? "活跃趋势" : "Activity trend"}
        description={zh ? "过去 14 天 · 按天统计" : "Past 14 days · daily"}
      >
        <div className="flex justify-end gap-1 pb-2">
          <div className="flex items-center rounded-lg border p-0.5 text-xs">
            <span className="rounded-md bg-primary px-2 py-0.5 text-primary-foreground font-medium">
              {zh ? "Token" : "Tokens"}
            </span>
            <span className="px-2 py-0.5 text-muted-foreground">{zh ? "会话" : "Sessions"}</span>
          </div>
        </div>
        <div className="h-[110px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={TREND} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
              <defs>
                <linearGradient id="mgrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C[0]} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={C[0]} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="d" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval={3} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={28} />
              <Area type="monotone" dataKey="t" stroke={C[0]} strokeWidth={2} fill="url(#mgrad)" isAnimationActive={false} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </MockChartCard>
    </PageFrame>
  );
}

// ─── 2. Leaderboard ──────────────────────────────────────────────────────────

export function MockLeaderboard({ locale = "en" }: { locale?: string }) {
  const zh = locale === "zh";
  const members = zh ? ZH_MEMBERS : EN_MEMBERS;
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <PageFrame>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold">{zh ? "Acme 团队" : "Acme Team"}</h1>
          <p className="text-xs text-muted-foreground">{zh ? "成员排行榜" : "Member leaderboard"}</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border bg-card px-3 py-1.5 text-xs font-medium">
          {zh ? "本周" : "This week"}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-xl border bg-card">
        <span className="absolute inset-x-0 top-0 h-0.5" style={{ background: `linear-gradient(90deg, ${C[4]}, ${C[2]}, ${C[1]})` }} />
        <div className="p-4">
          <div className="mb-3 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400/20 text-lg ring-1 ring-inset ring-amber-400/20">🏆</span>
            <div>
              <p className="text-sm font-semibold">{zh ? "AI 使用排行榜" : "AI Leaderboard"}</p>
              <p className="text-xs text-muted-foreground">{zh ? "本周 · 按会话数排名" : "This week · ranked by sessions"}</p>
            </div>
          </div>

          {/* Column headers */}
          <div className="mb-1 hidden items-center gap-3 px-2 pb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:flex">
            <span className="w-6 shrink-0" />
            <span className="w-7 shrink-0" />
            <span className="flex-1">{zh ? "成员" : "Member"}</span>
            <span className="w-14 shrink-0 text-right">{zh ? "会话" : "Sessions"}</span>
            <span className="w-14 shrink-0 text-right">{zh ? "Token" : "Tokens"}</span>
            <span className="w-14 shrink-0 text-right">{zh ? "时长" : "Active"}</span>
          </div>

          <ol className="space-y-0.5">
            {members.map((m, i) => (
              <li key={m.name} className={`flex items-center gap-3 rounded-lg px-2 py-2 ${i === 0 ? "bg-amber-500/5" : "hover:bg-muted/50"}`}>
                <span className={`w-6 shrink-0 text-center ${i < 3 ? "text-base leading-none" : "text-xs font-semibold text-muted-foreground"}`}>
                  {medals[i] ?? `#${i + 1}`}
                </span>
                <Avt ini={m.ini} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{m.name}</p>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full" style={{ width: `${m.w}%`, background: barColor(i) }} />
                  </div>
                </div>
                <div className="w-14 shrink-0 text-right text-xs font-semibold tabular-nums">{m.s}</div>
                <div className="hidden w-14 shrink-0 text-right text-xs tabular-nums text-muted-foreground sm:block">{m.tk}</div>
                <div className="hidden w-14 shrink-0 text-right text-xs tabular-nums text-muted-foreground sm:block">{m.tm}</div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </PageFrame>
  );
}

// ─── 3. Summary ──────────────────────────────────────────────────────────────

export function MockSummary({ locale = "en" }: { locale?: string }) {
  const zh = locale === "zh";
  const members = zh ? ZH_MEMBERS : EN_MEMBERS;

  const teamText = zh
    ? "本周团队共完成 1,284 次 AI 会话，较上周增长 23%，创单周历史新高。内容组以 1,284 次会话领跑，苏晴个人涨幅最高达 54%，主要集中在设计系统评审和组件文档自动化两个方向。最热门使用场景为 Q2 内容排期、投放受众分析和设计系统重构，三项合计占全团队 Token 消耗的 67%。人均日活跃时长从上周的 5.8 小时提升至 6.4 小时，团队整体 AI 使用深度持续加深。"
    : "The team completed 1,284 AI sessions this week, up 23% from last week and a new single-week record. Content led in volume, while Sophie Su posted the strongest individual growth at +54%, driven by design system reviews and automated component documentation. Top use cases were Q2 content planning, ad audience analysis, and design system refactoring — together accounting for 67% of total token spend. Average active time per person rose from 5.8 h to 6.4 h/day, reflecting deeper, more sustained AI engagement across the board.";

  const memberTexts = zh
    ? [
        "完成 Q2 内容排期全周期，产出 12 套可复用的内容模板并同步至团队知识库。本周重点在小红书选题和短视频脚本两条流水线，利用 AI 将单篇内容的生产周期从 3 天压缩至半天。",
        "主导三个投放产品的市场调研，使用 AI 生成 8 份受众分析简报，覆盖竞品对比、人群画像和渠道建议，交付效率较上月提升 2 倍。",
      ]
    : [
        "Completed the full Q2 content calendar cycle, producing 12 reusable templates now shared with the whole team. Focused this week on Little Red Book topic selection and short-video scripting pipelines, cutting per-piece production time from 3 days to half a day with AI.",
        "Led market research for three ad products, using AI to generate 8 audience briefs covering competitive analysis, audience personas, and channel recommendations — delivering at 2× the speed compared to last month.",
      ];

  return (
    <PageFrame>
      <div className="relative overflow-hidden rounded-xl border bg-card shadow-sm">
        <span className="absolute inset-x-0 top-0 h-0.5" style={{ background: `linear-gradient(90deg, ${C[1]}, ${C[2]}, ${C[3]})` }} />
        <div className="p-5">
          <div className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/12 via-sky-500/10 to-transparent text-violet-600 ring-1 ring-inset ring-violet-500/15 dark:text-violet-300">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1 space-y-2.5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold">{zh ? "本周团队摘要" : "This week's team summary"}</h2>
                  <p className="text-xs text-muted-foreground">Jun 16–22, 2025 · {zh ? "Acme 团队" : "Acme Team"}</p>
                </div>
                <div className="flex gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] tabular-nums">
                    <Activity className="h-3 w-3 opacity-70" />
                    1,284 {zh ? "次会话" : "sessions"}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] tabular-nums">
                    <Users className="h-3 w-3 opacity-70" />
                    12 {zh ? "活跃" : "active"}
                  </span>
                </div>
              </div>
              <p className="text-[13px] leading-relaxed text-foreground/90">{teamText}</p>
            </div>
          </div>

          {/* Member rows */}
          <div className="mt-4 space-y-3 border-t border-border/60 pt-4">
            <p className="text-xs font-medium text-muted-foreground">{zh ? "按成员" : "By member"} ({members.length})</p>
            {members.slice(0, 2).map((m, i) => (
              <div key={m.name} className="flex items-start gap-2.5">
                <Avt ini={m.ini} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.s} {zh ? "次会话" : "sessions"}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{memberTexts[i]}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageFrame>
  );
}

// ─── 4. Sessions ─────────────────────────────────────────────────────────────

export function MockSessions({ locale = "en" }: { locale?: string }) {
  const zh = locale === "zh";
  const members = zh ? ZH_MEMBERS : EN_MEMBERS;
  const projs = zh ? ZH_PROJS : EN_PROJS;
  const cols = zh
    ? ["成员", "项目", "模型", "时长", "Token"]
    : ["Member", "Project", "Model", "Duration", "Tokens"];

  return (
    <PageFrame>
      <div className="flex items-center justify-between">
        <h1 className="text-base font-semibold">{zh ? "会话明细" : "Sessions"}</h1>
        <div className="flex items-center gap-2">
          <div className="flex h-8 items-center gap-1.5 rounded-lg border bg-card px-3 text-xs text-muted-foreground">
            <Search className="h-3.5 w-3.5" />
            {zh ? "搜索…" : "Search…"}
          </div>
          <button className="flex h-8 items-center gap-1 rounded-lg border bg-card px-2.5 text-xs">
            <Download className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-1.5">
        {(zh ? ["全部成员", "全部模型", "全部项目"] : ["All members", "All models", "All projects"]).map((f) => (
          <span key={f} className="inline-flex items-center gap-1 rounded-full border bg-card px-2.5 py-1 text-[11px] text-muted-foreground">
            {f}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </span>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        {/* Table header */}
        <div className="grid grid-cols-5 gap-3 border-b bg-muted/40 px-4 py-2.5">
          {cols.map((c) => (
            <div key={c} className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{c}</div>
          ))}
        </div>
        {/* Rows */}
        {members.map((m, i) => (
          <div key={m.name} className="grid grid-cols-5 gap-3 border-b px-4 py-2.5 text-xs last:border-0 hover:bg-muted/40">
            <div className="flex items-center gap-1.5">
              <Avt ini={m.ini} />
              <span className="truncate font-medium">{m.name}</span>
            </div>
            <div className="flex items-center font-mono text-[11px] text-muted-foreground">{projs[i]}</div>
            <div className="flex items-center font-mono text-[11px] text-muted-foreground truncate">{MODELS[i]}</div>
            <div className="flex items-center tabular-nums">{m.tm}</div>
            <div className="flex items-center tabular-nums">{m.tk}</div>
          </div>
        ))}
      </div>
    </PageFrame>
  );
}

// ─── 5. Insights ─────────────────────────────────────────────────────────────

export function MockInsights({ locale = "en" }: { locale?: string }) {
  const zh = locale === "zh";
  const total = MODEL_DONUT.reduce((a, d) => a + d.value, 0);

  return (
    <PageFrame>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold">{zh ? "Acme 团队" : "Acme Team"}</h1>
          <p className="text-xs text-muted-foreground">{zh ? "模型与工具洞察" : "Models & tools insights"}</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border bg-card px-3 py-1.5 text-xs font-medium">{zh ? "本周" : "This week"}</div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {/* Donut */}
        <MockChartCard icon={<Cpu className="h-4 w-4" />} title={zh ? "模型分布" : "Model mix"} description={zh ? "按会话数" : "by sessions"}>
          <div className="flex items-center gap-4">
            <div className="relative h-[120px] w-[120px] shrink-0">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie data={MODEL_DONUT} dataKey="value" innerRadius={36} outerRadius={54} paddingAngle={2} strokeWidth={0} isAnimationActive={false}>
                    {MODEL_DONUT.map((_, i) => <Cell key={i} fill={C[i]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-semibold">{total}</span>
                <span className="text-[10px] text-muted-foreground">{zh ? "次会话" : "sessions"}</span>
              </div>
            </div>
            <ul className="flex-1 space-y-2">
              {MODEL_DONUT.map((d, i) => (
                <li key={d.name} className="flex items-center gap-2 text-xs">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: C[i] }} />
                  <span className="flex-1 truncate">{d.name}</span>
                  <span className="tabular-nums text-muted-foreground">{d.value} · {d.value}%</span>
                </li>
              ))}
            </ul>
          </div>
        </MockChartCard>

        {/* Bar list */}
        <MockChartCard icon={<Wrench className="h-4 w-4" />} title={zh ? "工具分布" : "Tool breakdown"} description={zh ? "按会话数" : "by sessions"}>
          <div className="h-[120px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={TOOL_BARS} layout="vertical" margin={{ top: 0, right: 32, bottom: 0, left: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                <Bar dataKey="value" radius={[3, 3, 3, 3]} isAnimationActive={false}
                  label={{ position: "right", fontSize: 10, fill: "hsl(var(--muted-foreground))", formatter: (v: unknown) => `${v}` }}>
                  {TOOL_BARS.map((_, i) => <Cell key={i} fill={C[i % C.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </MockChartCard>
      </div>
    </PageFrame>
  );
}

// ─── 6. Active Hours ─────────────────────────────────────────────────────────

export function MockHeatmap({ locale = "en" }: { locale?: string }) {
  const zh = locale === "zh";
  const DAYS = zh ? HEAT_DAYS_ZH : HEAT_DAYS_EN;

  function intensity(v: number) {
    if (v === 0) return 0;
    return Math.min(4, Math.ceil((v / HEAT_MAX) * 4));
  }

  return (
    <PageFrame>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold">{zh ? "Acme 团队" : "Acme Team"}</h1>
          <p className="text-xs text-muted-foreground">{zh ? "活跃时段热力图" : "Active hours heatmap"}</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border bg-card px-3 py-1.5 text-xs font-medium">{zh ? "本周" : "This week"}</div>
      </div>

      <MockChartCard
        icon={<Clock className="h-4 w-4" />}
        title={zh ? "活跃时段" : "Active hours"}
        description={zh ? "按星期和小时" : "by day and hour"}
      >
        <div className="overflow-x-auto">
          <div className="min-w-[440px] space-y-2">
            {HEAT.map((row, day) => (
              <div key={day} className="flex items-center gap-1">
                <span className="w-8 shrink-0 text-right text-[10px] text-muted-foreground">{DAYS[day]}</span>
                <div className="flex flex-1 gap-1">
                  {row.map((v, hour) => (
                    <div
                      key={hour}
                      title={`${DAYS[day]} ${hour}:00 — ${v}`}
                      className="aspect-square flex-1 rounded-[3px] transition-transform hover:scale-125"
                      style={{ background: HEAT_BG[intensity(v)] }}
                    />
                  ))}
                </div>
              </div>
            ))}
            <div className="flex items-center gap-1 pl-9">
              {Array.from({ length: 24 }).map((_, h) => (
                <span key={h} className="flex-1 text-center text-[9px] text-muted-foreground">
                  {HEAT_TICKS.includes(h) ? String(h).padStart(2, "0") : ""}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground">
          <span>{zh ? "少" : "less"}</span>
          {HEAT_BG.map((c, i) => (
            <span key={i} className="h-3 w-3 rounded-[3px]" style={{ background: c }} />
          ))}
          <span>{zh ? "多" : "more"}</span>
        </div>
      </MockChartCard>
    </PageFrame>
  );
}

// ─── 7. ROI ──────────────────────────────────────────────────────────────────

export function MockROI({ locale = "en" }: { locale?: string }) {
  const zh = locale === "zh";
  const commits = zh ? ZH_COMMITS : EN_COMMITS;

  return (
    <PageFrame>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold">{zh ? "Acme 团队" : "Acme Team"}</h1>
          <p className="text-xs text-muted-foreground">{zh ? "AI 投入产出归因" : "AI spend attribution"}</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border bg-card px-3 py-1.5 text-xs font-medium">{zh ? "本周" : "This week"}</div>
      </div>

      <MockChartCard
        icon={<GitCommitHorizontal className="h-4 w-4" />}
        title={zh ? "每次提交消耗了多少 AI" : "AI cost per shipped commit"}
        description={zh ? "已归因的 Token 和活跃时长" : "attributed tokens and active time per commit"}
        action={
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            84% {zh ? "已归因" : "attributed"}
          </span>
        }
      >
        <div className="space-y-1">
          {commits.map((c) => (
            <div key={c.sha} className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-muted/50">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium">{c.subject}</p>
                <p className="text-[11px] text-muted-foreground">
                  <span className="font-mono">{c.sha.slice(0, 8)}</span>
                  {" · "}{c.proj}
                  {" · "}{c.user}
                  {" · "}<span className="text-emerald-600 dark:text-emerald-500">{c.ins}</span>
                  <span className="text-red-600"> / {c.del}</span>
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs font-semibold tabular-nums">
                  {c.tk}
                  <span className="ml-1 text-[10px] font-normal text-muted-foreground">tok</span>
                </p>
                <p className="text-[11px] text-muted-foreground tabular-nums">{c.tm}</p>
              </div>
            </div>
          ))}
        </div>
      </MockChartCard>
    </PageFrame>
  );
}
