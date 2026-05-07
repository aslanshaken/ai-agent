import { createGmailIntegrationStub } from "@/lib/integrations/gmail";
import { createTelegramIntegrationStub } from "@/lib/integrations/telegram";
import { createExaSearchClient } from "@/lib/integrations/exa";
import { createTavilySearchClient } from "@/lib/integrations/tavily";
import type { IntegrationProviderId } from "@/lib/integrations/provider-ids";
import { IntegrationDirectory } from "@/components/integrations/integration-directory";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function IntegrationsPage() {
  let connections: { id: string; provider: string; created_at: string }[] = [];
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("tool_connections")
        .select("id, provider, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      connections = data ?? [];
    }
  } catch {
    connections = [];
  }

  const gmail = createGmailIntegrationStub();
  const telegram = createTelegramIntegrationStub();
  const exa = createExaSearchClient();
  const tavily = createTavilySearchClient();

  const adapters: Record<IntegrationProviderId, boolean> = {
    gmail: gmail.isConfigured,
    telegram: telegram.isConfigured,
    exa: exa.isConfigured,
    tavily: tavily.isConfigured,
  };

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Tool adapters and workspace connections — driven by environment keys and your registry, not
          hardcoded agents.
        </p>
      </header>

      <IntegrationDirectory connections={connections} adapters={adapters} />
    </div>
  );
}
