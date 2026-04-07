import { randomUUID } from "crypto";
import { NextRequest } from "next/server";

import { requireApiSession } from "@/lib/api-auth";
import { createAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { NotificationKind, Role, SupportMessageAuthorType, SupportThreadSource, SupportThreadStatus, UserAccountStatus } from "@/lib/models";
import { createNotification } from "@/lib/notifications";
import { supportThreadCreateSchema } from "@/lib/validators";

async function getActiveAdmins() {
  const admins = await db.user.findMany({
    where: { role: Role.ADMIN, deletedAt: null },
    orderBy: { createdAt: "asc" }
  });

  return admins.filter((admin: { accountStatus?: string | null }) => (admin.accountStatus ?? UserAccountStatus.ACTIVE) === UserAccountStatus.ACTIVE);
}

export async function GET(request: NextRequest) {
  const auth = await requireApiSession(request, [Role.ADMIN, Role.ORG_HEAD, Role.RECRUITER]);
  if ("error" in auth) return auth.error;

  const threads = await db.supportThread.findMany({
    where: auth.session.role === Role.ADMIN ? undefined : { requesterUserId: auth.session.id },
    orderBy: { lastMessageAt: "desc" }
  });

  return ok(threads);
}

export async function POST(request: NextRequest) {
  const auth = await requireApiSession(request, [Role.ADMIN, Role.ORG_HEAD, Role.RECRUITER]);
  if ("error" in auth) return auth.error;

  const payload = supportThreadCreateSchema.safeParse(await request.json());
  if (!payload.success) {
    return fail("Please add a subject and enough detail for the support team to help.", 400, payload.error.flatten());
  }

  const timestamp = new Date();
  const thread = await db.supportThread.create({
    data: {
      id: randomUUID(),
      organizationId: auth.session.organizationId,
      requesterUserId: auth.session.id,
      requesterName: auth.session.fullName ?? auth.session.email,
      requesterEmail: auth.session.email,
      requesterCompany: auth.session.organizationName ?? null,
      subject: payload.data.subject.trim(),
      status: SupportThreadStatus.OPEN,
      source: SupportThreadSource.IN_APP,
      assignedAdminUserId: null,
      lastMessageAt: timestamp,
      resolvedAt: null,
      messages: [{
        id: randomUUID(),
        authorType: SupportMessageAuthorType.MEMBER,
        authorUserId: auth.session.id,
        authorName: auth.session.fullName ?? auth.session.email,
        authorEmail: auth.session.email,
        body: payload.data.message.trim(),
        createdAt: timestamp,
        deliveredByEmail: false
      }],
      createdAt: timestamp,
      updatedAt: timestamp
    }
  });

  const admins = await getActiveAdmins();
  await Promise.all(
    admins.map((admin: { id: string; organizationId: string }) => createNotification({
      organizationId: admin.organizationId,
      userId: admin.id,
      kind: NotificationKind.SYSTEM,
      title: `Support request: ${thread.subject}`,
      message: `${thread.requesterName} opened a workspace support request.`
    }))
  );

  await createAuditLog({
    organizationId: auth.session.organizationId,
    userId: auth.session.id,
    action: "support.thread_created",
    entityType: "support_thread",
    entityId: thread.id,
    meta: { subject: thread.subject, source: thread.source }
  });

  return ok({ thread }, { status: 201 });
}
