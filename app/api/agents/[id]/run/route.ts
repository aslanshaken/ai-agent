import { NextResponse } from "next/server";
import { enqueueOrExecuteAgentRun } from "@/lib/agents/runtime";
import { uuidRouteParamSchema } from "@/lib/schemas/route-params";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  try {
    const rawParams = await ctx.params;
    const parsedParams = uuidRouteParamSchema.safeParse(rawParams);
    if (!parsedParams.success) {
      return NextResponse.json({ error: "Invalid agent id" }, { status: 400 });
    }
    const { id: agentId } = parsedParams.data;
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: owned } = await supabase
      .from("agents")
      .select("id")
      .eq("id", agentId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!owned) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { data: version, error: vErr } = await supabase
      .from("agent_versions")
      .select("id")
      .eq("agent_id", agentId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (vErr || !version) {
      return NextResponse.json(
        { error: "No published version for this agent." },
        { status: 400 },
      );
    }

    const { data: run, error: rErr } = await supabase
      .from("agent_runs")
      .insert({
        agent_id: agentId,
        version_id: version.id,
        status: "pending",
      })
      .select("id")
      .single();

    if (rErr || !run) {
      return NextResponse.json(
        { error: rErr?.message ?? "Failed to create run" },
        { status: 500 },
      );
    }

    const result = await enqueueOrExecuteAgentRun(supabase, run.id);

    if (result.mode === "error") {
      return NextResponse.json({ error: result.message }, { status: 500 });
    }

    if (result.mode === "trigger") {
      return NextResponse.json({
        runId: run.id,
        mode: "trigger",
        triggerRunId: result.triggerRunId,
      });
    }

    return NextResponse.json({ runId: run.id, mode: "inline" });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
