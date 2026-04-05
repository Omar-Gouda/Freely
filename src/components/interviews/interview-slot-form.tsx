"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useToast } from "@/components/feedback/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function InterviewSlotForm({
  jobs,
  recruiters,
  selectedJobId,
  currentUserId
}: {
  jobs: Array<{ id: string; title: string }>;
  recruiters: Array<{ id: string; fullName: string }>;
  selectedJobId?: string;
  currentUserId: string;
}) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [interviewers, setInterviewers] = useState("");
  const [assignedRecruiterId, setAssignedRecruiterId] = useState(currentUserId);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    const response = await fetch("/api/interviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobId: String(formData.get("jobId")),
        assignedRecruiterId,
        interviewerNames: interviewers.split(",").map((item) => item.trim()).filter(Boolean),
        startsAt: new Date(String(formData.get("startsAt"))).toISOString(),
        endsAt: new Date(String(formData.get("endsAt"))).toISOString(),
        location: String(formData.get("location") ?? ""),
        notes: String(formData.get("notes") ?? "")
      })
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: "Slot creation failed" }));
      pushToast({ title: "Slot creation failed", description: payload.error ?? "Please try again.", tone: "error" });
      setLoading(false);
      return;
    }

    pushToast({ title: "Interview slot created", description: "The slot now appears in the calendar and recruiters will see updates through notifications.", tone: "success" });
    setLoading(false);
    setInterviewers("");
    setAssignedRecruiterId(currentUserId);
    router.refresh();
  }

  return (
    <form className="form-grid" action={handleSubmit}>
      <select name="jobId" className="input" defaultValue={selectedJobId} required>
        <option value="">Select job</option>
        {jobs.map((job) => (
          <option value={job.id} key={job.id}>{job.title}</option>
        ))}
      </select>
      <select name="assignedRecruiterId" className="input" value={assignedRecruiterId} onChange={(event) => setAssignedRecruiterId(event.target.value)}>
        <option value="">Choose recruiter</option>
        {recruiters.map((recruiter) => (
          <option value={recruiter.id} key={recruiter.id}>{recruiter.fullName}</option>
        ))}
      </select>
      <Input value={interviewers} onChange={(event) => setInterviewers(event.target.value)} placeholder="Interviewers, comma separated" />
      <Input name="startsAt" type="datetime-local" required />
      <Input name="endsAt" type="datetime-local" required />
      <Input name="location" placeholder="Google Meet / Office / Zoom" />
      <Input name="notes" placeholder="Prep notes or meeting memo" />
      <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Create slot"}</Button>
    </form>
  );
}

export function InterviewBookingForm({
  slots,
  candidates
}: {
  slots: Array<{ id: string; label: string }>;
  candidates: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);

    const response = await fetch("/api/interviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slotId: String(formData.get("slotId")),
        candidateId: String(formData.get("candidateId")),
        notes: String(formData.get("notes") ?? "")
      })
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: "Interview assignment failed" }));
      pushToast({ title: "Interview assignment failed", description: payload.error ?? "Please try again.", tone: "error" });
      setLoading(false);
      return;
    }

    pushToast({ title: "Candidate assigned", description: "The interview is now on the recruiter schedule and visible in notifications.", tone: "success" });
    setLoading(false);
    router.refresh();
  }

  return (
    <form className="form-grid" action={handleSubmit}>
      <select name="slotId" className="input" required disabled={!slots.length}>
        <option value="">{slots.length ? "Select slot" : "No open slots available"}</option>
        {slots.map((slot) => (
          <option value={slot.id} key={slot.id}>{slot.label}</option>
        ))}
      </select>
      <select name="candidateId" className="input" required disabled={!candidates.length}>
        <option value="">{candidates.length ? "Select candidate" : "No candidates for this role"}</option>
        {candidates.map((candidate) => (
          <option value={candidate.id} key={candidate.id}>{candidate.name}</option>
        ))}
      </select>
      <Input name="notes" placeholder="Notes for the recruiter or candidate" />
      <Button type="submit" disabled={loading || !slots.length || !candidates.length}>{loading ? "Assigning..." : "Assign candidate"}</Button>
    </form>
  );
}
