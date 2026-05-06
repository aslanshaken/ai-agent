import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createGmailIntegrationStub } from "@/lib/integrations/gmail";
import { createTelegramIntegrationStub } from "@/lib/integrations/telegram";
import { createExaSearchClient } from "@/lib/integrations/exa";
import { createTavilySearchClient } from "@/lib/integrations/tavily";
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

  const adapters = [
    { name: "Gmail", configured: gmail.isConfigured },
    { name: "Telegram", configured: telegram.isConfigured },
    { name: "Exa", configured: exa.isConfigured },
    { name: "Tavily", configured: tavily.isConfigured },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Tool adapters and OAuth-backed connections — database-driven, not hardcoded agents.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Adapter status</CardTitle>
          <CardDescription>Environment keys only — no live OAuth flows in this MVP.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 sm:grid-cols-2">
            {adapters.map((a) => (
              <li
                key={a.name}
                className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
              >
                <span className="font-medium">{a.name}</span>
                <span className={a.configured ? "text-emerald-600" : "text-zinc-500"}>
                  {a.configured ? "Configured" : "Not set"}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Saved connections</CardTitle>
          <CardDescription>Rows in `tool_connections` for this user.</CardDescription>
        </CardHeader>
        <CardContent>
          {connections.length === 0 ? (
            <p className="text-sm text-zinc-500">No connections stored yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {connections.map((c) => (
                <li key={c.id} className="flex justify-between gap-2">
                  <span className="font-medium">{c.provider}</span>
                  <span className="text-xs text-zinc-500">
                    {new Date(c.created_at).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
