import { NextResponse } from "next/server";
import { sortAgentTemplates, type AgentTemplateRow } from "@/lib/agent-templates";
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
      .from("agent_templates")
      .select(
        "id, slug, name, description, category, tags, default_mission, default_nodes, default_edges, default_schedule, estimated_runtime, tools_summary, schedule_hint",
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const templates = sortAgentTemplates((data ?? []) as AgentTemplateRow[]);
    return NextResponse.json({ templates });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
