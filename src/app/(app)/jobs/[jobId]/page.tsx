import Link from "next/link";
import { notFound } from "next/navigation";

import { JobPostGenerator } from "@/components/jobs/job-post-generator";
import { JobStatusManager } from "@/components/jobs/job-status-manager";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { WorkspaceHero } from "@/components/ui/workspace-hero";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Role } from "@/lib/models";

type JobCandidate = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  source: string;
  stage: string;
  createdAt: Date;
};

type JobDetail = {
  id: string;
  title: string;
  location: string | null;
  headcount: number;
  status: string;
  sourceCampaign: string | null;
  rawDescription: string;
  mustHaveRequirements?: string[];
  niceToHaveRequirements?: string[];
  structuredData?: {
    summary?: string;
    sector?: string;
    department?: string;
    employmentType?: string;
    seniority?: string;
    workMode?: string;
    salary?: string;
    languageRequirement?: string;
    experienceRequirement?: string;
    skills?: string[];
    responsibilities?: string[];
    qualifications?: string[];
    benefits?: string[];
    languages?: string[];
    mustHaveRequirements?: string[];
    niceToHaveRequirements?: string[];
  } | null;
  generatedAds: Array<{ id: string; channel: string; content: string }>;
  candidates: JobCandidate[];
};

type RecruiterDirectory = Record<string, { fullName: string; email: string }>;

