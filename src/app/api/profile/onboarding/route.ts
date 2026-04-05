import { NextRequest } from "next/server";

import { requireApiSession } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { fail, ok } from "@/lib/http";

export async function PATCH(request: NextRequest) {
  const auth = await requireApiSession(request);
  if ("error" in auth) return auth.error;

  try {
    const user = await db.user.update({
      where: { id: auth.session.id },
      data: {
        onboardingCompleted: true
      }
    });

    return ok({ id: user.id, onboardingCompleted: true });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not update onboarding status.", 500);
  }
}