import { notFound } from "next/navigation";
import type { Edge, Node } from "reactflow";
import { AgentWorkspace } from "@/components/agents/agent-workspace";
import { loadAgentForUser } from "@/lib/agents/load-agent";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type PageProps = { params: Promise<{ id: string }> };

export default async function AgentDetailPage(props: PageProps) {
  const { id } = await props.params;
  let loaded: Awaited<ReturnType<typeof loadAgentForUser>> = null;

  let scheduleEnabled = false;
  let pendingApprovals = 0;
  let latestRunMeta: { id: string; status: string } | null = null;

  try {
    const supabase = await createServerSupabaseClient();
    loaded = await loadAgentForUser(supabase, id);
    if (loaded) {
      const { data: sched } = await supabase
        .from("agent_schedules")
        .select("enabled")
        .eq("agent_id", id)
        .maybeSingle();
      scheduleEnabled = sched?.enabled === true;

      const { count: ap } = await supabase
        .from("approvals")
        .select("id", { count: "exact", head: true })
        .eq("agent_id", id)
        .eq("status", "pending");
      pendingApprovals = ap ?? 0;

      const { data: lr } = await supabase
        .from("agent_runs")
        .select("id, status")
        .eq("agent_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lr) {
        latestRunMeta = { id: lr.id as string, status: lr.status as string };
      }
    }
  } catch {
    loaded = null;
  }

  if (!loaded) notFound();

  const rfNodes: Node[] = loaded.nodes.map((n) => ({
    id: n.id,
    type: n.type,
    position: n.position,
    data: n.data,
  }));

  const rfEdges: Edge[] = loaded.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle ?? undefined,
    targetHandle: e.targetHandle ?? undefined,
  }));

  return (
    <div className="space-y-6">
      <AgentWorkspace
        agentId={loaded.agent.id}
        pendingApprovalsCount={pendingApprovals}
        scheduleEnabled={scheduleEnabled}
        latestRun={latestRunMeta}
        initial={{
          name: loaded.agent.name,
          description: loaded.agent.description,
          mission: loaded.agent.mission,
          memory_categories: loaded.agent.memory_categories as string[] | null | undefined,
          permission_profile: loaded.agent.permission_profile as Record<string, unknown> | null,
          nodes: rfNodes,
          edges: rfEdges,
        }}
      />
    </div>
  );
}
