import Link from "next/link";
import { CandidateStage } from "@/lib/models";

import { CandidateForm } from "@/components/candidates/candidate-form";
import { CandidateSummaryCard } from "@/components/candidates/candidate-summary-card";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SectionHeading } from "@/components/ui/section-heading";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";

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

  return (
    <div className="page-grid-wide recruiter-workspace-grid">
      <div className="stack-xl">
        <SectionHeading title="Candidates" description="Search the candidate list, filter by role or stage, and open full profiles when needed." />

        <form className="filter-bar card" method="GET">
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
          <div className="talent-card-grid">
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
      <Card className="sticky-card workspace-side-card">
        <SectionHeading title="Add candidate" />
        <CandidateForm jobs={jobs} />
      </Card>
    </div>
  );
}