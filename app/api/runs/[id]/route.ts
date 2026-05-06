import { NextResponse } from "next/server";
import { loadRunDetail } from "@/lib/runs/load-run";
import { uuidRouteParamSchema } from "@/lib/schemas/route-params";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const raw = await ctx.params;
    const parsed = uuidRouteParamSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid run id" }, { status: 400 });
    }
    const { id } = parsed.data;

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const detail = await loadRunDetail(supabase, id);
    if (!detail) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const agents = detail.run.agents as { name: string } | { name: string }[] | null;
    const agentName = Array.isArray(agents) ? agents[0]?.name : agents?.name;

    return NextResponse.json({
      run: {
        id: detail.run.id,
        agentId: detail.run.agent_id,
        agentName: agentName ?? "Agent",
        status: detail.run.status,
        output: detail.run.output,
        error: detail.run.error,
        triggerRunId: detail.run.trigger_run_id,
        createdAt: detail.run.created_at,
        startedAt: detail.run.started_at,
        completedAt: detail.run.completed_at,
      },
      steps: detail.steps,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
