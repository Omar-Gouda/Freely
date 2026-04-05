"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { useToast } from "@/components/feedback/toast";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { normalizeOptionalUrl } from "@/lib/utils";

type ParsedCandidate = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  linkedInUrl: string;
  skills: string[];
  yearsExperience?: number;
  experienceSummary: string;
  educationSummary: string;
  resumeText: string;
  parsedProfile: Record<string, unknown>;
};

const emptyParsed: ParsedCandidate = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  linkedInUrl: "",
  skills: [],
  yearsExperience: undefined,
  experienceSummary: "",
  educationSummary: "",
  resumeText: "",
  parsedProfile: {}
};

export function CandidateForm({ jobs }: { jobs: Array<{ id: string; title: string }> }) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [voiceFile, setVoiceFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedCandidate>(emptyParsed);
  const [source, setSource] = useState("LinkedIn");
  const [jobId, setJobId] = useState("");
  const [country, setCountry] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [skills, setSkills] = useState("");
  const [voiceHint, setVoiceHint] = useState("Optional: upload a supporting voice note if you have one.");

  const hasReviewData = Boolean(cvFile && parsed.resumeText);
  const detectedSkills = useMemo(() => parsed.skills.join(", "), [parsed.skills]);

  async function parseResume(file: File | null, selectedJobId: string) {
    if (!file || !selectedJobId) {
      setError("Select a job before uploading the resume.");
      return;
    }

    setParsing(true);
    setError("");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("jobId", selectedJobId);

    const response = await fetch("/api/candidates/parse", {
      method: "POST",
      body: formData
    });

    const payload = await response.json().catch(() => ({ error: "Resume parsing failed" }));
    if (!response.ok) {
      setError(payload.error ?? "Resume parsing failed");
      pushToast({ title: "Resume parsing failed", description: payload.error ?? "Please try again.", tone: "error" });
      setParsing(false);
      return;
    }

    setParsed(payload.data);
    setSkills((payload.data.skills ?? []).join(", "));
    setParsing(false);
    pushToast({ title: "Resume parsed", description: "Review the extracted candidate details before saving.", tone: "success" });
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError("");
    setSuccess("");

    const yearsExperienceRaw = String(formData.get("yearsExperience") ?? "").trim();
    const response = await fetch("/api/candidates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobId: String(formData.get("jobId")),
        firstName: String(formData.get("firstName")),
        lastName: String(formData.get("lastName")),
        email: String(formData.get("email")),
        phone: String(formData.get("phone") ?? ""),
        country: String(formData.get("country") ?? ""),
        address: String(formData.get("address") ?? ""),
        linkedInUrl: normalizeOptionalUrl(String(formData.get("linkedInUrl") ?? "")),
        source: String(formData.get("source")),
        yearsExperience: yearsExperienceRaw ? Number(yearsExperienceRaw) : undefined,
        notes: String(formData.get("notes") ?? ""),
        skills: String(formData.get("skills") ?? "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        experienceSummary: String(formData.get("experienceSummary") ?? ""),
        educationSummary: String(formData.get("educationSummary") ?? ""),
        resumeText: parsed.resumeText,
        parsedProfile: parsed.parsedProfile
      })
    });

    const payload = await response.json().catch(() => ({ error: "Candidate creation failed" }));

    if (!response.ok) {
      setError(payload.error ?? "Candidate creation failed");
      pushToast({ title: "Candidate creation failed", description: payload.error ?? "Please try again.", tone: "error" });
      setLoading(false);
      return;
    }

    const candidateId = payload.data.id as string;

    async function upload(kind: "cv" | "voice", file: File | null) {
      if (!file) return;
      const uploadData = new FormData();
      uploadData.append("kind", kind);
      uploadData.append("file", file);
      const uploadResponse = await fetch(`/api/candidates/${candidateId}/files`, {
        method: "POST",
        body: uploadData
      });

      if (!uploadResponse.ok) {
        const uploadPayload = await uploadResponse.json().catch(() => ({ error: `${kind} upload failed` }));
        throw new Error(uploadPayload.error ?? `${kind} upload failed`);
      }
    }

    try {
      await upload("cv", cvFile);
      await upload("voice", voiceFile);
      setSuccess("Candidate created and files uploaded.");
      setParsed(emptyParsed);
      setCvFile(null);
      setVoiceFile(null);
      setCountry("");
      setAddress("");
      setNotes("");
      setSkills("");
      pushToast({ title: "Candidate created", description: "The profile is now in your pipeline.", tone: "success" });
      router.refresh();
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "File upload failed";
      setError(message);
      pushToast({ title: "Candidate created with upload issue", description: message, tone: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="candidate-intake-shell">
      <div className="candidate-intake-grid">
        <div className="file-dropzone">
          <strong>Resume intake</strong>
          <select className="input" value={jobId} onChange={(event) => setJobId(event.target.value)} required>
            <option value="">Select job</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>{job.title}</option>
            ))}
          </select>
          <Input value={source} onChange={(event) => setSource(event.target.value)} placeholder="Source" />
          <label className="upload-pill">
            <input
              type="file"
              accept=".pdf,.docx"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setCvFile(file);
                void parseResume(file, jobId);
              }}
            />
            {parsing ? "Parsing resume..." : cvFile ? cvFile.name : "Upload CV to parse"}
          </label>
          <label className="upload-pill secondary">
            <input
              type="file"
              accept="audio/*,.ogg,.opus,.mp3,.wav,.m4a"
              hidden
              onChange={(event) => {
                setVoiceFile(event.target.files?.[0] ?? null);
                setVoiceHint("Voice note attached. You can replace it before saving the candidate.");
              }}
            />
            {voiceFile ? voiceFile.name : "Attach voice note"}
          </label>
          <p className="muted">{voiceHint}</p>
        </div>
        <div className="file-dropzone">
          <strong>Review</strong>
          <p className="muted">Detected skills: {detectedSkills || "None yet"}</p>
          <p className="muted">Detected experience: {parsed.yearsExperience ?? 0} years</p>
          <p className="muted">Status: {hasReviewData ? "Ready to save." : "Upload a CV to begin."}</p>
        </div>
      </div>
      <form className="form-grid" action={handleSubmit}>
        <input type="hidden" name="jobId" value={jobId} />
        <input type="hidden" name="source" value={source} />
        <Input name="firstName" placeholder="First name" value={parsed.firstName} onChange={(event) => setParsed((current) => ({ ...current, firstName: event.target.value }))} required />
        <Input name="lastName" placeholder="Last name" value={parsed.lastName} onChange={(event) => setParsed((current) => ({ ...current, lastName: event.target.value }))} required />
        <Input name="email" type="email" placeholder="Email" value={parsed.email} onChange={(event) => setParsed((current) => ({ ...current, email: event.target.value }))} required />
        <Input name="phone" placeholder="Phone" value={parsed.phone} onChange={(event) => setParsed((current) => ({ ...current, phone: event.target.value }))} />
        <Input name="country" placeholder="Country" value={country} onChange={(event) => setCountry(event.target.value)} />
        <Input name="address" placeholder="Address" value={address} onChange={(event) => setAddress(event.target.value)} />
        <Input name="linkedInUrl" placeholder="LinkedIn URL" value={parsed.linkedInUrl} onChange={(event) => setParsed((current) => ({ ...current, linkedInUrl: event.target.value }))} />
        <Input name="yearsExperience" type="number" min={0} max={50} value={parsed.yearsExperience ?? ""} onChange={(event) => setParsed((current) => ({ ...current, yearsExperience: event.target.value === "" ? undefined : Number(event.target.value) }))} placeholder="Years of experience" />
        <Input name="skills" placeholder="Skills, comma separated" value={skills} onChange={(event) => setSkills(event.target.value)} />
        <Textarea name="experienceSummary" rows={4} placeholder="Experience summary" value={parsed.experienceSummary} onChange={(event) => setParsed((current) => ({ ...current, experienceSummary: event.target.value }))} />
        <Textarea name="educationSummary" rows={4} placeholder="Education summary" value={parsed.educationSummary} onChange={(event) => setParsed((current) => ({ ...current, educationSummary: event.target.value }))} />
        <Textarea name="notes" rows={4} placeholder="Recruiter notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
        {error ? <p className="error-text">{error}</p> : null}
        {success ? <p className="success-text">{success}</p> : null}
        <Button type="submit" disabled={loading || !jobId || !hasReviewData}>{loading ? "Saving..." : "Confirm and create candidate"}</Button>
      </form>
    </div>
  );
}

