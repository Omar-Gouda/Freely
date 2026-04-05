import { NextRequest } from "next/server";

import { env } from "@/lib/env";
import { fail, ok } from "@/lib/http";
import { runAutomationQueues } from "@/server/automation/runner";

function isAuthorized(request: NextRequest) {
  if (!env.CRON_SECRET) {
    return false;
  }

  const authorization = request.headers.get("authorization");
  const bearer = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
  const fallback = request.nextUrl.searchParams.get("secret") ?? request.headers.get("x-cron-secret") ?? "";

  return bearer === env.CRON_SECRET || fallback === env.CRON_SECRET;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return fail("Unauthorized", 401);
  }

  const limit = Math.max(1, Math.min(20, Number(request.nextUrl.searchParams.get("limit") ?? "5")));
  const result = await runAutomationQueues(limit);
  return ok({ ...result, limit });
}
