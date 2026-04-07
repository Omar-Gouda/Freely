import { randomUUID } from "crypto";
import { NextRequest } from "next/server";

import { createAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { db } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { NotificationKind, Role, SupportMessageAuthorType, SupportThreadSource, SupportThreadStatus, UserAccountStatus } from "@/lib/models";
import { contactRequestSchema } from "@/lib/validators";

async function getActiveAdmins() {
  const admins = await db.user.findMany({
    where: { role: Role.ADMIN, deletedAt: null },
    orderBy: { createdAt: "asc" }
  });

  return admins.filter((admin: { accountStatus?: string | null }) => (admin.accountStatus ?? UserAccountStatus.ACTIVE) === UserAccountStatus.ACTIVE);
}

export async function POST(request: NextRequest) {
  const payload = contactRequestSchema.safeParse(await request.json());
  if (!payload.success) {
    return fail("Please fill in your name, email, subject, and a message before sending.", 400, payload.error.flatten());
  }

  const admins = await getActiveAdmins();
  const fallbackOrganization = (await db.organization.findFirst({})) as { id?: string } | null;
  const platformOrganizationId = admins[0]?.organizationId ?? fallbackOrganization?.id ?? "platform";
  const timestamp = new Date();

  const thread = await db.supportThread.create({
    data: {
      id: randomUUID(),
      organizationId: platformOrganizationId,
      requesterUserId: null,
      requesterName: payload.data.name.trim(),
      requesterEmail: payload.data.email.trim().toLowerCase(),
      requesterCompany: payload.data.company?.trim() || null,
      subject: payload.data.subject.trim(),
      status: SupportThreadStatus.OPEN,
      source: SupportThreadSource.PUBLIC_CONTACT,
      assignedAdminUserId: null,
      lastMessageAt: timestamp,
      resolvedAt: null,
      messages: [{
        id: randomUUID(),
        authorType: SupportMessageAuthorType.EXTERNAL,
        authorUserId: null,
        authorName: payload.data.name.trim(),
        authorEmail: payload.data.email.trim().toLowerCase(),
        body: payload.data.message.trim(),
        createdAt: timestamp,
        deliveredByEmail: false
      }],
      createdAt: timestamp,
      updatedAt: timestamp
    }
  });

  if (admins.length) {
    await Promise.all(
      admins.map((admin: { id: string; organizationId: string }) => createNotification({
        organizationId: admin.organizationId,
        userId: admin.id,
        kind: NotificationKind.SYSTEM,
        title: `Public support request: ${thread.subject}`,
        message: `${thread.requesterName} submitted a request from the public contact page.`
      }))
    );
  }

  await createAuditLog({
    organizationId: platformOrganizationId,
    action: "support.public_requested",
    entityType: "support_thread",
    entityId: thread.id,
    meta: {
      name: payload.data.name,
      email: payload.data.email,
      company: payload.data.company || null,
      subject: payload.data.subject
    }
  });

  return ok({
    submitted: true,
    threadId: thread.id,
    warning: null
  }, { status: 201 });
}
