import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RunStatusCard } from "@/components/runs/run-status-card";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function RunsPage() {
  type RunRow = {
    id: string;
    agent_id: string;
    status: string;
    output: unknown;
    error: string | null;
    trigger_run_id: string | null;
    created_at: string;
    completed_at: string | null;
    agents: { name: string } | { name: string }[] | null;
  };

  let runs: RunRow[] = [];
  try {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase
      .from("agent_runs")
      .select(
        `
        id,
        agent_id,
        status,
        output,
        error,
        trigger_run_id,
        created_at,
        completed_at,
        agents ( name )
      `,
      )
      .order("created_at", { ascending: false })
      .limit(50);
    runs = (data as unknown as RunRow[]) ?? [];
  } catch {
    runs = [];
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Runs</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Every run stores steps, outputs, and errors in Supabase.
        </p>
      </div>
      {runs.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No runs yet</CardTitle>
            <CardDescription>
              Open an agent and use Run now — dummy execution completes immediately in local
              mode.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <ul className="space-y-3">
          {runs.map((r) => {
            const agentRel = r.agents;
            const agentName = Array.isArray(agentRel)
              ? agentRel[0]?.name
              : agentRel?.name;
            return (
            <li key={r.id}>
              <RunStatusCard
                id={r.id}
                agentName={agentName ?? "Agent"}
                status={r.status}
                createdAt={r.created_at}
                completedAt={r.completed_at}
                error={r.error}
                output={r.output}
                triggerRunId={r.trigger_run_id}
              />
            </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
