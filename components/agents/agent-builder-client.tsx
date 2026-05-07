"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Edge, Node } from "reactflow";
import { AgentMemoryPermissionsFields } from "@/components/agents/agent-memory-permissions-fields";
import {
  AgentFlowEditor,
  type AgentFlowEditorHandle,
} from "@/components/graph/agent-flow-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import { buildAgentPatchBody } from "@/lib/agents/build-agent-patch-body";

export type AgentBuilderInitial = {
  name?: string;
  description?: string | null;
  mission?: string | null;
  memory_categories?: string[] | null;
  permission_profile?: Record<string, unknown> | null;
  nodes?: Node[];
  edges?: Edge[];
};

export function AgentBuilderClient({
  agentId,
  initial,
}: {
  agentId?: string;
  initial?: AgentBuilderInitial;
}) {
  const router = useRouter();
  const editorRef = useRef<AgentFlowEditorHandle>(null);
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [mission, setMission] = useState(initial?.mission ?? "");
  const [memoryCategoriesText, setMemoryCategoriesText] = useState(() =>
    (initial?.memory_categories ?? []).join("\n"),
  );
  const [allowedNodeTypesText, setAllowedNodeTypesText] = useState(() => {
    const raw = initial?.permission_profile?.allowed_node_types;
    return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string").join(", ") : "";
  });
  const [riskLevel, setRiskLevel] = useState<string>(() => {
    const r = initial?.permission_profile?.risk_level;
    return r === "low" || r === "medium" || r === "high" ? r : "";
  });
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setName(initial?.name ?? "");
    setDescription(initial?.description ?? "");
    setMission(initial?.mission ?? "");
    setMemoryCategoriesText((initial?.memory_categories ?? []).join("\n"));
    const raw = initial?.permission_profile?.allowed_node_types;
    setAllowedNodeTypesText(
      Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string").join(", ") : "",
    );
    const r = initial?.permission_profile?.risk_level;
    setRiskLevel(r === "low" || r === "medium" || r === "high" ? r : "");
  }, [
    initial?.name,
    initial?.description,
    initial?.mission,
    initial?.memory_categories,
    initial?.permission_profile,
    agentId,
  ]);

  const persist = async () => {
    setMessage(null);
    const snap = editorRef.current?.getSnapshot();
    if (!snap) {
      setMessage("Editor not ready.");
      return;
    }
    if (!name.trim()) {
      setMessage("Name is required.");
      return;
    }
    let body: Record<string, unknown>;
    try {
      body = buildAgentPatchBody(
        {
          name,
          description,
          mission,
          memoryCategoriesText,
          allowedNodeTypesText,
          riskLevel,
        },
        snap,
        agentId,
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Invalid graph data");
      return;
    }

    setSaving(true);
    try {
      if (!agentId) {
        const res = await fetch("/api/agents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Save failed");
        router.push(`/agents/${data.id}`);
        router.refresh();
        return;
      }

      const res = await fetch(`/api/agents/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setMessage("Saved.");
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const runNow = async () => {
    if (!agentId) return;
    setRunning(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/agents/${agentId}/run`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Run failed");
      const rid = data.runId as string | undefined;
      if (rid) {
        router.push(`/runs/${rid}`);
      } else {
        router.push("/runs");
      }
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Run failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1 space-y-1">
          <label className="text-xs font-medium text-zinc-500" htmlFor="agent-name">
            Agent name
          </label>
          <Input
            id="agent-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Investor brief agent"
          />
        </div>
        <Button type="button" onClick={persist} disabled={saving}>
          {saving ? "Saving…" : "Save agent"}
        </Button>
        {agentId ? (
          <Button
            type="button"
            variant="secondary"
            onClick={runNow}
            disabled={running}
          >
            {running ? "Starting…" : "Run now"}
          </Button>
        ) : null}
      </div>
      {message ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-300">{message}</p>
      ) : null}
      <div className="max-w-3xl space-y-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-500" htmlFor="agent-description">
            Description
          </label>
          <textarea
            id="agent-description"
            className={cn(
              "min-h-[72px] w-full resize-y rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm shadow-sm",
              "placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400",
              "dark:border-zinc-700 dark:focus-visible:ring-zinc-600",
            )}
            placeholder="Optional — what this agent is for"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-500" htmlFor="agent-mission">
            Mission
          </label>
          <textarea
            id="agent-mission"
            className={cn(
              "min-h-[100px] w-full resize-y rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm shadow-sm",
              "placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400",
              "dark:border-zinc-700 dark:focus-visible:ring-zinc-600",
            )}
            placeholder="What outcome should runs optimize for? Search nodes can fall back to this when query is empty."
            value={mission}
            onChange={(e) => setMission(e.target.value)}
            rows={4}
          />
        </div>
        <details className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
          <summary className="cursor-pointer text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Memory &amp; permissions
          </summary>
          <AgentMemoryPermissionsFields
            className="mt-3"
            idPrefix="agent"
            memoryCategoriesText={memoryCategoriesText}
            allowedNodeTypesText={allowedNodeTypesText}
            riskLevel={riskLevel}
            onChangeMemoryCategoriesText={setMemoryCategoriesText}
            onChangeAllowedNodeTypesText={setAllowedNodeTypesText}
            onChangeRiskLevel={setRiskLevel}
            showIntro
          />
        </details>
      </div>
      <AgentFlowEditor
        key={agentId ?? "new"}
        ref={editorRef}
        initialNodes={initial?.nodes}
        initialEdges={initial?.edges}
      />
    </div>
  );
}
