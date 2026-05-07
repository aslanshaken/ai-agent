import type { Edge, Node } from "reactflow";

/** Horizontal gap between node anchors (~max card width + gutter). Tighter keeps the chain readable without huge pan. */
export const WORKFLOW_LAYOUT_STEP_X = 300;
export const WORKFLOW_LAYOUT_ROW_GAP = 200;
export const WORKFLOW_LAYOUT_BASE_X = 64;
export const WORKFLOW_LAYOUT_BASE_Y = 88;

/** Keep first occurrence only — duplicate React Flow ids break topo sort and spacing. */
export function dedupeNodesByIdPreserveOrder(nodes: Node[]): Node[] {
  const seen = new Set<string>();
  const out: Node[] = [];
  for (const n of nodes) {
    if (seen.has(n.id)) continue;
    seen.add(n.id);
    out.push(n);
  }
  return out;
}

function cmpTriggerFirst(byId: Map<string, Node>, a: string, b: string): number {
  const ta = byId.get(a)?.type;
  const tb = byId.get(b)?.type;
  if (ta === "trigger" && tb !== "trigger") return -1;
  if (tb === "trigger" && ta !== "trigger") return 1;
  return a.localeCompare(b);
}

/**
 * Places nodes on a single row, left → right, using a topological walk of edges.
 * Uses only edges whose endpoints exist on the canvas (stale edges ignored).
 */
export function layoutWorkflowLeftToRight(nodes: Node[], edges: Edge[]): Node[] {
  const uniqueNodes = dedupeNodesByIdPreserveOrder(nodes);
  if (uniqueNodes.length === 0) return uniqueNodes;

  const byId = new Map(uniqueNodes.map((n) => [n.id, n]));
  const idList = uniqueNodes.map((n) => n.id);
  const idSet = new Set(idList);
  const relevantEdges = edges.filter(
    (e) => idSet.has(e.source) && idSet.has(e.target) && e.source !== e.target,
  );
  const incoming = new Map<string, number>();
  for (const id of idList) incoming.set(id, 0);
  for (const e of relevantEdges) {
    incoming.set(e.target, (incoming.get(e.target) ?? 0) + 1);
  }

  const order: string[] = [];
  const queue = idList
    .filter((id) => (incoming.get(id) ?? 0) === 0)
    .sort((a, b) => cmpTriggerFirst(byId, a, b));

  while (queue.length > 0) {
    const id = queue.shift()!;
    order.push(id);
    for (const e of relevantEdges) {
      if (e.source !== id || !idSet.has(e.target)) continue;
      const t = e.target;
      const next = (incoming.get(t) ?? 0) - 1;
      incoming.set(t, next);
      if (next === 0) {
        queue.push(t);
        queue.sort((a, b) => cmpTriggerFirst(byId, a, b));
      }
    }
  }

  const seen = new Set(order);
  for (const id of idList.sort((a, b) => a.localeCompare(b))) {
    if (!seen.has(id)) order.push(id);
  }

  /** Start nodes always left — id sort alone can push `n-trigger-*` after `n-search-*`. */
  const triggerIds = order.filter((id) => byId.get(id)?.type === "trigger").sort((a, b) => a.localeCompare(b));
  const trigSet = new Set(triggerIds);
  const restIds = order.filter((id) => !trigSet.has(id));
  const finalOrder = [...triggerIds, ...restIds];

  /** Emit nodes in left→right order so React Flow lists match the visual pipeline. */
  return finalOrder.map((id, index) => {
    const n = byId.get(id);
    if (!n) return null;
    return {
      ...n,
      position: {
        x: WORKFLOW_LAYOUT_BASE_X + index * WORKFLOW_LAYOUT_STEP_X,
        y: WORKFLOW_LAYOUT_BASE_Y,
      },
    };
  }).filter((x): x is Node => x !== null);
}

