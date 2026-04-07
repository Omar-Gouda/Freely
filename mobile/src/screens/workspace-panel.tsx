import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { Dispatch, SetStateAction } from "react";

import type { InviteFormState, Notice, ProfileFormState, WorkspaceTab } from "../app-types";
import { avatarPresets, roleOptions, supportStatuses, workspaceTabs } from "../app-types";
import { Badge, CardRow, EmptyState, Field, HorizontalChoices, MetricCard, Section, Segmented } from "../components/ui";
import { avatarUri, formatDate, formatDateTime } from "../lib/helpers";
import { palette, spacing } from "../theme";
import type { AnalyticsOverview, Candidate, Organization, OutreachKind, OutreachTemplateResult, Profile, Role, SupportThread, SupportThreadStatus, WorkspaceUser } from "../types";
import { uiStyles } from "../components/ui";

export function WorkspacePanel(props: {
  role: Role;
  activeTab: WorkspaceTab;
  setActiveTab: (value: WorkspaceTab) => void;
  analytics: AnalyticsOverview | null;
  candidates: Candidate[];
  supportThreads: SupportThread[];
  profile: Profile | null;
  profileForm: ProfileFormState;
  setProfileForm: Dispatch<SetStateAction<ProfileFormState>>;
  supportForm: { subject: string; message: string };
  setSupportForm: Dispatch<SetStateAction<{ subject: string; message: string }>>;
  threadReplies: Record<string, string>;
  setThreadReplies: Dispatch<SetStateAction<Record<string, string>>>;
  isAdmin: boolean;
  organizations: Organization[];
  selectedOrganizationId: string;
  setSelectedOrganizationId: (value: string) => void;
  organizationMenuOpen: boolean;
  setOrganizationMenuOpen: (value: boolean | ((current: boolean) => boolean)) => void;
  selectedOrganization: Organization | null;
  users: WorkspaceUser[];
  selectedOrganizationUsers: WorkspaceUser[];
  inviteForm: InviteFormState;
  setInviteForm: Dispatch<SetStateAction<InviteFormState>>;
  userRoleDrafts: Record<string, Role>;
  setUserRoleDrafts: Dispatch<SetStateAction<Record<string, Role>>>;
  outreachKind: OutreachKind;
  setOutreachKind: (value: OutreachKind) => void;
  outreachCandidateId: string;
  setOutreachCandidateId: (value: string) => void;
  outreachResult: OutreachTemplateResult | null;
  onCreateSupportThread: () => void;
  onReply: (threadId: string) => void;
  onSupportStatus: (threadId: string, status: SupportThreadStatus) => void;
  onGenerateOutreach: () => void;
  onSaveProfile: () => void;
  onOrganizationAction: (action: "approve" | "suspend" | "reactivate" | "end_contract" | "archive") => void;
  onInviteUser: () => void;
  onUserRole: (userId: string) => void;
  onUserLifecycle: (action: "deactivate" | "reactivate", userId: string) => void;
  onDeleteUser: (userId: string) => void;
}) {
  const canManageUsers = props.role === "ADMIN" || props.role === "ORG_HEAD";

  return (
    <View style={styles.stack}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={uiStyles.tabStrip}>
        {workspaceTabs.map((tab) => {
          const active = tab.id === props.activeTab;
          return (
            <Pressable key={tab.id} style={[uiStyles.tabButton, active ? uiStyles.tabButtonActive : null]} onPress={() => props.setActiveTab(tab.id)}>
              <Text style={[uiStyles.tabText, active ? uiStyles.tabTextActive : null]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {props.activeTab === "pipeline" && (
        <Section title="Pipeline overview" copy="Each stage stays readable on mobile so recruiters can move fast without getting lost.">
          {["APPLIED", "SCREENED", "QUALIFIED", "INTERVIEW_SCHEDULED", "REJECTED", "HIRED"].map((stage) => {
            const stageCandidates = props.candidates.filter((candidate) => candidate.stage === stage);
            return (
              <View key={stage} style={styles.card}>
                <View style={styles.headerRow}>
                  <Text style={styles.cardTitle}>{stage.replaceAll("_", " ").toLowerCase()}</Text>
                  <Badge text={`${stageCandidates.length} candidates`} />
                </View>
                {stageCandidates.length ? stageCandidates.map((candidate) => (
                  <CardRow key={candidate.id} title={`${candidate.firstName} ${candidate.lastName}`} subtitle={candidate.job?.title || candidate.source} meta={`Updated ${formatDate(candidate.updatedAt)}`} />
                )) : <EmptyState copy="No candidates in this stage." compact />}
              </View>
            );
          })}
        </Section>
      )}

      {props.activeTab === "analytics" && (
        <Section title="Hiring analytics" copy="Performance, funnel conversion, and recent activity from the same live dataset used on web.">
          <View style={styles.metricGrid}>
            <MetricCard label="Active jobs" value={`${props.analytics?.totals.activeJobs ?? 0}`} />
            <MetricCard label="Avg time to hire" value={`${props.analytics?.avgTimeToHireDays ?? 0}d`} />
            <MetricCard label="Applied to screened" value={`${props.analytics?.conversionRates.appliedToScreened ?? 0}%`} />
            <MetricCard label="Qualified to hired" value={`${props.analytics?.conversionRates.qualifiedToHired ?? 0}%`} />
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Source breakdown</Text>
            {props.analytics?.sourceBreakdown.length ? props.analytics.sourceBreakdown.map((item) => (
              <CardRow key={item.name} title={item.name} meta={`${item.value} candidates`} />
            )) : <EmptyState copy="No source data yet." compact />}
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Recent activity</Text>
            {props.analytics?.recentActivity.length ? props.analytics.recentActivity.map((item) => (
              <CardRow key={item.id} title={item.action} subtitle={`${item.entityType} · ${item.entityId}`} meta={formatDateTime(item.createdAt)} />
            )) : <EmptyState copy="No recent activity to show." compact />}
          </View>
        </Section>
      )}

      {props.activeTab === "support" && (
        <Section title="Support channel" copy="Internal members create live support threads here, and admins can resolve them from the same inbox.">
          <View style={styles.card}>
            <Field label="Subject" value={props.supportForm.subject} onChangeText={(value) => props.setSupportForm((current) => ({ ...current, subject: value }))} placeholder="Need help with interview scheduling" />
            <Field label="Message" value={props.supportForm.message} onChangeText={(value) => props.setSupportForm((current) => ({ ...current, message: value }))} placeholder="Describe the issue and what you already tried." multiline />
            <Pressable style={styles.primaryButton} onPress={props.onCreateSupportThread}>
              <Text style={styles.primaryButtonText}>Open support thread</Text>
            </Pressable>
          </View>
          {props.supportThreads.length ? props.supportThreads.map((thread) => (
            <View key={thread.id} style={styles.card}>
              <View style={styles.headerRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{thread.subject}</Text>
                  <Text style={styles.meta}>{thread.requesterName} · {formatDateTime(thread.lastMessageAt)}</Text>
                </View>
                <Badge text={thread.status} />
              </View>
              {thread.messages.map((message) => (
                <View key={message.id} style={styles.messageBubble}>
                  <Text style={styles.messageAuthor}>{message.authorName}</Text>
                  <Text style={styles.messageBody}>{message.body}</Text>
                  <Text style={styles.meta}>{formatDateTime(message.createdAt)}</Text>
                </View>
              ))}
              {(props.isAdmin || thread.requesterUserId === props.profile?.id) ? (
                <>
                  <Field label="Reply" value={props.threadReplies[thread.id] || ""} onChangeText={(value) => props.setThreadReplies((current) => ({ ...current, [thread.id]: value }))} multiline />
                  <View style={styles.actions}>
                    <Pressable style={styles.secondaryButton} onPress={() => props.onReply(thread.id)}>
                      <Text style={styles.secondaryText}>Send reply</Text>
                    </Pressable>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceWrap}>
                      {supportStatuses.map((status) => (
                        <Pressable key={status} style={styles.choiceChip} onPress={() => props.onSupportStatus(thread.id, status)}>
                          <Text style={styles.choiceChipText}>{status.replaceAll("_", " ").toLowerCase()}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                </>
              ) : null}
            </View>
          )) : <EmptyState copy="No support threads have been opened yet." />}
        </Section>
      )}

      {props.activeTab === "outreach" && (
        <Section title="Outreach generator" copy="Create acceptance, rejection, and interview invitation templates from mobile.">
          <View style={styles.card}>
            <Text style={styles.label}>Template type</Text>
            <Segmented options={["INTERVIEW_INVITE", "ACCEPTANCE", "REJECTION"] as const} value={props.outreachKind} onChange={props.setOutreachKind} />
            <Text style={styles.label}>Candidate</Text>
            <HorizontalChoices value={props.outreachCandidateId} onChange={props.setOutreachCandidateId} options={[{ id: "", label: "Generic template" }, ...props.candidates.map((candidate) => ({ id: candidate.id, label: `${candidate.firstName} ${candidate.lastName}` }))]} />
            <Pressable style={styles.primaryButton} onPress={props.onGenerateOutreach}>
              <Text style={styles.primaryButtonText}>Generate template</Text>
            </Pressable>
            {props.outreachResult ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{props.outreachResult.candidateName || "Generic template"}</Text>
                <Text style={styles.resultText}>{props.outreachResult.content}</Text>
                {!!props.outreachResult.whatsappLink && <Text style={styles.meta}>{props.outreachResult.whatsappLink}</Text>}
              </View>
            ) : null}
          </View>
        </Section>
      )}

      {props.activeTab === "profile" && (
        <Section title="Profile settings" copy="Update your recruiter identity and choose one of the shared workspace avatars.">
          <View style={styles.card}>
            <Text style={styles.label}>Workspace avatar</Text>
            <View style={styles.avatarGrid}>
              {avatarPresets.map((avatar) => {
                const active = props.profileForm.avatarUrl === avatar.src;
                return (
                  <Pressable key={avatar.id} style={[styles.avatarCard, active ? styles.avatarCardActive : null]} onPress={() => props.setProfileForm((current) => ({ ...current, avatarUrl: avatar.src }))}>
                    <Image source={{ uri: avatarUri(avatar.src) }} style={styles.avatarImage} />
                    <Text style={styles.meta}>{avatar.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Field label="Full name" value={props.profileForm.fullName} onChangeText={(value) => props.setProfileForm((current) => ({ ...current, fullName: value }))} />
            <Field label="Username" value={props.profileForm.username} onChangeText={(value) => props.setProfileForm((current) => ({ ...current, username: value }))} />
            <Field label="Email" value={props.profileForm.email} onChangeText={(value) => props.setProfileForm((current) => ({ ...current, email: value }))} keyboardType="email-address" />
            <Field label="New password" value={props.profileForm.password} onChangeText={(value) => props.setProfileForm((current) => ({ ...current, password: value }))} secureTextEntry />
            <Field label="Phone" value={props.profileForm.phone} onChangeText={(value) => props.setProfileForm((current) => ({ ...current, phone: value }))} />
            <Field label="Company" value={props.profileForm.company} onChangeText={(value) => props.setProfileForm((current) => ({ ...current, company: value }))} />
            <Field label="Position" value={props.profileForm.position} onChangeText={(value) => props.setProfileForm((current) => ({ ...current, position: value }))} />
            <Field label="Location" value={props.profileForm.location} onChangeText={(value) => props.setProfileForm((current) => ({ ...current, location: value }))} />
            <Field label="Address" value={props.profileForm.address} onChangeText={(value) => props.setProfileForm((current) => ({ ...current, address: value }))} />
            <Field label="Skills" value={props.profileForm.skills} onChangeText={(value) => props.setProfileForm((current) => ({ ...current, skills: value }))} />
            <Field label="Professional summary" value={props.profileForm.experienceSummary} onChangeText={(value) => props.setProfileForm((current) => ({ ...current, experienceSummary: value }))} multiline />
            <Field label="Education summary" value={props.profileForm.educationSummary} onChangeText={(value) => props.setProfileForm((current) => ({ ...current, educationSummary: value }))} multiline />
            <Field label="Bio" value={props.profileForm.bio} onChangeText={(value) => props.setProfileForm((current) => ({ ...current, bio: value }))} multiline />
            <Pressable style={styles.primaryButton} onPress={props.onSaveProfile}>
              <Text style={styles.primaryButtonText}>Save profile</Text>
            </Pressable>
          </View>
        </Section>
      )}

      {props.activeTab === "settings" && (
        <Section title="Workspace settings" copy="Admins control organizations and teams. Org heads manage their recruiters from the same mobile surface.">
          {props.isAdmin && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Organizations</Text>
              <Pressable style={styles.dropdownButton} onPress={() => props.setOrganizationMenuOpen((current) => !current)}>
                <Text style={styles.dropdownText}>{props.selectedOrganization?.name || "Select organization"}</Text>
              </Pressable>
              {props.organizationMenuOpen ? props.organizations.map((organization) => (
                <Pressable key={organization.id} style={styles.dropdownItem} onPress={() => {
                  props.setSelectedOrganizationId(organization.id);
                  props.setInviteForm((current) => ({ ...current, organizationId: organization.id }));
                  props.setOrganizationMenuOpen(false);
                }}>
                  <Text style={styles.dropdownText}>{organization.name}</Text>
                  <Badge text={organization.status} />
                </Pressable>
              )) : null}
              {props.selectedOrganization ? (
                <>
                  <Text style={styles.meta}>Requester: {props.selectedOrganization.requestedByEmail || "Not saved"}</Text>
                  <Text style={styles.meta}>Contract ends: {formatDate(props.selectedOrganization.contractEndsAt)}</Text>
                  <View style={styles.actions}>
                    <Pressable style={styles.secondaryButton} onPress={() => props.onOrganizationAction("approve")}>
                      <Text style={styles.secondaryText}>Approve</Text>
                    </Pressable>
                    <Pressable style={styles.secondaryButton} onPress={() => props.onOrganizationAction("reactivate")}>
                      <Text style={styles.secondaryText}>Reactivate</Text>
                    </Pressable>
                    <Pressable style={styles.secondaryButton} onPress={() => props.onOrganizationAction("suspend")}>
                      <Text style={styles.secondaryText}>Suspend</Text>
                    </Pressable>
                    <Pressable style={[styles.secondaryButton, styles.dangerButton]} onPress={() => props.onOrganizationAction("end_contract")}>
                      <Text style={[styles.secondaryText, { color: palette.danger }]}>End contract</Text>
                    </Pressable>
                  </View>
                </>
              ) : null}
            </View>
          )}

          {canManageUsers && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Add team member</Text>
              <Field label="Full name" value={props.inviteForm.fullName} onChangeText={(value) => props.setInviteForm((current) => ({ ...current, fullName: value }))} />
              <Field label="Email" value={props.inviteForm.email} onChangeText={(value) => props.setInviteForm((current) => ({ ...current, email: value }))} keyboardType="email-address" />
              <Field label="Temporary password" value={props.inviteForm.password} onChangeText={(value) => props.setInviteForm((current) => ({ ...current, password: value }))} secureTextEntry />
              <Text style={styles.label}>Role</Text>
              <Segmented options={props.isAdmin ? roleOptions : ["RECRUITER"]} value={props.inviteForm.role} onChange={(value) => props.setInviteForm((current) => ({ ...current, role: value }))} />
              <Pressable style={styles.primaryButton} onPress={props.onInviteUser}>
                <Text style={styles.primaryButtonText}>Create account</Text>
              </Pressable>
            </View>
          )}

          {canManageUsers && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Team directory</Text>
              {(props.isAdmin ? props.selectedOrganizationUsers : props.users).length ? (props.isAdmin ? props.selectedOrganizationUsers : props.users).map((user) => (
                <View key={user.id} style={styles.card}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{user.fullName}</Text>
                    <Text style={styles.meta}>{user.email}</Text>
                    <Text style={styles.meta}>{user.accountStatus}</Text>
                  </View>
                  <Badge text={user.role} />
                  {props.isAdmin ? (
                    <Segmented options={roleOptions} value={props.userRoleDrafts[user.id] || user.role} onChange={(value) => props.setUserRoleDrafts((current) => ({ ...current, [user.id]: value }))} compact />
                  ) : null}
                  <View style={styles.actions}>
                    {props.isAdmin ? (
                      <Pressable style={styles.secondaryButton} onPress={() => props.onUserRole(user.id)}>
                        <Text style={styles.secondaryText}>Save role</Text>
                      </Pressable>
                    ) : null}
                    {user.accountStatus === "ACTIVE" ? (
                      <Pressable style={styles.secondaryButton} onPress={() => props.onUserLifecycle("deactivate", user.id)}>
                        <Text style={styles.secondaryText}>Deactivate</Text>
                      </Pressable>
                    ) : (
                      <Pressable style={styles.secondaryButton} onPress={() => props.onUserLifecycle("reactivate", user.id)}>
                        <Text style={styles.secondaryText}>Reactivate</Text>
                      </Pressable>
                    )}
                    <Pressable style={[styles.secondaryButton, styles.dangerButton]} onPress={() => props.onDeleteUser(user.id)}>
                      <Text style={[styles.secondaryText, { color: palette.danger }]}>Delete</Text>
                    </Pressable>
                  </View>
                </View>
              )) : <EmptyState copy="No team members found for this workspace yet." compact />}
            </View>
          )}
        </Section>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.lg
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md
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
  messageBubble: {
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 16,
    padding: spacing.md,
    gap: spacing.xs,
    backgroundColor: palette.surface
  },
  messageAuthor: {
    fontSize: 13,
    fontWeight: "700",
    color: palette.ink
  },
  messageBody: {
    fontSize: 14,
    lineHeight: 22,
    color: palette.slate
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
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
  choiceChipText: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: "600"
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: palette.ink
  },
  resultText: {
    fontSize: 14,
    lineHeight: 22,
    color: palette.ink
  },
  avatarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md
  },
  avatarCard: {
    width: "30%",
    minWidth: 90,
    alignItems: "center",
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.surface
  },
  avatarCardActive: {
    borderColor: palette.primary,
    backgroundColor: palette.primarySoft
  },
  avatarImage: {
    width: 68,
    height: 68,
    borderRadius: 18,
    backgroundColor: palette.card
  },
  dropdownButton: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.surface,
    justifyContent: "center",
    paddingHorizontal: spacing.md
  },
  dropdownText: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: "600"
  },
  dropdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: palette.surface
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
  secondaryText: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: "600"
  },
  dangerButton: {
    borderColor: palette.dangerSoft
  }
});
