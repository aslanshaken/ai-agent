import { tasks } from "@trigger.dev/sdk/v3";

const TASK_ID = "execute-agent";

function envTruthy(v: string | undefined): boolean {
  return v === "1" || v?.toLowerCase() === "true";
}

export async function enqueueAgentRun(payload: { runId: string }) {
  // Explicit: always run in the Next.js process (no Trigger.dev queue).
  if (envTruthy(process.env.TRIGGER_FORCE_INLINE)) {
    return { mode: "local" as const };
  }

  const secret = process.env.TRIGGER_SECRET_KEY;
  const project = process.env.TRIGGER_PROJECT_ID;
  if (!secret || !project || project === "proj_placeholder") {
    return { mode: "local" as const };
  }

  // Queue to Trigger.dev only on Vercel (preview/production) or when explicitly requested.
  // Local `next dev` / `next start` (any port) stay inline so runs finish without a Trigger worker.
  // Self-hosted Node: set TRIGGER_USE_CLOUD=true to use Trigger; otherwise execution stays in-process.
  const queueOnTrigger =
    process.env.VERCEL === "1" || envTruthy(process.env.TRIGGER_USE_CLOUD);
  if (!queueOnTrigger) {
    return { mode: "local" as const };
  }

  const handle = await tasks.trigger(TASK_ID, payload);
  return { mode: "trigger" as const, triggerRunId: handle.id };
}
