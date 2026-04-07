"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useToast } from "@/components/feedback/toast";
import { Button } from "@/components/ui/button";

export function JobAssignmentManager({
  jobId,
  recruiters,
  currentAssignedRecruiterId
}: {
  jobId: string;
  recruiters: Array<{ id: string; fullName: string }>;
  currentAssignedRecruiterId?: string | null;
}) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [assignedRecruiterId, setAssignedRecruiterId] = useState(currentAssignedRecruiterId ?? "");
  const [loading, setLoading] = useState(false);

  async function saveAssignment() {
    setLoading(true);

    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedRecruiterId })
      });

      const payload = await response.json().catch(() => ({ error: "Assignment failed" }));
      if (!response.ok) {
        pushToast({ title: "Assignment failed", description: payload.error ?? "Please try again.", tone: "error" });
        return;
      }

      pushToast({
        title: assignedRecruiterId ? "Recruiter assigned" : "Recruiter cleared",
        description: assignedRecruiterId
          ? "This job will now appear in the recruiter workspace as an active role."
          : "The job is no longer actively assigned, but prior recruiter history is still preserved.",
        tone: "success"
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="stack-md">
      <label className="field-shell">
        <span>Assigned recruiter</span>
        <select className="input" value={assignedRecruiterId} onChange={(event) => setAssignedRecruiterId(event.target.value)}>
          <option value="">Unassigned</option>
          {recruiters.map((recruiter) => (
            <option key={recruiter.id} value={recruiter.id}>{recruiter.fullName}</option>
          ))}
        </select>
      </label>
      <Button type="button" onClick={saveAssignment} disabled={loading}>
        {loading ? "Saving assignment..." : "Save assignment"}
      </Button>
    </div>
  );
}
