import { OutreachGenerator } from "@/components/outreach/outreach-generator";
import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { SectionHeading } from "@/components/ui/section-heading";
import { WorkspaceHero } from "@/components/ui/workspace-hero";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";

type OutreachCandidate = { id: string; firstName: string; lastName: string; phone: string | null; job: { title: string } };
type OutreachTemplate = { id: string; kind: string; content: string; candidate: { firstName: string; lastName: string; phone: string | null } | null };

export default async function OutreachPage() {
  const session = await requireSession();
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

  return (
    <div className="stack-xl workspace-screen-shell">
      <WorkspaceHero
        scene="outreach"
        eyebrow="Recruiter messaging"
        title="Generate faster outreach without losing the candidate and role context behind each message."
        description="The refreshed outreach space keeps templates, message generation, and recruiter actions visually simpler so teams can move faster with less clutter."
        stats={[
          { label: "Candidates in reach", value: String(candidates.length) },
          { label: "Saved templates", value: String(templates.length) },
          { label: "Active page", value: "WhatsApp" }
        ]}
      />

      <div className="page-grid-wide workspace-split-layout">
        <div className="stack-xl">
          <Card>
            <SectionHeading title="WhatsApp outreach" description="Generate recruiter-ready messages and reuse saved drafts when needed." />
            <OutreachGenerator
              candidates={candidates.map((candidate) => ({
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
