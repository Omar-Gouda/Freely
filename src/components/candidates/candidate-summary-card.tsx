import Link from "next/link";
import { MapPin, Phone, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatScore } from "@/lib/utils";

type CandidateSummaryCardProps = {
  candidate: {
    id: string;
    firstName: string;
    lastName: string;
    stage: string;
    overallScore: number | null;
    yearsExperience: number | null;
    country: string | null;
    address: string | null;
    source: string;
    phone: string | null;
    createdAt: Date;
    job: { title: string };
  };
};

export function CandidateSummaryCard({ candidate }: CandidateSummaryCardProps) {
  const location = candidate.address || candidate.country || "Location pending";
  const experience = typeof candidate.yearsExperience === "number" ? `${candidate.yearsExperience} years experience` : "Experience pending";

  return (
    <Card className="talent-card candidate-summary-card">
      <div className="talent-card-header">
        <div>
          <p className="eyebrow eyebrow-soft">{candidate.job.title}</p>
          <h3>{candidate.firstName} {candidate.lastName}</h3>
        </div>
        <Badge>{candidate.stage.replaceAll("_", " ")}</Badge>
      </div>

      <div className="talent-card-meta talent-card-meta-plain">
        <span><MapPin size={14} /> {location}</span>
        <span><Sparkles size={14} /> {experience}</span>
      </div>

      <div className="talent-card-stats">
        <div>
          <small>Source</small>
          <strong>{candidate.source}</strong>
        </div>
        <div>
          <small>Match score</small>
          <strong>{formatScore(candidate.overallScore)}</strong>
        </div>
        <div>
          <small>Applied</small>
          <strong>{new Date(candidate.createdAt).toLocaleDateString()}</strong>
        </div>
      </div>

      <div className="talent-card-actions">
        {candidate.phone ? <a href={`tel:${candidate.phone}`} className="button button-ghost button-inline"><Phone size={15} /> Call</a> : <span className="muted">Phone pending</span>}
        <Link href={`/candidates/${candidate.id}`} className="button button-primary">Open profile</Link>
      </div>
    </Card>
  );
}
