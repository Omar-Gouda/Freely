import { OrganizationStatus, Role } from "@/lib/models";

export const workspaceManagerRoles = [Role.ADMIN, Role.ORG_HEAD] as const;

export function hasRole(role: Role, allowed: Role[]) {
  return allowed.includes(role);
}

export function requireRole(role: Role, allowed: Role[]) {
  if (!hasRole(role, allowed)) {
    throw new Error("Insufficient permissions");
  }
}

export function canManageWorkspace(role: Role) {
  return role === Role.ADMIN || role === Role.ORG_HEAD;
}

export function canManageGlobalPlatform(role: Role) {
  return role === Role.ADMIN;
}

export function canAssignAnyRole(role: Role) {
  return role === Role.ADMIN;
}

export function canAssignRole(actorRole: Role, targetRole: Role) {
  if (actorRole === Role.ADMIN) {
    return true;
  }

  if (actorRole === Role.ORG_HEAD) {
    return targetRole === Role.RECRUITER;
  }

  return false;
}

export function getAssignableRoles(actorRole: Role): Role[] {
  if (actorRole === Role.ADMIN) {
    return [Role.RECRUITER, Role.ORG_HEAD, Role.ADMIN];
  }

  if (actorRole === Role.ORG_HEAD) {
    return [Role.RECRUITER];
  }

  return [];
}

export function roleLabel(role: Role) {
  switch (role) {
    case Role.ADMIN:
      return "Admin";
    case Role.ORG_HEAD:
      return "Org Head";
    case Role.RECRUITER:
      return "Recruiter";
    default:
      return role;
  }
}

export function organizationStatusLabel(status: OrganizationStatus) {
  switch (status) {
    case OrganizationStatus.PENDING_APPROVAL:
      return "Pending approval";
    case OrganizationStatus.ACTIVE:
      return "Active";
    case OrganizationStatus.SUSPENDED:
      return "Suspended";
    case OrganizationStatus.CONTRACT_ENDED:
      return "Contract ended";
    default:
      return status;
  }
}
