import { deleteDocument, readCollection, replaceDocument } from "@/lib/persistence";
import { log } from "@/lib/logger";
import { UserAccountStatus, type AuditLog, type InterviewSlot, type Notification, type QueueJob, type User } from "@/lib/models";
import { queue, queueNames } from "@/lib/queue";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";

const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

type Stored<T extends { id: string }> = T & { _id: string };

async function listStored<T extends { id: string }>(collection: string) {
  return readCollection<Stored<T>>(collection);
}

async function findStoredUser(userId: string) {
  const users = await listStored<User>("users");
  return users.find((user) => user.id === userId) ?? null;
}

async function tryDeleteSupabaseAccount(user: User, strict = false) {
  if (!user.supabaseAuthId) {
    return;
  }

  try {
    const adminClient = createSupabaseAdminClient();
    const { error } = await adminClient.auth.admin.deleteUser(user.supabaseAuthId);

    if (error) {
      throw error;
    }
  } catch (error) {
    if (strict) {
      throw error;
    }

    log("warn", "Could not delete auth account during user purge", {
      userId: user.id,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

export async function deactivateUserAccount(userId: string) {
  const user = await findStoredUser(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const deactivatedAt = new Date();
  const scheduledDeletionAt = new Date(deactivatedAt.getTime() + FIVE_DAYS_MS);
  const updatedUser: Stored<User> = {
    ...user,
    accountStatus: UserAccountStatus.DEACTIVATED,
    deactivatedAt,
    scheduledDeletionAt,
    updatedAt: deactivatedAt
  };

  await replaceDocument("users", updatedUser);
  await queue.send(queueNames.userPurge, {
    userId,
    expectedDeletionAt: scheduledDeletionAt.toISOString()
  }, {
    runAfter: scheduledDeletionAt,
    maxAttempts: 1
  });

  return updatedUser;
}

export async function reactivateUserAccount(userId: string) {
  const user = await findStoredUser(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const updatedUser: Stored<User> = {
    ...user,
    accountStatus: UserAccountStatus.ACTIVE,
    deactivatedAt: null,
    scheduledDeletionAt: null,
    updatedAt: new Date()
  };

  await replaceDocument("users", updatedUser);
  return updatedUser;
}

export async function hardDeleteUserAccount(userId: string, options?: { strictAuthDelete?: boolean }) {
  const user = await findStoredUser(userId);
  if (!user) {
    return null;
  }

  await tryDeleteSupabaseAccount(user, Boolean(options?.strictAuthDelete));

  const notifications = await listStored<Notification>("notifications");
  await Promise.all(
    notifications
      .filter((notification) => notification.userId === userId)
      .map((notification) => deleteDocument("notifications", notification.id))
  );

  const logs = await listStored<AuditLog>("auditLogs");
  await Promise.all(
    logs
      .filter((logEntry) => logEntry.userId === userId)
      .map((logEntry) => replaceDocument("auditLogs", {
        ...logEntry,
        userId: null
      }))
  );

  const interviewSlots = await listStored<InterviewSlot>("interviewSlots");
  await Promise.all(
    interviewSlots
      .filter((slot) => slot.assignedRecruiterId === userId)
      .map((slot) => replaceDocument("interviewSlots", {
        ...slot,
        assignedRecruiterId: null,
        updatedAt: new Date()
      }))
  );

  const queueJobs = await listStored<QueueJob>("queueJobs");
  await Promise.all(
    queueJobs
      .filter((job) => job.name === queueNames.userPurge && String(job.data.userId ?? "") === userId)
      .map((job) => deleteDocument("queueJobs", job.id))
  );

  await deleteDocument("users", user.id);
  return user;
}

export async function purgeDeactivatedUserIfDue(userId: string, expectedDeletionAt?: string) {
  const user = await findStoredUser(userId);
  if (!user) {
    return false;
  }

  if (user.accountStatus !== UserAccountStatus.DEACTIVATED || !user.scheduledDeletionAt) {
    return false;
  }

  if (expectedDeletionAt && user.scheduledDeletionAt.toISOString() !== expectedDeletionAt) {
    return false;
  }

  if (user.scheduledDeletionAt.getTime() > Date.now()) {
    return false;
  }

  await hardDeleteUserAccount(userId, { strictAuthDelete: true });
  return true;
}

