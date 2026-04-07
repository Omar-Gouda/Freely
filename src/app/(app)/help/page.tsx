import { SupportInbox } from "@/components/support/support-inbox";
import { SectionHeading } from "@/components/ui/section-heading";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Role } from "@/lib/models";
import { roleLabel } from "@/lib/rbac";

export default async function HelpPage() {
  const session = await requireSession([Role.ADMIN, Role.ORG_HEAD, Role.RECRUITER]);
  const threads = await db.supportThread.findMany({
    where: session.role === Role.ADMIN ? undefined : { requesterUserId: session.id },
    orderBy: { lastMessageAt: "desc" }
  });
  const organizations = await db.organization.findMany({ where: { deletedAt: null } });
  const organizationMap = new Map(organizations.map((organization: { id: string; name: string }) => [organization.id, organization.name]));

  const initialThreads = threads.map((thread: {
    id: string;
    organizationId: string;
    requesterUserId?: string | null;
    requesterName: string;
    requesterEmail: string;
    requesterCompany?: string | null;
    subject: string;
    status: string;
    source: string;
    lastMessageAt: Date;
    resolvedAt?: Date | null;
    messages: Array<{
      id: string;
      authorType: string;
      authorUserId?: string | null;
      authorName: string;
      authorEmail?: string | null;
      body: string;
      createdAt: Date;
      deliveredByEmail?: boolean | null;
    }>;
    createdAt: Date;
    updatedAt: Date;
  }) => ({
    ...thread,
    organizationName: organizationMap.get(thread.organizationId) ?? session.organizationName ?? null
  }));

  return (
    <div className="stack-xl workspace-screen-shell">
      <SectionHeading
        title="Support inbox"
        description={session.role === Role.ADMIN
          ? "Handle workspace issues, public support requests, and follow-ups from one admin channel."
          : `Signed in as ${roleLabel(session.role)}. Open requests here when you need help without leaving ${session.organizationName ?? "your workspace"}.`}
      />
      <SupportInbox
        initialThreads={initialThreads}
        currentUserId={session.id}
        currentUserName={session.fullName ?? session.email}
        role={session.role}
      />
    </div>
  );
}
