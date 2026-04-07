import Link from "next/link";
import { JobStatus, Role } from "@/lib/models";

import { JobForm } from "@/components/jobs/job-form";
import { JobSummaryCard } from "@/components/jobs/job-summary-card";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SectionHeading } from "@/components/ui/section-heading";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";

type JobListItem = {
  id: string;
  title: string;
  location: string | null;
  headcount: number;
  status: string;
  sourceCampaign: string | null;
  generatedAds: Array<{ id: string; channel: string; content: string }>;
  _count: { candidates: number };
};

type JobsPageProps = {
  searchParams?: Promise<{
    q?: string;
    status?: string;
    location?: string;
  }>;
};

export default async function JobsPage({ searchParams }: JobsPageProps) {
  const session = await requireSession();
  const params = (searchParams ? await searchParams : {}) ?? {};
  const query = (params.q ?? "").trim().toLowerCase();
  const selectedStatus = params.status ?? "";
  const selectedLocation = params.location ?? "";

  const jobs = (await db.job.findMany({
    where: { organizationId: session.organizationId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      generatedAds: true,
      _count: { select: { candidates: true } }
    }
  })) as unknown as JobListItem[];

  const filteredJobs = jobs.filter((job) => {
    const searchable = [job.title, job.location, job.sourceCampaign, ...job.generatedAds.map((ad) => ad.channel)]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (query && !searchable.includes(query)) {
      return false;
    }

    if (selectedStatus && job.status !== selectedStatus) {
      return false;
    }

    if (selectedLocation && (job.location ?? "") !== selectedLocation) {
      return false;
    }

    return true;
  });

  const locationOptions = Array.from(new Set(jobs.map((job) => job.location).filter((value): value is string => Boolean(value)))).sort();

  return (
    <div className="page-grid-wide recruiter-workspace-grid">
      <div className="stack-xl">
        <SectionHeading title="Jobs" description="Review open roles, filter quickly, and open the full role detail when needed." />

        <form className="filter-bar card" method="GET">
          <Input name="q" defaultValue={params.q ?? ""} placeholder="Search by role, campaign, location, or platform" />
          <select name="status" className="input" defaultValue={selectedStatus}>
            <option value="">All statuses</option>
            {Object.values(JobStatus).map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <select name="location" className="input" defaultValue={selectedLocation}>
            <option value="">All locations</option>
            {locationOptions.map((location) => (
              <option key={location} value={location}>{location}</option>
            ))}
          </select>
          <div className="filter-actions">
            <button type="submit" className="button button-primary">Apply filters</button>
            <Link href="/jobs" className="button button-ghost">Reset</Link>
          </div>
        </form>

        {filteredJobs.length ? (
          <div className="talent-card-grid">
            {filteredJobs.map((job) => (
              <JobSummaryCard key={job.id} job={job} />
            ))}
          </div>
        ) : (
          <Card>
            <strong>No jobs match these filters.</strong>
            <p className="muted">Try clearing a filter or broadening the search phrase.</p>
          </Card>
        )}
      </div>
      <Card className="sticky-card workspace-side-card">
        <SectionHeading title="Create job" />
        <JobForm canManageStatus={session.role === Role.ADMIN || session.role === Role.ORG_HEAD} />
      </Card>
    </div>
  );
}
