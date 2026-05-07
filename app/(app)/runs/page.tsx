import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonClassName } from "@/components/ui/button";
import { RunStatusCard } from "@/components/runs/run-status-card";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function looksLikeAgentId(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

type PageProps = { searchParams: Promise<{ agentId?: string }> };

export default async function RunsPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const rawAgentId = searchParams.agentId;
  const requestedFilter =
    typeof rawAgentId === "string" && looksLikeAgentId(rawAgentId) ? rawAgentId : null;

  type RunRow = {
    id: string;
    agent_id: string;
    status: string;
    output: unknown;
    error: string | null;
    trigger_run_id: string | null;
    created_at: string;
    completed_at: string | null;
    source?: string | null;
    scheduled_for?: string | null;
    agents: { name: string } | { name: string }[] | null;
  };

  let runs: RunRow[] = [];
  let filterAgentName: string | null = null;
  let filterAgentId: string | null = null;

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: agentRows } = await supabase
        .from("agents")
        .select("id")
        .eq("user_id", user.id);
      const agentIds = (agentRows ?? []).map((r) => r.id as string);

      if (requestedFilter && agentIds.includes(requestedFilter)) {
        filterAgentId = requestedFilter;
        const { data: named } = await supabase
          .from("agents")
          .select("name")
          .eq("user_id", user.id)
          .eq("id", requestedFilter)
          .maybeSingle();
        filterAgentName = (named?.name as string) ?? null;
      }

      const scopedAgentIds =
        filterAgentId ? agentIds.filter((id) => id === filterAgentId) : agentIds;

      if (scopedAgentIds.length > 0) {
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
            source,
            scheduled_for,
            agents ( name )
          `,
          )
          .in("agent_id", scopedAgentIds)
          .order("created_at", { ascending: false })
          .limit(50);
        runs = (data as unknown as RunRow[]) ?? [];
      }
    }
  } catch {
    runs = [];
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Runs</h1>
        {filterAgentId ? (
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            <span className="font-medium text-zinc-800 dark:text-zinc-200">
              {filterAgentName ?? "Agent"}
            </span>
            {" · "}
            <Link
              href={`/agents/${filterAgentId}`}
              className="text-violet-600 underline-offset-4 hover:underline dark:text-violet-400"
            >
              Workspace
            </Link>
            {" · "}
            <Link href="/runs" className="text-violet-600 underline-offset-4 hover:underline dark:text-violet-400">
              All agents
            </Link>
          </p>
        ) : (
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Every run stores steps, outputs, and errors in Supabase.
          </p>
        )}
      </div>
      {runs.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{filterAgentId ? "No runs for this agent yet" : "No runs yet"}</CardTitle>
            <CardDescription>
              {filterAgentId ? (
                <>
                  Trigger a run from this agent&apos;s workspace, or{" "}
                  <Link href="/runs" className="font-medium text-violet-600 underline-offset-4 hover:underline dark:text-violet-400">
                    view all runs
                  </Link>
                  .
                </>
              ) : (
                <>
                  Open one of your agents and press <span className="font-medium">Run now</span> to test
                  the workflow. You&apos;ll land on the run detail page to approve or review steps.
                </>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Link href="/agents" className={buttonClassName("default", "sm")}>
              Go to agents
            </Link>
            <Link
              href="/agents/new?template=founder-daily-briefing"
              className={buttonClassName("outline", "sm")}
            >
              Create briefing agent
            </Link>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
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
                source={r.source}
                scheduledFor={r.scheduled_for}
              />
            </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
