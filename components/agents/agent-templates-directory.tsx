"use client";

import { Button } from "@/components/ui/button";
import { AgentTemplateCards } from "@/components/agents/agent-template-cards";
import { useAgentTemplates } from "@/components/agents/use-agent-templates";

export function AgentTemplatesDirectory() {
  const { templates, loadError, loading, reload } = useAgentTemplates();

  if (loading) {
    return <p className="text-sm text-zinc-500">Loading templates…</p>;
  }

  if (loadError) {
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

  if (templates.length === 0) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        No templates returned. Apply migration{" "}
        <code className="rounded bg-zinc-100 px-1 font-mono text-xs dark:bg-zinc-800">00006_agent_templates.sql</code>{" "}
        and ensure you are signed in.
      </p>
    );
  }

  return <AgentTemplateCards templates={templates} mode="link" />;
}
