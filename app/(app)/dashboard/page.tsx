import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonClassName } from "@/components/ui/button";
import { groupTasksByDue, type TaskRow } from "@/lib/tasks/group-tasks";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  let agentCount = 0;
  let briefingCount = 0;
  let userRunTotal = 0;
  let pendingApprovals = 0;

  let taskRows: TaskRow[] = [];

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

      const { count: bc } = await supabase
        .from("daily_briefings")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      briefingCount = bc ?? 0;

      const { count: ap } = await supabase
        .from("approvals")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      pendingApprovals = ap ?? 0;

      const { data: tr } = await supabase
        .from("tasks")
        .select("id, title, description, status, priority, due_date, created_at")
        .eq("user_id", user.id)
        .in("status", ["pending", "in_progress"])
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(80);

      taskRows =
        (tr as TaskRow[] | null)?.map((t) => ({
          ...t,
          description: typeof t.description === "string" ? t.description : null,
        })) ?? [];

      const { data: agentIds } = await supabase.from("agents").select("id").eq("user_id", user.id);
      const ids = (agentIds ?? []).map((x) => x.id as string);
      if (ids.length) {
        const { count: ur } = await supabase
          .from("agent_runs")
          .select("id", { count: "exact", head: true })
          .in("agent_id", ids);
        userRunTotal = ur ?? 0;

      }
    }
  } catch {
    // Supabase not configured
  }

  const grouped = groupTasksByDue(taskRows);
  const urgentTasks = [...grouped.overdue, ...grouped.dueToday].slice(0, 8);

  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const showFirstRunOnboarding =
    agentCount === 0 && briefingCount === 0 && userRunTotal === 0;

  return (
    <div className="space-y-10">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-violet-600 dark:text-violet-400">
          Ai Agent Lab
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{todayLabel}</p>
      </header>

      {showFirstRunOnboarding ? (
        <Card className="border-violet-300 bg-violet-50/90 dark:border-violet-900/60 dark:bg-violet-950/40">
          <CardHeader>
            <CardTitle className="text-lg">Create your first Founder Daily Briefing agent</CardTitle>
            <CardDescription>
              One workflow gives you search, synthesis, ranking, approval, and a saved morning digest.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Link
              href="/agents/new?template=founder-daily-briefing"
              className={buttonClassName("default", "sm")}
            >
              Start from template
            </Link>
            <Link href="/agents/new" className={buttonClassName("outline", "sm")}>
              Browse all templates
            </Link>
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Approvals</CardTitle>
            <CardDescription>Items waiting for you.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <span className="text-3xl font-semibold tabular-nums">{pendingApprovals}</span>
            <Link href="/approvals" className={buttonClassName("secondary", "sm")}>
              Open inbox
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Urgent tasks</CardTitle>
            <CardDescription>Overdue and due today.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {urgentTasks.length === 0 ? (
              <p className="text-zinc-500">You&apos;re clear.</p>
            ) : (
              <ul className="space-y-2">
                {urgentTasks.map((t) => (
                  <li key={t.id} className="flex flex-col gap-0.5 border-b border-zinc-100 pb-2 last:border-0 dark:border-zinc-800">
                    <span className="font-medium text-zinc-900 dark:text-zinc-50">{t.title}</span>
                    <span className="text-xs text-zinc-500">
                      {t.priority}
                      {t.due_date
                        ? ` · ${new Date(t.due_date).toLocaleDateString()}`
                        : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Agents</CardTitle>
            <CardDescription>Workflows powering briefings and research.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <span className="text-3xl font-semibold tabular-nums">{agentCount}</span>
            <Link href="/agents" className={buttonClassName("outline", "sm")}>
              Manage agents
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
