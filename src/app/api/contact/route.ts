import { randomUUID } from "crypto";
import { NextRequest } from "next/server";

import { createAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getEmailConfigStatus, isEmailEnabled, sendEmail } from "@/lib/email";
import { fail, ok } from "@/lib/http";
import { NotificationKind, Role } from "@/lib/models";
import { contactRequestSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  const payload = contactRequestSchema.safeParse(await request.json());
  if (!payload.success) {
    return fail("Please fill in your name, email, subject, and a message before sending.", 400, payload.error.flatten());
  }

  const admins = (await db.user.findMany({
    where: {
      role: Role.ADMIN,
      deletedAt: null
    },
    orderBy: { createdAt: "asc" }
  })) as Array<{ id: string; organizationId: string; fullName: string; email: string }>;

  const fallbackOrganization = (await db.organization.findFirst({})) as { id?: string } | null;
  const platformOrganizationId = admins[0]?.organizationId ?? fallbackOrganization?.id ?? "platform";
  const requestId = randomUUID();

  await createAuditLog({
    organizationId: platformOrganizationId,
    action: "support.requested",
    entityType: "support_request",
    entityId: requestId,
    meta: {
      name: payload.data.name,
      email: payload.data.email,
      company: payload.data.company || null,
      subject: payload.data.subject,
      message: payload.data.message
    }
  });

  if (admins.length) {
    await Promise.all(
      admins.map((admin) => createNotification({
        organizationId: admin.organizationId,
        userId: admin.id,
        kind: NotificationKind.SYSTEM,
        title: `Support request: ${payload.data.subject}`,
        message: `${payload.data.name} (${payload.data.email})${payload.data.company ? ` from ${payload.data.company}` : ""}: ${payload.data.message}`
      }))
    );
  }

  const supportEmail = env.SUPPORT_EMAIL || env.EMAIL_FROM;
  let emailDelivered = false;
  let warning: string | null = null;

  if (supportEmail && isEmailEnabled()) {
    const result = await sendEmail({
      to: supportEmail,
      replyTo: payload.data.email,
      subject: `[Freely contact] ${payload.data.subject}`,
      text: [
        `Name: ${payload.data.name}`,
        `Email: ${payload.data.email}`,
        `Company: ${payload.data.company || "Not provided"}`,
        `Request ID: ${requestId}`,
        "",
        payload.data.message
      ].join("\n"),
      html: `
        <div style="font-family: Manrope, Arial, sans-serif; color: #24123a; line-height: 1.6;">
          <p><strong>Name:</strong> ${payload.data.name}</p>
          <p><strong>Email:</strong> ${payload.data.email}</p>
          <p><strong>Company:</strong> ${payload.data.company || "Not provided"}</p>
          <p><strong>Request ID:</strong> ${requestId}</p>
          <p><strong>Message:</strong></p>
          <p>${payload.data.message.replace(/\n/g, "<br />")}</p>
        </div>
      `
    });

    emailDelivered = !result.skipped;
    warning = result.skipped ? result.reason ?? null : null;
  } else {
    const emailStatus = getEmailConfigStatus();
    warning = emailStatus.enabled
      ? "Support email delivery is not available yet, but your message was still recorded inside Freely."
      : `Support email is not configured. Missing: ${emailStatus.missing.join(", ")}`;
  }

  return ok({
    submitted: true,
    requestId,
    channel: emailDelivered ? (admins.length ? "email-and-notification" : "email") : (admins.length ? "notification" : "logged"),
    warning
  }, { status: 201 });
}
