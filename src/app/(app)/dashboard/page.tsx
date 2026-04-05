import { CandidateStage } from "@/lib/models";

import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatScore } from "@/lib/utils";

type DashboardJob = {
  id: string;
  title: string;
  location: string | null;
  _count: { candidates: number };
};

type DashboardCandidate = {
  id: string;
  firstName: string;
  lastName: string;
  stage: CandidateStage;
  overallScore: number | null;
  job: { title: string };
};

type DashboardNotification = {
  id: string;
  title: string;
  message: string;
  createdAt: Date;
};

export default async function DashboardPage() {
  const session = await requireSession();
  const [jobCount, candidateCount, recentJobs, priorityCandidates, allCandidateStages, notifications] = (await Promise.all([
    db.job.count({ where: { organizationId: session.organizationId, deletedAt: null } }),
    db.candidate.count({ where: { organizationId: session.organizationId, deletedAt: null } }),
    db.job.findMany({
      where: { organizationId: session.organizationId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 4,
      include: { _count: { select: { candidates: true } } }
    }),
    db.candidate.findMany({
      where: { organizationId: session.organizationId, deletedAt: null },
      orderBy: { rankingScore: "desc" },
      take: 6,
      include: { job: true }
    }),
    db.candidate.findMany({
      where: { organizationId: session.organizationId, deletedAt: null },
      select: { stage: true }
    }),
    db.notification.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { createdAt: "desc" },
      take: 5
    })
  ])) as unknown as [number, number, DashboardJob[], DashboardCandidate[], Array<{ stage: CandidateStage }>, DashboardNotification[]];

  const stageCounts = Object.values(CandidateStage).map((stage) => ({
    stage,
    count: allCandidateStages.filter((candidate) => candidate.stage === stage).length
  }));

  return (
    <div className="stack-xl">
      <div className="dashboard-hero card">
        <div className="dashboard-hero-copy">
          <p className="eyebrow eyebrow-soft">Overview</p>
          <SectionHeading title="Operations overview" description="Track live hiring demand, priority talent, and recent activity from one clean view." />
        </div>
        <div className="dashboard-highlight-grid">
          <div className="dashboard-highlight-tile">
            <small>Qualified now</small>
            <strong>{stageCounts.find((item) => item.stage === CandidateStage.QUALIFIED)?.count ?? 0}</strong>
          </div>
          <div className="dashboard-highlight-tile">
            <small>Recent alerts</small>
            <strong>{notifications.length}</strong>
          </div>
        </div>
      </div>

      <div className="stats-grid dashboard-stats-grid">
        <Card><strong>{jobCount}</strong><span>Active jobs</span></Card>
        <Card><strong>{candidateCount}</strong><span>Total candidates</span></Card>
        <Card><strong>{stageCounts.find((item) => item.stage === CandidateStage.INTERVIEW_SCHEDULED)?.count ?? 0}</strong><span>Interviews queued</span></Card>
        <Card><strong>{stageCounts.find((item) => item.stage === CandidateStage.HIRED)?.count ?? 0}</strong><span>Hired</span></Card>
      </div>

      <div className="two-column-grid dashboard-surface-grid">
        <Card>
          <SectionHeading title="Priority candidates" description="High-fit profiles that deserve the next recruiter action." />
          <div className="list-stack sleek-list-stack">
            {priorityCandidates.map((candidate) => (
              <div className="list-row dashboard-list-row" key={candidate.id}>
                <div>
                  <strong>{candidate.firstName} {candidate.lastName}</strong>
                  <p>{candidate.job.title}</p>
                </div>
                <div className="align-right">
                  <strong>{formatScore(candidate.overallScore)}</strong>
                  <small>{candidate.stage.replaceAll("_", " ")}</small>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <SectionHeading title="Job demand" description="Roles pulling the most candidate activity right now." />
          <div className="list-stack sleek-list-stack">
            {recentJobs.map((job) => (
              <div className="list-row dashboard-list-row" key={job.id}>
                <div>
                  <strong>{job.title}</strong>
                  <p>{job.location ?? "Location flexible"}</p>
                </div>
                <div className="align-right">
                  <strong>{job._count.candidates}</strong>
                  <small>candidates</small>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <SectionHeading title="Alert feed" description="Latest recruiter and automation events, kept easy to scan." />
        <div className="list-stack sleek-list-stack">
          {notifications.map((notification) => (
            <div className="list-row dashboard-list-row" key={notification.id}>
              <div>
                <strong>{notification.title}</strong>
                <p>{notification.message}</p>
              </div>
              <small>{new Date(notification.createdAt).toLocaleString()}</small>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}