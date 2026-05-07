export type SearchProvider = "exa" | "tavily";

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

/** Normalized output from Exa or Tavily adapters. */
export type SearchToolResult = {
  providerUsed: string;
  query: string;
  resultCount: number;
  results: SearchResultItem[];
};
