import OpenAI from "openai";
import { REASONING_MAX_UPSTREAM_CHARS } from "@/lib/tools/ai/constants";
import type { ReasoningToolInput } from "@/lib/tools/ai/types";

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

function formatHint(outputFormat: string | undefined): string {
  switch (outputFormat) {
    case "action_items":
      return "Prioritize concrete action_items (short imperative lines). summary should briefly introduce them.";
    case "structured":
      return "summary should be an overview; action_items should list labeled bullets or checklist items derived from upstream.";
    default:
      return "summary should be a clear narrative; action_items can be empty or a few follow-ups.";
  }
}

type ParsedJson = {
  summary?: unknown;
  actionItems?: unknown;
  confidence?: unknown;
};

function normalizeParsed(parsed: ParsedJson): { summary: string; actionItems: string[]; confidence: number } {
  const summary = typeof parsed.summary === "string" ? parsed.summary.trim() : "";
  const rawItems = Array.isArray(parsed.actionItems) ? parsed.actionItems : [];
  const actionItems = rawItems
    .map((x) => (typeof x === "string" ? x.trim() : String(x)))
    .filter(Boolean);
  let confidence = typeof parsed.confidence === "number" && Number.isFinite(parsed.confidence) ? parsed.confidence : 0.7;
  confidence = Math.min(1, Math.max(0, confidence));
  return {
    summary: summary || "No summary returned by the model.",
    actionItems,
    confidence,
  };
}

/**
 * Calls OpenAI chat completions with JSON output.
 * @throws when the key is missing, the API errors, or the response is unusable.
 */
export async function openaiReasoning(
  input: ReasoningToolInput,
): Promise<{ summary: string; actionItems: string[]; confidence: number; raw: unknown }> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const client = new OpenAI({ apiKey });
  const upstreamJson = serializeUpstream(input.previousOutputs);
  const format = input.outputFormat ?? "summary";

  const system = [
    "You are an operational AI assistant for a founder workflow engine.",
    "You receive upstream node outputs (JSON) and must respond with JSON only — no markdown fences.",
    'Schema: {"summary":"string","actionItems":["string"],"confidence":number}',
    "confidence must be between 0 and 1 (your calibrated certainty).",
    formatHint(format),
  ].join(" ");

  const userParts = [
    input.agentMission ? `Agent mission:\n${input.agentMission}` : null,
    input.instruction?.trim() ? `Node instruction:\n${input.instruction.trim()}` : null,
    input.prompt?.trim() ? `Additional prompt:\n${input.prompt.trim()}` : null,
    `Requested output format: ${format}`,
    `Upstream outputs (object keyed by node id):\n${upstreamJson}`,
  ].filter(Boolean);

  const completion = await client.chat.completions.create({
    model: input.model,
    temperature: 0.35,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: userParts.join("\n\n") },
    ],
  });

  const text = completion.choices[0]?.message?.content?.trim();
  if (!text) throw new Error("OpenAI returned empty content");

  let parsed: ParsedJson;
  try {
    parsed = JSON.parse(text) as ParsedJson;
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

  return { ...normalized, raw };
}
