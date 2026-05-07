import Link from "next/link";
import { Card } from "@/components/ui/card";
import { buttonClassName } from "@/components/ui/button";
import { RunDeleteButton } from "@/components/runs/run-delete-button";

export type RunStatusCardProps = {
  id: string;
  agentName: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  error: string | null;
  output: unknown;
  triggerRunId: string | null;
  /** manual | scheduled — omit when unknown / legacy rows */
  source?: string | null;
  scheduledFor?: string | null;
};

export function RunStatusCard({
  id,
  agentName,
  status,
  createdAt,
  completedAt,
  error,
  output: _output,
  triggerRunId,
  source,
  scheduledFor,
}: RunStatusCardProps) {
  const metaParts = [
    new Date(createdAt).toLocaleString(),
    completedAt ? `→ ${new Date(completedAt).toLocaleString()}` : null,
    source ? (source === "scheduled" ? "Scheduled" : "Manual") : null,
    scheduledFor ? `target ${new Date(scheduledFor).toLocaleString()}` : null,
  ].filter(Boolean);

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold leading-snug text-zinc-950 dark:text-zinc-50">
              {agentName}{" "}
              <span className="font-mono text-[11px] font-normal text-zinc-500">
                {id.slice(0, 8)}…
              </span>
            </h3>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium capitalize dark:bg-zinc-800">
              {status}
            </span>
          </div>
          <p className="text-[11px] leading-snug text-zinc-500">
            {metaParts.join(" · ")}
            {triggerRunId ? (
              <>
                {" · "}
                <span title={triggerRunId}>Trigger {triggerRunId.slice(0, 14)}…</span>
              </>
            ) : null}
          </p>
          {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link href={`/runs/${id}`} className={buttonClassName("outline", "sm")}>
            Open
          </Link>
          <RunDeleteButton runId={id} />
        </div>
      </div>
    </Card>
  );
}
