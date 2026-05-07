/**
 * Shared logic for human-friendly run summaries (chat, run detail page).
 */

type SearchStepOutput = {
  kind: "search";
  resultCount?: number;
  query?: string;
};

type AiReasoningStepOutput = {
  kind: "ai_reasoning";
  summary?: string;
  actionItems?: string[];
};

function isSearchStepOutput(out: unknown): out is SearchStepOutput {
  return (
    typeof out === "object" &&
    out !== null &&
    (out as { kind?: string }).kind === "search"
  );
}

function isAiReasoningStepOutput(out: unknown): out is AiReasoningStepOutput {
  return (
    typeof out === "object" &&
    out !== null &&
    (out as { kind?: string }).kind === "ai_reasoning"
  );
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

export function pickPrimarySummaryFromRun(
  runOutput: unknown,
  steps: Array<{ output: unknown }>,
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

export function pickSearchHighlight(steps: Array<{ output: unknown }>): string | null {
  for (let i = steps.length - 1; i >= 0; i--) {
    const o = steps[i]?.output;
    if (isSearchStepOutput(o)) {
      const n = typeof o.resultCount === "number" ? o.resultCount : 0;
      const q = (o.query ?? "").trim();
      const short = q.length > 100 ? `${q.slice(0, 100)}…` : q;
      return `Search: ${n} result${n === 1 ? "" : "s"}${short ? ` · “${short}”` : ""}`;
    }
  }
  return null;
}

const DEFAULT_HEADLINE_MAX = 480;

export function truncateDisplayText(s: string, max = DEFAULT_HEADLINE_MAX): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

/**
 * Short, user-facing text for in-app chat and tooltips (not the full run page).
 */
export function formatFriendlyRunSummary(input: {
  runId: string;
  status: string;
  error: string | null;
  output: unknown;
  steps: Array<{ output: unknown }>;
}): string {
  const st = input.status.replace(/_/g, " ");
  const shortId = `${input.runId.slice(0, 8)}…`;
  const lines: string[] = [`Run ${shortId} — ${st}.`];

  if (input.error) {
    lines.push(`Error: ${input.error}`);
  }

  if (input.status === "failed" || input.status === "cancelled") {
    return lines.join("\n");
  }

  if (input.status === "pending" || input.status === "running") {
    lines.push("Still in progress — watch the timeline or open Runs for live status.");
    return lines.join("\n");
  }

  if (input.status === "waiting_for_approval") {
    lines.push("Paused for approval — check Approvals or the prompt in chat.");
  }

  const { headline, actionItems } = pickPrimarySummaryFromRun(input.output, input.steps);
  const searchHL = pickSearchHighlight(input.steps);
  const cleanHeadline =
    headline && headline !== "Execution finished." ? headline : null;

  if (cleanHeadline) {
    lines.push("", truncateDisplayText(cleanHeadline));
  }
  if (searchHL) {
    lines.push("", searchHL);
  }
  if (actionItems.length > 0) {
    lines.push("", "Highlights:");
    for (const it of actionItems.slice(0, 6)) {
      lines.push(`• ${it}`);
    }
    if (actionItems.length > 6) lines.push("• …");
  }

  if (!cleanHeadline && !searchHL && actionItems.length === 0) {
    lines.push("", `See full step output: /runs/${input.runId}`);
  } else {
    lines.push("", `Details: /runs/${input.runId}`);
  }

  return lines.join("\n");
}
