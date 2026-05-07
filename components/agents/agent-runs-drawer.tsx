"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Drawer } from "@/components/ui/drawer";
import { cn } from "@/lib/utils/cn";

type ApiRun = {
  id: string;
  agentName: string;
  status: string;
  createdAt: string;
  error: string | null;
};

function formatStatus(s: string) {
  return s.replace(/_/g, " ");
}

export function AgentRunsDrawer({
  open,
  onClose,
  agentId,
}: {
  open: boolean;
  onClose: () => void;
  agentId: string;
}) {
  const [runs, setRuns] = useState<ApiRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setErr(null);
    void (async () => {
      try {
        const res = await fetch(
          `/api/runs?agentId=${encodeURIComponent(agentId)}&limit=50`,
          { credentials: "include" },
        );
        const data = (await res.json()) as { runs?: ApiRun[]; error?: string };
        if (!res.ok) throw new Error(data.error ?? "Failed to load runs");
        if (!cancelled) setRuns(data.runs ?? []);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, agentId]);

  return (
    <Drawer open={open} onClose={onClose} title="Runs" widthClassName="max-w-md">
      {loading ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
      ) : err ? (
        <p className="text-sm text-red-600">{err}</p>
      ) : runs.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No runs for this agent yet.</p>
      ) : (
        <ul className="space-y-2">
          {runs.map((r) => (
            <li key={r.id}>
              <Link
                href={`/runs/${r.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg border border-zinc-200 bg-zinc-50/80 px-3 py-2.5 text-sm transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900/40 dark:hover:bg-zinc-900"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                    {r.id.slice(0, 8)}…
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize",
                      r.status === "completed"
                        ? "bg-emerald-500/15 text-emerald-900 dark:text-emerald-200"
                        : r.status === "failed"
                          ? "bg-red-500/15 text-red-900 dark:text-red-200"
                          : r.status === "waiting_for_approval"
                            ? "bg-orange-500/15 text-orange-900 dark:text-orange-200"
                            : "bg-zinc-500/15 text-zinc-800 dark:text-zinc-200",
                    )}
                  >
                    {formatStatus(r.status)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {new Date(r.createdAt).toLocaleString()}
                </p>
                {r.error ? (
                  <p className="mt-1 line-clamp-2 text-xs text-red-600">{r.error}</p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Drawer>
  );
}
