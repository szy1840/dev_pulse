import { loadConfig, loadState, saveState } from "../config.js";
import { adapters, getAdapter } from "../adapters/index.js";
import type { DiscoveredSession, ToolAdapter } from "../adapters/index.js";
import { uploadSessions, uploadCommits, ApiError } from "../api.js";
import { collectFromCwds, hashRepoRoot, resolveRepoRoot } from "../git.js";
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

  // Stamp each session with its repo-root hash (the join key against commits).
  // Resolutions are cached per cwd; non-repo cwds resolve to null.
  const repoRootByCwd = new Map<string, string | null>();
  for (const { metadata } of toUpload) {
    if (!metadata.localCwd) continue;
    if (!repoRootByCwd.has(metadata.localCwd)) {
      repoRootByCwd.set(metadata.localCwd, resolveRepoRoot(metadata.localCwd));
    }
    const root = repoRootByCwd.get(metadata.localCwd);
    metadata.repoRootHash = root ? hashRepoRoot(root) : null;
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

  // Collect local git commits from the repos these sessions worked in. Commit
  // history anchors span→task attribution; failures here never fail the sync.
  try {
    const cwds = toUpload
      .map((b) => b.metadata.localCwd)
      .filter((c): c is string => Boolean(c));
    if (cwds.length > 0) {
      const watermarks = Object.fromEntries(
        Object.entries(state.gitRepos ?? {}).map(([k, v]) => [k, v.lastCollectedAt])
      );
      const collections = collectFromCwds(cwds, watermarks);
      const commits = collections.flatMap((c) => c.commits);
      if (commits.length > 0) {
        const res = await uploadCommits(config, commits);
        ui.dim(`Git: ${res.upserted} commit(s) from ${collections.length} repo(s).`);
      }
      const now = new Date().toISOString();
      state.gitRepos = state.gitRepos ?? {};
      for (const c of collections) {
        state.gitRepos[c.repoRootHash] = { lastCollectedAt: now };
      }
      saveState(state);
    }
  } catch (err) {
    ui.warn(`Git commit sync skipped: ${(err as Error).message}`);
  }

  ui.dim(`View your team dashboard at ${config.apiUrl}/dashboard`);
}
