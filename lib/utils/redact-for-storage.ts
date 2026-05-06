const SENSITIVE_KEY =
  /api_?key|secret|password|token|authorization|bearer|private_?key|credential|webhook/i;

/**
 * Redacts obvious secret-bearing keys from nested JSON before persistence.
 * Does not cryptographically scan string bodies — only key names and huge blobs are trimmed.
 */
export function redactForStorage(value: unknown, depth = 0): unknown {
  if (depth > 14) return value;
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    return value.map((x) => redactForStorage(x, depth + 1));
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY.test(k)) {
        out[k] = "[redacted]";
      } else {
        out[k] = redactForStorage(v, depth + 1);
      }
    }
    return out;
  }
  if (typeof value === "string" && value.length > 80_000) {
    return `${value.slice(0, 80_000)}…`;
  }
  return value;
}
