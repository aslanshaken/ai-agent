import type { Edge, Node } from "reactflow";
import type { AgentNodeType } from "@/lib/schemas/agents";
import { layoutWorkflowLeftToRight } from "@/lib/graph/layout-workflow-nodes";

/** Minimal `data` payloads so new nodes match `WorkflowNode` field expectations. */
export function defaultPayloadForNodeType(type: AgentNodeType): Record<string, unknown> {
  switch (type) {
    case "trigger":
      return { label: "Start" };
    case "search":
      return { label: "Search", query: "", limit: 5, provider: "exa" };
    case "aggregate_results":
      return { label: "Aggregate results" };
    case "ai_reasoning":
      return { label: "AI reasoning", instruction: "", outputFormat: "summary", model: "" };
    case "priority_ranker":
      return { label: "Priority ranker", instruction: "", model: "" };
    case "condition":
      return { label: "Condition" };
    case "approval":
      return { label: "Approval" };
    case "save_to_db":
      return {
        label: "Save to DB",
        target: "research_results",
        title: "",
        sourceNodeId: "",
        tags: "",
      };
    case "notification":
      return { label: "Notification" };
    case "create_task":
      return {
        label: "Create task",
        title: "",
        description: "",
        priority: "medium",
        due_date: "",
      };
    case "save_investor":
      return {
        label: "Save investor",
        name: "",
        fund: "",
        focus: "",
        stage: "",
        location: "",
        linkedin_url: "",
        website: "",
        reason: "",
        status: "new",
      };
    case "save_candidate":
      return {
        label: "Save candidate",
        name: "",
        role: "",
        skills: "",
        location: "",
        linkedin_url: "",
        github_url: "",
        reason: "",
        status: "new",
      };
    case "save_company":
      return {
        label: "Save company",
        name: "",
        industry: "",
        website: "",
        description: "",
        notes: "",
      };
  }
}

/**
 * Prefer the rightmost sink in the laid-out pipeline so new steps append to the main chain.
 */
export function pickDefaultAttachParent(nodes: Node[], edges: Edge[]): string | null {
  if (nodes.length === 0) return null;
  const ordered = layoutWorkflowLeftToRight([...nodes], edges).map((n) => n.id);
  const sinkIds = new Set(
    nodes.filter((n) => !edges.some((e) => e.source === n.id)).map((n) => n.id),
  );
  const effectiveSinks = sinkIds.size > 0 ? sinkIds : new Set(nodes.map((n) => n.id));
  let best: string | null = null;
  let bestI = -1;
  for (let i = 0; i < ordered.length; i++) {
    const id = ordered[i]!;
    if (!effectiveSinks.has(id)) continue;
    if (i > bestI) {
      bestI = i;
      best = id;
    }
  }
  return best ?? ordered[ordered.length - 1] ?? null;
}
