import { CandidateStage, NotificationKind } from "@/lib/models";
import { NextRequest } from "next/server";

import { requireApiSession } from "@/lib/api-auth";
import { createAuditLog } from "@/lib/audit";
import { syncCandidateRetention } from "@/lib/candidate-retention";
import { db } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { createNotification } from "@/lib/notifications";
import { calculateRankingScore } from "@/lib/scoring";
import { clampTenPointScore } from "@/lib/utils";
import { candidateUpdateSchema } from "@/lib/validators";

function blendScore(cvScore?: number | null, englishScore?: number | null, explicitOverall?: number | null) {
  if (typeof explicitOverall === "number") {
    return clampTenPointScore(explicitOverall);
  }

  const values = [clampTenPointScore(cvScore), clampTenPointScore(englishScore)].filter((value): value is number => typeof value === "number");
  if (!values.length) {
    return null;
  }

  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ candidateId: string }> }) {
  const auth = await requireApiSession(request);
  if ("error" in auth) return auth.error;
  const { candidateId } = await params;

  const payload = candidateUpdateSchema.safeParse(await request.json());
  if (!payload.success) {
    return fail("Invalid candidate payload", 400, payload.error.flatten());
  }

  const current = await db.candidate.findFirst({
    where: { id: candidateId, organizationId: auth.session.organizationId, deletedAt: null }
  });

  if (!current) {
    return fail("Candidate not found", 404);
  }

  const nextStage = payload.data.stage ?? current.stage;
  const nextCvScore = clampTenPointScore(payload.data.cvScore ?? current.cvScore);
  const nextEnglishScore = clampTenPointScore(payload.data.englishScore ?? current.englishScore);
  const nextOverallScore = blendScore(nextCvScore, nextEnglishScore, payload.data.overallScore ?? current.overallScore);
  const nextYearsExperience = payload.data.yearsExperience ?? current.yearsExperience;
  const nextRankingScore = calculateRankingScore({
    cvScore: nextCvScore,
    englishScore: nextEnglishScore,
    yearsExperience: nextYearsExperience
  });
  const currentVoiceEvaluation = (current.voiceEvaluation ?? {}) as Record<string, unknown>;
  const voiceEvaluation = payload.data.englishLevel
    ? { ...currentVoiceEvaluation, level: payload.data.englishLevel }
    : current.voiceEvaluation;

  const updated = await db.candidate.update({
    where: { id: current.id },
    data: {
      firstName: payload.data.firstName ?? current.firstName,
      lastName: payload.data.lastName ?? current.lastName,
      email: payload.data.email ?? current.email,
      phone: payload.data.phone !== undefined ? payload.data.phone || null : current.phone,
      country: payload.data.country !== undefined ? payload.data.country || null : current.country,
      address: payload.data.address !== undefined ? payload.data.address || null : current.address,
      linkedInUrl: payload.data.linkedInUrl !== undefined ? payload.data.linkedInUrl || null : current.linkedInUrl,
      source: payload.data.source ?? current.source,
      yearsExperience: nextYearsExperience,
      notes: payload.data.notes !== undefined ? payload.data.notes || null : current.notes,
      skills: payload.data.skills ?? current.skills,
      experienceSummary: payload.data.experienceSummary !== undefined ? payload.data.experienceSummary || null : current.experienceSummary,
      educationSummary: payload.data.educationSummary !== undefined ? payload.data.educationSummary || null : current.educationSummary,
      stage: nextStage,
      cvScore: nextCvScore,
      englishScore: nextEnglishScore,
      overallScore: nextOverallScore,
      rankingScore: nextRankingScore,
      voiceEvaluation,
      stageEvents:
        nextStage !== current.stage
          ? {
              create: {
                fromStage: current.stage,
                toStage: nextStage as CandidateStage,
                reason: "Manual candidate update"
              }
            }
          : undefined
    },
    include: { files: true, job: true }
  });

  await syncCandidateRetention(updated);

  if (nextStage !== current.stage) {
    await createNotification({
      organizationId: auth.session.organizationId,
      kind: NotificationKind.STATUS_UPDATE,
      title: "Candidate status updated",
      message: `${updated.firstName} ${updated.lastName} moved to ${String(nextStage).replaceAll("_", " ").toLowerCase()}.`
    });
  }

  await createAuditLog({
    organizationId: auth.session.organizationId,
    userId: auth.session.id,
    action: "candidate.updated",
    entityType: "candidate",
    entityId: updated.id,
    meta: payload.data
  });

  return ok(updated);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ candidateId: string }> }) {
  const auth = await requireApiSession(request);
  if ("error" in auth) return auth.error;
  const { candidateId } = await params;

  const candidate = await db.candidate.findFirst({
    where: { id: candidateId, organizationId: auth.session.organizationId, deletedAt: null }
  });

  if (!candidate) {
    return fail("Candidate not found", 404);
  }

  await db.candidate.update({
    where: { id: candidate.id },
    data: { deletedAt: new Date(), scheduledPurgeAt: null }
  });

  await createAuditLog({
    organizationId: auth.session.organizationId,
    userId: auth.session.id,
    action: "candidate.deleted",
    entityType: "candidate",
    entityId: candidate.id
  });

  return ok({ success: true });
}
