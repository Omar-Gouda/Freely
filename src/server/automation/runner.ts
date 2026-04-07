import { ensureQueueStarted, queue, queueNames } from "@/lib/queue";
import { processCandidatePurge, processCvAnalysis, processInterviewReminder, processUserPurge, processVoiceAnalysis, withProcessorLogging } from "@/server/automation/processors";

export async function runAutomationQueues(limitPerQueue = 5) {
  await ensureQueueStarted();

  const cvProcessed = await queue.drain(queueNames.cvAnalysis, async ([job]) => {
    if (!job) {
      return;
    }

    await withProcessorLogging(queueNames.cvAnalysis, async () => {
      await processCvAnalysis(job.data as { candidateId: string; organizationId: string });
    });
  }, limitPerQueue);

  const voiceProcessed = await queue.drain(queueNames.voiceAnalysis, async ([job]) => {
    if (!job) {
      return;
    }

    await withProcessorLogging(queueNames.voiceAnalysis, async () => {
      await processVoiceAnalysis(job.data as { candidateId: string; organizationId: string });
    });
  }, limitPerQueue);

  const interviewReminderProcessed = await queue.drain(queueNames.interviewReminder, async ([job]) => {
    if (!job) {
      return;
    }

    await withProcessorLogging(queueNames.interviewReminder, async () => {
      await processInterviewReminder(job.data as { organizationId: string; slotId: string; expectedStartAt: string; expectedRecruiterId: string });
    });
  }, limitPerQueue);

  const userPurgeProcessed = await queue.drain(queueNames.userPurge, async ([job]) => {
    if (!job) {
      return;
    }

    await withProcessorLogging(queueNames.userPurge, async () => {
      await processUserPurge(job.data as { userId: string; expectedDeletionAt?: string });
    });
  }, limitPerQueue);

  const candidatePurgeProcessed = await queue.drain(queueNames.candidatePurge, async ([job]) => {
    if (!job) {
      return;
    }

    await withProcessorLogging(queueNames.candidatePurge, async () => {
      await processCandidatePurge(job.data as { candidateId: string; organizationId: string; expectedStage: string; expectedPurgeAt: string });
    });
  }, limitPerQueue);

  return {
    cvProcessed,
    voiceProcessed,
    interviewReminderProcessed,
    userPurgeProcessed,
    candidatePurgeProcessed,
    totalProcessed: cvProcessed + voiceProcessed + interviewReminderProcessed + userPurgeProcessed + candidatePurgeProcessed
  };
}
