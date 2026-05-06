export type ReasoningOutputFormat = "summary" | "structured" | "action_items";

export type ReasoningToolInput = {
  prompt?: string;
  instruction?: string;
  previousOutputs: Record<string, unknown>;
  agentMission?: string;
  outputFormat?: ReasoningOutputFormat;
  /** Resolved model id (node value, env, or default). */
  model: string;
};

export type ReasoningToolOutput = {
  providerUsed: "mock" | "openai";
  summary: string;
  actionItems: string[];
  /** 0–1 */
  confidence: number;
  raw?: unknown;
  fallbackReason?: string;
};
