import { NextResponse } from "next/server";
import { processAgentRun } from "@/lib/agents/process-run";
import { uuidRouteParamSchema } from "@/lib/schemas/route-params";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type Ctx = { params: Promise<{ id: string }> };

/** Execute a stuck `pending` run inline (same worker as Trigger’s execute-agent task). */
export async function POST(_req: Request, ctx: Ctx) {
  try {
    const parsed = uuidRouteParamSchema.safeParse(await ctx.params);
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

    const { data: run, error } = await supabase
      .from("agent_runs")
      .select("id, status")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!run) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if ((run.status as string) !== "pending") {
      return NextResponse.json(
        { error: `Run is not pending (status: ${String(run.status)}).` },
        { status: 400 },
      );
    }

    const admin = createServiceRoleSupabaseClient();
    const result = await processAgentRun(admin, id);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
