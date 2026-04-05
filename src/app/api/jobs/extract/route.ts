import { NextRequest } from "next/server";

import { requireApiSession } from "@/lib/api-auth";
import { aiProvider } from "@/lib/ai/provider";
import { fail, ok } from "@/lib/http";
import { jobExtractSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  const auth = await requireApiSession(request);
  if ("error" in auth) return auth.error;

  const payload = jobExtractSchema.safeParse(await request.json());
  if (!payload.success) {
    return fail("Invalid description", 400, payload.error.flatten());
  }

  const extracted = await aiProvider.extractJobDescription(payload.data.rawDescription);
  return ok(extracted);
}
