import { AgentBuilderClient } from "@/components/agents/agent-builder-client";

export default function NewAgentPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Create agent</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Compose nodes on the canvas, connect edges, then save to Supabase.
        </p>
      </div>
      <AgentBuilderClient />
    </div>
  );
}
