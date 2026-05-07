import Link from "next/link";
import { ChevronDown } from "lucide-react";
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
import { ApprovalActions } from "@/components/approvals/approval-actions";
import { RunDetailRefresh } from "@/components/runs/run-detail-refresh";
import { RunExecutePendingButton } from "@/components/runs/run-execute-pending-button";
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

type CreateTaskStepOutput = { kind: "create_task"; taskId?: string; title?: string };
type SaveCrmStepOutput = {
  kind: "save_investor" | "save_candidate" | "save_company";
  recordId?: string;
  name?: string;
};

function isCreateTaskStepOutput(out: unknown): out is CreateTaskStepOutput {
  return (
    typeof out === "object" &&
    out !== null &&
    (out as { kind?: string }).kind === "create_task"
  );
}

function isSaveCrmStepOutput(out: unknown): out is SaveCrmStepOutput {
  const k = typeof out === "object" && out !== null ? (out as { kind?: string }).kind : null;
  return k === "save_investor" || k === "save_candidate" || k === "save_company";
}

function CreateTaskStepSummary({ output }: { output: CreateTaskStepOutput }) {
  return (
    <div className="mt-3 space-y-2 rounded-md border border-lime-200/80 bg-lime-50/80 p-3 text-sm dark:border-lime-900/60 dark:bg-lime-950/30">
      <p className="text-xs font-semibold uppercase tracking-wide text-lime-900 dark:text-lime-200">
        Task created
      </p>
      <dl className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
        <div>
          <dt className="font-medium text-zinc-500 dark:text-zinc-400">Task id</dt>
          <dd className="font-mono text-zinc-900 dark:text-zinc-100">{output.taskId ?? "—"}</dd>
        </div>
        <div>
          <dt className="font-medium text-zinc-500 dark:text-zinc-400">Title</dt>
          <dd className="text-zinc-900 dark:text-zinc-100">{output.title ?? "—"}</dd>
        </div>
      </dl>
      <Link href="/dashboard" className="inline-block text-xs font-medium text-lime-900 underline dark:text-lime-200">
        View dashboard tasks →
      </Link>
    </div>
  );
}

function SaveCrmStepSummary({ output }: { output: SaveCrmStepOutput }) {
  const label =
    output.kind === "save_investor"
      ? "Investor"
      : output.kind === "save_candidate"
        ? "Candidate"
        : "Company";
  const border =
    output.kind === "save_investor"
      ? "border-indigo-200/80 bg-indigo-50/80 dark:border-indigo-900/60 dark:bg-indigo-950/30"
      : output.kind === "save_candidate"
        ? "border-rose-200/80 bg-rose-50/80 dark:border-rose-900/60 dark:bg-rose-950/30"
        : "border-slate-200/80 bg-slate-50/80 dark:border-slate-700/60 dark:bg-slate-950/30";
  const titleCls =
    output.kind === "save_investor"
      ? "text-indigo-900 dark:text-indigo-200"
      : output.kind === "save_candidate"
        ? "text-rose-900 dark:text-rose-200"
        : "text-slate-900 dark:text-slate-200";

  return (
    <div className={cn("mt-3 space-y-2 rounded-md border p-3 text-sm", border)}>
      <p className={cn("text-xs font-semibold uppercase tracking-wide", titleCls)}>
        {label} saved
      </p>
      <dl className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
        <div>
          <dt className="font-medium text-zinc-500 dark:text-zinc-400">Record id</dt>
          <dd className="font-mono text-zinc-900 dark:text-zinc-100">{output.recordId ?? "—"}</dd>
        </div>
        <div>
          <dt className="font-medium text-zinc-500 dark:text-zinc-400">Name</dt>
          <dd className="text-zinc-900 dark:text-zinc-100">{output.name ?? "—"}</dd>
        </div>
      </dl>
    </div>
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

function extractOutputsMap(
  runOutput: unknown,
): Record<string, Record<string, unknown>> | null {
  if (!runOutput || typeof runOutput !== "object" || Array.isArray(runOutput)) return null;
  const raw = (runOutput as Record<string, unknown>).outputsByNodeId;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const out: Record<string, Record<string, unknown>> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v && typeof v === "object" && !Array.isArray(v)) out[k] = v as Record<string, unknown>;
  }
  return Object.keys(out).length ? out : null;
}

