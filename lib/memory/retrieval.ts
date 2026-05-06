import type { SupabaseClient } from "@supabase/supabase-js";

export async function retrieveMemoryByScope(
  supabase: SupabaseClient,
  userId: string,
  scope: string,
  limit = 20,
) {
  const { data, error } = await supabase
    .from("company_memory")
    .select("id, scope, content, created_at")
    .eq("user_id", userId)
    .eq("scope", scope)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data ?? [];
}
