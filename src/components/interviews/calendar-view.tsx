"use client";

import { addDays, addMonths, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, isToday, startOfMonth, startOfWeek, subMonths } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { useToast } from "@/components/feedback/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type RecruiterOption = {
  id: string;
  fullName: string;
};

type Slot = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  location: string | null;
  interviewerNames: string[];
  notes: string | null;
  jobTitle: string;
  candidateName: string | null;
  candidateId: string | null;
  bookingStatus: string | null;
  notesFromBooking: string | null;
  assignedRecruiterId: string | null;
  assignedRecruiterName: string | null;
};

function formatStatus(value: string | null) {
  return (value ?? "UNASSIGNED").replaceAll("_", " ");
}

function SlotEditorCard({ slot, recruiters }: { slot: Slot; recruiters: RecruiterOption[] }) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [location, setLocation] = useState(slot.location ?? "");
  const [interviewers, setInterviewers] = useState(slot.interviewerNames.join(", "));
  const [startsAt, setStartsAt] = useState(slot.startsAt.slice(0, 16));
  const [endsAt, setEndsAt] = useState(slot.endsAt.slice(0, 16));
  const [assignedRecruiterId, setAssignedRecruiterId] = useState(slot.assignedRecruiterId ?? "");
  const [bookingStatus, setBookingStatus] = useState(slot.bookingStatus ?? "SCHEDULED");
  const [notes, setNotes] = useState(slot.notesFromBooking ?? "");
  const [slotNotes, setSlotNotes] = useState(slot.notes ?? "");

  async function updateSlot() {
    setSaving(true);
    const response = await fetch("/api/interviews", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slotId: slot.id,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        assignedRecruiterId,
        location,
        interviewerNames: interviewers.split(",").map((item) => item.trim()).filter(Boolean),
        bookingStatus: slot.candidateName ? bookingStatus : undefined,
        slotNotes,
        notes
      })
    });

    const payload = await response.json().catch(() => ({ error: "Interview update failed" }));
    if (!response.ok) {
      pushToast({ title: "Interview update failed", description: payload.error ?? "Please try again.", tone: "error" });
      setSaving(false);
      return;
    }

    pushToast({
      title: "Interview updated",
      description: slot.candidateName
        ? "The schedule was saved and the assigned recruiter will see the update in notifications."
        : "The interview slot has been saved.",
      tone: "success"
    });
    setSaving(false);
    router.refresh();
  }

  return (
    <details className="agenda-slot-card">
      <summary className="agenda-slot-summary">
        <div>
          <div className="agenda-slot-time">{format(new Date(slot.startsAt), "h:mm a")} - {format(new Date(slot.endsAt), "h:mm a")}</div>
          <strong>{slot.jobTitle}</strong>
          <p>{slot.candidateName ?? "Open availability"}</p>
        </div>
        <div className="agenda-slot-summary-meta">
          <span className={`slot-status-pill slot-status-${slot.status.toLowerCase()}`}>{formatStatus(slot.status)}</span>
          <small>{slot.assignedRecruiterName ?? "Unassigned recruiter"}</small>
        </div>
      </summary>

      <div className="agenda-slot-meta">
        <span>{slot.location ?? "Virtual / TBD"}</span>
        <span>{slot.interviewerNames.length ? slot.interviewerNames.join(", ") : "No interviewers yet"}</span>
        <span>{slot.candidateName ? "Schedule changes are posted to notifications." : "Assign a recruiter and candidate to start the flow."}</span>
      </div>

      <div className="agenda-slot-editor">
        <Input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} />
        <Input type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} />
        <select className="input" value={assignedRecruiterId} onChange={(event) => setAssignedRecruiterId(event.target.value)}>
          <option value="">Assign recruiter</option>
          {recruiters.map((recruiter) => (
            <option key={recruiter.id} value={recruiter.id}>{recruiter.fullName}</option>
          ))}
        </select>
        <Input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Google Meet / Office / Zoom" />
        <Input value={interviewers} onChange={(event) => setInterviewers(event.target.value)} placeholder="Interviewers, comma separated" />
        <Input value={slotNotes} onChange={(event) => setSlotNotes(event.target.value)} placeholder="Slot notes / recruiter memo" />
        {slot.candidateName ? (
          <select className="input" value={bookingStatus} onChange={(event) => setBookingStatus(event.target.value)}>
            <option value="SCHEDULED">Scheduled</option>
            <option value="COMPLETED">Completed</option>
            <option value="NO_SHOW">No show</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        ) : null}
        {slot.candidateName ? <Input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Candidate interview notes" /> : null}
      </div>

      <div className="agenda-slot-actions">
        <Button type="button" onClick={() => void updateSlot()} disabled={saving}>{saving ? "Saving..." : "Save changes"}</Button>
        {slot.candidateId ? <Link href={`/candidates/${slot.candidateId}`} className="button button-ghost">Open candidate</Link> : null}
      </div>
    </details>
  );
}

