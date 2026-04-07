import { InterviewBookingStatus, InterviewStatus, NotificationKind } from "@/lib/models";
import { NextRequest } from "next/server";
import { format } from "date-fns";

import { requireApiSession } from "@/lib/api-auth";
import { createAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { createNotification } from "@/lib/notifications";
import { interviewBookingSchema, interviewEvaluationSchema, interviewSlotSchema, interviewUpdateSchema } from "@/lib/validators";
import { z } from "zod";

async function getAssignedRecruiter(organizationId: string, assignedRecruiterId?: string | null) {
  if (!assignedRecruiterId) {
    return null;
  }

  return db.user.findFirst({
    where: {
      id: assignedRecruiterId,
      organizationId,
      deletedAt: null
    },
    select: {
      id: true,
      email: true,
      fullName: true
    }
  }) as Promise<{ id: string; email: string; fullName: string } | null>;
}

function formatScheduleLabel(startsAt: Date, endsAt: Date) {
  return `${format(startsAt, "EEE, MMM d")} - ${format(startsAt, "h:mm a")} - ${format(endsAt, "h:mm a")}`;
}

function normalizeInterviewEvaluation(input: z.infer<typeof interviewEvaluationSchema>, userId: string) {
  return {
    mustHaveChecks: input.mustHaveChecks.map((item) => ({
      label: item.label,
      checked: item.checked,
      notes: item.notes || null
    })),
    niceToHaveChecks: input.niceToHaveChecks.map((item) => ({
      label: item.label,
      checked: item.checked,
      notes: item.notes || null
    })),
    communicationRating: input.communicationRating ?? null,
    languageRating: input.languageRating ?? null,
    notes: input.notes || null,
    educationNotes: input.educationNotes || null,
    workExperienceNotes: input.workExperienceNotes || null,
    age: input.age || null,
    nationalIdNumber: input.nationalIdNumber || null,
    updatedById: userId,
    updatedAt: new Date()
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireApiSession(request);
  if ("error" in auth) return auth.error;

  const slots = await db.interviewSlot.findMany({
    where: { organizationId: auth.session.organizationId },
    orderBy: { startsAt: "asc" },
    include: { job: true, booking: { include: { candidate: true } } }
  });

  return ok(slots);
}

export async function POST(request: NextRequest) {
  const auth = await requireApiSession(request);
  if ("error" in auth) return auth.error;

  const body = await request.json();

  if (body.candidateId) {
    const payload = interviewBookingSchema.safeParse(body);
    if (!payload.success) {
      return fail("Invalid booking payload", 400, payload.error.flatten());
    }

    const slot = await db.interviewSlot.findFirst({
      where: {
        id: payload.data.slotId,
        organizationId: auth.session.organizationId,
        status: "AVAILABLE"
      },
      include: { job: true }
    });

    if (!slot) {
      return fail("Slot is not available", 409);
    }

    const candidate = await db.candidate.findFirst({
      where: {
        id: payload.data.candidateId,
        organizationId: auth.session.organizationId,
        deletedAt: null
      }
    });

    if (!candidate) {
      return fail("Candidate not found", 404);
    }

    if (candidate.jobId !== slot.jobId) {
      return fail("Candidate must belong to the same role as the interview slot", 409);
    }

    const booking = await db.interviewBooking.create({
      data: {
        slotId: slot.id,
        candidateId: payload.data.candidateId,
        notes: payload.data.notes || undefined,
        status: payload.data.status || "SCHEDULED"
      }
    });

    await db.interviewSlot.update({
      where: { id: slot.id },
      data: { status: "BOOKED" }
    });

    await db.candidate.update({
      where: { id: candidate.id },
      data: { stage: "INTERVIEW_SCHEDULED" }
    });

    await createNotification({
      organizationId: auth.session.organizationId,
      kind: NotificationKind.INTERVIEW_REMINDER,
      title: "Interview scheduled",
      message: `${candidate.firstName} ${candidate.lastName} was assigned to an interview slot for ${slot.job.title}.`
    });

    const assignedRecruiter = await getAssignedRecruiter(auth.session.organizationId, slot.assignedRecruiterId || auth.session.id);
    if (assignedRecruiter) {
      await createNotification({
        organizationId: auth.session.organizationId,
        userId: assignedRecruiter.id,
        kind: NotificationKind.INTERVIEW_REMINDER,
        title: "Interview added to your schedule",
        message: `${candidate.firstName} ${candidate.lastName} - ${slot.job.title} - ${formatScheduleLabel(slot.startsAt, slot.endsAt)}`
      });
    }

    await createAuditLog({
      organizationId: auth.session.organizationId,
      userId: auth.session.id,
      action: "interview.booked",
      entityType: "interview_booking",
      entityId: booking.id,
      meta: payload.data
    });

    return ok(booking, { status: 201 });
  }

  const payload = interviewSlotSchema.safeParse(body);
  if (!payload.success) {
    return fail("Invalid slot payload", 400, payload.error.flatten());
  }

  const startsAt = new Date(payload.data.startsAt);
  const endsAt = new Date(payload.data.endsAt);

  const overlapping = await db.interviewSlot.findFirst({
    where: {
      organizationId: auth.session.organizationId,
      jobId: payload.data.jobId,
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt }
    }
  });

  if (overlapping) {
    return fail("This time slot overlaps with another interview for the same role", 409);
  }

  const slot = await db.interviewSlot.create({
    data: {
      organizationId: auth.session.organizationId,
      jobId: payload.data.jobId,
      assignedRecruiterId: payload.data.assignedRecruiterId || auth.session.id,
      interviewerNames: payload.data.interviewerNames,
      startsAt,
      endsAt,
      location: payload.data.location || undefined,
      notes: payload.data.notes || undefined
    }
  });

  const assignedRecruiter = await getAssignedRecruiter(auth.session.organizationId, slot.assignedRecruiterId);
  if (assignedRecruiter) {
    await createNotification({
      organizationId: auth.session.organizationId,
      userId: assignedRecruiter.id,
      kind: NotificationKind.INTERVIEW_REMINDER,
      title: "Interview slot assigned",
      message: `${formatScheduleLabel(slot.startsAt, slot.endsAt)} is now on your schedule.`
    });
  }

  await createAuditLog({
    organizationId: auth.session.organizationId,
    userId: auth.session.id,
    action: "interview.slot_created",
    entityType: "interview_slot",
    entityId: slot.id
  });

  return ok(slot, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireApiSession(request);
  if ("error" in auth) return auth.error;

  const payload = interviewUpdateSchema.safeParse(await request.json());
  if (!payload.success) {
    return fail("Invalid interview payload", 400, payload.error.flatten());
  }

  const slot = await db.interviewSlot.findFirst({
    where: { id: payload.data.slotId, organizationId: auth.session.organizationId },
    include: { booking: { include: { candidate: true } }, job: true }
  });

  if (!slot) {
    return fail("Interview slot not found", 404);
  }

  if (payload.data.interviewEvaluation && !slot.booking) {
    return fail("An interview scorecard can only be saved for a booked candidate.", 409);
  }

  const nextStartsAt = payload.data.startsAt ? new Date(payload.data.startsAt) : slot.startsAt;
  const nextEndsAt = payload.data.endsAt ? new Date(payload.data.endsAt) : slot.endsAt;

  if (payload.data.startsAt || payload.data.endsAt) {
    const overlapping = await db.interviewSlot.findFirst({
      where: {
        id: { not: slot.id },
        organizationId: auth.session.organizationId,
        jobId: slot.jobId,
        startsAt: { lt: nextEndsAt },
        endsAt: { gt: nextStartsAt }
      }
    });

    if (overlapping) {
      return fail("This reschedule overlaps with another interview for the same role", 409);
    }
  }

  const bookingStatus = payload.data.bookingStatus ?? slot.booking?.status;
  let slotStatus: InterviewStatus = slot.status;

  if (bookingStatus === InterviewBookingStatus.COMPLETED) {
    slotStatus = InterviewStatus.COMPLETED;
  } else if (bookingStatus === InterviewBookingStatus.CANCELLED) {
    slotStatus = InterviewStatus.CANCELLED;
  } else if (slot.booking) {
    slotStatus = InterviewStatus.BOOKED;
  }

  const assignedRecruiterId = payload.data.assignedRecruiterId !== undefined
    ? payload.data.assignedRecruiterId || auth.session.id
    : slot.assignedRecruiterId || auth.session.id;

  const updatedSlot = await db.interviewSlot.update({
    where: { id: slot.id },
    data: {
      startsAt: nextStartsAt,
      endsAt: nextEndsAt,
      assignedRecruiterId,
      location: payload.data.location !== undefined ? payload.data.location || null : slot.location,
      interviewerNames: payload.data.interviewerNames ?? slot.interviewerNames,
      notes: payload.data.slotNotes !== undefined ? payload.data.slotNotes || null : slot.notes,
      status: slotStatus
    },
    include: { booking: { include: { candidate: true } }, job: true }
  });

  if (slot.booking && (payload.data.bookingStatus || payload.data.notes !== undefined || payload.data.interviewEvaluation !== undefined)) {
    await db.interviewBooking.update({
      where: { slotId: slot.id },
      data: {
        status: bookingStatus,
        notes: payload.data.notes !== undefined ? payload.data.notes || null : slot.booking.notes,
        interviewEvaluation: payload.data.interviewEvaluation
          ? normalizeInterviewEvaluation(payload.data.interviewEvaluation, auth.session.id)
          : slot.booking.interviewEvaluation ?? null
      }
    });
  }

  const assignedRecruiter = await getAssignedRecruiter(auth.session.organizationId, assignedRecruiterId);
  if (assignedRecruiter) {
    await createNotification({
      organizationId: auth.session.organizationId,
      userId: assignedRecruiter.id,
      kind: NotificationKind.INTERVIEW_REMINDER,
      title: "Interview schedule updated",
      message: `${slot.job.title} - ${formatScheduleLabel(nextStartsAt, nextEndsAt)}${slot.booking ? ` - ${slot.booking.candidate.firstName} ${slot.booking.candidate.lastName}` : ""}`
    });
  }

  await createAuditLog({
    organizationId: auth.session.organizationId,
    userId: auth.session.id,
    action: "interview.updated",
    entityType: "interview_slot",
    entityId: slot.id,
    meta: payload.data
  });

  return ok(updatedSlot);
}
