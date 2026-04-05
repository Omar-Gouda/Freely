import Link from "next/link";
import { notFound } from "next/navigation";

import { CandidateRecordCard } from "@/components/candidates/candidate-record-card";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatScore } from "@/lib/utils";

type CandidateDetail = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  source: string;
  stage: "APPLIED" | "SCREENED" | "QUALIFIED" | "INTERVIEW_SCHEDULED" | "REJECTED" | "HIRED";
  notes: string | null;
  cvScore: number | null;
  englishScore: number | null;
  overallScore: number | null;
  rankingScore: number;
  skills: string[];
  country: string | null;
  address: string | null;
  linkedInUrl: string | null;
  yearsExperience: number | null;
  experienceSummary: string | null;
  educationSummary: string | null;
  resumeText: string | null;
  voiceEvaluation: { level?: string } | null;
  files: Array<{ id: string; kind: "CV" | "VOICE_NOTE" | "AVATAR"; fileName: string; mimeType: string; storageKey: string }>;
  stageEvents: Array<{ id: string; toStage: string; reason?: string | null; createdAt: Date }>;
  job: { title: string; location?: string | null };
};

export default async function CandidateProfilePage({ params }: { params: Promise<{ candidateId: string }> }) {
  const session = await requireSession();
  const { candidateId } = await params;

  const candidate = (await db.candidate.findFirst({
    where: { id: candidateId, organizationId: session.organizationId, deletedAt: null },
    include: { job: true, files: true }
  })) as CandidateDetail | null;

  if (!candidate) {
    notFound();
  }

  const timeline = [...(candidate.stageEvents ?? [])].sort((left, right) => +new Date(right.createdAt) - +new Date(left.createdAt));
  const mapQuery = candidate.address || candidate.country || candidate.job.location || "";

  return (
    <div className="profile-detail-shell stack-xl">
      <div className="detail-hero card">
        <div className="stack-md">
          <Link href="/candidates" className="back-link">Back to candidates</Link>
          <div className="list-row list-row-start detail-hero-header">
            <div>
              <p className="eyebrow eyebrow-soft">Candidate profile</p>
              <h2 className="detail-title">{candidate.firstName} {candidate.lastName}</h2>
              <p className="detail-subtitle">{candidate.job.title} · {candidate.address || candidate.country || "Location pending"}</p>
            </div>
            <Badge>{candidate.stage.replaceAll("_", " ")}</Badge>
          </div>
        </div>
        <div className="summary-hero-stats detail-score-strip">
          <div><small>Overall</small><strong>{formatScore(candidate.overallScore)}</strong></div>
          <div><small>CV</small><strong>{formatScore(candidate.cvScore)}</strong></div>
          <div><small>English</small><strong>{formatScore(candidate.englishScore)}</strong></div>
          <div><small>Rank</small><strong>{candidate.rankingScore}</strong></div>
        </div>
      </div>

      <div className="detail-layout-grid">
        <div className="stack-xl">
          <CandidateRecordCard candidate={candidate} />
        </div>

        <aside className="stack-lg">
          <Card>
            <SectionHeading title="Contact" description="Quick recruiter actions for desktop and mobile." />
            <div className="stack-md">
              <a href={`mailto:${candidate.email}`} className="button button-ghost">Email candidate</a>
              {candidate.phone ? <a href={`tel:${candidate.phone}`} className="button button-primary">Call candidate</a> : <p className="muted">Phone number not available yet.</p>}
              {candidate.linkedInUrl ? <a href={candidate.linkedInUrl} target="_blank" rel="noreferrer" className="button button-ghost">Open LinkedIn</a> : null}
            </div>
          </Card>

          <Card>
            <SectionHeading title="Profile snapshot" description="The essentials recruiters usually need at a glance." />
            <div className="detail-fact-list">
              <div><small>Experience</small><strong>{candidate.yearsExperience ?? 0} years</strong></div>
              <div><small>Source</small><strong>{candidate.source}</strong></div>
              <div><small>Skills</small><strong>{candidate.skills.join(", ") || "No skills tagged yet"}</strong></div>
            </div>
            {candidate.experienceSummary ? <p className="prose-text">{candidate.experienceSummary}</p> : null}
            {candidate.educationSummary ? <p className="prose-text">{candidate.educationSummary}</p> : null}
          </Card>

          <Card>
            <SectionHeading title="Stage updates" description="Timeline of recruiter and automation status changes." />
            <div className="timeline-list">
              {timeline.length ? timeline.map((event) => (
                <div key={event.id} className="timeline-item">
                  <strong>{event.toStage.replaceAll("_", " ")}</strong>
                  <p>{event.reason || "Stage updated"}</p>
                  <small>{new Date(event.createdAt).toLocaleString()}</small>
                </div>
              )) : <p className="muted">No stage updates recorded yet.</p>}
            </div>
          </Card>

          <Card>
            <SectionHeading title="Location" description="Open the map or review the embedded location view." />
            {mapQuery ? (
              <div className="stack-md">
                <a href={`https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}`} target="_blank" rel="noreferrer" className="button button-ghost">Open in Maps</a>
                <iframe
                  title="Candidate location map"
                  className="map-frame"
                  src={`https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`}
                  loading="lazy"
                />
              </div>
            ) : (
              <p className="muted">Add an address or country to show the map here.</p>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}
