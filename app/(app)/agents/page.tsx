import Link from "next/link";
import { AgentListCard } from "@/components/agents/agent-list-card";
import { buttonClassName } from "@/components/ui/button";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function AgentsPage() {
  let agents: { id: string; name: string; description: string | null; updated_at: string }[] =
    [];
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("agents")
        .select("id, name, description, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      agents = data ?? [];
    }
  } catch {
    agents = [];
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Agents</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Database-driven workflows — nothing is hardcoded per use case.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/agents/templates" className={buttonClassName("outline", "sm")}>
            Templates
          </Link>
          <Link href="/agents/new" className={buttonClassName("default", "sm")}>
            Create agent
          </Link>
        </div>
      </div>
      {agents.length > 0 ? (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((a) => (
            <li key={a.id}>
              <AgentListCard
                id={a.id}
                name={a.name}
                description={a.description}
                updatedAt={a.updated_at}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
