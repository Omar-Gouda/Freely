"use client";

import { useRef, useState } from "react";

import { useToast } from "@/components/feedback/toast";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";

type ContactPayload = {
  error?: string;
  data?: {
    threadId?: string;
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
        title: "Request received",
        description: "Your message was added to the Freely support channel. Expect an email reply within 24 to 48 hours during Monday to Friday, 10 AM to 4 PM.",
        tone: "success"
      });

      if (payload.data?.warning) {
        pushToast({ title: "Support note", description: payload.data.warning, tone: "info" });
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
          <Textarea name="message" rows={6} placeholder="Tell us what you need help with, what broke, or which organization needs support." required />
        </label>
      </div>
      <Button type="submit" disabled={loading}>{loading ? "Sending..." : "Send request"}</Button>
    </form>
  );
}
