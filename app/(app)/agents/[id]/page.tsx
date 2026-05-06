import { notFound } from "next/navigation";
import type { Edge, Node } from "reactflow";
import { AgentBuilderClient } from "@/components/agents/agent-builder-client";
import { loadAgentForUser } from "@/lib/agents/load-agent";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type PageProps = { params: Promise<{ id: string }> };

export default async function AgentDetailPage(props: PageProps) {
  const { id } = await props.params;
  let loaded: Awaited<ReturnType<typeof loadAgentForUser>> = null;

  try {
    const supabase = await createServerSupabaseClient();
    loaded = await loadAgentForUser(supabase, id);
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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{loaded.agent.name}</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Edit the graph, save versions to Supabase, then run with Trigger.dev or inline stub.
        </p>
      </div>
      <AgentBuilderClient
        agentId={loaded.agent.id}
        initial={{
          name: loaded.agent.name,
          description: loaded.agent.description,
          mission: loaded.agent.mission,
          nodes: rfNodes,
          edges: rfEdges,
        }}
      />
    </div>
  );
}
