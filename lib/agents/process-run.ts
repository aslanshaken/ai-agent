import type { SupabaseClient } from "@supabase/supabase-js";
import { nodeTypes } from "@/lib/schemas/agents";
import type { AgentNodeType } from "@/lib/schemas/agents";
import {
  collectUpstreamOutputs,
  orderNodesForExecution,
  summarizePlan,
  type GraphEdgeRow,
} from "@/lib/agents/execute-graph";
import { getNodeExecutor } from "@/lib/agents/executors/mock-executors";
import type { ExecutionNode, ExecutionPlanSnapshot } from "@/lib/agents/executors/types";
import {
  finalizeRun,
  insertRunStep,
  markRunFailed,
  setRunRunning,
  setRunWaitingForApproval,
} from "@/lib/agents/save-results";

type ServiceClient = SupabaseClient;

function isAgentNodeType(t: string): t is AgentNodeType {
  return (nodeTypes as readonly string[]).includes(t);
}

function toExecutionNode(row: {
  react_flow_id: string;
  type: string;
  label: string | null;
  data: unknown;
}): ExecutionNode | null {
  if (!isAgentNodeType(row.type)) return null;
  const data =
    row.data && typeof row.data === "object" && !Array.isArray(row.data)
      ? (row.data as Record<string, unknown>)
      : {};
  return {
    react_flow_id: row.react_flow_id,
    type: row.type,
    label: row.label,
    data,
  };
}

/** Rebuild node outputs from persisted steps (latest row wins per node_id). */
export function buildOutputsFromRunSteps(
  steps: { step_index: number; node_id: string | null; status: string; output: unknown }[],
): Record<string, Record<string, unknown>> {
  const best = new Map<string, { stepIndex: number; output: Record<string, unknown> }>();
  for (const s of steps) {
    if (!s.node_id || s.output === null || typeof s.output !== "object" || Array.isArray(s.output)) {
      continue;
    }
    if (s.status === "failed") continue;
    const out = s.output as Record<string, unknown>;
    const prev = best.get(s.node_id);
    if (!prev || s.step_index > prev.stepIndex) {
      best.set(s.node_id, { stepIndex: s.step_index, output: out });
    }
  }
  return Object.fromEntries([...best.entries()].map(([id, v]) => [id, v.output]));
}

type LoadedRunContext = {
  run: {
    id: string;
    agent_id: string;
    version_id: string | null;
    status: string;
  };
  userId: string;
  agentMission: string | null;
  executionNodes: ExecutionNode[];
  edges: GraphEdgeRow[];
  ordered: ExecutionNode[];
  plan: ExecutionPlanSnapshot;
};

async function loadRunExecutionContext(
  supabase: ServiceClient,
  runId: string,
): Promise<{ ok: true; ctx: LoadedRunContext } | { ok: false; error: string }> {
  const { data: run, error: runErr } = await supabase
    .from("agent_runs")
    .select("id, agent_id, version_id, status")
    .eq("id", runId)
    .single();

  if (runErr || !run) {
    return { ok: false, error: runErr?.message ?? "Run not found" };
  }

  const versionId = run.version_id as string | null;
  if (!versionId) {
    return { ok: false, error: "Missing version" };
  }

  const { data: agentRow, error: agentErr } = await supabase
    .from("agents")
    .select("user_id, mission")
    .eq("id", run.agent_id as string)
    .single();

  if (agentErr || !agentRow?.user_id) {
    return { ok: false, error: agentErr?.message ?? "Agent not found" };
  }

  const userId = agentRow.user_id as string;
  const agentMission =
    typeof agentRow.mission === "string" && agentRow.mission.trim()
      ? agentRow.mission.trim()
      : null;

  const { data: nodeRows, error: nodesErr } = await supabase
    .from("agent_nodes")
    .select("react_flow_id, type, label, data")
    .eq("version_id", versionId)
    .order("created_at", { ascending: true });

  if (nodesErr) {
    return { ok: false, error: nodesErr.message };
  }

  const { data: edgeRows, error: edgesErr } = await supabase
    .from("agent_edges")
    .select("source_node, target_node")
    .eq("version_id", versionId);

  if (edgesErr) {
    return { ok: false, error: edgesErr.message };
  }

  const edges: GraphEdgeRow[] = edgeRows ?? [];
  const rawNodes = nodeRows ?? [];

  const executionNodes: ExecutionNode[] = [];
  for (const row of rawNodes) {
    const n = toExecutionNode(row);
    if (!n) {
      return {
        ok: false,
        error: `Unsupported node type "${row.type}" on node ${row.react_flow_id}.`,
      };
    }
    executionNodes.push(n);
  }

  const ordered = orderNodesForExecution(executionNodes, edges);
  const summarized = summarizePlan(ordered);
  const plan: ExecutionPlanSnapshot = {
    order: summarized.order,
    nodeTypes: summarized.nodeTypes,
  };

  return {
    ok: true,
    ctx: {
      run: {
        id: run.id as string,
        agent_id: run.agent_id as string,
        version_id: versionId,
        status: run.status as string,
      },
      userId,
      agentMission,
      executionNodes,
      edges,
      ordered,
      plan,
    },
  };
}

