import { exaSearch } from "@/lib/tools/search/exa-search";
import { mockSearch } from "@/lib/tools/search/mock-search";
import type { SearchToolInput, SearchToolResult } from "@/lib/tools/search/types";
import { tavilySearch } from "@/lib/tools/search/tavily-search";

export type SearchToolRunMeta = {
  requestedProvider: SearchToolInput["provider"];
  effectiveProvider: string;
  fallbackReason?: string;
};

/**
 * Runs web search with safe fallback: uses mock when keys are missing
 * or the remote provider fails (never throws).
 */
export async function runSearchWithFallback(
  input: SearchToolInput,
): Promise<{ result: SearchToolResult; meta: SearchToolRunMeta }> {
  const limit = input.limit ?? 5;
  const requested = input.provider;

  const wrapMock = (reason?: string) => {
    const result = mockSearch(input.query, limit);
    return {
      result,
      meta: {
        requestedProvider: requested,
        effectiveProvider: "mock",
        ...(reason ? { fallbackReason: reason } : {}),
      } satisfies SearchToolRunMeta,
    };
  };

  if (requested === "mock") {
    return wrapMock();
  }

  if (requested === "exa") {
    if (!process.env.EXA_API_KEY?.trim()) {
      return wrapMock("EXA_API_KEY not configured; using mock.");
    }
    try {
      const result = await exaSearch(input.query, limit);
      return {
        result,
        meta: { requestedProvider: requested, effectiveProvider: "exa" },
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Exa failed";
      const fallback = wrapMock(`Exa error (${msg}); using mock.`);
      return {
        result: fallback.result,
        meta: {
          requestedProvider: requested,
          effectiveProvider: fallback.meta.effectiveProvider,
          fallbackReason: fallback.meta.fallbackReason,
        },
      };
    }
  }

  if (requested === "tavily") {
    if (!process.env.TAVILY_API_KEY?.trim()) {
      return wrapMock("TAVILY_API_KEY not configured; using mock.");
    }
    try {
      const result = await tavilySearch(input.query, limit);
      return {
        result,
        meta: { requestedProvider: requested, effectiveProvider: "tavily" },
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Tavily failed";
      const fallback = wrapMock(`Tavily error (${msg}); using mock.`);
      return {
        result: fallback.result,
        meta: {
          requestedProvider: requested,
          effectiveProvider: fallback.meta.effectiveProvider,
          fallbackReason: fallback.meta.fallbackReason,
        },
      };
    }
  }

  return wrapMock(`Unknown provider "${String(requested)}"; using mock.`);
}
