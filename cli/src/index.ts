#!/usr/bin/env node
import "./suppress-warnings.js";
import { Command } from "commander";
import { login } from "./commands/login.js";
import { sync } from "./commands/sync.js";
import { status } from "./commands/status.js";
import { scheduleInstall, scheduleRemove, scheduleStatus } from "./commands/schedule.js";
import {
  cursorLogin,
  cursorLogout,
  cursorStatus,
  cursorSwitch,
  cursorSync,
} from "./commands/cursor.js";
import { ui } from "./ui.js";

const program = new Command();

program
  .name("devpulse")
  .description("DevPulse AI — sync local AI coding sessions to your team dashboard.")
  .version("0.3.2");

program
  .command("login")
  .description("Authenticate the CLI (opens your browser by default).")
  .option("--token <token>", "CLI token (skip browser login)")
  .option("--no-browser", "Paste a token manually instead of opening the browser")
  .option("--api-url <url>", "Override the dashboard URL")
  .action(login);

program
  .command("sync")
  .description("Scan local AI coding tool logs and upload new/changed sessions.")
  .option("--dry-run", "Show what would be uploaded without sending anything")
  .option("--force", "Re-sync all sessions, ignoring local dedupe state")
  .option("--dir <path>", "Override the Claude Code projects directory")
  .option("--tool <name>", "Only sync one tool (claude-code, codex, openclaw, cursor)")
  .option("--limit <n>", "Only process up to N sessions", (v) => parseInt(v, 10))
  .action(sync);

program
  .command("status")
  .description("Show login state, detected tools, and pending sessions.")
  .option("--dir <path>", "Override the Claude Code projects directory")
  .option("--tool <name>", "Only show one tool (claude-code, codex, openclaw, cursor)")
  .action(status);

const schedule = program
  .command("schedule")
  .description("Install or manage automatic background sync (macOS launchd / Linux cron).");

schedule
  .command("install")
  .description("Schedule `devpulse sync` to run automatically.")
  .option("--every <hours>", "Run every N hours (1–24), e.g. --every 6")
  .option("--daily", "Run once per day")
  .option("--at <time>", "With --daily: local time HH:MM (default 09:00)")
  .action(scheduleInstall);

schedule
  .command("status")
  .description("Show the installed automatic sync schedule.")
  .action(scheduleStatus);

schedule
  .command("remove")
  .description("Uninstall automatic background sync.")
  .action(scheduleRemove);

const cursor = program
  .command("cursor")
  .description("Cursor Dashboard API — optional login for official token/cost usage.");

cursor
  .command("login")
  .description("Save WorkosCursorSessionToken for Cursor usage API (like tokscale).")
  .option("--name <label>", "Account label, e.g. work")
  .option("--token <token>", "Session token (skip prompt)")
  .action(cursorLogin);

cursor
  .command("sync")
  .description("Download usage CSV to ~/.devpulse/cursor-cache/usage.csv")
  .option("--json", "Print result as JSON")
  .action(cursorSync);

cursor
  .command("status")
  .description("Show Cursor API login and cache status.")
  .action(cursorStatus);

cursor
  .command("switch <name>")
  .description("Set the active Cursor account by label or id.")
  .action(cursorSwitch);

cursor
  .command("logout")
  .description("Remove saved Cursor credentials.")
  .option("--purge-cache", "Also delete ~/.devpulse/cursor-cache/")
  .action(cursorLogout);

program.parseAsync(process.argv).catch((err) => {
  ui.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
