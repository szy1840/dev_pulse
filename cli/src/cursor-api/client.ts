const CURSOR_API_BASE = "https://cursor.com";
const USAGE_CSV_ENDPOINT = `${CURSOR_API_BASE}/api/dashboard/export-usage-events-csv?strategy=tokens`;
const USAGE_SUMMARY_ENDPOINT = `${CURSOR_API_BASE}/api/usage-summary`;

function buildCursorHeaders(sessionToken: string): Record<string, string> {
  return {
    Accept: "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    Cookie: `WorkosCursorSessionToken=${sessionToken}`,
    Referer: "https://www.cursor.com/settings",
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  };
}

export async function validateCursorSession(sessionToken: string): Promise<{
  valid: boolean;
  membershipType?: string;
  error?: string;
}> {
  try {
    const response = await fetch(USAGE_SUMMARY_ENDPOINT, {
      method: "GET",
      headers: buildCursorHeaders(sessionToken),
    });
    if (response.status === 401 || response.status === 403) {
      return { valid: false, error: "Session token expired or invalid." };
    }
    if (!response.ok) {
      return { valid: false, error: `API returned status ${response.status}.` };
    }
    const data = (await response.json()) as { billingCycleStart?: string; membershipType?: string };
    if (data.billingCycleStart) {
      return { valid: true, membershipType: data.membershipType };
    }
    return { valid: false, error: "Unexpected response from Cursor API." };
  } catch (err) {
    return { valid: false, error: (err as Error).message };
  }
}

export async function fetchCursorUsageCsv(sessionToken: string): Promise<string> {
  const response = await fetch(USAGE_CSV_ENDPOINT, {
    method: "GET",
    headers: buildCursorHeaders(sessionToken),
  });
  if (response.status === 401 || response.status === 403) {
    throw new Error("Cursor session expired. Run `devpulse cursor login` to re-authenticate.");
  }
  if (!response.ok) {
    throw new Error(`Cursor API returned status ${response.status}.`);
  }
  const text = await response.text();
  if (!text.startsWith("Date,")) {
    throw new Error("Invalid response from Cursor API — expected CSV.");
  }
  return text;
}
