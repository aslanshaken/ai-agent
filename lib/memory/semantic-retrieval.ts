import type { SupabaseClient } from "@supabase/supabase-js";
import { generateEmbedding } from "@/lib/memory/generate-embedding";

export type MemoryChunk = {
  id: string;
  title: string | null;
  category: string | null;
  content_json: Record<string, unknown>;
  similarity: number;
};

/**
 * Semantic search over `company_memory.embedding` via RPC `match_company_memory`.
 */
export async function retrieveSemanticMemory(
  supabase: SupabaseClient,
  params: {
    userId: string;
    queryText: string;
    categories: string[] | null;
    limit?: number;
  },
): Promise<MemoryChunk[]> {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    return [];
  }

  let embedding: number[];
  try {
    embedding = await generateEmbedding(params.queryText);
  } catch {
    return [];
  }

  const { data, error } = await supabase.rpc("match_company_memory", {
    query_embedding: embedding,
    match_count: Math.min(16, Math.max(1, params.limit ?? 8)),
    filter_user_id: params.userId,
    filter_categories:
      params.categories && params.categories.length > 0 ? params.categories : null,
  });

  if (error || !data) {
    return [];
  }

  return (data as MemoryChunk[]).map((row) => ({
    ...row,
    content_json:
      row.content_json && typeof row.content_json === "object" && !Array.isArray(row.content_json)
        ? (row.content_json as Record<string, unknown>)
        : {},
  }));
}
