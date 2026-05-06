"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { Edge, Node } from "reactflow";
import {
  AgentFlowEditor,
  type AgentFlowEditorHandle,
} from "@/components/graph/agent-flow-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { serializeFlow } from "@/lib/agents/serialize-flow";

type Initial = {
  name: string;
  description?: string | null;
  mission?: string | null;
  nodes: Node[];
  edges: Edge[];
};

export function AgentBuilderClient({
  agentId,
  initial,
}: {
  agentId?: string;
  initial?: Initial;
}) {
  const router = useRouter();
  const editorRef = useRef<AgentFlowEditorHandle>(null);
  const [name, setName] = useState(initial?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
      const { nodes, edges } = serializeFlow(snap.nodes, snap.edges);
      body = {
        name: name.trim(),
        description: initial?.description ?? "",
        mission: initial?.mission ?? "",
        nodes,
        edges,
      };
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
      setMessage(`Run started (${data.mode}). Open Runs for results.`);
      router.push("/runs");
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
      <AgentFlowEditor
        key={agentId ?? "new"}
        ref={editorRef}
        initialNodes={initial?.nodes}
        initialEdges={initial?.edges}
      />
    </div>
  );
}
