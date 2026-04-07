import { z } from "zod";
import { NextRequest } from "next/server";

import { deactivateUserAccount, hardDeleteUserAccount, reactivateUserAccount } from "@/lib/account-lifecycle";
import { requireApiSession } from "@/lib/api-auth";
import { createAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { sendEmail } from "@/lib/email";
import { fail, ok } from "@/lib/http";
import { NotificationKind, Role, UserAccountStatus } from "@/lib/models";
import { createNotification } from "@/lib/notifications";
import { canAssignRole } from "@/lib/rbac";
import { userInviteSchema } from "@/lib/validators";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";

const roleUpdateSchema = z.object({
  action: z.literal("role"),
  userId: z.string().min(1),
  role: z.nativeEnum(Role)
});

const lifecycleSchema = z.object({
  action: z.enum(["deactivate", "reactivate"]),
  userId: z.string().min(1)
});

const deleteUserSchema = z.object({
  userId: z.string().min(1)
});

async function getActiveAdminCount() {
  const admins = await db.user.findMany({
    where: {
      role: Role.ADMIN,
      deletedAt: null
    }
  });

  return admins.filter((admin: { accountStatus?: string | null }) => (admin.accountStatus ?? UserAccountStatus.ACTIVE) === UserAccountStatus.ACTIVE).length;
}

function canManageTargetUser(actor: { role: Role; organizationId: string; id: string }, targetUser: { role: Role; organizationId: string; id: string }) {
  if (actor.role === Role.ADMIN) {
    return true;
  }

  return actor.role === Role.ORG_HEAD && targetUser.organizationId === actor.organizationId && targetUser.role === Role.RECRUITER && targetUser.id !== actor.id;
}

export async function GET(request: NextRequest) {
  const auth = await requireApiSession(request, [Role.ADMIN, Role.ORG_HEAD]);
  if ("error" in auth) return auth.error;

  const users = await db.user.findMany({
    where: auth.session.role === Role.ADMIN
      ? { deletedAt: null }
      : { organizationId: auth.session.organizationId, deletedAt: null },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      organizationId: true,
      accountStatus: true,
      deactivatedAt: true,
      scheduledDeletionAt: true
    }
  });

  return ok(users);
}

