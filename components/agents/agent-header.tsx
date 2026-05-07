"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export type WorkspaceHeaderStatus = "saved" | "unsaved" | "running" | "waiting_for_approval";

export function AgentHeader({
  name,
  initials,
  status,
  pendingApprovalsCount,
  onWorkflow,
  onDetails,
  onSchedule,
  onMemory,
  onRuns,
  onApprovals,
  emphasizeApprovals = false,
}: {
  name: string;
  initials: string;
  status: WorkspaceHeaderStatus;
  /** Primary styling on Approvals — use when this run is paused for approval. */
  emphasizeApprovals?: boolean;
  pendingApprovalsCount: number;
  onWorkflow: () => void;
  onDetails: () => void;
  onSchedule: () => void;
  onMemory: () => void;
  onRuns: () => void;
  onApprovals: () => void;
}) {
  const statusLabel: Record<WorkspaceHeaderStatus, string> = {
    saved: "Saved",
    unsaved: "Unsaved",
    running: "Running",
    waiting_for_approval: "Waiting for approval",
  };

  const statusStyles: Record<WorkspaceHeaderStatus, string> = {
    saved: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
    unsaved: "bg-amber-500/10 text-amber-900 dark:text-amber-200",
    running: "bg-violet-500/10 text-violet-800 dark:text-violet-300",
    waiting_for_approval: "bg-orange-500/10 text-orange-900 dark:text-orange-200",
  };

  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <div
          className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-sm font-semibold text-white shadow-sm"
          aria-hidden
        >
          {initials.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            {name || "Untitled agent"}
          </h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-medium",
                statusStyles[status],
              )}
            >
              {statusLabel[status]}
            </span>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              Private
            </span>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onWorkflow}>
          Workflow
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onDetails}>
          Details
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onSchedule}>
          Schedule
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onMemory}>
          Memory &amp; Permissions
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRuns}
          title="Runs for this agent"
        >
          Runs
        </Button>
        <Button
          type="button"
          variant={emphasizeApprovals ? "default" : "outline"}
          size="sm"
          onClick={onApprovals}
          title="Approvals for this agent"
          className={cn("gap-1.5", emphasizeApprovals && "shadow-md")}
        >
          <span>Approvals</span>
          {pendingApprovalsCount > 0 ? (
            <span
              className="min-w-[1.125rem] rounded-full bg-orange-500/15 px-1.5 py-px text-center text-[10px] font-semibold text-orange-900 dark:text-orange-200"
              aria-label={`${pendingApprovalsCount} pending`}
            >
              {pendingApprovalsCount > 99 ? "99+" : pendingApprovalsCount}
            </span>
          ) : null}
        </Button>
      </div>
    </header>
  );
}
