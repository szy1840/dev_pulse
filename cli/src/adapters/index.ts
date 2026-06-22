import { claudeCodeAdapter } from "./claude-code.js";
import { codexAdapter } from "./codex.js";
import { openclawAdapter } from "./openclaw.js";
import { cursorAdapter } from "./cursor.js";
import { antigravityAdapter } from "./antigravity.js";
import { antigravityCliAdapter } from "./antigravity-cli.js";
import type { ToolAdapter } from "./types.js";

/** All supported tool adapters, in display order. */
export const adapters: ToolAdapter[] = [
  claudeCodeAdapter,
  codexAdapter,
  openclawAdapter,
  cursorAdapter,
  antigravityAdapter,
  antigravityCliAdapter,
];

export function getAdapter(tool: string): ToolAdapter | undefined {
  return adapters.find((a) => a.tool === tool);
}

export type { ToolAdapter, DiscoveredSession, DiscoverOptions } from "./types.js";
