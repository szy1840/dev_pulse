import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { UserMenu } from "@/components/user-menu";
import { LandingShowcase } from "@/components/landing-showcase";
import { getCurrentUser } from "@/lib/auth";
import {
  MockOverview,
  MockLeaderboard,
  MockSummary,
  MockSessions,
  MockInsights,
  MockHeatmap,
  MockROI,
} from "@/components/landing-mock-slides";

const BOARD_ROWS = {
  zh: [
    { rk: "1", nm: "林悦", rl: "内容组", ct: "1,284", up: "↑38%", w: 100, lead: true, color: "#ff9f0a", ini: "林" },
    { rk: "2", nm: "陈睿", rl: "投放组", ct: "1,102", up: "↑21%", w: 86, lead: false, color: "#0066cc", ini: "陈" },
    { rk: "3", nm: "苏晴", rl: "设计组", ct: "968", up: "↑54%", w: 75, lead: false, color: "#ff2d55", ini: "苏" },
    { rk: "4", nm: "王浩", rl: "策略组", ct: "743", up: "↑12%", w: 58, lead: false, color: "#5856d6", ini: "王" },
    { rk: "5", nm: "周琳", rl: "运营组", ct: "612", up: "↑29%", w: 48, lead: false, color: "#34c759", ini: "周" },
  ],
  en: [
    { rk: "1", nm: "Maya Lin", rl: "Content", ct: "1,284", up: "↑38%", w: 100, lead: true, color: "#ff9f0a", ini: "M" },
    { rk: "2", nm: "Ray Chen", rl: "Paid Media", ct: "1,102", up: "↑21%", w: 86, lead: false, color: "#0066cc", ini: "R" },
    { rk: "3", nm: "Sophie Su", rl: "Design", ct: "968", up: "↑54%", w: 75, lead: false, color: "#ff2d55", ini: "S" },
    { rk: "4", nm: "Hao Wang", rl: "Strategy", ct: "743", up: "↑12%", w: 58, lead: false, color: "#5856d6", ini: "H" },
    { rk: "5", nm: "Lin Zhou", rl: "Operations", ct: "612", up: "↑29%", w: 48, lead: false, color: "#34c759", ini: "L" },
  ],
};

