import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  doubaoDbDir,
  readDoubaoConversations,
  DOUBAO_PARSER_VERSION,
} from "../parser/doubao.js";
import { buildSessionSummary } from "../summary.js";
import type { SessionMetadata } from "../types.js";
import type { DiscoveredSession, ToolAdapter } from "./types.js";

const TOOL = "doubao";

function conversationFingerprint(name: string): string {
  return `${createHash("sha256").update(name).digest("hex").slice(0, 16)}:${DOUBAO_PARSER_VERSION}`;
}

function buildMetadata(id: string, name: string): SessionMetadata {
  return {
    externalId: `${TOOL}:${id}`,
    tool: TOOL,
    model: null,
    projectPathHash: null,
    projectName: null,
    summary: buildSessionSummary({
      firstUserText: name,
      explicitSummary: null,
      projectName: null,
      messageCount: 0,
    }),
    messageCount: 0,
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheCreationTokens: 0,
    startedAt: null,
    endedAt: null,
    engagedMs: 0,
    activityIntervals: [],
    intentMessages: [],
  };
}

export const doubaoAdapter: ToolAdapter = {
  tool: TOOL,
  label: "Doubao",

  available(): boolean {
    return existsSync(doubaoDbDir());
  },

  async discover(): Promise<DiscoveredSession[]> {
    const conversations = await readDoubaoConversations();
    return conversations.map(({ id, name }) => {
      const metadata = buildMetadata(id, name);
      return {
        stateKey: `${TOOL}:${id}`,
        fingerprint: conversationFingerprint(name),
        load: (): SessionMetadata => metadata,
      };
    });
  },
};
