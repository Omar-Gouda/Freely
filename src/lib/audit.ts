import { db } from "@/lib/db";

export async function createAuditLog(input: {
  organizationId: string;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  meta?: Record<string, unknown>;
}) {
  return db.auditLog.create({
    data: input
  });
}
