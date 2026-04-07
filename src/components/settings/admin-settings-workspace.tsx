"use client";

import { useMemo, useState } from "react";

import { OrganizationAdminPanel } from "@/components/settings/organization-admin-panel";
import { TeamAccessManager } from "@/components/settings/team-access-manager";
import { TeamUserCreateForm } from "@/components/settings/team-user-create-form";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { Role } from "@/lib/models";
import { organizationStatusLabel } from "@/lib/rbac";

type TeamUser = {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  organizationId: string;
  organizationName?: string;
  accountStatus?: string | null;
  deactivatedAt?: string | Date | null;
  scheduledDeletionAt?: string | Date | null;
};

type OrganizationItem = {
  id: string;
  name: string;
  slug: string;
  status: "PENDING_APPROVAL" | "ACTIVE" | "SUSPENDED" | "CONTRACT_ENDED";
  requestedByEmail?: string | null;
  approvedAt?: string | Date | null;
  contractEndsAt?: string | Date | null;
};

export function AdminSettingsWorkspace({
  organizations,
  teamUsers,
  currentUserId,
  currentOrganizationId,
  provisioningReady,
  provisioningMessage
}: {
  organizations: OrganizationItem[];
  teamUsers: TeamUser[];
  currentUserId: string;
  currentOrganizationId: string;
  provisioningReady: boolean;
  provisioningMessage?: string;
}) {
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(currentOrganizationId);

  const selectedOrganization = useMemo(
    () => organizations.find((organization) => organization.id === selectedOrganizationId) ?? organizations[0] ?? null,
    [organizations, selectedOrganizationId]
  );

  const selectedTeamUsers = useMemo(
    () => teamUsers.filter((user) => user.organizationId === selectedOrganization?.id),
    [selectedOrganization?.id, teamUsers]
  );

  const organizationOptions = organizations.map((organization) => ({ id: organization.id, name: organization.name }));

  return (
    <div className="stack-xl">
      <Card>
        <SectionHeading title="Organizations" description="Choose one organization at a time to review contract state, approval status, and employee access without a crowded list." />
        <div className="settings-organization-toolbar">
          <label className="field-shell settings-organization-selector">
            <span>Organization</span>
            <select className="input" value={selectedOrganization?.id ?? ""} onChange={(event) => setSelectedOrganizationId(event.target.value)}>
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>{organization.name}</option>
              ))}
            </select>
          </label>
          {selectedOrganization ? (
            <div className="stats-inline organization-status-strip">
              <span>{organizationStatusLabel(selectedOrganization.status)}</span>
              <span>{selectedTeamUsers.length} employee{selectedTeamUsers.length === 1 ? "" : "s"}</span>
              <span>{selectedOrganization.requestedByEmail || "No requester email"}</span>
            </div>
          ) : null}
        </div>
        {selectedOrganization ? (
          <OrganizationAdminPanel
            organizations={organizations}
            selectedOrganizationId={selectedOrganization.id}
            currentAdminOrganizationId={currentOrganizationId}
          />
        ) : null}
      </Card>

      <div className="two-column-grid workspace-settings-grid-admin">
        <Card>
          <SectionHeading title="Employees" description={selectedOrganization ? `Review and control the team working inside ${selectedOrganization.name}.` : "Review organization employees."} />
          <TeamAccessManager
            initialUsers={selectedTeamUsers}
            currentUserId={currentUserId}
            organizations={organizationOptions}
            currentOrganizationId={selectedOrganization?.id ?? currentOrganizationId}
            canManageRoles
            canManageLifecycle
            selectedOrganizationId={selectedOrganization?.id}
            hideOrganizationFilter
          />
        </Card>
        <Card>
          <SectionHeading title="Create platform account" description={selectedOrganization ? `Create admin, org head, or recruiter accounts directly inside ${selectedOrganization.name}.` : "Create platform accounts inside an organization."} />
          <TeamUserCreateForm
            key={selectedOrganization?.id ?? currentOrganizationId}
            currentRole={Role.ADMIN}
            organizations={organizationOptions}
            defaultOrganizationId={selectedOrganization?.id ?? currentOrganizationId}
            provisioningReady={provisioningReady}
            provisioningMessage={provisioningMessage}
          />
        </Card>
      </div>
    </div>
  );
}
