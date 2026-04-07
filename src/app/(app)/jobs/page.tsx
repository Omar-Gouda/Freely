import Link from "next/link";

import { JobForm } from "@/components/jobs/job-form";
import { JobSummaryCard } from "@/components/jobs/job-summary-card";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SectionHeading } from "@/components/ui/section-heading";
import { WorkspaceHero } from "@/components/ui/workspace-hero";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { JobStatus, Role } from "@/lib/models";

type JobListItem = {
  id: string;
  title: string;
  location: string | null;
  headcount: number;
  status: string;
  sourceCampaign: string | null;
  organizationId: string;
  assignedRecruiterId?: string | null;
  assignmentHistory?: Array<{ recruiterId: string }>;
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

  const organizations = (await db.organization.findMany({ where: { deletedAt: null } })) as Array<{ id: string; name: string }>;
  const organizationDirectory = new Map(organizations.map((organization) => [organization.id, organization.name]));

  const jobs = (await db.job.findMany({
    where: session.role === Role.ADMIN ? { deletedAt: null } : { organizationId: session.organizationId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      generatedAds: true,
      _count: { select: { candidates: true } }
    }
  })) as unknown as JobListItem[];

  const scopedJobs = session.role === Role.RECRUITER
    ? jobs.filter((job) => job.assignedRecruiterId === session.id || (job.assignmentHistory ?? []).some((entry) => entry.recruiterId === session.id))
    : jobs;

  const filteredJobs = scopedJobs.filter((job) => {
    const searchable = [job.title, job.location, job.sourceCampaign, organizationDirectory.get(job.organizationId), ...job.generatedAds.map((ad) => ad.channel)]
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

  const locationOptions = Array.from(new Set(scopedJobs.map((job) => job.location).filter((value): value is string => Boolean(value)))).sort();
  const openJobs = scopedJobs.filter((job) => job.status === JobStatus.OPEN).length;
  const totalApplicants = scopedJobs.reduce((sum, job) => sum + job._count.candidates, 0);
  const showCreateForm = session.role === Role.ADMIN || session.role === Role.ORG_HEAD;

  return (
    <div className="stack-xl workspace-screen-shell">
      <WorkspaceHero
        scene="jobs"
        eyebrow={session.role === Role.RECRUITER ? "Assigned roles" : "Job management"}
        title={session.role === Role.RECRUITER ? "Focus on the jobs you own and the roles you have already worked on." : "Create jobs, assign recruiters, and keep role ownership clear."}
        description={session.role === Role.RECRUITER ? "Recruiters only see relevant roles so they can move faster without scanning the whole organization." : "Use the jobs workspace to structure role briefs, assign recruiters, and keep candidate demand visible per job."}
        stats={[
          { label: "Visible jobs", value: String(filteredJobs.length) },
          { label: "Open roles", value: String(openJobs) },
          { label: "Applicants tracked", value: String(totalApplicants) }
        ]}
      />

      <div className={`page-grid-wide recruiter-workspace-grid workspace-split-layout${showCreateForm ? "" : " workspace-split-layout-single"}`.trim()}>
        <div className="stack-xl">
          <SectionHeading title="Jobs" description={session.role === Role.RECRUITER ? "These are the jobs currently assigned to you or already worked by you." : "Review open roles, recruiter ownership, and role demand in one list."} />

          <form className="filter-bar card filter-bar-rich" method="GET">
            <Input name="q" defaultValue={params.q ?? ""} placeholder="Search by role, campaign, recruiter ownership, or location" />
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
            <div className="talent-card-grid talent-card-grid-roomy">
              {filteredJobs.map((job) => (
                <JobSummaryCard key={job.id} job={{ ...job, organizationName: organizationDirectory.get(job.organizationId) ?? null }} />
              ))}
            </div>
          ) : (
            <Card>
              <strong>No jobs match these filters.</strong>
              <p className="muted">Try clearing a filter or broadening the search phrase.</p>
            </Card>
          )}
        </div>
        {showCreateForm ? (
          <Card className="sticky-card workspace-side-card workspace-side-card-rich">
            <SectionHeading title="Create job" description="Structure the role brief once, then assign ownership cleanly." />
            <JobForm canManageStatus={session.role === Role.ADMIN || session.role === Role.ORG_HEAD} />
          </Card>
        ) : null}
      </div>
    </div>
  );
}
