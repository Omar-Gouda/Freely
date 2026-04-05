import { format } from "date-fns";

import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { InterviewBookingStatus, InterviewStatus, NotificationKind } from "@/lib/models";
import { createNotification } from "@/lib/notifications";
import { queue, queueNames } from "@/lib/queue";

const REMINDER_LEAD_TIME_MS = 12 * 60 * 60 * 1000;
const MINIMUM_REMINDER_DELAY_MS = 60 * 1000;
const REMINDER_GRACE_WINDOW_MS = 5 * 60 * 1000;

type InterviewReminderTrigger = "booked" | "manual" | "scheduled";

type ReminderRecipient = {
  id: string;
  email: string;
  fullName: string;
};

type ScheduledInterviewReminderJob = {
  organizationId: string;
  slotId: string;
  expectedStartAt: string;
  expectedRecruiterId: string;
};

type ReminderDelivery = {
  recruiter: Awaited<ReturnType<typeof sendEmail>>;
  candidate: Awaited<ReturnType<typeof sendEmail>> | null;
  anyDelivered: boolean;
  skippedReason?: string;
};

function getReminderRunAt(startsAt: Date) {
  return new Date(Math.max(Date.now() + MINIMUM_REMINDER_DELAY_MS, startsAt.getTime() - REMINDER_LEAD_TIME_MS));
}

async function getRecruiterRecipient(organizationId: string, recruiterId: string): Promise<ReminderRecipient | null> {
  return db.user.findFirst({
    where: {
      id: recruiterId,
      organizationId,
      deletedAt: null
    },
    select: {
      id: true,
      email: true,
      fullName: true
    }
  }) as Promise<ReminderRecipient | null>;
}

export async function sendInterviewReminder(input: {
  organizationId: string;
  recruiterId: string;
  recruiterEmail: string;
  recruiterName: string;
  jobTitle: string;
  candidateName?: string | null;
  candidateEmail?: string | null;
  startsAt: Date;
  endsAt: Date;
  location?: string | null;
  notes?: string | null;
  trigger: InterviewReminderTrigger;
}): Promise<ReminderDelivery> {
  const dateLabel = format(input.startsAt, "EEEE, MMM d");
  const timeLabel = `${format(input.startsAt, "h:mm a")} - ${format(input.endsAt, "h:mm a")}`;
  const recruiterSubject = input.trigger === "booked"
    ? `Interview scheduled: ${input.jobTitle}`
    : `Interview reminder: ${input.jobTitle}`;
  const recruiterIntro = input.trigger === "booked"
    ? `A new interview was added to your schedule for ${input.jobTitle}.`
    : `This is a reminder for your upcoming interview on ${input.jobTitle}.`;
  const recruiterText = [
    `Hello ${input.recruiterName},`,
    "",
    recruiterIntro,
    `Date: ${dateLabel}`,
    `Time: ${timeLabel}`,
    `Candidate: ${input.candidateName || "Unassigned"}`,
    `Location: ${input.location || "Virtual / TBD"}`,
    input.notes ? `Notes: ${input.notes}` : ""
  ].filter(Boolean).join("\n");

  const recruiterDelivery = await sendEmail({
    to: input.recruiterEmail,
    subject: recruiterSubject,
    text: recruiterText,
    html: `
      <div style="font-family: Manrope, Arial, sans-serif; color: #24123a; line-height: 1.6;">
        <p>Hello ${input.recruiterName},</p>
        <p>${recruiterIntro.replace(input.jobTitle, `<strong>${input.jobTitle}</strong>`)}</p>
        <p><strong>Date:</strong> ${dateLabel}<br /><strong>Time:</strong> ${timeLabel}<br /><strong>Candidate:</strong> ${input.candidateName || "Unassigned"}<br /><strong>Location:</strong> ${input.location || "Virtual / TBD"}</p>
        ${input.notes ? `<p><strong>Notes:</strong> ${input.notes}</p>` : ""}
      </div>
    `
  });

  let candidateDelivery: Awaited<ReturnType<typeof sendEmail>> | null = null;

  if (input.candidateEmail && input.candidateName) {
    const candidateFirstName = input.candidateName.split(" ")[0] || input.candidateName;
    const candidateSubject = input.trigger === "booked"
      ? `Interview scheduled for ${input.jobTitle}`
      : `Interview reminder for ${input.jobTitle}`;
    const candidateIntro = input.trigger === "booked"
      ? `Your interview for ${input.jobTitle} has been scheduled.`
      : `This is a reminder for your upcoming interview for ${input.jobTitle}.`;

    candidateDelivery = await sendEmail({
      to: input.candidateEmail,
      subject: candidateSubject,
      text: [
        `Hello ${candidateFirstName},`,
        "",
        candidateIntro,
        `Date: ${dateLabel}`,
        `Time: ${timeLabel}`,
        `Location: ${input.location || "Virtual / TBD"}`,
        input.notes ? `Additional notes: ${input.notes}` : ""
      ].filter(Boolean).join("\n")
    });
  }

  await createNotification({
    organizationId: input.organizationId,
    userId: input.recruiterId,
    kind: NotificationKind.INTERVIEW_REMINDER,
    title: input.trigger === "booked" ? "Interview added to your schedule" : "Interview reminder sent",
    message: `${input.jobTitle} on ${dateLabel} at ${timeLabel}`
  });

  const anyDelivered = !recruiterDelivery.skipped || Boolean(candidateDelivery && !candidateDelivery.skipped);
  const skippedReason = recruiterDelivery.reason ?? candidateDelivery?.reason;

  return {
    recruiter: recruiterDelivery,
    candidate: candidateDelivery,
    anyDelivered,
    skippedReason
  };
}

