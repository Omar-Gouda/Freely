import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { z } from "zod";

import { createAuditLog } from "@/lib/audit";
import { requireApiSession } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { Role } from "@/lib/models";
import { jobSchema } from "@/lib/validators";

const jobAssignmentSchema = z.object({
  assignedRecruiterId: z.string().optional().or(z.literal("")),
  status: z.string().optional()
});

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

  const rawBody = await request.json();
  const payload = jobSchema.partial().safeParse(rawBody);
  const assignmentPayload = jobAssignmentSchema.safeParse(rawBody);

  if (!payload.success && !assignmentPayload.success) {
    return fail("Invalid job payload", 400);
  }

  const job = await db.job.findFirst({
    where: { id: jobId, organizationId: auth.session.organizationId, deletedAt: null }
  });

  if (!job) {
    return fail("Job not found", 404);
  }

  const nextData: Record<string, unknown> = {};

  if (payload.success) {
    Object.assign(nextData, payload.data);
  }

  if ((payload.success && payload.data.status) || (assignmentPayload.success && assignmentPayload.data.status)) {
    if (auth.session.role !== Role.ADMIN && auth.session.role !== Role.ORG_HEAD) {
      return fail("Only admins or org heads can update job status", 403);
    }
  }

  if (assignmentPayload.success && "assignedRecruiterId" in assignmentPayload.data) {
    if (auth.session.role !== Role.ADMIN && auth.session.role !== Role.ORG_HEAD) {
      return fail("Only admins or org heads can assign jobs to recruiters.", 403);
    }

    const nextRecruiterId = assignmentPayload.data.assignedRecruiterId?.trim() || null;
    const timestamp = new Date();
    let assignmentHistory = Array.isArray(job.assignmentHistory) ? [...job.assignmentHistory] : [];

    assignmentHistory = assignmentHistory.map((entry) => (
      !entry.withdrawnAt && entry.recruiterId !== nextRecruiterId
        ? { ...entry, withdrawnAt: timestamp }
        : entry
    ));

    if (nextRecruiterId) {
      const recruiter = await db.user.findFirst({
        where: {
          id: nextRecruiterId,
          organizationId: auth.session.organizationId,
          role: Role.RECRUITER,
          deletedAt: null
        }
      });

      if (!recruiter) {
        return fail("Assigned recruiter not found in this organization.", 404);
      }

      const existingActive = assignmentHistory.find((entry) => entry.recruiterId === recruiter.id && !entry.withdrawnAt);
      if (!existingActive) {
        assignmentHistory.push({
          id: randomUUID(),
          recruiterId: recruiter.id,
          assignedById: auth.session.id,
          assignedAt: timestamp,
          withdrawnAt: null
        });
      }
    }

    nextData.assignedRecruiterId = nextRecruiterId;
    nextData.assignmentHistory = assignmentHistory;
  }

  const updated = await db.job.update({
    where: { id: jobId },
    data: nextData
  });

  await createAuditLog({
    organizationId: auth.session.organizationId,
    userId: auth.session.id,
    action: "job.updated",
    entityType: "job",
    entityId: jobId,
    meta: nextData
  });

  return ok(updated);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const auth = await requireApiSession(request, [Role.ADMIN, Role.ORG_HEAD]);
  if ("error" in auth) return auth.error;
  const { jobId } = await params;

  const deleted = await db.job.deleteMany({
    where: { id: jobId, organizationId: auth.session.organizationId }
  });

  return ok({ deleted: deleted.count });
}
