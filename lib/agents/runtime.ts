import type { SupabaseClient } from "@supabase/supabase-js";
import { enqueueAgentRun } from "@/lib/trigger/enqueue-agent-run";
import { processAgentRun } from "@/lib/agents/process-run";

/**
 * After an `agent_runs` row exists, either trigger Trigger.dev or execute inline (dev).
 */
export async function enqueueOrExecuteAgentRun(
  supabase: SupabaseClient,
  runId: string,
): Promise<
  | { mode: "trigger"; triggerRunId: string }
  | { mode: "inline" }
  | { mode: "error"; message: string }
> {
  try {
    const queued = await enqueueAgentRun({ runId });
    if (queued.mode === "trigger") {
      await supabase
        .from("agent_runs")
        .update({ trigger_run_id: queued.triggerRunId })
        .eq("id", runId);
      return { mode: "trigger", triggerRunId: queued.triggerRunId };
    }
    await processAgentRun(supabase, runId);
    return { mode: "inline" };
  } catch (e) {
    const message = e instanceof Error ? e.message : "enqueue failed";
    return { mode: "error", message };
  }
}
