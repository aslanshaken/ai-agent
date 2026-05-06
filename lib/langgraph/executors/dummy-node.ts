import type { AgentNodeType } from "@/lib/schemas/agents";

export type DummyNodeResult = {
  mode: "dummy";
  message: string;
};

export function executeDummyNode(
  type: AgentNodeType,
  reactFlowId: string,
): DummyNodeResult {
  return {
    mode: "dummy",
    message: `Executed ${type} node (${reactFlowId})`,
  };
}
