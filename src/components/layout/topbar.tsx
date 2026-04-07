"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, Sparkles } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { useToast } from "@/components/feedback/toast";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { avatarPresets, isAvatarPresetUrl } from "@/lib/avatar-presets";
import { getInitials } from "@/lib/utils";

function getPageMeta(pathname: string) {
  if (pathname.startsWith("/jobs")) {
    return { title: "Jobs", description: "Manage role briefs, recruiter assignment, and job ownership from one place." };
  }

  if (pathname.startsWith("/candidates")) {
    return { title: "Candidates", description: "Review resumes, notes, files, scorecards, and pipeline updates without losing context." };
  }

  if (pathname.startsWith("/interviews")) {
    return { title: "Interviews", description: "Manage calendars, recruiter ownership, and candidate evaluations in one schedule." };
  }

  if (pathname.startsWith("/analytics")) {
    return { title: "Analytics", description: "Track funnel movement, source quality, and hiring momentum at a glance." };
  }

  if (pathname.startsWith("/outreach")) {
    return { title: "Outreach", description: "Create recruiter-ready messaging and keep templates organized for reuse." };
  }

  if (pathname.startsWith("/profile")) {
    return { title: "Profile", description: "Manage your recruiter identity, contact details, and workspace presence." };
  }

  if (pathname.startsWith("/settings")) {
    return { title: "Settings", description: "Adjust team access, workspace approval, and operating controls." };
  }

  if (pathname.startsWith("/help")) {
    return { title: "Support", description: "Track workspace requests, follow replies, and keep help conversations inside Freely." };
  }

  return { title: "Dashboard", description: "Monitor live hiring demand, recruiter ownership, and pipeline momentum." };
}

export function Topbar({
  name,
  email,
  avatarUrl,
  organizationName,
  roleLabel,
  onMenuToggle
}: {
  name: string;
  email: string;
  avatarUrl?: string | null;
  organizationName?: string | null;
  roleLabel?: string;
  onMenuToggle?: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { pushToast } = useToast();
  const [loggingOut, setLoggingOut] = useState(false);
  const meta = getPageMeta(pathname);
  const resolvedAvatarUrl = isAvatarPresetUrl(avatarUrl) ? avatarUrl : (avatarPresets[0]?.src ?? null);

  const tourHref = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tour", "1");
    return `${pathname}?${params.toString()}`;
  }, [pathname, searchParams]);

  async function handleLogout() {
    setLoggingOut(true);

    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        throw new Error("Logout failed");
      }

      pushToast({ title: "Signed out", description: "Your recruiter session has ended.", tone: "success" });
      router.push("/site");
      router.refresh();
    } catch {
      pushToast({ title: "Could not sign out", description: "Please try again.", tone: "error" });
      setLoggingOut(false);
    }
  }

  return (
    <header className="topbar topbar-refined topbar-production">
      <div className="topbar-leading">
        <button type="button" className="topbar-menu-button" onClick={onMenuToggle} aria-label="Open navigation menu">
          <Menu size={18} />
        </button>
        <div className="topbar-copy topbar-copy-refined">
          <div className="topbar-kicker">
            <Sparkles size={14} />
            <span>{meta.title}</span>
            {organizationName ? <small>{organizationName}</small> : null}
          </div>
          <h1>{meta.title}</h1>
          <p>{meta.description}</p>
        </div>
      </div>
      <div className="topbar-actions topbar-actions-refined">
        {roleLabel ? <span className="topbar-role-pill">{roleLabel.replaceAll("_", " ")}</span> : null}
        <NotificationBell />
        <details className="profile-menu">
          <summary className="avatar-button" aria-label={`Open profile menu for ${email}`}>
            {resolvedAvatarUrl ? (
              <Image alt={name} src={resolvedAvatarUrl} className="avatar-button-image" width={40} height={40} unoptimized />
            ) : (
              <span>{getInitials(name)}</span>
            )}
          </summary>
          <div className="profile-menu-panel">
            <div className="profile-menu-meta">
              <strong>{name}</strong>
              <small>{email}</small>
              {organizationName ? <small>{organizationName}</small> : null}
            </div>
            <Link href="/profile" className="profile-menu-link">Profile settings</Link>
            <Link href={tourHref} className="profile-menu-link">Help &amp; get started</Link>
            <Link href="/help" className="profile-menu-link">Support inbox</Link>
            <button type="button" className="profile-menu-link danger" onClick={handleLogout} disabled={loggingOut}>
              {loggingOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </details>
      </div>
    </header>
  );
}
