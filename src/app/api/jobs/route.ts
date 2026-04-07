import { randomUUID } from "crypto";
import { NextRequest } from "next/server";

import { aiProvider } from "@/lib/ai/provider";
import { requireApiSession } from "@/lib/api-auth";
import { createAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { Role } from "@/lib/models";
import { jobSchema } from "@/lib/validators";

function matchSalary(rawDescription: string) {
  return rawDescription.match(/(?:\$|USD|EUR|EGP)?\s?\d+[\d,]*(?:\s*[-/]\s*(?:\$|USD|EUR|EGP)?\s?\d+[\d,]*)?/i)?.[0] ?? null;
}

function buildManualSummary(rawDescription: string) {
  return rawDescription.replace(/\s+/g, " ").trim().slice(0, 220);
}

function buildManualSkills(payload: { mustHaveRequirements: string[]; niceToHaveRequirements: string[]; languageRequirement?: string; experienceRequirement?: string }) {
  return [
    ...payload.mustHaveRequirements,
    ...payload.niceToHaveRequirements,
    payload.languageRequirement || "",
    payload.experienceRequirement || ""
  ]
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 10);
}

async function getVisibleJobIds(session: { organizationId: string; role: Role; id: string }) {
  const jobs = await db.job.findMany({
    where: {
      organizationId: session.organizationId,
      deletedAt: null
    },
    orderBy: { createdAt: "desc" }
  });

  if (session.role !== Role.RECRUITER) {
    return jobs.map((job: { id: string }) => job.id);
  }

  return jobs
    .filter((job: { assignedRecruiterId?: string | null; assignmentHistory?: Array<{ recruiterId: string }> }) => (
      job.assignedRecruiterId === session.id ||
      (job.assignmentHistory ?? []).some((entry) => entry.recruiterId === session.id)
    ))
    .map((job: { id: string }) => job.id);
}

export async function GET(request: NextRequest) {
  const auth = await requireApiSession(request);
  if ("error" in auth) return auth.error;

  const visibleJobIds = await getVisibleJobIds(auth.session);
  const jobs = await db.job.findMany({
    where: {
      organizationId: auth.session.organizationId,
      deletedAt: null,
      ...(auth.session.role === Role.RECRUITER ? { id: { in: visibleJobIds } } : {})
    },
    orderBy: { createdAt: "desc" },
    include: { generatedAds: true, _count: { select: { candidates: true } } }
  });

  return ok(jobs);
}

export async function POST(request: NextRequest) {
  const auth = await requireApiSession(request, [Role.ADMIN, Role.ORG_HEAD]);
  if ("error" in auth) return auth.error;

  const payload = jobSchema.safeParse(await request.json());
  if (!payload.success) {
    return fail("Invalid job payload", 400, payload.error.flatten());
  }

  let assignedRecruiterId: string | null = null;
  let assignmentHistory: Array<{ id: string; recruiterId: string; assignedById: string; assignedAt: Date; withdrawnAt: Date | null }> = [];

  if (payload.data.assignedRecruiterId) {
    const recruiter = await db.user.findFirst({
      where: {
        id: payload.data.assignedRecruiterId,
        organizationId: auth.session.organizationId,
        role: Role.RECRUITER,
        deletedAt: null
      }
    });

    if (!recruiter) {
      return fail("Assigned recruiter not found in this organization.", 404);
    }

    assignedRecruiterId = recruiter.id;
    assignmentHistory = [{
      id: randomUUID(),
      recruiterId: recruiter.id,
      assignedById: auth.session.id,
      assignedAt: new Date(),
      withdrawnAt: null
    }];
  }

  const manualRequirements = [...payload.data.mustHaveRequirements, ...payload.data.niceToHaveRequirements].slice(0, 8);
  const ads = await aiProvider.generateJobAds({
    title: payload.data.title,
    summary: buildManualSummary(payload.data.rawDescription),
    skills: buildManualSkills(payload.data),
    location: payload.data.location || undefined,
    salary: payload.data.salaryRange || matchSalary(payload.data.rawDescription),
    requirements: manualRequirements,
    benefits: []
  });

  const job = await db.job.create({
    data: {
      organizationId: auth.session.organizationId,
      createdById: auth.session.id,
      assignedRecruiterId,
      assignmentHistory,
      title: payload.data.title,
      rawDescription: payload.data.rawDescription,
      structuredData: {
        summary: buildManualSummary(payload.data.rawDescription),
        sector: payload.data.sector || undefined,
        department: payload.data.department || undefined,
        employmentType: payload.data.employmentType || undefined,
        seniority: payload.data.seniority || undefined,
        workMode: payload.data.workMode || undefined,
        salary: payload.data.salaryRange || undefined,
        languageRequirement: payload.data.languageRequirement || undefined,
        experienceRequirement: payload.data.experienceRequirement || undefined,
        mustHaveRequirements: payload.data.mustHaveRequirements,
        niceToHaveRequirements: payload.data.niceToHaveRequirements,
        skills: buildManualSkills(payload.data)
      },
      headcount: payload.data.headcount,
      location: payload.data.location || null,
      sourceCampaign: payload.data.sourceCampaign || undefined,
      status: payload.data.status,
      mustHaveRequirements: payload.data.mustHaveRequirements,
      niceToHaveRequirements: payload.data.niceToHaveRequirements,
      generatedAds: {
        create: [
          { channel: "facebook", content: ads.facebook },
          { channel: "linkedin", content: ads.linkedin },
          { channel: "instagram", content: ads.instagram },
          { channel: "whatsapp", content: ads.whatsapp },
          { channel: "telegram", content: ads.telegram },
          { channel: "jobBoard", content: ads.jobBoard }
        ]
      }
    },
    include: { generatedAds: true }
  });

  await createAuditLog({
    organizationId: auth.session.organizationId,
    userId: auth.session.id,
    action: "job.created",
    entityType: "job",
    entityId: job.id,
    meta: { assignedRecruiterId }
  });

  return ok(job, { status: 201 });
}
