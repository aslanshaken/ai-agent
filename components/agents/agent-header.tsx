"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export type WorkspaceHeaderStatus = "saved" | "unsaved" | "running" | "waiting_for_approval";

export function AgentHeader({
  name,
  initials,
  status,
  onWorkflow,
  onDetails,
  onSchedule,
  onMemory,
}: {
  name: string;
  initials: string;
  status: WorkspaceHeaderStatus;
  onWorkflow: () => void;
  onDetails: () => void;
  onSchedule: () => void;
  onMemory: () => void;
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
    <header className="flex flex-col gap-4 border-b border-zinc-200 pb-4 dark:border-zinc-800 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <div
          className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-sm font-semibold text-white shadow-sm"
          aria-hidden
        >
          {initials.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              {name || "Untitled agent"}
            </h1>
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
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Run and save from the chat below — use these buttons to edit workflow, details, schedule,
            and memory.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
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
      </div>
    </header>
  );
}
