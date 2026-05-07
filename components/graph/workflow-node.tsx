"use client";

import { useId } from "react";
import { Handle, Position, useReactFlow, type NodeProps } from "reactflow";
import {
  WorkflowExpandableTextarea,
  WorkflowModalInput,
} from "@/components/graph/workflow-expandable-text";
import { cn } from "@/lib/utils/cn";
import type { AgentNodeType } from "@/lib/schemas/agents";

const styles: Record<AgentNodeType, string> = {
  trigger: "border-emerald-500/60 bg-emerald-500/10",
  search: "border-sky-500/60 bg-sky-500/10",
  aggregate_results: "border-cyan-500/60 bg-cyan-500/10",
  ai_reasoning: "border-violet-500/60 bg-violet-500/10",
  priority_ranker: "border-fuchsia-500/60 bg-fuchsia-500/10",
  condition: "border-amber-500/60 bg-amber-500/10",
  approval: "border-orange-500/60 bg-orange-500/10",
  save_to_db: "border-teal-500/60 bg-teal-500/10",
  notification: "border-pink-500/60 bg-pink-500/10",
  create_task: "border-lime-500/60 bg-lime-500/10",
  save_investor: "border-indigo-500/60 bg-indigo-500/10",
  save_candidate: "border-rose-500/60 bg-rose-500/10",
  save_company: "border-slate-500/60 bg-slate-500/10",
};

const handleClass =
  "!h-3 !w-3 !border-2 !border-white !bg-zinc-500 dark:!border-zinc-950";

/** Inputs on top & left; outputs on bottom & right — supports vertical chains and left→right flows. */
function WorkflowPortHandles() {
  return (
    <>
      <Handle type="target" position={Position.Top} id="in-top" className={handleClass} />
      <Handle
        type="target"
        position={Position.Left}
        id="in-left"
        className={handleClass}
        style={{ top: "50%" }}
      />
      <Handle type="source" position={Position.Bottom} id="out-bottom" className={handleClass} />
      <Handle
        type="source"
        position={Position.Right}
        id="out-right"
        className={handleClass}
        style={{ top: "50%" }}
      />
    </>
  );
}

