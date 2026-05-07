import type { Edge, Node } from "reactflow";
import {
  agentEdgeSchema,
  agentNodeSchema,
  nodeTypes,
  type AgentNodeType,
} from "@/lib/schemas/agents";

function isAgentNodeType(t: string): t is AgentNodeType {
  return (nodeTypes as readonly string[]).includes(t);
}

export function serializeFlow(nodes: Node[], edges: Edge[]) {
  const mappedNodes = nodes.map((n) => {
    const type = typeof n.type === "string" && isAgentNodeType(n.type) ? n.type : "ai_reasoning";
    const data =
      n.data && typeof n.data === "object" && !Array.isArray(n.data)
        ? (n.data as Record<string, unknown>)
        : {};
    const label =
      typeof data.label === "string" ? data.label : (type as string);
    return {
      id: n.id,
      type,
      position: n.position,
      data,
      label,
    };
  });

  const mappedEdges = edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle ?? null,
    targetHandle: e.targetHandle ?? null,
  }));

  const nodesParsed = mappedNodes.map((n) => agentNodeSchema.parse(n));
  const edgesParsed = mappedEdges.map((e) => agentEdgeSchema.parse(e));

  return { nodes: nodesParsed, edges: edgesParsed };
}
