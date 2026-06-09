import { loadConfig, saveConfig } from "../config.js";
import { verifyToken, ApiError } from "../api.js";
import { waitForBrowserAuth } from "../browser-auth.js";
import { ui, prompt } from "../ui.js";

interface LoginOptions {
  token?: string;
  apiUrl?: string;
  /** Commander sets this to false when --no-browser is passed. */
  browser?: boolean;
}

async function loginWithBrowser(apiUrl: string): Promise<string | null> {
  ui.info("Opening browser to log in…");

  let authUrl = "";
  const resultPromise = waitForBrowserAuth(apiUrl, (url) => {
    authUrl = url;
  });

  // Give the local server a moment to bind and produce the URL.
  await new Promise((r) => setTimeout(r, 150));
  if (authUrl) {
    ui.dim(`If the browser didn't open, visit:\n  ${authUrl}`);
  }

  const { token } = await resultPromise;
  return token;
}

export async function login(opts: LoginOptions) {
  const config = loadConfig();
  if (opts.apiUrl) config.apiUrl = opts.apiUrl.replace(/\/$/, "");

  ui.dim(`Dashboard: ${config.apiUrl}`);

  let token = opts.token?.trim();

  if (!token && opts.browser !== false) {
    try {
      token = (await loginWithBrowser(config.apiUrl)) ?? undefined;
    } catch (err) {
      ui.warn(`Browser login failed: ${(err as Error).message}`);
      ui.dim("You can paste an existing token with --token, or retry browser login.");
    }
  }

  if (!token) {
    token = await prompt("Paste a CLI token:\n> ");
  }

  if (!token) {
    ui.error("No token provided.");
    process.exit(1);
  }

  config.token = token.trim();

  try {
    const res = await verifyToken(config);
    config.user = res.user;
    config.team = res.team;
    saveConfig(config);
    ui.success(
      `Logged in as ${res.user.name ?? res.user.email ?? res.user.id} → team "${res.team.name ?? res.team.id}".`
    );
    ui.dim("Run `devpulse sync` to upload your AI coding sessions.");
    // Browser login starts a localhost callback server; force-exit so the shell prompt returns.
    process.exit(0);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      ui.error("Token rejected. Double-check it was copied correctly and isn't revoked.");
    } else {
      ui.error(`Login failed: ${(err as Error).message}`);
    }
    process.exit(1);
  }
}
