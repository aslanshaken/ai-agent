/**
 * Short human-readable previews for workflow step outputs (timeline, drawers).
 */

export function safeStepJson(output: unknown): string {
  try {
    return JSON.stringify(output, null, 2);
  } catch {
    return String(output);
  }
}

export function humanizeStepOutput(output: unknown): string {
  if (output == null) return "";

  if (typeof output !== "object" || Array.isArray(output)) {
    const s = typeof output === "string" ? output : JSON.stringify(output);
    return s.length > 1200 ? `${s.slice(0, 1200)}…` : s;
  }

  const o = output as Record<string, unknown>;
  const kind = typeof o.kind === "string" ? o.kind : "";

  switch (kind) {
    case "trigger": {
      const parts: string[] = [];
      if (typeof o.note === "string" && o.note.trim()) parts.push(o.note.trim());
      if (typeof o.startedAt === "string") parts.push(`Started: ${o.startedAt}`);
      return parts.join("\n") || "Workflow entry.";
    }
    case "search": {
      const lines: string[] = [];
      const prov = (o.providerUsed ?? o.provider ?? o.requestedProvider) as string | undefined;
      if (prov) lines.push(`Provider: ${prov}`);
      if (typeof o.query === "string" && o.query.trim()) {
        lines.push(`Query: ${o.query.trim()}`);
      }
      if (typeof o.resultCount === "number") {
        lines.push(`Results: ${o.resultCount}`);
      }
      if (typeof o.fallbackReason === "string" && o.fallbackReason.trim()) {
        lines.push(`Note: ${o.fallbackReason.trim()}`);
      }
      const results = Array.isArray(o.results) ? o.results : [];
      if (results.length > 0) {
        lines.push("Top hits:");
        for (const r of results.slice(0, 5)) {
          if (!r || typeof r !== "object") continue;
          const row = r as { title?: string; url?: string };
          const t = typeof row.title === "string" ? row.title : "(untitled)";
          lines.push(` • ${t}`);
        }
        if (results.length > 5) lines.push(` …and ${results.length - 5} more`);
      }
      return lines.join("\n");
    }
    case "ai_reasoning": {
      const lines: string[] = [];
      if (typeof o.summary === "string" && o.summary.trim()) {
        let s = o.summary.trim();
        if (s.length > 900) s = `${s.slice(0, 900)}…`;
        lines.push(s);
      }
      if (typeof o.model === "string") lines.push(`Model: ${o.model}`);
      if (typeof o.confidence === "number" && Number.isFinite(o.confidence)) {
        lines.push(`Confidence: ${o.confidence.toFixed(2)}`);
      }
      const items = Array.isArray(o.actionItems)
        ? o.actionItems.filter((x): x is string => typeof x === "string")
        : [];
      if (items.length > 0) {
        lines.push("Highlights:");
        for (const it of items.slice(0, 8)) lines.push(` • ${it}`);
        if (items.length > 8) lines.push(` …and ${items.length - 8} more`);
      }
      if (typeof o.fallbackReason === "string" && o.fallbackReason.trim()) {
        lines.push(`Fallback: ${o.fallbackReason.trim()}`);
      }
      return lines.join("\n");
    }
    case "approval": {
      const parts: string[] = [];
      if (typeof o.message === "string") parts.push(o.message);
      if (typeof o.approvalId === "string") parts.push(`Approval id: ${o.approvalId}`);
      return parts.join("\n") || "Paused for human approval.";
    }
    case "aggregate_results": {
      const agg = Array.isArray(o.aggregatedResults) ? o.aggregatedResults : [];
      if (agg.length === 0) return "No aggregated rows.";
      const lines = [`Merged ${agg.length} upstream chunk(s):`];
      for (const item of agg.slice(0, 6)) {
        if (!item || typeof item !== "object") continue;
        const it = item as { kind?: string; label?: string; snippet?: string };
        lines.push(` • ${it.kind ?? "?"}` + (it.label ? `: ${it.label.slice(0, 80)}` : ""));
      }
      return lines.join("\n");
    }
    case "save_to_db":
    case "save_investor":
    case "save_candidate":
    case "save_company": {
      const name = typeof o.name === "string" ? o.name : typeof o.title === "string" ? o.title : null;
      const id = typeof o.recordId === "string" ? o.recordId : null;
      const parts = [`Saved (${kind}).`];
      if (name) parts.push(`Name: ${name}`);
      if (id) parts.push(`Record: ${id}`);
      return parts.join("\n");
    }
    case "create_task": {
      const t = typeof o.title === "string" ? o.title : "";
      const id = typeof o.taskId === "string" ? o.taskId : "";
      return [t ? `Task: ${t}` : "Task created.", id ? `Id: ${id}` : ""].filter(Boolean).join("\n");
    }
    case "notification":
      return typeof o.body === "string" ? o.body : "Notification step.";
    default: {
      const j = safeStepJson(output);
      return j.length > 1500 ? `${j.slice(0, 1500)}…` : j;
    }
  }
}

export function stepHasExpandableDetail(step: {
  status: string;
  output?: unknown;
  error?: string | null;
}): boolean {
  return Boolean(step.error) || step.output != null || step.status === "waiting_for_approval";
}
