import { NextRequest } from "next/server";

import { aiProvider } from "@/lib/ai/provider";
import { requireApiSession } from "@/lib/api-auth";
import { createAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { fail, ok } from "@/lib/http";

function matchSalary(rawDescription: string) {
  return rawDescription.match(/(?:\$|USD|EUR|EGP)?\s?\d+[\d,]*(?:\s*[-/]\s*(?:\$|USD|EUR|EGP)?\s?\d+[\d,]*)?/i)?.[0] ?? null;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const auth = await requireApiSession(request);
  if ("error" in auth) return auth.error;
  const { jobId } = await params;

  const job = await db.job.findFirst({
    where: { id: jobId, organizationId: auth.session.organizationId, deletedAt: null }
  });

  if (!job) {
    return fail("Job not found", 404);
  }

  const structured = (job.structuredData ?? {}) as {
    summary?: string;
    skills?: string[];
    location?: string;
    mustHaveRequirements?: string[];
    niceToHaveRequirements?: string[];
    qualifications?: string[];
    responsibilities?: string[];
    benefits?: string[];
    salary?: string;
  };
  const requirements = [
    ...(job.mustHaveRequirements ?? structured.mustHaveRequirements ?? []),
    ...(job.niceToHaveRequirements ?? structured.niceToHaveRequirements ?? []),
    ...(structured.qualifications ?? []),
    ...(structured.responsibilities ?? [])
  ].slice(0, 8);
  const ads = await aiProvider.generateJobAds({
    title: job.title,
    summary: structured.summary ?? job.rawDescription.slice(0, 180),
    skills: structured.skills ?? requirements,
    location: job.location ?? structured.location,
    salary: structured.salary ?? matchSalary(job.rawDescription),
    requirements,
    benefits: structured.benefits ?? []
  });

  await Promise.all(
    Object.entries(ads).map(([channel, content]) =>
      db.generatedJobAd.upsert({
        where: { jobId_channel: { jobId: job.id, channel } },
        update: { content },
        create: { jobId: job.id, channel, content }
      })
    )
  );

  await createAuditLog({
    organizationId: auth.session.organizationId,
    userId: auth.session.id,
    action: "job.ads_generated",
    entityType: "job",
    entityId: job.id
  });

  return ok(ads);
}
