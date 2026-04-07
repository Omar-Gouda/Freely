import { randomUUID } from "crypto";
import { NextRequest } from "next/server";

import { requireApiSession } from "@/lib/api-auth";
import { createAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getEmailConfigStatus, sendEmail } from "@/lib/email";
import { fail, ok } from "@/lib/http";
import { NotificationKind, Role, SupportMessageAuthorType, SupportThreadSource, SupportThreadStatus, UserAccountStatus } from "@/lib/models";
import { createNotification } from "@/lib/notifications";
import { supportMessageSchema } from "@/lib/validators";

async function getActiveAdmins() {
  const admins = await db.user.findMany({
    where: { role: Role.ADMIN, deletedAt: null },
    orderBy: { createdAt: "asc" }
  });

  return admins.filter((admin: { accountStatus?: string | null }) => (admin.accountStatus ?? UserAccountStatus.ACTIVE) === UserAccountStatus.ACTIVE);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ threadId: string }> }) {
  const auth = await requireApiSession(request, [Role.ADMIN, Role.ORG_HEAD, Role.RECRUITER]);
  if ("error" in auth) return auth.error;

  const payload = supportMessageSchema.safeParse(await request.json());
  if (!payload.success) {
    return fail("Please add a message before sending your reply.", 400, payload.error.flatten());
  }

  const { threadId } = await params;
  const thread = await db.supportThread.findFirst({ where: { id: threadId } });
  if (!thread) {
    return fail("Support thread not found.", 404);
  }

  const isAdmin = auth.session.role === Role.ADMIN;
  if (!isAdmin && thread.requesterUserId !== auth.session.id) {
    return fail("You do not have permission to reply to this thread.", 403);
  }

  const timestamp = new Date();
  const deliveredByEmail = Boolean(isAdmin && thread.source === SupportThreadSource.PUBLIC_CONTACT);
  const nextMessage = {
    id: randomUUID(),
    authorType: isAdmin ? SupportMessageAuthorType.ADMIN : SupportMessageAuthorType.MEMBER,
    authorUserId: auth.session.id,
    authorName: auth.session.fullName ?? auth.session.email,
    authorEmail: auth.session.email,
    body: payload.data.message.trim(),
    createdAt: timestamp,
    deliveredByEmail
  };

  const nextStatus = isAdmin ? SupportThreadStatus.WAITING_ON_REQUESTER : SupportThreadStatus.OPEN;
  const updatedThread = await db.supportThread.update({
    where: { id: thread.id },
    data: {
      messages: [...thread.messages, nextMessage],
      lastMessageAt: timestamp,
      status: nextStatus,
      resolvedAt: null,
      assignedAdminUserId: isAdmin ? auth.session.id : thread.assignedAdminUserId ?? null
    }
  });

  let warning: string | null = null;

  if (isAdmin && thread.source === SupportThreadSource.PUBLIC_CONTACT) {
    const result = await sendEmail({
      to: thread.requesterEmail,
      replyTo: env.SUPPORT_EMAIL || env.EMAIL_FROM || auth.session.email,
      subject: `Re: ${thread.subject}`,
      text: [
        `Hello ${thread.requesterName},`,
        "",
        payload.data.message.trim(),
        "",
        "Freely support hours: Monday to Friday, 10 AM to 4 PM."
      ].join("\n"),
      html: `
        <div style="font-family: Manrope, Arial, sans-serif; color: #152132; line-height: 1.6;">
          <p>Hello ${thread.requesterName},</p>
          <p>${payload.data.message.trim().replace(/\n/g, "<br />")}</p>
          <p style="color: #5f6d7d;">Freely support hours: Monday to Friday, 10 AM to 4 PM.</p>
        </div>
      `
    });

    warning = result.skipped ? result.reason ?? getEmailConfigStatus().missing.join(", ") : null;
  }

  if (isAdmin && thread.requesterUserId) {
    await createNotification({
      organizationId: thread.organizationId,
      userId: thread.requesterUserId,
      kind: NotificationKind.SYSTEM,
      title: `Support reply: ${thread.subject}`,
      message: "A new admin reply was added to your support conversation."
    });
  }

  if (!isAdmin) {
    const admins = await getActiveAdmins();
    await Promise.all(
      admins.map((admin: { id: string; organizationId: string }) => createNotification({
        organizationId: admin.organizationId,
        userId: admin.id,
        kind: NotificationKind.SYSTEM,
        title: `Support reply: ${thread.subject}`,
        message: `${auth.session.fullName ?? auth.session.email} replied to a support request.`
      }))
    );
  }

  await createAuditLog({
    organizationId: thread.organizationId,
    userId: auth.session.id,
    action: "support.message_added",
    entityType: "support_thread",
    entityId: thread.id,
    meta: { source: thread.source, deliveredByEmail, warning }
  });

  return ok({ thread: updatedThread, warning });
}
