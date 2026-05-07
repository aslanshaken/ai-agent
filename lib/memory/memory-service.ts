import type { SupabaseClient } from "@supabase/supabase-js";
import { retrieveMemoryByScope } from "@/lib/memory/retrieval";

export async function listCompanyMemory(
  supabase: SupabaseClient,
  userId: string,
  opts?: { scope?: string; limit?: number },
) {
  if (opts?.scope) {
    return retrieveMemoryByScope(supabase, userId, opts.scope, opts.limit);
  }
  const { data, error } = await supabase
    .from("company_memory")
    .select("id, scope, category, title, content, content_json, created_at, updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(opts?.limit ?? 50);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function addCompanyMemory(
  supabase: SupabaseClient,
  userId: string,
  scope: string,
  content: string,
) {
  const trimmed = content.trim();
  const title =
    trimmed.length <= 120 ? trimmed || "Memory entry" : `${trimmed.slice(0, 117)}…`;
  const { data, error } = await supabase
    .from("company_memory")
    .insert({
      user_id: userId,
      scope,
      category: scope,
      content: trimmed,
      title,
      content_json: { text: trimmed },
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data;
}
