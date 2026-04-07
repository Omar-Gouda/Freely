import { NextRequest } from "next/server";

import { getSession, getSessionFromAccessToken } from "@/lib/auth";
import { fail } from "@/lib/http";
import { Role } from "@/lib/models";

function getBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization")?.trim();
  if (!authorization?.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return authorization.slice(7).trim() || null;
}

export async function requireApiSession(request: NextRequest, allowedRoles?: Role[]) {
  const accessToken = getBearerToken(request);
  const session = accessToken ? await getSessionFromAccessToken(accessToken) : await getSession();

  if (!session) {
    return { error: fail("Unauthorized", 401) } as const;
  }

  if (allowedRoles && !allowedRoles.includes(session.role)) {
    return { error: fail("Forbidden", 403) } as const;
  }

  return { session } as const;
}