function pickPrimarySummaryFromRun(
  runOutput: unknown,
  steps: { output: unknown }[],
): { headline: string | null; actionItems: string[] } {
  const actionItems: string[] = [];

  for (let i = steps.length - 1; i >= 0; i--) {
    const o = steps[i]?.output;
    if (isAiReasoningStepOutput(o) && o.summary?.trim()) {
      const items = Array.isArray(o.actionItems)
        ? o.actionItems.filter((x): x is string => typeof x === "string")
        : [];
      for (const it of items.slice(0, 10)) actionItems.push(it);
      return { headline: o.summary!.trim(), actionItems };
    }
  }

  const map = extractOutputsMap(runOutput);
  if (map) {
    for (const val of Object.values(map)) {
      if (
        val.kind === "ai_reasoning" &&
        typeof val.summary === "string" &&
        val.summary.trim()
      ) {
        return { headline: val.summary.trim(), actionItems };
      }
    }
  }

  if (runOutput && typeof runOutput === "object" && !Array.isArray(runOutput)) {
    const s = (runOutput as Record<string, unknown>).summary;
    if (typeof s === "string" && s.trim()) {
      return { headline: s.trim(), actionItems };
    }
  }

  return { headline: null, actionItems };
}

function pickSearchHighlight(steps: { output: unknown }[]): string | null {
  for (let i = steps.length - 1; i >= 0; i--) {
    const o = steps[i]?.output;
    if (isSearchStepOutput(o)) {
      const n = typeof o.resultCount === "number" ? o.resultCount : 0;
      const q = (o.query ?? "").trim();
      const short = q.length > 100 ? `${q.slice(0, 100)}…` : q;
      return `Retrieved ${n} result${n === 1 ? "" : "s"}${short ? ` · ${short}` : ""}`;
    }
  }
  return null;
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

  const runMeta = detail.run as typeof detail.run & {
    source?: string;
    scheduled_for?: string | null;
  };

  const agents = detail.run.agents as { name: string } | { name: string }[] | null;
  const agentName = Array.isArray(agents) ? agents[0]?.name : agents?.name;
  const runStatus = detail.run.status as string;

  const { headline: rawHeadline, actionItems: resultActionItems } = pickPrimarySummaryFromRun(
    detail.run.output,
    detail.steps,
  );
  const searchHighlight = pickSearchHighlight(detail.steps);
  const resultHeadline =
    rawHeadline && rawHeadline !== "Execution finished." ? rawHeadline : null;

  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-8">
      <RunDetailRefresh status={runStatus} />
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
        <div className="flex flex-wrap gap-2">
          {(detail.run as { agent_id?: string }).agent_id ? (
            <Link
              href={`/agents/${(detail.run as { agent_id: string }).agent_id}`}
              className={buttonClassName("outline", "sm")}
            >
              Open agent
            </Link>
          ) : null}
          <Link href="/runs" className={buttonClassName("outline", "sm")}>
            All runs
          </Link>
        </div>
      </div>

      {runStatus === "waiting_for_approval" ? (
        <Card className="border-amber-300 dark:border-amber-800">
          <CardHeader>
            <CardTitle className="text-base">
              {pendingApprovalId ? "Approve to continue this run" : "Waiting for human approval"}
            </CardTitle>
            <CardDescription>
              {pendingApprovalId
                ? "Resolve the gate below — the run resumes or stops immediately."
                : "No pending approval row found for this run. Open the inbox if the run is stuck."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingApprovalId ? (
              <ApprovalActions approvalId={pendingApprovalId} runId={id} />
            ) : null}
            <div className="flex flex-wrap gap-2 border-t border-amber-200/60 pt-4 dark:border-amber-900/50">
              <Link href="/approvals" className={buttonClassName("outline", "sm")}>
                Open approvals inbox
              </Link>
              {pendingApprovalId ? (
                <Link
                  href={`/approvals#approval-${pendingApprovalId}`}
                  className={buttonClassName("ghost", "sm")}
                >
                  Jump to item in list
                </Link>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <section
        className={cn(
          "relative overflow-hidden rounded-2xl border-2 p-6 shadow-md",
          runStatus === "failed"
            ? "border-red-400/40 bg-gradient-to-br from-red-50 via-white to-zinc-50 dark:border-red-800/60 dark:from-red-950/45 dark:via-zinc-950 dark:to-zinc-950"
            : "border-emerald-500/30 bg-gradient-to-br from-emerald-50/95 via-white to-violet-50/80 dark:border-emerald-500/25 dark:from-emerald-950/35 dark:via-zinc-950 dark:to-violet-950/25",
        )}
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
          Results
        </p>

        {runStatus === "failed" ? (
          <div className="mt-2 space-y-2">
            <h2 className="text-xl font-semibold tracking-tight text-red-900 dark:text-red-100">
              Run failed
            </h2>
            {detail.run.error ? (
              <p className="text-base leading-relaxed text-red-800 dark:text-red-200">
                {detail.run.error}
              </p>
            ) : (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">No error message was recorded.</p>
            )}
          </div>
        ) : null}

        {runStatus === "pending" ? (
          <div className="mt-3 space-y-4">
            {detail.run.trigger_run_id ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-950 dark:border-amber-900/80 dark:bg-amber-950/35 dark:text-amber-100">
                Queued on Trigger.dev — this page refreshes while pending. On non-Vercel hosts, new runs
                usually execute inline; see <span className="font-mono text-[0.7rem]">.env.example</span>.
                Use <strong>Execute run now</strong> below if stuck.
              </p>
            ) : (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Waiting to start…</p>
            )}
            <RunExecutePendingButton runId={id} />
          </div>
        ) : null}

        {runStatus === "running" ? (
          <p className="mt-3 text-base text-zinc-700 dark:text-zinc-300">
            Run in progress… this page refreshes automatically.
          </p>
        ) : null}

        {(runStatus === "completed" || runStatus === "waiting_for_approval") && resultHeadline ? (
          <div className="mt-3 space-y-4">
            <p className="text-lg font-semibold leading-snug text-zinc-900 dark:text-zinc-50 md:text-xl">
              {resultHeadline}
            </p>
            {searchHighlight ? (
              <p className="text-sm font-medium text-emerald-900/90 dark:text-emerald-100/90">
                {searchHighlight}
              </p>
            ) : null}
            {resultActionItems.length > 0 ? (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Action items
                </p>
                <ul className="space-y-2 border-l-2 border-emerald-500/50 pl-4 text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
                  {resultActionItems.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        {(runStatus === "completed" || runStatus === "waiting_for_approval") &&
        !resultHeadline &&
        searchHighlight ? (
          <p className="mt-3 text-lg font-semibold leading-snug text-zinc-900 dark:text-zinc-50 md:text-xl">
            {searchHighlight}
          </p>
        ) : null}

        {(runStatus === "completed" || runStatus === "waiting_for_approval") &&
        !resultHeadline &&
        !searchHighlight ? (
          <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Run finished — open <strong>Steps</strong> below for each node&apos;s output and raw JSON.
          </p>
        ) : null}

        {detail.metrics &&
        (detail.metrics.duration_ms != null ||
          detail.metrics.total_tokens != null ||
          detail.metrics.total_cost != null) &&
        runStatus !== "pending" &&
        runStatus !== "failed" ? (
          <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-emerald-200/50 pt-4 text-xs dark:border-emerald-900/40">
            {detail.metrics.duration_ms != null ? (
              <div>
                <dt className="font-medium text-zinc-500 dark:text-zinc-400">Duration</dt>
                <dd className="tabular-nums text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {detail.metrics.duration_ms} ms
                </dd>
              </div>
            ) : null}
            {detail.metrics.total_tokens != null ? (
              <div>
                <dt className="font-medium text-zinc-500 dark:text-zinc-400">Tokens</dt>
                <dd className="tabular-nums text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {detail.metrics.total_tokens}
                </dd>
              </div>
            ) : null}
            {detail.metrics.total_cost != null ? (
              <div>
                <dt className="font-medium text-zinc-500 dark:text-zinc-400">Est. cost</dt>
                <dd className="tabular-nums text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {String(detail.metrics.total_cost)}
                </dd>
              </div>
            ) : null}
          </dl>
        ) : null}
      </section>

      <details className="group rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <summary
          className={cn(
            "flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition hover:bg-zinc-50 dark:text-zinc-100 dark:hover:bg-zinc-900",
            "[&::-webkit-details-marker]:hidden",
          )}
        >
          <span>Execution &amp; timeline</span>
          <ChevronDown
            className="size-4 shrink-0 text-zinc-400 transition-transform duration-200 group-open:rotate-180"
            aria-hidden
          />
        </summary>
        <div className="border-t border-zinc-200 px-4 py-4 text-sm dark:border-zinc-800">
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Started{" "}
            {detail.run.started_at ? new Date(detail.run.started_at).toLocaleString() : "—"} · Created{" "}
            {new Date(detail.run.created_at).toLocaleString()}
            {detail.run.completed_at
              ? ` · Completed ${new Date(detail.run.completed_at).toLocaleString()}`
              : null}
          </p>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
            Source: {runMeta.source === "scheduled" ? "Scheduled" : "Manual"}
            {runMeta.source === "scheduled" && runMeta.scheduled_for
              ? ` · scheduled for ${new Date(runMeta.scheduled_for).toLocaleString()}`
              : null}
          </p>
          {detail.run.error && runStatus !== "failed" ? (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">{detail.run.error}</p>
          ) : null}
          {detail.run.trigger_run_id ? (
            <p className="mt-3 font-mono text-xs text-zinc-500">
              Trigger.dev: {detail.run.trigger_run_id}
            </p>
          ) : null}
        </div>
      </details>

      {detail.run.output && typeof detail.run.output === "object" ? (
        <details className="group rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <summary
            className={cn(
              "flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition hover:bg-zinc-50 dark:text-zinc-100 dark:hover:bg-zinc-900",
              "[&::-webkit-details-marker]:hidden",
            )}
          >
            <span>Aggregated run output (JSON)</span>
            <ChevronDown
              className="size-4 shrink-0 text-zinc-400 transition-transform duration-200 group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
            <pre className="max-h-72 overflow-auto rounded-lg bg-zinc-950 p-4 text-xs text-zinc-100">
              {JSON.stringify(detail.run.output, null, 2)}
            </pre>
          </div>
        </details>
      ) : null}

      <details open className="group rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <summary
          className={cn(
            "flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition hover:bg-zinc-50 dark:text-zinc-100 dark:hover:bg-zinc-900",
            "[&::-webkit-details-marker]:hidden",
          )}
        >
          <span>Steps ({detail.steps.length})</span>
          <ChevronDown
            className="size-4 shrink-0 text-zinc-400 transition-transform duration-200 group-open:rotate-180"
            aria-hidden
          />
        </summary>
        <div className="border-t border-zinc-200 px-4 py-4 dark:border-zinc-800">
          <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
            Topological order — structured summaries first; expand each step for raw JSON.
          </p>
          {detail.steps.length === 0 ? (
            <p className="text-sm text-zinc-500">No steps recorded.</p>
          ) : (
            <ol className="space-y-3">
              {detail.steps.map((s) => (
                <li key={s.id}>
                  <details
                    className={cn(
                      "group rounded-lg border transition-colors",
                      stepBadgeClass(s.status),
                    )}
                  >
                    <summary
                      className={cn(
                        "flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm font-medium",
                        "[&::-webkit-details-marker]:hidden",
                      )}
                    >
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="tabular-nums text-zinc-600 dark:text-zinc-400">
                          #{s.step_index}
                        </span>
                        <span className="capitalize">{s.node_type ?? "?"}</span>
                        <span
                          className={cn(
                            "rounded-md px-2 py-0.5 text-xs font-semibold capitalize",
                            statusBadgeClass(s.status),
                          )}
                        >
                          {String(s.status).replace(/_/g, " ")}
                        </span>
                      </span>
                      <ChevronDown
                        className="size-4 shrink-0 text-zinc-500 transition-transform duration-200 group-open:rotate-180"
                        aria-hidden
                      />
                    </summary>
                    <div className="space-y-3 border-t border-black/5 px-3 py-3 dark:border-white/10">
                      <p className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                        {s.node_id}
                      </p>
                      {s.output && typeof s.output === "object" ? (
                        <div className="space-y-3">
                          {isSearchStepOutput(s.output) ? (
                            <SearchStepSummary output={s.output} />
                          ) : null}
                          {isAiReasoningStepOutput(s.output) ? (
                            <AiReasoningStepSummary output={s.output} />
                          ) : null}
                          {isSaveToDbStepOutput(s.output) ? (
                            <SaveToDbStepSummary output={s.output} />
                          ) : null}
                          {isCreateTaskStepOutput(s.output) ? (
                            <CreateTaskStepSummary output={s.output} />
                          ) : null}
                          {isSaveCrmStepOutput(s.output) ? (
                            <SaveCrmStepSummary output={s.output} />
                          ) : null}
                          <details className="group/json rounded-md border border-zinc-200 bg-zinc-50/80 dark:border-zinc-700 dark:bg-zinc-900/50">
                            <summary
                              className={cn(
                                "flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400",
                                "[&::-webkit-details-marker]:hidden",
                              )}
                            >
                              <span>Raw output (JSON)</span>
                              <ChevronDown
                                className="size-3.5 shrink-0 transition-transform duration-200 group-open/json:rotate-180"
                                aria-hidden
                              />
                            </summary>
                            <pre className="max-h-40 overflow-auto border-t border-zinc-200 p-3 text-[11px] dark:border-zinc-700">
                              {JSON.stringify(s.output, null, 2)}
                            </pre>
                          </details>
                        </div>
                      ) : null}
                      {s.error ? (
                        <p className="text-sm font-medium text-red-700 dark:text-red-300">
                          Error: {s.error}
                        </p>
                      ) : null}
                      <p className="text-[11px] text-zinc-500">
                        Logged {new Date(s.created_at).toLocaleString()}
                      </p>
                    </div>
                  </details>
                </li>
              ))}
            </ol>
          )}
        </div>
      </details>
    </div>
  );
}
