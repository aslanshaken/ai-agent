import { mockReasoning } from "@/lib/tools/ai/mock-reasoning";
import { openaiReasoning } from "@/lib/tools/ai/openai-reasoning";
import type { ReasoningToolInput, ReasoningToolOutput } from "@/lib/tools/ai/types";

/**
 * Runs reasoning with OpenAI when configured; otherwise or on failure, mock (never throws).
 */
export async function runReasoningWithFallback(input: ReasoningToolInput): Promise<ReasoningToolOutput> {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    const out = mockReasoning(input);
    return {
      ...out,
      fallbackReason: "OPENAI_API_KEY not configured; using mock.",
    };
  }

  try {
    const { summary, actionItems, confidence, raw } = await openaiReasoning(input);
    return {
      providerUsed: "openai",
      summary,
      actionItems,
      confidence,
      raw,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "OpenAI failed";
    const out = mockReasoning(input);
    return {
      ...out,
      fallbackReason: `OpenAI error (${msg}); using mock.`,
    };
  }
}
