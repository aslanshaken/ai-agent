import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonClassName } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { loadRunDetail } from "@/lib/runs/load-run";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type PageProps = { params: Promise<{ id: string }> };

function statusBadgeClass(status: string) {
  switch (status) {
    case "completed":
      return "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200";
    case "failed":
      return "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200";
    case "cancelled":
      return "bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100";
    case "waiting_for_approval":
      return "bg-amber-100 text-amber-950 dark:bg-amber-950 dark:text-amber-100";
    case "running":
      return "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200";
    default:
      return "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200";
  }
}

type SearchStepOutput = {
  kind: "search";
  requestedProvider?: string;
  /** Current runs; older rows may have `provider` only. */
  providerUsed?: string;
  provider?: string;
  query?: string;
  resultCount?: number;
  results?: Array<{ title: string; url: string; snippet: string; source: string }>;
  fallbackReason?: string;
};

function isSearchStepOutput(out: unknown): out is SearchStepOutput {
  return (
    typeof out === "object" &&
    out !== null &&
    (out as { kind?: string }).kind === "search"
  );
}

type AiReasoningStepOutput = {
  kind: "ai_reasoning";
  providerUsed?: string;
  /** Legacy steps before OpenAI integration */
  mock?: boolean;
  summary?: string;
  actionItems?: string[];
  confidence?: number;
  fallbackReason?: string;
  model?: string;
  outputFormat?: string;
};

function isAiReasoningStepOutput(out: unknown): out is AiReasoningStepOutput {
  return (
    typeof out === "object" &&
    out !== null &&
    (out as { kind?: string }).kind === "ai_reasoning"
  );
}

type SaveToDbStepOutput = {
  kind: "save_to_db";
  recordId?: string;
  target?: string;
  title?: string;
  summary?: string;
};

function isSaveToDbStepOutput(out: unknown): out is SaveToDbStepOutput {
  return (
    typeof out === "object" &&
    out !== null &&
    (out as { kind?: string }).kind === "save_to_db"
  );
}

function SaveToDbStepSummary({ output }: { output: SaveToDbStepOutput }) {
  return (
    <div className="mt-3 space-y-2 rounded-md border border-teal-200/80 bg-teal-50/80 p-3 text-sm dark:border-teal-900/60 dark:bg-teal-950/30">
      <p className="text-xs font-semibold uppercase tracking-wide text-teal-800 dark:text-teal-200">
        Save to database
      </p>
      <dl className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
        <div>
          <dt className="font-medium text-zinc-500 dark:text-zinc-400">Record id</dt>
          <dd className="font-mono text-zinc-900 dark:text-zinc-100">{output.recordId ?? "—"}</dd>
        </div>
        <div>
          <dt className="font-medium text-zinc-500 dark:text-zinc-400">Target</dt>
          <dd className="font-mono text-zinc-900 dark:text-zinc-100">{output.target ?? "—"}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="font-medium text-zinc-500 dark:text-zinc-400">Title</dt>
          <dd className="text-zinc-900 dark:text-zinc-100">{output.title ?? "—"}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="font-medium text-zinc-500 dark:text-zinc-400">Summary</dt>
          <dd className="whitespace-pre-wrap break-words text-zinc-900 dark:text-zinc-100">
            {output.summary ?? "—"}
          </dd>
        </div>
      </dl>
      <Link
        href="/memory/research"
        className="inline-block text-xs font-medium text-teal-800 underline dark:text-teal-200"
      >
        View research library →
      </Link>
    </div>
  );
}

