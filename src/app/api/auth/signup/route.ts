import { NextRequest } from "next/server";

import { getSupabaseAdminConfigStatus } from "@/lib/config-status";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { fail } from "@/lib/http";
import { log } from "@/lib/logger";
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
    const userMetadata = {
      full_name: fullName,
      workspace_name: workspaceName,
      account_type: payload.data.accountType
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

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: payload.data.password
      });

      return json({
        data: {
          needsEmailConfirmation: false,
          redirectTo: signInError ? "/login?created=1" : "/dashboard",
          message: signInError
            ? "Your account is ready. Sign in to open your workspace."
            : "Your workspace is ready. We are signing you in now."
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

    return json({
      data: {
        needsEmailConfirmation: !data.session,
        message: data.session
          ? "Your workspace is ready. You can continue into the app."
          : "Your account was created. Follow the confirmation email from your auth provider, then sign in to finish opening the workspace."
      }
    });
  } catch (error) {
    log("error", "Signup failed", { error: error instanceof Error ? error.message : String(error) });
    return fail("Unable to create account right now", 500);
  }
}
