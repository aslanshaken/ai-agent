"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ApprovalActions({
  approvalId,
  runId,
}: {
  approvalId: string;
  /** When set, successful approve navigates to this run. */
  runId?: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const patch = async (status: "approved" | "rejected") => {
    setBusy(status);
    try {
      const res = await fetch(`/api/approvals/${approvalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string; runId?: string };
      if (!res.ok) {
        throw new Error(j.error ?? "Update failed");
      }
      if (status === "approved" && (j.runId ?? runId)) {
        router.push(`/runs/${j.runId ?? runId}`);
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
  );
}
