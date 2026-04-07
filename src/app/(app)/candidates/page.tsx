import Link from "next/link";

import { CandidateForm } from "@/components/candidates/candidate-form";
import { CandidateSummaryCard } from "@/components/candidates/candidate-summary-card";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SectionHeading } from "@/components/ui/section-heading";
import { WorkspaceHero } from "@/components/ui/workspace-hero";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { CandidateStage } from "@/lib/models";

type CandidateJob = { id: string; title: string };

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

  const [jobs, candidates] = (await Promise.all([
    db.job.findMany({
      where: { organizationId: session.organizationId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true }
    }),
    db.candidate.findMany({
      where: { organizationId: session.organizationId, deletedAt: null },
      orderBy: [{ rankingScore: "desc" }, { createdAt: "desc" }],
      take: 120,
      include: { job: true }
    })
  ])) as unknown as [Array<{ id: string; title: string }>, CandidateListItem[]];

  const filteredCandidates = candidates.filter((candidate) => {
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

  const sourceOptions = Array.from(new Set(candidates.map((candidate) => candidate.source))).sort();
  const scorecardReady = candidates.filter((candidate) => candidate.stage === CandidateStage.INTERVIEW_SCHEDULED || candidate.stage === CandidateStage.HIRED).length;

  return (
    <div className="stack-xl workspace-screen-shell">
      <WorkspaceHero
        scene="candidates"
        eyebrow="Talent intake"
        title="Parse stronger candidate profiles and keep interview references attached to the person, not just the calendar."
        description="Resume parsing now focuses on skills, education, and date-based experience, while the UI gives recruiters a cleaner place to review and update candidate records."
        stats={[
          { label: "Candidates", value: String(candidates.length) },
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
              {jobs.map((job) => (
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
          <SectionHeading title="Add candidate" description="Upload the CV first so the parser can prefill skills, education, and total experience." />
          <CandidateForm jobs={jobs} />
        </Card>
      </div>
    </div>
  );
}
