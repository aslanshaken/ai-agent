import type { SupabaseClient } from "@supabase/supabase-js";
import { generateEmbedding } from "@/lib/memory/generate-embedding";

export type IngestMemoryInput = {
  userId: string;
  category: string;
  title: string;
  bodyText: string;
  source?: string;
};

/**
 * Insert a memory row with embedding for semantic retrieval.
 * Safe to call without OPENAI_API_KEY (skips embedding).
 */
export async function ingestMemoryArtifact(
  supabase: SupabaseClient,
  input: IngestMemoryInput,
): Promise<{ id: string | null }> {
  const content_json = { text: input.bodyText.slice(0, 24_000) };
  let embedding: number[] | null = null;

  if (process.env.OPENAI_API_KEY?.trim()) {
    try {
      embedding = await generateEmbedding(`${input.title}\n\n${input.bodyText}`.slice(0, 30_000));
    } catch {
      embedding = null;
    }
  }

  const row: Record<string, unknown> = {
    user_id: input.userId,
    scope: input.category,
    category: input.category,
    title: input.title.slice(0, 500),
    content: input.bodyText.slice(0, 50_000),
    content_json,
    source: input.source ?? null,
    updated_at: new Date().toISOString(),
  };

  if (embedding) {
    row.embedding = embedding;
  }

  const { data, error } = await supabase.from("company_memory").insert(row).select("id").single();

  if (error) {
    console.warn("[memory ingest]", error.message);
    return { id: null };
  }
  return { id: data?.id ?? null };
}
