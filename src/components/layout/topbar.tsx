"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, Sparkles } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { useToast } from "@/components/feedback/toast";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { getInitials } from "@/lib/utils";

function getPageMeta(pathname: string) {
  if (pathname.startsWith("/jobs")) {
    return { title: "Jobs", description: "Keep role briefs, requirements, and campaign content structured from one place." };
  }

  if (pathname.startsWith("/candidates")) {
    return { title: "Candidates", description: "Review parsed profiles, scorecards, files, and pipeline updates without losing context." };
  }

  if (pathname.startsWith("/interviews")) {
    return { title: "Interviews", description: "Manage calendars, recruiter assignments, and candidate scorecards in one schedule." };
  }

  if (pathname.startsWith("/analytics")) {
    return { title: "Analytics", description: "Track funnel movement, source quality, and recruiter activity at a glance." };
  }

  if (pathname.startsWith("/outreach")) {
    return { title: "Outreach", description: "Create recruiter-ready messaging and keep templates organized for reuse." };
  }

  if (pathname.startsWith("/profile")) {
    return { title: "Profile", description: "Manage your recruiter identity, contact details, and workspace avatar presets." };
  }

  if (pathname.startsWith("/settings")) {
    return { title: "Settings", description: "Adjust team access, workspace rules, and operating preferences." };
  }

  return { title: "Dashboard", description: "Monitor live hiring demand, upcoming interviews, and pipeline momentum." };
}

export function Topbar({
  name,
  email,
  avatarUrl,
  onMenuToggle
}: {
  name: string;
  email: string;
  avatarUrl?: string | null;
  onMenuToggle?: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { pushToast } = useToast();
  const [loggingOut, setLoggingOut] = useState(false);
  const meta = getPageMeta(pathname);

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
    <header className="topbar topbar-refined">
      <div className="topbar-leading">
        <button type="button" className="topbar-menu-button" onClick={onMenuToggle} aria-label="Open navigation menu">
          <Menu size={18} />
        </button>
        <div className="topbar-copy topbar-copy-refined">
          <div className="topbar-kicker">
            <Sparkles size={14} />
            <span>{meta.title}</span>
          </div>
          <h1>{meta.title}</h1>
          <p>{meta.description}</p>
        </div>
      </div>
      <div className="topbar-actions topbar-actions-refined">
        <NotificationBell />
        <details className="profile-menu">
          <summary className="avatar-button" aria-label={`Open profile menu for ${email}`}>
            {avatarUrl ? (
              <Image alt={name} src={avatarUrl} className="avatar-button-image" width={40} height={40} unoptimized />
            ) : (
              <span>{getInitials(name)}</span>
            )}
          </summary>
          <div className="profile-menu-panel">
            <div className="profile-menu-meta">
              <strong>{name}</strong>
              <small>{email}</small>
            </div>
            <Link href="/profile" className="profile-menu-link">Profile settings</Link>
            <Link href={tourHref} className="profile-menu-link">Help &amp; get started</Link>
            <Link href="/contact" className="profile-menu-link">Contact support</Link>
            <button type="button" className="profile-menu-link danger" onClick={handleLogout} disabled={loggingOut}>
              {loggingOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </details>
      </div>
    </header>
  );
}
