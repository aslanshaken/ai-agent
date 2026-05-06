import { task } from "@trigger.dev/sdk/v3";

/**
 * Placeholder for scheduled agent ticks — replace with per-agent schedule fan-out.
 */
export const scheduledAgentTick = task({
  id: "scheduled-agent-tick",
  run: async () => {
    return { ok: true as const, at: new Date().toISOString() };
  },
});
