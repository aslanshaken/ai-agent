"use client";

import { Activity, CheckCircle2, ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  humanizeStepOutput,
  safeStepJson,
  stepHasExpandableDetail,
} from "@/lib/runs/step-output-humanize";

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
  /** Present on runs fetched from the API; used for summaries and step announcements. */
  output?: unknown;
};

function TimelineStepCard({ step }: { step: TimelineStep }) {
  const active = step.status === "running" || step.status === "pending";
  const ok = step.status === "completed";
  const expandable = stepHasExpandableDetail(step);
  const human = step.output != null ? humanizeStepOutput(step.output) : "";
  const json = step.output !== undefined ? safeStepJson(step.output) : "";

  const header = (
    <>
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
      <div className="min-w-0 flex-1 text-left">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{stepSummary(step)}</p>
          {expandable ? (
            <ChevronDown
              className="size-4 shrink-0 text-zinc-400 transition-transform duration-200 group-open:rotate-180"
              aria-hidden
            />
          ) : null}
        </div>
        <p className="text-[11px] capitalize text-zinc-500">{step.status.replace(/_/g, " ")}</p>
      </div>
    </>
  );

  const body = (
    <div className="space-y-3 pt-1">
      {step.error ? (
        <p className="text-xs leading-relaxed text-red-600 dark:text-red-400">{step.error}</p>
      ) : null}

      {step.status === "waiting_for_approval" ? (
        <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-200">
          This step is waiting for you to approve or reject in the card below (or Approvals).
        </p>
      ) : null}

      {human ? (
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Summary
          </p>
          <p className="whitespace-pre-wrap text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
            {human}
          </p>
        </div>
      ) : step.status === "completed" && !step.error ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">No summary payload for this step.</p>
      ) : null}

      {step.output !== undefined && step.output !== null ? (
        <details className="group/json rounded-md border border-zinc-200 bg-zinc-50/90 dark:border-zinc-700 dark:bg-zinc-900/50">
          <summary
            className={cn(
              "cursor-pointer list-none px-2.5 py-1.5 text-[11px] font-medium text-zinc-600 dark:text-zinc-400",
              "[&::-webkit-details-marker]:hidden",
            )}
          >
            Raw output (JSON)
          </summary>
          <pre className="max-h-48 overflow-auto border-t border-zinc-200 p-2.5 text-[10px] leading-snug text-zinc-800 dark:border-zinc-700 dark:text-zinc-200">
            {json}
          </pre>
        </details>
      ) : null}
    </div>
  );

  if (!expandable) {
    return (
      <div className="flex gap-2 rounded-xl bg-zinc-50/90 px-3 py-2 dark:bg-zinc-950/60">{header}</div>
    );
  }

  return (
    <details className="group rounded-xl border border-zinc-200/80 bg-zinc-50/90 dark:border-zinc-800 dark:bg-zinc-950/60">
      <summary
        className={cn(
          "flex cursor-pointer list-none gap-2 px-3 py-2 outline-none transition hover:bg-zinc-100/80 dark:hover:bg-zinc-900/80",
          "[&::-webkit-details-marker]:hidden",
        )}
      >
        {header}
      </summary>
      <div className="border-t border-zinc-200/80 px-3 pb-3 dark:border-zinc-800">{body}</div>
    </details>
  );
}

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
              {steps.map((s) => (
                <li key={`${s.step_index}-${s.node_id}`}>
                  <TimelineStepCard step={s} />
                </li>
              ))}
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
