import { NextRequest } from "next/server";

import { syncApprovedLocalUser } from "@/lib/auth";
import { createRouteHandlerClient } from "@/utils/supabase/route";

function getSafeNextPath(nextPath: string | null) {
  if (!nextPath || !nextPath.startsWith("/")) {
    return "/dashboard";
  }

  return nextPath;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const nextPath = getSafeNextPath(request.nextUrl.searchParams.get("next"));
  const successUrl = new URL(nextPath, request.url);
  const failureUrl = new URL(`/login?error=${encodeURIComponent("Authentication callback failed. Please try again.")}`, request.url);

  if (!code) {
    return Response.redirect(failureUrl, 303);
  }

  const { supabase, redirect } = createRouteHandlerClient(request);
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return redirect(failureUrl, 303);
  }

  const localUser = await syncApprovedLocalUser(data.user);
  if (!localUser) {
    await supabase.auth.signOut();
    return redirect(new URL(`/login?error=${encodeURIComponent("This account is not active in the platform.")}`, request.url), 303);
  }

  return redirect(successUrl, 303);
}
