/** Supported UI languages. Keep in sync with the message catalogs in src/messages. */
export const LOCALES = ["en", "zh"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** Cookie that holds the viewer's chosen UI language (read by next-intl request config). */
export const LOCALE_COOKIE = "locale";

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "en" || value === "zh";
}

/** Native display names for the language switcher. */
export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  zh: "中文",
};
