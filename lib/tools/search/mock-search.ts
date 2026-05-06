import type { SearchToolResult } from "@/lib/tools/search/types";

export function mockSearch(query: string, limit: number): SearchToolResult {
  const n = Math.min(Math.max(limit, 1), 20);
  const qPreview = query.length > 80 ? `${query.slice(0, 80)}…` : query;
  const results = Array.from({ length: n }).map((_, i) => ({
    title: `Mock result ${i + 1} for “${qPreview}”`,
    url: `https://example.com/mock/${i + 1}`,
    snippet: `Synthetic snippet ${i + 1} (mock search provider).`,
    source: "mock",
  }));
  return {
    providerUsed: "mock",
    query,
    resultCount: results.length,
    results,
  };
}
