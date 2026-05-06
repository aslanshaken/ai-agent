import type { SearchToolResult } from "@/lib/tools/search/types";

type TavilyHit = { title?: string; url?: string; content?: string };

/**
 * Tavily search. Requires `TAVILY_API_KEY`.
 * @throws on HTTP or parse errors — caller should fall back to mock.
 */
export async function tavilySearch(query: string, limit: number): Promise<SearchToolResult> {
  const key = process.env.TAVILY_API_KEY?.trim();
  if (!key) throw new Error("TAVILY_API_KEY is not set");

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: key,
      query,
      max_results: Math.min(Math.max(limit, 1), 20),
    }),
  });

  const rawText = await res.text();
  if (!res.ok) {
    throw new Error(`Tavily HTTP ${res.status}: ${rawText.slice(0, 240)}`);
  }

  let json: { results?: TavilyHit[] };
  try {
    json = JSON.parse(rawText) as { results?: TavilyHit[] };
  } catch {
    throw new Error("Tavily response was not valid JSON");
  }

  const results = (json.results ?? []).map((r) => ({
    title: typeof r.title === "string" && r.title ? r.title : "Untitled",
    url: typeof r.url === "string" ? r.url : "",
    snippet: (typeof r.content === "string" ? r.content : "").slice(0, 600),
    source: "tavily",
  }));

  return {
    providerUsed: "tavily",
    query,
    resultCount: results.length,
    results,
  };
}
