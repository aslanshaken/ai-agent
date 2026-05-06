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

export default async function DashboardPage() {
  let agentCount = 0;
  let runCount = 0;
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { count: a } = await supabase
        .from("agents")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      agentCount = a ?? 0;
      const { count: r } = await supabase
        .from("agent_runs")
        .select("id", { count: "exact", head: true });
      runCount = r ?? 0;
    }
  } catch {
    // Supabase not configured
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Visual workflows, scheduled runs, and approvals — not a chat-first product.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Agents</CardTitle>
            <CardDescription>Operational AI workflows you own.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <span className="text-3xl font-semibold tabular-nums">{agentCount}</span>
            <Link href="/agents/new" className={buttonClassName("default", "sm")}>
              New agent
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Runs</CardTitle>
            <CardDescription>Every execution is logged end-to-end.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <span className="text-3xl font-semibold tabular-nums">{runCount}</span>
            <Link href="/runs" className={buttonClassName("secondary", "sm")}>
              View runs
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
