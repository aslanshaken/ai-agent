import { z } from "zod";

export const priorityRankerNodeDataSchema = z.object({
  instruction: z.string().max(8000).optional(),
  model: z.string().max(120).optional(),
});

export type PriorityRankerNodeData = z.infer<typeof priorityRankerNodeDataSchema>;

export function parsePriorityRankerNodeData(data: Record<string, unknown>):
  | { ok: true; data: PriorityRankerNodeData }
  | { ok: false; error: string } {
  const parsed = priorityRankerNodeDataSchema.safeParse(data);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join(". "),
    };
  }
  return { ok: true, data: parsed.data };
}
