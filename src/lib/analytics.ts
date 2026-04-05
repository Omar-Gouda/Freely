import { CandidateStage } from "@/lib/models";

import { db } from "@/lib/db";

type AnalyticsCandidate = {
  id: string;
  source: string | null;
  stage: string | null;
  overallScore: number | null;
  createdAt: Date;
  job?: { title?: string | null } | null;
  stageEvents?: Array<{ toStage: string; createdAt: Date }>;
};

type AnalyticsJob = {
  id: string;
  title: string;
  _count?: { candidates?: number };
};

type AnalyticsAuditLog = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: Date;
};

function calculateAverageTimeToHireDays(candidates: AnalyticsCandidate[]) {
  const hiredDurations = candidates
    .map((candidate) => {
      const hiredEvent = (candidate.stageEvents ?? []).find((event) => event.toStage === CandidateStage.HIRED);
      if (!hiredEvent) {
        return null;
      }

      const diffMs = new Date(hiredEvent.createdAt).getTime() - new Date(candidate.createdAt).getTime();
      return diffMs > 0 ? diffMs / (1000 * 60 * 60 * 24) : null;
    })
    .filter((value): value is number => value !== null);

  if (!hiredDurations.length) {
    return 0;
  }

  return Math.round((hiredDurations.reduce((sum, value) => sum + value, 0) / hiredDurations.length) * 10) / 10;
}

export async function getAnalyticsOverview(organizationId: string, jobId?: string) {
  const [candidates, jobs, logs, slots] = await Promise.all([
    db.candidate.findMany({
      where: { organizationId, ...(jobId ? { jobId } : {}) },
      select: {
        id: true,
        source: true,
        stage: true,
        overallScore: true,
        createdAt: true,
        stageEvents: true,
        job: { select: { title: true } }
      }
    }) as Promise<AnalyticsCandidate[]>,
    db.job.findMany({
      where: { organizationId, ...(jobId ? { id: jobId } : {}) },
      select: {
        id: true,
        title: true,
        _count: { select: { candidates: true } }
      }
    }) as Promise<AnalyticsJob[]>,
    db.auditLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 80
    }) as Promise<AnalyticsAuditLog[]>,
    db.interviewSlot.findMany({
      where: { organizationId, ...(jobId ? { jobId } : {}) }
    }) as Promise<Array<{ id: string }>>
  ]);

  const sourceMap = new Map<string, number>();
  const stageMap = new Map<string, number>();
  const qualityBands = {
    excellent: 0,
    strong: 0,
    moderate: 0,
    low: 0
  };

  for (const candidate of candidates) {
    sourceMap.set(String(candidate.source), (sourceMap.get(String(candidate.source)) ?? 0) + 1);
    stageMap.set(String(candidate.stage), (stageMap.get(String(candidate.stage)) ?? 0) + 1);

    if (Number(candidate.overallScore ?? 0) >= 8.5) {
      qualityBands.excellent += 1;
    } else if (Number(candidate.overallScore ?? 0) >= 7.5) {
      qualityBands.strong += 1;
    } else if (Number(candidate.overallScore ?? 0) >= 6) {
      qualityBands.moderate += 1;
    } else {
      qualityBands.low += 1;
    }
  }

  const applied = stageMap.get(CandidateStage.APPLIED) ?? 0;
  const screened = stageMap.get(CandidateStage.SCREENED) ?? 0;
  const qualified = stageMap.get(CandidateStage.QUALIFIED) ?? 0;
  const hired = stageMap.get(CandidateStage.HIRED) ?? 0;
  const candidateIds = new Set(candidates.map((candidate) => candidate.id));
  const slotIds = new Set(slots.map((slot) => slot.id));
  const recentActivity = logs
    .filter((log) => {
      if (!jobId) {
        return true;
      }

      return (
        (log.entityType === "job" && log.entityId === jobId) ||
        (log.entityType === "candidate" && candidateIds.has(log.entityId)) ||
        (log.entityType === "interview_slot" && slotIds.has(log.entityId))
      );
    })
    .slice(0, 10);

  return {
    selectedJob: jobs[0] ?? null,
    totals: {
      jobs: jobs.length,
      candidates: candidates.length,
      activeJobs: jobs.filter((job: AnalyticsJob) => Number(job._count?.candidates ?? 0) > 0).length,
      hired
    },
    sourceBreakdown: Array.from(sourceMap.entries()).map(([name, value]) => ({ name, value })),
    funnel: [
      { name: "Applied", value: applied },
      { name: "Screened", value: screened },
      { name: "Qualified", value: qualified },
      { name: "Hired", value: hired }
    ],
    qualityBands,
    avgTimeToHireDays: calculateAverageTimeToHireDays(candidates),
    conversionRates: {
      appliedToScreened: applied ? Math.round((screened / applied) * 100) : 0,
      screenedToQualified: screened ? Math.round((qualified / screened) * 100) : 0,
      qualifiedToHired: qualified ? Math.round((hired / qualified) * 100) : 0
    },
    recentActivity
  };
}