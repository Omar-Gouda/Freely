"use client";

import { useState } from "react";

import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { GetStartedTour } from "@/components/onboarding/get-started-tour";

export function DashboardShell({
  children,
  user
}: {
  children: import("react").ReactNode;
  user: { id: string; fullName?: string | null; email: string; avatarUrl?: string | null; onboardingCompleted?: boolean | null };
}) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className={`app-shell app-shell-responsive ${navOpen ? "app-shell-nav-open" : ""}`.trim()}>
      <Sidebar isOpen={navOpen} onClose={() => setNavOpen(false)} />
      <div className="content-shell content-shell-responsive">
        <Topbar name={user.fullName ?? user.email} email={user.email} avatarUrl={user.avatarUrl} onMenuToggle={() => setNavOpen((current) => !current)} />
        <main className="page-content page-content-responsive">{children}</main>
        <GetStartedTour userId={user.id} completedInitially={Boolean(user.onboardingCompleted)} />
      </div>
    </div>
  );
}
