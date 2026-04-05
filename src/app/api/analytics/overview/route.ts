import { NextRequest } from "next/server";

import { getAnalyticsOverview } from "@/lib/analytics";
import { requireApiSession } from "@/lib/api-auth";
import { ok } from "@/lib/http";

export async function GET(request: NextRequest) {
  const auth = await requireApiSession(request);
  if ("error" in auth) return auth.error;

  const analytics = await getAnalyticsOverview(auth.session.organizationId);
  return ok(analytics);
}
