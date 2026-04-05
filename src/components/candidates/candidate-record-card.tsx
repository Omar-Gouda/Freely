"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { CandidateFileUpload } from "@/components/candidates/candidate-form";
import { useToast } from "@/components/feedback/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { pipelineStages } from "@/lib/constants";
import { formatScore } from "@/lib/utils";

type CandidateStageValue =
  | "APPLIED"
  | "SCREENED"
  | "QUALIFIED"
  | "INTERVIEW_SCHEDULED"
  | "REJECTED"
  | "HIRED";

type FileKindValue = "CV" | "VOICE_NOTE" | "AVATAR";

type CandidateFileRecord = {
  id: string;
  kind: FileKindValue;
  fileName: string;
  mimeType: string;
  storageKey: string;
};

type CandidateRecord = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  source: string;
  stage: CandidateStageValue;
  notes: string | null;
  cvScore: number | null;
  englishScore: number | null;
  overallScore: number | null;
  rankingScore: number;
  skills: string[];
  voiceEvaluation: { level?: string } | null;
  files: CandidateFileRecord[];
  job: { title: string };
};

function getEnglishLevel(candidate: CandidateRecord) {
  if (candidate.voiceEvaluation?.level) return candidate.voiceEvaluation.level;
  if ((candidate.englishScore ?? 0) >= 8.5) return "Advanced";
  if ((candidate.englishScore ?? 0) >= 7) return "Intermediate";
  if ((candidate.englishScore ?? 0) > 0) return "Basic";
  return "";
}

