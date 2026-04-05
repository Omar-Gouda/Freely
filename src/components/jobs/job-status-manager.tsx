"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useToast } from "@/components/feedback/toast";
import { Button } from "@/components/ui/button";
import { JobStatus } from "@/lib/models";

export function JobStatusManager({ jobId, currentStatus }: { jobId: string; currentStatus: string }) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [status, setStatus] = useState(currentStatus);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);

    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const payload = await response.json().catch(() => ({ error: "Unable to update status" }));

      if (!response.ok) {
        pushToast({ title: "Status update failed", description: payload.error ?? "Please try again.", tone: "error" });
        return;
      }

      pushToast({ title: "Job status updated", description: `Role status is now ${status.replaceAll("_", " ")}.`, tone: "success" });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="stack-md">
      <label className="field-shell">
        <span>Status</span>
        <select className="input" value={status} onChange={(event) => setStatus(event.target.value)}>
          {Object.values(JobStatus).map((option) => (
            <option key={option} value={option}>{option.replaceAll("_", " ")}</option>
          ))}
        </select>
      </label>
      <Button type="button" onClick={handleSave} disabled={saving || status === currentStatus}>
        {saving ? "Saving..." : "Save status"}
      </Button>
    </div>
  );
}