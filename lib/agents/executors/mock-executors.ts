import type { AgentNodeType } from "@/lib/schemas/agents";
import { nodeTypes } from "@/lib/schemas/agents";
import { parseAiReasoningNodeData } from "@/lib/schemas/ai-reasoning-node";
import { parseSaveToDbNodeData } from "@/lib/schemas/save-to-db-node";
import { parseSearchNodeExecutionInput } from "@/lib/schemas/search-node";
import type { NodeExecutor } from "@/lib/agents/executors/types";
import { redactForStorage } from "@/lib/utils/redact-for-storage";
import { resolveReasoningModel } from "@/lib/tools/ai/constants";
import { runReasoningWithFallback } from "@/lib/tools/ai/reasoning-tool";
import { runSearchWithFallback } from "@/lib/tools/search/search-tool";

function isAgentNodeType(t: string): t is AgentNodeType {
  return (nodeTypes as readonly string[]).includes(t);
}

const executeTrigger: NodeExecutor = async ({ node }) => ({
  kind: "ok",
  output: {
    kind: "trigger",
    nodeId: node.react_flow_id,
    startedAt: new Date().toISOString(),
    note: "Workflow entry (mock).",
  },
});

const executeSearch: NodeExecutor = async ({ node, runtime }) => {
  const parsed = parseSearchNodeExecutionInput(node.data, runtime.agentMission);
  if (!parsed.ok) {
    return { kind: "failed", error: parsed.error };
  }

  const { result, meta } = await runSearchWithFallback({
    provider: parsed.provider,
    query: parsed.query,
    limit: parsed.limit,
  });

  return {
    kind: "ok",
    output: {
      kind: "search",
      nodeId: node.react_flow_id,
      requestedProvider: meta.requestedProvider,
      providerUsed: result.providerUsed,
      query: result.query,
      resultCount: result.resultCount,
      results: result.results,
      fallbackReason: meta.fallbackReason,
      agentId: runtime.agentId,
    },
  };
};

const executeAiReasoning: NodeExecutor = async ({ node, upstreamOutputs, runtime }) => {
  const parsed = parseAiReasoningNodeData(node.data);
  if (!parsed.ok) {
    return { kind: "failed", error: parsed.error };
  }

  const model = resolveReasoningModel(parsed.data.model);
  const out = await runReasoningWithFallback({
    prompt: parsed.data.prompt,
    instruction: parsed.data.instruction,
    previousOutputs: upstreamOutputs as Record<string, unknown>,
    agentMission: runtime.agentMission ?? undefined,
    outputFormat: parsed.data.outputFormat,
    model,
  });

  return {
    kind: "ok",
    output: {
      kind: "ai_reasoning",
      nodeId: node.react_flow_id,
      providerUsed: out.providerUsed,
      summary: out.summary,
      actionItems: out.actionItems,
      confidence: out.confidence,
      fallbackReason: out.fallbackReason,
      model,
      outputFormat: parsed.data.outputFormat,
      raw: out.raw,
      agentId: runtime.agentId,
    },
  };
};

const executeCondition: NodeExecutor = async ({ node, upstreamOutputs }) => {
  const keys = Object.keys(upstreamOutputs);
  const branch = keys.length > 0 ? "true" : "false";
  return {
    kind: "ok",
    output: {
      kind: "condition",
      nodeId: node.react_flow_id,
      mock: true,
      branch,
      reason: keys.length > 0 ? "Upstream present (mock true branch)." : "No upstream (mock false branch).",
    },
  };
};

const executeApproval: NodeExecutor = async ({ node, runtime, upstreamOutputs }) => {
  const planOrder = runtime.executionPlan?.order ?? [];
  const planNodeTypes = runtime.executionPlan?.nodeTypes ?? [];
  const { data: row, error } = await runtime.supabase
    .from("approvals")
    .insert({
      agent_id: runtime.agentId,
      run_id: runtime.runId,
      title: `Approval required — node ${node.react_flow_id}`,
      status: "pending",
      payload: {
        nodeId: node.react_flow_id,
        approvalNodeReactFlowId: node.react_flow_id,
        approvalNodeType: "approval",
        runId: runtime.runId,
        agentId: runtime.agentId,
        kind: "workflow_gate",
        sourceAgentRunId: runtime.runId,
        upstreamNodeIds: Object.keys(upstreamOutputs),
        planOrder,
        planNodeTypes,
      },
    })
    .select("id")
    .single();

  if (error || !row) {
    return { kind: "failed", error: error?.message ?? "approval insert failed" };
  }

  return {
    kind: "paused_approval",
    output: {
      kind: "approval",
      nodeId: node.react_flow_id,
      approvalId: row.id,
      message: "Run paused until approval is resolved (mock).",
    },
  };
};

