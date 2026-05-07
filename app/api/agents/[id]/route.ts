import { NextResponse } from "next/server";
import { updateAgentBodySchema } from "@/lib/schemas/agents";
import { uuidRouteParamSchema } from "@/lib/schemas/route-params";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type Ctx = { params: Promise<{ id: string }> };

async function getLatestVersionId(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  agentId: string,
) {
  const { data, error } = await supabase
    .from("agent_versions")
    .select("id")
    .eq("agent_id", agentId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return { error: error.message, versionId: null as string | null };
  return { error: null, versionId: data?.id ?? null };
}

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const rawParams = await ctx.params;
    const parsedParams = uuidRouteParamSchema.safeParse(rawParams);
    if (!parsedParams.success) {
      return NextResponse.json({ error: "Invalid agent id" }, { status: 400 });
    }
    const { id } = parsedParams.data;

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: agent, error: aErr } = await supabase
      .from("agents")
      .select(
        "id, name, description, mission, memory_categories, permission_profile, updated_at",
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (aErr || !agent) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { versionId, error: vErr } = await getLatestVersionId(supabase, id);
    if (vErr || !versionId) {
      return NextResponse.json(
        { error: vErr ?? "No version" },
        { status: 404 },
      );
    }

    const { data: nodes } = await supabase
      .from("agent_nodes")
      .select("react_flow_id, type, label, position_x, position_y, data")
      .eq("version_id", versionId);

    const { data: edges } = await supabase
      .from("agent_edges")
      .select("react_flow_id, source_node, target_node, source_handle, target_handle")
      .eq("version_id", versionId);

    return NextResponse.json({
      agent,
      versionId,
      nodes:
        nodes?.map((n) => ({
          id: n.react_flow_id,
          type: n.type,
          label: n.label,
          position: { x: n.position_x, y: n.position_y },
          data: (n.data as Record<string, unknown>) ?? {},
        })) ?? [],
      edges:
        edges?.map((e) => ({
          id: e.react_flow_id,
          source: e.source_node,
          target: e.target_node,
          sourceHandle: e.source_handle,
          targetHandle: e.target_handle,
        })) ?? [],
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const rawParams = await ctx.params;
    const parsedParams = uuidRouteParamSchema.safeParse(rawParams);
    if (!parsedParams.success) {
      return NextResponse.json({ error: "Invalid agent id" }, { status: 400 });
    }
    const { id } = parsedParams.data;

    const json = await req.json();
    const parsed = updateAgentBodySchema.safeParse(json);
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

    const { data: agent, error: aErr } = await supabase
      .from("agents")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (aErr || !agent) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.mission !== undefined) updates.mission = body.mission;
    if (body.memory_categories !== undefined) updates.memory_categories = body.memory_categories;
    if (body.permission_profile !== undefined)
      updates.permission_profile = body.permission_profile;

    if (Object.keys(updates).length > 1) {
      const { error: uErr } = await supabase
        .from("agents")
        .update(updates)
        .eq("id", id);
      if (uErr) {
        return NextResponse.json({ error: uErr.message }, { status: 500 });
      }
    }

    const { versionId, error: vErr } = await getLatestVersionId(supabase, id);
    if (vErr || !versionId) {
      return NextResponse.json({ error: "No version" }, { status: 400 });
    }

    if (body.nodes !== undefined || body.edges !== undefined) {
      await supabase.from("agent_nodes").delete().eq("version_id", versionId);
      await supabase.from("agent_edges").delete().eq("version_id", versionId);

      if (body.nodes?.length) {
        const rows = body.nodes.map((n) => ({
          version_id: versionId,
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

      if (body.edges?.length) {
        const rows = body.edges.map((e) => ({
          version_id: versionId,
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
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
