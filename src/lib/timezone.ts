/** Default when profile timezone is unset and no browser cookie is present. */
export const DEFAULT_TIMEZONE = "UTC";

/** Validate an IANA timezone name. */
export function isValidTimezone(timeZone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** Calendar YYYY-MM-DD for an instant in the given timezone. */
export function dayKeyInTimezone(d = new Date(), timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** UTC instant for local midnight on a calendar day in the given timezone. */
export function startOfDayFromDayKey(day: string, timeZone: string): Date {
  const [year, month, dayNum] = day.split("-").map(Number);
  let low = Date.UTC(year, month - 1, dayNum - 1, 0, 0, 0);
  let high = Date.UTC(year, month - 1, dayNum + 1, 0, 0, 0);

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    const midDay = dayKeyInTimezone(new Date(mid), timeZone);
    if (midDay < day) low = mid + 1;
    else high = mid;
  }
  return new Date(low);
}

/** UTC instant for the start of "today" in the given timezone. */
export function startOfDayInTimezone(d = new Date(), timeZone: string): Date {
  return startOfDayFromDayKey(dayKeyInTimezone(d, timeZone), timeZone);
}

/** Human-readable label for a calendar day in the given timezone. */
export function formatDayLabel(day: string, timeZone: string): string {
  const noon = new Date(startOfDayFromDayKey(day, timeZone).getTime() + 12 * 3600 * 1000);
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(noon);
}

/** Short timezone label for UI hints, e.g. "PDT" or "GMT+8". */
export function formatTimezoneLabel(timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "short",
  }).formatToParts(new Date());
  return parts.find((p) => p.type === "timeZoneName")?.value ?? timeZone;
}

/** Curated list for settings dropdown (full list available via Intl.supportedValuesOf). */
export const COMMON_TIMEZONES = [
  "Pacific/Honolulu",
  "America/Anchorage",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Australia/Sydney",
  "Pacific/Auckland",
  "UTC",
] as const;
