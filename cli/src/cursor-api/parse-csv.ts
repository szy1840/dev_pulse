/** One row from Cursor Dashboard usage CSV export. */
export interface CursorUsageRow {
  date: string;
  timestamp: number;
  model: string;
  inputWithCacheWrite: number;
  inputWithoutCacheWrite: number;
  cacheRead: number;
  outputTokens: number;
  totalTokens: number;
  apiCost: number;
  costToYou: number;
}

function parseCost(costStr: string): number {
  if (!costStr) return 0;
  const cleaned = costStr.replace(/[$,]/g, "").trim();
  if (cleaned === "-" || cleaned.toLowerCase() === "included") return 0;
  const value = parseFloat(cleaned);
  return Number.isFinite(value) ? value : 0;
}

function parseIntField(value: string | undefined): number {
  const n = parseInt(value ?? "0", 10);
  return Number.isFinite(n) ? n : 0;
}

/** Minimal RFC4180-ish CSV line parser (handles quoted fields). */
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function rowFromRecord(record: Record<string, string>): CursorUsageRow | null {
  const dateStr = record["Date"]?.trim();
  const model = record["Model"]?.trim();
  if (!dateStr || !model) return null;

  const date = new Date(dateStr);
  const isValidDate = !Number.isNaN(date.getTime());
  const dateOnly = isValidDate
    ? date.toISOString().slice(0, 10)
    : dateStr.length >= 10
      ? dateStr.slice(0, 10)
      : dateStr;

  return {
    date: dateOnly,
    timestamp: isValidDate ? date.getTime() : 0,
    model,
    inputWithCacheWrite: parseIntField(record["Input (w/ Cache Write)"]),
    inputWithoutCacheWrite: parseIntField(record["Input (w/o Cache Write)"]),
    cacheRead: parseIntField(record["Cache Read"]),
    outputTokens: parseIntField(record["Output Tokens"]),
    totalTokens: parseIntField(record["Total Tokens"]),
    apiCost: parseCost(record["Cost"] ?? record["API Cost"] ?? "0"),
    costToYou: parseCost(record["Cost to you"] ?? "0"),
  };
}

/** Parse Cursor usage CSV (v1/v2/v3 — column names stay consistent). */
export function parseCursorCsv(csvText: string): CursorUsageRow[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((h) => h.trim());
  const rows: CursorUsageRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i]);
    if (fields.length === 0) continue;
    const record: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      record[headers[j]] = fields[j] ?? "";
    }
    const row = rowFromRecord(record);
    if (row) rows.push(row);
  }
  return rows;
}

export function cacheWriteTokens(row: CursorUsageRow): number {
  return Math.max(0, row.inputWithCacheWrite - row.inputWithoutCacheWrite);
}
