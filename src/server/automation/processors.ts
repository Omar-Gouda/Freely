import { CandidateStage, FileKind, NotificationKind } from "@/lib/models";

import { purgeDeactivatedUserIfDue } from "@/lib/account-lifecycle";
import { aiProvider } from "@/lib/ai/provider";
import { createAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { log } from "@/lib/logger";
import { createNotification } from "@/lib/notifications";
import { calculateOverallScore, calculateRankingScore } from "@/lib/scoring";
import { storageProvider } from "@/lib/storage";
import { extractTextFromCv } from "@/lib/uploads";
import { clampTenPointScore } from "@/lib/utils";

type CandidateJobPayload = {
  candidateId: string;
  organizationId: string;
};

type InterviewReminderPayload = {
  organizationId: string;
  slotId: string;
  expectedStartAt: string;
  expectedRecruiterId: string;
};

type UserPurgePayload = {
  userId: string;
  expectedDeletionAt?: string;
};

export async function processCvAnalysis(payload: CandidateJobPayload) {
  const candidate = await db.candidate.findUnique({
    where: { id: payload.candidateId },
    include: {
      job: true,
      files: {
        where: {
          kind: FileKind.CV
        },
        orderBy: {
          createdAt: "desc"
        },
        take: 1
      }
    }
  });

  if (!candidate || candidate.organizationId !== payload.organizationId) {
    return;
  }

  const cvFile = candidate.files[0];

  if (!cvFile) {
    return;
  }

  const downloaded = await storageProvider.download(cvFile.storageKey);
  const cvText = await extractTextFromCv(downloaded.body, cvFile.mimeType);
  const evaluation = await aiProvider.evaluateCv({
    candidateName: `${candidate.firstName} ${candidate.lastName}`,
    jobTitle: candidate.job.title,
    cvText
  });
  const cvScore = clampTenPointScore(evaluation.score);

  const overallScore = calculateOverallScore(cvScore, candidate.englishScore);
  const rankingScore = calculateRankingScore({
    cvScore,
    englishScore: candidate.englishScore,
    yearsExperience: candidate.yearsExperience
  });

  const suggestion = await aiProvider.suggestStage({
    jobTitle: candidate.job.title,
    cvScore,
    englishScore: candidate.englishScore,
    currentStage: candidate.stage
  });

  await db.candidate.update({
    where: { id: candidate.id },
    data: {
      cvScore,
      cvEvaluation: { ...evaluation, score: cvScore },
      overallScore,
      rankingScore,
      suggestedStage: suggestion.suggestedStage as CandidateStage
    }
  });

  await createNotification({
    organizationId: candidate.organizationId,
    kind: NotificationKind.STATUS_UPDATE,
    title: "CV analysis completed",
    message: `${candidate.firstName} ${candidate.lastName} received a CV score of ${cvScore}/10.`
  });

  await createAuditLog({
    organizationId: candidate.organizationId,
    action: "candidate.cv_analyzed",
    entityType: "candidate",
    entityId: candidate.id,
    meta: { score: cvScore }
  });
}

export async function processVoiceAnalysis(payload: CandidateJobPayload) {
  const candidate = await db.candidate.findUnique({
    where: { id: payload.candidateId },
    include: {
      job: true,
      files: {
        where: {
          kind: FileKind.VOICE_NOTE
        },
        orderBy: {
          createdAt: "desc"
        },
        take: 1
      }
    }
  });

  if (!candidate || candidate.organizationId !== payload.organizationId) {
    return;
  }

  const voiceFile = candidate.files[0];

  if (!voiceFile) {
    return;
  }

  const downloaded = await storageProvider.download(voiceFile.storageKey);
  const evaluation = await aiProvider.transcribeAndEvaluateVoice({
    candidateName: `${candidate.firstName} ${candidate.lastName}`,
    jobTitle: candidate.job.title,
    fileName: voiceFile.fileName,
    audioBuffer: downloaded.body
  });
  const englishScore = clampTenPointScore(evaluation.score);

  const overallScore = calculateOverallScore(candidate.cvScore, englishScore);
  const rankingScore = calculateRankingScore({
    cvScore: candidate.cvScore,
    englishScore,
    yearsExperience: candidate.yearsExperience
  });

  const suggestion = await aiProvider.suggestStage({
    jobTitle: candidate.job.title,
    cvScore: candidate.cvScore,
    englishScore,
    currentStage: candidate.stage
  });

  await db.candidate.update({
    where: { id: candidate.id },
    data: {
      englishScore,
      voiceEvaluation: { ...evaluation, score: englishScore },
      overallScore,
      rankingScore,
      suggestedStage: suggestion.suggestedStage as CandidateStage
    }
  });

  await createNotification({
    organizationId: candidate.organizationId,
    kind: NotificationKind.STATUS_UPDATE,
    title: "Voice evaluation completed",
    message: `${candidate.firstName} ${candidate.lastName} received an English score of ${englishScore}/10.`
  });

  await createAuditLog({
    organizationId: candidate.organizationId,
    action: "candidate.voice_analyzed",
    entityType: "candidate",
    entityId: candidate.id,
    meta: { score: englishScore }
  });
}

export async function processInterviewReminder(payload: InterviewReminderPayload) {
  const slot = await db.interviewSlot.findFirst({
    where: {
      id: payload.slotId,
      organizationId: payload.organizationId
    },
    include: {
      job: true,
      booking: { include: { candidate: true } }
    }
  });

  if (!slot) {
    return;
  }

  const candidateLabel = slot.booking
    ? `${slot.booking.candidate.firstName} ${slot.booking.candidate.lastName}`
    : "Upcoming interview slot";

  await createNotification({
    organizationId: payload.organizationId,
    userId: payload.expectedRecruiterId || null,
    kind: NotificationKind.INTERVIEW_REMINDER,
    title: "Upcoming interview",
    message: `${candidateLabel} · ${slot.job.title} · ${new Date(payload.expectedStartAt).toLocaleString()}`
  });
}

export async function processUserPurge(payload: UserPurgePayload) {
  await purgeDeactivatedUserIfDue(payload.userId, payload.expectedDeletionAt);
}

export async function withProcessorLogging(jobName: string, run: () => Promise<void>) {
  try {
    await run();
  } catch (error) {
    log("error", `${jobName} failed`, {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}
