import Link from "next/link";

import { CandidateForm } from "@/components/candidates/candidate-form";
import { CandidateSummaryCard } from "@/components/candidates/candidate-summary-card";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SectionHeading } from "@/components/ui/section-heading";
import { WorkspaceHero } from "@/components/ui/workspace-hero";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { CandidateStage, Role } from "@/lib/models";

type CandidateJob = { id: string; title: string; organizationId?: string };

type CandidateListItem = {
  id: string;
  firstName: string;
  lastName: string;
  stage: CandidateStage;
  overallScore: number | null;
  yearsExperience: number | null;
  country: string | null;
  address: string | null;
  source: string;
  phone: string | null;
  createdAt: Date;
  organizationId: string;
  job: CandidateJob;
};

type CandidatesPageProps = {
  searchParams?: Promise<{
    q?: string;
    stage?: string;
    jobId?: string;
    source?: string;
  }>;
};

export default async function CandidatesPage({ searchParams }: CandidatesPageProps) {
  const session = await requireSession();
  const params = (searchParams ? await searchParams : {}) ?? {};
  const query = (params.q ?? "").trim().toLowerCase();
  const selectedStage = params.stage ?? "";
  const selectedJobId = params.jobId ?? "";
  const selectedSource = params.source ?? "";

  const jobs = (await db.job.findMany({
    where: session.role === Role.ADMIN ? { deletedAt: null } : { organizationId: session.organizationId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, organizationId: true, assignedRecruiterId: true, assignmentHistory: true }
  })) as Array<{ id: string; title: string; organizationId: string; assignedRecruiterId?: string | null; assignmentHistory?: Array<{ recruiterId: string }> }>;

  const visibleJobs = session.role === Role.RECRUITER
    ? jobs.filter((job) => job.assignedRecruiterId === session.id || (job.assignmentHistory ?? []).some((entry) => entry.recruiterId === session.id))
    : jobs;
  const visibleJobIds = new Set(visibleJobs.map((job) => job.id));

  const candidates = (await db.candidate.findMany({
    where: session.role === Role.ADMIN
      ? { deletedAt: null }
      : { organizationId: session.organizationId, deletedAt: null },
    orderBy: [{ rankingScore: "desc" }, { createdAt: "desc" }],
    take: 120,
    include: { job: true }
  })) as unknown as CandidateListItem[];

  const scopedCandidates = session.role === Role.RECRUITER
    ? candidates.filter((candidate) => visibleJobIds.has(candidate.job.id))
    : candidates;

  const filteredCandidates = scopedCandidates.filter((candidate) => {
    const searchable = [
      candidate.firstName,
      candidate.lastName,
      candidate.source,
      candidate.country,
      candidate.address,
      candidate.job.title
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (query && !searchable.includes(query)) {
      return false;
    }

    if (selectedStage && candidate.stage !== selectedStage) {
      return false;
    }

    if (selectedJobId && candidate.job.id !== selectedJobId) {
      return false;
    }

    if (selectedSource && candidate.source !== selectedSource) {
      return false;
    }

    return true;
  });

  const sourceOptions = Array.from(new Set(scopedCandidates.map((candidate) => candidate.source))).sort();
  const scorecardReady = scopedCandidates.filter((candidate) => candidate.stage === CandidateStage.INTERVIEW_SCHEDULED || candidate.stage === CandidateStage.HIRED).length;

  return (
    <div className="stack-xl workspace-screen-shell">
      <WorkspaceHero
        scene="candidates"
        eyebrow="Candidate database"
        title={session.role === Role.RECRUITER ? "Work inside the candidate list for the jobs you own." : "Keep resumes, notes, scorecards, and pipeline updates inside one candidate system."}
        description={session.role === Role.RECRUITER ? "Your candidate workspace stays limited to assigned jobs so your daily recruiting flow is easier to manage." : "The candidate database is organized for faster review, cleaner interview follow-up, and simpler talent visibility across the organization."}
        stats={[
          { label: "Candidates", value: String(scopedCandidates.length) },
          { label: "Filtered view", value: String(filteredCandidates.length) },
          { label: "Interview-ready", value: String(scorecardReady) }
        ]}
      />

      <div className="page-grid-wide recruiter-workspace-grid workspace-split-layout">
        <div className="stack-xl">
          <SectionHeading title="Candidates" description="Search the candidate list, filter by role or stage, and open full profiles when needed." />

          <form className="filter-bar card filter-bar-rich" method="GET">
            <Input name="q" defaultValue={params.q ?? ""} placeholder="Search by candidate, role, source, or location" />
            <select name="jobId" className="input" defaultValue={selectedJobId}>
              <option value="">All roles</option>
              {visibleJobs.map((job) => (
                <option key={job.id} value={job.id}>{job.title}</option>
              ))}
            </select>
            <select name="stage" className="input" defaultValue={selectedStage}>
              <option value="">All stages</option>
              {Object.values(CandidateStage).map((stage) => (
                <option key={stage} value={stage}>{stage.replaceAll("_", " ")}</option>
              ))}
            </select>
            <select name="source" className="input" defaultValue={selectedSource}>
              <option value="">All sources</option>
              {sourceOptions.map((source) => (
                <option key={source} value={source}>{source}</option>
              ))}
            </select>
            <div className="filter-actions">
              <button type="submit" className="button button-primary">Apply filters</button>
              <Link href="/candidates" className="button button-ghost">Reset</Link>
            </div>
          </form>

          {filteredCandidates.length ? (
            <div className="talent-card-grid talent-card-grid-roomy">
              {filteredCandidates.map((candidate) => (
                <CandidateSummaryCard key={candidate.id} candidate={candidate} />
              ))}
            </div>
          ) : (
            <Card>
              <strong>No candidates match these filters.</strong>
              <p className="muted">Try clearing a filter or broadening the search phrase.</p>
            </Card>
          )}
        </div>
        <Card className="sticky-card workspace-side-card workspace-side-card-rich">
          <SectionHeading title="Add candidate" description="Recruiters can add candidates only to the jobs visible in their workspace." />
          <CandidateForm jobs={visibleJobs.map((job) => ({ id: job.id, title: job.title }))} />
        </Card>
      </div>
    </div>
  );
}
