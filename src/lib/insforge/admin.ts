import { createAdminClient } from "@insforge/sdk";

/**
 * Project-admin (service-key) InsForge client for trusted server-only code.
 * The admin key bypasses RLS, which is exactly what our locked-down tables
 * (RLS enabled, no policies) expect: all reads/writes go through the server.
 *
 * Never import this from a Client Component or anything bundled for the browser.
 */
let cached: ReturnType<typeof createAdminClient> | null = null;

export function getAdmin() {
  if (cached) return cached;

  const baseUrl = process.env.INSFORGE_URL;
  const apiKey = process.env.INSFORGE_API_KEY;
  if (!baseUrl || !apiKey) {
    throw new Error("INSFORGE_URL and INSFORGE_API_KEY must be set for server-side InsForge access.");
  }

  cached = createAdminClient({ baseUrl, apiKey });
  return cached;
}