export function CandidateFileUpload({ candidateId }: { candidateId: string }) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [uploading, setUploading] = useState<"cv" | "voice" | null>(null);
  const [error, setError] = useState("");

  async function upload(kind: "cv" | "voice", file: File | null) {
    if (!file) return;
    setUploading(kind);
    setError("");
    const formData = new FormData();
    formData.append("kind", kind);
    formData.append("file", file);

    const response = await fetch(`/api/candidates/${candidateId}/files`, {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: "Upload failed" }));
      setError(payload.error ?? "Upload failed");
      pushToast({ title: "Upload failed", description: payload.error ?? "Please try again.", tone: "error" });
      setUploading(null);
      return;
    }

    pushToast({ title: kind === "cv" ? "CV uploaded" : "Voice note uploaded", description: "Background analysis has been queued.", tone: "success" });
    setUploading(null);
    router.refresh();
  }

  return (
    <div className="stack-md">
      <div className="file-upload-row">
        <label className="upload-pill">
          <input type="file" accept=".pdf,.docx" hidden onChange={(event) => upload("cv", event.target.files?.[0] ?? null)} />
          {uploading === "cv" ? "Uploading CV..." : "Upload CV"}
        </label>
        <label className="upload-pill secondary">
          <input type="file" accept="audio/*,.ogg,.opus,.mp3,.wav,.m4a" hidden onChange={(event) => upload("voice", event.target.files?.[0] ?? null)} />
          {uploading === "voice" ? "Uploading audio..." : "Upload voice note"}
        </label>
      </div>
      {error ? <p className="error-text">{error}</p> : null}
    </div>
  );
}