import { NextRequest } from "next/server";

import { createAuditLog } from "@/lib/audit";
import { requireApiSession } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { Role } from "@/lib/models";
import { jobSchema } from "@/lib/validators";

export async function GET(request: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const auth = await requireApiSession(request);
  if ("error" in auth) return auth.error;
  const { jobId } = await params;

  const job = await db.job.findFirst({
    where: { id: jobId, organizationId: auth.session.organizationId },
    include: { generatedAds: true, candidates: true }
  });

  return job ? ok(job) : fail("Job not found", 404);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const auth = await requireApiSession(request);
  if ("error" in auth) return auth.error;
  const { jobId } = await params;

  const payload = jobSchema.partial().safeParse(await request.json());
  if (!payload.success) {
    return fail("Invalid job payload", 400, payload.error.flatten());
  }

  if (payload.data.status && auth.session.role !== Role.ADMIN && auth.session.role !== Role.ORG_HEAD) {
    return fail("Only admins or org heads can update job status", 403);
  }

  const job = await db.job.updateMany({
    where: { id: jobId, organizationId: auth.session.organizationId },
    data: payload.data
  });

  await createAuditLog({
    organizationId: auth.session.organizationId,
    userId: auth.session.id,
    action: "job.updated",
    entityType: "job",
    entityId: jobId,
    meta: payload.data
  });

  return ok({ updated: job.count });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const auth = await requireApiSession(request);
  if ("error" in auth) return auth.error;
  const { jobId } = await params;

  const deleted = await db.job.deleteMany({
    where: { id: jobId, organizationId: auth.session.organizationId }
  });

  return ok({ deleted: deleted.count });
}