function AiReasoningStepSummary({ output }: { output: AiReasoningStepOutput }) {
  const provider = output.providerUsed ?? (output.mock ? "mock" : "—");
  const summary = output.summary ?? "—";
  const items = Array.isArray(output.actionItems) ? output.actionItems : [];
  const conf =
    typeof output.confidence === "number" && Number.isFinite(output.confidence)
      ? output.confidence
      : null;

  return (
    <div className="mt-3 space-y-3 rounded-md border border-violet-200/80 bg-violet-50/80 p-3 text-sm dark:border-violet-900/60 dark:bg-violet-950/30">
      <p className="text-xs font-semibold uppercase tracking-wide text-violet-800 dark:text-violet-200">
        AI reasoning
      </p>
      <dl className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
        <div>
          <dt className="font-medium text-zinc-500 dark:text-zinc-400">Provider used</dt>
          <dd className="font-mono text-zinc-900 dark:text-zinc-100">{provider}</dd>
        </div>
        <div>
          <dt className="font-medium text-zinc-500 dark:text-zinc-400">Confidence</dt>
          <dd className="tabular-nums text-zinc-900 dark:text-zinc-100">
            {conf !== null ? conf.toFixed(2) : "—"}
          </dd>
        </div>
        {output.model ? (
          <div className="sm:col-span-2">
            <dt className="font-medium text-zinc-500 dark:text-zinc-400">Model</dt>
            <dd className="font-mono text-xs text-zinc-900 dark:text-zinc-100">{output.model}</dd>
          </div>
        ) : null}
        {output.outputFormat ? (
          <div className="sm:col-span-2">
            <dt className="font-medium text-zinc-500 dark:text-zinc-400">Output format</dt>
            <dd className="font-mono text-zinc-900 dark:text-zinc-100">{output.outputFormat}</dd>
          </div>
        ) : null}
        <div className="sm:col-span-2">
          <dt className="font-medium text-zinc-500 dark:text-zinc-400">Summary</dt>
          <dd className="whitespace-pre-wrap break-words text-zinc-900 dark:text-zinc-100">{summary}</dd>
        </div>
      </dl>
      {output.fallbackReason ? (
        <p className="rounded border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          Fallback: {output.fallbackReason}
        </p>
      ) : null}
      {items.length > 0 ? (
        <div>
          <p className="mb-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">Action items</p>
          <ul className="list-inside list-decimal space-y-1 text-xs text-zinc-800 dark:text-zinc-200">
            {items.map((item, i) => (
              <li key={i} className="pl-0.5">
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function SearchStepSummary({ output }: { output: SearchStepOutput }) {
  const requested = output.requestedProvider ?? "—";
  const effective = output.providerUsed ?? output.provider ?? "—";
  const query = output.query ?? "—";
  const count = typeof output.resultCount === "number" ? output.resultCount : 0;
  const results = Array.isArray(output.results) ? output.results : [];

  return (
    <div className="mt-3 space-y-3 rounded-md border border-sky-200/80 bg-sky-50/80 p-3 text-sm dark:border-sky-900/60 dark:bg-sky-950/30">
      <p className="text-xs font-semibold uppercase tracking-wide text-sky-800 dark:text-sky-200">
        Search summary
      </p>
      <dl className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
        <div>
          <dt className="font-medium text-zinc-500 dark:text-zinc-400">Requested provider</dt>
          <dd className="font-mono text-zinc-900 dark:text-zinc-100">{requested}</dd>
        </div>
        <div>
          <dt className="font-medium text-zinc-500 dark:text-zinc-400">Provider used</dt>
          <dd className="font-mono text-zinc-900 dark:text-zinc-100">{effective}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="font-medium text-zinc-500 dark:text-zinc-400">Query</dt>
          <dd className="whitespace-pre-wrap break-words text-zinc-900 dark:text-zinc-100">{query}</dd>
        </div>
        <div>
          <dt className="font-medium text-zinc-500 dark:text-zinc-400">Result count</dt>
          <dd className="tabular-nums text-zinc-900 dark:text-zinc-100">{count}</dd>
        </div>
      </dl>
      {output.fallbackReason ? (
        <p className="rounded border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          Fallback: {output.fallbackReason}
        </p>
      ) : null}
      {results.length > 0 ? (
        <div>
          <p className="mb-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">Results</p>
          <ul className="max-h-56 space-y-2 overflow-y-auto text-xs">
            {results.map((r, i) => (
              <li
                key={`${r.url}-${i}`}
                className="rounded border border-zinc-200 bg-white/80 p-2 dark:border-zinc-700 dark:bg-zinc-900/80"
              >
                <p className="font-medium text-zinc-900 dark:text-zinc-50">{r.title || "(no title)"}</p>
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-sky-700 underline dark:text-sky-300"
                >
                  {r.url}
                </a>
                <p className="mt-1 text-zinc-600 dark:text-zinc-400">{r.snippet}</p>
                <p className="mt-0.5 text-[10px] uppercase text-zinc-400">Source: {r.source}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function stepBadgeClass(status: string) {
  switch (status) {
    case "completed":
      return "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100";
    case "failed":
      return "border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/50 dark:text-red-100";
    case "rejected":
      return "border-red-300 bg-red-50 text-red-950 dark:border-red-900 dark:bg-red-950/50 dark:text-red-100";
    case "waiting_for_approval":
      return "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100";
    default:
      return "border-zinc-200 bg-zinc-50 text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-200";
  }
}

export default async function RunDetailPage(props: PageProps) {
  const { id } = await props.params;
  let detail: Awaited<ReturnType<typeof loadRunDetail>> = null;
  let pendingApprovalId: string | null = null;

  try {
    const supabase = await createServerSupabaseClient();
    detail = await loadRunDetail(supabase, id);
    if (detail && (detail.run.status as string) === "waiting_for_approval") {
      const { data: appr } = await supabase
        .from("approvals")
        .select("id")
        .eq("run_id", id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      pendingApprovalId = (appr as { id?: string } | null)?.id ?? null;
    }
  } catch {
    detail = null;
  }

  if (!detail) notFound();

  const agents = detail.run.agents as { name: string } | { name: string }[] | null;
  const agentName = Array.isArray(agents) ? agents[0]?.name : agents?.name;
  const runStatus = detail.run.status as string;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Run detail
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {agentName ?? "Agent"}{" "}
            <span className="font-mono text-base font-normal text-zinc-500">{id}</span>
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
                statusBadgeClass(runStatus),
              )}
            >
              {runStatus.replace(/_/g, " ")}
            </span>
            {runStatus === "waiting_for_approval" ? (
              <span className="text-sm text-amber-800 dark:text-amber-200">
                This run is paused until an approval is approved or rejected in Approvals.
              </span>
            ) : null}
          </div>
        </div>
        <Link href="/runs" className={buttonClassName("outline", "sm")}>
          All runs
        </Link>
      </div>

      {runStatus === "waiting_for_approval" ? (
        <Card className="border-amber-300 dark:border-amber-800">
          <CardHeader>
            <CardTitle className="text-base">Waiting for human approval</CardTitle>
            <CardDescription>
              Approve or reject this gate in the Approvals inbox. The run will resume or cancel
              automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Link href="/approvals" className={buttonClassName("default", "sm")}>
              Open approvals
            </Link>
            {pendingApprovalId ? (
              <Link
                href={`/approvals#approval-${pendingApprovalId}`}
                className={buttonClassName("outline", "sm")}
              >
                Jump to pending item
              </Link>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
          <CardDescription>
            Started {detail.run.started_at ? new Date(detail.run.started_at).toLocaleString() : "—"}{" "}
            · Created {new Date(detail.run.created_at).toLocaleString()}
            {detail.run.completed_at
              ? ` · Completed ${new Date(detail.run.completed_at).toLocaleString()}`
              : null}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {detail.run.error ? (
            <p className="text-red-600 dark:text-red-400">{detail.run.error}</p>
          ) : null}
          {detail.run.trigger_run_id ? (
            <p className="text-xs text-zinc-500">
              Trigger.dev: {detail.run.trigger_run_id}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {detail.run.output && typeof detail.run.output === "object" ? (
        <Card>
          <CardHeader>
            <CardTitle>Run output</CardTitle>
            <CardDescription>Aggregated result JSON from the executor.</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="max-h-64 overflow-auto rounded-md bg-zinc-950 p-4 text-xs text-zinc-100">
              {JSON.stringify(detail.run.output, null, 2)}
            </pre>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Steps</CardTitle>
          <CardDescription>
            Order, node type, status, JSON output, and errors (topological execution).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {detail.steps.length === 0 ? (
            <p className="text-sm text-zinc-500">No steps recorded.</p>
          ) : (
            <ol className="space-y-4">
              {detail.steps.map((s) => (
                <li
                  key={s.id}
                  className={cn(
                    "rounded-lg border p-4",
                    stepBadgeClass(s.status),
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Step order
                      </p>
                      <p className="text-lg font-semibold tabular-nums">#{s.step_index}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-medium capitalize">{s.node_type ?? "?"}</p>
                      <p className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
                        {s.node_id}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                      Status
                    </span>
                    <span
                      className={cn(
                        "rounded-md px-2 py-0.5 text-xs font-semibold capitalize",
                        statusBadgeClass(s.status),
                      )}
                    >
                      {String(s.status).replace(/_/g, " ")}
                    </span>
                  </div>
                  {s.output && typeof s.output === "object" ? (
                    <div className="mt-3">
                      {isSearchStepOutput(s.output) ? (
                        <SearchStepSummary output={s.output} />
                      ) : null}
                      {isAiReasoningStepOutput(s.output) ? (
                        <AiReasoningStepSummary output={s.output} />
                      ) : null}
                      {isSaveToDbStepOutput(s.output) ? (
                        <SaveToDbStepSummary output={s.output} />
                      ) : null}
                      <p className="mb-1 mt-3 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                        Output (JSON)
                      </p>
                      <pre className="max-h-48 overflow-auto rounded-md bg-black/5 p-3 text-xs dark:bg-black/30">
                        {JSON.stringify(s.output, null, 2)}
                      </pre>
                    </div>
                  ) : null}
                  {s.error ? (
                    <p className="mt-2 text-sm font-medium text-red-700 dark:text-red-300">
                      Error: {s.error}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs text-zinc-500">
                    Logged {new Date(s.created_at).toLocaleString()}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
