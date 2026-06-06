import { loadConfig, loadState, saveState } from "../config.js";
import { adapters, getAdapter } from "../adapters/index.js";
import type { DiscoveredSession, ToolAdapter } from "../adapters/index.js";
import { uploadSessions, ApiError } from "../api.js";
import type { SessionMetadata } from "../types.js";
import { ui } from "../ui.js";

interface SyncOptions {
  dryRun?: boolean;
  force?: boolean;
  dir?: string;
  limit?: number;
  tool?: string;
}

const BATCH_SIZE = 200;

export async function sync(opts: SyncOptions) {
  const config = loadConfig();
  if (!config.token) {
    ui.error("Not logged in. Run `devpulse login` first.");
    process.exitCode = 1;
    return;
  }

  // Resolve which tools to scan.
  let active: ToolAdapter[] = adapters;
  if (opts.tool) {
    const one = getAdapter(opts.tool);
    if (!one) {
      ui.error(`Unknown tool "${opts.tool}". Supported: ${adapters.map((a) => a.tool).join(", ")}.`);
      process.exitCode = 1;
      return;
    }
    active = [one];
  }

  const available = active.filter((a) => a.available({ dir: opts.dir }));
  if (available.length === 0) {
    ui.warn("No supported AI coding tools found on this machine.");
    ui.dim(`Looked for: ${active.map((a) => a.label).join(", ")}.`);
    return;
  }

  const state = loadState();

  // Discover candidate sessions across every available tool (cheap fingerprints).
  const pending: DiscoveredSession[] = [];
  let skipped = 0;
  for (const adapter of available) {
    let found = 0;
    const discovered = adapter.discover({ dir: opts.dir });
    for (const ds of discovered) {
      found++;
      const prev = state.sessions[ds.stateKey];
      if (!opts.force && prev && prev.fingerprint === ds.fingerprint) {
        skipped++;
        continue;
      }
      pending.push(ds);
    }
    ui.dim(`Scanned ${adapter.label}: ${found} session(s).`);
  }

  // Parse only the new/changed ones (respecting --limit).
  const toUpload: { stateKey: string; fingerprint: string; metadata: SessionMetadata }[] = [];
  for (const ds of pending) {
    let metadata: SessionMetadata | null = null;
    try {
      metadata = ds.load();
    } catch {
      /* skip unreadable/unparseable session */
    }
    if (metadata) toUpload.push({ stateKey: ds.stateKey, fingerprint: ds.fingerprint, metadata });
    if (opts.limit && toUpload.length >= opts.limit) break;
  }

  ui.info(
    `${toUpload.length} new/changed session(s), ${skipped} unchanged (skipped)${
      opts.force ? " — forced full re-sync" : ""
    }.`
  );

  if (toUpload.length === 0) {
    ui.success("Everything is already up to date.");
    return;
  }

  if (opts.dryRun) {
    ui.heading("\nDry run — would upload:");
    for (const { metadata: m } of toUpload.slice(0, 20)) {
      ui.dim(
        `  • [${m.tool}] ${m.projectName ?? "?"} · ${m.model ?? "?"} · ${m.messageCount} msgs · ${
          m.inputTokens + m.outputTokens
        } tok`
      );
    }
    if (toUpload.length > 20) ui.dim(`  …and ${toUpload.length - 20} more`);
    ui.info("\nNothing uploaded (--dry-run).");
    return;
  }

  let created = 0;
  let updated = 0;
  try {
    for (let i = 0; i < toUpload.length; i += BATCH_SIZE) {
      const batch = toUpload.slice(i, i + BATCH_SIZE);
      const res = await uploadSessions(config, batch.map((b) => b.metadata));
      created += res.created;
      updated += res.updated;

      // Persist fingerprints only after a successful batch upload.
      const now = new Date().toISOString();
      for (const b of batch) {
        state.sessions[b.stateKey] = { fingerprint: b.fingerprint, lastSyncedAt: now };
      }
      saveState(state);
    }
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      ui.error("Token rejected during sync. Run `devpulse login` again.");
    } else {
      ui.error(`Sync failed: ${(err as Error).message}`);
    }
    process.exitCode = 1;
    return;
  }

  state.lastSyncAt = new Date().toISOString();
  saveState(state);

  ui.success(`Synced: ${created} new, ${updated} updated.`);
  ui.dim(`View your team dashboard at ${config.apiUrl}/dashboard`);
}
