import { CandidateStage, OrganizationStatus, Role } from "@/lib/models";

import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { WorkspaceHero } from "@/components/ui/workspace-hero";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatScore } from "@/lib/utils";

type DashboardJob = {
  id: string;
  title: string;
  location: string | null;
  organizationId: string;
  assignedRecruiterId?: string | null;
  assignmentHistory?: Array<{ recruiterId: string }>;
  _count: { candidates: number };
};

type DashboardCandidate = {
  id: string;
  firstName: string;
  lastName: string;
  stage: CandidateStage;
  overallScore: number | null;
  organizationId: string;
  job: { id?: string; title: string };
};

type DashboardNotification = {
  id: string;
  title: string;
  message: string;
  createdAt: Date;
};

type OrganizationItem = {
  id: string;
  name: string;
  status: OrganizationStatus;
};

export default async function DashboardPage() {
  const session = await requireSession();

  if (session.role === Role.ADMIN) {
    const [organizations, jobs, candidates, notifications] = (await Promise.all([
      db.organization.findMany({ where: { deletedAt: null }, orderBy: { createdAt: "desc" } }),
      db.job.findMany({ where: { deletedAt: null }, include: { _count: { select: { candidates: true } } }, orderBy: { createdAt: "desc" }, take: 8 }),
      db.candidate.findMany({ where: { deletedAt: null }, include: { job: true }, orderBy: { createdAt: "desc" }, take: 8 }),
      db.notification.findMany({ orderBy: { createdAt: "desc" }, take: 6 })
    ])) as unknown as [OrganizationItem[], DashboardJob[], DashboardCandidate[], DashboardNotification[]];

    const pendingOrganizations = organizations.filter((organization) => organization.status === OrganizationStatus.PENDING_APPROVAL);
    const activeOrganizations = organizations.filter((organization) => organization.status === OrganizationStatus.ACTIVE);

    return (
      <div className="stack-xl workspace-screen-shell">
        <WorkspaceHero
          scene="dashboard"
          eyebrow="Platform command"
          title="Review organizations, approvals, and hiring activity from one admin surface."
          description="The admin workspace focuses on approval flow, organization health, and platform-wide hiring visibility."
          stats={[
            { label: "Organizations", value: String(activeOrganizations.length) },
            { label: "Pending approvals", value: String(pendingOrganizations.length) },
            { label: "Open jobs", value: String(jobs.length) }
          ]}
          showVisual
          compactVisual
        />

        <div className="two-column-grid dashboard-surface-grid">
          <Card>
            <SectionHeading title="Pending organizations" description="Approve or review new workspace requests before they enter the platform." />
            <div className="list-stack sleek-list-stack">
              {pendingOrganizations.length ? pendingOrganizations.map((organization) => (
                <div className="list-row dashboard-list-row" key={organization.id}>
                  <div>
                    <strong>{organization.name}</strong>
                    <p>Awaiting approval</p>
                  </div>
                  <small>{organization.status.replaceAll("_", " ")}</small>
                </div>
              )) : <p className="muted">No pending organizations right now.</p>}
            </div>
          </Card>
          <Card>
            <SectionHeading title="Recent candidates" description="Newest talent records created across the platform." />
            <div className="list-stack sleek-list-stack">
              {candidates.map((candidate) => (
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
        </div>

        <Card>
          <SectionHeading title="Platform notifications" description="Latest account, workflow, and automation events." />
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

  const [jobs, candidates, notifications] = (await Promise.all([
    db.job.findMany({
      where: { organizationId: session.organizationId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { _count: { select: { candidates: true } } }
    }),
    db.candidate.findMany({
      where: { organizationId: session.organizationId, deletedAt: null },
      orderBy: { rankingScore: "desc" },
      take: 8,
      include: { job: true }
    }),
    db.notification.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { createdAt: "desc" },
      take: 5
    })
  ])) as unknown as [DashboardJob[], DashboardCandidate[], DashboardNotification[]];

  const visibleJobs = session.role === Role.RECRUITER
    ? jobs.filter((job) => job.assignedRecruiterId === session.id || (job.assignmentHistory ?? []).some((entry) => entry.recruiterId === session.id))
    : jobs;
  const visibleJobIds = new Set(visibleJobs.map((job) => job.id));
  const visibleCandidates = session.role === Role.RECRUITER ? candidates.filter((candidate) => candidate.job.id ? visibleJobIds.has(candidate.job.id) : visibleJobs.some((job) => job.title === candidate.job.title)) : candidates;
  const interviewQueued = visibleCandidates.filter((candidate) => candidate.stage === CandidateStage.INTERVIEW_SCHEDULED).length;

  return (
    <div className="stack-xl workspace-screen-shell">
      <WorkspaceHero
        scene="dashboard"
        eyebrow={session.role === Role.RECRUITER ? "Recruiter workspace" : "Organization overview"}
        title={session.role === Role.RECRUITER ? "See your assigned jobs, priority candidates, and next hiring actions." : "Keep your team, jobs, and candidate flow organized from one workspace."}
        description={session.role === Role.RECRUITER ? "Your dashboard focuses on the roles you own now and the roles you previously worked on." : "The org view keeps hiring demand, recruiter ownership, and candidate momentum visible without crowding the screen."}
        stats={[
          { label: session.role === Role.RECRUITER ? "My jobs" : "Active jobs", value: String(visibleJobs.length) },
          { label: "Candidates", value: String(visibleCandidates.length) },
          { label: "Interviews queued", value: String(interviewQueued) }
        ]}
        showVisual
        compactVisual
      />

      <div className="two-column-grid dashboard-surface-grid">
        <Card>
          <SectionHeading title={session.role === Role.RECRUITER ? "My jobs" : "Role ownership"} description={session.role === Role.RECRUITER ? "Jobs currently assigned to you or previously worked by you." : "Roles your team is actively working on right now."} />
          <div className="list-stack sleek-list-stack">
            {visibleJobs.length ? visibleJobs.map((job) => (
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
            )) : <p className="muted">No jobs are visible in your workspace yet.</p>}
          </div>
        </Card>
        <Card>
          <SectionHeading title="Priority candidates" description="Profiles that deserve the next recruiter action." />
          <div className="list-stack sleek-list-stack">
            {visibleCandidates.length ? visibleCandidates.map((candidate) => (
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
            )) : <p className="muted">No candidates are visible yet.</p>}
          </div>
        </Card>
      </div>

      <Card>
        <SectionHeading title="Alert feed" description="Latest recruiter and workspace events, kept easy to scan." />
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

