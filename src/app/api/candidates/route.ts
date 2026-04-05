import { NextRequest } from "next/server";

import { NotificationKind } from "@/lib/models";
import { createAuditLog } from "@/lib/audit";
import { requireApiSession } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { log } from "@/lib/logger";
import { createNotification } from "@/lib/notifications";
import { candidateSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireApiSession(request);
    if ("error" in auth) return auth.error;

    const candidates = await db.candidate.findMany({
      where: {
        organizationId: auth.session.organizationId,
        deletedAt: null
      },
      orderBy: [
        { rankingScore: "desc" },
        { createdAt: "desc" }
      ],
      include: {
        job: true,
        files: true
      }
    });

    return ok(candidates);
  } catch (error) {
    log("error", "GET /candidates failed", { error: error instanceof Error ? error.message : String(error) });
    return fail("Failed to fetch candidates", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireApiSession(request);
    if ("error" in auth) return auth.error;

    const body = await request.json();

    const parsed = candidateSchema.safeParse(body);
    if (!parsed.success) {
      return fail("Invalid candidate payload", 400, parsed.error.flatten());
    }

    const data = parsed.data;

    const job = await db.job.findFirst({
      where: {
        id: data.jobId,
        organizationId: auth.session.organizationId,
        deletedAt: null
      }
    });

    if (!job) {
      return fail("Job not found", 404);
    }

    const candidate = await db.candidate.create({
      data: {
        organizationId: auth.session.organizationId,
        jobId: data.jobId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone || null,
        country: data.country || null,
        address: data.address || null,
        linkedInUrl: data.linkedInUrl || null,
        source: data.source,
        yearsExperience: data.yearsExperience ?? null,
        notes: data.notes || null,
        skills: data.skills ?? [],
        experienceSummary: data.experienceSummary || null,
        educationSummary: data.educationSummary || null,
        resumeText: data.resumeText || null,
        parsedProfile: data.parsedProfile ?? null,
        stageEvents: {
          create: {
            toStage: "APPLIED",
            reason: "Candidate created"
          }
        }
      }
    });

    await Promise.all([
      createNotification({
        organizationId: auth.session.organizationId,
        kind: NotificationKind.NEW_APPLICANT,
        title: "New applicant added",
        message: `${candidate.firstName} ${candidate.lastName} applied for ${job.title}`
      }),
      createAuditLog({
        organizationId: auth.session.organizationId,
        userId: auth.session.id,
        action: "candidate.created",
        entityType: "candidate",
        entityId: candidate.id
      })
    ]);

    return ok(candidate, { status: 201 });
  } catch (error) {
    log("error", "POST /candidates failed", { error: error instanceof Error ? error.message : String(error) });
    return fail("Failed to create candidate", 500);
  }
}