export function CandidateRecordCard({ candidate }: { candidate: CandidateRecord }) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    firstName: candidate.firstName,
    lastName: candidate.lastName,
    email: candidate.email,
    phone: candidate.phone ?? "",
    stage: candidate.stage,
    cvScore: candidate.cvScore?.toString() ?? "",
    englishScore: candidate.englishScore?.toString() ?? "",
    overallScore: candidate.overallScore?.toString() ?? "",
    englishLevel: getEnglishLevel(candidate),
    notes: candidate.notes ?? ""
  });

  const cvFile = useMemo(() => candidate.files.find((file) => file.kind === "CV") ?? null, [candidate.files]);
  const voiceFile = useMemo(() => candidate.files.find((file) => file.kind === "VOICE_NOTE") ?? null, [candidate.files]);
  const previewUrl = cvFile ? `/api/files/${encodeURIComponent(cvFile.storageKey)}` : "";
  const voiceUrl = voiceFile ? `/api/files/${encodeURIComponent(voiceFile.storageKey)}` : "";

  async function saveChanges() {
    setSaving(true);
    try {
      const response = await fetch(`/api/candidates/${candidate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          stage: form.stage,
          cvScore: form.cvScore ? Number(form.cvScore) : null,
          englishScore: form.englishScore ? Number(form.englishScore) : null,
          overallScore: form.overallScore ? Number(form.overallScore) : null,
          englishLevel: form.englishLevel,
          notes: form.notes
        })
      });
      const payload = await response.json().catch(() => ({ error: "Candidate update failed" }));
      if (!response.ok) throw new Error(payload.error || "Failed to update candidate");
      pushToast({ title: "Candidate updated", description: `${form.firstName} ${form.lastName} has been saved.`, tone: "success" });
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      pushToast({ title: "Candidate update failed", description: message, tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function deleteCandidate() {
    if (!confirm(`Soft delete ${candidate.firstName} ${candidate.lastName}?`)) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/candidates/${candidate.id}`, { method: "DELETE" });
      const payload = await response.json().catch(() => ({ error: "Candidate delete failed" }));
      if (!response.ok) throw new Error(payload.error || "Failed to delete candidate");
      pushToast({ title: "Candidate removed", description: `${candidate.firstName} ${candidate.lastName} was soft deleted.`, tone: "success" });
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      pushToast({ title: "Delete failed", description: message, tone: "error" });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Card id={`candidate-${candidate.id}`}>
      <div className="list-row list-row-start candidate-card-toolbar">
        <div>
          <strong>{candidate.firstName} {candidate.lastName}</strong>
          <p>{candidate.job.title} - {candidate.source}</p>
        </div>
        <div className="align-right stack-sm">
          <Badge>{candidate.stage.replaceAll("_", " ")}</Badge>
          <small>{formatScore(candidate.overallScore)}</small>
        </div>
      </div>

      <div className="stats-inline">
        <span>CV {formatScore(candidate.cvScore)}</span>
        <span>English {formatScore(candidate.englishScore)}</span>
        <span>Rank {formatScore(candidate.rankingScore)}</span>
      </div>

      {candidate.skills.length ? <p className="muted">Skills: {candidate.skills.join(", ")}</p> : null}

      <div className="candidate-actions-row">
        <a href={`#candidate-${candidate.id}`}>Edit</a>
        <a href={previewUrl || "#"} aria-disabled={!previewUrl}>Download CV</a>
        <Button variant="ghost" className="danger" onClick={deleteCandidate} disabled={deleting}>
          {deleting ? "Deleting..." : "Delete"}
        </Button>
      </div>

      <div className="candidate-management-grid">
        <div className="stack-md">
          <Input value={form.firstName} onChange={(e) => setForm((current) => ({ ...current, firstName: e.target.value }))} placeholder="First name" />
          <Input value={form.lastName} onChange={(e) => setForm((current) => ({ ...current, lastName: e.target.value }))} placeholder="Last name" />
          <Input value={form.email} onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))} placeholder="Email" />
          <Input value={form.phone} onChange={(e) => setForm((current) => ({ ...current, phone: e.target.value }))} placeholder="Phone" />
          <select className="input" value={form.stage} onChange={(e) => setForm((current) => ({ ...current, stage: e.target.value as CandidateStageValue }))}>
            {pipelineStages.map((stage) => <option key={stage} value={stage}>{stage.replaceAll("_", " ")}</option>)}
          </select>
          <Textarea value={form.notes} onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))} rows={4} placeholder="Recruiter notes" />
        </div>

        <div className="stack-md">
          <div className="score-grid">
            <Input type="number" min={0} max={10} step="0.1" value={form.cvScore} onChange={(e) => setForm((current) => ({ ...current, cvScore: e.target.value }))} placeholder="CV score / 10" />
            <Input type="number" min={0} max={10} step="0.1" value={form.englishScore} onChange={(e) => setForm((current) => ({ ...current, englishScore: e.target.value }))} placeholder="English score / 10" />
            <Input type="number" min={0} max={10} step="0.1" value={form.overallScore} onChange={(e) => setForm((current) => ({ ...current, overallScore: e.target.value }))} placeholder="Overall score / 10" />
            <select className="input" value={form.englishLevel} onChange={(e) => setForm((current) => ({ ...current, englishLevel: e.target.value }))}>
              <option value="">English level</option>
              <option value="Basic">Basic</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>

          <Button onClick={saveChanges} disabled={saving}>{saving ? "Saving..." : "Save candidate changes"}</Button>
          <CandidateFileUpload candidateId={candidate.id} />

          <div className="voice-note-helper">
            <strong>WhatsApp voice note tips</strong>
            <p className="muted">Upload mp3, wav, ogg, webm, m4a, or exported WhatsApp audio. Share or export from WhatsApp, then upload here.</p>
          </div>
        </div>
      </div>

      {cvFile && (
        <details className="candidate-preview-panel">
          <summary>Review CV</summary>
          {cvFile.mimeType === "application/pdf" ? (
            <iframe src={previewUrl} title={`${candidate.firstName} ${candidate.lastName} CV`} className="candidate-cv-frame" />
          ) : (
            <p className="muted">DOCX preview is not available inline. Use the download button.</p>
          )}
        </details>
      )}

      {voiceFile && (
        <details className="candidate-preview-panel">
          <summary>Review voice note</summary>
          <audio controls src={voiceUrl} className="candidate-audio-player">
            Your browser does not support audio playback.
          </audio>
        </details>
      )}
    </Card>
  );
}
