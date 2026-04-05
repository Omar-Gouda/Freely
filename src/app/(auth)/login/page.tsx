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
  }, [accountCreated, callbackError, pushToast]);

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
    <div className="auth-shell">
      <SiteHeader minimal />
      <div className="auth-page auth-page-register">
        <Card className="auth-card auth-hero auth-hero-register">
          <span className="eyebrow">Recruiting workspace</span>
          <h1>Sign in to manage jobs, candidates, outreach, and interviews from one purple command center.</h1>
          <p>Freely keeps recruiter workflows connected so your team spends less time chasing updates and more time hiring.</p>
          <div className="auth-checklist">
            <div className="auth-checklist-item"><strong>Track every job brief and extracted hiring detail in one place</strong></div>
            <div className="auth-checklist-item"><strong>Coordinate recruiters through in-app alerts without losing ownership</strong></div>
            <div className="auth-checklist-item"><strong>Keep support close with direct access to the contact page</strong></div>
          </div>
        </Card>
        <Card className="auth-card auth-card-register">
          <h2>Welcome back</h2>
          <form className="stack-md" action={handleSubmit}>
            <Input name="email" type="email" placeholder="Email" required />
            <Input name="password" type="password" placeholder="Password" required />
            <Button type="submit" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</Button>
          </form>
          <p className="muted">Need access? <Link href="/signup">Create your workspace account</Link></p>
          <p className="muted">Need help or want to report an issue? <Link href="/contact">Contact us</Link></p>
        </Card>
      </div>
      <SiteFooter minimal />
    </div>
  );
}
