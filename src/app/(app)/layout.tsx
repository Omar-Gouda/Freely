import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await requireSession();

  if (!session) {
    redirect("/login");
  }

  return <DashboardShell user={session}>{children}</DashboardShell>;
}