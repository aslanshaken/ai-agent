"use client";

import { Activity, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

function formatNodeType(nodeType: string): string {
  return nodeType.replace(/_/g, " ");
}

function stepSummary(step: {
  node_type: string;
  status: string;
}): string {
  const label = formatNodeType(step.node_type);
  const st = step.status;
  if (st === "running" || st === "pending") {
    return `Running ${label}`;
  }
  if (st === "completed") {
    return `${label} done`;
  }
  if (st === "failed") {
    return `${label} failed`;
  }
  return `${label} · ${st}`;
}

export type TimelineStep = {
  step_index: number;
  node_type: string;
  node_id: string;
  status: string;
  error: string | null;
  created_at: string;
};

export function AgentRunTimeline({
  steps,
  runStatus,
}: {
  steps: TimelineStep[];
  runStatus: string | null;
}) {
  if (!steps.length && !runStatus) return null;

  return (
    <div className="flex gap-3 py-1">
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-zinc-200/90 dark:bg-zinc-800">
        <Activity className="size-4 text-zinc-600 dark:text-zinc-300" aria-hidden />
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Live activity
        </p>
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70">
          {steps.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Waiting for steps…</p>
          ) : (
            <ul className="space-y-2">
              {steps.map((s) => {
                const active = s.status === "running" || s.status === "pending";
                const ok = s.status === "completed";
                return (
                  <li
                    key={`${s.step_index}-${s.node_id}`}
                    className="flex gap-2 rounded-xl bg-zinc-50/90 px-3 py-2 dark:bg-zinc-950/60"
                  >
                    <span className="mt-0.5 shrink-0">
                      {active ? (
                        <Loader2 className="size-4 animate-spin text-violet-600 dark:text-violet-400" />
                      ) : ok ? (
                        <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <span className="flex size-4 items-center justify-center rounded-full bg-zinc-300 text-[10px] dark:bg-zinc-600">
                          !
                        </span>
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        {stepSummary(s)}
                      </p>
                      <p className="text-[11px] capitalize text-zinc-500">{s.status}</p>
                      {s.error ? (
                        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{s.error}</p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {runStatus ? (
            <p className="mt-3 border-t border-zinc-100 pt-3 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              Status:{" "}
              <span className="font-semibold capitalize text-zinc-900 dark:text-zinc-100">
                {runStatus.replace(/_/g, " ")}
              </span>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
