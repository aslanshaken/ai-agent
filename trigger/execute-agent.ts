import { task } from "@trigger.dev/sdk/v3";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { processAgentRun } from "@/lib/agents/process-run";

export const executeAgentTask = task({
  id: "execute-agent",
  run: async (payload: { runId: string }) => {
    const supabase = createServiceRoleSupabaseClient();
    const result = await processAgentRun(supabase, payload.runId);
    if (!result.ok) {
      throw new Error(result.error);
    }
    return { runId: payload.runId, status: "completed" as const };
  },
});
