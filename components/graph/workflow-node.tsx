"use client";

import { useId } from "react";
import { Handle, Position, useReactFlow, type NodeProps } from "reactflow";
import { cn } from "@/lib/utils/cn";
import type { AgentNodeType } from "@/lib/schemas/agents";

const styles: Record<AgentNodeType, string> = {
  trigger: "border-emerald-500/60 bg-emerald-500/10",
  search: "border-sky-500/60 bg-sky-500/10",
  ai_reasoning: "border-violet-500/60 bg-violet-500/10",
  condition: "border-amber-500/60 bg-amber-500/10",
  approval: "border-orange-500/60 bg-orange-500/10",
  save_to_db: "border-teal-500/60 bg-teal-500/10",
  notification: "border-pink-500/60 bg-pink-500/10",
};

export function WorkflowNode(props: NodeProps) {
  const { id, data, type } = props;
  const t = type as AgentNodeType;
  const label = (data?.label as string) ?? t;
  const { setNodes } = useReactFlow();
  const modelListId = useId();

  const patchData = (patch: Record<string, unknown>) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)),
    );
  };

  if (t === "search") {
    const provider =
      data?.provider === "exa" || data?.provider === "tavily" || data?.provider === "mock"
        ? data.provider
        : "mock";
    const query = typeof data?.query === "string" ? data.query : "";
    const limitRaw = data?.limit;
    const limit =
      typeof limitRaw === "number" && Number.isFinite(limitRaw)
        ? Math.min(20, Math.max(1, Math.floor(limitRaw)))
        : 5;

    return (
      <div
        className={cn(
          "min-w-[200px] max-w-[240px] rounded-lg border-2 px-2 py-2 text-left shadow-sm backdrop-blur",
          styles.search,
        )}
      >
        <Handle type="target" position={Position.Top} className="!bg-zinc-500" />
        <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          Search
        </div>
        <div className="text-xs font-medium text-zinc-900 dark:text-zinc-50">{label}</div>
        <div className="mt-2 space-y-1.5">
          <label className="block text-[10px] font-medium text-zinc-500">Provider</label>
          <select
            className="nodrag w-full rounded border border-zinc-300 bg-white px-1 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-900"
            value={provider}
            onChange={(e) =>
              patchData({
                provider: e.target.value as "mock" | "exa" | "tavily",
              })
            }
          >
            <option value="mock">mock</option>
            <option value="exa">exa</option>
            <option value="tavily">tavily</option>
          </select>
          <label className="block text-[10px] font-medium text-zinc-500">Query</label>
          <textarea
            className="nodrag w-full resize-none rounded border border-zinc-300 bg-white px-1 py-1 text-xs leading-snug text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
            rows={2}
            placeholder="Leave empty to use agent mission at run time"
            value={query}
            onChange={(e) => patchData({ query: e.target.value })}
          />
          <label className="block text-[10px] font-medium text-zinc-500">Limit</label>
          <input
            type="number"
            min={1}
            max={20}
            className="nodrag w-full rounded border border-zinc-300 bg-white px-1 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-900"
            value={limit}
            onChange={(e) => {
              const v = Number.parseInt(e.target.value, 10);
              patchData({ limit: Number.isFinite(v) ? v : 5 });
            }}
          />
        </div>
        <Handle type="source" position={Position.Bottom} className="!bg-zinc-500" />
      </div>
    );
  }

  if (t === "ai_reasoning") {
    const instruction = typeof data?.instruction === "string" ? data.instruction : "";
    const outputFormat =
      data?.outputFormat === "structured" || data?.outputFormat === "action_items"
        ? data.outputFormat
        : "summary";
    const model = typeof data?.model === "string" ? data.model : "";

    return (
      <div
        className={cn(
          "min-w-[200px] max-w-[260px] rounded-lg border-2 px-2 py-2 text-left shadow-sm backdrop-blur",
          styles.ai_reasoning,
        )}
      >
        <Handle type="target" position={Position.Top} className="!bg-zinc-500" />
        <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          AI reasoning
        </div>
        <div className="text-xs font-medium text-zinc-900 dark:text-zinc-50">{label}</div>
        <div className="mt-2 space-y-1.5">
          <label className="block text-[10px] font-medium text-zinc-500">Instruction</label>
          <textarea
            className="nodrag w-full resize-none rounded border border-zinc-300 bg-white px-1 py-1 text-xs leading-snug text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
            rows={3}
            placeholder="How should the model use upstream outputs?"
            value={instruction}
            onChange={(e) => patchData({ instruction: e.target.value })}
          />
          <label className="block text-[10px] font-medium text-zinc-500">Output format</label>
          <select
            className="nodrag w-full rounded border border-zinc-300 bg-white px-1 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-900"
            value={outputFormat}
            onChange={(e) =>
              patchData({
                outputFormat: e.target.value as "summary" | "structured" | "action_items",
              })
            }
          >
            <option value="summary">summary</option>
            <option value="structured">structured</option>
            <option value="action_items">action_items</option>
          </select>
          <label className="block text-[10px] font-medium text-zinc-500">Model</label>
          <input
            type="text"
            className="nodrag w-full rounded border border-zinc-300 bg-white px-1 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-900"
            placeholder="Empty = default (gpt-4.1-mini or OPENAI_REASONING_MODEL)"
            value={model}
            onChange={(e) => patchData({ model: e.target.value })}
            list={modelListId}
          />
          <datalist id={modelListId}>
            <option value="gpt-4.1-mini" />
            <option value="gpt-4o-mini" />
            <option value="gpt-4o" />
            <option value="gpt-4.1" />
          </datalist>
        </div>
        <Handle type="source" position={Position.Bottom} className="!bg-zinc-500" />
      </div>
    );
  }

  if (t === "save_to_db") {
    const target =
      data?.target === "research_results" ? "research_results" : "research_results";
    const title = typeof data?.title === "string" ? data.title : "";
    const sourceNodeId = typeof data?.sourceNodeId === "string" ? data.sourceNodeId : "";
    const tagsStr =
      typeof data?.tags === "string"
        ? data.tags
        : Array.isArray(data?.tags)
          ? (data.tags as string[]).join(", ")
          : "";

    return (
      <div
        className={cn(
          "min-w-[200px] max-w-[260px] rounded-lg border-2 px-2 py-2 text-left shadow-sm backdrop-blur",
          styles.save_to_db,
        )}
      >
        <Handle type="target" position={Position.Top} className="!bg-zinc-500" />
        <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          Save to DB
        </div>
        <div className="text-xs font-medium text-zinc-900 dark:text-zinc-50">{label}</div>
        <div className="mt-2 space-y-1.5">
          <label className="block text-[10px] font-medium text-zinc-500">Target</label>
          <select
            className="nodrag w-full rounded border border-zinc-300 bg-white px-1 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-900"
            value={target}
            onChange={(e) =>
              patchData({ target: e.target.value as "research_results" })
            }
          >
            <option value="research_results">research_results</option>
          </select>
          <label className="block text-[10px] font-medium text-zinc-500">Title</label>
          <input
            type="text"
            className="nodrag w-full rounded border border-zinc-300 bg-white px-1 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-900"
            placeholder="Default: timestamped label"
            value={title}
            onChange={(e) => patchData({ title: e.target.value })}
          />
          <label className="block text-[10px] font-medium text-zinc-500">Source node id</label>
          <input
            type="text"
            className="nodrag w-full rounded border border-zinc-300 bg-white px-1 py-1 font-mono text-xs dark:border-zinc-600 dark:bg-zinc-900"
            placeholder="Empty = merge all upstream"
            value={sourceNodeId}
            onChange={(e) => patchData({ sourceNodeId: e.target.value })}
          />
          <label className="block text-[10px] font-medium text-zinc-500">Tags (comma-separated)</label>
          <input
            type="text"
            className="nodrag w-full rounded border border-zinc-300 bg-white px-1 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-900"
            placeholder="e.g. investor, q1-2026"
            value={tagsStr}
            onChange={(e) => patchData({ tags: e.target.value })}
          />
        </div>
        <Handle type="source" position={Position.Bottom} className="!bg-zinc-500" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "min-w-[160px] rounded-lg border-2 px-3 py-2 text-left shadow-sm backdrop-blur",
        styles[t] ?? "border-zinc-400 bg-zinc-100 dark:bg-zinc-900",
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-zinc-500" />
      <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        {t.replace(/_/g, " ")}
      </div>
      <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{label}</div>
      <Handle type="source" position={Position.Bottom} className="!bg-zinc-500" />
    </div>
  );
}