export async function POST(request: NextRequest) {
  const auth = await requireApiSession(request, [Role.ADMIN, Role.ORG_HEAD]);
  if ("error" in auth) return auth.error;

  const payload = userInviteSchema.safeParse(await request.json());
  if (!payload.success) {
    return fail("Invalid user creation payload", 400, payload.error.flatten());
  }

  if (!canAssignRole(auth.session.role, payload.data.role)) {
    return fail(auth.session.role === Role.ORG_HEAD ? "Org heads can only create recruiter accounts." : "You cannot create this account role.", 403);
  }

  const normalizedEmail = payload.data.email.trim().toLowerCase();
  const selectedOrganizationId = auth.session.role === Role.ADMIN
    ? (payload.data.organizationId?.trim() || auth.session.organizationId)
    : auth.session.organizationId;

  const organization = await db.organization.findFirst({
    where: {
      id: selectedOrganizationId,
      deletedAt: null
    }
  });

  if (!organization) {
    return fail("Organization not found", 404);
  }

  const existingUser = await db.user.findFirst({
    where: {
      email: normalizedEmail,
      deletedAt: null
    }
  });

  if (existingUser) {
    return fail(existingUser.organizationId === organization.id
      ? "A team member with this email already exists in this organization."
      : "An account with this email already exists in another organization.", 409);
  }

  let adminClient;
  try {
    adminClient = createSupabaseAdminClient();
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Server-side account creation is not configured.", 500);
  }

  const { data, error } = await adminClient.auth.admin.createUser({
    email: normalizedEmail,
    password: payload.data.password,
    email_confirm: true,
    user_metadata: {
      full_name: payload.data.fullName
    }
  });

  if (error || !data.user) {
    return fail(error?.message ?? "Could not create the team sign-in account.", 400);
  }

  try {
    const user = await db.user.create({
      data: {
        organizationId: organization.id,
        supabaseAuthId: data.user.id,
        email: normalizedEmail,
        passwordHash: "",
        fullName: payload.data.fullName,
        role: payload.data.role,
        accountStatus: UserAccountStatus.ACTIVE,
        deactivatedAt: null,
        scheduledDeletionAt: null,
        onboardingCompleted: false
      }
    });

    await createNotification({
      organizationId: organization.id,
      userId: user.id,
      kind: NotificationKind.SYSTEM,
      title: "Workspace account created",
      message: `Your ${payload.data.role.toLowerCase()} account is ready to use in ${organization.name}.`
    });

    await createAuditLog({
      organizationId: organization.id,
      userId: auth.session.id,
      action: "user.created",
      entityType: "user",
      entityId: user.id,
      meta: { role: payload.data.role, organizationId: organization.id }
    });

    const welcomeEmail = await sendEmail({
      to: normalizedEmail,
      subject: "Your Freely workspace account is ready",
      text: `Hello ${payload.data.fullName},\n\nA ${auth.session.role === Role.ADMIN ? "platform admin" : "workspace org head"} created your Freely account in ${organization.name}. You can now sign in here: ${env.APP_URL}/login`
    });

    return ok({
      user,
      emailWarning: welcomeEmail.skipped ? welcomeEmail.reason ?? "The account was created, but the email could not be delivered." : null
    }, { status: 201 });
  } catch (creationError) {
    await adminClient.auth.admin.deleteUser(data.user.id);
    return fail(creationError instanceof Error ? creationError.message : "Could not finish creating the team account.", 500);
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireApiSession(request, [Role.ADMIN, Role.ORG_HEAD]);
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const rolePayload = roleUpdateSchema.safeParse(body);
  const lifecyclePayload = lifecycleSchema.safeParse(body);

  if (!rolePayload.success && !lifecyclePayload.success) {
    return fail("Invalid account update payload", 400);
  }

  const payloadUserId = rolePayload.success ? rolePayload.data.userId : lifecyclePayload.success ? lifecyclePayload.data.userId : "";
  const targetUser = await db.user.findFirst({
    where: {
      id: payloadUserId,
      deletedAt: null
    }
  });

  if (!targetUser) {
    return fail("User not found", 404);
  }

  if (!canManageTargetUser(auth.session, targetUser) && !(rolePayload.success && auth.session.role === Role.ADMIN)) {
    return fail("You do not have permission to manage this account.", 403);
  }

  const targetStatus = targetUser.accountStatus ?? UserAccountStatus.ACTIVE;

  if (rolePayload.success) {
    if (auth.session.role !== Role.ADMIN) {
      return fail("Only admins can change account roles.", 403);
    }

    if (targetUser.role === rolePayload.data.role) {
      return ok(targetUser);
    }

    if (targetUser.role === Role.ADMIN && targetStatus === UserAccountStatus.ACTIVE && rolePayload.data.role !== Role.ADMIN) {
      const activeAdminCount = await getActiveAdminCount();
      if (activeAdminCount <= 1) {
        return fail("The platform must keep at least one active admin.", 409);
      }
    }

    const updatedUser = await db.user.update({
      where: { id: targetUser.id },
      data: {
        role: rolePayload.data.role
      }
    });

    await createNotification({
      organizationId: updatedUser.organizationId,
      userId: updatedUser.id,
      kind: NotificationKind.SYSTEM,
      title: "Workspace role updated",
      message: `Your access level is now ${rolePayload.data.role}.`
    });

    await createAuditLog({
      organizationId: updatedUser.organizationId,
      userId: auth.session.id,
      action: "user.role_updated",
      entityType: "user",
      entityId: updatedUser.id,
      meta: { role: rolePayload.data.role }
    });

    return ok(updatedUser);
  }

  const lifecycle = lifecyclePayload.success ? lifecyclePayload.data : null;

  if (targetUser.id === auth.session.id) {
    return fail("Use another authorized account to deactivate or remove your own access.", 409);
  }

  if (lifecycle && targetUser.role === Role.ADMIN && targetStatus === UserAccountStatus.ACTIVE && lifecycle.action === "deactivate") {
    const activeAdminCount = await getActiveAdminCount();
    if (activeAdminCount <= 1) {
      return fail("The platform must keep at least one active admin.", 409);
    }
  }

  if (lifecycle?.action === "deactivate") {
    if (targetStatus === UserAccountStatus.DEACTIVATED) {
      return ok(targetUser);
    }

    const updatedUser = await deactivateUserAccount(targetUser.id);

    await createAuditLog({
      organizationId: updatedUser.organizationId,
      userId: auth.session.id,
      action: "user.deactivated",
      entityType: "user",
      entityId: updatedUser.id,
      meta: { scheduledDeletionAt: updatedUser.scheduledDeletionAt }
    });

    return ok(updatedUser);
  }

  const updatedUser = await reactivateUserAccount(targetUser.id);
  await createNotification({
    organizationId: updatedUser.organizationId,
    userId: updatedUser.id,
    kind: NotificationKind.SYSTEM,
    title: "Account reactivated",
    message: "Your account has been restored and you can sign in again."
  });
  await createAuditLog({
    organizationId: updatedUser.organizationId,
    userId: auth.session.id,
    action: "user.reactivated",
    entityType: "user",
    entityId: updatedUser.id
  });

  return ok(updatedUser);
}

export async function DELETE(request: NextRequest) {
  const auth = await requireApiSession(request, [Role.ADMIN, Role.ORG_HEAD]);
  if ("error" in auth) return auth.error;

  const payload = deleteUserSchema.safeParse(await request.json());
  if (!payload.success) {
    return fail("Invalid removal payload", 400, payload.error.flatten());
  }

  const targetUser = await db.user.findFirst({
    where: {
      id: payload.data.userId,
      deletedAt: null
    }
  });

  if (!targetUser) {
    return fail("User not found", 404);
  }

  if (!canManageTargetUser(auth.session, targetUser)) {
    return fail("You do not have permission to remove this account.", 403);
  }

  if (targetUser.id === auth.session.id) {
    return fail("Use another authorized account to remove your own access.", 409);
  }

  const targetStatus = targetUser.accountStatus ?? UserAccountStatus.ACTIVE;
  if (targetUser.role === Role.ADMIN && targetStatus === UserAccountStatus.ACTIVE) {
    const activeAdminCount = await getActiveAdminCount();
    if (activeAdminCount <= 1) {
      return fail("The platform must keep at least one active admin.", 409);
    }
  }

  try {
    await hardDeleteUserAccount(targetUser.id, { strictAuthDelete: auth.session.role === Role.ADMIN });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not remove the account permanently.", 500);
  }

  await createAuditLog({
    organizationId: targetUser.organizationId,
    userId: auth.session.id,
    action: "user.deleted",
    entityType: "user",
    entityId: targetUser.id,
    meta: { email: targetUser.email }
  });

  return ok({ userId: targetUser.id, removed: true });
}
