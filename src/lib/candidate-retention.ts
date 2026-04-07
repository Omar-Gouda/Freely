import { db } from "@/lib/db";
import { log } from "@/lib/logger";
import { CandidateStage, FileKind, type Candidate } from "@/lib/models";
import { queue, queueNames } from "@/lib/queue";
import { storageProvider } from "@/lib/storage";

const CANDIDATE_PURGE_DELAY_MS = 7 * 24 * 60 * 60 * 1000;

type CandidatePurgePayload = {
  candidateId: string;
  organizationId: string;
  expectedStage: string;
  expectedPurgeAt: string;
};

function isFinalStage(stage: string) {
  return stage === CandidateStage.HIRED || stage === CandidateStage.REJECTED;
}

export async function syncCandidateRetention(candidate: Candidate) {
  if (!isFinalStage(candidate.stage)) {
    if (candidate.scheduledPurgeAt) {
      await db.candidate.update({
        where: { id: candidate.id },
        data: {
          scheduledPurgeAt: null,
          purgedAt: null
        }
      });
    }

    return null;
  }

  const purgeAt = new Date(Date.now() + CANDIDATE_PURGE_DELAY_MS);
  await db.candidate.update({
    where: { id: candidate.id },
    data: {
      scheduledPurgeAt: purgeAt,
      purgedAt: null
    }
  });

  await queue.send(queueNames.candidatePurge, {
    candidateId: candidate.id,
    organizationId: candidate.organizationId,
    expectedStage: candidate.stage,
    expectedPurgeAt: purgeAt.toISOString()
  }, {
    runAfter: purgeAt,
    maxAttempts: 1
  });

  return purgeAt;
}

export async function purgeCandidateIfDue(payload: CandidatePurgePayload) {
  const candidate = await db.candidate.findFirst({
    where: {
      id: payload.candidateId,
      organizationId: payload.organizationId,
      deletedAt: null
    }
  }) as Candidate | null;

  if (!candidate) {
    return false;
  }

  if (!isFinalStage(candidate.stage) || candidate.stage !== payload.expectedStage) {
    return false;
  }

  if (!candidate.scheduledPurgeAt || candidate.scheduledPurgeAt.toISOString() !== payload.expectedPurgeAt) {
    return false;
  }

  if (candidate.scheduledPurgeAt.getTime() > Date.now()) {
    return false;
  }

  const removableFiles = (candidate.files ?? []).filter((file) => file.kind === FileKind.CV || file.kind === FileKind.VOICE_NOTE);
  for (const file of removableFiles) {
    try {
      await storageProvider.delete(file.storageKey);
    } catch (error) {
      log("warn", "Candidate asset purge failed", {
        candidateId: candidate.id,
        storageKey: file.storageKey,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  await db.candidate.update({
    where: { id: candidate.id },
    data: {
      files: (candidate.files ?? []).filter((file) => file.kind === FileKind.AVATAR),
      notes: null,
      skills: [],
      experienceSummary: null,
      educationSummary: null,
      resumeText: null,
      parsedProfile: null,
      cvEvaluation: null,
      voiceEvaluation: null,
      cvScore: null,
      englishScore: null,
      overallScore: null,
      suggestedStage: null,
      scheduledPurgeAt: null,
      purgedAt: new Date(),
      deletedAt: new Date()
    }
  });

  return true;
}
