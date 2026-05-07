"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ApprovalActions({
  approvalId,
  runId,
}: {
  approvalId: string;
  /** When set, successful approve navigates to this run (unless already on that run page). */
  runId?: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const patch = async (status: "approved" | "rejected") => {
    setBusy(status);
    try {
      const trimmed = note.trim();
      const res = await fetch(`/api/approvals/${approvalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          ...(trimmed
            ? status === "approved"
              ? { reviewer_note: trimmed }
              : { reject_reason: trimmed }
            : {}),
        }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string; runId?: string };
      if (!res.ok) {
        throw new Error(j.error ?? "Update failed");
      }
      const targetRun = j.runId ?? runId;
      const onRunPage =
        targetRun && (pathname === `/runs/${targetRun}` || pathname?.startsWith(`/runs/${targetRun}/`));
      if (status === "approved" && targetRun) {
        if (onRunPage) {
          router.refresh();
          return;
        }
        router.push(`/runs/${targetRun}`);
        return;
      }
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-2">
      <div>
        <label className="mb-1 block text-[10px] font-medium text-zinc-500" htmlFor={`appr-note-${approvalId}`}>
          Note (optional)
        </label>
        <textarea
          id={`appr-note-${approvalId}`}
          className="min-h-[52px] w-full max-w-md rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs dark:border-zinc-600 dark:bg-zinc-900"
          placeholder="Context for approve / reject…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        size="sm"
        disabled={busy !== null}
        onClick={() => void patch("approved")}
      >
        {busy === "approved" ? "…" : "Approve"}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={busy !== null}
        onClick={() => void patch("rejected")}
      >
        {busy === "rejected" ? "…" : "Reject"}
      </Button>
      </div>
    </div>
  );
}
