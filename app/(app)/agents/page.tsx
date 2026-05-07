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
              Start with the Founder Daily Briefing blueprint — search, synthesize, rank, approve,
              and save your morning digest.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Link
              href="/agents/new?template=founder-daily-briefing"
              className={buttonClassName("default", "sm")}
            >
              Founder Daily Briefing
            </Link>
            <Link href="/agents/new" className={buttonClassName("outline", "sm")}>
              Other templates
            </Link>
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((a) => (
            <li key={a.id}>
              <Link href={`/agents/${a.id}`}>
                <Card className="transition-colors hover:border-zinc-400 dark:hover:border-zinc-600">
                  <CardHeader className="space-y-1 p-4 pb-2">
                    <CardTitle className="text-sm font-semibold leading-snug">{a.name}</CardTitle>
                    <CardDescription className="line-clamp-2 text-xs leading-snug">
                      {a.description || "No description"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-4 pb-3 pt-0 text-[11px] leading-tight text-zinc-500">
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
