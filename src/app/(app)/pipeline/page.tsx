import { KanbanBoard } from "@/components/ats/kanban-board";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";

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
  const jobs = (await db.job.findMany({
    where: { organizationId: session.organizationId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, status: true }
  })) as Array<{ id: string; title: string; status: string }>;

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
    <div className="stack-xl">
      <SectionHeading title="ATS pipeline" description="Each role has its own pipeline, so recruiters can move candidates through the funnel without mixing jobs together." />
      <Card className="filter-bar">
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
          <p className="muted">Create a job first to open its dedicated pipeline.</p>
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
