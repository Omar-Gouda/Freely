import * as Sentry from "@sentry/nextjs";

import { env } from "@/lib/env";

type LogLevel = "info" | "warn" | "error";

const levelOrder: Record<LogLevel, number> = {
  info: 1,
  warn: 2,
  error: 3
};

function shouldLog(level: LogLevel) {
  return levelOrder[level] >= levelOrder[env.LOG_LEVEL];
}

function isSentryEnabled() {
  return Boolean(env.SENTRY_DSN || env.NEXT_PUBLIC_SENTRY_DSN);
}

export function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  if (!shouldLog(level)) {
    return;
  }

  const payload = {
    level,
    message,
    meta,
    timestamp: new Date().toISOString(),
    environment: env.SENTRY_ENVIRONMENT || process.env.VERCEL_ENV || process.env.NODE_ENV || "development"
  };

  if (level === "error") {
    console.error(JSON.stringify(payload));
    if (isSentryEnabled()) {
      Sentry.captureMessage(message, { level: "error", extra: meta });
    }
    return;
  }

  if (level === "warn") {
    console.warn(JSON.stringify(payload));
    return;
  }

  console.log(JSON.stringify(payload));
}

export function logException(error: unknown, message: string, meta?: Record<string, unknown>) {
  log("error", message, {
    ...meta,
    error: error instanceof Error ? error.message : String(error)
  });

  if (isSentryEnabled()) {
    Sentry.captureException(error, { extra: meta });
  }
}