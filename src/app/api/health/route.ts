import { getSupabaseAdminConfigStatus } from "@/lib/config-status";
import { db } from "@/lib/db";
import { getEmailConfigStatus } from "@/lib/email";
import { env } from "@/lib/env";
import { ok } from "@/lib/http";

export async function GET() {
  const emailStatus = getEmailConfigStatus();
  const adminConfig = getSupabaseAdminConfigStatus();
  const checks = {
    database: false,
    authConfigured: Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY),
    authAdminConfigured: adminConfig.configured,
    transactionalEmailConfigured: emailStatus.enabled,
    customSignupConfirmationConfigured: emailStatus.enabled && adminConfig.configured,
    persistentStorageConfigured: env.STORAGE_DRIVER !== "local",
    cronConfigured: Boolean(env.CRON_SECRET),
    sentryConfigured: Boolean(env.SENTRY_DSN || env.NEXT_PUBLIC_SENTRY_DSN)
  };

  try {
    await db.organization.findFirst({ where: {} });
    checks.database = true;
  } catch {
    checks.database = false;
  }

  const healthy = checks.database;
  const status = healthy ? "ok" : "degraded";

  return ok({
    status,
    service: "freely-api",
    checks,
    email: {
      provider: emailStatus.enabled ? "smtp" : "missing",
      missing: emailStatus.missing
    },
    auth: {
      signupConfirmationRedirect: env.APP_URL,
      customConfirmationConfigured: checks.customSignupConfirmationConfigured,
      serviceRoleConfigured: checks.authAdminConfigured,
      serviceRoleMessage: adminConfig.reason ?? null
    },
    deploymentNotes: {
      recommendedStorageDriver: "supabase-or-s3-on-vercel",
      queueMode: env.CRON_SECRET ? "cron-ready" : "worker-only",
      logging: checks.sentryConfigured ? "sentry-and-structured-logs" : "structured-logs-only"
    }
  }, { status: healthy ? 200 : 503 });
}
