import type { SupabaseClient } from "@supabase/supabase-js";

/** Persists coarse run duration after completion (Phase 18). */
export async function recordAgentRunMetrics(supabase: SupabaseClient, runId: string) {
  const { data: row, error } = await supabase
    .from("agent_runs")
    .select("started_at, completed_at")
    .eq("id", runId)
    .maybeSingle();

  if (error || !row?.started_at) return;

  const start = new Date(row.started_at as string).getTime();
  const end = row.completed_at
    ? new Date(row.completed_at as string).getTime()
    : Date.now();
  const duration_ms = Math.max(0, Math.floor(end - start));

  await supabase.from("agent_run_metrics").upsert(
    {
      run_id: runId,
      duration_ms,
      provider_breakdown: {},
    },
    { onConflict: "run_id" },
  );
}
