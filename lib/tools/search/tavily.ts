/**
 * Tavily search adapter — wire HTTP calls when TAVILY_API_KEY is configured.
 */
export type TavilySearchResult = { title: string; url: string; content?: string };

export function createTavilySearchClient() {
  const apiKey = process.env.TAVILY_API_KEY;

  return {
    isConfigured: Boolean(apiKey),
    async search(query: string): Promise<{ ok: true; results: TavilySearchResult[] } | { ok: false; error: string }> {
      void query;
      if (!apiKey) {
        return { ok: false, error: "TAVILY_API_KEY is not configured." };
      }
      return { ok: true, results: [] };
    },
  };
}
