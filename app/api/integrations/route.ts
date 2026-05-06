import { NextResponse } from "next/server";
import { createGmailIntegrationStub } from "@/lib/integrations/gmail";
import { createTelegramIntegrationStub } from "@/lib/integrations/telegram";
import { createExaSearchClient } from "@/lib/integrations/exa";
import { createTavilySearchClient } from "@/lib/integrations/tavily";
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

    const { data: connections, error } = await supabase
      .from("tool_connections")
      .select("id, provider, metadata, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      connections: connections ?? [],
      adapters: {
        gmail: createGmailIntegrationStub(),
        telegram: createTelegramIntegrationStub(),
        exa: createExaSearchClient(),
        tavily: createTavilySearchClient(),
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
