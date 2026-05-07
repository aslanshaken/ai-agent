import type { SupabaseClient } from "@supabase/supabase-js";
import { enqueueOrExecuteAgentRun } from "@/lib/agents/runtime";
import { computeNextAfterFire } from "@/lib/scheduling/cron-helpers";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

const PG_UNIQUE_VIOLATION = "23505";

type DueSchedule = {
  id: string;
  agent_id: string;
  user_id: string;
  cron_expression: string;
  timezone: string;
  enabled: boolean;
  next_run_at: string;
};

async function latestVersionId(
  supabase: SupabaseClient,
  agentId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("agent_versions")
    .select("id")
    .eq("agent_id", agentId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

async function tryEnqueueAndAdvance(
  supabase: SupabaseClient,
  schedule: DueSchedule,
  runId: string,
  scheduledForIso: string,
): Promise<void> {
  const q = await enqueueOrExecuteAgentRun(supabase, runId);
  if (q.mode === "error") {
    // Drop the pending row so the next scheduler tick can recreate (enqueue retries).
    await supabase.from("agent_runs").delete().eq("id", runId);
    return;
  }

  const scheduledFor = new Date(scheduledForIso);
  const nextRunAt = computeNextAfterFire(
    schedule.cron_expression,
    schedule.timezone,
    scheduledFor,
  );

  await supabase
    .from("agent_schedules")
    .update({
      last_run_at: scheduledForIso,
      next_run_at: nextRunAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", schedule.id);
}

export async function processDueSchedules(): Promise<{
  examined: number;
  started: number;
  skipped: number;
}> {
  const supabase = createServiceRoleSupabaseClient();
  const nowIso = new Date().toISOString();

  const { data: due, error } = await supabase
    .from("agent_schedules")
    .select(
      "id, agent_id, user_id, cron_expression, timezone, enabled, next_run_at",
    )
    .eq("enabled", true)
    .not("next_run_at", "is", null)
    .lte("next_run_at", nowIso);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (due ?? []) as DueSchedule[];
  let started = 0;
  let skipped = 0;

  for (const schedule of rows) {
    const scheduledForIso = schedule.next_run_at;
    const versionId = await latestVersionId(supabase, schedule.agent_id);
    if (!versionId) {
      skipped += 1;
      continue;
    }

    const { data: inserted, error: insErr } = await supabase
      .from("agent_runs")
      .insert({
        agent_id: schedule.agent_id,
        version_id: versionId,
        status: "pending",
        source: "scheduled",
        schedule_id: schedule.id,
        scheduled_for: scheduledForIso,
      })
      .select("id")
      .maybeSingle();

    if (insErr?.code === PG_UNIQUE_VIOLATION) {
      // Another worker claimed this (schedule_id, scheduled_for) pair.
      skipped += 1;
      continue;
    }

    if (insErr || !inserted?.id) {
      skipped += 1;
      continue;
    }

    started += 1;
    await tryEnqueueAndAdvance(supabase, schedule, inserted.id, scheduledForIso);
  }

  return { examined: rows.length, started, skipped };
}
