import { claudeCodeAdapter } from "./claude-code.js";
import { openclawAdapter } from "./openclaw.js";
import { cursorAdapter } from "./cursor.js";
import type { ToolAdapter } from "./types.js";

/** All supported tool adapters, in display order. */
export const adapters: ToolAdapter[] = [claudeCodeAdapter, openclawAdapter, cursorAdapter];

export function getAdapter(tool: string): ToolAdapter | undefined {
  return adapters.find((a) => a.tool === tool);
}

export type { ToolAdapter, DiscoveredSession, DiscoverOptions } from "./types.js";
