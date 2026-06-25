import { loadConfig, loadState, paths } from "../config.js";
import { adapters, getAdapter } from "../adapters/index.js";
import type { ToolAdapter } from "../adapters/index.js";
import { ui } from "../ui.js";

interface StatusOptions {
  dir?: string;
  tool?: string;
}

export async function status(opts: StatusOptions = {}) {
  const config = loadConfig();
  const state = loadState();

  ui.heading("DevPulse status");
  ui.info(`  Dashboard:   ${config.apiUrl}`);
  ui.info(`  Config file: ${paths.CONFIG_PATH}`);

  if (config.token) {
    const who = config.user?.name ?? config.user?.email ?? config.user?.id ?? "unknown";
    ui.success(`  Logged in as ${who} → team "${config.team?.name ?? config.team?.id ?? "?"}"`);
  } else {
    ui.warn("  Not logged in. Run `devpulse login`.");
  }

  let active: ToolAdapter[] = adapters;
  if (opts.tool) {
    const one = getAdapter(opts.tool);
    if (!one) {
      ui.error(`\n  Unknown tool "${opts.tool}". Supported: ${adapters.map((a) => a.tool).join(", ")}.`);
      process.exitCode = 1;
      return;
    }
    active = [one];
  }

  ui.info("\n  Tools:");
  let totalPending = 0;
  for (const adapter of active) {
    if (!adapter.available({ dir: opts.dir })) {
      ui.dim(`    ${adapter.label}: not detected`);
      continue;
    }
    const discovered = await Promise.resolve(adapter.discover({ dir: opts.dir }));
    let pending = 0;
    for (const ds of discovered) {
      const prev = state.sessions[ds.stateKey];
      if (!prev || prev.fingerprint !== ds.fingerprint) pending++;
    }
    totalPending += pending;
    ui.info(`    ${adapter.label}: ${discovered.length} session(s), ${pending} pending`);
  }

  ui.info(`\n  Already synced:   ${Object.keys(state.sessions).length}`);
  if (totalPending > 0) {
    ui.warn(`  Pending sync:     ${totalPending} (run \`devpulse sync\`)`);
  } else {
    ui.success("  Pending sync:     0 (up to date)");
  }

  if (state.lastSyncAt) {
    ui.dim(`\n  Last sync: ${new Date(state.lastSyncAt).toLocaleString()}`);
  }
}