type LoopResult =
  | { kind: "completed" }
  | { kind: "paused" }
  | { kind: "failed"; error: string };

async function executeOrderedNodes(
  supabase: ServiceClient,
  params: {
    runId: string;
    agentId: string;
    userId: string;
    agentMission: string | null;
    edges: GraphEdgeRow[];
    plan: ExecutionPlanSnapshot;
    ordered: ExecutionNode[];
    /** Inclusive start index in `ordered` */
    startIndex: number;
    initialStepIndex: number;
    outputsByNodeId: Record<string, Record<string, unknown>>;
  },
): Promise<LoopResult> {
  const { runId, agentId, userId, agentMission, edges, plan, ordered, startIndex, initialStepIndex, outputsByNodeId } =
    params;

  const runtime = {
    supabase,
    runId,
    agentId,
    userId,
    agentMission,
    edges,
    executionPlan: plan,
  };

  let stepIndex = initialStepIndex;

  try {
    for (let i = startIndex; i < ordered.length; i++) {
      const node = ordered[i]!;
      const executor = getNodeExecutor(node.type);
      if (!executor) {
        await markRunFailed(supabase, runId, `No executor for type ${node.type}`);
        return { kind: "failed", error: `No executor for type ${node.type}` };
      }

      const upstreamOutputs = collectUpstreamOutputs(node.react_flow_id, edges, outputsByNodeId);

      const result = await executor({
        runtime,
        node,
        stepIndex,
        upstreamOutputs,
      });

      if (result.kind === "failed") {
        await insertRunStep(supabase, {
          runId,
          stepIndex: stepIndex++,
          nodeType: node.type,
          nodeId: node.react_flow_id,
          status: "failed",
          output: null,
          error: result.error,
        });
        await markRunFailed(supabase, runId, result.error);
        return { kind: "failed", error: result.error };
      }

      if (result.kind === "paused_approval") {
        await insertRunStep(supabase, {
          runId,
          stepIndex: stepIndex++,
          nodeType: node.type,
          nodeId: node.react_flow_id,
          status: "waiting_for_approval",
          output: result.output,
          error: null,
        });
        outputsByNodeId[node.react_flow_id] = result.output;
        await setRunWaitingForApproval(supabase, runId, {
          summary: "Paused for human approval.",
          pausedAtNodeId: node.react_flow_id,
          plan,
          outputsByNodeId,
          resume: {
            pausedAtIndex: i,
            approvalNodeReactFlowId: node.react_flow_id,
          },
        });
        return { kind: "paused" };
      }

      outputsByNodeId[node.react_flow_id] = result.output;
      await insertRunStep(supabase, {
        runId,
        stepIndex: stepIndex++,
        nodeType: node.type,
        nodeId: node.react_flow_id,
        status: "completed",
        output: result.output,
        error: null,
      });
    }

    await finalizeRun(supabase, runId, {
      status: "completed",
      output: {
        summary: "Execution finished.",
        nodeCount: ordered.length,
        plan,
        outputsByNodeId,
      },
      error: null,
    });

    return { kind: "completed" };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    await markRunFailed(supabase, runId, message);
    return { kind: "failed", error: message };
  }
}

