"use client";

import { useMemo, useState } from "react";

import { useToast } from "@/components/feedback/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Role, UserAccountStatus } from "@/lib/models";
import { roleLabel } from "@/lib/rbac";

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

type OrganizationOption = {
  id: string;
  name: string;
};

type SettingsResponse = {
  error?: string;
  data?: TeamUser | { userId: string; removed: true };
};

function formatDate(value?: string | Date | null) {
  if (!value) {
    return null;
  }

  return new Date(value).toLocaleString();
}

export function TeamAccessManager({
  initialUsers,
  currentUserId,
  organizations,
  currentOrganizationId,
  canManageRoles
}: {
  initialUsers: TeamUser[];
  currentUserId: string;
  organizations: OrganizationOption[];
  currentOrganizationId: string;
  canManageRoles: boolean;
}) {
  const { pushToast } = useToast();
  const [users, setUsers] = useState(initialUsers);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(canManageRoles ? "all" : currentOrganizationId);
  const [draftRoles, setDraftRoles] = useState<Record<string, Role>>(() => Object.fromEntries(initialUsers.map((user) => [user.id, user.role])));
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    if (!canManageRoles || selectedOrganizationId === "all") {
      return users;
    }

    return users.filter((user) => user.organizationId === selectedOrganizationId);
  }, [canManageRoles, selectedOrganizationId, users]);

  const activeAdminCount = useMemo(
    () => users.filter((user) => user.role === Role.ADMIN && (user.accountStatus ?? UserAccountStatus.ACTIVE) === UserAccountStatus.ACTIVE).length,
    [users]
  );

  async function saveRole(userId: string) {
    const role = draftRoles[userId];
    if (!role) {
      return;
    }

    setBusyAction(`role:${userId}`);
    try {
      const response = await fetch("/api/settings/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "role", userId, role })
      });
      const payload = await response.json().catch(() => ({ error: "Could not update role" })) as SettingsResponse;

      if (!response.ok) {
        pushToast({ title: "Role update failed", description: payload.error ?? "Please try again.", tone: "error" });
        return;
      }

      setUsers((current) => current.map((user) => (user.id === userId ? { ...user, role } : user)));
      pushToast({ title: "Role updated", description: "Workspace access has been updated successfully.", tone: "success" });
    } finally {
      setBusyAction(null);
    }
  }

  async function updateLifecycle(userId: string, action: "deactivate" | "reactivate") {
    setBusyAction(`${action}:${userId}`);
    try {
      const response = await fetch("/api/settings/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, userId })
      });
      const payload = await response.json().catch(() => ({ error: `Could not ${action} account` })) as SettingsResponse;

      if (!response.ok) {
        pushToast({
          title: action === "deactivate" ? "Deactivation failed" : "Reactivation failed",
          description: payload.error ?? "Please try again.",
          tone: "error"
        });
        return;
      }

      if (payload.data && "id" in payload.data) {
        setUsers((current) => current.map((user) => (user.id === userId ? { ...user, ...payload.data } : user)));
      }

      pushToast({
        title: action === "deactivate" ? "Account deactivated" : "Account reactivated",
        description: action === "deactivate"
          ? "The user can no longer sign in. Their account is now scheduled for permanent cleanup in 5 days unless reactivated."
          : "The user can sign in again immediately.",
        tone: "success"
      });
    } finally {
      setBusyAction(null);
    }
  }

  async function removeUser(userId: string, fullName: string) {
    const confirmed = window.confirm(`Permanently remove ${fullName}'s account? This cannot be undone.`);
    if (!confirmed) {
      return;
    }

    setBusyAction(`remove:${userId}`);
    try {
      const response = await fetch("/api/settings/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      });
      const payload = await response.json().catch(() => ({ error: "Could not remove account" })) as SettingsResponse;

      if (!response.ok) {
        pushToast({ title: "Permanent removal failed", description: payload.error ?? "Please try again.", tone: "error" });
        return;
      }

      setUsers((current) => current.filter((user) => user.id !== userId));
      pushToast({ title: "Account removed", description: "The account was removed permanently from Freely.", tone: "success" });
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="team-access-list">
      <div className="team-access-toolbar">
        <div>
          <p className="muted">Admins can filter by organization, deactivate access, reactivate accounts within 5 days, or remove an account permanently.</p>
          <small>{filteredUsers.length} account{filteredUsers.length === 1 ? "" : "s"} visible</small>
        </div>
        {canManageRoles ? (
          <label className="field-shell team-access-filter">
            <span>Organization</span>
            <select className="input compact-input" value={selectedOrganizationId} onChange={(event) => setSelectedOrganizationId(event.target.value)}>
              <option value="all">All organizations</option>
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>{organization.name}</option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {filteredUsers.map((user) => {
        const draftRole = draftRoles[user.id] ?? user.role;
        const isCurrentUser = user.id === currentUserId;
        const accountStatus = user.accountStatus ?? UserAccountStatus.ACTIVE;
        const isDeactivated = accountStatus === UserAccountStatus.DEACTIVATED;
        const isLastAdminSelfDemotion = isCurrentUser && user.role === Role.ADMIN && draftRole !== Role.ADMIN && activeAdminCount <= 1;
        const hasChanged = draftRole !== user.role;
        const isBusy = busyAction?.endsWith(`:${user.id}`) ?? false;
        const scheduledDeletionLabel = formatDate(user.scheduledDeletionAt);

        return (
          <div className="team-access-row team-access-row-rich" key={user.id}>
            <div className="team-access-meta">
              <div className="team-access-heading">
                <strong>{user.fullName}</strong>
                {isCurrentUser ? <Badge>Current user</Badge> : null}
                {user.organizationName ? <Badge>{user.organizationName}</Badge> : null}
                <span className={`account-status-pill${isDeactivated ? " deactivated" : ""}`}>{isDeactivated ? "Deactivated" : "Active"}</span>
              </div>
              <p>{user.email}</p>
              {isDeactivated && scheduledDeletionLabel ? <small>Scheduled for permanent removal on {scheduledDeletionLabel}</small> : null}
            </div>
            <div className="team-access-controls team-access-controls-rich">
              {canManageRoles ? (
                <>
                  <select
                    className="input compact-input"
                    value={draftRole}
                    onChange={(event) => setDraftRoles((current) => ({ ...current, [user.id]: event.target.value as Role }))}
                    disabled={isBusy}
                  >
                    <option value={Role.RECRUITER}>{roleLabel(Role.RECRUITER)}</option>
                    <option value={Role.ORG_HEAD}>{roleLabel(Role.ORG_HEAD)}</option>
                    <option value={Role.ADMIN}>{roleLabel(Role.ADMIN)}</option>
                  </select>
                  <Button type="button" variant="secondary" onClick={() => void saveRole(user.id)} disabled={isBusy || !hasChanged || isLastAdminSelfDemotion}>
                    {busyAction === `role:${user.id}` ? "Saving..." : "Save"}
                  </Button>
                  {isDeactivated ? (
                    <Button type="button" variant="secondary" onClick={() => void updateLifecycle(user.id, "reactivate")} disabled={isBusy || isCurrentUser}>
                      {busyAction === `reactivate:${user.id}` ? "Reactivating..." : "Reactivate"}
                    </Button>
                  ) : (
                    <Button type="button" variant="secondary" onClick={() => void updateLifecycle(user.id, "deactivate")} disabled={isBusy || isCurrentUser}>
                      {busyAction === `deactivate:${user.id}` ? "Deactivating..." : "Deactivate"}
                    </Button>
                  )}
                  <button type="button" className="button button-danger" onClick={() => void removeUser(user.id, user.fullName)} disabled={isBusy || isCurrentUser}>
                    {busyAction === `remove:${user.id}` ? "Removing..." : "Remove"}
                  </button>
                </>
              ) : (
                <>
                  <Badge>{roleLabel(user.role)}</Badge>
                  <span className={`account-status-pill${isDeactivated ? " deactivated" : ""}`}>{isDeactivated ? "Deactivated" : "Active"}</span>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

