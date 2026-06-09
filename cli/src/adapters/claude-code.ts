import { existsSync } from "node:fs";
import {
  claudeProjectsDir,
  listSessionFiles,
  fingerprintFile,
  parseSessionFile,
} from "../parser/claude-code.js";
import { ACTIVITY_ALGO_VERSION } from "../activity.js";
import type { DiscoverOptions, DiscoveredSession, ToolAdapter } from "./types.js";

const TOOL = "claude-code";

export const claudeCodeAdapter: ToolAdapter = {
  tool: TOOL,
  label: "Claude Code",

  available(opts?: DiscoverOptions) {
    return existsSync(opts?.dir ?? claudeProjectsDir());
  },

  discover(opts?: DiscoverOptions): DiscoveredSession[] {
    const dir = opts?.dir ?? claudeProjectsDir();
    return listSessionFiles(dir).map((file) => ({
      // Change detection is per-file so each transcript is tracked independently.
      stateKey: `${TOOL}:${file}`,
      fingerprint: `${safeFingerprint(file)}:${ACTIVITY_ALGO_VERSION}`,
      load: () => {
        const parsed = parseSessionFile(file);
        if (!parsed) return null;
        // Namespace the upload id by tool. Two transcripts that share a session
        // uuid collapse server-side into one row.
        parsed.metadata.externalId = `${TOOL}:${parsed.metadata.externalId}`;
        parsed.metadata.tool = TOOL;
        return parsed.metadata;
      },
    }));
  },
};

function safeFingerprint(file: string): string {
  try {
    return fingerprintFile(file);
  } catch {
    return "";
  }
}
