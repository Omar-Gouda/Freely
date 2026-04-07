import { OutreachGenerator } from "@/components/outreach/outreach-generator";
import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { SectionHeading } from "@/components/ui/section-heading";
import { WorkspaceHero } from "@/components/ui/workspace-hero";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Role } from "@/lib/models";

type OutreachCandidate = { id: string; firstName: string; lastName: string; phone: string | null; job: { id: string; title: string } };
type OutreachTemplate = { id: string; kind: string; content: string; candidate: { firstName: string; lastName: string; phone: string | null } | null };

export default async function OutreachPage() {
  const session = await requireSession();
  const jobs = (await db.job.findMany({
    where: { organizationId: session.organizationId, deletedAt: null },
    select: { id: true, assignedRecruiterId: true, assignmentHistory: true }
  })) as Array<{ id: string; assignedRecruiterId?: string | null; assignmentHistory?: Array<{ recruiterId: string }> }>;
  const visibleJobIds = new Set(
    session.role === Role.RECRUITER
      ? jobs.filter((job) => job.assignedRecruiterId === session.id || (job.assignmentHistory ?? []).some((entry) => entry.recruiterId === session.id)).map((job) => job.id)
      : jobs.map((job) => job.id)
  );

  const [candidates, templates] = (await Promise.all([
    db.candidate.findMany({
      where: { organizationId: session.organizationId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { job: true }
    }),
    db.outreachTemplate.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { createdAt: "desc" },
      take: 12,
      include: { candidate: true }
    })
  ])) as unknown as [OutreachCandidate[], OutreachTemplate[]];

  const scopedCandidates = session.role === Role.RECRUITER ? candidates.filter((candidate) => visibleJobIds.has(candidate.job.id)) : candidates;

  return (
    <div className="stack-xl workspace-screen-shell">
      <WorkspaceHero
        scene="outreach"
        eyebrow="Recruiter messaging"
        title="Generate outreach that stays connected to the candidate and the role." 
        description="Saved templates and candidate context stay together so recruiters can move faster without rewriting the same message chain." 
        stats={[
          { label: "Candidates in reach", value: String(scopedCandidates.length) },
          { label: "Saved templates", value: String(templates.length) },
          { label: "Primary channel", value: "WhatsApp" }
        ]}
      />

      <div className="page-grid-wide workspace-split-layout">
        <div className="stack-xl">
          <Card>
            <SectionHeading title="WhatsApp outreach" description="Generate recruiter-ready messages and reuse saved drafts when needed." />
            <OutreachGenerator
              candidates={scopedCandidates.map((candidate) => ({
                id: candidate.id,
                name: `${candidate.firstName} ${candidate.lastName}`,
                phone: candidate.phone,
                jobTitle: candidate.job.title
              }))}
            />
          </Card>
        </div>
        <Card className="workspace-side-card workspace-side-card-rich">
          <SectionHeading title="Saved templates" description="Recent message drafts that recruiters can reuse fast." />
          <div className="list-stack">
            {templates.map((template) => (
              <div key={template.id} className="message-box">
                <div className="list-row">
                  <small>{template.kind}</small>
                  <CopyButton value={template.content} />
                </div>
                {template.candidate ? <p className="muted">{template.candidate.firstName} {template.candidate.lastName}</p> : null}
                <p>{template.content}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
