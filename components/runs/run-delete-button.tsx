"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function RunDeleteButton({ runId }: { runId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this run? This cannot be undone.")) return;
    setPending(true);
    try {
      const res = await fetch(`/api/runs/${runId}`, { method: "DELETE" });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        alert(body.error ?? "Could not delete run");
        return;
      }
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
      disabled={pending}
      onClick={handleDelete}
    >
      {pending ? "…" : "Delete"}
    </Button>
  );
}
