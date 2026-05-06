export type SearchProvider = "mock" | "exa" | "tavily";

export type SearchToolInput = {
  provider: SearchProvider;
  query: string;
  limit?: number;
};

export type SearchResultItem = {
  title: string;
  url: string;
  snippet: string;
  source: string;
};

/** Normalized output from any search adapter (including mock fallback). */
export type SearchToolResult = {
  providerUsed: string;
  query: string;
  resultCount: number;
  results: SearchResultItem[];
};