export async function processAgentRun(
  supabase: ServiceClient,
  runId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: runRow, error: runErr } = await supabase
    .from("agent_runs")
    .select("id, status")
    .eq("id", runId)
    .single();

  if (runErr || !runRow) {
    return { ok: false, error: runErr?.message ?? "Run not found" };
  }

  const st = runRow.status as string;
  if (st !== "pending" && st !== "running") {
    return {
      ok: false,
      error: `Run cannot be started from status "${st}" (expected pending or running).`,
    };
  }

  const loaded = await loadRunExecutionContext(supabase, runId);
  if (!loaded.ok) {
    await markRunFailed(supabase, runId, loaded.error);
    return { ok: false, error: loaded.error };
  }

  const { ctx } = loaded;

  await supabase
    .from("agent_runs")
    .update({ status: "running", started_at: new Date().toISOString() })
    .eq("id", runId);

  const loop = await executeOrderedNodes(supabase, {
    runId,
    agentId: ctx.run.agent_id,
    userId: ctx.userId,
    agentMission: ctx.agentMission,
    edges: ctx.edges,
    plan: ctx.plan,
    ordered: ctx.ordered,
    startIndex: 0,
    initialStepIndex: 0,
    outputsByNodeId: {},
  });

  if (loop.kind === "failed") return { ok: false, error: loop.error };
  return { ok: true };
}

/**
 * Continues execution after an approval node was approved.
 * Expects run status `waiting_for_approval` and existing steps including the approval gate.
 */
export async function resumeAgentRunAfterApproval(
  supabase: ServiceClient,
  runId: string,
  approvalNodeReactFlowId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: runRow, error: runErr } = await supabase
    .from("agent_runs")
    .select("id, status")
    .eq("id", runId)
    .single();

  if (runErr || !runRow) {
    return { ok: false, error: runErr?.message ?? "Run not found" };
  }

  if ((runRow.status as string) !== "waiting_for_approval") {
    return {
      ok: false,
      error: `Run is not waiting for approval (status: ${String(runRow.status)}).`,
    };
  }

  const loaded = await loadRunExecutionContext(supabase, runId);
  if (!loaded.ok) {
    return { ok: false, error: loaded.error };
  }

  const { ctx } = loaded;
  const idx = ctx.ordered.findIndex((n) => n.react_flow_id === approvalNodeReactFlowId);
  if (idx < 0) {
    return { ok: false, error: `Approval node ${approvalNodeReactFlowId} not found in graph order.` };
  }

  const { data: stepRows, error: stepErr } = await supabase
    .from("agent_run_steps")
    .select("step_index, node_id, status, output")
    .eq("run_id", runId)
    .order("step_index", { ascending: true });

  if (stepErr) {
    return { ok: false, error: stepErr.message };
  }

  const steps = stepRows ?? [];
  const outputsByNodeId = buildOutputsFromRunSteps(steps);
  const maxStep = steps.reduce((m, s) => Math.max(m, s.step_index), -1);
  const nextStepIndex = maxStep + 1;
  const startIndex = idx + 1;

  if (startIndex >= ctx.ordered.length) {
    await setRunRunning(supabase, runId);
    await finalizeRun(supabase, runId, {
      status: "completed",
      output: {
        summary: "Approval granted; no further nodes to execute.",
        nodeCount: ctx.ordered.length,
        plan: ctx.plan,
        outputsByNodeId,
        resumed: true,
      },
      error: null,
    });
    return { ok: true };
  }

  await setRunRunning(supabase, runId);

  const loop = await executeOrderedNodes(supabase, {
    runId,
    agentId: ctx.run.agent_id,
    userId: ctx.userId,
    agentMission: ctx.agentMission,
    edges: ctx.edges,
    plan: ctx.plan,
    ordered: ctx.ordered,
    startIndex,
    initialStepIndex: nextStepIndex,
    outputsByNodeId,
  });

  if (loop.kind === "failed") return { ok: false, error: loop.error };
  return { ok: true };
}
