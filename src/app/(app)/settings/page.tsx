import Link from "next/link";

import { Role } from "@/lib/models";

import { TeamAccessManager } from "@/components/settings/team-access-manager";
import { TeamUserCreateForm } from "@/components/settings/team-user-create-form";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { requireSession } from "@/lib/auth";
import { getSupabaseAdminConfigStatus } from "@/lib/config-status";
import { db } from "@/lib/db";
import { roleLabel } from "@/lib/rbac";

type TeamUser = {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  organizationId: string;
  organizationName?: string;
  accountStatus?: string | null;
  deactivatedAt?: Date | null;
  scheduledDeletionAt?: Date | null;
};

type OrganizationItem = { id: string; name: string; slug: string };

export default async function SettingsPage() {
  const session = await requireSession([Role.ADMIN, Role.ORG_HEAD, Role.RECRUITER]);
  const organizations = (await db.organization.findMany({
    orderBy: { name: "asc" }
  })) as OrganizationItem[];
  const organizationDirectory = new Map(organizations.map((organization) => [organization.id, organization.name]));

  const users = (await db.user.findMany({
    where: session.role === Role.ADMIN ? { deletedAt: null } : { organizationId: session.organizationId, deletedAt: null },
    orderBy: { createdAt: "asc" }
  })) as Array<{
    id: string;
    fullName: string;
    email: string;
    role: Role;
    organizationId: string;
    accountStatus?: string | null;
    deactivatedAt?: Date | null;
    scheduledDeletionAt?: Date | null;
  }>;

  const teamUsers: TeamUser[] = users.map((user) => ({
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    organizationId: user.organizationId,
    organizationName: organizationDirectory.get(user.organizationId),
    accountStatus: user.accountStatus ?? "ACTIVE",
    deactivatedAt: user.deactivatedAt ?? null,
    scheduledDeletionAt: user.scheduledDeletionAt ?? null
  }));

  const currentOrganizationName = organizationDirectory.get(session.organizationId) ?? "Current organization";
  const canCreateAccounts = session.role === Role.ADMIN || session.role === Role.ORG_HEAD;
  const adminConfig = getSupabaseAdminConfigStatus();
  const provisioningReady = adminConfig.configured;
  const createTitle = session.role === Role.ADMIN ? "Create platform account" : "Create recruiter account";
  const createDescription = session.role === Role.ADMIN
    ? "Platform admins can create admin, org head, and recruiter accounts and assign them to existing organizations."
    : `Org heads can create recruiter accounts inside ${currentOrganizationName}.`;

  return (
    <div className="stack-xl">
      <SectionHeading title="Workspace settings" description={`Signed in as ${roleLabel(session.role)}. Manage organizations, team access, lifecycle actions, and workspace support from one place.`} />
      <div className="two-column-grid">
        <Card>
          <SectionHeading title="Team access" description={session.role === Role.ADMIN ? "Review every organization, filter by workspace, update roles, and control account lifecycle centrally." : `Review everyone in ${currentOrganizationName}.`} />
          <TeamAccessManager
            initialUsers={teamUsers}
            currentUserId={session.id}
            organizations={organizations.map((organization) => ({ id: organization.id, name: organization.name }))}
            currentOrganizationId={session.organizationId}
            canManageRoles={session.role === Role.ADMIN}
          />
        </Card>
        {canCreateAccounts ? (
          <Card>
            <SectionHeading title={createTitle} description={createDescription} />
            <TeamUserCreateForm
              currentRole={session.role}
                organizations={organizations.map((organization) => ({ id: organization.id, name: organization.name }))}
              defaultOrganizationId={session.organizationId}
              provisioningReady={provisioningReady}
              provisioningMessage={adminConfig.reason ?? ""}
            />
          </Card>
        ) : (
          <Card>
            <SectionHeading title="Workspace access" description="Everything you need as a recruiter without setup clutter." />
            <div className="list-stack compact-checklist">
              <div className="list-row list-row-start"><strong>Your role</strong><small>You currently have {roleLabel(session.role).toLowerCase()} access in {currentOrganizationName}.</small></div>
              <div className="list-row list-row-start"><strong>Need more access?</strong><small>Ask your organization head or platform admin if you need role changes or extra permissions.</small></div>
              <div className="list-row list-row-start"><strong>Need help?</strong><small><Link href="/contact">Contact support</Link> if you hit a bug, need onboarding help, or want a walkthrough.</small></div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}


