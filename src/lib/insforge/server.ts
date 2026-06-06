import { cookies } from "next/headers";
import { createServerClient } from "@insforge/sdk/ssr";

/**
 * User-scoped InsForge client for Server Components, Route Handlers, and Server
 * Actions. Reads the `insforge_access_token` cookie and authenticates as the
 * signed-in user. We use this only to resolve identity (getCurrentUser); all
 * data access goes through the admin client.
 */
export async function createInsForgeServerClient() {
  return createServerClient({ cookies: await cookies() });
}
