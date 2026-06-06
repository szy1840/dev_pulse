import { join } from "node:path";
import { readFileSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { paths } from "../config.js";

export const SCHEDULE_JOB_ID = "com.devpulse.sync";
export const SCHEDULE_MARKER = "# devpulse-schedule";
export const SCHEDULE_LOG_PATH = join(paths.CONFIG_DIR, "schedule.log");
export const SCHEDULE_CONFIG_PATH = join(paths.CONFIG_DIR, "schedule.json");

export type ScheduleMode = "interval" | "daily";
export type SchedulePlatform = "launchd" | "cron";

export interface ScheduleConfig {
  mode: ScheduleMode;
  intervalHours?: number;
  dailyAt?: string;
  cliPath: string;
  platform: SchedulePlatform;
  installedAt: string;
}

export function loadScheduleConfig(): ScheduleConfig | null {
  if (!existsSync(SCHEDULE_CONFIG_PATH)) return null;
  try {
    return JSON.parse(readFileSync(SCHEDULE_CONFIG_PATH, "utf8")) as ScheduleConfig;
  } catch {
    return null;
  }
}

export function saveScheduleConfig(config: ScheduleConfig) {
  writeFileSync(SCHEDULE_CONFIG_PATH, JSON.stringify(config, null, 2), { mode: 0o600 });
}

export function clearScheduleConfig() {
  if (existsSync(SCHEDULE_CONFIG_PATH)) unlinkSync(SCHEDULE_CONFIG_PATH);
}
