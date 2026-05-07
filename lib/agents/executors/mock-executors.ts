import type { AgentNodeType } from "@/lib/schemas/agents";
import { nodeTypes } from "@/lib/schemas/agents";
import { extractDailyBriefingPayload } from "@/lib/briefings/extract-daily-briefing";
import { formatMemoryContextForPrompt } from "@/lib/memory/memory-context-builder";
import { ingestMemoryArtifact } from "@/lib/memory/ingest-artifact";
import { retrieveSemanticMemory } from "@/lib/memory/semantic-retrieval";
import { parseAiReasoningNodeData } from "@/lib/schemas/ai-reasoning-node";
import {
  createTaskNodeDataSchema,
  saveCandidateNodeDataSchema,
  saveCompanyNodeDataSchema,
  saveInvestorNodeDataSchema,
} from "@/lib/schemas/operational-nodes";
import { parsePriorityRankerNodeData } from "@/lib/schemas/priority-ranker-node";
import { parseSaveToDbNodeData } from "@/lib/schemas/save-to-db-node";
import { parseSearchNodeExecutionInput } from "@/lib/schemas/search-node";
import type { NodeExecutor } from "@/lib/agents/executors/types";
import { redactForStorage } from "@/lib/utils/redact-for-storage";
import { resolveReasoningModel } from "@/lib/tools/ai/constants";
import { runPriorityRankWithFallback } from "@/lib/tools/ai/priority-ranker-tool";
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

  const queryBits = [parsed.data.instruction, parsed.data.prompt, runtime.agentMission]
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .join("\n");

  const chunks = await retrieveSemanticMemory(runtime.supabase, {
    userId: runtime.userId,
    queryText: queryBits.slice(0, 8000) || "founder company context",
    categories: runtime.memoryCategories.length ? runtime.memoryCategories : null,
    limit: 8,
  });

  const prefix = formatMemoryContextForPrompt(chunks);
  const mergedInstruction = prefix
    ? `${prefix}\n\n### Node instruction\n${parsed.data.instruction ?? ""}`
    : parsed.data.instruction;

  const model = resolveReasoningModel(parsed.data.model);
  const out = await runReasoningWithFallback({
    prompt: parsed.data.prompt,
    instruction: mergedInstruction,
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
      memoryChunksUsed: chunks.length,
    },
  };
};

const executeAggregateResults: NodeExecutor = async ({ node, upstreamOutputs }) => {
  type AggItem = {
    sourceNodeId: string;
    kind: string;
    label?: string;
    snippet?: string;
    resultCount?: number;
    titles?: string[];
  };

  const aggregatedResults: AggItem[] = [];

  for (const [sourceNodeId, raw] of Object.entries(upstreamOutputs)) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const out = raw as Record<string, unknown>;
    const kind = typeof out.kind === "string" ? out.kind : "unknown";

    if (kind === "search") {
      const results = Array.isArray(out.results)
        ? (out.results as { title?: string }[])
        : [];
      const titles = results
        .map((r) => (typeof r?.title === "string" ? r.title : ""))
        .filter(Boolean)
        .slice(0, 8);
      aggregatedResults.push({
        sourceNodeId,
        kind,
        label: typeof out.query === "string" ? out.query : undefined,
        resultCount: typeof out.resultCount === "number" ? out.resultCount : titles.length,
        titles,
      });
      continue;
    }

    if (kind === "priority_ranker") {
      const summary = typeof out.briefingSummary === "string" ? out.briefingSummary : "";
      aggregatedResults.push({
        sourceNodeId,
        kind,
        snippet: summary.slice(0, 1200),
      });
      continue;
    }

    if (kind === "ai_reasoning") {
      const summary = typeof out.summary === "string" ? out.summary : "";
      aggregatedResults.push({
        sourceNodeId,
        kind,
        snippet: summary.slice(0, 1200),
      });
      continue;
    }

    aggregatedResults.push({
      sourceNodeId,
      kind,
      snippet: JSON.stringify(out).slice(0, 800),
    });
  }

  return {
    kind: "ok",
    output: {
      kind: "aggregate_results",
      nodeId: node.react_flow_id,
      aggregatedResults,
      mergedCount: aggregatedResults.length,
    },
  };
};

