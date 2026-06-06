"use client";

import { createBrowserClient } from "@insforge/sdk/ssr";

/**
 * Browser InsForge client for Client Components. Reads the access-token cookie
 * and refreshes through `/api/auth/refresh` when needed. Auth mutations that set
 * cookies (sign in/up, verify, sign out) go through our `/api/auth/*` routes.
 */
export const insforge = createBrowserClient();