export default async function JobDetailPage({ params }: { params: Promise<{ jobId: string }> }) {
  const session = await requireSession();
  const { jobId } = await params;

  const job = (await db.job.findFirst({
    where: { id: jobId, organizationId: session.organizationId, deletedAt: null },
    include: { generatedAds: true, candidates: true }
  })) as JobDetail | null;

  if (!job) {
    notFound();
  }

  const candidateIds = job.candidates.map((candidate) => candidate.id);
  const auditLogs = candidateIds.length
    ? (await db.auditLog.findMany({
        where: {
          organizationId: session.organizationId,
          entityType: "candidate",
          action: "candidate.created",
          entityId: { in: candidateIds }
        },
        orderBy: { createdAt: "desc" }
      })) as Array<{ entityId: string; userId?: string | null; createdAt: Date }>
    : [];
  const recruiterIds = Array.from(new Set(auditLogs.map((log) => log.userId).filter((value): value is string => Boolean(value))));
  const recruiters = recruiterIds.length
    ? (await db.user.findMany({
        where: { id: { in: recruiterIds }, deletedAt: null },
        select: { id: true, fullName: true, email: true }
      })) as Array<{ id: string; fullName: string; email: string }>
    : [];

  const recruiterDirectory = recruiters.reduce<RecruiterDirectory>((accumulator, user) => {
    accumulator[user.id] = { fullName: user.fullName, email: user.email };
    return accumulator;
  }, {});
  const recruiterByCandidate = auditLogs.reduce<Record<string, { fullName: string; email: string } | null>>((accumulator, log) => {
    if (!(log.entityId in accumulator)) {
      accumulator[log.entityId] = log.userId ? recruiterDirectory[log.userId] ?? null : null;
    }
    return accumulator;
  }, {});

  const structured = job.structuredData ?? {};
  const mustHaveRequirements = job.mustHaveRequirements?.length ? job.mustHaveRequirements : (structured.mustHaveRequirements ?? structured.qualifications ?? []);
  const niceToHaveRequirements = job.niceToHaveRequirements?.length ? job.niceToHaveRequirements : (structured.niceToHaveRequirements ?? structured.responsibilities ?? []);

  return (
    <div className="profile-detail-shell stack-xl workspace-screen-shell">
      <WorkspaceHero
        scene="jobs"
        eyebrow="Role profile"
        title={job.title}
        description={`Keep the brief, requirements, posting variants, and applicant activity for ${job.title} in one clean role view.`}
        stats={[
          { label: "Applicants", value: String(job.candidates.length) },
          { label: "Post variants", value: String(job.generatedAds.length) },
          { label: "Headcount", value: String(job.headcount) }
        ]}
      />

      <div className="detail-hero card">
        <div className="stack-md">
          <Link href="/jobs" className="back-link">Back to jobs</Link>
          <div className="list-row list-row-start detail-hero-header">
            <div>
              <p className="eyebrow eyebrow-soft">Role profile</p>
              <h2 className="detail-title">{job.title}</h2>
              <p className="detail-subtitle">{job.location || "Location pending"} | {job.headcount} hires | {job.sourceCampaign || "General campaign"}</p>
            </div>
            <Badge>{job.status}</Badge>
          </div>
        </div>
        <div className="summary-hero-stats detail-score-strip">
          <div><small>Applicants</small><strong>{job.candidates.length}</strong></div>
          <div><small>Posts</small><strong>{job.generatedAds.length}</strong></div>
          <div><small>Mode</small><strong>{structured.workMode || "TBD"}</strong></div>
          <div><small>Seniority</small><strong>{structured.seniority || "TBD"}</strong></div>
        </div>
      </div>

      <div className="detail-layout-grid detail-layout-grid-rich">
        <div className="stack-xl">
          <Card>
            <SectionHeading title="Role summary" description="Structured hiring details captured from the recruiter brief." />
            <p className="prose-text">{structured.summary || job.rawDescription}</p>
            <div className="detail-pill-row">
              {(structured.skills ?? []).slice(0, 8).map((skill) => (
                <span key={skill} className="detail-pill">{skill}</span>
              ))}
            </div>
            <div className="two-column-detail-grid">
              <div>
                <h3 className="detail-section-title">Must-have requirements</h3>
                <ul className="detail-list">
                  {mustHaveRequirements.length ? mustHaveRequirements.map((item) => <li key={item}>{item}</li>) : <li>No must-have requirements added yet.</li>}
                </ul>
              </div>
              <div>
                <h3 className="detail-section-title">Nice-to-have requirements</h3>
                <ul className="detail-list">
                  {niceToHaveRequirements.length ? niceToHaveRequirements.map((item) => <li key={item}>{item}</li>) : <li>No nice-to-have requirements added yet.</li>}
                </ul>
              </div>
            </div>
          </Card>

          <Card>
            <JobPostGenerator jobId={job.id} initialAds={job.generatedAds} />
          </Card>
        </div>

        <aside className="stack-lg">
          {session.role === Role.ADMIN || session.role === Role.ORG_HEAD ? (
            <Card>
              <SectionHeading title="Job controls" description="Admins and org heads can control the role status without editing the brief." />
              <JobStatusManager jobId={job.id} currentStatus={job.status} />
            </Card>
          ) : null}

          <Card>
            <SectionHeading title="Role snapshot" description="Key structured fields recruiters check first." />
            <div className="detail-definition-grid">
              <div><small>Sector</small><strong>{structured.sector || "Not set"}</strong></div>
              <div><small>Department</small><strong>{structured.department || "Not set"}</strong></div>
              <div><small>Employment</small><strong>{structured.employmentType || "Not set"}</strong></div>
              <div><small>Work mode</small><strong>{structured.workMode || "Not set"}</strong></div>
              <div><small>Seniority</small><strong>{structured.seniority || "Not set"}</strong></div>
              <div><small>Language</small><strong>{structured.languageRequirement || (structured.languages ?? []).join(", ") || "Not set"}</strong></div>
              <div><small>Experience</small><strong>{structured.experienceRequirement || "Not set"}</strong></div>
              <div><small>Package</small><strong>{structured.salary || "Not set"}</strong></div>
            </div>
          </Card>

          <Card>
            <SectionHeading title="Applicants on this role" description="Track pipeline status, recruiter attribution, and application dates in one place." />
            <div className="applicant-list">
              {job.candidates.length ? job.candidates.map((candidate) => {
                const recruiter = recruiterByCandidate[candidate.id];

                return (
                  <Link key={candidate.id} href={`/candidates/${candidate.id}`} className="applicant-row">
                    <div>
                      <strong>{candidate.firstName} {candidate.lastName}</strong>
                      <p>{candidate.email}</p>
                    </div>
                    <div className="applicant-meta">
                      <Badge>{candidate.stage.replaceAll("_", " ")}</Badge>
                      <small>{candidate.source}</small>
                      <small>{recruiter?.fullName ?? "Recruiter not recorded"}</small>
                      <small>{new Date(candidate.createdAt).toLocaleDateString()}</small>
                    </div>
                  </Link>
                );
              }) : <p className="muted">No applicants have been attached to this role yet.</p>}
            </div>
          </Card>

          <Card>
            <SectionHeading title="Original brief" description="The raw description stays visible for recruiter review." />
            <p className="prose-text">{job.rawDescription}</p>
          </Card>
        </aside>
      </div>
    </div>
  );
}
