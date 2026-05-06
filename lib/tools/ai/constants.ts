/** Default chat model when the node omits `model` and `OPENAI_REASONING_MODEL` is unset. */
export const REASONING_DEFAULT_MODEL = "gpt-4.1-mini";

/** Max serialized size for upstream JSON injected into the model prompt. */
export const REASONING_MAX_UPSTREAM_CHARS = 24_000;

export function resolveReasoningModel(nodeModel: string | undefined): string {
  const m = nodeModel?.trim();
  if (m) return m;
  const env = process.env.OPENAI_REASONING_MODEL?.trim();
  if (env) return env;
  return REASONING_DEFAULT_MODEL;
}
