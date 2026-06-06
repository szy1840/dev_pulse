import { homedir } from "node:os";
import { join } from "node:path";
import { realpathSync, chmodSync, writeFileSync, unlinkSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import {
  SCHEDULE_JOB_ID,
  SCHEDULE_LOG_PATH,
  SCHEDULE_MARKER,
  type ScheduleConfig,
  type ScheduleMode,
  type SchedulePlatform,
} from "./store.js";

export interface ScheduleSpec {
  mode: ScheduleMode;
  intervalHours?: number;
  dailyAt?: string;
}

export function resolveCliExecutable(): string {
  const entry = process.argv[1];
  if (!entry) throw new Error("Could not resolve the devpulse executable path.");
  try {
    return realpathSync(entry);
  } catch {
    return entry;
  }
}

function launchdPlistPath(): string {
  return join(homedir(), "Library", "LaunchAgents", `${SCHEDULE_JOB_ID}.plist`);
}

function cronLine(cliPath: string, spec: ScheduleSpec): string {
  const log = `${SCHEDULE_LOG_PATH}`;
  if (spec.mode === "interval") {
    const hours = spec.intervalHours ?? 6;
    return `0 */${hours} * * * ${cliPath} sync >> ${log} 2>&1 ${SCHEDULE_MARKER}`;
  }
  const [hour, minute] = (spec.dailyAt ?? "09:00").split(":");
  return `${minute} ${hour} * * * ${cliPath} sync >> ${log} 2>&1 ${SCHEDULE_MARKER}`;
}

function launchdPlist(cliPath: string, spec: ScheduleSpec): string {
  const log = SCHEDULE_LOG_PATH;
  const scheduleKey =
    spec.mode === "interval"
      ? `<key>StartInterval</key>\n    <integer>${(spec.intervalHours ?? 6) * 3600}</integer>`
      : (() => {
          const [hour, minute] = (spec.dailyAt ?? "09:00").split(":").map((v) => parseInt(v, 10));
          return `<key>StartCalendarInterval</key>
    <dict>
      <key>Hour</key>
      <integer>${hour}</integer>
      <key>Minute</key>
      <integer>${minute}</integer>
    </dict>`;
        })();

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${SCHEDULE_JOB_ID}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${cliPath}</string>
    <string>sync</string>
  </array>
  ${scheduleKey}
  <key>StandardOutPath</key>
  <string>${log}</string>
  <key>StandardErrorPath</key>
  <string>${log}</string>
</dict>
</plist>
`;
}

function readCrontab(): string {
  try {
    return execFileSync("crontab", ["-l"], { encoding: "utf8" });
  } catch (err) {
    const e = err as { stderr?: Buffer | string; status?: number };
    const stderr = e.stderr?.toString() ?? "";
    if (stderr.includes("no crontab") || e.status === 1) return "";
    throw err;
  }
}

function writeCrontab(content: string) {
  execFileSync("crontab", ["-"], { input: content, encoding: "utf8" });
}

function stripDevpulseCronLines(crontab: string): string {
  return crontab
    .split("\n")
    .filter((line) => !line.includes(SCHEDULE_MARKER))
    .join("\n")
    .replace(/\n+$/, "");
}

function platform(): SchedulePlatform | null {
  if (process.platform === "darwin") return "launchd";
  if (process.platform === "linux") return "cron";
  return null;
}

function ensureExecutable(cliPath: string) {
  try {
    chmodSync(cliPath, 0o755);
  } catch {
    /* ignore if chmod fails */
  }
}

function installLaunchd(cliPath: string, spec: ScheduleSpec) {
  const plistPath = launchdPlistPath();
  writeFileSync(plistPath, launchdPlist(cliPath, spec), { mode: 0o644 });
  try {
    execFileSync("launchctl", ["unload", plistPath], { stdio: "ignore" });
  } catch {
    /* not loaded yet */
  }
  execFileSync("launchctl", ["load", "-w", plistPath]);
}

function removeLaunchd() {
  const plistPath = launchdPlistPath();
  if (!existsSync(plistPath)) return;
  try {
    execFileSync("launchctl", ["unload", plistPath], { stdio: "ignore" });
  } catch {
    /* ignore */
  }
  unlinkSync(plistPath);
}

function installCron(cliPath: string, spec: ScheduleSpec) {
  const base = stripDevpulseCronLines(readCrontab());
  const line = cronLine(cliPath, spec);
  const next = base ? `${base}\n${line}\n` : `${line}\n`;
  writeCrontab(next);
}

function removeCron() {
  const base = stripDevpulseCronLines(readCrontab());
  writeCrontab(base ? `${base}\n` : "");
}

export function installSchedule(spec: ScheduleSpec): ScheduleConfig {
  const cliPath = resolveCliExecutable();
  const p = platform();
  if (!p) {
    throw new Error(
      `Automatic scheduling is not supported on ${process.platform}. Run \`devpulse sync\` manually or use your OS scheduler.`
    );
  }

  ensureExecutable(cliPath);

  if (p === "launchd") installLaunchd(cliPath, spec);
  else installCron(cliPath, spec);

  return {
    mode: spec.mode,
    intervalHours: spec.intervalHours,
    dailyAt: spec.dailyAt,
    cliPath,
    platform: p,
    installedAt: new Date().toISOString(),
  };
}

export function removeSchedule(config: ScheduleConfig | null) {
  const p = config?.platform ?? platform();
  if (p === "launchd") removeLaunchd();
  else if (p === "cron") removeCron();
}

export function describeSchedule(config: ScheduleConfig): string {
  if (config.mode === "interval") {
    return `every ${config.intervalHours ?? "?"} hour(s)`;
  }
  return `daily at ${config.dailyAt ?? "09:00"}`;
}
