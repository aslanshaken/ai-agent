import OpenAI from "openai";
import {
  REASONING_MAX_UPSTREAM_CHARS,
  resolveReasoningModel,
} from "@/lib/tools/ai/constants";
import { mockReasoning } from "@/lib/tools/ai/mock-reasoning";

export type PriorityRankerInput = {
  instruction?: string;
  previousOutputs: Record<string, unknown>;
  agentMission?: string;
  model: string;
};

export type PriorityRankerOutput = {
  providerUsed: "mock" | "openai";
  briefingSummary: string;
  topPriorities: string[];
  opportunities: string[];
  risks: string[];
  recommendations: string[];
  confidence: number;
  fallbackReason?: string;
  raw?: unknown;
};

function serializeUpstream(previousOutputs: Record<string, unknown>): string {
  try {
    const s = JSON.stringify(previousOutputs, null, 2);
    return s.length > REASONING_MAX_UPSTREAM_CHARS
      ? `${s.slice(0, REASONING_MAX_UPSTREAM_CHARS)}…`
      : s;
  } catch {
    return "(upstream not serializable)";
  }
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => (typeof x === "string" ? x.trim() : String(x)))
    .filter(Boolean)
    .slice(0, 40);
}

function normalizeParsed(parsed: Record<string, unknown>): Omit<PriorityRankerOutput, "providerUsed" | "raw" | "fallbackReason"> {
  const briefingSummary =
    typeof parsed.briefingSummary === "string" && parsed.briefingSummary.trim()
      ? parsed.briefingSummary.trim()
      : "Daily briefing (no summary returned).";
  let confidence =
    typeof parsed.confidence === "number" && Number.isFinite(parsed.confidence)
      ? parsed.confidence
      : 0.72;
  confidence = Math.min(1, Math.max(0, confidence));
  return {
    briefingSummary,
    topPriorities: asStringArray(parsed.topPriorities),
    opportunities: asStringArray(parsed.opportunities),
    risks: asStringArray(parsed.risks),
    recommendations: asStringArray(parsed.recommendations),
    confidence,
  };
}

async function openaiPriorityRank(
  input: PriorityRankerInput,
  resolvedModel: string,
): Promise<PriorityRankerOutput> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const client = new OpenAI({ apiKey });
  const upstreamJson = serializeUpstream(input.previousOutputs);

  const system = [
    "You are an operational chief-of-staff AI for a startup founder.",
    "Respond with JSON only — no markdown fences.",
    'Schema: {"briefingSummary":"string","topPriorities":["string"],"opportunities":["string"],"risks":["string"],"recommendations":["string"],"confidence":number}',
    "Arrays should contain short, actionable lines (max ~12 items each).",
    "confidence is 0–1.",
  ].join(" ");

  const userParts = [
    input.agentMission ? `Company / agent mission:\n${input.agentMission}` : null,
    input.instruction?.trim() ? `Instruction:\n${input.instruction.trim()}` : null,
    `Upstream outputs (JSON keyed by node id):\n${upstreamJson}`,
  ].filter(Boolean);

  const completion = await client.chat.completions.create({
    model: resolvedModel,
    temperature: 0.35,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: userParts.join("\n\n") },
    ],
  });

  const text = completion.choices[0]?.message?.content?.trim();
  if (!text) throw new Error("OpenAI returned empty content");

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error("OpenAI response was not valid JSON");
  }

  const normalized = normalizeParsed(parsed);
  const raw = {
    model: completion.model,
    id: completion.id,
    finishReason: completion.choices[0]?.finish_reason ?? null,
    usage: completion.usage ?? null,
  };

  return { providerUsed: "openai", ...normalized, raw };
}

function mockPriorityRank(input: PriorityRankerInput): PriorityRankerOutput {
  const model = resolveReasoningModel(input.model);
  const base = mockReasoning({
    prompt: undefined,
    instruction: input.instruction,
    previousOutputs: input.previousOutputs,
    agentMission: input.agentMission,
    outputFormat: "action_items",
    model,
  });
  const items = base.actionItems.length ? base.actionItems : ["Review inbox", "Check runway", "Ship one customer-facing improvement"];
  return {
    providerUsed: "mock",
    briefingSummary: base.summary || "Mock daily briefing — configure OPENAI_API_KEY for live ranking.",
    topPriorities: items.slice(0, 5),
    opportunities: ["Mock investor intro opportunity", "Mock hiring pipeline lead"],
    risks: ["Mock competitive noise", "Execution bandwidth"],
    recommendations: items.slice(0, 4),
    confidence: base.confidence,
    fallbackReason: base.fallbackReason,
  };
}

export async function runPriorityRankWithFallback(input: PriorityRankerInput): Promise<PriorityRankerOutput> {
  const resolvedModel = resolveReasoningModel(input.model);

  if (!process.env.OPENAI_API_KEY?.trim()) {
    const out = mockPriorityRank(input);
    return {
      ...out,
      fallbackReason: out.fallbackReason ?? "OPENAI_API_KEY not configured; using mock priority ranker.",
    };
  }

  try {
    return await openaiPriorityRank(input, resolvedModel);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "OpenAI failed";
    const out = mockPriorityRank(input);
    return {
      ...out,
      fallbackReason: `OpenAI error (${msg}); using mock priority ranker.`,
    };
  }
}
