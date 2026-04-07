import Link from "next/link";
import { BriefcaseBusiness, MapPin, UserRoundCog, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type JobSummaryCardProps = {
  job: {
    id: string;
    title: string;
    location: string | null;
    headcount: number;
    status: string;
    sourceCampaign: string | null;
    organizationName?: string | null;
    assignedRecruiterId?: string | null;
    generatedAds: Array<{ id: string; channel: string; content: string }>;
    _count: { candidates: number };
  };
};

export function JobSummaryCard({ job }: JobSummaryCardProps) {
  const channelPreview = job.generatedAds.slice(0, 3).map((ad) => ad.channel).join(" | ") || "Pending";

  return (
    <Card className="talent-card role-summary-card">
      <div className="talent-card-header">
        <div>
          <p className="eyebrow eyebrow-soft">{job.organizationName || job.sourceCampaign || "Active role"}</p>
          <h3>{job.title}</h3>
        </div>
        <Badge>{job.status}</Badge>
      </div>

      <div className="talent-card-meta talent-card-meta-plain">
        <span><MapPin size={14} /> {job.location || "Location pending"}</span>
        <span><Users size={14} /> {job.headcount} hires planned</span>
        <span><UserRoundCog size={14} /> {job.assignedRecruiterId ? "Recruiter assigned" : "Unassigned"}</span>
      </div>

      <div className="talent-card-stats">
        <div>
          <small>Applicants</small>
          <strong>{job._count.candidates}</strong>
        </div>
        <div>
          <small>Post variants</small>
          <strong>{job.generatedAds.length}</strong>
        </div>
        <div>
          <small>Channels</small>
          <strong>{channelPreview}</strong>
        </div>
      </div>

      <div className="talent-card-actions talent-card-actions-split">
        <span className="muted inline-meta"><BriefcaseBusiness size={14} /> Ownership, applicants, and post variants stay inside the role page.</span>
        <Link href={`/jobs/${job.id}`} className="button button-primary">Open role</Link>
      </div>
    </Card>
  );
}
