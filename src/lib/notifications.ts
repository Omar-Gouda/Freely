import { randomUUID } from "crypto";

import { NotificationKind } from "@/lib/models";

import { db } from "@/lib/db";

export async function createNotification(input: {
  organizationId: string;
  userId?: string | null;
  kind: NotificationKind;
  title: string;
  message: string;
}) {
  return db.notification.create({
    data: {
      id: randomUUID(),
      organizationId: input.organizationId,
      userId: input.userId ?? null,
      kind: input.kind,
      title: input.title,
      message: input.message,
      isRead: false,
      createdAt: new Date()
    }
  });
}
