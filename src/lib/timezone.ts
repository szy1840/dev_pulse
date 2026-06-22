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

/** Bucket key for hourly charts: YYYY-MM-DDTHH:00 in the given timezone. */
export function hourKeyInTimezone(d: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  return `${dayKeyInTimezone(d, timeZone)}T${hour.padStart(2, "0")}:00`;
}

/** Local weekday (0=Sun … 6=Sat) and hour (0–23) for heatmaps. */
export function weekdayHourInTimezone(d: Date, timeZone: string): { weekday: number; hour: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "numeric",
    hour12: false,
  }).formatToParts(d);
  const wd = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { weekday: map[wd] ?? 0, hour };
}

/** Next calendar day after `day` (YYYY-MM-DD) in the given timezone. */
export function nextDayKey(day: string, timeZone: string): string {
  const noon = new Date(startOfDayFromDayKey(day, timeZone).getTime() + 12 * 3600 * 1000);
  return dayKeyInTimezone(new Date(noon.getTime() + 25 * 3600 * 1000), timeZone);
}

/** Current hour (0–23) in the given timezone. */
export function currentHourInTimezone(timeZone: string, d = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    hour12: false,
  }).formatToParts(d);
  return parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
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
export function formatDayLabel(day: string, timeZone: string, locale = "en"): string {
  const noon = new Date(startOfDayFromDayKey(day, timeZone).getTime() + 12 * 3600 * 1000);
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
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
