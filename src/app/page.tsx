import Link from "next/link";
import { ArrowRight, CheckCircle2, Shield, Zap } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { LandingCopyButton } from "@/components/landing-copy-button";
import { getCurrentUser } from "@/lib/auth";

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
    { tab: t("show.s1tab"), title: t("show.s1t"), desc: t("show.s1d") },
    { tab: t("show.s2tab"), title: t("show.s2t"), desc: t("show.s2d") },
    { tab: t("show.s3tab"), title: t("show.s3t"), desc: t("show.s3d") },
    { tab: t("show.s4tab"), title: t("show.s4t"), desc: t("show.s4d") },
    { tab: t("show.s5tab"), title: t("show.s5t"), desc: t("show.s5d") },
    { tab: t("show.s6tab"), title: t("show.s6t"), desc: t("show.s6d") },
    { tab: t("show.s7tab"), title: t("show.s7t"), desc: t("show.s7d") },
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
              <Button asChild size="sm">
                <Link href="/dashboard">{t("nav.openDashboard")}</Link>
              </Button>
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
                      <ArrowRight className="h-4 w-4" />
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
              <div className="absolute inset-[8%_8%_-4%] -z-10 bg-[radial-gradient(closest-side,rgba(0,102,204,0.16),transparent_78%)] blur-[46px]" />
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
                          <div className="text-[12px] text-[#86868b]">{row.rl}</div>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-4">
                        <div className="w-[150px]">
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
                        <div className="min-w-[48px] text-right text-[13px] font-semibold text-[#34c759]">
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
                { t: t("val.c1t"), b: t("val.c1b"), icon: "M3 17l5-5 4 4 8-9" },
                { t: t("val.c2t"), b: t("val.c2b"), icon: "M3 4h13v16M8 9h6M8 13h4M18 8h3v12a2 2 0 0 1-2 2H9" },
                { t: t("val.c3t"), b: t("val.c3b"), icon: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" },
                { t: t("val.c4t"), b: t("val.c4b"), icon: "M13 2L4 14h6l-1 8 9-12h-6l1-8z" },
              ].map((feat) => (
                <div key={feat.t} className="border-t border-black/[0.12] py-[34px]">
                  <div className="mb-[18px]">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                      <path d={feat.icon} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {SLIDES.map((s, i) => (
                <div key={i} className="rounded-2xl border border-black/[0.09] bg-[#fafafc] p-6">
                  <span className="mb-3 inline-block rounded-full bg-[#0066cc]/10 px-2.5 py-0.5 text-[12px] font-semibold text-[#0066cc]">
                    {s.tab}
                  </span>
                  <h3 className="mb-2 text-[17px] font-semibold leading-snug tracking-[-0.02em]">{s.title}</h3>
                  <p className="text-[14.5px] leading-relaxed text-[#6e6e73]">{s.desc}</p>
                </div>
              ))}
            </div>
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
                      {t("nav.getStarted")} <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                )}
              </div>

              {/* Step 2 */}
              <div className="border-t border-black/[0.12] px-0 py-9 lg:border-l lg:border-t-0 lg:px-[34px] lg:py-0">
                <div className="mb-[18px] font-mono text-[15px] font-semibold text-[#0066cc]">02</div>
                <h3 className="mb-2.5 text-[21px] font-semibold tracking-[-0.02em]">{t("how.s2t")}</h3>
                <p className="mb-[18px] text-[16px] leading-relaxed text-[#6e6e73]">{t("how.s2b")}</p>
                <div className="relative rounded-2xl bg-[#f5f5f7] p-4 pb-[15px] pt-9 font-mono text-[12.5px] leading-relaxed text-[#3a3a3c]">
                  <LandingCopyButton
                    text={t("how.prompt")}
                    label={t("how.copy")}
                    copiedLabel={t("how.copied")}
                  />
                  <span className="whitespace-pre-wrap break-words">{t("how.prompt")}</span>
                </div>
              </div>

              {/* Step 3 */}
              <div className="border-t border-black/[0.12] px-0 py-9 lg:border-l lg:border-t-0 lg:pl-[34px] lg:pr-0 lg:py-0">
                <div className="mb-[18px] font-mono text-[15px] font-semibold text-[#0066cc]">03</div>
                <h3 className="mb-2.5 text-[21px] font-semibold tracking-[-0.02em]">{t("how.s3t")}</h3>
                <p className="mb-[18px] text-[16px] leading-relaxed text-[#6e6e73]">{t("how.s3b")}</p>
                <span className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-[#6e6e73]">
                  <Zap className="h-3.5 w-3.5 fill-[#34c759] text-[#34c759]" />
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
                <Shield className="h-6 w-6 text-[#34c759]" />
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
