import type { Edge, Node } from "reactflow";

/** Horizontal gap between node anchors (wide cards + margin). */
export const WORKFLOW_LAYOUT_STEP_X = 440;
export const WORKFLOW_LAYOUT_ROW_GAP = 200;
export const WORKFLOW_LAYOUT_BASE_X = 64;
export const WORKFLOW_LAYOUT_BASE_Y = 88;

/**
 * Places nodes on a single row, left → right, using a topological walk of edges.
 * Unreachable / cyclic leftovers append in stable id order.
 */
export function layoutWorkflowLeftToRight(nodes: Node[], edges: Edge[]): Node[] {
  if (nodes.length === 0) return nodes;

  const idList = nodes.map((n) => n.id);
  const idSet = new Set(idList);
  const incoming = new Map<string, number>();
  for (const id of idList) incoming.set(id, 0);
  for (const e of edges) {
    if (!idSet.has(e.source) || !idSet.has(e.target)) continue;
    incoming.set(e.target, (incoming.get(e.target) ?? 0) + 1);
  }

  const order: string[] = [];
  const queue = idList.filter((id) => (incoming.get(id) ?? 0) === 0).sort((a, b) => a.localeCompare(b));

  while (queue.length > 0) {
    const id = queue.shift()!;
    order.push(id);
    for (const e of edges) {
      if (e.source !== id || !idSet.has(e.target)) continue;
      const t = e.target;
      const next = (incoming.get(t) ?? 0) - 1;
      incoming.set(t, next);
      if (next === 0) {
        queue.push(t);
        queue.sort((a, b) => a.localeCompare(b));
      }
    }
  }

  const seen = new Set(order);
  for (const id of idList.sort((a, b) => a.localeCompare(b))) {
    if (!seen.has(id)) order.push(id);
  }

  const indexById = new Map(order.map((id, i) => [id, i]));
  return nodes.map((n) => ({
    ...n,
    position: {
      x: WORKFLOW_LAYOUT_BASE_X + (indexById.get(n.id) ?? 0) * WORKFLOW_LAYOUT_STEP_X,
      y: WORKFLOW_LAYOUT_BASE_Y,
    },
  }));
}
