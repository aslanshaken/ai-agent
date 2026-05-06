import type { AgentNodeType } from "@/lib/schemas/agents";

export type GraphNodeRow = {
  react_flow_id: string;
  type: string;
  label?: string | null;
  data?: Record<string, unknown> | null;
};

export type GraphEdgeRow = {
  source_node: string;
  target_node: string;
};

/** Upstream node outputs for edges pointing into `targetNodeId`. */
export function collectUpstreamOutputs(
  targetNodeId: string,
  edges: GraphEdgeRow[],
  outputsByNodeId: Record<string, Record<string, unknown>>,
): Record<string, Record<string, unknown>> {
  const upstream: Record<string, Record<string, unknown>> = {};
  for (const e of edges) {
    if (e.target_node !== targetNodeId) continue;
    const chunk = outputsByNodeId[e.source_node];
    if (chunk !== undefined) upstream[e.source_node] = chunk;
  }
  return upstream;
}

/**
 * Orders nodes for execution using graph edges (Kahn topological sort).
 * Falls back to declaration order when there are no edges or a cycle is detected.
 */
export function orderNodesForExecution<T extends GraphNodeRow>(
  nodes: T[],
  edges: GraphEdgeRow[],
): T[] {
  if (!edges.length) return [...nodes];

  const ids = new Set(nodes.map((n) => n.react_flow_id));
  const incoming = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const n of nodes) {
    incoming.set(n.react_flow_id, 0);
    adj.set(n.react_flow_id, []);
  }

  for (const e of edges) {
    if (!ids.has(e.source_node) || !ids.has(e.target_node)) continue;
    adj.get(e.source_node)!.push(e.target_node);
    incoming.set(e.target_node, (incoming.get(e.target_node) ?? 0) + 1);
  }

  const queue = nodes
    .map((n) => n.react_flow_id)
    .filter((id) => (incoming.get(id) ?? 0) === 0);
  const orderedIds: string[] = [];

  while (queue.length) {
    const id = queue.shift()!;
    orderedIds.push(id);
    for (const t of adj.get(id) ?? []) {
      const next = (incoming.get(t) ?? 0) - 1;
      incoming.set(t, next);
      if (next === 0) queue.push(t);
    }
  }

  if (orderedIds.length !== nodes.length) {
    return [...nodes];
  }

  const byId = new Map(nodes.map((n) => [n.react_flow_id, n] as const));
  return orderedIds.map((id) => byId.get(id)!);
}

export function summarizePlan(
  ordered: Pick<GraphNodeRow, "react_flow_id" | "type">[],
): { nodeTypes: AgentNodeType[]; order: string[] } {
  return {
    nodeTypes: ordered.map((n) => n.type as AgentNodeType),
    order: ordered.map((n) => n.react_flow_id),
  };
}
