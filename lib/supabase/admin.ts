import { createClient } from "@supabase/supabase-js";
import { getServerSupabaseEnv } from "./env";

/** Service role client for API routes and background jobs (no cookies). */
export function createServiceRoleSupabaseClient() {
  const env = getServerSupabaseEnv();
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for this operation.");
  }
  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}
