"use client";

import { useCallback, useEffect, useState } from "react";
import type { AgentTemplateRow } from "@/lib/agent-templates";

export function useAgentTemplates(enabled = true) {
  const [templates, setTemplates] = useState<AgentTemplateRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(enabled);

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
    if (!enabled) {
      setLoading(false);
      setLoadError(null);
      setTemplates([]);
      return;
    }
    void loadTemplates();
  }, [enabled, loadTemplates]);

  return { templates, loadError, loading, reload: loadTemplates };
}
