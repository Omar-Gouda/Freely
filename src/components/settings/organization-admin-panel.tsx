"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useToast } from "@/components/feedback/toast";
import { Button } from "@/components/ui/button";
import { organizationStatusLabel } from "@/lib/rbac";

type OrganizationItem = {
  id: string;
  name: string;
  status: "PENDING_APPROVAL" | "ACTIVE" | "SUSPENDED" | "CONTRACT_ENDED";
  requestedByEmail?: string | null;
  approvedAt?: string | Date | null;
  contractEndsAt?: string | Date | null;
};

function formatDate(value?: string | Date | null) {
  return value ? new Date(value).toLocaleDateString() : "Not set";
}

export function OrganizationAdminPanel({
  organizations,
  selectedOrganizationId,
  currentAdminOrganizationId
}: {
  organizations: OrganizationItem[];
  selectedOrganizationId: string;
  currentAdminOrganizationId: string;
}) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const organization = useMemo(
    () => organizations.find((item) => item.id === selectedOrganizationId) ?? organizations[0] ?? null,
    [organizations, selectedOrganizationId]
  );

  async function runAction(organizationId: string, action: "approve" | "suspend" | "reactivate" | "end_contract" | "archive") {
    setBusyAction(`${action}:${organizationId}`);

    try {
      const response = await fetch("/api/organizations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId, action })
      });

      const payload = await response.json().catch(() => ({ error: "Organization action failed" }));
      if (!response.ok) {
        pushToast({ title: "Organization update failed", description: payload.error ?? "Please try again.", tone: "error" });
        return;
      }

      pushToast({ title: "Organization updated", description: "The organization lifecycle status was updated successfully.", tone: "success" });
      router.refresh();
    } finally {
      setBusyAction(null);
    }
  }

  if (!organization) {
    return null;
  }

  const isProtectedAdminWorkspace = organization.id === currentAdminOrganizationId;
  const isBusy = (action: string) => busyAction === `${action}:${organization.id}`;

  return (
    <div className="organization-admin-focus-card">
      <div className="organization-admin-focus-head">
        <div className="organization-admin-meta">
          <strong>{organization.name}</strong>
          <p>{organization.requestedByEmail || "No requester email saved"}</p>
          <small>{organizationStatusLabel(organization.status)}</small>
        </div>
        {isProtectedAdminWorkspace ? <span className="support-thread-status support-thread-status-open">Protected admin workspace</span> : null}
      </div>

      <div className="organization-admin-facts">
        <div>
          <span>Status</span>
          <strong>{organizationStatusLabel(organization.status)}</strong>
        </div>
        <div>
          <span>Approved</span>
          <strong>{formatDate(organization.approvedAt)}</strong>
        </div>
        <div>
          <span>Contract end</span>
          <strong>{formatDate(organization.contractEndsAt)}</strong>
        </div>
      </div>

      <div className="organization-admin-actions">
        {organization.status === "PENDING_APPROVAL" ? (
          <Button type="button" variant="secondary" onClick={() => void runAction(organization.id, "approve")} disabled={Boolean(busyAction)}>
            {isBusy("approve") ? "Approving..." : "Approve workspace"}
          </Button>
        ) : null}

        {organization.status === "ACTIVE" ? (
          <>
            <Button type="button" variant="secondary" onClick={() => void runAction(organization.id, "suspend")} disabled={Boolean(busyAction) || isProtectedAdminWorkspace}>
              {isBusy("suspend") ? "Suspending..." : "Suspend workspace"}
            </Button>
            <button type="button" className="button button-danger" onClick={() => void runAction(organization.id, "end_contract")} disabled={Boolean(busyAction) || isProtectedAdminWorkspace}>
              {isBusy("end_contract") ? "Ending..." : "End contract"}
            </button>
          </>
        ) : null}

        {(organization.status === "SUSPENDED" || organization.status === "CONTRACT_ENDED") ? (
          <Button type="button" variant="secondary" onClick={() => void runAction(organization.id, "reactivate")} disabled={Boolean(busyAction)}>
            {isBusy("reactivate") ? "Reactivating..." : "Reactivate workspace"}
          </Button>
        ) : null}
      </div>

      {isProtectedAdminWorkspace ? (
        <p className="muted">The Freely admin workspace is always protected so the platform cannot lock itself out of governance controls.</p>
      ) : null}
    </div>
  );
}