export default async function Home() {
  const [user, t, locale] = await Promise.all([
    getCurrentUser(),
    getTranslations("landing"),
    getLocale(),
  ]);

  const rows = BOARD_ROWS[locale as keyof typeof BOARD_ROWS] ?? BOARD_ROWS.en;

  const SLIDES = [
    { tab: t("show.s1tab"), title: t("show.s1t"), desc: t("show.s1d"), component: <MockOverview   locale={locale} /> },
    { tab: t("show.s2tab"), title: t("show.s2t"), desc: t("show.s2d"), component: <MockLeaderboard locale={locale} /> },
    { tab: t("show.s3tab"), title: t("show.s3t"), desc: t("show.s3d"), component: <MockSummary    locale={locale} /> },
    { tab: t("show.s4tab"), title: t("show.s4t"), desc: t("show.s4d"), component: <MockSessions   locale={locale} /> },
    { tab: t("show.s5tab"), title: t("show.s5t"), desc: t("show.s5d"), component: <MockInsights   locale={locale} /> },
    { tab: t("show.s6tab"), title: t("show.s6t"), desc: t("show.s6d"), component: <MockHeatmap    locale={locale} /> },
    { tab: t("show.s7tab"), title: t("show.s7t"), desc: t("show.s7d"), component: <MockROI        locale={locale} /> },
  ];

  const AI_TIPS = locale === "zh"
    ? [
        {
          emoji: "🗂️",
          title: "先给背景，再提问题",
          body: "林悦每次开始内容工作前，先告诉 AI 频道特点、目标人群和本月主题，再提具体问题。这样生成的选题不用大改，本周她用这个方法半小时出了一整月的排期，以前要两天。你可以直接试：把你的项目背景放在对话第一条，然后再开始提问。",
          ini: "林", name: "林悦", role: "内容组", color: "#ff9f0a",
        },
        {
          emoji: "✂️",
          title: "一个任务拆成几个对话",
          body: "陈睿做投放调研时，不把所有问题堆进一个对话，而是分开问：第一个对话做竞品梳理，第二个做受众画像，第三个写文案。每次 AI 的注意力更集中，结果质量明显更好。本周他用这个方法交了 8 份简报，比上周同期快了一倍。",
          ini: "陈", name: "陈睿", role: "投放组", color: "#0066cc",
        },
        {
          emoji: "📋",
          title: "先说标准，再要结果",
          body: "苏晴让 AI 审设计稿之前，会先列出「这个组件要满足哪些条件」，比如对齐规范、无障碍要求、交互反馈。AI 给的反馈直接对应标准，她不用反复追问。本周 34 个组件一次性通过评审，返工少了一半。",
          ini: "苏", name: "苏晴", role: "设计组", color: "#ff2d55",
        },
      ]
    : [
        {
          emoji: "🗂️",
          title: "Context first, then the question",
          body: "Maya Lin starts every content session by telling the AI the channel, the audience, and this month's theme before asking anything specific. The output needs far less editing. This week she used this habit to plan a full month of content in 30 minutes — a task that used to take two days. Try it: put your project background in the first message, then start asking.",
          ini: "M", name: "Maya Lin", role: "Content", color: "#ff9f0a",
        },
        {
          emoji: "✂️",
          title: "One task, one conversation",
          body: "Ray Chen never piles everything into a single chat. For ad research, he runs three separate conversations: one for competitive analysis, one for audience profiling, one for copy. Each session stays focused and the output is sharper. This week he delivered 8 briefs at twice the speed of the week before.",
          ini: "R", name: "Ray Chen", role: "Paid Media", color: "#0066cc",
        },
        {
          emoji: "📋",
          title: "List the criteria before asking for a review",
          body: "Before Sophie Su asks the AI to review a design component, she writes out what it needs to pass: alignment rules, accessibility requirements, interaction states. The feedback maps directly to those criteria so there is no back and forth. This week 34 components cleared review in one round, with half the revisions compared to before.",
          ini: "S", name: "Sophie Su", role: "Design", color: "#ff2d55",
        },
      ];

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-white text-[#1d1d1f]">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-black/[0.09] bg-white/72 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1024px] items-center justify-between px-7 py-0" style={{ height: 52 }}>
          <div className="flex items-center gap-2 text-[17px] font-semibold tracking-[-0.02em]">
            <svg width="23" height="23" viewBox="0 0 32 32" fill="none" className="shrink-0">
              <rect width="32" height="32" rx="8" fill="#0066cc" />
              <path d="M6 16h4l2.5-7 4 14 2.5-7H26" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            DevPulse
          </div>
          <div className="flex items-center gap-3.5">
            <LocaleSwitcher />
            {user ? (
              <UserMenu
                name={user.name}
                email={user.email}
                avatarUrl={user.avatarUrl}
                showDashboardLink
              />
            ) : (
              <>
                <Link href="/sign-in" className="hidden text-sm font-medium text-[#0066cc] hover:underline sm:block">
                  {t("nav.signIn")}
                </Link>
                <Button asChild size="sm" className="rounded-full bg-[#0066cc] hover:bg-[#0071e3]">
                  <Link href="/sign-up">{t("nav.getStarted")}</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="pt-[104px] text-center">
          <div className="mx-auto max-w-[1024px] px-7">
            <div className="mx-auto max-w-[860px]">
              <p className="mb-5 text-[17px] font-medium leading-snug tracking-[-0.01em] text-[#6e6e73]">
                {t("hero.kicker")}
              </p>
              <h1 className="mx-auto mb-6 max-w-[17ch] text-balance text-[clamp(38px,5.2vw,62px)] font-semibold leading-[1.06] tracking-[-0.03em]">
                {t("hero.h1")}
              </h1>
              <p className="mx-auto mb-8 max-w-[40ch] text-balance text-[clamp(18px,2vw,22px)] leading-[1.42] tracking-[-0.01em] text-[#6e6e73]">
                {t("hero.sub")}
              </p>

              <div className="mb-4 flex flex-wrap items-center justify-center gap-6">
                {user ? (
                  <Button asChild size="lg" className="rounded-full bg-[#0066cc] px-7 text-[17px] hover:bg-[#0071e3]">
                    <Link href="/dashboard">{t("hero.goToDashboard")}</Link>
                  </Button>
                ) : (
                  <>
                    <Button asChild size="lg" className="rounded-full bg-[#0066cc] px-7 text-[17px] hover:bg-[#0071e3]">
                      <Link href="/sign-up">{t("hero.cta1")}</Link>
                    </Button>
                    <Link href="#how" className="inline-flex items-center gap-1 text-[17px] font-medium text-[#0066cc] hover:underline">
                      {t("hero.cta2")}
                      <svg width="7" height="11" viewBox="0 0 7 11" fill="none"><path d="M1 1l4.5 4.5L1 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </Link>
                  </>
                )}
              </div>

              <div className="flex flex-wrap justify-center gap-x-6 gap-y-1 text-[13.5px] text-[#86868b]">
                {[t("hero.t1"), t("hero.t2"), t("hero.t3")].map((item, i) => (
                  <span key={i} className="flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-[#86868b]" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* Board mockup */}
            <div className="relative mx-auto mt-16 max-w-[880px] px-1">
              <div className="absolute -z-10 blur-[46px]" style={{ left:"8%",right:"8%",top:"14%",bottom:"-4%", background:"radial-gradient(closest-side,rgba(0,102,204,0.16),transparent 78%)" }} />
              <div className="relative z-10 rounded-3xl border border-black/[0.09] bg-white p-6 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.18),0_8px_24px_-12px_rgba(0,0,0,0.12)]">
                <div className="mb-4 flex items-center justify-between border-b border-black/[0.05] pb-3.5">
                  <div>
                    <div className="text-[15px] font-semibold">{t("board.title")}</div>
                    <div className="mt-0.5 text-[12.5px] text-[#86868b]">{t("board.sub")}</div>
                  </div>
                  <span className="flex items-center gap-1.5 rounded-full bg-[rgba(52,199,89,0.1)] px-2.5 py-1 text-[11.5px] font-semibold text-[#34c759]">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#34c759]" />
                    {t("board.live")}
                  </span>
                </div>

                <div className="divide-y divide-black/[0.05]">
                  {rows.map((row) => (
                    <div
                      key={row.rk}
                      className="flex items-center gap-3.5 rounded-2xl px-2.5 py-3"
                      style={{ background: row.lead ? "rgba(0,102,204,0.045)" : undefined }}
                    >
                      <span className="w-6 shrink-0 text-center font-mono text-[13px] font-semibold text-[#86868b]">
                        {row.lead ? "🥇" : row.rk}
                      </span>
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div
                          className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full text-[14px] font-semibold text-white"
                          style={{ background: row.color }}
                        >
                          {row.ini}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-[15px] font-semibold">{row.nm}</div>
                          <div className="truncate text-[12px] text-[#86868b]">{row.rl}</div>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
                        <div className="hidden sm:block w-[150px]">
                          <div className="mb-1.5 text-right text-[12.5px] text-[#86868b]">
                            <b className="text-[14px] font-semibold text-[#1d1d1f]">{row.ct}</b>{" "}
                            {t("board.unit")}
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-black/[0.07]">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${row.w}%`,
                                background: row.lead ? "#ff9f0a" : "#0066cc",
                              }}
                            />
                          </div>
                        </div>
                        <div className="sm:hidden text-right">
                          <span className="text-[14px] font-semibold text-[#1d1d1f]">{row.ct}</span>
                        </div>
                        <div className="w-[44px] text-right text-[13px] font-semibold text-[#34c759]">
                          {row.up}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3.5 flex items-start gap-3 border-t border-black/[0.05] px-3 pt-3.5">
                  <CheckCircle2 className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[#0066cc]" />
                  <div>
                    <div className="text-[13px] font-semibold">{t("board.ftt")}</div>
                    <div className="text-[12.5px] text-[#6e6e73]">{t("board.ftb")}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Value */}
        <section className="py-[132px]">
          <div className="mx-auto max-w-[1024px] px-7">
            <div className="mx-auto mb-[72px] max-w-[720px] text-center">
              <h2 className="text-[clamp(30px,4vw,46px)] font-semibold leading-[1.08] tracking-[-0.028em]">
                {t("val.title")}
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-x-[72px] gap-y-0 sm:grid-cols-2">
              {[
                {
                  t: t("val.c1t"), b: t("val.c1b"),
                  svg: <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M3 17l5-5 4 4 8-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><circle cx="20" cy="7" r="1.8" fill="currentColor"/></svg>,
                },
                {
                  t: t("val.c2t"), b: t("val.c2b"),
                  svg: <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="13" height="16" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M8 9h6M8 13h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M18 8h3v12a2 2 0 0 1-2 2H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
                },
                {
                  t: t("val.c3t"), b: t("val.c3b"),
                  svg: <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/></svg>,
                },
                {
                  t: t("val.c4t"), b: t("val.c4b"),
                  svg: <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>,
                },
              ].map((feat) => (
                <div key={feat.t} className="border-t border-black/[0.12] py-[34px]">
                  <div className="mb-[18px]">{feat.svg}</div>
                  <h3 className="mb-2.5 text-[23px] font-semibold leading-snug tracking-[-0.02em]">{feat.t}</h3>
                  <p className="max-w-[42ch] text-[16.5px] leading-relaxed text-[#6e6e73]">{feat.b}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Showcase */}
        <section className="border-t border-black/[0.09] py-[132px]" id="showcase">
          <div className="mx-auto max-w-[1024px] px-7">
            <div className="mx-auto mb-[72px] max-w-[720px] text-center">
              <h2 className="text-[clamp(30px,4vw,46px)] font-semibold leading-[1.08] tracking-[-0.028em]">
                {t("show.title")}
              </h2>
              <p className="mt-4 text-[19px] leading-snug tracking-[-0.01em] text-[#6e6e73]">{t("show.sub")}</p>
            </div>
            <LandingShowcase slides={SLIDES} />
          </div>
        </section>

        {/* AI Classroom */}
        <section className="border-t border-black/[0.09] py-[132px]">
          <div className="mx-auto max-w-[1024px] px-7">
            <div className="mx-auto mb-[72px] max-w-[720px] text-center">
              <div className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-[rgba(0,102,204,0.08)] px-3.5 py-1.5 text-[13px] font-semibold text-[#0066cc]">
                ✦ {t("aicls.badge")}
              </div>
              <h2 className="text-[clamp(30px,4vw,46px)] font-semibold leading-[1.08] tracking-[-0.028em]">
                {t("aicls.title")}
              </h2>
              <p className="mt-4 text-[19px] leading-snug tracking-[-0.01em] text-[#6e6e73]">{t("aicls.sub")}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {AI_TIPS.map((tip) => (
                <div
                  key={tip.name}
                  className="flex flex-col rounded-2xl border border-black/[0.08] bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.05)]"
                >
                  <div className="mb-3 text-2xl">{tip.emoji}</div>
                  <h3 className="mb-2 text-[18px] font-semibold leading-snug tracking-[-0.018em]">
                    {tip.title}
                  </h3>
                  <p className="flex-1 text-[15px] leading-relaxed text-[#6e6e73]">{tip.body}</p>
                  <div className="mt-5 flex items-center gap-2.5 border-t border-black/[0.06] pt-4">
                    <div
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                      style={{ background: tip.color }}
                    >
                      {tip.ini}
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold text-[#1d1d1f]">{tip.name}</div>
                      <div className="text-[11px] text-[#86868b]">{tip.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-10 text-center text-[13.5px] text-[#86868b]">{t("aicls.note")}</p>
          </div>
        </section>

        {/* How it works */}
        <section className="border-t border-black/[0.09] py-[132px]" id="how">
          <div className="mx-auto max-w-[1024px] px-7">
            <div className="mx-auto mb-[72px] max-w-[720px] text-center">
              <h2 className="text-[clamp(30px,4vw,46px)] font-semibold leading-[1.08] tracking-[-0.028em]">
                {t("how.title")}
              </h2>
              <p className="mt-4 text-[19px] leading-snug tracking-[-0.01em] text-[#6e6e73]">{t("how.sub")}</p>
            </div>

            <div className="grid gap-0 lg:grid-cols-3">
              {/* Step 1 */}
              <div className="px-0 py-9 lg:py-0 lg:pl-0 lg:pr-[34px]">
                <div className="mb-[18px] font-mono text-[15px] font-semibold text-[#0066cc]">01</div>
                <h3 className="mb-2.5 text-[21px] font-semibold tracking-[-0.02em]">{t("how.s1t")}</h3>
                <p className="mb-[18px] text-[16px] leading-relaxed text-[#6e6e73]">{t("how.s1b")}</p>
                <span className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-[#6e6e73]">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M20 6L9 17l-5-5" stroke="#34c759" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {t("how.s1tag")}
                </span>
                {!user && (
                  <div className="mt-4">
                    <Link href="/sign-up" className="inline-flex items-center gap-1 text-sm font-medium text-[#0066cc] hover:underline">
                      {t("nav.getStarted")} <svg width="7" height="11" viewBox="0 0 7 11" fill="none"><path d="M1 1l4.5 4.5L1 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </Link>
                  </div>
                )}
              </div>

              {/* Step 2 */}
              <div className="border-t border-black/[0.12] px-0 py-9 lg:border-l lg:border-t-0 lg:px-[34px] lg:py-0">
                <div className="mb-[18px] font-mono text-[15px] font-semibold text-[#0066cc]">02</div>
                <h3 className="mb-2.5 text-[21px] font-semibold tracking-[-0.02em]">{t("how.s2t")}</h3>
                <p className="mb-[18px] text-[16px] leading-relaxed text-[#6e6e73]">{t("how.s2b")}</p>
                <div className="rounded-2xl bg-[#f5f5f7] p-4 font-mono text-[12.5px] leading-relaxed text-[#3a3a3c]">
                  <span className="whitespace-pre-wrap break-words">{t("how.prompt")}</span>
                </div>
              </div>

              {/* Step 3 */}
              <div className="border-t border-black/[0.12] px-0 py-9 lg:border-l lg:border-t-0 lg:pl-[34px] lg:pr-0 lg:py-0">
                <div className="mb-[18px] font-mono text-[15px] font-semibold text-[#0066cc]">03</div>
                <h3 className="mb-2.5 text-[21px] font-semibold tracking-[-0.02em]">{t("how.s3t")}</h3>
                <p className="mb-[18px] text-[16px] leading-relaxed text-[#6e6e73]">{t("how.s3b")}</p>
                <span className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-[#6e6e73]">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" fill="#34c759"/></svg>
                  {t("how.s3tag")}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Boss band */}
        <section className="pb-[132px]">
          <div className="mx-auto max-w-[1024px] px-7">
            <div className="grid items-center gap-14 rounded-[30px] bg-black p-[72px] text-left lg:grid-cols-[1.3fr_1fr] max-lg:p-11">
              <div>
                <div className="mb-4 text-[15px] font-semibold text-[#5e9eff]">{t("boss.eyebrow")}</div>
                <h2 className="mb-[18px] text-[clamp(28px,3.4vw,40px)] font-semibold leading-[1.12] tracking-[-0.026em] text-white">
                  {t("boss.title")}
                </h2>
                <p className="text-[19px] leading-relaxed text-[#a1a1a6]">{t("boss.body")}</p>
              </div>
              <div className="border-t border-white/[0.16] pt-9 text-center lg:border-l lg:border-t-0 lg:pl-[52px] lg:pt-0">
                <div className="text-[clamp(52px,8vw,84px)] font-semibold leading-none tracking-[-0.035em] text-white">
                  {t("boss.stat")}
                </div>
                <div className="mt-3.5 text-[15px] leading-snug text-[#a1a1a6]">{t("boss.lab")}</div>
              </div>
            </div>
          </div>
        </section>

        {/* Privacy */}
        <section className="border-t border-black/[0.09] py-[120px]">
          <div className="mx-auto max-w-[1024px] px-7">
            <div className="mx-auto max-w-[680px] text-center">
              <div className="mx-auto mb-[22px] flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[rgba(52,199,89,0.1)]">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M12 2l8 3v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V5l8-3z" stroke="#34c759" strokeWidth="2" strokeLinejoin="round"/><path d="M9 12l2 2 4-4" stroke="#34c759" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <h3 className="mb-3 text-[26px] font-semibold tracking-[-0.022em]">{t("priv.title")}</h3>
              <p className="mx-auto max-w-[46ch] text-[18px] leading-relaxed text-[#6e6e73]">{t("priv.body")}</p>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t border-black/[0.09] py-[140px] text-center">
          <div className="mx-auto max-w-[1024px] px-7">
            <h2 className="mx-auto mb-5 max-w-[16ch] text-balance text-[clamp(34px,5vw,60px)] font-semibold leading-[1.05] tracking-[-0.03em]">
              {t("final.title")}
            </h2>
            <p className="mb-8 text-[20px] text-[#6e6e73]">{t("final.sub")}</p>
            {user ? (
              <Button asChild size="lg" className="rounded-full bg-[#0066cc] px-7 text-[17px] hover:bg-[#0071e3]">
                <Link href="/dashboard">{t("final.goToDashboard")}</Link>
              </Button>
            ) : (
              <Button asChild size="lg" className="rounded-full bg-[#0066cc] px-7 text-[17px] hover:bg-[#0071e3]">
                <Link href="/sign-up">{t("final.cta")}</Link>
              </Button>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-black/[0.09] py-8 text-center text-[13px] text-[#86868b]">
        {t("footer")}
      </footer>
    </div>
  );
}
