import { existsSync } from "node:fs";
import { loadConfig } from "../config.js";
import { describeSchedule, installSchedule, removeSchedule } from "../schedule/install.js";
import {
  clearScheduleConfig,
  loadScheduleConfig,
  saveScheduleConfig,
  SCHEDULE_LOG_PATH,
} from "../schedule/store.js";
import { ui } from "../ui.js";

interface InstallOptions {
  every?: string;
  daily?: boolean;
  at?: string;
}

function parseIntervalHours(raw: string): number {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1 || n > 24) {
    throw new Error("--every must be an integer between 1 and 24 (hours).");
  }
  return n;
}

function parseDailyAt(raw?: string): string {
  const value = raw ?? "09:00";
  const m = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!m) throw new Error("Invalid --at time; use HH:MM in 24-hour format, e.g. 09:00.");
  const hour = parseInt(m[1], 10);
  const minute = parseInt(m[2], 10);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new Error("Invalid --at time; hour must be 0–23 and minute 0–59.");
  }
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function requireLogin() {
  const config = loadConfig();
  if (!config.token) {
    ui.error("Not logged in. Run `devpulse login` before scheduling automatic sync.");
    process.exitCode = 1;
    return false;
  }
  return true;
}

export async function scheduleInstall(opts: InstallOptions) {
  if (!requireLogin()) return;

  if (opts.every && opts.daily) {
    ui.error("Use either --every <hours> or --daily, not both.");
    process.exitCode = 1;
    return;
  }
  if (!opts.every && !opts.daily) {
    ui.error("Choose a schedule: --every <hours> or --daily [--at HH:MM].");
    process.exitCode = 1;
    return;
  }

  try {
    const existing = loadScheduleConfig();
    if (existing) removeSchedule(existing);

    const spec = opts.every
      ? { mode: "interval" as const, intervalHours: parseIntervalHours(opts.every) }
      : { mode: "daily" as const, dailyAt: parseDailyAt(opts.at) };

    const config = installSchedule(spec);
    saveScheduleConfig(config);

    ui.success(`Automatic sync scheduled (${describeSchedule(config)}).`);
    ui.dim(`Runs \`devpulse sync\` in the background via ${config.platform}.`);
    ui.dim(`Logs: ${SCHEDULE_LOG_PATH}`);
    ui.info("Run `devpulse schedule status` to inspect, or `devpulse schedule remove` to uninstall.");
  } catch (err) {
    ui.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  }
}

export async function scheduleStatus() {
  const config = loadScheduleConfig();
  ui.heading("DevPulse schedule");

  if (!config) {
    ui.warn("No automatic sync is installed.");
    ui.dim("Install with `devpulse schedule install --every 6` or `devpulse schedule install --daily --at 09:00`.");
    return;
  }

  ui.success(`Installed: ${describeSchedule(config)}`);
  ui.info(`  Platform:  ${config.platform}`);
  ui.info(`  CLI path:  ${config.cliPath}`);
  ui.info(`  Installed: ${new Date(config.installedAt).toLocaleString()}`);
  ui.info(`  Log file:  ${SCHEDULE_LOG_PATH}${existsSync(SCHEDULE_LOG_PATH) ? "" : " (not created yet)"}`);
}

export async function scheduleRemove() {
  const config = loadScheduleConfig();
  if (!config) {
    ui.warn("No automatic sync is installed.");
    return;
  }

  try {
    removeSchedule(config);
    clearScheduleConfig();
    ui.success("Automatic sync removed.");
  } catch (err) {
    ui.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  }
}
