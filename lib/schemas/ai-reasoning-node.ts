import { z } from "zod";

export const aiReasoningNodeDataSchema = z.object({
  instruction: z.string().max(8000).optional(),
  prompt: z.string().max(8000).optional(),
  outputFormat: z.enum(["summary", "structured", "action_items"]).default("summary"),
  model: z.string().max(120).optional(),
});

export type AiReasoningNodeData = z.infer<typeof aiReasoningNodeDataSchema>;

export function parseAiReasoningNodeData(data: Record<string, unknown>):
  | { ok: true; data: AiReasoningNodeData }
  | { ok: false; error: string } {
  const parsed = aiReasoningNodeDataSchema.safeParse(data);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join(". "),
    };
  }
  return { ok: true, data: parsed.data };
}
