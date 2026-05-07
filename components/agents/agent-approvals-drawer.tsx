"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ApprovalActions } from "@/components/approvals/approval-actions";
import { Drawer } from "@/components/ui/drawer";
import { cn } from "@/lib/utils/cn";

type ApprovalRow = {
  id: string;
  title: string;
  status: string;
  created_at: string;
  agent_id: string;
  run_id: string | null;
};

export function AgentApprovalsDrawer({
  open,
  onClose,
  agentId,
}: {
  open: boolean;
  onClose: () => void;
  agentId: string;
}) {
  const [rows, setRows] = useState<ApprovalRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [refetchKey, setRefetchKey] = useState(0);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setErr(null);
    void (async () => {
      try {
        const res = await fetch(
          `/api/approvals?agentId=${encodeURIComponent(agentId)}`,
          { credentials: "include" },
        );
        const data = (await res.json()) as { approvals?: ApprovalRow[]; error?: string };
        if (!res.ok) throw new Error(data.error ?? "Failed to load approvals");
        if (!cancelled) setRows(data.approvals ?? []);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, agentId, refetchKey]);

  return (
    <Drawer open={open} onClose={onClose} title="Approvals" widthClassName="max-w-md">
      {loading ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
      ) : err ? (
        <p className="text-sm text-red-600">{err}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No approvals for this agent.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li
              key={r.id}
              className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-900/40"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="min-w-0 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  {r.title}
                </p>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize",
                    r.status === "pending"
                      ? "bg-amber-100 text-amber-950 dark:bg-amber-950/50 dark:text-amber-100"
                      : r.status === "approved"
                        ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
                        : "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200",
                  )}
                >
                  {r.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {new Date(r.created_at).toLocaleString()}
              </p>
              {r.run_id ? (
                <div className="mt-2">
                  <Link
                    href={`/runs/${r.run_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-violet-600 underline-offset-4 hover:underline dark:text-violet-400"
                  >
                    View run
                  </Link>
                </div>
              ) : null}
              {r.status === "pending" ? (
                <div className="mt-3 border-t border-zinc-200 pt-3 dark:border-zinc-800">
                  <ApprovalActions
                    approvalId={r.id}
                    runId={r.run_id}
                    suppressRedirect
                    onSettled={() => setRefetchKey((k) => k + 1)}
                  />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Drawer>
  );
}
