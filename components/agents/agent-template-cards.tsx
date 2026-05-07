"use client";

import Link from "next/link";
import type { AgentTemplateRow } from "@/lib/agent-templates";
import { sortAgentTemplates } from "@/lib/agent-templates";
import { cn } from "@/lib/utils/cn";

const cardClass = cn(
  "rounded-lg border border-zinc-200 bg-white p-3 text-left text-sm shadow-sm transition hover:border-zinc-400 hover:shadow",
  "dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-600",
);

function CardBody({ t }: { t: AgentTemplateRow }) {
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-zinc-900 dark:text-zinc-50">
          {t.name}
        </h3>
        {t.category ? (
          <span className="shrink-0 rounded-full bg-zinc-100 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            {t.category}
          </span>
        ) : null}
      </div>
      <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
        {t.description}
      </p>
      <dl className="mt-2 space-y-1 border-t border-zinc-100 pt-2 text-[11px] leading-tight dark:border-zinc-800">
        <div className="flex gap-1.5">
          <dt className="w-12 shrink-0 font-medium text-zinc-500">Runtime</dt>
          <dd className="min-w-0 text-zinc-700 dark:text-zinc-300">{t.estimated_runtime ?? "—"}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="w-12 shrink-0 font-medium text-zinc-500">Tools</dt>
          <dd className="line-clamp-2 min-w-0 text-zinc-700 dark:text-zinc-300">{t.tools_summary ?? "—"}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="w-12 shrink-0 font-medium text-zinc-500">Schedule</dt>
          <dd className="min-w-0 text-zinc-700 dark:text-zinc-300">{t.schedule_hint ?? "—"}</dd>
        </div>
      </dl>
    </>
  );
}

export function AgentTemplateCards({
  templates,
  mode,
  onPick,
}: {
  templates: AgentTemplateRow[];
  mode: "link" | "button";
  onPick?: (row: AgentTemplateRow) => void;
}) {
  const ordered = sortAgentTemplates(templates);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {ordered.map((t) =>
        mode === "link" ? (
          <Link
            key={t.id}
            href={`/agents/new?template=${encodeURIComponent(t.slug)}`}
            className={cn(cardClass, "block")}
          >
            <CardBody t={t} />
          </Link>
        ) : (
          <button
            key={t.id}
            type="button"
            onClick={() => onPick?.(t)}
            className={cardClass}
          >
            <CardBody t={t} />
          </button>
        ),
      )}
    </div>
  );
}
