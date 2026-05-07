import type { Edge, Node } from "reactflow";
import type { AgentNodeType } from "@/lib/schemas/agents";

function humanizeNodeType(t: string): string {
  const map: Record<string, string> = {
    trigger: "start",
    search: "web search",
    aggregate_results: "aggregate results",
    ai_reasoning: "AI reasoning",
    priority_ranker: "priority ranking",
    condition: "a condition branch",
    approval: "human approval",
    save_to_db: "save to database",
    notification: "notification",
    create_task: "create task",
    save_investor: "save investor",
    save_candidate: "save candidate",
    save_company: "save company",
  };
  return map[t] ?? t.replace(/_/g, " ");
}

/** BFS from trigger along edges; disconnected nodes appended after. */
export function orderedWorkflowTypes(nodes: Node[], edges: Edge[]): AgentNodeType[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const trigger = nodes.find((n) => n.type === "trigger");
  const out: AgentNodeType[] = [];
  const seen = new Set<string>();

  if (trigger) {
    const adj = new Map<string, string[]>();
    for (const e of edges) {
      if (!adj.has(e.source)) adj.set(e.source, []);
      adj.get(e.source)!.push(e.target);
    }
    const q = [trigger.id];
    while (q.length) {
      const id = q.shift()!;
      if (seen.has(id)) continue;
      seen.add(id);
      const n = byId.get(id);
      if (n?.type) out.push(n.type as AgentNodeType);
      for (const t of adj.get(id) ?? []) q.push(t);
    }
  }

  for (const n of nodes) {
    if (!seen.has(n.id) && n.type) out.push(n.type as AgentNodeType);
  }

  return out;
}

export function explainWorkflowFromGraph(nodes: Node[], edges: Edge[]): string {
  if (!nodes.length) {
    return "This workflow has no nodes yet. Open Workflow and add a trigger and steps.";
  }

  const types = orderedWorkflowTypes(nodes, edges);
  if (!types.length) {
    return "Could not determine workflow order. Ensure you have a trigger node connected to other steps.";
  }

  const phrases = types.map((t) => humanizeNodeType(t));
  const hasApproval = types.includes("approval");
  const hasSave = types.includes("save_to_db");

  let body = `This agent flows through: ${phrases.join(" → ")}.`;
  if (hasApproval) {
    body += " It pauses for human approval before continuing.";
  }
  if (hasSave) {
    body += " It persists results with a save-to-database step.";
  }
  if (!hasApproval && (types.includes("notification") || types.includes("save_to_db"))) {
    body +=
      " Consider adding an approval step before external writes if outputs need review.";
  }

  return body;
}

function nodeTypesSet(nodes: Node[]): Set<string> {
  return new Set(nodes.map((n) => (typeof n.type === "string" ? n.type : "")).filter(Boolean));
}

export function suggestWorkflowImprovements(
  nodes: Node[],
  edges: Edge[],
  scheduleEnabled: boolean,
): string[] {
  const types = nodeTypesSet(nodes);
  const suggestions: string[] = [];

  if (!types.has("trigger")) {
    suggestions.push("Add a trigger node as the entry point.");
  }

  if (types.has("ai_reasoning") && !types.has("save_to_db")) {
    suggestions.push("Add a save_to_db (or domain save) step after reasoning so outputs are retained.");
  }

  if (
    (types.has("save_to_db") || types.has("notification")) &&
    !types.has("approval")
  ) {
    suggestions.push("Add an approval node before risky writes or notifications so you can review first.");
  }

  const searchNodes = nodes.filter((n) => n.type === "search");
  for (const n of searchNodes) {
    const data = n.data as Record<string, unknown> | undefined;
    const q = typeof data?.query === "string" ? data.query.trim() : "";
    if (!q) {
      suggestions.push("Set explicit search queries on search nodes (avoid empty defaults).");
      break;
    }
  }

  if (!scheduleEnabled) {
    suggestions.push("Enable a schedule if this agent should run automatically (Schedule drawer).");
  }

  if (!edges.length && nodes.length > 1) {
    suggestions.push("Connect nodes with edges so execution order matches your intent.");
  }

  const deduped = [...new Set(suggestions)];
  return deduped.slice(0, 4);
}

/** Short chat line when a step completes (deterministic; avoids repeating every poll). */
export function stepCompletionChatMessage(step: {
  node_type: string;
  status: string;
}): string | null {
  if (step.status !== "completed") return null;
  switch (step.node_type) {
    case "search":
      return "Search completed.";
    case "aggregate_results":
      return "Results aggregated.";
    case "ai_reasoning":
      return "AI reasoning completed.";
    case "priority_ranker":
      return "Priorities ranked.";
    case "approval":
      return "Approval step finished.";
    case "save_to_db":
      return "Saved result.";
    case "notification":
      return "Notification sent.";
    case "create_task":
      return "Task created.";
    default:
      return `${humanizeNodeType(step.node_type)} completed.`;
  }
}

export type WorkflowHealthSnapshot = {
  nodeCount: number;
  hasApprovalNode: boolean;
  hasSaveToDb: boolean;
};

export function analyzeWorkflowHealth(nodes: Node[]): WorkflowHealthSnapshot {
  const types = nodeTypesSet(nodes);
  return {
    nodeCount: nodes.length,
    hasApprovalNode: types.has("approval"),
    hasSaveToDb: types.has("save_to_db"),
  };
}