export async function enqueueInterviewReminder(input: {
  organizationId: string;
  slotId: string;
  startsAt: Date;
  assignedRecruiterId?: string | null;
  bookingStatus?: string | null;
}) {
  if (!input.assignedRecruiterId) {
    return null;
  }

  if (
    input.bookingStatus === InterviewBookingStatus.CANCELLED ||
    input.bookingStatus === InterviewBookingStatus.COMPLETED ||
    input.bookingStatus === InterviewBookingStatus.NO_SHOW
  ) {
    return null;
  }

  const payload: ScheduledInterviewReminderJob = {
    organizationId: input.organizationId,
    slotId: input.slotId,
    expectedStartAt: input.startsAt.toISOString(),
    expectedRecruiterId: input.assignedRecruiterId
  };

  return queue.send(queueNames.interviewReminder, payload, {
    runAfter: getReminderRunAt(input.startsAt),
    priority: 2,
    maxAttempts: 5
  });
}

export async function processInterviewReminderJob(payload: ScheduledInterviewReminderJob) {
  const slot = await db.interviewSlot.findFirst({
    where: {
      id: payload.slotId,
      organizationId: payload.organizationId
    },
    include: {
      job: true,
      booking: {
        include: {
          candidate: true
        }
      }
    }
  });

  if (!slot || !slot.booking || !slot.assignedRecruiterId) {
    return;
  }

  if (slot.status === InterviewStatus.CANCELLED || slot.status === InterviewStatus.COMPLETED) {
    return;
  }

  if (
    slot.booking.status === InterviewBookingStatus.CANCELLED ||
    slot.booking.status === InterviewBookingStatus.COMPLETED ||
    slot.booking.status === InterviewBookingStatus.NO_SHOW
  ) {
    return;
  }

  if (slot.startsAt.toISOString() !== payload.expectedStartAt) {
    return;
  }

  if ((slot.assignedRecruiterId ?? "") !== payload.expectedRecruiterId) {
    return;
  }

  if (slot.reminderSentAt) {
    const minimumFreshReminderTime = slot.startsAt.getTime() - REMINDER_LEAD_TIME_MS - REMINDER_GRACE_WINDOW_MS;
    if (slot.reminderSentAt.getTime() >= minimumFreshReminderTime) {
      return;
    }
  }

  const recruiter = await getRecruiterRecipient(payload.organizationId, slot.assignedRecruiterId);
  if (!recruiter) {
    return;
  }

  const delivery = await sendInterviewReminder({
    organizationId: payload.organizationId,
    recruiterId: recruiter.id,
    recruiterEmail: recruiter.email,
    recruiterName: recruiter.fullName,
    jobTitle: slot.job.title,
    candidateName: slot.booking ? `${slot.booking.candidate.firstName} ${slot.booking.candidate.lastName}` : null,
    candidateEmail: slot.booking?.candidate.email ?? null,
    startsAt: slot.startsAt,
    endsAt: slot.endsAt,
    location: slot.location,
    notes: slot.notes,
    trigger: "scheduled"
  });

  if (delivery.anyDelivered) {
    await db.interviewSlot.update({
      where: { id: slot.id },
      data: { reminderSentAt: new Date() }
    });
  }
}