export function WorkflowNode(props: NodeProps) {
  const { id, data, type } = props;
  const t = type as AgentNodeType;
  const label = (data?.label as string) ?? t;
  const { setNodes } = useReactFlow();
  const modelListId = useId();
  const priorityRankerModelListId = useId();

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
          "min-w-[220px] max-w-[260px] rounded-lg border px-2.5 py-2 text-left shadow-sm backdrop-blur",
          styles.search,
        )}
      >
        <WorkflowPortHandles />
        <div className="text-[13px] font-bold uppercase tracking-wide text-zinc-500">
          Search
        </div>
        <div className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{label}</div>
        <div className="mt-2 space-y-1.5">
          <label className="block text-[13px] font-medium text-zinc-500">Provider</label>
          <select
            className="nodrag w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-[13px] leading-snug dark:border-zinc-600 dark:bg-zinc-900"
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
          <WorkflowExpandableTextarea
            label="Query"
            modalTitle="Search query"
            rows={2}
            placeholder="Leave empty to use agent mission at run time"
            value={query}
            onChange={(v) => patchData({ query: v })}
          />
          <label className="block text-[13px] font-medium text-zinc-500">Limit</label>
          <input
            type="number"
            min={1}
            max={20}
            className="nodrag w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-[13px] leading-snug dark:border-zinc-600 dark:bg-zinc-900"
            value={limit}
            onChange={(e) => {
              const v = Number.parseInt(e.target.value, 10);
              patchData({ limit: Number.isFinite(v) ? v : 5 });
            }}
          />
        </div>
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
          "min-w-[220px] max-w-[280px] rounded-lg border px-2.5 py-2 text-left shadow-sm backdrop-blur",
          styles.ai_reasoning,
        )}
      >
        <WorkflowPortHandles />
        <div className="text-[13px] font-bold uppercase tracking-wide text-zinc-500">
          AI reasoning
        </div>
        <div className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{label}</div>
        <div className="mt-2 space-y-1.5">
          <WorkflowExpandableTextarea
            label="Instruction"
            modalTitle="AI reasoning — instruction"
            rows={3}
            placeholder="How should the model use upstream outputs?"
            value={instruction}
            onChange={(v) => patchData({ instruction: v })}
          />
          <label className="block text-[13px] font-medium text-zinc-500">Output format</label>
          <select
            className="nodrag w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-[13px] leading-snug dark:border-zinc-600 dark:bg-zinc-900"
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
          <label className="block text-[13px] font-medium text-zinc-500">Model</label>
          <input
            type="text"
            className="nodrag w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-[13px] leading-snug dark:border-zinc-600 dark:bg-zinc-900"
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
      </div>
    );
  }

  if (t === "aggregate_results") {
    return (
      <div
        className={cn(
          "min-w-[200px] max-w-[260px] rounded-lg border px-2.5 py-2 text-left shadow-sm backdrop-blur",
          styles.aggregate_results,
        )}
      >
        <WorkflowPortHandles />
        <div className="text-[13px] font-bold uppercase tracking-wide text-zinc-500">
          Aggregate results
        </div>
        <div className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{label}</div>
        <p className="mt-1 text-[13px] leading-snug text-zinc-600 dark:text-zinc-400">
          Merges upstream search / reasoning outputs into one payload for synthesis.
        </p>
      </div>
    );
  }

  if (t === "priority_ranker") {
    const instruction = typeof data?.instruction === "string" ? data.instruction : "";
    const model = typeof data?.model === "string" ? data.model : "";
    return (
      <div
        className={cn(
          "min-w-[220px] max-w-[280px] rounded-lg border px-2.5 py-2 text-left shadow-sm backdrop-blur",
          styles.priority_ranker,
        )}
      >
        <WorkflowPortHandles />
        <div className="text-[13px] font-bold uppercase tracking-wide text-zinc-500">
          Priority ranker
        </div>
        <div className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{label}</div>
        <div className="mt-2 space-y-1.5">
          <WorkflowExpandableTextarea
            label="Instruction"
            modalTitle="Priority ranker — instruction"
            rows={3}
            placeholder="How should priorities be ranked from upstream context?"
            value={instruction}
            onChange={(v) => patchData({ instruction: v })}
          />
          <label className="block text-[13px] font-medium text-zinc-500">Model</label>
          <input
            type="text"
            className="nodrag w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-[13px] leading-snug dark:border-zinc-600 dark:bg-zinc-900"
            placeholder="Empty = default"
            value={model}
            onChange={(e) => patchData({ model: e.target.value })}
            list={priorityRankerModelListId}
          />
          <datalist id={priorityRankerModelListId}>
            <option value="gpt-4.1-mini" />
            <option value="gpt-4o-mini" />
            <option value="gpt-4o" />
          </datalist>
        </div>
      </div>
    );
  }

  if (t === "save_to_db") {
    const target =
      data?.target === "daily_briefings"
        ? "daily_briefings"
        : "research_results";
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
          "min-w-[220px] max-w-[280px] rounded-lg border px-2.5 py-2 text-left shadow-sm backdrop-blur",
          styles.save_to_db,
        )}
      >
        <WorkflowPortHandles />
        <div className="text-[13px] font-bold uppercase tracking-wide text-zinc-500">
          Save to DB
        </div>
        <div className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{label}</div>
        <div className="mt-2 space-y-1.5">
          <label className="block text-[13px] font-medium text-zinc-500">Target</label>
          <select
            className="nodrag w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-[13px] leading-snug dark:border-zinc-600 dark:bg-zinc-900"
            value={target}
            onChange={(e) =>
              patchData({
                target: e.target.value as "research_results" | "daily_briefings",
              })
            }
          >
            <option value="research_results">research_results</option>
            <option value="daily_briefings">daily_briefings</option>
          </select>
          <WorkflowModalInput
            label="Title"
            modalTitle="Save to DB — title"
            placeholder="Default: timestamped label"
            value={title}
            onChange={(v) => patchData({ title: v })}
          />
          <label className="block text-[13px] font-medium text-zinc-500">Source node id</label>
          <input
            type="text"
            className="nodrag w-full rounded-md border border-zinc-300 bg-white px-2 py-1 font-mono text-[13px] leading-snug dark:border-zinc-600 dark:bg-zinc-900"
            placeholder="Empty = merge all upstream"
            value={sourceNodeId}
            onChange={(e) => patchData({ sourceNodeId: e.target.value })}
          />
          <label className="block text-[13px] font-medium text-zinc-500">Tags (comma-separated)</label>
          <input
            type="text"
            className="nodrag w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-[13px] leading-snug dark:border-zinc-600 dark:bg-zinc-900"
            placeholder="e.g. investor, q1-2026"
            value={tagsStr}
            onChange={(e) => patchData({ tags: e.target.value })}
          />
        </div>
      </div>
    );
  }

  if (t === "create_task") {
    const title = typeof data?.title === "string" ? data.title : "";
    const description = typeof data?.description === "string" ? data.description : "";
    const priority =
      data?.priority === "low" || data?.priority === "high" ? data.priority : "medium";
    const dueDate = typeof data?.due_date === "string" ? data.due_date : "";

    return (
      <div
        className={cn(
          "min-w-[220px] max-w-[280px] rounded-lg border px-2.5 py-2 text-left shadow-sm backdrop-blur",
          styles.create_task,
        )}
      >
        <WorkflowPortHandles />
        <div className="text-[13px] font-bold uppercase tracking-wide text-zinc-500">
          Create task
        </div>
        <div className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{label}</div>
        <div className="mt-2 space-y-1.5">
          <WorkflowModalInput
            label="Title"
            modalTitle="Create task — title"
            value={title}
            onChange={(v) => patchData({ title: v })}
          />
          <WorkflowExpandableTextarea
            label="Description"
            modalTitle="Create task — description"
            rows={2}
            value={description}
            onChange={(v) => patchData({ description: v })}
          />
          <label className="block text-[13px] font-medium text-zinc-500">Priority</label>
          <select
            className="nodrag w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-[13px] leading-snug dark:border-zinc-600 dark:bg-zinc-900"
            value={priority}
            onChange={(e) =>
              patchData({ priority: e.target.value as "low" | "medium" | "high" })
            }
          >
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
          </select>
          <label className="block text-[13px] font-medium text-zinc-500">Due (ISO date)</label>
          <input
            type="text"
            className="nodrag w-full rounded-md border border-zinc-300 bg-white px-2 py-1 font-mono text-[13px] leading-snug dark:border-zinc-600 dark:bg-zinc-900"
            placeholder="2026-05-15 or empty"
            value={dueDate}
            onChange={(e) => patchData({ due_date: e.target.value })}
          />
        </div>
      </div>
    );
  }

  if (t === "save_investor") {
    const name = typeof data?.name === "string" ? data.name : "";
    const fund = typeof data?.fund === "string" ? data.fund : "";
    const focus = typeof data?.focus === "string" ? data.focus : "";
    const stage = typeof data?.stage === "string" ? data.stage : "";
    const location = typeof data?.location === "string" ? data.location : "";
    const linkedin_url = typeof data?.linkedin_url === "string" ? data.linkedin_url : "";
    const website = typeof data?.website === "string" ? data.website : "";
    const scoreRaw = data?.score;
    const scoreStr =
      typeof scoreRaw === "number" && Number.isFinite(scoreRaw) ? String(scoreRaw) : "";
    const reason = typeof data?.reason === "string" ? data.reason : "";
    const status = typeof data?.status === "string" ? data.status : "new";

    return (
      <div
        className={cn(
          "min-w-[220px] max-w-[300px] rounded-lg border px-2.5 py-2 text-left shadow-sm backdrop-blur",
          styles.save_investor,
        )}
      >
        <WorkflowPortHandles />
        <div className="text-[13px] font-bold uppercase tracking-wide text-zinc-500">
          Save investor
        </div>
        <div className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{label}</div>
        <div className="mt-2 max-h-[260px] space-y-1.5 overflow-y-auto pr-0.5">
          <label className="block text-[13px] font-medium text-zinc-500">Name</label>
          <input
            type="text"
            className="nodrag w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-[13px] leading-snug dark:border-zinc-600 dark:bg-zinc-900"
            value={name}
            onChange={(e) => patchData({ name: e.target.value })}
          />
          <label className="block text-[13px] font-medium text-zinc-500">Fund</label>
          <input
            type="text"
            className="nodrag w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-[13px] leading-snug dark:border-zinc-600 dark:bg-zinc-900"
            value={fund}
            onChange={(e) => patchData({ fund: e.target.value })}
          />
          <label className="block text-[13px] font-medium text-zinc-500">Focus</label>
          <input
            type="text"
            className="nodrag w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-[13px] leading-snug dark:border-zinc-600 dark:bg-zinc-900"
            value={focus}
            onChange={(e) => patchData({ focus: e.target.value })}
          />
          <label className="block text-[13px] font-medium text-zinc-500">Stage</label>
          <input
            type="text"
            className="nodrag w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-[13px] leading-snug dark:border-zinc-600 dark:bg-zinc-900"
            value={stage}
            onChange={(e) => patchData({ stage: e.target.value })}
          />
          <label className="block text-[13px] font-medium text-zinc-500">Location</label>
          <input
            type="text"
            className="nodrag w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-[13px] leading-snug dark:border-zinc-600 dark:bg-zinc-900"
            value={location}
            onChange={(e) => patchData({ location: e.target.value })}
          />
          <label className="block text-[13px] font-medium text-zinc-500">LinkedIn URL</label>
          <input
            type="text"
            className="nodrag w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-[13px] leading-snug dark:border-zinc-600 dark:bg-zinc-900"
            value={linkedin_url}
            onChange={(e) => patchData({ linkedin_url: e.target.value })}
          />
          <label className="block text-[13px] font-medium text-zinc-500">Website</label>
          <input
            type="text"
            className="nodrag w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-[13px] leading-snug dark:border-zinc-600 dark:bg-zinc-900"
            value={website}
            onChange={(e) => patchData({ website: e.target.value })}
          />
          <label className="block text-[13px] font-medium text-zinc-500">Score</label>
          <input
            type="text"
            className="nodrag w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-[13px] leading-snug dark:border-zinc-600 dark:bg-zinc-900"
            placeholder="optional number"
            value={scoreStr}
            onChange={(e) => {
              const v = e.target.value.trim();
              if (!v) patchData({ score: undefined });
              else {
                const n = Number.parseFloat(v);
                patchData({ score: Number.isFinite(n) ? n : undefined });
              }
            }}
          />
          <WorkflowExpandableTextarea
            label="Reason"
            modalTitle="Save investor — reason"
            rows={2}
            value={reason}
            onChange={(v) => patchData({ reason: v })}
          />
          <label className="block text-[13px] font-medium text-zinc-500">Status</label>
          <input
            type="text"
            className="nodrag w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-[13px] leading-snug dark:border-zinc-600 dark:bg-zinc-900"
            value={status}
            onChange={(e) => patchData({ status: e.target.value })}
          />
        </div>
      </div>
    );
  }

  if (t === "save_candidate") {
    const name = typeof data?.name === "string" ? data.name : "";
    const role = typeof data?.role === "string" ? data.role : "";
    const skills = typeof data?.skills === "string" ? data.skills : "";
    const location = typeof data?.location === "string" ? data.location : "";
    const linkedin_url = typeof data?.linkedin_url === "string" ? data.linkedin_url : "";
    const github_url = typeof data?.github_url === "string" ? data.github_url : "";
    const scoreRaw = data?.score;
    const scoreStr =
      typeof scoreRaw === "number" && Number.isFinite(scoreRaw) ? String(scoreRaw) : "";
    const reason = typeof data?.reason === "string" ? data.reason : "";
    const status = typeof data?.status === "string" ? data.status : "new";

    return (
      <div
        className={cn(
          "min-w-[220px] max-w-[300px] rounded-lg border px-2.5 py-2 text-left shadow-sm backdrop-blur",
          styles.save_candidate,
        )}
      >
        <WorkflowPortHandles />
        <div className="text-[13px] font-bold uppercase tracking-wide text-zinc-500">
          Save candidate
        </div>
        <div className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{label}</div>
        <div className="mt-2 max-h-[260px] space-y-1.5 overflow-y-auto pr-0.5">
          <label className="block text-[13px] font-medium text-zinc-500">Name</label>
          <input
            type="text"
            className="nodrag w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-[13px] leading-snug dark:border-zinc-600 dark:bg-zinc-900"
            value={name}
            onChange={(e) => patchData({ name: e.target.value })}
          />
          <label className="block text-[13px] font-medium text-zinc-500">Role</label>
          <input
            type="text"
            className="nodrag w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-[13px] leading-snug dark:border-zinc-600 dark:bg-zinc-900"
            value={role}
            onChange={(e) => patchData({ role: e.target.value })}
          />
          <WorkflowExpandableTextarea
            label="Skills"
            modalTitle="Save candidate — skills"
            rows={2}
            value={skills}
            onChange={(v) => patchData({ skills: v })}
          />
          <label className="block text-[13px] font-medium text-zinc-500">Location</label>
          <input
            type="text"
            className="nodrag w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-[13px] leading-snug dark:border-zinc-600 dark:bg-zinc-900"
            value={location}
            onChange={(e) => patchData({ location: e.target.value })}
          />
          <label className="block text-[13px] font-medium text-zinc-500">LinkedIn URL</label>
          <input
            type="text"
            className="nodrag w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-[13px] leading-snug dark:border-zinc-600 dark:bg-zinc-900"
            value={linkedin_url}
            onChange={(e) => patchData({ linkedin_url: e.target.value })}
          />
          <label className="block text-[13px] font-medium text-zinc-500">GitHub URL</label>
          <input
            type="text"
            className="nodrag w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-[13px] leading-snug dark:border-zinc-600 dark:bg-zinc-900"
            value={github_url}
            onChange={(e) => patchData({ github_url: e.target.value })}
          />
          <label className="block text-[13px] font-medium text-zinc-500">Score</label>
          <input
            type="text"
            className="nodrag w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-[13px] leading-snug dark:border-zinc-600 dark:bg-zinc-900"
            placeholder="optional number"
            value={scoreStr}
            onChange={(e) => {
              const v = e.target.value.trim();
              if (!v) patchData({ score: undefined });
              else {
                const n = Number.parseFloat(v);
                patchData({ score: Number.isFinite(n) ? n : undefined });
              }
            }}
          />
          <WorkflowExpandableTextarea
            label="Reason"
            modalTitle="Save candidate — reason"
            rows={2}
            value={reason}
            onChange={(v) => patchData({ reason: v })}
          />
          <label className="block text-[13px] font-medium text-zinc-500">Status</label>
          <input
            type="text"
            className="nodrag w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-[13px] leading-snug dark:border-zinc-600 dark:bg-zinc-900"
            value={status}
            onChange={(e) => patchData({ status: e.target.value })}
          />
        </div>
      </div>
    );
  }

  if (t === "save_company") {
    const name = typeof data?.name === "string" ? data.name : "";
    const industry = typeof data?.industry === "string" ? data.industry : "";
    const website = typeof data?.website === "string" ? data.website : "";
    const description = typeof data?.description === "string" ? data.description : "";
    const notes = typeof data?.notes === "string" ? data.notes : "";
    const scoreRaw = data?.score;
    const scoreStr =
      typeof scoreRaw === "number" && Number.isFinite(scoreRaw) ? String(scoreRaw) : "";

    return (
      <div
        className={cn(
          "min-w-[220px] max-w-[300px] rounded-lg border px-2.5 py-2 text-left shadow-sm backdrop-blur",
          styles.save_company,
        )}
      >
        <WorkflowPortHandles />
        <div className="text-[13px] font-bold uppercase tracking-wide text-zinc-500">
          Save company
        </div>
        <div className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{label}</div>
        <div className="mt-2 max-h-[260px] space-y-1.5 overflow-y-auto pr-0.5">
          <label className="block text-[13px] font-medium text-zinc-500">Name</label>
          <input
            type="text"
            className="nodrag w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-[13px] leading-snug dark:border-zinc-600 dark:bg-zinc-900"
            value={name}
            onChange={(e) => patchData({ name: e.target.value })}
          />
          <label className="block text-[13px] font-medium text-zinc-500">Industry</label>
          <input
            type="text"
            className="nodrag w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-[13px] leading-snug dark:border-zinc-600 dark:bg-zinc-900"
            value={industry}
            onChange={(e) => patchData({ industry: e.target.value })}
          />
          <label className="block text-[13px] font-medium text-zinc-500">Website</label>
          <input
            type="text"
            className="nodrag w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-[13px] leading-snug dark:border-zinc-600 dark:bg-zinc-900"
            value={website}
            onChange={(e) => patchData({ website: e.target.value })}
          />
          <WorkflowExpandableTextarea
            label="Description"
            modalTitle="Save company — description"
            rows={2}
            value={description}
            onChange={(v) => patchData({ description: v })}
          />
          <label className="block text-[13px] font-medium text-zinc-500">Score</label>
          <input
            type="text"
            className="nodrag w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-[13px] leading-snug dark:border-zinc-600 dark:bg-zinc-900"
            placeholder="optional number"
            value={scoreStr}
            onChange={(e) => {
              const v = e.target.value.trim();
              if (!v) patchData({ score: undefined });
              else {
                const n = Number.parseFloat(v);
                patchData({ score: Number.isFinite(n) ? n : undefined });
              }
            }}
          />
          <WorkflowExpandableTextarea
            label="Notes"
            modalTitle="Save company — notes"
            rows={2}
            value={notes}
            onChange={(v) => patchData({ notes: v })}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "min-w-[200px] max-w-[232px] rounded-lg border px-2.5 py-2 text-left shadow-sm backdrop-blur",
        styles[t] ?? "border-zinc-400 bg-zinc-100 dark:bg-zinc-900",
      )}
    >
      <WorkflowPortHandles />
      <div className="text-[13px] font-bold uppercase tracking-wide text-zinc-500">
        {t.replace(/_/g, " ")}
      </div>
      <div className="text-base font-medium text-zinc-900 dark:text-zinc-50">{label}</div>
    </div>
  );
}
