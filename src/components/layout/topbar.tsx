"use client";

import Image from "next/image";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { useToast } from "@/components/feedback/toast";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { getInitials } from "@/lib/utils";

export function Topbar({
  name,
  email,
  avatarUrl
}: {
  name: string;
  email: string;
  avatarUrl?: string | null;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { pushToast } = useToast();
  const [loggingOut, setLoggingOut] = useState(false);

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
    <header className="topbar">
      <div className="topbar-copy">
        <div className="topbar-kicker">
          <Sparkles size={14} />
          <span>Recruitment workspace</span>
        </div>
        <h1>Recruitment Command Center</h1>
        <p>Jobs, candidates, interviews, and recruiter activity in one clean workspace.</p>
      </div>
      <div className="topbar-actions">
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
