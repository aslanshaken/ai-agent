import { NextResponse } from "next/server";
import {
  computeNextRunUtc,
  inferPresetFromRow,
  resolveCronForPreset,
  describeCron,
} from "@/lib/scheduling/cron-helpers";
import { upsertAgentScheduleBodySchema } from "@/lib/schemas/schedule";
import { uuidRouteParamSchema } from "@/lib/schemas/route-params";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type Ctx = { params: Promise<{ id: string }> };

async function verifyAgentOwned(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
  agentId: string,
) {
  const { data } = await supabase
    .from("agents")
    .select("id")
    .eq("id", agentId)
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}

function serializeSchedule(row: {
  id: string;
  cron_expression: string;
  timezone: string;
  enabled: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  updated_at: string;
}) {
  const preset = inferPresetFromRow(row.enabled, row.cron_expression);
  return {
    id: row.id,
    cron_expression: row.cron_expression,
    timezone: row.timezone,
    enabled: row.enabled,
    last_run_at: row.last_run_at,
    next_run_at: row.next_run_at,
    updated_at: row.updated_at,
    preset,
    cron_preview: describeCron(row.cron_expression),
  };
}

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const rawParams = await ctx.params;
    const parsedParams = uuidRouteParamSchema.safeParse(rawParams);
    if (!parsedParams.success) {
      return NextResponse.json({ error: "Invalid agent id" }, { status: 400 });
    }
    const agentId = parsedParams.data.id;

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await verifyAgentOwned(supabase, user.id, agentId))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { data: row, error } = await supabase
      .from("agent_schedules")
      .select(
        "id, cron_expression, timezone, enabled, last_run_at, next_run_at, updated_at",
      )
      .eq("agent_id", agentId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      schedule: row ? serializeSchedule(row) : null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function upsertSchedule(req: Request, ctx: Ctx, method: "POST" | "PATCH") {
  try {
    const rawParams = await ctx.params;
    const parsedParams = uuidRouteParamSchema.safeParse(rawParams);
    if (!parsedParams.success) {
      return NextResponse.json({ error: "Invalid agent id" }, { status: 400 });
    }
    const agentId = parsedParams.data.id;

    const json = await req.json();
    const parsed = upsertAgentScheduleBodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const body = parsed.data;

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await verifyAgentOwned(supabase, user.id, agentId))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const resolved = resolveCronForPreset(body.preset, body.custom_cron);
    if ("error" in resolved) {
      return NextResponse.json({ error: resolved.error }, { status: 400 });
    }

    const effectiveEnabled = body.preset === "manual_only" ? false : body.enabled;

    let nextRunAt: string | null = null;
    if (effectiveEnabled) {
      nextRunAt = computeNextRunUtc(resolved.cron, body.timezone.trim()).toISOString();
    }

    const nowIso = new Date().toISOString();

    if (method === "PATCH") {
      const { data: existing } = await supabase
        .from("agent_schedules")
        .select("id")
        .eq("agent_id", agentId)
        .maybeSingle();

      if (!existing) {
        return NextResponse.json({ error: "No schedule to update" }, { status: 404 });
      }
    }

    const rowPayload: Record<string, unknown> = {
      user_id: user.id,
      agent_id: agentId,
      cron_expression: resolved.cron,
      timezone: body.timezone.trim(),
      enabled: effectiveEnabled,
      next_run_at: nextRunAt,
      updated_at: nowIso,
    };

    const { data: row, error } = await supabase
      .from("agent_schedules")
      .upsert(rowPayload, { onConflict: "agent_id" })
      .select(
        "id, cron_expression, timezone, enabled, last_run_at, next_run_at, updated_at",
      )
      .single();

    if (error || !row) {
      return NextResponse.json(
        { error: error?.message ?? "Failed to save schedule" },
        { status: 500 },
      );
    }

    return NextResponse.json({ schedule: serializeSchedule(row) });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request, ctx: Ctx) {
  return upsertSchedule(req, ctx, "POST");
}

export async function PATCH(req: Request, ctx: Ctx) {
  return upsertSchedule(req, ctx, "PATCH");
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const rawParams = await ctx.params;
    const parsedParams = uuidRouteParamSchema.safeParse(rawParams);
    if (!parsedParams.success) {
      return NextResponse.json({ error: "Invalid agent id" }, { status: 400 });
    }
    const agentId = parsedParams.data.id;

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await verifyAgentOwned(supabase, user.id, agentId))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { error } = await supabase.from("agent_schedules").delete().eq("agent_id", agentId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
