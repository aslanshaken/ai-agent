import type { MemoryChunk } from "@/lib/memory/semantic-retrieval";

function summarizeContentJson(j: Record<string, unknown>): string {
  const text = j.text;
  if (typeof text === "string" && text.trim()) {
    return text.trim().slice(0, 1200);
  }
  try {
    return JSON.stringify(j).slice(0, 1200);
  } catch {
    return "";
  }
}

/** Prompt prefix injected before AI reasoning instructions. */
export function formatMemoryContextForPrompt(chunks: MemoryChunk[]): string {
  if (!chunks.length) return "";

  const lines: string[] = [
    "### Retrieved company memory (semantic)",
    "Use this as grounding context; prefer facts here when they conflict with generic web results.",
  ];

  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i]!;
    const cat = c.category ?? "unknown";
    const title = c.title ?? c.id;
    const body = summarizeContentJson(c.content_json);
    lines.push(`${i + 1}. [${cat}] ${title}${body ? `\n${body}` : ""}`);
  }

  return lines.join("\n");
}
