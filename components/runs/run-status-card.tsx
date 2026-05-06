import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonClassName } from "@/components/ui/button";

export type RunStatusCardProps = {
  id: string;
  agentName: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  error: string | null;
  output: unknown;
  triggerRunId: string | null;
};

export function RunStatusCard({
  id,
  agentName,
  status,
  createdAt,
  completedAt,
  error,
  output,
  triggerRunId,
}: RunStatusCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">
            {agentName}{" "}
            <span className="font-mono text-xs font-normal text-zinc-500">
              {id.slice(0, 8)}…
            </span>
          </CardTitle>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium capitalize dark:bg-zinc-800">
            {status}
          </span>
        </div>
        <CardDescription>
          {new Date(createdAt).toLocaleString()}
          {completedAt ? ` → ${new Date(completedAt).toLocaleString()}` : null}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <Link href={`/runs/${id}`} className={buttonClassName("outline", "sm")}>
          Open run
        </Link>
        {error ? <p className="text-red-600 dark:text-red-400">{error}</p> : null}
        {output && typeof output === "object" ? (
          <pre className="max-h-40 overflow-auto rounded-md bg-zinc-950 p-3 text-xs text-zinc-100">
            {JSON.stringify(output, null, 2)}
          </pre>
        ) : null}
        {triggerRunId ? (
          <p className="text-xs text-zinc-500">Trigger.dev run: {triggerRunId}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
