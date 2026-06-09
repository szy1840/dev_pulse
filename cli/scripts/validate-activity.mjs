#!/usr/bin/env node
/**
 * Validate burst-based activity against local Claude Code transcripts.
 * Usage: node scripts/validate-activity.mjs
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { parseSessionFile, listSessionFiles } from "../dist/parser/claude-code.js";
import { buildActivityFromEvents, burstsFromEvents, IDLE_GAP_MS, MIN_BURST_MS, BURST_PADDING_MS, ACTIVITY_ALGO_VERSION } from "../dist/activity.js";

function fmtMs(ms) {
  if (!ms) return "0m";
  const m = Math.round(ms / 60000);
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return h > 0 ? `${h}h ${rm}m` : `${rm}m`;
}

function collectTimestamps(filePath) {
  const timestamps = [];
  const byType = {};
  for (const line of readFileSync(filePath, "utf8").split("\n")) {
    if (!line.trim()) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    if (!entry.timestamp) continue;
    const t = Date.parse(entry.timestamp);
    if (Number.isNaN(t)) continue;
    timestamps.push(t);
    const typ = entry.type ?? "unknown";
    byType[typ] = (byType[typ] ?? 0) + 1;
  }
  return { timestamps, byType };
}

function gapStats(timestamps) {
  const sorted = [...new Set(timestamps)].sort((a, b) => a - b);
  const gaps = [];
  for (let i = 1; i < sorted.length; i++) {
    gaps.push(sorted[i] - sorted[i - 1]);
  }
  if (!gaps.length) return { count: 0, maxGapMs: 0, gapsOverIdle: 0 };
  return {
    count: gaps.length,
    maxGapMs: Math.max(...gaps),
    gapsOverIdle: gaps.filter((g) => g > IDLE_GAP_MS).length,
    p50: gaps.sort((a, b) => a - b)[Math.floor(gaps.length / 2)],
  };
}

const files = listSessionFiles();
console.log(`\n=== Claude Code activity validation (${files.length} local sessions) ===\n`);
console.log(`Constants: IDLE_GAP=${IDLE_GAP_MS / 60000}min, MIN_BURST=${MIN_BURST_MS / 1000}s, PADDING=${BURST_PADDING_MS / 60000}min, ALGO=${ACTIVITY_ALGO_VERSION}\n`);

const rows = [];
for (const file of files) {
  const parsed = parseSessionFile(file);
  if (!parsed) continue;
  const { timestamps, byType } = collectTimestamps(file);
  const m = parsed.metadata;
  const span =
    m.startedAt && m.endedAt ? new Date(m.endedAt).getTime() - new Date(m.startedAt).getTime() : 0;
  const gaps = gapStats(timestamps);
  const bursts = burstsFromEvents(timestamps);
  const ratio = span > 0 ? m.engagedMs / span : 0;

  rows.push({
    file: file.split("/").slice(-2).join("/"),
    project: m.projectName,
    events: timestamps.length,
    bursts: bursts.length,
    span: fmtMs(span),
    engaged: fmtMs(m.engagedMs),
    ratio: span > 0 ? `${(ratio * 100).toFixed(0)}%` : "—",
    maxGap: fmtMs(gaps.maxGapMs ?? 0),
    idleBreaks: gaps.gapsOverIdle ?? 0,
    msgs: m.messageCount,
    types: Object.entries(byType)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([k, v]) => `${k}:${v}`)
      .join(", "),
    intervals: m.activityIntervals,
  });
}

rows.sort((a, b) => {
  const parse = (s) => parseInt(s) || 0;
  return parse(b.engaged) - parse(a.engaged);
});

console.log(
  "File".padEnd(55) +
    "Span".padStart(8) +
    "Engaged".padStart(9) +
    "Ratio".padStart(7) +
    "Bursts".padStart(7) +
    "IdleBrk".padStart(8) +
    "MaxGap".padStart(8)
);
console.log("-".repeat(102));
for (const r of rows) {
  console.log(
    r.file.slice(0, 54).padEnd(55) +
      r.span.padStart(8) +
      r.engaged.padStart(9) +
      r.ratio.padStart(7) +
      String(r.bursts).padStart(7) +
      String(r.idleBreaks).padStart(8) +
      r.maxGap.padStart(8)
  );
}

// Deep dive: largest session
const biggest = rows.reduce((a, b) => {
  const em = (r) => {
    const m = r.engaged.match(/(\d+)h?\s*(\d*)m?/);
    return 0;
  };
  return rows[0];
}, rows[0]);

const bySpan = [...rows].sort((a, b) => {
  const toMin = (s) => {
    const h = s.match(/(\d+)h/);
    const m = s.match(/(\d+)m/);
    return (h ? parseInt(h[1]) * 60 : 0) + (m ? parseInt(m[1]) : 0);
  };
  return toMin(b.span) - toMin(a.span);
});
const deep = bySpan[0];
if (deep) {
  console.log(`\n=== Deep dive: ${deep.file} ===`);
  console.log(`Project: ${deep.project}`);
  console.log(`Wall span: ${deep.span} | Engaged: ${deep.engaged} | Ratio: ${deep.ratio}`);
  console.log(`Events: ${deep.events} | Bursts: ${deep.bursts} | Idle breaks (>10min): ${deep.idleBreaks}`);
  console.log(`Timestamp types: ${deep.types}`);
  console.log(`Activity intervals (${deep.intervals.length}):`);
  for (const iv of deep.intervals.slice(0, 8)) {
    const d = new Date(iv.end).getTime() - new Date(iv.start).getTime();
    console.log(`  ${iv.start.slice(0, 19)} → ${iv.end.slice(11, 19)}  (${fmtMs(d)})`);
  }
  if (deep.intervals.length > 8) console.log(`  … +${deep.intervals.length - 8} more`);
}

// Sanity checks
console.log("\n=== Sanity checks ===");
let issues = 0;
for (const r of rows) {
  if (r.engaged !== "0m" && r.ratio !== "—") {
    const pct = parseInt(r.ratio);
    if (pct > 100) {
      console.log(`⚠ engaged > span: ${r.file} (${r.ratio})`);
      issues++;
    }
    if (pct === 0 && r.events > 2) {
      console.log(`⚠ zero engaged despite events: ${r.file}`);
      issues++;
    }
  }
  if (r.idleBreaks > 0 && r.bursts <= 1 && r.maxGap !== "0m") {
    const maxMin = parseInt(r.maxGap) || 0;
    if (r.maxGap.includes("h") || maxMin > 10) {
      /* expected multi burst */
    }
  }
}
const zeroEngaged = rows.filter((r) => r.engaged === "0m" && r.events > 0);
if (zeroEngaged.length) {
  console.log(`⚠ ${zeroEngaged.length} session(s) with timestamps but 0 engaged:`);
  for (const r of zeroEngaged) console.log(`   ${r.file} (events=${r.events}, maxGap=${r.maxGap})`);
  issues += zeroEngaged.length;
}
const lowRatio = rows.filter((r) => r.ratio !== "—" && parseInt(r.ratio) < 20 && parseInt(r.ratio) > 0);
console.log(`\nSessions where engaged << span (<20%): ${lowRatio.length}/${rows.length}`);
for (const r of lowRatio.slice(0, 5)) {
  console.log(`  ${r.file}: span ${r.span}, engaged ${r.engaged} (${r.ratio})`);
}
if (issues === 0) console.log("\n✓ No structural anomalies detected in parser output.");
console.log("");
