"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useToast } from "@/components/feedback/toast";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AccountType } from "@/lib/models";

async function readResponse(response: Response, fallback: string) {
  const raw = await response.text();

  if (!raw) {
    return { error: fallback };
  }

  try {
    return JSON.parse(raw) as { error?: string; data?: { needsEmailConfirmation?: boolean; message?: string; redirectTo?: string } };
  } catch {
    return { error: fallback };
  }
}

const registrationHighlights = [
  "Create a dedicated recruiting workspace with separate access control",
  "Set your first account as the workspace organization head automatically",
  "Start using the workspace right away when direct signup is enabled"
];

export default function SignupPage() {
  const router = useRouter();
  const { pushToast } = useToast();
  const [accountType, setAccountType] = useState<AccountType>(AccountType.PERSONAL);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (password !== confirmPassword) {
      pushToast({ title: "Passwords do not match", description: "Re-enter both password fields so they match exactly.", tone: "error" });
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountType,
          workspaceName: String(formData.get("workspaceName") ?? ""),
          fullName: String(formData.get("fullName") ?? ""),
          email,
          password
        })
      });

      const payload = await readResponse(response, "Signup failed");

      if (!response.ok) {
        pushToast({ title: "Signup failed", description: payload.error ?? "Please try again.", tone: "error" });
        return;
      }

      if (payload.data?.redirectTo) {
        router.push(payload.data.redirectTo);
        router.refresh();
        return;
      }

      pushToast({ title: "Account created", description: payload.data?.message ?? "Your account was created successfully.", tone: "success" });
    } catch {
      pushToast({ title: "Signup failed", description: "Unable to create your account right now. Please try again.", tone: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <SiteHeader minimal />
      <div className="auth-page auth-page-register">
        <Card className="auth-card auth-hero auth-hero-register">
          <span className="eyebrow">Workspace signup</span>
          <h1>Create your workspace and start hiring from one organized command center.</h1>
          <p>Freely keeps onboarding simple so teams can move from account setup to live recruiting without extra setup clutter.</p>
          <div className="auth-checklist">
            {registrationHighlights.map((item) => (
              <div key={item} className="auth-checklist-item">
                <strong>{item}</strong>
              </div>
            ))}
          </div>
        </Card>
        <Card className="auth-card auth-card-register">
          <div className="stack-md">
            <div>
              <h2>Create account</h2>
              <p className="muted">Choose the workspace type first so your setup matches the right ownership model.</p>
            </div>
            <div className="schedule-filter-pills">
              <button type="button" className={`schedule-filter-pill${accountType === AccountType.PERSONAL ? " active" : ""}`} onClick={() => setAccountType(AccountType.PERSONAL)}>Personal</button>
              <button type="button" className={`schedule-filter-pill${accountType === AccountType.ORGANIZATIONAL ? " active" : ""}`} onClick={() => setAccountType(AccountType.ORGANIZATIONAL)}>Organizational head</button>
            </div>
            <form className="stack-md" action={handleSubmit}>
              <div className="job-form-grid auth-form-grid">
                <label className="field-shell field-shell-full">
                  <span>{accountType === AccountType.ORGANIZATIONAL ? "Organization name" : "Workspace name"}</span>
                  <Input name="workspaceName" placeholder={accountType === AccountType.ORGANIZATIONAL ? "Freely Talent Partners" : "Omar's Personal Workspace"} required />
                </label>
                <label className="field-shell">
                  <span>Full name</span>
                  <Input name="fullName" placeholder="Omar Gouda" required />
                </label>
                <label className="field-shell">
                  <span>Email</span>
                  <Input name="email" type="email" placeholder="name@company.com" required />
                </label>
                <label className="field-shell">
                  <span>Password</span>
                  <Input name="password" type="password" placeholder="At least 8 characters" required />
                </label>
                <label className="field-shell">
                  <span>Confirm password</span>
                  <Input name="confirmPassword" type="password" placeholder="Re-enter password" required />
                </label>
              </div>
              <p className="muted">Create the account once, then continue into your workspace to finish setup and invite your team.</p>
              <Button type="submit" disabled={loading}>{loading ? "Creating account..." : "Create workspace account"}</Button>
            </form>
          </div>
          <p className="muted">Already have access? <Link href="/login">Sign in</Link></p>
        </Card>
      </div>
      <SiteFooter minimal />
    </div>
  );
}
