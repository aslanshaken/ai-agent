"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Edge, Node } from "reactflow";
import { AgentBuilderClient } from "@/components/agents/agent-builder-client";
import { Button } from "@/components/ui/button";
import { templateRowToBuilderInitial, type AgentTemplateRow } from "@/lib/agent-templates";
import { cn } from "@/lib/utils/cn";

type Step = "pick" | "build";

export function NewAgentWizard({ initialTemplateSlug }: { initialTemplateSlug?: string }) {
  const [step, setStep] = useState<Step>("pick");
  const [templates, setTemplates] = useState<AgentTemplateRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [buildKey, setBuildKey] = useState("scratch");
  const [initial, setInitial] = useState<{
    name: string;
    description: string;
    mission: string;
    nodes?: Node[];
    edges?: Edge[];
  } | null>(null);
  const deepLinkApplied = useRef(false);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/agent-templates");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load templates");
      setTemplates((data.templates ?? []) as AgentTemplateRow[]);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load templates");
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    if (!initialTemplateSlug || loading || templates.length === 0 || deepLinkApplied.current) {
      return;
    }
    const row = templates.find((t) => t.slug === initialTemplateSlug);
    if (!row) return;
    deepLinkApplied.current = true;
    setInitial(templateRowToBuilderInitial(row));
    setBuildKey(row.slug);
    setStep("build");
  }, [initialTemplateSlug, loading, templates]);

  const startScratch = () => {
    setInitial(null);
    setBuildKey("scratch");
    setStep("build");
  };

  const startFromTemplate = (row: AgentTemplateRow) => {
    setInitial(templateRowToBuilderInitial(row));
    setBuildKey(row.slug);
    setStep("build");
  };

  if (step === "build") {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="secondary" onClick={() => setStep("pick")}>
            Back to templates
          </Button>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Edit the mission, graph, and node settings, then save to create your agent.
          </p>
        </div>
        <AgentBuilderClient key={buildKey} initial={initial ?? undefined} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            How do you want to start?
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Blueprints preload a mission and graph. You still save a normal agent to your workspace.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={startScratch} className="shrink-0">
          Start from scratch
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading templates…</p>
      ) : loadError ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
          <p>{loadError}</p>
          <p className="mt-2 text-xs text-amber-800/90 dark:text-amber-200/80">
            Apply migration <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/60">00006_agent_templates.sql</code>{" "}
            to your Supabase project, then refresh.
          </p>
          <Button type="button" variant="secondary" className="mt-3" onClick={() => void loadTemplates()}>
            Retry
          </Button>
        </div>
      ) : null}

      {!loading && !loadError && templates.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No templates returned. Apply migration{" "}
          <code className="rounded bg-zinc-100 px-1 font-mono text-xs dark:bg-zinc-800">00006_agent_templates.sql</code>{" "}
          and ensure you are signed in.
        </p>
      ) : null}

      {!loading && !loadError && templates.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => startFromTemplate(t)}
              className={cn(
                "rounded-xl border border-zinc-200 bg-white p-5 text-left shadow-sm transition hover:border-zinc-400 hover:shadow-md",
                "dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-600",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">{t.name}</h3>
                {t.category ? (
                  <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    {t.category}
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {t.description}
              </p>
              <dl className="mt-4 space-y-2 border-t border-zinc-100 pt-4 text-xs dark:border-zinc-800">
                <div className="flex gap-2">
                  <dt className="shrink-0 font-medium text-zinc-500">Runtime</dt>
                  <dd className="text-zinc-700 dark:text-zinc-300">{t.estimated_runtime ?? "—"}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="shrink-0 font-medium text-zinc-500">Tools</dt>
                  <dd className="text-zinc-700 dark:text-zinc-300">{t.tools_summary ?? "—"}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="shrink-0 font-medium text-zinc-500">Schedule</dt>
                  <dd className="text-zinc-700 dark:text-zinc-300">{t.schedule_hint ?? "—"}</dd>
                </div>
              </dl>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
