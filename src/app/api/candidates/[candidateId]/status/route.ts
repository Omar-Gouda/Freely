import { CandidateStage, NotificationKind } from "@/lib/models";
import { NextRequest } from "next/server";

import { createAuditLog } from "@/lib/audit";
import { requireApiSession } from "@/lib/api-auth";
import { syncCandidateRetention } from "@/lib/candidate-retention";
import { db } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { createNotification } from "@/lib/notifications";
import { stageUpdateSchema } from "@/lib/validators";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ candidateId: string }> }) {
  const auth = await requireApiSession(request);
  if ("error" in auth) return auth.error;
  const { candidateId } = await params;

  const payload = stageUpdateSchema.safeParse(await request.json());
  if (!payload.success) {
    return fail("Invalid stage payload", 400, payload.error.flatten());
  }

  const current = await db.candidate.findFirst({
    where: { id: candidateId, organizationId: auth.session.organizationId, deletedAt: null }
  });

  if (!current) {
    return fail("Candidate not found", 404);
  }

  const updated = await db.candidate.update({
    where: { id: current.id },
    data: {
      stage: payload.data.stage as CandidateStage,
      stageEvents: {
        create: {
          fromStage: current.stage,
          toStage: payload.data.stage,
          reason: payload.data.reason || "Manual ATS update"
        }
      }
    }
  });

  await syncCandidateRetention(updated);

  await createNotification({
    organizationId: auth.session.organizationId,
    kind: NotificationKind.STATUS_UPDATE,
    title: "Candidate stage changed",
    message: `${updated.firstName} ${updated.lastName} moved to ${payload.data.stage.replaceAll("_", " ").toLowerCase()}.`
  });

  await createAuditLog({
    organizationId: auth.session.organizationId,
    userId: auth.session.id,
    action: "candidate.stage_updated",
    entityType: "candidate",
    entityId: updated.id,
    meta: payload.data
  });

  return ok(updated);
}
