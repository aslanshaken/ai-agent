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
      source,
      schedule_id,
      scheduled_for,
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

  const { data: metrics, error: metricsErr } = await supabase
    .from("agent_run_metrics")
    .select("duration_ms, total_tokens, total_cost, provider_breakdown")
    .eq("run_id", runId)
    .maybeSingle();

  return {
    run,
    steps: stepErr ? [] : (steps ?? []),
    metrics: metricsErr ? null : metrics ?? null,
  };
}
