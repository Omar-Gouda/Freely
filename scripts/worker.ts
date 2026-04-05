import { ensureQueueStarted, queue, queueNames } from "@/lib/queue";
import { processCvAnalysis, processInterviewReminder, processVoiceAnalysis, withProcessorLogging } from "@/server/automation/processors";

async function main() {
  await ensureQueueStarted();

  await queue.work(queueNames.cvAnalysis, async ([job]) => {
    if (!job) {
      return;
    }

    await withProcessorLogging(queueNames.cvAnalysis, async () => {
      await processCvAnalysis(job.data as { candidateId: string; organizationId: string });
    });
  });

  await queue.work(queueNames.voiceAnalysis, async ([job]) => {
    if (!job) {
      return;
    }

    await withProcessorLogging(queueNames.voiceAnalysis, async () => {
      await processVoiceAnalysis(job.data as { candidateId: string; organizationId: string });
    });
  });

  await queue.work(queueNames.interviewReminder, async ([job]) => {
    if (!job) {
      return;
    }

    await withProcessorLogging(queueNames.interviewReminder, async () => {
      await processInterviewReminder(job.data as { organizationId: string; slotId: string; expectedStartAt: string; expectedRecruiterId: string });
    });
  });

  console.log("Worker started");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
