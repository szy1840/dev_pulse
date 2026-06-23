import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "@/lib/locale";

// One file per surface; merged into a single message tree. Add new namespaces
// here as surfaces are translated.
const MESSAGE_FILES = [
  "core",
  "dashboard",
  "charts",
  "members",
  "sessions",
  "settings",
  "onboarding",
  "auth",
  "landing",
] as const;

async function loadMessages(locale: Locale) {
  const parts = await Promise.all(
    MESSAGE_FILES.map((file) =>
      import(`../messages/${locale}/${file}.json`)
        .then((m) => m.default)
        .catch(() => ({}))
    )
  );
  return Object.assign({}, ...parts);
}

/**
 * Detect a supported locale from the Accept-Language header (e.g.
 * "zh-CN,zh;q=0.9,en;q=0.8"). Returns the first supported match in browser
 * priority order, or null if none match.
 */
function detectFromAcceptLanguage(header: string | null): Locale | null {
  if (!header) return null;
  const langs = header
    .split(",")
    .map((part) => part.split(";")[0].trim().toLowerCase())
    .filter(Boolean);
  for (const lang of langs) {
    if (lang.startsWith("zh")) return "zh";
    if (lang.startsWith("en")) return "en";
  }
  return null;
}

/**
 * Resolve the request locale:
 * 1. Cookie — the user's explicit choice (Settings switcher / LocaleBootstrap)
 * 2. Accept-Language header — first-visit auto-detection for guests
 * 3. Default to English
 *
 * The Accept-Language fallback is not persisted to a cookie, so it re-runs on
 * each request until the user picks a language, at which point the cookie
 * takes over permanently.
 */
export default getRequestConfig(async () => {
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(cookieLocale)) {
    return { locale: cookieLocale, messages: await loadMessages(cookieLocale) };
  }

  const acceptLang = (await headers()).get("accept-language");
  const detected = detectFromAcceptLanguage(acceptLang);
  const locale: Locale = detected ?? DEFAULT_LOCALE;
  return { locale, messages: await loadMessages(locale) };
});
