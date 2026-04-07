import { NextRequest } from "next/server";

import { getUniqueOrganizationSlug } from "@/lib/auth";
import { getSupabaseAdminConfigStatus } from "@/lib/config-status";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { fail } from "@/lib/http";
import { log } from "@/lib/logger";
import { OrganizationStatus, Role, UserAccountStatus } from "@/lib/models";
import { signupSchema } from "@/lib/validators";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { createRouteHandlerClient } from "@/utils/supabase/route";

function getSignupConfirmationRedirect(request: NextRequest) {
  try {
    return new URL("/auth/callback", request.nextUrl.origin).toString();
  } catch {
    return `${env.APP_URL}/auth/callback`;
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY) {
      return fail("Authentication is not configured correctly yet.", 500);
    }

    const payload = signupSchema.safeParse(await request.json());

    if (!payload.success) {
      return fail("Invalid signup payload", 400, payload.error.flatten());
    }

    const normalizedEmail = payload.data.email.trim().toLowerCase();
    const existingUser = await db.user.findFirst({
      where: {
        email: normalizedEmail,
        deletedAt: null
      }
    });

    if (existingUser) {
      return fail("An account with this email already exists.", 409);
    }

    const fullName = payload.data.fullName.trim();
    const workspaceName = payload.data.workspaceName.trim();
    const slug = await getUniqueOrganizationSlug(workspaceName);
    const userMetadata = {
      full_name: fullName,
      workspace_name: workspaceName,
      account_type: payload.data.accountType
    };

    const createPendingWorkspace = async (supabaseAuthId: string) => {
      const organization = await db.organization.create({
        data: {
          name: workspaceName,
          slug,
          status: OrganizationStatus.PENDING_APPROVAL,
          requestedByEmail: normalizedEmail,
          approvedAt: null,
          approvedById: null,
          approvalNotes: null,
          deactivatedAt: null,
          contractEndsAt: null,
          deletedAt: null
        }
      });

      const user = await db.user.create({
        data: {
          organizationId: organization.id,
          supabaseAuthId,
          email: normalizedEmail,
          passwordHash: "",
          fullName,
          role: Role.ORG_HEAD,
          accountStatus: UserAccountStatus.ACTIVE,
          deactivatedAt: null,
          scheduledDeletionAt: null,
          onboardingCompleted: false
        }
      });

      return { organization, user };
    };

    const { supabase, json } = createRouteHandlerClient(request);
    const adminConfig = getSupabaseAdminConfigStatus();

    if (adminConfig.configured) {
      const adminClient = createSupabaseAdminClient();
      const { data, error } = await adminClient.auth.admin.createUser({
        email: normalizedEmail,
        password: payload.data.password,
        email_confirm: true,
        user_metadata: userMetadata
      });

      if (error || !data.user) {
        return json({ error: error?.message ?? "Unable to create your account right now." }, { status: 400 });
      }

      try {
        await createPendingWorkspace(data.user.id);
      } catch (creationError) {
        await adminClient.auth.admin.deleteUser(data.user.id);
        throw creationError;
      }

      return json({
        data: {
          needsEmailConfirmation: false,
          redirectTo: "/login?requested=1",
          message: "Your organization request has been submitted and is awaiting admin approval."
        }
      });
    }

    const redirectTo = getSignupConfirmationRedirect(request);
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password: payload.data.password,
      options: {
        emailRedirectTo: redirectTo,
        data: userMetadata
      }
    });

    if (error || !data.user) {
      return json({ error: error?.message ?? "Unable to create your account right now." }, { status: 400 });
    }

    await createPendingWorkspace(data.user.id);

    return json({
      data: {
        needsEmailConfirmation: !data.session,
        message: data.session
          ? "Your request is pending admin approval. You will be able to sign in after approval."
          : "Confirm your email first, then wait for admin approval before signing in."
      }
    });
  } catch (error) {
    log("error", "Signup failed", { error: error instanceof Error ? error.message : String(error) });
    return fail("Unable to create account right now", 500);
  }
}
