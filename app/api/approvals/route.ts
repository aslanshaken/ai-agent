import { NextResponse } from "next/server";
import { approvalsQuerySchema } from "@/lib/schemas/approvals";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = approvalsQuerySchema.safeParse({
      agentId: searchParams.get("agentId") || undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const { agentId } = parsed.data;

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
      .from("approvals")
      .select("id, title, status, created_at, agent_id, run_id")
      .order("created_at", { ascending: false })
      .limit(50);

    if (agentId) {
      q = q.eq("agent_id", agentId);
    }

    const { data, error } = await q;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ approvals: data ?? [] });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
