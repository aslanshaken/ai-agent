import type { SupabaseClient } from "@supabase/supabase-js";

type Db = SupabaseClient;

export async function insertRunStep(
  supabase: Db,
  params: {
    runId: string;
    stepIndex: number;
    nodeType: string | null;
    nodeId: string | null;
    output?: Record<string, unknown> | null;
    error?: string | null;
    status?: string;
  },
) {
  const { error } = await supabase.from("agent_run_steps").insert({
    run_id: params.runId,
    step_index: params.stepIndex,
    node_type: params.nodeType,
    node_id: params.nodeId,
    status: params.status ?? "completed",
    output: params.output ?? null,
    error: params.error ?? null,
  });
  if (error) throw new Error(error.message);
}

export type AgentRunTerminalStatus = "completed" | "failed" | "cancelled";
export type AgentRunPauseStatus = "waiting_for_approval";

export async function finalizeRun(
  supabase: Db,
  runId: string,
  patch: {
    status: AgentRunTerminalStatus;
    output?: Record<string, unknown> | null;
    error?: string | null;
  },
) {
  const { error } = await supabase
    .from("agent_runs")
    .update({
      status: patch.status,
      completed_at: new Date().toISOString(),
      output: patch.output ?? null,
      error: patch.error ?? null,
    })
    .eq("id", runId);
  if (error) throw new Error(error.message);
}

/** Pause run for human approval (no `completed_at`). */
export async function setRunWaitingForApproval(
  supabase: Db,
  runId: string,
  output: Record<string, unknown> | null,
) {
  const { error } = await supabase
    .from("agent_runs")
    .update({
      status: "waiting_for_approval",
      output: output ?? null,
      error: null,
    })
    .eq("id", runId);
  if (error) throw new Error(error.message);
}

export async function setRunRunning(supabase: Db, runId: string) {
  const { error } = await supabase
    .from("agent_runs")
    .update({
      status: "running",
      error: null,
    })
    .eq("id", runId);
  if (error) throw new Error(error.message);
}

export async function markRunFailed(supabase: Db, runId: string, message: string) {
  await finalizeRun(supabase, runId, {
    status: "failed",
    error: message,
  });
}

export async function markRunCancelled(
  supabase: Db,
  runId: string,
  output?: Record<string, unknown> | null,
) {
  await finalizeRun(supabase, runId, {
    status: "cancelled",
    output:
      output ??
      ({
        summary: "Run stopped after approval was rejected.",
      } as Record<string, unknown>),
    error: null,
  });
}

/**
 * Updates a single run step matched by run + node + current status (e.g. approval gate).
 */
export async function updateRunStepByNode(
  supabase: Db,
  params: {
    runId: string;
    nodeId: string;
    fromStatus: string;
    toStatus: string;
    output?: Record<string, unknown> | null;
    error?: string | null;
  },
): Promise<{ updated: boolean }> {
  const { data, error } = await supabase
    .from("agent_run_steps")
    .update({
      status: params.toStatus,
      output: params.output ?? null,
      error: params.error ?? null,
    })
    .eq("run_id", params.runId)
    .eq("node_id", params.nodeId)
    .eq("status", params.fromStatus)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return { updated: !!data };
}
