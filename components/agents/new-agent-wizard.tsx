"use client";

import Link from "next/link";
import { AgentBuilderClient } from "@/components/agents/agent-builder-client";
import { useAgentTemplates } from "@/components/agents/use-agent-templates";
import { Button, buttonClassName } from "@/components/ui/button";
import { templateRowToBuilderInitial } from "@/lib/agent-templates";

export function NewAgentWizard({ initialTemplateSlug }: { initialTemplateSlug?: string }) {
  const needsFetch = Boolean(initialTemplateSlug);
  const { templates, loadError, loading, reload } = useAgentTemplates(needsFetch);

  if (needsFetch && loading) {
    return <p className="text-sm text-zinc-500">Loading template…</p>;
  }

  if (needsFetch && loadError) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
        <p>{loadError}</p>
        <p className="mt-2 text-xs text-amber-800/90 dark:text-amber-200/80">
          Apply migration{" "}
          <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/60">00006_agent_templates.sql</code>{" "}
          to your Supabase project, then refresh.
        </p>
        <Button type="button" variant="secondary" className="mt-3" onClick={() => void reload()}>
          Retry
        </Button>
      </div>
    );
  }

  const templateRow =
    needsFetch && !loading ? templates.find((t) => t.slug === initialTemplateSlug) : undefined;

  if (needsFetch && !loading && !templateRow) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No blueprint matched <span className="font-mono text-xs">{initialTemplateSlug}</span>.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/agents/templates" className={buttonClassName("default", "sm")}>
            Browse templates
          </Link>
          <Link href="/agents/new" className={buttonClassName("outline", "sm")}>
            Create from scratch
          </Link>
        </div>
      </div>
    );
  }

  const initial = templateRow ? templateRowToBuilderInitial(templateRow) : undefined;
  const clientKey = templateRow?.slug ?? "scratch";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/agents" className={buttonClassName("outline", "sm")}>
          Agents
        </Link>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Edit the mission, graph, and node settings, then save to create your agent.
        </p>
      </div>
      <AgentBuilderClient key={clientKey} initial={initial} />
    </div>
  );
}
