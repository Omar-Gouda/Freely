import { KanbanBoard } from "@/components/ats/kanban-board";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Role } from "@/lib/models";

type PipelineCandidate = {
  id: string;
  firstName: string;
  lastName: string;
  stage: string;
  source: string;
  overallScore: number | null;
  suggestedStage: string | null;
};

type PipelinePageProps = {
  searchParams?: Promise<{ jobId?: string }>;
};

export default async function PipelinePage({ searchParams }: PipelinePageProps) {
  const session = await requireSession();
  const params = (searchParams ? await searchParams : {}) ?? {};
  const allJobs = (await db.job.findMany({
    where: { organizationId: session.organizationId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, status: true, assignedRecruiterId: true, assignmentHistory: true }
  })) as Array<{ id: string; title: string; status: string; assignedRecruiterId?: string | null; assignmentHistory?: Array<{ recruiterId: string }> }>;

  const jobs = session.role === Role.RECRUITER
    ? allJobs.filter((job) => job.assignedRecruiterId === session.id || (job.assignmentHistory ?? []).some((entry) => entry.recruiterId === session.id))
    : allJobs;

  const selectedJobId = params.jobId ?? jobs[0]?.id ?? "";
  const selectedJob = jobs.find((job) => job.id === selectedJobId) ?? null;

  const candidates = selectedJobId
    ? ((await db.candidate.findMany({
        where: { organizationId: session.organizationId, deletedAt: null, jobId: selectedJobId },
        orderBy: { rankingScore: "desc" },
        take: 120,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          stage: true,
          source: true,
          overallScore: true,
          suggestedStage: true
        }
      })) as unknown as PipelineCandidate[])
    : [];

  return (
    <div className="stack-xl workspace-screen-shell">
      <SectionHeading title="Pipeline" description="Move candidates through each role pipeline without mixing recruiter ownership or candidate context." />
      <Card className="filter-bar filter-bar-rich">
        <form method="GET" className="filter-bar-inline">
          <select name="jobId" className="input" defaultValue={selectedJobId}>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>{job.title}</option>
            ))}
          </select>
          <div className="filter-actions">
            <button type="submit" className="button button-primary">Open role pipeline</button>
          </div>
        </form>
        {selectedJob ? (
          <div className="filter-summary">
            <strong>{selectedJob.title}</strong>
            <span>{candidates.length} candidate{candidates.length === 1 ? "" : "s"} in this role pipeline</span>
          </div>
        ) : (
          <p className="muted">No role is visible yet. Ask your org head to assign a job to your workspace.</p>
        )}
      </Card>
      <Card>
        {selectedJob ? (
          <KanbanBoard
            initialCandidates={candidates.map((candidate) => ({
              id: candidate.id,
              name: `${candidate.firstName} ${candidate.lastName}`,
              stage: candidate.stage,
              source: candidate.source,
              overallScore: candidate.overallScore,
              suggestedStage: candidate.suggestedStage
            }))}
          />
        ) : (
          <p className="muted">No role selected yet.</p>
        )}
      </Card>
    </div>
  );
}
