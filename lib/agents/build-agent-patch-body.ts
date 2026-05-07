import type { Edge, Node } from "reactflow";
import { serializeFlow } from "@/lib/agents/serialize-flow";

/** Matches `AgentFlowEditorHandle.getSnapshot()` shape */
export type AgentFlowSnapshot = { nodes: Node[]; edges: Edge[] };

export type AgentFormFields = {
  name: string;
  description: string;
  mission: string;
  memoryCategoriesText: string;
  allowedNodeTypesText: string;
  riskLevel: string;
};

/** Builds PATCH `/api/agents/[id]` JSON body including graph + optional memory/permissions when agentId set. */
export function buildAgentPatchBody(
  fields: AgentFormFields,
  snap: AgentFlowSnapshot,
  agentId?: string,
): Record<string, unknown> {
  if (!fields.name.trim()) {
    throw new Error("Name is required.");
  }

  const { nodes, edges } = serializeFlow(snap.nodes, snap.edges);
  const memory_categories = fields.memoryCategoriesText
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const permission_profile: Record<string, unknown> = {};
  const allowed = fields.allowedNodeTypesText
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (allowed.length) permission_profile.allowed_node_types = allowed;
  const r = fields.riskLevel;
  if (r === "low" || r === "medium" || r === "high") {
    permission_profile.risk_level = r;
  }

  const body: Record<string, unknown> = {
    name: fields.name.trim(),
    description: fields.description.trim() || undefined,
    mission: fields.mission.trim() || undefined,
    nodes,
    edges,
  };

  if (agentId) {
    body.memory_categories = memory_categories;
    body.permission_profile = permission_profile;
  } else {
    if (memory_categories.length) body.memory_categories = memory_categories;
    if (Object.keys(permission_profile).length) body.permission_profile = permission_profile;
  }

  return body;
}
