import { createClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";
import { getSupabaseAdminConfigStatus } from "@/lib/config-status";

export function createSupabaseAdminClient() {
  const configStatus = getSupabaseAdminConfigStatus();

  if (!configStatus.configured) {
    throw new Error(configStatus.reason ?? "Supabase admin access is not configured.");
  }

  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
