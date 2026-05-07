import { exaSearch } from "@/lib/tools/search/exa-search";
import type { SearchToolInput, SearchToolResult } from "@/lib/tools/search/types";
import { tavilySearch } from "@/lib/tools/search/tavily-search";

export type SearchToolRunMeta = {
  requestedProvider: SearchToolInput["provider"];
  effectiveProvider: string;
  fallbackReason?: string;
};

function emptyResult(query: string, providerUsed: string): SearchToolResult {
  return {
    providerUsed,
    query,
    resultCount: 0,
    results: [],
  };
}

/**
 * Runs web search via Exa or Tavily. Cross-falls back to the other provider when the
 * requested one is unavailable (missing API key or API error). Does not use synthetic mock results.
 */
export async function runSearchWithFallback(
  input: SearchToolInput,
): Promise<{ result: SearchToolResult; meta: SearchToolRunMeta }> {
  const limit = input.limit ?? 5;
  const requested = input.provider;

  const tryExa = async (): Promise<SearchToolResult | null> => {
    if (!process.env.EXA_API_KEY?.trim()) return null;
    try {
      return await exaSearch(input.query, limit);
    } catch {
      return null;
    }
  };

  const tryTavily = async (): Promise<SearchToolResult | null> => {
    if (!process.env.TAVILY_API_KEY?.trim()) return null;
    try {
      return await tavilySearch(input.query, limit);
    } catch {
      return null;
    }
  };

  if (requested === "exa") {
    const exa = await tryExa();
    if (exa) {
      return {
        result: exa,
        meta: { requestedProvider: requested, effectiveProvider: "exa" },
      };
    }
    const tv = await tryTavily();
    if (tv) {
      return {
        result: tv,
        meta: {
          requestedProvider: requested,
          effectiveProvider: "tavily",
          fallbackReason:
            "Exa unavailable or EXA_API_KEY not set; used Tavily instead.",
        },
      };
    }
    return {
      result: emptyResult(input.query, "none"),
      meta: {
        requestedProvider: requested,
        effectiveProvider: "none",
        fallbackReason:
          "No search results: configure EXA_API_KEY or TAVILY_API_KEY in the environment, or both providers failed.",
      },
    };
  }

  if (requested === "tavily") {
    const tv = await tryTavily();
    if (tv) {
      return {
        result: tv,
        meta: { requestedProvider: requested, effectiveProvider: "tavily" },
      };
    }
    const exa = await tryExa();
    if (exa) {
      return {
        result: exa,
        meta: {
          requestedProvider: requested,
          effectiveProvider: "exa",
          fallbackReason:
            "Tavily unavailable or TAVILY_API_KEY not set; used Exa instead.",
        },
      };
    }
    return {
      result: emptyResult(input.query, "none"),
      meta: {
        requestedProvider: requested,
        effectiveProvider: "none",
        fallbackReason:
          "No search results: configure TAVILY_API_KEY or EXA_API_KEY in the environment, or both providers failed.",
      },
    };
  }

  return {
    result: emptyResult(input.query, "none"),
    meta: {
      requestedProvider: requested,
      effectiveProvider: "none",
      fallbackReason: `Unknown provider "${String(requested)}".`,
    },
  };
}
