import { z } from "zod";

/** Legacy graphs may store `mock`; coerce to Exa at parse time. */
const providerSchema = z.preprocess((raw) => {
  if (raw === undefined || raw === null || raw === "") return "exa";
  if (raw === "mock") return "exa";
  return raw;
}, z.enum(["exa", "tavily"]));

export const searchNodeDataSchema = z.object({
  provider: providerSchema,
  query: z.string().max(2000).optional(),
  limit: z.coerce.number().int().min(1).max(20).optional().default(5),
});

export type SearchNodeData = z.infer<typeof searchNodeDataSchema>;

export function parseSearchNodeExecutionInput(
  data: Record<string, unknown>,
  agentMission: string | null,
):
  | { ok: true; provider: "exa" | "tavily"; query: string; limit: number }
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
