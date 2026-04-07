import { Pressable, StyleSheet, Text, View } from "react-native";

import type { JobFormState, JobEditState } from "../app-types";
import type { Job, WorkspaceUser } from "../types";
import { Field, HorizontalChoices, Section, Segmented, Badge, EmptyState } from "../components/ui";
import { jobStatuses } from "../app-types";
import { palette, spacing } from "../theme";

export function JobsPanel(props: {
  canManageJobs: boolean;
  jobs: Job[];
  currentOrgRecruiters: WorkspaceUser[];
  jobForm: JobFormState;
  setJobForm: React.Dispatch<React.SetStateAction<JobFormState>>;
  jobEdits: Record<string, JobEditState>;
  setJobEdits: React.Dispatch<React.SetStateAction<Record<string, JobEditState>>>;
  onCreateJob: () => void;
  onSaveJob: (jobId: string) => void;
  onDeleteJob: (jobId: string) => void;
}) {
  return (
    <View style={styles.stack}>
      {props.canManageJobs && (
        <Section title="Create a job" copy="Publish a structured role and assign the right recruiter from the start.">
          <Field label="Title" value={props.jobForm.title} onChangeText={(value) => props.setJobForm((current) => ({ ...current, title: value }))} placeholder="Senior Front-End Engineer" />
          <Field label="Description" value={props.jobForm.rawDescription} onChangeText={(value) => props.setJobForm((current) => ({ ...current, rawDescription: value }))} placeholder="Role summary, requirements, benefits" multiline />
          <Field label="Headcount" value={props.jobForm.headcount} onChangeText={(value) => props.setJobForm((current) => ({ ...current, headcount: value }))} keyboardType="numeric" placeholder="1" />
          <Field label="Location" value={props.jobForm.location} onChangeText={(value) => props.setJobForm((current) => ({ ...current, location: value }))} placeholder="Cairo, EG" />
          <Field label="Source campaign" value={props.jobForm.sourceCampaign} onChangeText={(value) => props.setJobForm((current) => ({ ...current, sourceCampaign: value }))} placeholder="Q2 engineering push" />
          <Text style={styles.label}>Status</Text>
          <Segmented options={jobStatuses} value={props.jobForm.status} onChange={(value) => props.setJobForm((current) => ({ ...current, status: value }))} />
          {!!props.currentOrgRecruiters.length && (
            <>
              <Text style={styles.label}>Assigned recruiter</Text>
              <HorizontalChoices
                value={props.jobForm.assignedRecruiterId}
                onChange={(value) => props.setJobForm((current) => ({ ...current, assignedRecruiterId: value }))}
                options={[{ id: "", label: "Unassigned" }, ...props.currentOrgRecruiters.map((user) => ({ id: user.id, label: user.fullName }))]}
              />
            </>
          )}
          <Field label="Must-have requirements" value={props.jobForm.mustHaveRequirements} onChangeText={(value) => props.setJobForm((current) => ({ ...current, mustHaveRequirements: value }))} placeholder="React, TypeScript, design systems" />
          <Field label="Nice-to-have requirements" value={props.jobForm.niceToHaveRequirements} onChangeText={(value) => props.setJobForm((current) => ({ ...current, niceToHaveRequirements: value }))} placeholder="Next.js, leadership, analytics" />
          <Pressable style={styles.primaryButton} onPress={props.onCreateJob}>
            <Text style={styles.primaryButtonText}>Create job</Text>
          </Pressable>
        </Section>
      )}

      <Section title="Live jobs" copy="Assigned roles stay visible to recruiters even after reassignment through the shared job history.">
        {props.jobs.length ? props.jobs.map((job) => {
          const edit = props.jobEdits[job.id];
          const assignedRecruiter = props.currentOrgRecruiters.find((user) => user.id === (edit?.assignedRecruiterId || job.assignedRecruiterId));
          return (
            <View key={job.id} style={styles.card}>
              <View style={styles.headerRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{job.title}</Text>
                  <Text style={styles.meta}>{job.location || "No location"} · {job.headcount} openings</Text>
                </View>
                <Badge text={job.status} />
              </View>
              <Text style={styles.copy}>{job.rawDescription.slice(0, 180)}...</Text>
              <Text style={styles.meta}>Assigned recruiter: {assignedRecruiter?.fullName || "Unassigned"}</Text>
              <Text style={styles.meta}>Candidates: {job._count?.candidates ?? job.candidates?.length ?? 0}</Text>
              {props.canManageJobs && edit ? (
                <>
                  {!!props.currentOrgRecruiters.length && (
                    <>
                      <Text style={styles.label}>Reassign recruiter</Text>
                      <HorizontalChoices
                        value={edit.assignedRecruiterId}
                        onChange={(value) => props.setJobEdits((current) => ({ ...current, [job.id]: { ...current[job.id], assignedRecruiterId: value } }))}
                        options={[{ id: "", label: "Unassigned" }, ...props.currentOrgRecruiters.map((user) => ({ id: user.id, label: user.fullName }))]}
                      />
                    </>
                  )}
                  <Text style={styles.label}>Status</Text>
                  <Segmented options={jobStatuses} value={edit.status} onChange={(value) => props.setJobEdits((current) => ({ ...current, [job.id]: { ...current[job.id], status: value } }))} compact />
                  <View style={styles.actions}>
                    <Pressable style={styles.secondaryButton} onPress={() => props.onSaveJob(job.id)}>
                      <Text style={styles.secondaryButtonText}>Save</Text>
                    </Pressable>
                    <Pressable style={[styles.secondaryButton, styles.dangerButton]} onPress={() => props.onDeleteJob(job.id)}>
                      <Text style={[styles.secondaryButtonText, { color: palette.danger }]}>Delete</Text>
                    </Pressable>
                  </View>
                </>
              ) : null}
            </View>
          );
        }) : <EmptyState copy="No jobs are available in this workspace yet." />}
      </Section>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.lg
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
    alignItems: "flex-start",
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
  copy: {
    fontSize: 14,
    lineHeight: 22,
    color: palette.slate
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: palette.ink
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
