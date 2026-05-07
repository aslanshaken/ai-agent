import { schedules } from "@trigger.dev/sdk/v3";
import { processDueSchedules } from "@/lib/scheduling/process-due-schedules";

/**
 * Polls DB every 5 minutes for due `agent_schedules` rows and starts runs via the same path as
 * “Run now” (Trigger.dev execute-agent task or inline dev execution).
 */
export const scheduleRunnerTick = schedules.task({
  id: "schedule-runner-tick",
  cron: "*/5 * * * *",
  run: async () => {
    const result = await processDueSchedules();
    return result;
  },
});
