import { NextResponse } from "next/server";
import { createAgentBodySchema } from "@/lib/schemas/agents";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("agents")
      .select("id, name, description, mission, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ agents: data ?? [] });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = createAgentBodySchema.safeParse(json);
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

    const { data: agent, error: agentErr } = await supabase
      .from("agents")
      .insert({
        user_id: user.id,
        name: body.name,
        description: body.description ?? null,
        mission: body.mission ?? null,
      })
      .select("id")
      .single();

    if (agentErr || !agent) {
      return NextResponse.json(
        { error: agentErr?.message ?? "Failed to create agent" },
        { status: 500 },
      );
    }

    const { data: version, error: verErr } = await supabase
      .from("agent_versions")
      .insert({ agent_id: agent.id, version: 1, config: {} })
      .select("id")
      .single();

    if (verErr || !version) {
      return NextResponse.json(
        { error: verErr?.message ?? "Failed to create version" },
        { status: 500 },
      );
    }

    if (body.nodes.length) {
      const rows = body.nodes.map((n) => ({
        version_id: version.id,
        react_flow_id: n.id,
        type: n.type,
        label: n.label ?? n.type,
        position_x: n.position.x,
        position_y: n.position.y,
        data: n.data ?? {},
      }));
      const { error: nErr } = await supabase.from("agent_nodes").insert(rows);
      if (nErr) {
        return NextResponse.json({ error: nErr.message }, { status: 500 });
      }
    }

    if (body.edges.length) {
      const rows = body.edges.map((e) => ({
        version_id: version.id,
        react_flow_id: e.id,
        source_node: e.source,
        target_node: e.target,
        source_handle: e.sourceHandle ?? null,
        target_handle: e.targetHandle ?? null,
      }));
      const { error: eErr } = await supabase.from("agent_edges").insert(rows);
      if (eErr) {
        return NextResponse.json({ error: eErr.message }, { status: 500 });
      }
    }

    return NextResponse.json({ id: agent.id, versionId: version.id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
