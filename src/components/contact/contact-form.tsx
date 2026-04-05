"use client";

import { useRef, useState } from "react";

import { useToast } from "@/components/feedback/toast";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";

type ContactPayload = {
  error?: string;
  data?: {
    requestId?: string;
    channel?: string;
    warning?: string | null;
  };
};

export function ContactForm() {
  const { pushToast } = useToast();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(formData.get("name") ?? ""),
          email: String(formData.get("email") ?? ""),
          company: String(formData.get("company") ?? ""),
          subject: String(formData.get("subject") ?? ""),
          message: String(formData.get("message") ?? "")
        })
      });

      const payload = await response.json().catch(() => ({ error: "Support request failed" })) as ContactPayload;
      if (!response.ok) {
        pushToast({ title: "Message failed", description: payload.error ?? "Please try again.", tone: "error" });
        return;
      }

      formRef.current?.reset();
      pushToast({
        title: "Message sent",
        description: payload.data?.channel === "email-and-notification" || payload.data?.channel === "email"
          ? "Your support request has been delivered successfully."
          : "Your support request was saved inside Freely and shared with support.",
        tone: "success"
      });

      if (payload.data?.warning) {
        pushToast({ title: "Support delivery note", description: payload.data.warning, tone: "info" });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form ref={formRef} className="stack-md" action={handleSubmit}>
      <div className="landing-form-grid">
        <label className="field-shell">
          <span>Name</span>
          <Input name="name" placeholder="Omar Gouda" required />
        </label>
        <label className="field-shell">
          <span>Email</span>
          <Input name="email" type="email" placeholder="name@company.com" required />
        </label>
        <label className="field-shell">
          <span>Company</span>
          <Input name="company" placeholder="Freely Talent Partners" />
        </label>
        <label className="field-shell">
          <span>Subject</span>
          <Input name="subject" placeholder="Need help with onboarding" required />
        </label>
        <label className="field-shell field-shell-full">
          <span>Message</span>
          <Textarea name="message" rows={6} placeholder="Tell us what you need help with, what broke, or how you want to use Freely." required />
        </label>
      </div>
      <Button type="submit" disabled={loading}>{loading ? "Sending..." : "Send message"}</Button>
    </form>
  );
}
