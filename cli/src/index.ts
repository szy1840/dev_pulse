#!/usr/bin/env node
import { Command } from "commander";
import { login } from "./commands/login.js";
import { sync } from "./commands/sync.js";
import { status } from "./commands/status.js";
import { ui } from "./ui.js";

const program = new Command();

program
  .name("devpulse")
  .description("DevPulse AI — sync local AI coding sessions to your team dashboard.")
  .version("0.1.0");

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
  .option("--tool <name>", "Only sync one tool (claude-code, openclaw, cursor)")
  .option("--limit <n>", "Only process up to N sessions", (v) => parseInt(v, 10))
  .action(sync);

program
  .command("status")
  .description("Show login state, detected tools, and pending sessions.")
  .option("--dir <path>", "Override the Claude Code projects directory")
  .option("--tool <name>", "Only show one tool (claude-code, openclaw, cursor)")
  .action(status);

program.parseAsync(process.argv).catch((err) => {
  ui.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
