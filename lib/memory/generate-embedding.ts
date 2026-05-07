/** OpenAI text embeddings for pgvector (1536 dims, text-embedding-3-small). */

const EMBEDDING_MODEL = "text-embedding-3-small";

export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  const trimmed = text.trim().slice(0, 30_000);
  if (!trimmed) {
    throw new Error("Empty text for embedding");
  }

  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: trimmed,
    }),
  });

  const json = (await res.json()) as {
    data?: Array<{ embedding?: number[] }>;
    error?: { message?: string };
  };

  if (!res.ok) {
    throw new Error(json.error?.message ?? `Embedding HTTP ${res.status}`);
  }

  const emb = json.data?.[0]?.embedding;
  if (!emb?.length) {
    throw new Error("Embedding response missing vector");
  }
  return emb;
}
