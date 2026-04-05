import { env } from "@/lib/env";

export type ConfigStatus = {
  configured: boolean;
  reason?: string;
};

function normalize(value: string | undefined | null) {
  return (value ?? "").trim();
}

export function getSupabaseAdminConfigStatus(): ConfigStatus {
  const url = normalize(env.NEXT_PUBLIC_SUPABASE_URL);
  const publishableKey = normalize(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY);
  const serviceRoleKey = normalize(env.SUPABASE_SERVICE_ROLE_KEY);

  if (!url) {
    return { configured: false, reason: "The authentication project URL is missing." };
  }

  if (!serviceRoleKey) {
    return { configured: false, reason: "The server-side account management key is missing." };
  }

  if (serviceRoleKey === publishableKey || serviceRoleKey.startsWith("sb_publishable_")) {
    return {
      configured: false,
      reason: "The server-side account management key is using the public key. Replace it with the private service-role key from your project settings."
    };
  }

  return { configured: true };
}

export function isSupabaseAdminConfigured() {
  return getSupabaseAdminConfigStatus().configured;
}
