import type { SupabaseClient } from "@supabase/supabase-js";

export async function loadRunDetail(supabase: SupabaseClient, runId: string) {
  const { data: run, error: runErr } = await supabase
    .from("agent_runs")
    .select(
      `
      id,
      agent_id,
      version_id,
      status,
      output,
      error,
      trigger_run_id,
      created_at,
      started_at,
      completed_at,
      agents ( name )
    `,
    )
    .eq("id", runId)
    .maybeSingle();

  if (runErr || !run) return null;

  const { data: steps, error: stepErr } = await supabase
    .from("agent_run_steps")
    .select("id, step_index, node_type, node_id, status, output, error, created_at")
    .eq("run_id", runId)
    .order("step_index", { ascending: true });

  // Still return the run if steps fail (e.g. transient); UI shows empty steps.
  if (stepErr) {
    return { run, steps: [] };
  }

  return { run, steps: steps ?? [] };
}
