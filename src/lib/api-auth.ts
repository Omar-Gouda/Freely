import { NextRequest } from "next/server";

import { Role } from "@/lib/models";
import { getSession } from "@/lib/auth";
import { fail } from "@/lib/http";

export async function requireApiSession(_request: NextRequest, allowedRoles?: Role[]) {
  const session = await getSession();

  if (!session) {
    return { error: fail("Unauthorized", 401) } as const;
  }

  if (allowedRoles && !allowedRoles.includes(session.role)) {
    return { error: fail("Forbidden", 403) } as const;
  }

  return { session } as const;
}
