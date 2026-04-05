import { format } from "date-fns";

import { CalendarView } from "@/components/interviews/calendar-view";
import { InterviewBookingForm, InterviewSlotForm } from "@/components/interviews/interview-slot-form";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";

type InterviewSlotItem = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  status: string;
  location: string | null;
  interviewerNames: string[];
  notes: string | null;
  assignedRecruiterId: string | null;
  job: { title: string };
  booking: { status: string; notes: string | null; candidate: { id: string; firstName: string; lastName: string; jobId?: string } } | null;
};

type InterviewsPageProps = {
  searchParams?: Promise<{ jobId?: string }>;
};

export default async function InterviewsPage({ searchParams }: InterviewsPageProps) {
  const session = await requireSession();
  const params = (searchParams ? await searchParams : {}) ?? {};
  const jobs = (await db.job.findMany({
    where: { organizationId: session.organizationId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true }
  })) as Array<{ id: string; title: string }>;
  const selectedJobId = params.jobId ?? jobs[0]?.id ?? "";

  const [recruiters, slots, candidates] = selectedJobId
    ? ((await Promise.all([
        db.user.findMany({ where: { organizationId: session.organizationId, deletedAt: null }, select: { id: true, fullName: true, email: true } }),
        db.interviewSlot.findMany({
          where: { organizationId: session.organizationId, jobId: selectedJobId },
          orderBy: { startsAt: "asc" },
          include: {
            job: true,
            booking: { include: { candidate: true } }
          },
          take: 120
        }),
        db.candidate.findMany({
          where: { organizationId: session.organizationId, deletedAt: null, jobId: selectedJobId },
          orderBy: { rankingScore: "desc" },
          select: { id: true, firstName: true, lastName: true }
        })
      ])) as unknown as [Array<{ id: string; fullName: string; email: string }>, InterviewSlotItem[], Array<{ id: string; firstName: string; lastName: string }>])
    : [[], [], []];

  const recruiterDirectory = recruiters.reduce<Record<string, string>>((accumulator, recruiter) => {
    accumulator[recruiter.id] = recruiter.fullName;
    return accumulator;
  }, {});

  const calendarSlots = slots.map((slot) => ({
    id: slot.id,
    startsAt: slot.startsAt.toISOString(),
    endsAt: slot.endsAt.toISOString(),
    status: slot.status,
    location: slot.location,
    interviewerNames: slot.interviewerNames,
    notes: slot.notes,
    jobTitle: slot.job.title,
    candidateName: slot.booking ? `${slot.booking.candidate.firstName} ${slot.booking.candidate.lastName}` : null,
    candidateId: slot.booking?.candidate.id ?? null,
    bookingStatus: slot.booking?.status ?? null,
    notesFromBooking: slot.booking?.notes ?? null,
    assignedRecruiterId: slot.assignedRecruiterId ?? null,
    assignedRecruiterName: slot.assignedRecruiterId ? recruiterDirectory[slot.assignedRecruiterId] ?? null : null
  }));

  const availableSlots = calendarSlots
    .filter((slot) => slot.status === "AVAILABLE")
    .map((slot) => ({
      id: slot.id,
      label: `${format(new Date(slot.startsAt), "MMM d, HH:mm")} - ${slot.jobTitle}`
    }));

  const metrics = {
    total: slots.length,
    assignedToMe: slots.filter((slot) => slot.assignedRecruiterId === session.id).length,
    booked: slots.filter((slot) => slot.status === "BOOKED" || slot.status === "COMPLETED").length,
    open: slots.filter((slot) => slot.status === "AVAILABLE").length
  };

  return (
    <div className="stack-xl">
      <SectionHeading title="Interview scheduling" description="See the month view, drill into each day, and manage recruiter schedules without losing the role context." />

      <div className="stats-grid dashboard-stats-grid">
        <Card><strong>{metrics.total}</strong><span>Visible slots</span></Card>
        <Card><strong>{metrics.assignedToMe}</strong><span>Assigned to me</span></Card>
        <Card><strong>{metrics.booked}</strong><span>Booked interviews</span></Card>
        <Card><strong>{metrics.open}</strong><span>Open slots</span></Card>
      </div>

      <div className="page-grid-wide interview-layout-grid">
        <div className="stack-xl">
          <Card className="filter-bar">
            <form method="GET" className="filter-bar-inline">
              <select name="jobId" className="input" defaultValue={selectedJobId}>
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>{job.title}</option>
                ))}
              </select>
              <div className="filter-actions">
                <button type="submit" className="button button-primary">Open schedule</button>
              </div>
            </form>
            <div className="filter-summary">
              <strong>{jobs.find((job) => job.id === selectedJobId)?.title ?? "No role selected"}</strong>
              <span>{slots.length} slot{slots.length === 1 ? "" : "s"} tracked for this job</span>
            </div>
          </Card>

          <Card className="interview-calendar-card">
            <CalendarView slots={calendarSlots} recruiters={recruiters.map((recruiter) => ({ id: recruiter.id, fullName: recruiter.fullName }))} currentUserId={session.id} />
          </Card>
        </div>

        <div className="stack-xl sticky-card">
          <Card>
            <SectionHeading title="Create interview slot" description="Block time, assign the recruiter, and add the meeting context once." />
            <InterviewSlotForm jobs={jobs} recruiters={recruiters.map((recruiter) => ({ id: recruiter.id, fullName: recruiter.fullName }))} selectedJobId={selectedJobId} currentUserId={session.id} />
          </Card>
          <Card>
            <SectionHeading title="Assign candidate" description="Attach a candidate to any open slot in the selected role schedule." />
            <InterviewBookingForm
              slots={availableSlots}
              candidates={candidates.map((candidate) => ({ id: candidate.id, name: `${candidate.firstName} ${candidate.lastName}` }))}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
