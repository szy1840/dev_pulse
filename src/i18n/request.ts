import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
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
 * Resolve the request locale from the cookie, defaulting to English. We do NOT
 * auto-detect from Accept-Language — the language is English until the user
 * changes it in Settings. The cookie is set by the Settings switcher /
 * LocaleBootstrap; see src/lib/actions.ts.
 */
export default getRequestConfig(async () => {
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale: Locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;
  return { locale, messages: await loadMessages(locale) };
});
