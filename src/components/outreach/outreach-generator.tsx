"use client";

import { useState } from "react";

import { useToast } from "@/components/feedback/toast";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Input } from "@/components/ui/input";

type CandidateOption = {
  id: string;
  name: string;
  phone: string | null;
  jobTitle: string;
};

type GeneratedTemplate = {
  id: string;
  candidateId?: string;
  candidateName?: string;
  content: string;
  phone?: string | null;
  whatsappLink?: string | null;
};

export function OutreachGenerator({ candidates }: { candidates: CandidateOption[] }) {
  const { pushToast } = useToast();
  const [templates, setTemplates] = useState<GeneratedTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [interviewTime, setInterviewTime] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  async function generate(formData: FormData) {
    setLoading(true);

    const response = await fetch("/api/whatsapp/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: String(formData.get("kind")),
        candidateIds: selectedIds,
        interviewTime
      })
    });

    const payload = await response.json().catch(() => ({ error: "Template generation failed" }));
    if (!response.ok) {
      pushToast({ title: "Template generation failed", description: payload.error ?? "Please try again.", tone: "error" });
      setLoading(false);
      return;
    }

    setTemplates(payload.data.templates ?? []);
    pushToast({ title: "Messages generated", description: "You can now copy or send them through WhatsApp.", tone: "success" });
    setLoading(false);
  }

  function toggleCandidate(candidateId: string) {
    setSelectedIds((current) => (current.includes(candidateId) ? current.filter((id) => id !== candidateId) : [...current, candidateId]));
  }

  return (
    <div className="stack-lg">
      <form className="form-grid" action={generate}>
        <select name="kind" className="input" required>
          <option value="INTERVIEW_INVITE">Interview invite</option>
          <option value="ACCEPTANCE">Acceptance</option>
          <option value="REJECTION">Rejection</option>
        </select>
        <Input value={interviewTime} onChange={(event) => setInterviewTime(event.target.value)} placeholder="Interview time, if relevant" />
        <div className="bulk-message-list">
          {candidates.map((candidate) => (
            <label key={candidate.id} className="candidate-selector-row">
              <input type="checkbox" checked={selectedIds.includes(candidate.id)} onChange={() => toggleCandidate(candidate.id)} />
              <span>{candidate.name}</span>
              <small>{candidate.jobTitle}</small>
            </label>
          ))}
        </div>
        <Button type="submit" disabled={loading}>{loading ? "Generating..." : "Generate WhatsApp templates"}</Button>
      </form>
      {templates.length ? (
        <div className="stack-md">
          {templates.map((template) => (
            <div className="message-box" key={template.id}>
              <div className="list-row list-row-start">
                <div>
                  <strong>{template.candidateName ?? "Generic template"}</strong>
                  <p>{template.phone ?? "No phone number stored"}</p>
                </div>
                <div className="candidate-actions-row">
                  <CopyButton value={template.content} label="Copy message" />
                  {template.whatsappLink ? (
                    <a href={template.whatsappLink} target="_blank" rel="noreferrer">Send via WhatsApp</a>
                  ) : (
                    <span className="muted">Missing phone</span>
                  )}
                </div>
              </div>
              <p>{template.content}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}