function deriveSummaryFromSources(sources: Record<string, Record<string, unknown>>): string {
  for (const out of Object.values(sources)) {
    if (out?.kind === "ai_reasoning" && typeof out.summary === "string" && out.summary.trim()) {
      return out.summary.trim().slice(0, 8000);
    }
  }
  const titles: string[] = [];
  for (const out of Object.values(sources)) {
    if (out?.kind === "search" && Array.isArray(out.results)) {
      for (const r of out.results as { title?: string }[]) {
        if (typeof r?.title === "string" && r.title.trim()) titles.push(r.title.trim());
      }
    }
  }
  if (titles.length) return titles.slice(0, 12).join(" · ").slice(0, 8000);
  return "Structured workflow output (no AI summary or search titles found).";
}

const executeSaveToDb: NodeExecutor = async ({ node, runtime, upstreamOutputs }) => {
  const parsed = parseSaveToDbNodeData(node.data);
  if (!parsed.ok) {
    return { kind: "failed", error: parsed.error };
  }

  const sid = parsed.data.sourceNodeId?.trim();
  let sources: Record<string, Record<string, unknown>>;
  if (sid) {
    const chunk = upstreamOutputs[sid];
    if (!chunk) {
      return {
        kind: "failed",
        error: `sourceNodeId "${sid}" not found in upstream outputs (${Object.keys(upstreamOutputs).join(", ") || "none"}).`,
      };
    }
    sources = { [sid]: chunk };
  } else {
    sources = { ...upstreamOutputs };
  }

  if (Object.keys(sources).length === 0) {
    return { kind: "failed", error: "No upstream data to save. Connect upstream nodes." };
  }

  const title =
    parsed.data.title?.trim() ||
    `Research · ${new Date().toISOString().slice(0, 19).replace("T", " ")}`;

  const summary = deriveSummaryFromSources(sources);
  const rawContent = {
    nodes: sources,
    savedByNodeId: node.react_flow_id,
    savedAt: new Date().toISOString(),
  };
  const content = redactForStorage(rawContent) as Record<string, unknown>;

  const tags = parsed.data.tags ?? [];

  const row = {
    user_id: runtime.userId,
    agent_id: runtime.agentId,
    run_id: runtime.runId,
    title,
    summary,
    content,
    tags,
    source_node_id: sid || null,
    query: title.slice(0, 280),
    result: { schemaVersion: 2, nodeKinds: Object.values(sources).map((o) => o?.kind ?? "unknown") },
  };

  const { data: inserted, error } = await runtime.supabase
    .from("research_results")
    .insert(row)
    .select("id")
    .single();

  if (error || !inserted) {
    return { kind: "failed", error: error?.message ?? "research_results insert failed" };
  }

  return {
    kind: "ok",
    output: {
      kind: "save_to_db",
      nodeId: node.react_flow_id,
      recordId: inserted.id,
      target: "research_results",
      title,
      summary,
    },
  };
};

const executeNotification: NodeExecutor = async ({ node, runtime, upstreamOutputs }) => {
  const channel =
    (typeof node.data.channel === "string" && node.data.channel) || "log";
  return {
    kind: "ok",
    output: {
      kind: "notification",
      nodeId: node.react_flow_id,
      mock: true,
      channel,
      message: `Would notify via ${channel} (mock). Upstream nodes: ${Object.keys(upstreamOutputs).join(", ") || "none"}.`,
      runId: runtime.runId,
    },
  };
};

const registry: Record<AgentNodeType, NodeExecutor> = {
  trigger: executeTrigger,
  search: executeSearch,
  ai_reasoning: executeAiReasoning,
  condition: executeCondition,
  approval: executeApproval,
  save_to_db: executeSaveToDb,
  notification: executeNotification,
};

export function getNodeExecutor(type: string): NodeExecutor | null {
  if (!isAgentNodeType(type)) return null;
  return registry[type] ?? null;
}