export function CalendarView({
  slots,
  recruiters,
  currentUserId
}: {
  slots: Slot[];
  recruiters: RecruiterOption[];
  currentUserId: string;
}) {
  const today = new Date();
  const initialDate = slots.some((slot) => isSameMonth(new Date(slot.startsAt), today)) ? today : slots.length ? new Date(slots[0].startsAt) : today;
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [monthCursor, setMonthCursor] = useState(startOfMonth(initialDate));
  const [filter, setFilter] = useState<"all" | "mine" | "booked" | "available">("all");

  const visibleSlots = useMemo(() => {
    return slots.filter((slot) => {
      if (filter === "mine") {
        return slot.assignedRecruiterId === currentUserId;
      }

      if (filter === "booked") {
        return slot.status === "BOOKED" || slot.status === "COMPLETED";
      }

      if (filter === "available") {
        return slot.status === "AVAILABLE";
      }

      return true;
    });
  }, [currentUserId, filter, slots]);

  const slotsByDay = useMemo(() => {
    const map = new Map<string, Slot[]>();

    for (const slot of visibleSlots) {
      const key = format(new Date(slot.startsAt), "yyyy-MM-dd");
      const existing = map.get(key) ?? [];
      existing.push(slot);
      map.set(key, existing);
    }

    return map;
  }, [visibleSlots]);

  const selectedDayKey = format(selectedDate, "yyyy-MM-dd");
  const selectedDaySlots = (slotsByDay.get(selectedDayKey) ?? []).sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime());
  const upcomingSlots = [...visibleSlots]
    .filter((slot) => new Date(slot.endsAt).getTime() >= Date.now())
    .sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime())
    .slice(0, 4);

  const monthDays = useMemo(() => {
    const days: Date[] = [];
    const start = startOfWeek(startOfMonth(monthCursor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(monthCursor), { weekStartsOn: 1 });

    for (let day = start; day <= end; day = addDays(day, 1)) {
      days.push(day);
    }

    return days;
  }, [monthCursor]);

  const summary = {
    total: visibleSlots.length,
    mine: visibleSlots.filter((slot) => slot.assignedRecruiterId === currentUserId).length,
    booked: visibleSlots.filter((slot) => slot.status === "BOOKED" || slot.status === "COMPLETED").length,
    open: visibleSlots.filter((slot) => slot.status === "AVAILABLE").length
  };

  if (!slots.length) {
    return <p className="muted">No interview slots yet for this role. Create the first availability window on the right.</p>;
  }

  return (
    <div className="schedule-shell">
      <div className="schedule-summary-strip">
        <div className="schedule-summary-tile"><small>Visible slots</small><strong>{summary.total}</strong></div>
        <div className="schedule-summary-tile"><small>My schedule</small><strong>{summary.mine}</strong></div>
        <div className="schedule-summary-tile"><small>Booked</small><strong>{summary.booked}</strong></div>
        <div className="schedule-summary-tile"><small>Open</small><strong>{summary.open}</strong></div>
      </div>

      <div className="schedule-toolbar">
        <div>
          <strong>{format(monthCursor, "MMMM yyyy")}</strong>
          <p className="muted">Select a day to inspect the agenda and manage slot details professionally.</p>
        </div>
        <div className="candidate-actions-row">
          <Button type="button" variant="ghost" onClick={() => setMonthCursor((current) => subMonths(current, 1))}>Previous</Button>
          <Button type="button" variant="ghost" onClick={() => {
            const nextToday = new Date();
            setMonthCursor(startOfMonth(nextToday));
            setSelectedDate(nextToday);
          }}>Today</Button>
          <Button type="button" variant="ghost" onClick={() => setMonthCursor((current) => addMonths(current, 1))}>Next</Button>
        </div>
      </div>

      <div className="schedule-filter-pills">
        {[
          { id: "all", label: "All slots" },
          { id: "mine", label: "My schedule" },
          { id: "booked", label: "Booked" },
          { id: "available", label: "Open slots" }
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            className={`schedule-filter-pill${filter === item.id ? " active" : ""}`}
            onClick={() => setFilter(item.id as typeof filter)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="schedule-board-layout">
        <div className="month-grid-shell">
          <div className="month-grid-labels">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => <span key={label}>{label}</span>)}
          </div>
          <div className="month-grid">
            {monthDays.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const daySlots = slotsByDay.get(key) ?? [];
              const isSelected = isSameDay(day, selectedDate);

              return (
                <button
                  key={key}
                  type="button"
                  className={`month-cell${isSameMonth(day, monthCursor) ? "" : " month-cell-muted"}${isSelected ? " month-cell-selected" : ""}${isToday(day) ? " month-cell-today" : ""}`}
                  onClick={() => setSelectedDate(day)}
                >
                  <span className="month-cell-date">{format(day, "d")}</span>
                  <span className="month-cell-count">{daySlots.length ? `${daySlots.length} slot${daySlots.length === 1 ? "" : "s"}` : "No slots"}</span>
                  {daySlots.slice(0, 2).map((slot) => (
                    <span key={slot.id} className={`month-slot-pill month-slot-pill-${slot.status.toLowerCase()}`}>
                      {format(new Date(slot.startsAt), "h:mm a")}
                    </span>
                  ))}
                </button>
              );
            })}
          </div>
        </div>

        <div className="day-agenda-panel">
          <div className="day-agenda-header">
            <div>
              <strong>{format(selectedDate, "EEEE, MMM d")}</strong>
              <p className="muted">{selectedDaySlots.length} slot{selectedDaySlots.length === 1 ? "" : "s"} visible in this view.</p>
            </div>
            <div className="upcoming-schedule-list">
              {upcomingSlots.length ? upcomingSlots.map((slot) => (
                <div key={slot.id} className="upcoming-schedule-item">
                  <strong>{format(new Date(slot.startsAt), "MMM d, h:mm a")}</strong>
                  <small>{slot.candidateName ?? slot.jobTitle}</small>
                </div>
              )) : <div className="upcoming-schedule-item"><strong>No upcoming slots</strong><small>Create or assign a slot to build the schedule.</small></div>}
            </div>
          </div>

          {selectedDaySlots.length ? (
            <div className="day-agenda-stack">
              {selectedDaySlots.map((slot) => (
                <SlotEditorCard key={slot.id} slot={slot} recruiters={recruiters} />
              ))}
            </div>
          ) : (
            <div className="schedule-empty-state">
              <strong>No slots on this day</strong>
              <p className="muted">Pick another date or switch filters to inspect the rest of the schedule.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
