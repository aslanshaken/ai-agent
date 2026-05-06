import { REASONING_MAX_UPSTREAM_CHARS } from "@/lib/tools/ai/constants";
import type { ReasoningToolInput, ReasoningToolOutput } from "@/lib/tools/ai/types";

function serializeUpstream(previousOutputs: Record<string, unknown>): string {
  try {
    const s = JSON.stringify(previousOutputs, null, 2);
    return s.length > REASONING_MAX_UPSTREAM_CHARS
      ? `${s.slice(0, REASONING_MAX_UPSTREAM_CHARS)}…`
      : s;
  } catch {
    return "(upstream not serializable)";
  }
}

export function mockReasoning(input: ReasoningToolInput): ReasoningToolOutput {
  const upstreamJson = serializeUpstream(input.previousOutputs);
  const keys = Object.keys(input.previousOutputs);
  const format = input.outputFormat ?? "summary";

  const parts: string[] = [];
  if (input.agentMission) parts.push(`Agent mission: ${input.agentMission}`);
  if (input.instruction?.trim()) parts.push(`Instruction: ${input.instruction.trim()}`);
  if (input.prompt?.trim()) parts.push(`Prompt: ${input.prompt.trim()}`);
  parts.push(`Output format: ${format}`);
  parts.push(`Upstream nodes: ${keys.length ? keys.join(", ") : "none"}`);
  parts.push(`Upstream payload (truncated):\n${upstreamJson}`);

  const summary =
    keys.length === 0
      ? "Mock reasoning: no upstream outputs. Configure upstream nodes (e.g. search) or add an instruction."
      : `Mock reasoning over ${keys.length} upstream node(s). Review JSON below for keys and sample fields.`;

  const actionItems =
    keys.length === 0
      ? ["Connect upstream nodes (e.g. search) to ground this step.", "Add an instruction if you need a fixed task."]
      : keys.slice(0, 5).map((id) => `Review output from node ${id} before acting.`);

  return {
    providerUsed: "mock",
    summary,
    actionItems,
    confidence: 0.55,
    raw: { mock: true, upstreamPreview: upstreamJson.slice(0, 2000) },
  };
}
