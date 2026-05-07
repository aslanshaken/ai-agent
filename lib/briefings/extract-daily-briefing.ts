/** Pull structured briefing fields from upstream node outputs (priority_ranker preferred). */

export type DailyBriefingPayload = {
  title: string;
  summary: string;
  priorities: unknown[];
  opportunities: unknown[];
  risks: unknown[];
  recommendations: unknown[];
};

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => (typeof x === "string" ? x.trim() : String(x)))
    .filter(Boolean)
    .slice(0, 80);
}

export function extractDailyBriefingPayload(
  sources: Record<string, Record<string, unknown>>,
  fallbackTitle: string,
): DailyBriefingPayload {
  let title = fallbackTitle.trim() || "Founder daily briefing";

  let summary = "";
  let priorities: unknown[] = [];
  let opportunities: unknown[] = [];
  let risks: unknown[] = [];
  let recommendations: unknown[] = [];

  for (const out of Object.values(sources)) {
    if (!out || typeof out !== "object") continue;
    if ((out as { kind?: string }).kind !== "priority_ranker") continue;
    const pr = out as {
      briefingSummary?: string;
      topPriorities?: unknown;
      opportunities?: unknown;
      risks?: unknown;
      recommendations?: unknown;
    };
    if (typeof pr.briefingSummary === "string" && pr.briefingSummary.trim()) {
      summary = pr.briefingSummary.trim();
    }
    priorities = asStringArray(pr.topPriorities);
    opportunities = asStringArray(pr.opportunities);
    risks = asStringArray(pr.risks);
    recommendations = asStringArray(pr.recommendations);
    break;
  }

  if (!summary) {
    for (const out of Object.values(sources)) {
      if (!out || typeof out !== "object") continue;
      if ((out as { kind?: string }).kind === "ai_reasoning") {
        const s = (out as { summary?: string }).summary;
        if (typeof s === "string" && s.trim()) {
          summary = s.trim().slice(0, 12000);
          break;
        }
      }
    }
  }

  if (!summary) {
    summary =
      "Daily briefing saved — connect priority_ranker or ai_reasoning upstream for richer text.";
  }

  return {
    title,
    summary,
    priorities,
    opportunities,
    risks,
    recommendations,
  };
}
