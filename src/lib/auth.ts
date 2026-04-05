import { randomUUID } from "crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { Role, UserAccountStatus, type User } from "@/lib/models";
import { createClient } from "@/utils/supabase/server";

export type Session = {
  id: string;
  email: string;
  organizationId: string;
  role: Role;
  fullName?: string | null;
  avatarUrl?: string | null;
  onboardingCompleted?: boolean | null;
};

type SupabaseUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

async function getSupabase(): Promise<ReturnType<typeof createClient>> {
  const cookieStore = await cookies();
  return createClient(cookieStore);
}

function getUserMetadataValue(user: SupabaseUser, key: string): string | null {
  const value = user.user_metadata?.[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function getDefaultWorkspaceName(user: SupabaseUser, email: string) {
  const metadataWorkspace = getUserMetadataValue(user, "workspace_name");
  if (metadataWorkspace) {
    return metadataWorkspace;
  }

  const fullName = getUserMetadataValue(user, "full_name");
  if (fullName) {
    return `${fullName}'s Workspace`;
  }

  const emailPrefix = email.split("@")[0]?.replace(/[._-]+/g, " ").trim() || "workspace";
  return `${emailPrefix.replace(/\b\w/g, (value) => value.toUpperCase())}'s Workspace`;
}

export function getSupabaseEmail(user: SupabaseUser): string {
  const email = user.email?.trim().toLowerCase();
  if (!email) {
    throw new Error("Supabase user email is missing");
  }

  return email;
}

export function toOrganizationSlug(name: string) {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || `workspace-${randomUUID().slice(0, 8)}`;
}

export async function getUniqueOrganizationSlug(name: string) {
  const baseSlug = toOrganizationSlug(name);
  let nextSlug = baseSlug;
  let suffix = 1;

  while (await db.organization.findFirst({ where: { slug: nextSlug } })) {
    suffix += 1;
    nextSlug = `${baseSlug}-${suffix}`;
  }

  return nextSlug;
}

async function createWorkspaceUserFromSupabase(supabaseUser: SupabaseUser): Promise<User> {
  const email = getSupabaseEmail(supabaseUser);
  const fullName = getUserMetadataValue(supabaseUser, "full_name") ?? email.split("@")[0] ?? "Workspace Owner";
  const workspaceName = getDefaultWorkspaceName(supabaseUser, email);
  const slug = await getUniqueOrganizationSlug(workspaceName);

  const organization = await db.organization.create({
    data: {
      name: workspaceName,
      slug
    }
  });

  return db.user.create({
    data: {
      organizationId: organization.id,
      supabaseAuthId: supabaseUser.id,
      email,
      passwordHash: "",
      fullName,
      role: Role.ORG_HEAD,
      accountStatus: UserAccountStatus.ACTIVE,
      deactivatedAt: null,
      scheduledDeletionAt: null,
      onboardingCompleted: false
    }
  });
}

async function syncLocalUser(dbUser: User, supabaseUser: SupabaseUser): Promise<User> {
  const nextEmail = getSupabaseEmail(supabaseUser);
  const nextFullName = getUserMetadataValue(supabaseUser, "full_name") ?? dbUser.fullName;
  const updates: Record<string, unknown> = {};

  if (dbUser.supabaseAuthId !== supabaseUser.id) {
    updates.supabaseAuthId = supabaseUser.id;
  }

  if (dbUser.email !== nextEmail) {
    updates.email = nextEmail;
  }

  if (dbUser.pendingEmail && dbUser.pendingEmail.toLowerCase() === nextEmail) {
    updates.pendingEmail = null;
  }

  if (nextFullName !== dbUser.fullName) {
    updates.fullName = nextFullName;
  }

  if (!dbUser.accountStatus) {
    updates.accountStatus = UserAccountStatus.ACTIVE;
  }

  if (dbUser.deactivatedAt === undefined) {
    updates.deactivatedAt = null;
  }

  if (dbUser.scheduledDeletionAt === undefined) {
    updates.scheduledDeletionAt = null;
  }

  if (!Object.keys(updates).length) {
    return {
      ...dbUser,
      accountStatus: dbUser.accountStatus ?? UserAccountStatus.ACTIVE,
      deactivatedAt: dbUser.deactivatedAt ?? null,
      scheduledDeletionAt: dbUser.scheduledDeletionAt ?? null
    } as User;
  }

  return db.user.update({
    where: { id: dbUser.id },
    data: updates
  });
}

export async function syncApprovedLocalUser(supabaseUser: SupabaseUser): Promise<User | null> {
  const email = getSupabaseEmail(supabaseUser);
  const dbUser = await db.user.findFirst({
    where: {
      OR: [{ supabaseAuthId: supabaseUser.id }, { email }],
      deletedAt: null
    }
  });

  if (!dbUser) {
    if (!getUserMetadataValue(supabaseUser, "workspace_name")) {
      return null;
    }

    return createWorkspaceUserFromSupabase(supabaseUser);
  }

  return syncLocalUser(dbUser, supabaseUser);
}

export async function getSession(): Promise<Session | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY) {
    return null;
  }

  const supabase = await getSupabase();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const syncedUser = await syncApprovedLocalUser(user);
  if (!syncedUser || syncedUser.deletedAt || syncedUser.accountStatus === UserAccountStatus.DEACTIVATED) {
    return null;
  }

  return {
    id: syncedUser.id,
    email: syncedUser.email,
    organizationId: syncedUser.organizationId,
    role: syncedUser.role,
    fullName: syncedUser.fullName,
    avatarUrl: syncedUser.avatarUrl,
    onboardingCompleted: syncedUser.onboardingCompleted ?? false
  };
}

export async function requireSession(allowedRoles?: Role[]): Promise<Session> {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (allowedRoles && !allowedRoles.includes(session.role)) {
    redirect("/dashboard");
  }

  return session;
}

export async function signOutSession(): Promise<void> {
  const supabase = await getSupabase();
  await supabase.auth.signOut();
}

export async function redirectToSignIn() {
  redirect("/login");
}
