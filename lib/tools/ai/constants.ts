/** Default chat model when the node omits `model` and `OPENAI_REASONING_MODEL` is unset. */
export const REASONING_DEFAULT_MODEL = "gpt-4.1-mini";

/**
 * OpenAI chat `model` IDs offered in the workflow builder.
 * Any valid ID can still be stored at runtime; unknown values show as a saved custom row.
 */
export const WORKFLOW_OPENAI_MODEL_OPTIONS = [
  "gpt-4.1-nano",
  "gpt-4.1-mini",
  "gpt-4.1",
  "gpt-4o-mini",
  "gpt-4o",
  "o3-mini",
  "o4-mini",
] as const;

/** Max serialized size for upstream JSON injected into the model prompt. */
export const REASONING_MAX_UPSTREAM_CHARS = 24_000;

export function resolveReasoningModel(nodeModel: string | undefined): string {
  const m = nodeModel?.trim();
  if (m) return m;
  const env = process.env.OPENAI_REASONING_MODEL?.trim();
  if (env) return env;
  return REASONING_DEFAULT_MODEL;
}