const executePriorityRanker: NodeExecutor = async ({ node, upstreamOutputs, runtime }) => {
  const parsed = parsePriorityRankerNodeData(node.data);
  if (!parsed.ok) {
    return { kind: "failed", error: parsed.error };
  }

  const out = await runPriorityRankWithFallback({
    instruction: parsed.data.instruction,
    previousOutputs: upstreamOutputs as Record<string, unknown>,
    agentMission: runtime.agentMission ?? undefined,
    model: parsed.data.model ?? "",
  });

  return {
    kind: "ok",
    output: {
      kind: "priority_ranker",
      nodeId: node.react_flow_id,
      providerUsed: out.providerUsed,
      briefingSummary: out.briefingSummary,
      topPriorities: out.topPriorities,
      opportunities: out.opportunities,
      risks: out.risks,
      recommendations: out.recommendations,
      confidence: out.confidence,
      fallbackReason: out.fallbackReason,
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

  if (parsed.data.target === "daily_briefings") {
    const extracted = extractDailyBriefingPayload(sources, title);
    const { data: inserted, error } = await runtime.supabase
      .from("daily_briefings")
      .insert({
        user_id: runtime.userId,
        run_id: runtime.runId,
        title: extracted.title,
        summary: extracted.summary,
        priorities: extracted.priorities,
        opportunities: extracted.opportunities,
        risks: extracted.risks,
        recommendations: extracted.recommendations,
      })
      .select("id")
      .single();

    if (error || !inserted) {
      return { kind: "failed", error: error?.message ?? "daily_briefings insert failed" };
    }

    void ingestMemoryArtifact(runtime.supabase, {
      userId: runtime.userId,
      category: "research_history",
      title: extracted.title,
      bodyText: extracted.summary,
      source: `daily_briefing:${inserted.id}`,
    }).catch(() => {});

    return {
      kind: "ok",
      output: {
        kind: "save_to_db",
        nodeId: node.react_flow_id,
        recordId: inserted.id,
        target: "daily_briefings",
        title: extracted.title,
        summary: extracted.summary.slice(0, 400),
      },
    };
  }

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

  void ingestMemoryArtifact(runtime.supabase, {
    userId: runtime.userId,
    category: "research_history",
    title,
    bodyText: `${summary}\n\n${JSON.stringify(tags)}`,
    source: `research_results:${inserted.id}`,
  }).catch(() => {});

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

const executeCreateTask: NodeExecutor = async ({ node, runtime }) => {
  const parsed = createTaskNodeDataSchema.safeParse(node.data);
  if (!parsed.success) {
    return { kind: "failed", error: parsed.error.issues.map((i) => i.message).join(". ") };
  }
  const d = parsed.data;
  const due =
    d.due_date && !Number.isNaN(Date.parse(d.due_date))
      ? new Date(d.due_date).toISOString()
      : null;

  const { data: inserted, error } = await runtime.supabase
    .from("tasks")
    .insert({
      user_id: runtime.userId,
      agent_id: runtime.agentId,
      run_id: runtime.runId,
      title: d.title,
      description: d.description ?? null,
      priority: d.priority ?? "medium",
      status: "pending",
      due_date: due,
      source_node_id: node.react_flow_id,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    return { kind: "failed", error: error?.message ?? "tasks insert failed" };
  }

  return {
    kind: "ok",
    output: {
      kind: "create_task",
      nodeId: node.react_flow_id,
      taskId: inserted.id,
      title: d.title,
    },
  };
};

const executeSaveInvestor: NodeExecutor = async ({ node, runtime }) => {
  const parsed = saveInvestorNodeDataSchema.safeParse(node.data);
  if (!parsed.success) {
    return { kind: "failed", error: parsed.error.issues.map((i) => i.message).join(". ") };
  }
  const d = parsed.data;
  const { data: inserted, error } = await runtime.supabase
    .from("investors")
    .insert({
      user_id: runtime.userId,
      name: d.name,
      fund: d.fund ?? null,
      focus: d.focus ?? null,
      stage: d.stage ?? null,
      location: d.location ?? null,
      linkedin_url: d.linkedin_url ?? null,
      website: d.website ?? null,
      score: d.score ?? null,
      reason: d.reason ?? null,
      status: d.status ?? "new",
      source_run_id: runtime.runId,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    return { kind: "failed", error: error?.message ?? "investors insert failed" };
  }

  return {
    kind: "ok",
    output: {
      kind: "save_investor",
      nodeId: node.react_flow_id,
      recordId: inserted.id,
      name: d.name,
    },
  };
};

const executeSaveCandidate: NodeExecutor = async ({ node, runtime }) => {
  const parsed = saveCandidateNodeDataSchema.safeParse(node.data);
  if (!parsed.success) {
    return { kind: "failed", error: parsed.error.issues.map((i) => i.message).join(". ") };
  }
  const d = parsed.data;
  const { data: inserted, error } = await runtime.supabase
    .from("candidates")
    .insert({
      user_id: runtime.userId,
      name: d.name,
      role: d.role ?? null,
      skills: d.skills ?? null,
      location: d.location ?? null,
      linkedin_url: d.linkedin_url ?? null,
      github_url: d.github_url ?? null,
      score: d.score ?? null,
      reason: d.reason ?? null,
      status: d.status ?? "new",
      source_run_id: runtime.runId,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    return { kind: "failed", error: error?.message ?? "candidates insert failed" };
  }

  return {
    kind: "ok",
    output: {
      kind: "save_candidate",
      nodeId: node.react_flow_id,
      recordId: inserted.id,
      name: d.name,
    },
  };
};

const executeSaveCompany: NodeExecutor = async ({ node, runtime }) => {
  const parsed = saveCompanyNodeDataSchema.safeParse(node.data);
  if (!parsed.success) {
    return { kind: "failed", error: parsed.error.issues.map((i) => i.message).join(". ") };
  }
  const d = parsed.data;
  const { data: inserted, error } = await runtime.supabase
    .from("companies")
    .insert({
      user_id: runtime.userId,
      name: d.name,
      industry: d.industry ?? null,
      website: d.website ?? null,
      description: d.description ?? null,
      score: d.score ?? null,
      notes: d.notes ?? null,
      source_run_id: runtime.runId,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    return { kind: "failed", error: error?.message ?? "companies insert failed" };
  }

  return {
    kind: "ok",
    output: {
      kind: "save_company",
      nodeId: node.react_flow_id,
      recordId: inserted.id,
      name: d.name,
    },
  };
};

const registry: Record<AgentNodeType, NodeExecutor> = {
  trigger: executeTrigger,
  search: executeSearch,
  aggregate_results: executeAggregateResults,
  ai_reasoning: executeAiReasoning,
  priority_ranker: executePriorityRanker,
  condition: executeCondition,
  approval: executeApproval,
  save_to_db: executeSaveToDb,
  notification: executeNotification,
  create_task: executeCreateTask,
  save_investor: executeSaveInvestor,
  save_candidate: executeSaveCandidate,
  save_company: executeSaveCompany,
};

export function getNodeExecutor(type: string): NodeExecutor | null {
  if (!isAgentNodeType(type)) return null;
  return registry[type] ?? null;
}
