import { z } from "zod";

export const saveToDbNodeDataSchema = z.object({
  target: z.literal("research_results").optional().default("research_results"),
  sourceNodeId: z.string().max(256).optional(),
  title: z.string().max(500).optional(),
  tags: z
    .union([z.string(), z.array(z.string().max(80))])
    .optional()
    .transform((v): string[] | undefined => {
      if (v === undefined) return undefined;
      if (Array.isArray(v)) return v.slice(0, 40);
      return v
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 40);
    }),
});

export type SaveToDbNodeData = z.infer<typeof saveToDbNodeDataSchema>;

export function parseSaveToDbNodeData(data: Record<string, unknown>):
  | { ok: true; data: SaveToDbNodeData }
  | { ok: false; error: string } {
  const parsed = saveToDbNodeDataSchema.safeParse(data);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join(". "),
    };
  }
  return { ok: true, data: parsed.data };
}
