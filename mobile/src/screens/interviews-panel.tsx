import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Dispatch, SetStateAction } from "react";

import type { InterviewEditState, SlotFormState } from "../app-types";
import { Badge, EmptyState, Field, HorizontalChoices, Section } from "../components/ui";
import { formatDateTime } from "../lib/helpers";
import { palette, spacing } from "../theme";
import type { Candidate, InterviewSlot, WorkspaceUser, Job } from "../types";

export function InterviewsPanel(props: {
  interviews: InterviewSlot[];
  candidates: Candidate[];
  jobs: Job[];
  currentOrgRecruiters: WorkspaceUser[];
  slotForm: SlotFormState;
  setSlotForm: Dispatch<SetStateAction<SlotFormState>>;
  interviewEdits: Record<string, InterviewEditState>;
  setInterviewEdits: Dispatch<SetStateAction<Record<string, InterviewEditState>>>;
  onCreateSlot: () => void;
  onBookInterview: (slotId: string) => void;
  onUpdateInterview: (slotId: string, bookingStatus?: "COMPLETED" | "CANCELLED") => void;
}) {
  return (
    <View style={styles.stack}>
      <Section title="Create an interview slot" copy="Schedule live interviews and assign them to the right recruiter.">
        <Text style={styles.label}>Job</Text>
        <HorizontalChoices value={props.slotForm.jobId} onChange={(value) => props.setSlotForm((current) => ({ ...current, jobId: value }))} options={props.jobs.map((job) => ({ id: job.id, label: job.title }))} />
        {!!props.currentOrgRecruiters.length && (
          <>
            <Text style={styles.label}>Recruiter owner</Text>
            <HorizontalChoices value={props.slotForm.assignedRecruiterId} onChange={(value) => props.setSlotForm((current) => ({ ...current, assignedRecruiterId: value }))} options={props.currentOrgRecruiters.map((user) => ({ id: user.id, label: user.fullName }))} />
          </>
        )}
        <Field label="Interviewers" value={props.slotForm.interviewerNames} onChangeText={(value) => props.setSlotForm((current) => ({ ...current, interviewerNames: value }))} placeholder="Omar, Sarah" />
        <Field label="Starts at" value={props.slotForm.startsAt} onChangeText={(value) => props.setSlotForm((current) => ({ ...current, startsAt: value }))} placeholder="2026-04-08 13:00" />
        <Field label="Ends at" value={props.slotForm.endsAt} onChangeText={(value) => props.setSlotForm((current) => ({ ...current, endsAt: value }))} placeholder="2026-04-08 14:00" />
        <Field label="Location" value={props.slotForm.location} onChangeText={(value) => props.setSlotForm((current) => ({ ...current, location: value }))} placeholder="Google Meet or office" />
        <Field label="Notes" value={props.slotForm.notes} onChangeText={(value) => props.setSlotForm((current) => ({ ...current, notes: value }))} multiline />
        <Pressable style={styles.primaryButton} onPress={props.onCreateSlot}>
          <Text style={styles.primaryButtonText}>Create interview slot</Text>
        </Pressable>
      </Section>

      <Section title="Interview schedule" copy="Book candidates, take notes, and close the loop with simple mobile actions.">
        {props.interviews.length ? props.interviews.map((slot) => {
          const edit = props.interviewEdits[slot.id];
          const jobCandidates = props.candidates.filter((candidate) => candidate.jobId === slot.jobId && candidate.stage !== "HIRED" && candidate.stage !== "REJECTED");
          return (
            <View key={slot.id} style={styles.card}>
              <View style={styles.headerRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{slot.job?.title || "Interview slot"}</Text>
                  <Text style={styles.meta}>{formatDateTime(slot.startsAt)} to {formatDateTime(slot.endsAt)}</Text>
                </View>
                <Badge text={slot.status} />
              </View>
              <Text style={styles.meta}>Interviewers: {slot.interviewerNames.join(", ") || "Not added"}</Text>
              <Text style={styles.meta}>Location: {slot.location || "Not set"}</Text>
              {slot.booking?.candidate ? (
                <Text style={styles.meta}>Booked candidate: {slot.booking.candidate.firstName} {slot.booking.candidate.lastName}</Text>
              ) : edit ? (
                <>
                  <Text style={styles.label}>Select candidate</Text>
                  <HorizontalChoices value={edit.bookingCandidateId} onChange={(value) => props.setInterviewEdits((current) => ({ ...current, [slot.id]: { ...current[slot.id], bookingCandidateId: value } }))} options={jobCandidates.map((candidate) => ({ id: candidate.id, label: `${candidate.firstName} ${candidate.lastName}` }))} />
                  <Pressable style={styles.secondaryButton} onPress={() => props.onBookInterview(slot.id)}>
                    <Text style={styles.secondaryButtonText}>Book slot</Text>
                  </Pressable>
                </>
              ) : null}
              {edit ? (
                <>
                  <Field label="Interview notes" value={edit.notes} onChangeText={(value) => props.setInterviewEdits((current) => ({ ...current, [slot.id]: { ...current[slot.id], notes: value } }))} multiline />
                  <View style={styles.inlineFields}>
                    <View style={{ flex: 1 }}>
                      <Field label="Communication" value={edit.communicationRating} onChangeText={(value) => props.setInterviewEdits((current) => ({ ...current, [slot.id]: { ...current[slot.id], communicationRating: value } }))} keyboardType="numeric" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Field label="Language" value={edit.languageRating} onChangeText={(value) => props.setInterviewEdits((current) => ({ ...current, [slot.id]: { ...current[slot.id], languageRating: value } }))} keyboardType="numeric" />
                    </View>
                  </View>
                  <View style={styles.actions}>
                    <Pressable style={styles.secondaryButton} onPress={() => props.onUpdateInterview(slot.id)}>
                      <Text style={styles.secondaryButtonText}>Save notes</Text>
                    </Pressable>
                    <Pressable style={styles.secondaryButton} onPress={() => props.onUpdateInterview(slot.id, "COMPLETED")}>
                      <Text style={styles.secondaryButtonText}>Mark completed</Text>
                    </Pressable>
                    <Pressable style={[styles.secondaryButton, styles.dangerButton]} onPress={() => props.onUpdateInterview(slot.id, "CANCELLED")}>
                      <Text style={[styles.secondaryButtonText, { color: palette.danger }]}>Cancel</Text>
                    </Pressable>
                  </View>
                </>
              ) : null}
            </View>
          );
        }) : <EmptyState copy="No interview slots have been created yet." />}
      </Section>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.lg
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: palette.ink
  },
  card: {
    backgroundColor: palette.card,
    borderRadius: 22,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: palette.line,
    gap: spacing.md
  },
  headerRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  cardTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "700",
    color: palette.ink
  },
  meta: {
    fontSize: 13,
    lineHeight: 20,
    color: palette.soft
  },
  inlineFields: {
    flexDirection: "row",
    gap: spacing.sm
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  primaryButton: {
    minHeight: 48,
    backgroundColor: palette.primary,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15
  },
  secondaryButton: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.card,
    alignItems: "center",
    justifyContent: "center"
  },
  secondaryButtonText: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: "600"
  },
  dangerButton: {
    borderColor: palette.dangerSoft
  }
});
