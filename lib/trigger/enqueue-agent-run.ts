import { tasks } from "@trigger.dev/sdk/v3";

const TASK_ID = "execute-agent";

export async function enqueueAgentRun(payload: { runId: string }) {
  const secret = process.env.TRIGGER_SECRET_KEY;
  const project = process.env.TRIGGER_PROJECT_ID;
  if (!secret || !project || project === "proj_placeholder") {
    return { mode: "local" as const };
  }

  const handle = await tasks.trigger(TASK_ID, payload);
  return { mode: "trigger" as const, triggerRunId: handle.id };
}
