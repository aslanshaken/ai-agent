import type { SearchToolResult } from "@/lib/tools/search/types";

type ExaHit = { title?: string; url?: string; text?: string };

/**
 * Exa neural/keyword search. Requires `EXA_API_KEY`.
 * @throws on HTTP or parse errors — caller may fall back to Tavily.
 */
export async function exaSearch(query: string, limit: number): Promise<SearchToolResult> {
  const key = process.env.EXA_API_KEY?.trim();
  if (!key) throw new Error("EXA_API_KEY is not set");

  const res = await fetch("https://api.exa.ai/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
    },
    body: JSON.stringify({
      query,
      numResults: Math.min(Math.max(limit, 1), 20),
      type: "auto",
    }),
  });

  const rawText = await res.text();
  if (!res.ok) {
    throw new Error(`Exa HTTP ${res.status}: ${rawText.slice(0, 240)}`);
  }

  let json: { results?: ExaHit[] };
  try {
    json = JSON.parse(rawText) as { results?: ExaHit[] };
  } catch {
    throw new Error("Exa response was not valid JSON");
  }

  const results = (json.results ?? []).map((r) => ({
    title: typeof r.title === "string" && r.title ? r.title : "Untitled",
    url: typeof r.url === "string" ? r.url : "",
    snippet: (typeof r.text === "string" ? r.text : "").slice(0, 600),
    source: "exa",
  }));

  return {
    providerUsed: "exa",
    query,
    resultCount: results.length,
    results,
  };
}
