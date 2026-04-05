import { NextRequest } from "next/server";

import { requireApiSession } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { fail, ok } from "@/lib/http";

export async function GET(request: NextRequest) {
  const auth = await requireApiSession(request);
  if ("error" in auth) return auth.error;

  const notifications = await db.notification.findMany({
    where: {
      organizationId: auth.session.organizationId,
      OR: [{ userId: null }, { userId: auth.session.id }]
    },
    orderBy: { createdAt: "desc" },
    take: 10
  });

  return ok(notifications);
}

export async function PATCH(request: NextRequest) {
  const auth = await requireApiSession(request);
  if ("error" in auth) return auth.error;

  const body = (await request.json().catch(() => ({}))) as { notificationId?: string; markAll?: boolean };
  if (!body.markAll && !body.notificationId) {
    return fail("Notification target is required", 400);
  }

  const where = {
    organizationId: auth.session.organizationId,
    OR: [{ userId: null }, { userId: auth.session.id }],
    ...(body.markAll ? {} : { id: body.notificationId })
  };

  await db.notification.updateMany({
    where,
    data: { isRead: true }
  });

  return ok({ success: true });
}
