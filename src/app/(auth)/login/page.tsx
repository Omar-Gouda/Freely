"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { useToast } from "@/components/feedback/toast";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

async function readErrorMessage(response: Response, fallback: string) {
  const raw = await response.text();

  if (!raw) {
    return fallback;
  }

  try {
    const payload = JSON.parse(raw) as { error?: string };
    return payload.error ?? fallback;
  } catch {
    return fallback;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackError = searchParams.get("error") ?? "";
  const accountCreated = searchParams.get("created") === "1";
  const requestSubmitted = searchParams.get("requested") === "1";
  const { pushToast } = useToast();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (callbackError) {
      pushToast({ title: "Sign in failed", description: callbackError, tone: "error" });
      return;
    }

    if (accountCreated) {
      pushToast({ title: "Account ready", description: "Your workspace account is ready. Sign in to continue.", tone: "success" });
    }

    if (requestSubmitted) {
      pushToast({ title: "Request submitted", description: "Your organization request is waiting for admin approval.", tone: "info" });
    }
  }, [accountCreated, callbackError, pushToast, requestSubmitted]);

  async function handleSubmit(formData: FormData) {
    try {
      setLoading(true);

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(formData.get("email")),
          password: String(formData.get("password"))
        })
      });

      if (!response.ok) {
        pushToast({ title: "Sign in failed", description: await readErrorMessage(response, "Login failed"), tone: "error" });
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      pushToast({ title: "Sign in failed", description: "Unable to sign in right now. Please try again.", tone: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell auth-shell-production">
      <SiteHeader minimal />
      <div className="auth-page auth-page-register auth-page-production">
        <Card className="auth-card auth-hero auth-hero-register auth-hero-production">
          <span className="eyebrow">Recruitment workspace</span>
          <h1>Sign in to manage jobs, candidates, interviews, and recruiter ownership from one calmer system.</h1>
          <p>Freely keeps the hiring workflow structured for admins, org heads, and recruiters without crowding the screen.</p>
          <div className="auth-checklist">
            <div className="auth-checklist-item"><strong>Role-based access for admin, org head, and recruiter teams</strong></div>
            <div className="auth-checklist-item"><strong>Candidate records with resumes, notes, and interview evaluations</strong></div>
            <div className="auth-checklist-item"><strong>Cleaner job ownership so recruiters stay focused on assigned work</strong></div>
          </div>
        </Card>
        <Card className="auth-card auth-card-register auth-card-production">
          <h2>Welcome back</h2>
          <form className="stack-md" action={handleSubmit}>
            <Input name="email" type="email" placeholder="Email" required />
            <Input name="password" type="password" placeholder="Password" required />
            <Button type="submit" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</Button>
          </form>
          <p className="muted">Need access? <Link href="/signup">Request a workspace</Link></p>
          <p className="muted">Need help? <Link href="/contact">Contact support</Link></p>
        </Card>
      </div>
      <SiteFooter minimal />
    </div>
  );
}
