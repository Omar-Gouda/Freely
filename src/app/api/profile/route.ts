import { randomUUID } from "crypto";

import { NextRequest } from "next/server";

import { requireApiSession } from "@/lib/api-auth";
import { createAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { fail, ok } from "@/lib/http";
import { log } from "@/lib/logger";
import { storageProvider } from "@/lib/storage";
import { fileToBuffer, validateUpload } from "@/lib/uploads";
import { profileUpdateSchema } from "@/lib/validators";
import { createRouteHandlerClient } from "@/utils/supabase/route";

export async function GET(request: NextRequest) {
  const auth = await requireApiSession(request);
  if ("error" in auth) return auth.error;

  const user = await db.user.findFirst({
    where: { id: auth.session.id, deletedAt: null },
    select: {
      id: true,
      username: true,
      email: true,
      pendingEmail: true,
      fullName: true,
      avatarUrl: true,
      phone: true,
      company: true,
      position: true,
      location: true,
      address: true,
      skills: true,
      experienceSummary: true,
      educationSummary: true,
      bio: true,
      role: true
    }
  });

  return user ? ok(user) : fail("Profile not found", 404);
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireApiSession(request);
    if ("error" in auth) return auth.error;

    const payload = profileUpdateSchema.safeParse(await request.json());
    if (!payload.success) {
      return fail("Invalid profile payload", 400, payload.error.flatten());
    }

    const wantsEmailChange = Boolean(payload.data.email && payload.data.email !== auth.session.email);
    const wantsPasswordChange = Boolean(payload.data.password);

    if (wantsEmailChange || wantsPasswordChange) {
      const { supabase, json } = createRouteHandlerClient(request);
      const authUpdates: { email?: string; password?: string } = {};

      if (wantsEmailChange) {
        authUpdates.email = payload.data.email;
      }

      if (wantsPasswordChange) {
        authUpdates.password = payload.data.password;
      }

      const { error } = await supabase.auth.updateUser(authUpdates, {
        emailRedirectTo: `${env.APP_URL}/auth/callback?next=/profile`
      });

      if (error) {
        return json({ error: error.message }, { status: 400 });
      }
    }

    const user = await db.user.update({
      where: { id: auth.session.id },
      data: {
        username: payload.data.username || null,
        fullName: payload.data.fullName,
        phone: payload.data.phone || null,
        company: payload.data.company || null,
        position: payload.data.position || null,
        location: payload.data.location || null,
        address: payload.data.address || null,
        bio: payload.data.bio || null,
        skills: payload.data.skills,
        experienceSummary: payload.data.experienceSummary || null,
        educationSummary: payload.data.educationSummary || null,
        pendingEmail: wantsEmailChange ? payload.data.email : null
      }
    });

    await createAuditLog({
      organizationId: auth.session.organizationId,
      userId: auth.session.id,
      action: "user.profile_updated",
      entityType: "user",
      entityId: user.id
    });

    return ok(user);
  } catch (error) {
    log("error", "PATCH /profile failed", { error: error instanceof Error ? error.message : String(error) });
    return fail(error instanceof Error ? error.message : "Profile update failed", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireApiSession(request);
    if ("error" in auth) return auth.error;

    const user = await db.user.findFirst({
      where: { id: auth.session.id, deletedAt: null },
      select: { avatarStorageKey: true }
    });

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return fail("Avatar file is required", 400);
    }

    validateUpload(file, ["image/png", "image/jpeg", "image/webp"]);
    const buffer = await fileToBuffer(file);
    const stored = await storageProvider.upload({
      fileName: `avatars/${auth.session.id}/${randomUUID()}-${file.name}`,
      contentType: file.type,
      body: buffer
    });

    if (user?.avatarStorageKey) {
      await storageProvider.delete(user.avatarStorageKey).catch((error) => {
        log("warn", "Old avatar cleanup failed", {
          userId: auth.session.id,
          storageKey: user.avatarStorageKey,
          error: error instanceof Error ? error.message : String(error)
        });
      });
    }

    const avatarUrl = `/api/profile/avatar?userId=${auth.session.id}&ts=${Date.now()}`;
    const updatedUser = await db.user.update({
      where: { id: auth.session.id },
      data: {
        avatarUrl,
        avatarStorageKey: stored.key
      }
    });

    await createAuditLog({
      organizationId: auth.session.organizationId,
      userId: auth.session.id,
      action: "user.avatar_updated",
      entityType: "user",
      entityId: updatedUser.id
    });

    return ok({ avatarUrl });
  } catch (error) {
    log("error", "POST /profile avatar failed", { error: error instanceof Error ? error.message : String(error) });
    return fail(error instanceof Error ? error.message : "Avatar upload failed", 400);
  }
}
