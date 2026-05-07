import { NextResponse } from "next/server";
import { runQuerySchema } from "@/lib/schemas/runs";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = runQuerySchema.safeParse({
      limit: searchParams.get("limit") || undefined,
      agentId: searchParams.get("agentId") || undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const { limit, agentId } = parsed.data;

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (agentId) {
      const { data: own, error: ownErr } = await supabase
        .from("agents")
        .select("id")
        .eq("user_id", user.id)
        .eq("id", agentId)
        .maybeSingle();
      if (ownErr) {
        return NextResponse.json({ error: ownErr.message }, { status: 500 });
      }
      if (!own) {
        return NextResponse.json({ error: "Agent not found" }, { status: 404 });
      }
    }

    let q = supabase
      .from("agent_runs")
      .select(
        `
        id,
        agent_id,
        status,
        output,
        error,
        trigger_run_id,
        created_at,
        completed_at,
        source,
        scheduled_for,
        agents ( name )
      `,
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (agentId) {
      q = q.eq("agent_id", agentId);
    }

    const { data, error } = await q;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const runs =
      data?.map((r) => {
        const agents = r.agents as { name: string } | { name: string }[] | null;
        const name = Array.isArray(agents) ? agents[0]?.name : agents?.name;
        return {
          id: r.id,
          agentId: r.agent_id,
          agentName: name ?? "Agent",
          status: r.status,
          output: r.output,
          error: r.error,
          triggerRunId: r.trigger_run_id,
          createdAt: r.created_at,
          completedAt: r.completed_at,
          source: r.source,
          scheduledFor: r.scheduled_for,
        };
      }) ?? [];

    return NextResponse.json({ runs });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
