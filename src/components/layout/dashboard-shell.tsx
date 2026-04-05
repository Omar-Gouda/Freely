import type { ReactNode } from "react";

import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { GetStartedTour } from "@/components/onboarding/get-started-tour";

export function DashboardShell({
  children,
  user
}: {
  children: ReactNode;
  user: { id: string; fullName?: string | null; email: string; avatarUrl?: string | null; onboardingCompleted?: boolean | null };
}) {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="content-shell">
        <Topbar name={user.fullName ?? user.email} email={user.email} avatarUrl={user.avatarUrl} />
        <main className="page-content">{children}</main>
        <GetStartedTour userId={user.id} completedInitially={Boolean(user.onboardingCompleted)} />
      </div>
    </div>
  );
}