import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
        <Link href="/agents/new" className={buttonClassName("default", "sm")}>
          Create agent
        </Link>
      </div>
      {agents.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No agents yet</CardTitle>
            <CardDescription>
              Connect Supabase and sign in, then create your first visual workflow.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {agents.map((a) => (
            <li key={a.id}>
              <Link href={`/agents/${a.id}`}>
                <Card className="transition-colors hover:border-zinc-400 dark:hover:border-zinc-600">
                  <CardHeader>
                    <CardTitle className="text-base">{a.name}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {a.description || "No description"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-xs text-zinc-500">
                    Updated {new Date(a.updated_at).toLocaleString()}
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
