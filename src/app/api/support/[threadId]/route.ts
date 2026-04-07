import { NextRequest } from "next/server";

import { requireApiSession } from "@/lib/api-auth";
import { createAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { Role, SupportThreadStatus } from "@/lib/models";
import { supportThreadStatusSchema } from "@/lib/validators";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ threadId: string }> }) {
  const auth = await requireApiSession(request, [Role.ADMIN, Role.ORG_HEAD, Role.RECRUITER]);
  if ("error" in auth) return auth.error;

  const payload = supportThreadStatusSchema.safeParse(await request.json());
  if (!payload.success) {
    return fail("Invalid support status payload.", 400, payload.error.flatten());
  }

  const { threadId } = await params;
  const thread = await db.supportThread.findFirst({ where: { id: threadId } });
  if (!thread) {
    return fail("Support thread not found.", 404);
  }

  const isAdmin = auth.session.role === Role.ADMIN;
  if (!isAdmin && thread.requesterUserId !== auth.session.id) {
    return fail("You do not have permission to update this support request.", 403);
  }

  const memberAllowedStatuses: SupportThreadStatus[] = [SupportThreadStatus.OPEN, SupportThreadStatus.RESOLVED];
  if (!isAdmin && !memberAllowedStatuses.includes(payload.data.status)) {
    return fail("Only admins can move a request into that status.", 403);
  }

  const updatedThread = await db.supportThread.update({
    where: { id: thread.id },
    data: {
      status: payload.data.status,
      resolvedAt: payload.data.status === SupportThreadStatus.RESOLVED ? new Date() : null
    }
  });

  await createAuditLog({
    organizationId: thread.organizationId,
    userId: auth.session.id,
    action: "support.status_updated",
    entityType: "support_thread",
    entityId: thread.id,
    meta: { status: payload.data.status }
  });

  return ok({ thread: updatedThread });
}
