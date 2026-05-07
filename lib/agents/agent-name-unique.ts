import type { SupabaseClient } from "@supabase/supabase-js";

/** Normalize for duplicate detection (trim, collapse spaces, case-insensitive). */
export function normalizeAgentNameForCompare(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Returns true if another agent owned by `userId` already uses this name
 * (after normalization). Exclude `excludeAgentId` when renaming an existing agent.
 */
export async function agentNameTakenByAnother(
  supabase: SupabaseClient,
  userId: string,
  name: string,
  excludeAgentId?: string,
): Promise<boolean> {
  const target = normalizeAgentNameForCompare(name);
  if (!target) return false;

  const { data, error } = await supabase.from("agents").select("id, name").eq("user_id", userId);

  if (error || !data?.length) return false;

  for (const row of data) {
    if (excludeAgentId && row.id === excludeAgentId) continue;
    if (normalizeAgentNameForCompare(String(row.name ?? "")) === target) return true;
  }
  return false;
}
