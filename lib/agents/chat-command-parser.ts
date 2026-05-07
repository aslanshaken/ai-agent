/**
 * Lightweight deterministic intent parser for the agent workspace chat.
 * Order matters: more specific phrases are matched before generic keywords.
 */

export type ChatIntent =
  | "save_agent"
  | "run_agent"
  | "explain_workflow"
  | "latest_run_summary"
  | "pending_approval"
  | "improve_workflow"
  | "open_workflow"
  | "open_schedule"
  | "open_details"
  | "open_memory_permissions"
  | "unknown";

export type ParsedChatCommand = {
  intent: ChatIntent;
  confidence: number;
};

export function parseChatCommand(raw: string): ParsedChatCommand {
  const t = raw.trim().toLowerCase();
  if (!t) {
    return { intent: "unknown", confidence: 0 };
  }

  // Save (before generic "run")
  if (
    /^save$/i.test(raw.trim()) ||
    /\b(save changes|save agent|save workflow|save everything|persist(\s+changes)?)\b/.test(t)
  ) {
    return { intent: "save_agent", confidence: 0.92 };
  }

  // Latest / summarize (before generic "run")
  if (
    /\b(latest run|last run|what happened (last|on the last)?|summarize (the )?(last|latest)|show (the )?(last|latest) result|last result)\b/.test(
      t,
    ) ||
    /^summarize$/i.test(raw.trim())
  ) {
    return { intent: "latest_run_summary", confidence: 0.92 };
  }

  // Explain workflow / what does this do
  if (
    /\b(explain (the )?workflow|how does this (agent )?work|what does this (agent )?do|describe (the )?workflow|walk me through)\b/.test(t) ||
    /\bwhat('s| is) (this|the) (workflow|agent) for\b/.test(t)
  ) {
    return { intent: "explain_workflow", confidence: 0.9 };
  }

  // Open drawers (before generic "schedule", "memory")
  if (
    /\b(edit|change|open)\s+(the\s+)?workflow\b/.test(t) ||
    /\bworkflow\s+(editor|canvas)\b/.test(t) ||
    /^open workflow$/i.test(raw.trim())
  ) {
    return { intent: "open_workflow", confidence: 0.9 };
  }

  if (
    /\b(edit|change|open)\s+(the\s+)?(schedule|cron)\b/.test(t) ||
    /\bscheduling\b/.test(t) ||
    /^open schedule$/i.test(raw.trim())
  ) {
    return { intent: "open_schedule", confidence: 0.88 };
  }

  if (
    /\b(edit|change|open)\s+(the\s+)?(details|description|name)\b/.test(t) ||
    /\b(change|edit)\s+(mission|details)\b/.test(t) ||
    /^open details$/i.test(raw.trim())
  ) {
    return { intent: "open_details", confidence: 0.88 };
  }

  if (
    /\b(edit|change|open)\s+(the\s+)?(memory|permissions)\b/.test(t) ||
    /\b(memory|permissions)\s+(settings|panel)\b/.test(t) ||
    /^open memory$/i.test(raw.trim())
  ) {
    return { intent: "open_memory_permissions", confidence: 0.88 };
  }

  // Pending approval status
  if (
    /\b(pending approval|needs approval|waiting for approval|what needs approval|show approval)\b/.test(
      t,
    ) ||
    /^approval(s)?$/i.test(raw.trim())
  ) {
    return { intent: "pending_approval", confidence: 0.85 };
  }

  // Improve / suggest
  if (
    /\b(improve (the )?workflow|suggest(ions)?|how can we improve|make this better|optimize (the )?workflow)\b/.test(
      t,
    )
  ) {
    return { intent: "improve_workflow", confidence: 0.88 };
  }

  // Run agent (exclude "don't run")
  if (!/\bdon'?t\s+run\b/.test(t)) {
    if (
      /^run\b/i.test(raw.trim()) ||
      /\b(run this|run this agent|start(ing)? (a )?run|execute|test this agent|kick off)\b/i.test(t)
    ) {
      return { intent: "run_agent", confidence: 0.9 };
    }
  }

  return { intent: "unknown", confidence: 0.35 };
}
