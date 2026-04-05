import { NextRequest } from "next/server";

import { aiProvider } from "@/lib/ai/provider";
import { requireApiSession } from "@/lib/api-auth";
import { createAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { jobSchema } from "@/lib/validators";

function matchSalary(rawDescription: string) {
  return rawDescription.match(/(?:\$|USD|EUR|EGP)?\s?\d+[\d,]*(?:\s*[-/]\s*(?:\$|USD|EUR|EGP)?\s?\d+[\d,]*)?/i)?.[0] ?? null;
}

function buildExtractionInput(payload: {
  title: string;
  location?: string;
  sector?: string;
  department?: string;
  employmentType?: string;
  seniority?: string;
  workMode?: string;
  salaryRange?: string;
  languageRequirement?: string;
  experienceRequirement?: string;
  rawDescription: string;
}) {
  return [
    payload.title ? `Role: ${payload.title}` : "",
    payload.sector ? `Sector: ${payload.sector}` : "",
    payload.department ? `Department: ${payload.department}` : "",
    payload.location ? `Location: ${payload.location}` : "",
    payload.employmentType ? `Employment type: ${payload.employmentType}` : "",
    payload.seniority ? `Seniority: ${payload.seniority}` : "",
    payload.workMode ? `Work mode: ${payload.workMode}` : "",
    payload.salaryRange ? `Compensation: ${payload.salaryRange}` : "",
    payload.languageRequirement ? `Language requirement: ${payload.languageRequirement}` : "",
    payload.experienceRequirement ? `Experience requirement: ${payload.experienceRequirement}` : "",
    payload.rawDescription
  ]
    .filter(Boolean)
    .join("\n");
}

export async function GET(request: NextRequest) {
  const auth = await requireApiSession(request);
  if ("error" in auth) return auth.error;

  const jobs = await db.job.findMany({
    where: { organizationId: auth.session.organizationId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: { generatedAds: true, _count: { select: { candidates: true } } }
  });

  return ok(jobs);
}

export async function POST(request: NextRequest) {
  const auth = await requireApiSession(request);
  if ("error" in auth) return auth.error;

  const payload = jobSchema.safeParse(await request.json());
  if (!payload.success) {
    return fail("Invalid job payload", 400, payload.error.flatten());
  }

  const extracted = await aiProvider.extractJobDescription(buildExtractionInput(payload.data));
  const requirements = [...(extracted.qualifications ?? []), ...(extracted.responsibilities ?? [])].slice(0, 5);
  const ads = await aiProvider.generateJobAds({
    title: payload.data.title || extracted.title,
    summary: extracted.summary,
    skills: extracted.skills,
    location: payload.data.location || extracted.location,
    salary: payload.data.salaryRange || extracted.salary || matchSalary(payload.data.rawDescription),
    requirements,
    benefits: extracted.benefits ?? []
  });

  const job = await db.job.create({
    data: {
      organizationId: auth.session.organizationId,
      createdById: auth.session.id,
      title: payload.data.title || extracted.title,
      rawDescription: payload.data.rawDescription,
      structuredData: {
        ...extracted,
        sector: payload.data.sector || undefined,
        department: payload.data.department || undefined,
        employmentType: payload.data.employmentType || undefined,
        seniority: payload.data.seniority || extracted.seniority || undefined,
        workMode: payload.data.workMode || extracted.workMode || undefined,
        salary: payload.data.salaryRange || extracted.salary || undefined,
        languageRequirement: payload.data.languageRequirement || undefined,
        experienceRequirement: payload.data.experienceRequirement || undefined
      },
      headcount: payload.data.headcount,
      location: payload.data.location || extracted.location,
      sourceCampaign: payload.data.sourceCampaign || undefined,
      status: payload.data.status,
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
    entityId: job.id
  });

  return ok(job, { status: 201 });
}