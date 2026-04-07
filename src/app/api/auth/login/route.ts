import { NextRequest } from "next/server";

import { syncApprovedLocalUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fail } from "@/lib/http";
import { log } from "@/lib/logger";
import { OrganizationStatus, UserAccountStatus } from "@/lib/models";
import { loginSchema } from "@/lib/validators";
import { createRouteHandlerClient } from "@/utils/supabase/route";

export async function POST(request: NextRequest) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY) {
      return fail("Authentication is not configured correctly yet.", 500);
    }

    const payload = loginSchema.safeParse(await request.json());

    if (!payload.success) {
      return fail("Invalid login payload", 400, payload.error.flatten());
    }

    const normalizedEmail = payload.data.email.trim().toLowerCase();
    const { supabase, json } = createRouteHandlerClient(request);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: payload.data.password
    });

    if (error || !data.user) {
      return json({ error: error?.message ?? "Unable to sign in right now" }, { status: 401 });
    }

    const sessionUser = await syncApprovedLocalUser(data.user);
    if (!sessionUser) {
      await supabase.auth.signOut();
      return json({ error: "This account is not active in the platform yet." }, { status: 403 });
    }

    const organization = await db.organization.findFirst({
      where: {
        id: sessionUser.organizationId,
        deletedAt: null
      }
    });

    if (!organization) {
      await supabase.auth.signOut();
      return json({ error: "This organization is no longer available in Freely." }, { status: 403 });
    }

    if (organization.status === OrganizationStatus.PENDING_APPROVAL) {
      await supabase.auth.signOut();
      return json({ error: "Your organization is waiting for admin approval before access is enabled." }, { status: 403 });
    }

    if (organization.status !== OrganizationStatus.ACTIVE) {
      await supabase.auth.signOut();
      return json({ error: "This organization is currently inactive. Please contact the platform admin." }, { status: 403 });
    }

    if (sessionUser.accountStatus === UserAccountStatus.DEACTIVATED) {
      await supabase.auth.signOut();
      return json({ error: "This account is deactivated. Please contact your platform admin to reactivate it." }, { status: 403 });
    }

    return json({ data: { user: sessionUser } });
  } catch (error) {
    log("error", "Login failed", { error: error instanceof Error ? error.message : String(error) });
    return fail("Unable to sign in right now", 500);
  }
}
