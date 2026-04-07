import { NextRequest } from "next/server";
import { z } from "zod";

import { requireApiSession } from "@/lib/api-auth";
import { createAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { OrganizationStatus, Role, UserAccountStatus } from "@/lib/models";

const organizationActionSchema = z.object({
  organizationId: z.string().min(1),
  action: z.enum(["approve", "suspend", "reactivate", "end_contract", "archive"]),
  note: z.string().max(400).optional().or(z.literal(""))
});

export async function GET(request: NextRequest) {
  const auth = await requireApiSession(request, [Role.ADMIN]);
  if ("error" in auth) return auth.error;

  const organizations = await db.organization.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" }
  });

  return ok(organizations);
}

export async function PATCH(request: NextRequest) {
  const auth = await requireApiSession(request, [Role.ADMIN]);
  if ("error" in auth) return auth.error;

  const payload = organizationActionSchema.safeParse(await request.json());
  if (!payload.success) {
    return fail("Invalid organization action payload", 400, payload.error.flatten());
  }

  const organization = await db.organization.findFirst({
    where: { id: payload.data.organizationId, deletedAt: null }
  });

  if (!organization) {
    return fail("Organization not found", 404);
  }

  if (organization.id === auth.session.organizationId && ["suspend", "end_contract", "archive"].includes(payload.data.action)) {
    return fail("The admin workspace must stay active and cannot be suspended, archived, or ended.", 409);
  }

  const note = payload.data.note?.trim() || null;
  let data: Record<string, unknown> = {
    approvalNotes: note
  };

  switch (payload.data.action) {
    case "approve":
      data = {
        ...data,
        status: OrganizationStatus.ACTIVE,
        approvedAt: new Date(),
        approvedById: auth.session.id,
        deactivatedAt: null
      };
      break;
    case "suspend":
      data = {
        ...data,
        status: OrganizationStatus.SUSPENDED,
        deactivatedAt: new Date()
      };
      break;
    case "reactivate":
      data = {
        ...data,
        status: OrganizationStatus.ACTIVE,
        deactivatedAt: null
      };
      break;
    case "end_contract":
      data = {
        ...data,
        status: OrganizationStatus.CONTRACT_ENDED,
        contractEndsAt: new Date(),
        deactivatedAt: new Date()
      };
      break;
    case "archive":
      data = {
        ...data,
        deletedAt: new Date(),
        deactivatedAt: new Date()
      };
      break;
  }

  const updatedOrganization = await db.organization.update({
    where: { id: organization.id },
    data
  });

  const orgUsers = await db.user.findMany({
    where: { organizationId: organization.id, deletedAt: null }
  });

  if (payload.data.action === "suspend" || payload.data.action === "end_contract" || payload.data.action === "archive") {
    for (const user of orgUsers) {
      if ((user.accountStatus ?? UserAccountStatus.ACTIVE) === UserAccountStatus.ACTIVE) {
        await db.user.update({
          where: { id: user.id },
          data: {
            accountStatus: UserAccountStatus.DEACTIVATED,
            deactivatedAt: new Date(),
            scheduledDeletionAt: null
          }
        });
      }
    }
  }

  if (payload.data.action === "approve" || payload.data.action === "reactivate") {
    for (const user of orgUsers) {
      if ((user.accountStatus ?? UserAccountStatus.ACTIVE) === UserAccountStatus.DEACTIVATED) {
        await db.user.update({
          where: { id: user.id },
          data: {
            accountStatus: UserAccountStatus.ACTIVE,
            deactivatedAt: null,
            scheduledDeletionAt: null
          }
        });
      }
    }
  }

  await createAuditLog({
    organizationId: organization.id,
    userId: auth.session.id,
    action: `organization.${payload.data.action}`,
    entityType: "organization",
    entityId: organization.id,
    meta: { note }
  });

  return ok(updatedOrganization);
}

