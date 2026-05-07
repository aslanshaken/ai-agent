import type { SupabaseClient } from "@supabase/supabase-js";

/** Match legacy `scope` or Phase 10 `category` (same value after migration). */
export async function retrieveMemoryByScope(
  supabase: SupabaseClient,
  userId: string,
  scope: string,
  limit = 20,
) {
  const safe = scope.replace(/"/g, '\\"');
  const { data, error } = await supabase
    .from("company_memory")
    .select("id, scope, category, title, content, content_json, created_at, updated_at")
    .eq("user_id", userId)
    .or(`category.eq."${safe}",scope.eq."${safe}"`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data ?? [];
}
