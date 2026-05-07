import { NextResponse } from "next/server";
import { z } from "zod";
import { createGmailIntegrationStub } from "@/lib/integrations/gmail";
import { createTelegramIntegrationStub } from "@/lib/integrations/telegram";
import { createExaSearchClient } from "@/lib/integrations/exa";
import { createTavilySearchClient } from "@/lib/integrations/tavily";
import {
  INTEGRATION_PROVIDER_IDS,
  type IntegrationProviderId,
} from "@/lib/integrations/provider-ids";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const postBodySchema = z.object({
  provider: z.enum([...INTEGRATION_PROVIDER_IDS] as [IntegrationProviderId, ...IntegrationProviderId[]]),
});

function adapterIsConfigured(provider: IntegrationProviderId): boolean {
  switch (provider) {
    case "gmail":
      return createGmailIntegrationStub().isConfigured;
    case "telegram":
      return createTelegramIntegrationStub().isConfigured;
    case "exa":
      return createExaSearchClient().isConfigured;
    case "tavily":
      return createTavilySearchClient().isConfigured;
    default:
      return false;
  }
}

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

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => null);
    const parsed = postBodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }
    const { provider } = parsed.data;

    if (!adapterIsConfigured(provider)) {
      return NextResponse.json(
        { error: "Configure the integration API keys in your environment first." },
        { status: 400 },
      );
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: existingRows } = await supabase
      .from("tool_connections")
      .select("id, provider")
      .eq("user_id", user.id);

    const duplicate = existingRows?.some(
      (r) => (r.provider as string).toLowerCase() === provider,
    );
    if (duplicate) {
      return NextResponse.json({ error: "This integration is already added." }, { status: 409 });
    }

    const { data: row, error } = await supabase
      .from("tool_connections")
      .insert({
        user_id: user.id,
        provider,
        metadata: { registered_from: "integrations_ui", registered_at: new Date().toISOString() },
      })
      .select("id, provider, metadata, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ connection: row });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
