/** Normalize daily_briefings jsonb arrays for dashboard display. */

export function jsonbToLines(value: unknown, max = 12): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (out.length >= max) break;
    if (typeof item === "string") {
      const t = item.trim();
      if (t) out.push(t);
      continue;
    }
    if (item && typeof item === "object" && !Array.isArray(item)) {
      const o = item as Record<string, unknown>;
      if (typeof o.text === "string" && o.text.trim()) {
        out.push(o.text.trim());
        continue;
      }
      if (typeof o.title === "string" && o.title.trim()) {
        out.push(o.title.trim());
        continue;
      }
    }
    if (item != null && typeof item !== "object") {
      const s = String(item).trim();
      if (s) out.push(s);
    }
  }
  return out;
}
