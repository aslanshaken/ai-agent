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

type ApprovalPayload = {
  nodeId?: string;
  approvalNodeReactFlowId?: string;
  upstreamNodeIds?: string[];
  planOrder?: string[];
};

function payloadSummary(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "—";
  const p = payload as ApprovalPayload;
  const node = p.approvalNodeReactFlowId ?? p.nodeId ?? "—";
  const upstream = Array.isArray(p.upstreamNodeIds) ? p.upstreamNodeIds.length : 0;
  const plan = Array.isArray(p.planOrder) ? p.planOrder.length : 0;
  return `Node ${node} · ${upstream} upstream · plan ${plan} steps`;
}

export default async function ApprovalsPage() {
  type Row = {
    id: string;
    title: string;
    status: string;
    created_at: string;
    run_id: string | null;
    payload: unknown;
    agents: { name: string } | { name: string }[] | null;
  };

  let rows: Row[] = [];
  try {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase
      .from("approvals")
      .select(
        `
        id,
        title,
        status,
        created_at,
        run_id,
        payload,
        agents ( name )
      `,
      )
      .order("created_at", { ascending: false })
      .limit(50);
    rows = (data as Row[]) ?? [];
  } catch {
    rows = [];
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Approvals</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Human-in-the-loop gates. Approving resumes the agent run; rejecting cancels it.
        </p>
      </div>
      {rows.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Inbox empty</CardTitle>
            <CardDescription>
              Runs pause at approval nodes until you approve or reject. Create an agent that includes
              an approval step (the briefing template does).
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
            const payload = r.payload as ApprovalPayload | null;
            const nodeId = payload?.approvalNodeReactFlowId ?? payload?.nodeId ?? "—";
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
                      <div>
                        <dt className="font-medium text-zinc-500 dark:text-zinc-400">Run</dt>
                        <dd className="font-mono">{r.run_id ?? "—"}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-zinc-500 dark:text-zinc-400">Approval node</dt>
                        <dd className="font-mono">{nodeId}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-zinc-500 dark:text-zinc-400">Payload summary</dt>
                        <dd>{payloadSummary(r.payload)}</dd>
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
