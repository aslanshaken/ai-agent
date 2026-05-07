import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ApprovalActions } from "@/components/approvals/approval-actions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";

function looksLikeAgentId(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

type PageProps = { searchParams: Promise<{ agentId?: string }> };

export default async function ApprovalsPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const rawAgentId = searchParams.agentId;
  const requestedFilter =
    typeof rawAgentId === "string" && looksLikeAgentId(rawAgentId) ? rawAgentId : null;

  type Row = {
    id: string;
    title: string;
    status: string;
    created_at: string;
    run_id: string | null;
    agents: { name: string } | { name: string }[] | null;
  };

  let rows: Row[] = [];
  let filterAgentName: string | null = null;
  let filterAgentId: string | null = null;

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user && requestedFilter) {
      const { data: ag } = await supabase
        .from("agents")
        .select("id, name")
        .eq("user_id", user.id)
        .eq("id", requestedFilter)
        .maybeSingle();
      if (ag) {
        filterAgentId = ag.id as string;
        filterAgentName = (ag.name as string) ?? null;
      }
    }

    let q = supabase
      .from("approvals")
      .select(
        `
        id,
        title,
        status,
        created_at,
        run_id,
        agents ( name )
      `,
      )
      .order("created_at", { ascending: false })
      .limit(50);

    if (filterAgentId) {
      q = q.eq("agent_id", filterAgentId);
    }

    const { data } = await q;
    rows = (data as Row[]) ?? [];
  } catch {
    rows = [];
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Approvals</h1>
        {filterAgentId ? (
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            <span className="font-medium text-zinc-800 dark:text-zinc-200">
              {filterAgentName ?? "Agent"}
            </span>
            {" · "}
            <Link
              href={`/agents/${filterAgentId}`}
              className="text-violet-600 underline-offset-4 hover:underline dark:text-violet-400"
            >
              Workspace
            </Link>
            {" · "}
            <Link
              href="/approvals"
              className="text-violet-600 underline-offset-4 hover:underline dark:text-violet-400"
            >
              All agents
            </Link>
          </p>
        ) : (
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Human-in-the-loop gates. Approving resumes the agent run; rejecting cancels it.
          </p>
        )}
      </div>
      {rows.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{filterAgentId ? "No approvals for this agent" : "Inbox empty"}</CardTitle>
            <CardDescription>
              {filterAgentId ? (
                <>
                  Nothing pending here —{" "}
                  <Link
                    href="/approvals"
                    className="font-medium text-violet-600 underline-offset-4 hover:underline dark:text-violet-400"
                  >
                    view all approvals
                  </Link>
                  .
                </>
              ) : (
                <>
                  Runs pause at approval nodes until you approve or reject. Create an agent that includes
                  an approval step (the briefing template does).
                </>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Link href="/agents/new?template=founder-daily-briefing" className={buttonClassName("default", "sm")}>
              Briefing template
            </Link>
            <Link href="/runs" className={buttonClassName("outline", "sm")}>
              View runs
            </Link>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => {
            const agentRel = r.agents;
            const agentName = Array.isArray(agentRel) ? agentRel[0]?.name : agentRel?.name;
            return (
              <li key={r.id} id={`approval-${r.id}`}>
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-base">{r.title}</CardTitle>
                        <CardDescription className="mt-1 space-y-0.5 text-xs">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 font-semibold capitalize ${
                              r.status === "pending"
                                ? "bg-amber-100 text-amber-950 dark:bg-amber-950/50 dark:text-amber-100"
                                : r.status === "approved"
                                  ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
                                  : "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200"
                            }`}
                          >
                            {r.status}
                          </span>
                          <span className="text-zinc-500">
                            {" "}
                            · {new Date(r.created_at).toLocaleString()}
                          </span>
                        </CardDescription>
                      </div>
                      {r.run_id ? (
                        <Link href={`/runs/${r.run_id}`} className={buttonClassName("outline", "sm")}>
                          View run
                        </Link>
                      ) : null}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <dl className="grid gap-1 text-xs text-zinc-700 dark:text-zinc-300">
                      <div>
                        <dt className="font-medium text-zinc-500 dark:text-zinc-400">Agent</dt>
                        <dd>{agentName ?? "—"}</dd>
                      </div>
                    </dl>
                    {r.status === "pending" ? (
                      <ApprovalActions approvalId={r.id} runId={r.run_id} />
                    ) : null}
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
