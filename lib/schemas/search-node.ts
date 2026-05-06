import { z } from "zod";

export const searchNodeDataSchema = z.object({
  provider: z.enum(["mock", "exa", "tavily"]).default("mock"),
  query: z.string().max(2000).optional(),
  limit: z.coerce.number().int().min(1).max(20).optional().default(5),
});

export type SearchNodeData = z.infer<typeof searchNodeDataSchema>;

export function parseSearchNodeExecutionInput(
  data: Record<string, unknown>,
  agentMission: string | null,
):
  | { ok: true; provider: "mock" | "exa" | "tavily"; query: string; limit: number }
  | { ok: false; error: string } {
  const parsed = searchNodeDataSchema.safeParse(data);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join(". "),
    };
  }

  let query = typeof parsed.data.query === "string" ? parsed.data.query.trim() : "";
  if (!query) {
    const m = agentMission?.trim() ?? "";
    if (m) query = m;
  }

  if (!query) {
    return {
      ok: false,
      error:
        "Search node needs a query in its config, or set the agent mission to use as fallback.",
    };
  }

  return {
    ok: true,
    provider: parsed.data.provider,
    query,
    limit: parsed.data.limit,
  };
}
