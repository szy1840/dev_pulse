import {
  dayKeyInTimezone,
  startOfDayFromDayKey,
  formatDayLabel,
} from "@/lib/timezone";

/**
 * Calendar-period navigation model. Replaces the rolling today/7d/30d windows:
 * each view is a real calendar period (a day, a Monday-start week, a month)
 * anchored at its start day, navigable backwards and forwards. "all" is the
 * unbounded view.
 */
export type ViewGranularity = "day" | "week" | "month" | "all";

export interface PeriodRange {
  view: ViewGranularity;
  /** Normalized period-start day key (YYYY-MM-DD); "" for all-time. */
  anchor: string;
  /** Inclusive lower bound instant; null for all-time. */
  start: Date | null;
  /** Exclusive upper bound instant; null for all-time. */
  end: Date | null;
  /** Human label, e.g. "Wednesday, Jun 11" / "Jun 9 – Jun 15, 2026" / "June 2026". */
  label: string;
  /** Phrase for LLM prompts, e.g. "today" / "the week of Jun 9". */
  phrase: string;
  /** Short word for inline UI labels, e.g. "Today" / "This week" / "Jun 9 – 15". */
  shortLabel: string;
  /** True when this is the period containing "now". */
  isCurrent: boolean;
  prevAnchor: string | null;
  /** Null when already at the current period (no future navigation). */
  nextAnchor: string | null;
}

const DAY_MS = 24 * 3600 * 1000;

/** Day key shifted by n calendar days (noon-instant arithmetic is DST-safe). */
function addDays(day: string, n: number, timeZone: string): string {
  const noon = startOfDayFromDayKey(day, timeZone).getTime() + 12 * 3600 * 1000;
  return dayKeyInTimezone(new Date(noon + n * DAY_MS), timeZone);
}

/** Monday-start weekday index (Mon=0 … Sun=6) for a day key. */
function weekdayIndex(day: string, timeZone: string): number {
  const noon = new Date(startOfDayFromDayKey(day, timeZone).getTime() + 12 * 3600 * 1000);
  const wd = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(noon);
  const map: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  return map[wd] ?? 0;
}

function weekStart(day: string, timeZone: string): string {
  return addDays(day, -weekdayIndex(day, timeZone), timeZone);
}

function monthStart(day: string): string {
  return `${day.slice(0, 7)}-01`;
}

function addMonths(monthStartDay: string, n: number): string {
  const [y, m] = monthStartDay.split("-").map(Number);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, "0")}-01`;
}

function isValidDayKey(s: string | undefined): s is string {
  return Boolean(s && /^\d{4}-\d{2}-\d{2}$/.test(s));
}

function monthDayLabel(day: string, timeZone: string, withYear = false): string {
  const noon = new Date(startOfDayFromDayKey(day, timeZone).getTime() + 12 * 3600 * 1000);
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
    ...(withYear ? { year: "numeric" } : {}),
  }).format(noon);
}

function monthLabel(monthStartDay: string, timeZone: string): string {
  const noon = new Date(
    startOfDayFromDayKey(monthStartDay, timeZone).getTime() + 12 * 3600 * 1000
  );
  return new Intl.DateTimeFormat("en-US", { timeZone, month: "long", year: "numeric" }).format(noon);
}

/**
 * Resolve a view + anchor (from URL params) into a concrete period range.
 * Anchors are normalized to the period's start day and clamped to the present.
 * Legacy `?period=` values map onto the new views.
 */
export function resolveRange(
  viewParam: string | undefined,
  anchorParam: string | undefined,
  timeZone: string
): PeriodRange {
  // Legacy mapping: today→day, 7d→week, 30d→month.
  const view: ViewGranularity =
    viewParam === "day" || viewParam === "today"
      ? "day"
      : viewParam === "week" || viewParam === "7d"
        ? "week"
        : viewParam === "month" || viewParam === "30d"
          ? "month"
          : viewParam === "all"
            ? "all"
            : "week";

  const today = dayKeyInTimezone(new Date(), timeZone);

  if (view === "all") {
    return {
      view,
      anchor: "",
      start: null,
      end: null,
      label: "All time",
      phrase: "across all time",
      shortLabel: "All time",
      isCurrent: true,
      prevAnchor: null,
      nextAnchor: null,
    };
  }

  const requested = isValidDayKey(anchorParam) ? anchorParam : today;
  const clamped = requested > today ? today : requested;

  if (view === "day") {
    const anchor = clamped;
    const isCurrent = anchor === today;
    const start = startOfDayFromDayKey(anchor, timeZone);
    const end = startOfDayFromDayKey(addDays(anchor, 1, timeZone), timeZone);
    const label = formatDayLabel(anchor, timeZone);
    return {
      view,
      anchor,
      start,
      end,
      label,
      phrase: isCurrent ? "today" : `on ${label}`,
      shortLabel: isCurrent ? "Today" : monthDayLabel(anchor, timeZone),
      isCurrent,
      prevAnchor: addDays(anchor, -1, timeZone),
      nextAnchor: isCurrent ? null : addDays(anchor, 1, timeZone),
    };
  }

  if (view === "week") {
    const anchor = weekStart(clamped, timeZone);
    const currentAnchor = weekStart(today, timeZone);
    const isCurrent = anchor === currentAnchor;
    const last = addDays(anchor, 6, timeZone);
    const start = startOfDayFromDayKey(anchor, timeZone);
    const end = startOfDayFromDayKey(addDays(anchor, 7, timeZone), timeZone);
    const label = `${monthDayLabel(anchor, timeZone)} – ${monthDayLabel(last, timeZone, true)}`;
    return {
      view,
      anchor,
      start,
      end,
      label,
      phrase: isCurrent ? "this week" : `the week of ${monthDayLabel(anchor, timeZone, true)}`,
      shortLabel: isCurrent
        ? "This week"
        : `${monthDayLabel(anchor, timeZone)} – ${monthDayLabel(last, timeZone)}`,
      isCurrent,
      prevAnchor: addDays(anchor, -7, timeZone),
      nextAnchor: isCurrent ? null : addDays(anchor, 7, timeZone),
    };
  }

  // month
  const anchor = monthStart(clamped);
  const currentAnchor = monthStart(today);
  const isCurrent = anchor === currentAnchor;
  const nextStart = addMonths(anchor, 1);
  const start = startOfDayFromDayKey(anchor, timeZone);
  const end = startOfDayFromDayKey(nextStart, timeZone);
  const label = monthLabel(anchor, timeZone);
  return {
    view: "month",
    anchor,
    start,
    end,
    label,
    phrase: isCurrent ? "this month" : `in ${label}`,
    shortLabel: isCurrent ? "This month" : label,
    isCurrent,
    prevAnchor: addMonths(anchor, -1),
    nextAnchor: isCurrent ? null : nextStart,
  };
}

/** Query bound shape shared by all data fetchers. */
export interface QueryRange {
  start: Date | null;
  end: Date | null;
}

/**
 * Bounds of the period immediately before `range`, for period-over-period
 * comparisons. Null for all-time (nothing to compare against).
 */
export function previousQueryRange(range: PeriodRange, timeZone: string): QueryRange | null {
  if (range.view === "all" || !range.prevAnchor) return null;
  const prev = resolveRange(range.view, range.prevAnchor, timeZone);
  return { start: prev.start, end: prev.end };
}

/** Short label for delta hints, e.g. "vs prev day". */
export function previousPeriodWord(view: ViewGranularity): string {
  switch (view) {
    case "day":
      return "vs prev day";
    case "week":
      return "vs prev week";
    case "month":
      return "vs prev month";
    case "all":
      return "";
  }
}
