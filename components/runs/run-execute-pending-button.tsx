"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { buttonClassName } from "@/components/ui/button";

export function RunExecutePendingButton({ runId }: { runId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/runs/${runId}/execute`, {
        method: "POST",
        credentials: "include",
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(body.error ?? `Request failed (${res.status})`);
        return;
      }
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => void onClick()}
        className={buttonClassName("default", "sm")}
      >
        {busy ? "Starting…" : "Execute run now"}
      </button>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Runs the workflow in this app (same as Trigger.dev’s{" "}
        <span className="font-mono text-[0.7rem]">execute-agent</span>). Use this if the run was
        queued but no worker picked it up.
      </p>
      {error ? <p className="text-xs font-medium text-red-600 dark:text-red-400">{error}</p> : null}
    </div>
  );
}
