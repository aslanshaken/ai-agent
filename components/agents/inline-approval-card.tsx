"use client";

import { Check, ShieldAlert, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function InlineApprovalCard({
  approvalId,
  disabled,
  onResolved,
}: {
  approvalId: string;
  disabled?: boolean;
  onResolved: () => void;
}) {
  async function act(status: "approved" | "rejected") {
    const res = await fetch(`/api/approvals/${approvalId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      alert(data.error ?? "Approval update failed");
      return;
    }
    onResolved();
  }

  return (
    <div className="flex gap-3 py-1">
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-sm">
        <ShieldAlert className="size-4" aria-hidden />
      </div>
      <div className="min-w-0 flex-1 space-y-3">
        <div
          className={cn(
            "overflow-hidden rounded-2xl border border-amber-200/90 bg-gradient-to-b from-amber-50 to-orange-50/90 shadow-md",
            "dark:border-amber-900/50 dark:from-amber-950/50 dark:to-orange-950/40",
          )}
        >
          <div className="border-b border-amber-200/60 px-4 py-3 dark:border-amber-900/40">
            <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">
              Approval needed
            </p>
            <p className="mt-1 text-xs leading-relaxed text-amber-900/85 dark:text-amber-200/90">
              This run is paused until you approve or reject. Choose an action below.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 px-4 py-3">
            <button
              type="button"
              disabled={disabled}
              onClick={() => void act("approved")}
              className={cn(
                "inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors",
                "hover:bg-emerald-700 disabled:opacity-40 sm:flex-none sm:min-w-[130px]",
              )}
            >
              <Check className="size-4" aria-hidden />
              Approve
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => void act("rejected")}
              className={cn(
                "inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-700 shadow-sm transition-colors",
                "hover:bg-red-50 disabled:opacity-40 dark:border-red-900 dark:bg-zinc-900 dark:text-red-400 dark:hover:bg-red-950/50 sm:flex-none sm:min-w-[130px]",
              )}
            >
              <X className="size-4" aria-hidden />
              Reject
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
