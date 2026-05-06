/**
 * Exa search adapter — wire HTTP calls when EXA_API_KEY is configured.
 */
export type ExaSearchResult = { title: string; url: string; snippet?: string };

export function createExaSearchClient() {
  const apiKey = process.env.EXA_API_KEY;

  return {
    isConfigured: Boolean(apiKey),
    async search(query: string): Promise<{ ok: true; results: ExaSearchResult[] } | { ok: false; error: string }> {
      void query;
      if (!apiKey) {
        return { ok: false, error: "EXA_API_KEY is not configured." };
      }
      return { ok: true, results: [] };
    },
  };
}
