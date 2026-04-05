"use client";

import { useRef, useState } from "react";

import { useToast } from "@/components/feedback/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Role } from "@/lib/models";
import { getAssignableRoles, roleLabel } from "@/lib/rbac";

type OrganizationOption = {
  id: string;
  name: string;
};

type CreateUserResponse = {
  error?: string;
  data?: {
    emailWarning?: string | null;
  };
};

export function TeamUserCreateForm({
  currentRole,
  organizations,
  defaultOrganizationId,
  provisioningReady,
  provisioningMessage
}: {
  currentRole: Role;
  organizations: OrganizationOption[];
  defaultOrganizationId: string;
  provisioningReady: boolean;
  provisioningMessage?: string;
}) {
  const { pushToast } = useToast();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [loading, setLoading] = useState(false);
  const assignableRoles = getAssignableRoles(currentRole);

  async function handleSubmit(formData: FormData) {
    setLoading(true);

    try {
      const response = await fetch("/api/settings/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: String(formData.get("fullName") ?? ""),
          email: String(formData.get("email") ?? ""),
          password: String(formData.get("password") ?? ""),
          role: String(formData.get("role") ?? Role.RECRUITER),
          organizationId: String(formData.get("organizationId") ?? defaultOrganizationId)
        })
      });
      const payload = await response.json().catch(() => ({ error: "Could not create team account" })) as CreateUserResponse;

      if (!response.ok) {
        pushToast({ title: "Team account failed", description: payload.error ?? "Please try again.", tone: "error" });
        return;
      }

      formRef.current?.reset();
      pushToast({ title: "Team account created", description: "The new team member can now sign in with the credentials you created.", tone: "success" });

      if (payload.data?.emailWarning) {
        pushToast({ title: "Email not delivered", description: payload.data.emailWarning, tone: "info" });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form ref={formRef} className="form-grid" action={handleSubmit}>
      <Input name="fullName" placeholder="Team member name" required />
      <Input name="email" type="email" placeholder="team@company.com" required />
      <Input name="password" type="password" placeholder="Temporary password" required />
      <select name="role" className="input" defaultValue={assignableRoles[0] ?? Role.RECRUITER}>
        {assignableRoles.map((role) => (
          <option key={role} value={role}>{roleLabel(role)}</option>
        ))}
      </select>
      {currentRole === Role.ADMIN ? (
        <select name="organizationId" className="input" defaultValue={defaultOrganizationId}>
          {organizations.map((organization) => (
            <option key={organization.id} value={organization.id}>{organization.name}</option>
          ))}
        </select>
      ) : null}
      {!provisioningReady ? <p className="muted">{provisioningMessage || "Account creation needs the server-side account management key before this form can be used."}</p> : null}
      <Button type="submit" disabled={loading || !provisioningReady}>{loading ? "Creating..." : "Create authorized team account"}</Button>
    </form>
  );
}
