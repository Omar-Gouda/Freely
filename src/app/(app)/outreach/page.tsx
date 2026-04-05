import { OutreachGenerator } from "@/components/outreach/outreach-generator";
import { CopyButton } from "@/components/ui/copy-button";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
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
    <div className="page-grid-wide">
      <div className="stack-xl">
        <SectionHeading title="WhatsApp outreach" description="Generate recruiter-ready messages and reuse saved drafts when needed." />
        <Card>
          <OutreachGenerator
            candidates={candidates.map((candidate) => ({
              id: candidate.id,
              name: `${candidate.firstName} ${candidate.lastName}`,
              phone: candidate.phone,
              jobTitle: candidate.job.title
            }))}
          />
        </Card>
        <Card>
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