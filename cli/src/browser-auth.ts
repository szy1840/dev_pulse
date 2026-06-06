import { randomBytes } from "node:crypto";
import { execFile } from "node:child_process";
import http from "node:http";
import os from "node:os";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const TIMEOUT_MS = 5 * 60_000;

export interface BrowserAuthResult {
  token: string;
}

async function openBrowser(url: string): Promise<void> {
  if (process.platform === "darwin") {
    await execFileAsync("open", [url]);
    return;
  }
  if (process.platform === "win32") {
    await execFileAsync("cmd", ["/c", "start", "", url], { windowsHide: true });
    return;
  }
  await execFileAsync("xdg-open", [url]);
}

function successHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>DevPulse CLI</title></head>
<body style="font-family: system-ui, sans-serif; max-width: 32rem; margin: 4rem auto; padding: 0 1rem;">
  <h1>DevPulse CLI connected</h1>
  <p>You can close this tab and return to the terminal.</p>
</body>
</html>`;
}

function errorHtml(message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>DevPulse CLI</title></head>
<body style="font-family: system-ui, sans-serif; max-width: 32rem; margin: 4rem auto; padding: 0 1rem;">
  <h1>Authorization failed</h1>
  <p>${message}</p>
  <p>Close this tab and run <code>devpulse login</code> again in the terminal.</p>
</body>
</html>`;
}

/** Start a localhost callback server, open the dashboard authorize page, wait for the token. */
export function waitForBrowserAuth(
  apiUrl: string,
  onReady?: (authUrl: string) => void
): Promise<BrowserAuthResult> {
  const state = randomBytes(16).toString("hex");
  const hostname = os.hostname();

  return new Promise((resolve, reject) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    function finish(err: Error | null, result?: BrowserAuthResult) {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      server.close();
      if (err) reject(err);
      else resolve(result!);
    }

    const server = http.createServer((req, res) => {
      if (!req.url?.startsWith("/callback")) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }

      const url = new URL(req.url, "http://127.0.0.1");
      const token = url.searchParams.get("token");
      const returnedState = url.searchParams.get("state");

      if (!token || returnedState !== state) {
        res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
        res.end(errorHtml("Invalid or missing authorization parameters."));
        finish(new Error("Authorization callback rejected."));
        return;
      }

      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(successHtml());
      finish(null, { token });
    });

    server.on("error", (err) => finish(err));

    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") {
        finish(new Error("Could not start local callback server."));
        return;
      }

      const port = addr.port;
      const params = new URLSearchParams({
        state,
        port: String(port),
        hostname,
      });
      const authUrl = `${apiUrl.replace(/\/$/, "")}/cli/authorize?${params}`;

      onReady?.(authUrl);
      openBrowser(authUrl).catch(() => {
        // Browser open is best-effort; login prints the URL if needed.
      });

      timer = setTimeout(() => {
        finish(new Error("Login timed out after 5 minutes. Run `devpulse login` again."));
      }, TIMEOUT_MS);
    });
  });
}
