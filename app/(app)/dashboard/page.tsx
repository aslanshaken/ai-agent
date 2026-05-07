import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonClassName } from "@/components/ui/button";
import { jsonbToLines } from "@/lib/briefings/jsonb-to-lines";
import { groupTasksByDue, type TaskRow } from "@/lib/tasks/group-tasks";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function ListColumn({
  title,
  lines,
  empty,
}: {
  title: string;
  lines: string[];
  empty: string;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {title}
      </h3>
      {lines.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{empty}</p>
      ) : (
        <ul className="list-inside list-disc space-y-1.5 text-sm leading-snug text-zinc-800 dark:text-zinc-200">
          {lines.map((line, i) => (
            <li key={i} className="pl-0.5">
              {line}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default async function DashboardPage() {
  let agentCount = 0;
  let briefingCount = 0;
  let userRunTotal = 0;
  let pendingApprovals = 0;

  type BriefRow = {
    id: string;
    title: string;
    summary: string | null;
    priorities: unknown;
    opportunities: unknown;
    risks: unknown;
    recommendations: unknown;
    created_at: string;
    run_id: string | null;
  };

  let latestBrief: BriefRow | null = null;
  let taskRows: TaskRow[] = [];
  let recentRuns: {
    id: string;
    status: string;
    created_at: string;
    agentName: string;
  }[] = [];
  let researchRows: { id: string; title: string; created_at: string }[] = [];

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

      const { data: br } = await supabase
        .from("daily_briefings")
        .select(
          "id, title, summary, priorities, opportunities, risks, recommendations, created_at, run_id",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (br) latestBrief = br as BriefRow;

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

        const { data: runs } = await supabase
          .from("agent_runs")
          .select(
            `
            id,
            status,
            created_at,
            agents ( name )
          `,
          )
          .in("agent_id", ids)
          .order("created_at", { ascending: false })
          .limit(5);
        recentRuns =
          runs?.map((row) => {
            const rel = row.agents as { name: string } | { name: string }[] | null;
            const agentName = Array.isArray(rel) ? rel[0]?.name : rel?.name;
            return {
              id: row.id as string,
              status: row.status as string,
              created_at: row.created_at as string,
              agentName: agentName ?? "Agent",
            };
          }) ?? [];
      }

      const { data: rr } = await supabase
        .from("research_results")
        .select("id, title, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);
      researchRows =
        rr?.map((x) => ({
          id: x.id as string,
          title: (x.title as string) ?? "Research",
          created_at: x.created_at as string,
        })) ?? [];
    }
  } catch {
    // Supabase not configured
  }

  const grouped = groupTasksByDue(taskRows);
  const urgentTasks = [...grouped.overdue, ...grouped.dueToday].slice(0, 8);
  const priorityLines = latestBrief ? jsonbToLines(latestBrief.priorities, 10) : [];
  const opportunityLines = latestBrief ? jsonbToLines(latestBrief.opportunities, 10) : [];
  const riskLines = latestBrief ? jsonbToLines(latestBrief.risks, 8) : [];
  const recommendationLines = latestBrief ? jsonbToLines(latestBrief.recommendations, 8) : [];

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
          Founder OS
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{todayLabel}</p>
      </header>

      {showFirstRunOnboarding ? (
        <Card className="border-violet-300 bg-violet-50/90 dark:border-violet-900/60 dark:bg-violet-950/40">
          <CardHeader>
            <CardTitle className="text-lg">Create your first Founder Daily Briefing agent</CardTitle>
            <CardDescription>
              One workflow gives you search, synthesis, ranking, approval, and a saved morning digest
              on this page.
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

      <section className="space-y-3">
        <h2 className="sr-only">Today&apos;s briefing</h2>
        <Card className="overflow-hidden border-violet-200/90 shadow-sm dark:border-violet-900/50">
          <CardHeader className="border-b border-zinc-100 bg-gradient-to-br from-violet-50/90 to-white dark:border-zinc-800 dark:from-violet-950/40 dark:to-zinc-950">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <CardTitle className="text-xl">
                  {latestBrief ? latestBrief.title : "Your daily briefing"}
                </CardTitle>
                <CardDescription className="mt-1">
                  {latestBrief
                    ? `Updated ${new Date(latestBrief.created_at).toLocaleString()}`
                    : "Run the Founder Daily Briefing workflow on a schedule — your operational digest lands here."}
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/agents/new?template=founder-daily-briefing"
                  className={buttonClassName("default", "sm")}
                >
                  Set up briefing agent
                </Link>
                {latestBrief?.run_id ? (
                  <Link
                    href={`/runs/${latestBrief.run_id}`}
                    className={buttonClassName("secondary", "sm")}
                  >
                    Source run
                  </Link>
                ) : null}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {latestBrief?.summary ? (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Summary
                </h3>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
                  {latestBrief.summary}
                </p>
              </div>
            ) : null}

            {latestBrief ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <ListColumn
                  title="Top priorities"
                  lines={priorityLines}
                  empty="No priorities extracted — tune priority_ranker output."
                />
                <ListColumn
                  title="Opportunities"
                  lines={opportunityLines}
                  empty="None listed."
                />
                <ListColumn title="Risks" lines={riskLines} empty="None listed." />
                <ListColumn
                  title="Recommendations"
                  lines={recommendationLines}
                  empty="None listed."
                />
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>

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

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Important research</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {researchRows.length === 0 ? (
              <p className="text-zinc-500">No research rows yet.</p>
            ) : (
              <ul className="space-y-2">
                {researchRows.map((row) => (
                  <li key={row.id} className="flex justify-between gap-2">
                    <span className="min-w-0 truncate font-medium text-zinc-800 dark:text-zinc-200">
                      {row.title}
                    </span>
                    <span className="shrink-0 text-xs text-zinc-500">
                      {new Date(row.created_at).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/memory/research" className={buttonClassName("outline", "sm")}>
              Research library
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent runs</CardTitle>
            <CardDescription>Latest executions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {recentRuns.length === 0 ? (
              <p className="text-zinc-500">No runs yet.</p>
            ) : (
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {recentRuns.map((run) => (
                  <li key={run.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-zinc-50">{run.agentName}</p>
                      <p className="text-xs text-zinc-500">
                        {new Date(run.created_at).toLocaleString()} · {run.status}
                      </p>
                    </div>
                    <Link href={`/runs/${run.id}`} className={buttonClassName("ghost", "sm")}>
                      View
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/runs" className={buttonClassName("outline", "sm")}>
              All runs
            </Link>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card className="border-zinc-200/80 dark:border-zinc-800">
          <CardHeader>
            <CardTitle className="text-base">Upcoming meetings</CardTitle>
            <CardDescription>Calendar intelligence is on the roadmap.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-500">
              Connect Google Calendar later to surface meetings beside your briefing.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activity</CardTitle>
            <CardDescription>Total runs across your agents.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <span className="text-3xl font-semibold tabular-nums">{userRunTotal}</span>
            <Link href="/runs" className={buttonClassName("secondary", "sm")}>
              View runs
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
