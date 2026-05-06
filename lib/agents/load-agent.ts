import type { SupabaseClient } from "@supabase/supabase-js";

export async function loadAgentForUser(
  supabase: SupabaseClient,
  agentId: string,
) {
  const { data: agent, error: aErr } = await supabase
    .from("agents")
    .select("id, name, description, mission, updated_at")
    .eq("id", agentId)
    .single();

  if (aErr || !agent) return null;

  const { data: version } = await supabase
    .from("agent_versions")
    .select("id")
    .eq("agent_id", agentId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!version) {
    return { agent, versionId: null as string | null, nodes: [], edges: [] };
  }

  const { data: nodes } = await supabase
    .from("agent_nodes")
    .select("react_flow_id, type, label, position_x, position_y, data")
    .eq("version_id", version.id);

  const { data: edges } = await supabase
    .from("agent_edges")
    .select("react_flow_id, source_node, target_node, source_handle, target_handle")
    .eq("version_id", version.id);

  return {
    agent,
    versionId: version.id,
    nodes:
      nodes?.map((n) => ({
        id: n.react_flow_id,
        type: n.type,
        label: n.label,
        position: { x: n.position_x, y: n.position_y },
        data: {
          ...(typeof n.data === "object" && n.data ? (n.data as object) : {}),
          label: n.label,
        },
      })) ?? [],
    edges:
      edges?.map((e) => ({
        id: e.react_flow_id,
        source: e.source_node,
        target: e.target_node,
        sourceHandle: e.source_handle,
        targetHandle: e.target_handle,
      })) ?? [],
  };
}
