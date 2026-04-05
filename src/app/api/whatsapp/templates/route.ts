import { OutreachKind } from "@/lib/models";
import { NextRequest } from "next/server";

import { aiProvider } from "@/lib/ai/provider";
import { requireApiSession } from "@/lib/api-auth";
import { createAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { outreachTemplateSchema } from "@/lib/validators";

type OutreachCandidate = {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  jobId: string;
  job: { title: string };
};

function buildWhatsappLink(phone: string | null | undefined, message: string) {
  if (!phone) {
    return null;
  }

  const normalizedPhone = phone.replace(/[^\d]/g, "");
  if (!normalizedPhone) {
    return null;
  }

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}

export async function POST(request: NextRequest) {
  const auth = await requireApiSession(request);
  if ("error" in auth) return auth.error;

  const payload = outreachTemplateSchema.safeParse(await request.json());
  if (!payload.success) {
    return fail("Invalid outreach payload", 400, payload.error.flatten());
  }

  const candidateIds = payload.data.candidateIds?.length ? payload.data.candidateIds : payload.data.candidateId ? [payload.data.candidateId] : [];

  if (!candidateIds.length) {
    const content = await aiProvider.generateWhatsappTemplate({
      kind: payload.data.kind,
      interviewTime: payload.data.interviewTime || undefined
    });

    const template = await db.outreachTemplate.create({
      data: {
        organizationId: auth.session.organizationId,
        kind: payload.data.kind as OutreachKind,
        content
      }
    });

    await createAuditLog({
      organizationId: auth.session.organizationId,
      userId: auth.session.id,
      action: "outreach.generated",
      entityType: "outreach_template",
      entityId: template.id,
      meta: payload.data
    });

    return ok({ templates: [{ id: template.id, content, whatsappLink: null }] }, { status: 201 });
  }

  const candidates = await db.candidate.findMany({
    where: {
      id: { in: candidateIds },
      organizationId: auth.session.organizationId,
      deletedAt: null
    },
    include: { job: true }
  }) as OutreachCandidate[];

  if (!candidates.length) {
    return fail("No candidates found", 404);
  }

  const templates = await Promise.all(
    candidates.map(async (candidate: OutreachCandidate) => {
      const content = await aiProvider.generateWhatsappTemplate({
        kind: payload.data.kind,
        candidateName: `${candidate.firstName} ${candidate.lastName}`,
        jobTitle: candidate.job.title,
        interviewTime: payload.data.interviewTime || undefined
      });

      const template = await db.outreachTemplate.create({
        data: {
          organizationId: auth.session.organizationId,
          jobId: candidate.jobId,
          candidateId: candidate.id,
          kind: payload.data.kind as OutreachKind,
          content
        }
      });

      return {
        id: template.id,
        candidateId: candidate.id,
        candidateName: `${candidate.firstName} ${candidate.lastName}`,
        content,
        phone: candidate.phone,
        whatsappLink: buildWhatsappLink(candidate.phone, content)
      };
    })
  );

  await createAuditLog({
    organizationId: auth.session.organizationId,
    userId: auth.session.id,
    action: "outreach.generated",
    entityType: "outreach_template",
    entityId: templates[0]?.id ?? "bulk",
    meta: payload.data
  });

  return ok({ templates }, { status: 201 });
}
