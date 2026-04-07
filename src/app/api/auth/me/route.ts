import { NextRequest } from "next/server";

import { requireApiSession } from "@/lib/api-auth";
import { ok } from "@/lib/http";

export async function GET(request: NextRequest) {
  const auth = await requireApiSession(request);
  if ("error" in auth) return auth.error;

  return ok(auth.session);
}
