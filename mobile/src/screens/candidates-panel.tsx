import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { Dispatch, SetStateAction } from "react";

import type { CandidateFormState, CandidateEditState } from "../app-types";
import { candidateStages } from "../app-types";
import { Badge, EmptyState, Field, HorizontalChoices, Section } from "../components/ui";
import { palette, spacing } from "../theme";
import type { Candidate, CandidateStage, Job } from "../types";

export function CandidatesPanel(props: {
  candidates: Candidate[];
  jobs: Job[];
  canManageCandidates: boolean;
  candidateForm: CandidateFormState;
  setCandidateForm: Dispatch<SetStateAction<CandidateFormState>>;
  candidateEdits: Record<string, CandidateEditState>;
  setCandidateEdits: Dispatch<SetStateAction<Record<string, CandidateEditState>>>;
  onCreateCandidate: () => void;
  onSaveCandidate: (candidateId: string) => void;
  onStageUpdate: (candidateId: string, stage: CandidateStage) => void;
  onDeleteCandidate: (candidateId: string) => void;
}) {
  return (
    <View style={styles.stack}>
      <Section title="Add a candidate" copy="Recruiters and leads can add new talent directly into the job pipeline.">
        <Text style={styles.label}>Job</Text>
        <HorizontalChoices value={props.candidateForm.jobId} onChange={(value) => props.setCandidateForm((current) => ({ ...current, jobId: value }))} options={props.jobs.map((job) => ({ id: job.id, label: job.title }))} />
        <Field label="First name" value={props.candidateForm.firstName} onChangeText={(value) => props.setCandidateForm((current) => ({ ...current, firstName: value }))} />
        <Field label="Last name" value={props.candidateForm.lastName} onChangeText={(value) => props.setCandidateForm((current) => ({ ...current, lastName: value }))} />
        <Field label="Email" value={props.candidateForm.email} onChangeText={(value) => props.setCandidateForm((current) => ({ ...current, email: value }))} keyboardType="email-address" />
        <Field label="Phone" value={props.candidateForm.phone} onChangeText={(value) => props.setCandidateForm((current) => ({ ...current, phone: value }))} />
        <Field label="Source" value={props.candidateForm.source} onChangeText={(value) => props.setCandidateForm((current) => ({ ...current, source: value }))} />
        <Field label="Years of experience" value={props.candidateForm.yearsExperience} onChangeText={(value) => props.setCandidateForm((current) => ({ ...current, yearsExperience: value }))} keyboardType="numeric" />
        <Field label="Skills" value={props.candidateForm.skills} onChangeText={(value) => props.setCandidateForm((current) => ({ ...current, skills: value }))} placeholder="Sourcing, screening, React" />
        <Field label="Country" value={props.candidateForm.country} onChangeText={(value) => props.setCandidateForm((current) => ({ ...current, country: value }))} />
        <Field label="Address" value={props.candidateForm.address} onChangeText={(value) => props.setCandidateForm((current) => ({ ...current, address: value }))} />
        <Field label="LinkedIn URL" value={props.candidateForm.linkedInUrl} onChangeText={(value) => props.setCandidateForm((current) => ({ ...current, linkedInUrl: value }))} />
        <Field label="Notes" value={props.candidateForm.notes} onChangeText={(value) => props.setCandidateForm((current) => ({ ...current, notes: value }))} multiline />
        <Pressable style={styles.primaryButton} onPress={props.onCreateCandidate}>
          <Text style={styles.primaryButtonText}>Add candidate</Text>
        </Pressable>
      </Section>

      <Section title="Candidate database" copy="Update pipelines, save interview notes, and keep each profile easy to review.">
        {props.candidates.length ? props.candidates.map((candidate) => {
          const edit = props.candidateEdits[candidate.id];
          return (
            <View key={candidate.id} style={styles.card}>
              <View style={styles.headerRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{candidate.firstName} {candidate.lastName}</Text>
                  <Text style={styles.meta}>{candidate.job?.title || "Unlinked job"} · {candidate.source}</Text>
                </View>
                <Badge text={candidate.stage} />
              </View>
              <Text style={styles.meta}>{candidate.email}{candidate.phone ? ` · ${candidate.phone}` : ""}</Text>
              <Text style={styles.meta}>Ranking score: {candidate.rankingScore}</Text>
              <Text style={styles.label}>Stage</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceWrap}>
                {candidateStages.map((stage) => (
                  <Pressable key={stage} style={[styles.choiceChip, stage === candidate.stage ? styles.choiceChipActive : null]} onPress={() => props.onStageUpdate(candidate.id, stage)}>
                    <Text style={[styles.choiceChipText, stage === candidate.stage ? styles.choiceChipTextActive : null]}>{stage.replaceAll("_", " ").toLowerCase()}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              {edit ? (
                <>
                  <Field label="Notes" value={edit.notes} onChangeText={(value) => props.setCandidateEdits((current) => ({ ...current, [candidate.id]: { ...current[candidate.id], notes: value } }))} multiline />
                  <View style={styles.inlineFields}>
                    <View style={{ flex: 1 }}>
                      <Field label="CV score" value={edit.cvScore} onChangeText={(value) => props.setCandidateEdits((current) => ({ ...current, [candidate.id]: { ...current[candidate.id], cvScore: value } }))} keyboardType="numeric" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Field label="English score" value={edit.englishScore} onChangeText={(value) => props.setCandidateEdits((current) => ({ ...current, [candidate.id]: { ...current[candidate.id], englishScore: value } }))} keyboardType="numeric" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Field label="Overall score" value={edit.overallScore} onChangeText={(value) => props.setCandidateEdits((current) => ({ ...current, [candidate.id]: { ...current[candidate.id], overallScore: value } }))} keyboardType="numeric" />
                    </View>
                  </View>
                  <View style={styles.actions}>
                    <Pressable style={styles.secondaryButton} onPress={() => props.onSaveCandidate(candidate.id)}>
                      <Text style={styles.secondaryButtonText}>Save notes</Text>
                    </Pressable>
                    {props.canManageCandidates ? (
                      <Pressable style={[styles.secondaryButton, styles.dangerButton]} onPress={() => props.onDeleteCandidate(candidate.id)}>
                        <Text style={[styles.secondaryButtonText, { color: palette.danger }]}>Delete</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </>
              ) : null}
            </View>
          );
        }) : <EmptyState copy="No candidates have been added yet." />}
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
  choiceWrap: {
    gap: spacing.sm,
    paddingRight: spacing.sm
  },
  choiceChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.card
  },
  choiceChipActive: {
    borderColor: palette.primary,
    backgroundColor: palette.primarySoft
  },
  choiceChipText: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: "600"
  },
  choiceChipTextActive: {
    color: palette.primary
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
