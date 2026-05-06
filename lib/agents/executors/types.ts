import type { SupabaseClient } from "@supabase/supabase-js";
import type { AgentNodeType } from "@/lib/schemas/agents";
import type { GraphEdgeRow } from "@/lib/agents/execute-graph";

export type ExecutionNode = {
  react_flow_id: string;
  type: AgentNodeType;
  label: string | null;
  data: Record<string, unknown>;
};

export type ExecutionPlanSnapshot = {
  order: string[];
  nodeTypes: AgentNodeType[];
};

export type ExecutorRuntime = {
  supabase: SupabaseClient;
  runId: string;
  agentId: string;
  userId: string;
  /** Agent `mission` text — used as search query fallback when node has no query */
  agentMission: string | null;
  edges: GraphEdgeRow[];
  /** Topo order for this run — stored on approval payload for resume/debug */
  executionPlan: ExecutionPlanSnapshot | null;
};

export type ExecutorInput = {
  runtime: ExecutorRuntime;
  node: ExecutionNode;
  stepIndex: number;
  /** Outputs keyed by source `react_flow_id` for edges into this node */
  upstreamOutputs: Record<string, Record<string, unknown>>;
};

export type ExecutorOk = {
  kind: "ok";
  output: Record<string, unknown>;
};

export type ExecutorFailed = {
  kind: "failed";
  error: string;
};

export type ExecutorPausedApproval = {
  kind: "paused_approval";
  output: Record<string, unknown>;
};

export type ExecutorResult = ExecutorOk | ExecutorFailed | ExecutorPausedApproval;

export type NodeExecutor = (input: ExecutorInput) => Promise<ExecutorResult>;
