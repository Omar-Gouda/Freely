import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

import type {
  AnalyticsOverview,
  Candidate,
  InterviewSlot,
  Job,
  NotificationItem,
  Organization,
  OutreachTemplateResult,
  Profile,
  Role,
  SupportThread,
  SupportThreadStatus,
  WorkspaceUser
} from "./src/types";
import type {
  CandidateEditState,
  CandidateFormState,
  InterviewEditState,
  InviteFormState,
  JobEditState,
  JobFormState,
  Notice,
  ProfileFormState,
  SlotFormState,
  SupportFormState,
  TopTab,
  WorkspaceTab
} from "./src/app-types";
import { topTabs } from "./src/app-types";
import { apiRequest, ApiError, getApiBaseUrl } from "./src/lib/api";
import { clearStoredSession, loadStoredSession, saveStoredSession, signInWithPassword, type StoredAuthSession } from "./src/lib/auth";
import { createCandidateForm, createInviteForm, createJobForm, createProfileForm, createSlotForm, createSupportForm, parseCommaList, toIsoDateTime, toOptionalNumber } from "./src/lib/helpers";
import { palette, radius, spacing } from "./src/theme";
import { Banner, uiStyles } from "./src/components/ui";
import { DashboardPanel } from "./src/screens/dashboard-panel";
import { JobsPanel } from "./src/screens/jobs-panel";
import { CandidatesPanel } from "./src/screens/candidates-panel";
import { InterviewsPanel } from "./src/screens/interviews-panel";
import { WorkspacePanel } from "./src/screens/workspace-panel";
import { LoginScreen } from "./src/screens/login-screen";

async function syncSession(nextSession: StoredAuthSession | null, setStoredSessionState: (value: StoredAuthSession | null) => void) {
  setStoredSessionState(nextSession);
  if (nextSession) {
    await saveStoredSession(nextSession);
  } else {
    await clearStoredSession();
  }
}

export default function App() {
  const [booting, setBooting] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLabel, setActionLabel] = useState<string | null>(null);
  const [storedSession, setStoredSessionState] = useState<StoredAuthSession | null>(null);
  const [session, setSession] = useState<ProfileSession | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [interviews, setInterviews] = useState<InterviewSlot[]>([]);
  const [supportThreads, setSupportThreads] = useState<SupportThread[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [users, setUsers] = useState<WorkspaceUser[]>([]);
  const [activeTab, setActiveTab] = useState<TopTab>("dashboard");
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<WorkspaceTab>("pipeline");
  const [notice, setNotice] = useState<Notice>(null);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("");
  const [organizationMenuOpen, setOrganizationMenuOpen] = useState(false);
  const [outreachKind, setOutreachKind] = useState<"INTERVIEW_INVITE" | "ACCEPTANCE" | "REJECTION">("INTERVIEW_INVITE");
  const [outreachCandidateId, setOutreachCandidateId] = useState("");
  const [outreachResult, setOutreachResult] = useState<OutreachTemplateResult | null>(null);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [jobForm, setJobForm] = useState<JobFormState>(createJobForm());
  const [candidateForm, setCandidateForm] = useState<CandidateFormState>(createCandidateForm());
  const [slotForm, setSlotForm] = useState<SlotFormState>(createSlotForm());
  const [supportForm, setSupportForm] = useState<SupportFormState>(createSupportForm());
  const [inviteForm, setInviteForm] = useState<InviteFormState>(createInviteForm());
  const [profileForm, setProfileForm] = useState<ProfileFormState>(createProfileForm());
  const [jobEdits, setJobEdits] = useState<Record<string, JobEditState>>({});
  const [candidateEdits, setCandidateEdits] = useState<Record<string, CandidateEditState>>({});
  const [interviewEdits, setInterviewEdits] = useState<Record<string, InterviewEditState>>({});
  const [threadReplies, setThreadReplies] = useState<Record<string, string>>({});
  const [userRoleDrafts, setUserRoleDrafts] = useState<Record<string, Role>>({});

  const role = session?.role;
  const canManageJobs = role === "ADMIN" || role === "ORG_HEAD";
  const isAdmin = role === "ADMIN";
  const currentOrgRecruiters = users.filter((user) => user.organizationId === session?.organizationId && user.role === "RECRUITER");
  const selectedOrganization = organizations.find((organization) => organization.id === selectedOrganizationId) || null;
  const selectedOrganizationUsers = users.filter((user) => user.organizationId === (selectedOrganizationId || session?.organizationId));
  const upcomingInterviews = interviews.filter((item) => new Date(item.startsAt).getTime() >= Date.now()).slice(0, 5);
  const openSupportCount = supportThreads.filter((thread) => thread.status !== "RESOLVED").length;

  const configurationError = (() => {
    try {
      getApiBaseUrl();
      return "";
    } catch (error) {
      return error instanceof Error ? error.message : "Missing mobile app environment.";
    }
  })();

  async function resetToSignIn(message?: string) {
    await syncSession(null, setStoredSessionState);
    setSession(null);
    setProfile(null);
    setJobs([]);
    setCandidates([]);
    setInterviews([]);
    setSupportThreads([]);
    setNotifications([]);
    setAnalytics(null);
    setOrganizations([]);
    setUsers([]);
    setSelectedOrganizationId("");
    if (message) setNotice({ tone: "error", message });
  }

  async function callApi<T>(path: string, options?: { method?: "GET" | "POST" | "PATCH" | "DELETE"; body?: Record<string, unknown> | null }) {
    const result = await apiRequest<T>(path, options, storedSession);
    if (result.session && result.session.accessToken !== storedSession?.accessToken) {
      setStoredSessionState(result.session);
    }
    return result;
  }

  async function loadWorkspace(seedSession?: StoredAuthSession | null, silent = false) {
    const activeSession = seedSession ?? storedSession;
    if (!activeSession) {
      setBooting(false);
      return;
    }

    silent ? setRefreshing(true) : setBooting(true);
    try {
      const meResponse = await apiRequest<ProfileSession>("/api/auth/me", {}, activeSession);
      const fanoutSession = meResponse.session || activeSession;
      const [profileResponse, jobsResponse, candidatesResponse, interviewsResponse, supportResponse, notificationsResponse, analyticsResponse] = await Promise.all([
        apiRequest<Profile>("/api/profile", {}, fanoutSession),
        apiRequest<Job[]>("/api/jobs", {}, fanoutSession),
        apiRequest<Candidate[]>("/api/candidates", {}, fanoutSession),
        apiRequest<InterviewSlot[]>("/api/interviews", {}, fanoutSession),
        apiRequest<SupportThread[]>("/api/support", {}, fanoutSession),
        apiRequest<NotificationItem[]>("/api/notifications", {}, fanoutSession),
        apiRequest<AnalyticsOverview>("/api/analytics/overview", {}, fanoutSession)
      ]);

      let latestSession = profileResponse.session || jobsResponse.session || candidatesResponse.session || interviewsResponse.session || supportResponse.session || notificationsResponse.session || analyticsResponse.session || meResponse.session || activeSession;
      let nextOrganizations: Organization[] = [];
      let nextUsers: WorkspaceUser[] = [];

      if (meResponse.data.role === "ADMIN") {
        const [organizationsResponse, usersResponse] = await Promise.all([
          apiRequest<Organization[]>("/api/organizations", {}, latestSession),
          apiRequest<WorkspaceUser[]>("/api/settings/users", {}, latestSession)
        ]);
        latestSession = organizationsResponse.session || usersResponse.session || latestSession;
        nextOrganizations = organizationsResponse.data;
        nextUsers = usersResponse.data;
      } else if (meResponse.data.role === "ORG_HEAD") {
        const usersResponse = await apiRequest<WorkspaceUser[]>("/api/settings/users", {}, latestSession);
        latestSession = usersResponse.session || latestSession;
        nextUsers = usersResponse.data;
      }

      await syncSession(latestSession, setStoredSessionState);
      setSession(meResponse.data);
      setProfile(profileResponse.data);
      setJobs(jobsResponse.data);
      setCandidates(candidatesResponse.data);
      setInterviews(interviewsResponse.data);
      setSupportThreads(supportResponse.data);
      setNotifications(notificationsResponse.data);
      setAnalytics(analyticsResponse.data);
      setOrganizations(nextOrganizations);
      setUsers(nextUsers);
      setNotice(null);
    } catch (error) {
      await resetToSignIn(error instanceof Error ? error.message : "Unable to load the workspace right now.");
    } finally {
      setBooting(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    const run = async () => {
      const saved = await loadStoredSession();
      if (!saved) {
        setBooting(false);
        return;
      }

      setStoredSessionState(saved);
      await loadWorkspace(saved);
    };

    void run();
  }, []);

  useEffect(() => {
    setProfileForm(createProfileForm(profile || undefined));
  }, [profile?.id]);

  useEffect(() => {
    if (!candidateForm.jobId && jobs[0]?.id) setCandidateForm((current) => ({ ...current, jobId: jobs[0].id }));
    if (!slotForm.jobId && jobs[0]?.id) setSlotForm((current) => ({ ...current, jobId: jobs[0].id }));
  }, [jobs.length]);

  useEffect(() => {
    const nextEdits: Record<string, JobEditState> = {};
    jobs.forEach((job) => { nextEdits[job.id] = { assignedRecruiterId: job.assignedRecruiterId || "", status: job.status }; });
    setJobEdits(nextEdits);
  }, [jobs.map((job) => `${job.id}:${job.assignedRecruiterId || ""}:${job.status}`).join("|")]);

  useEffect(() => {
    const nextEdits: Record<string, CandidateEditState> = {};
    candidates.forEach((candidate) => {
      nextEdits[candidate.id] = {
        notes: candidate.notes || "",
        cvScore: candidate.cvScore?.toString() || "",
        englishScore: candidate.englishScore?.toString() || "",
        overallScore: candidate.overallScore?.toString() || ""
      };
    });
    setCandidateEdits(nextEdits);
  }, [candidates.map((candidate) => `${candidate.id}:${candidate.stage}:${candidate.updatedAt}`).join("|")]);

  useEffect(() => {
    const nextEdits: Record<string, InterviewEditState> = {};
    interviews.forEach((slot) => {
      nextEdits[slot.id] = {
        bookingCandidateId: slot.booking?.candidateId || "",
        notes: slot.booking?.notes || slot.notes || "",
        communicationRating: slot.booking?.interviewEvaluation?.communicationRating?.toString() || "",
        languageRating: slot.booking?.interviewEvaluation?.languageRating?.toString() || ""
      };
    });
    setInterviewEdits(nextEdits);
  }, [interviews.map((slot) => `${slot.id}:${slot.status}:${slot.booking?.status || ""}`).join("|")]);

  useEffect(() => {
    const nextRoles: Record<string, Role> = {};
    users.forEach((user) => { nextRoles[user.id] = user.role; });
    setUserRoleDrafts(nextRoles);
  }, [users.map((user) => `${user.id}:${user.role}`).join("|")]);

  useEffect(() => {
    if (isAdmin && !selectedOrganizationId && organizations[0]?.id) {
      setSelectedOrganizationId(organizations[0].id);
      setInviteForm((current) => ({ ...current, organizationId: organizations[0].id }));
    }
  }, [isAdmin, organizations.length, selectedOrganizationId]);

  async function runMutation(action: string, task: () => Promise<StoredAuthSession | null>) {
    setActionLabel(action);
    try {
      const nextSession = await task();
      await loadWorkspace(nextSession || storedSession, true);
      setNotice({ tone: "success", message: `${action} completed.` });
    } catch (error) {
      const message = error instanceof ApiError ? error.message : error instanceof Error ? error.message : `${action} failed.`;
      if (error instanceof ApiError && error.status === 401) await resetToSignIn(message);
      else setNotice({ tone: "error", message });
    } finally {
      setActionLabel(null);
    }
  }

  async function handleSignIn() {
    if (configurationError) return setNotice({ tone: "error", message: configurationError });
    setSigningIn(true);
    try {
      const nextSession = await signInWithPassword(loginEmail, loginPassword);
      await syncSession(nextSession, setStoredSessionState);
      await loadWorkspace(nextSession);
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "Unable to sign in." });
    } finally {
      setSigningIn(false);
    }
  }

  const handleCreateJob = () => runMutation("Job created", async () => (await callApi<Job>("/api/jobs", { method: "POST", body: { ...jobForm, headcount: Number(jobForm.headcount || 1), mustHaveRequirements: parseCommaList(jobForm.mustHaveRequirements), niceToHaveRequirements: parseCommaList(jobForm.niceToHaveRequirements) } })).session);
  const handleSaveJob = (jobId: string) => runMutation("Job updated", async () => (await callApi<Job>(`/api/jobs/${jobId}`, { method: "PATCH", body: jobEdits[jobId] })).session);
  const handleCreateCandidate = () => runMutation("Candidate created", async () => (await callApi<Candidate>("/api/candidates", { method: "POST", body: { ...candidateForm, yearsExperience: candidateForm.yearsExperience ? Number(candidateForm.yearsExperience) : undefined, skills: parseCommaList(candidateForm.skills) } })).session);
  const handleSaveCandidate = (candidateId: string) => runMutation("Candidate updated", async () => (await callApi<Candidate>(`/api/candidates/${candidateId}`, { method: "PATCH", body: { notes: candidateEdits[candidateId].notes, cvScore: toOptionalNumber(candidateEdits[candidateId].cvScore), englishScore: toOptionalNumber(candidateEdits[candidateId].englishScore), overallScore: toOptionalNumber(candidateEdits[candidateId].overallScore) } })).session);
  const handleStageUpdate = (candidateId: string, stage: Candidate["stage"]) => runMutation("Candidate stage updated", async () => (await callApi<Candidate>(`/api/candidates/${candidateId}/status`, { method: "PATCH", body: { stage, reason: "Updated from mobile workspace" } })).session);
  const handleCreateSlot = () => {
    const startsAt = toIsoDateTime(slotForm.startsAt);
    const endsAt = toIsoDateTime(slotForm.endsAt);
    if (!startsAt || !endsAt) return setNotice({ tone: "error", message: "Use a valid start and end date like 2026-04-08 13:00." });
    return runMutation("Interview slot created", async () => (await callApi<InterviewSlot>("/api/interviews", { method: "POST", body: { ...slotForm, startsAt, endsAt, interviewerNames: parseCommaList(slotForm.interviewerNames) } })).session);
  };
  const handleBookInterview = (slotId: string) => runMutation("Interview booked", async () => (await callApi<InterviewSlot>("/api/interviews", { method: "POST", body: { slotId, candidateId: interviewEdits[slotId].bookingCandidateId, notes: interviewEdits[slotId].notes } })).session);
  const handleUpdateInterview = (slotId: string, bookingStatus?: "COMPLETED" | "CANCELLED") => runMutation("Interview updated", async () => (await callApi<InterviewSlot>("/api/interviews", { method: "PATCH", body: { slotId, bookingStatus, notes: interviewEdits[slotId].notes, interviewEvaluation: { mustHaveChecks: [], niceToHaveChecks: [], communicationRating: toOptionalNumber(interviewEdits[slotId].communicationRating), languageRating: toOptionalNumber(interviewEdits[slotId].languageRating), notes: interviewEdits[slotId].notes, educationNotes: "", workExperienceNotes: "", age: "", nationalIdNumber: "" } } })).session);
  const handleCreateSupportThread = () => runMutation("Support request sent", async () => (await callApi<{ thread: SupportThread }>("/api/support", { method: "POST", body: supportForm })).session);
  const handleReply = (threadId: string) => runMutation("Support reply sent", async () => (await callApi<{ thread: SupportThread }>(`/api/support/${threadId}/messages`, { method: "POST", body: { message: threadReplies[threadId] || "" } })).session);
  const handleSupportStatus = (threadId: string, status: SupportThreadStatus) => runMutation("Support status updated", async () => (await callApi<{ thread: SupportThread }>(`/api/support/${threadId}`, { method: "PATCH", body: { status } })).session);
  const handleGenerateOutreach = () => runMutation("Outreach generated", async () => { const result = await callApi<{ templates: OutreachTemplateResult[] }>("/api/whatsapp/templates", { method: "POST", body: { kind: outreachKind, candidateId: outreachCandidateId || undefined } }); setOutreachResult(result.data.templates[0] || null); return result.session; });
  const handleSaveProfile = () => runMutation("Profile saved", async () => (await callApi<Profile>("/api/profile", { method: "PATCH", body: { ...profileForm, skills: parseCommaList(profileForm.skills) } })).session);
  const handleOrganizationAction = (action: "approve" | "suspend" | "reactivate" | "end_contract" | "archive") => runMutation(`Organization ${action}`, async () => (await callApi<Organization>("/api/organizations", { method: "PATCH", body: { organizationId: selectedOrganizationId, action, note: "Updated from Freely Mobile" } })).session);
  const handleInviteUser = () => runMutation("Team member invited", async () => (await callApi<{ user: WorkspaceUser }>("/api/settings/users", { method: "POST", body: { ...inviteForm, organizationId: isAdmin ? inviteForm.organizationId || selectedOrganizationId : undefined } })).session);
  const handleUserRole = (userId: string) => runMutation("User role updated", async () => (await callApi<WorkspaceUser>("/api/settings/users", { method: "PATCH", body: { action: "role", userId, role: userRoleDrafts[userId] } })).session);
  const handleUserLifecycle = (action: "deactivate" | "reactivate", userId: string) => runMutation(`User ${action}`, async () => (await callApi<WorkspaceUser>("/api/settings/users", { method: "PATCH", body: { action, userId } })).session);

  const handleDeleteJob = (jobId: string) => Alert.alert("Remove job", "This will permanently remove the selected job.", [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => void runMutation("Job removed", async () => (await callApi<{ deleted: number }>(`/api/jobs/${jobId}`, { method: "DELETE" })).session) }]);
  const handleDeleteCandidate = (candidateId: string) => Alert.alert("Remove candidate", "This will hide the candidate from the active workspace.", [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => void runMutation("Candidate removed", async () => (await callApi<{ success: boolean }>(`/api/candidates/${candidateId}`, { method: "DELETE" })).session) }]);
  const handleDeleteUser = (userId: string) => Alert.alert("Remove user", "This permanently removes the selected account.", [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => void runMutation("User removed", async () => (await callApi<{ removed: boolean }>("/api/settings/users", { method: "DELETE", body: { userId } })).session) }]);

  if (booting) {
    return <SafeAreaView style={styles.screen}><StatusBar style="dark" /><View style={styles.centered}><ActivityIndicator size="large" color={palette.primary} /><Text style={styles.loading}>Loading Freely Mobile</Text></View></SafeAreaView>;
  }

  if (!session) {
    return <LoginScreen configurationError={configurationError} notice={notice} signingIn={signingIn} email={loginEmail} password={loginPassword} onEmailChange={setLoginEmail} onPasswordChange={setLoginPassword} onSignIn={() => void handleSignIn()} />;
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={uiStyles.headerCard}>
          <Text style={uiStyles.eyebrow}>{session.organizationName || "Freely workspace"}</Text>
          <Text style={uiStyles.pageTitle}>{session.fullName || session.email}</Text>
          <Text style={styles.copy}>Mobile access to jobs, candidates, interviews, support, analytics, and workspace controls.</Text>
          {notice && <Banner notice={notice} />}
          <View style={styles.actions}>
            <Pressable style={styles.secondaryButton} onPress={() => void loadWorkspace(undefined, true)}><Text style={styles.secondaryText}>{refreshing ? "Refreshing..." : "Refresh"}</Text></Pressable>
            <Pressable style={styles.secondaryButton} onPress={() => void resetToSignIn()}><Text style={styles.secondaryText}>Sign out</Text></Pressable>
          </View>
          {!!actionLabel && <Text style={styles.meta}>{actionLabel}...</Text>}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={uiStyles.tabStrip}>
          {topTabs.map((tab) => {
            const active = tab.id === activeTab;
            return <Pressable key={tab.id} style={[uiStyles.tabButton, active ? uiStyles.tabButtonActive : null]} onPress={() => setActiveTab(tab.id)}><Text style={[uiStyles.tabText, active ? uiStyles.tabTextActive : null]}>{tab.label}</Text></Pressable>;
          })}
        </ScrollView>

        {activeTab === "dashboard" && <DashboardPanel analytics={analytics} jobsCount={jobs.length} candidatesCount={candidates.length} openSupportCount={openSupportCount} upcomingInterviews={upcomingInterviews} notifications={notifications} />}
        {activeTab === "jobs" && <JobsPanel canManageJobs={canManageJobs} jobs={jobs} currentOrgRecruiters={currentOrgRecruiters} jobForm={jobForm} setJobForm={setJobForm} jobEdits={jobEdits} setJobEdits={setJobEdits} onCreateJob={() => void handleCreateJob()} onSaveJob={(jobId) => void handleSaveJob(jobId)} onDeleteJob={handleDeleteJob} />}
        {activeTab === "candidates" && <CandidatesPanel candidates={candidates} jobs={jobs} canManageCandidates={canManageJobs} candidateForm={candidateForm} setCandidateForm={setCandidateForm} candidateEdits={candidateEdits} setCandidateEdits={setCandidateEdits} onCreateCandidate={() => void handleCreateCandidate()} onSaveCandidate={(candidateId) => void handleSaveCandidate(candidateId)} onStageUpdate={(candidateId, stage) => void handleStageUpdate(candidateId, stage)} onDeleteCandidate={handleDeleteCandidate} />}
        {activeTab === "interviews" && <InterviewsPanel interviews={interviews} candidates={candidates} jobs={jobs} currentOrgRecruiters={currentOrgRecruiters} slotForm={slotForm} setSlotForm={setSlotForm} interviewEdits={interviewEdits} setInterviewEdits={setInterviewEdits} onCreateSlot={() => void handleCreateSlot()} onBookInterview={(slotId) => void handleBookInterview(slotId)} onUpdateInterview={(slotId, status) => void handleUpdateInterview(slotId, status)} />}
        {activeTab === "workspace" && <WorkspacePanel role={role || "RECRUITER"} activeTab={activeWorkspaceTab} setActiveTab={setActiveWorkspaceTab} analytics={analytics} candidates={candidates} supportThreads={supportThreads} profile={profile} profileForm={profileForm} setProfileForm={setProfileForm} supportForm={supportForm} setSupportForm={setSupportForm} threadReplies={threadReplies} setThreadReplies={setThreadReplies} isAdmin={isAdmin} organizations={organizations} selectedOrganizationId={selectedOrganizationId} setSelectedOrganizationId={setSelectedOrganizationId} organizationMenuOpen={organizationMenuOpen} setOrganizationMenuOpen={setOrganizationMenuOpen} selectedOrganization={selectedOrganization} users={users} selectedOrganizationUsers={selectedOrganizationUsers} inviteForm={inviteForm} setInviteForm={setInviteForm} userRoleDrafts={userRoleDrafts} setUserRoleDrafts={setUserRoleDrafts} outreachKind={outreachKind} setOutreachKind={setOutreachKind} outreachCandidateId={outreachCandidateId} setOutreachCandidateId={setOutreachCandidateId} outreachResult={outreachResult} onCreateSupportThread={() => void handleCreateSupportThread()} onReply={(threadId) => void handleReply(threadId)} onSupportStatus={(threadId, status) => void handleSupportStatus(threadId, status)} onGenerateOutreach={() => void handleGenerateOutreach()} onSaveProfile={() => void handleSaveProfile()} onOrganizationAction={(action) => void handleOrganizationAction(action)} onInviteUser={() => void handleInviteUser()} onUserRole={(userId) => void handleUserRole(userId)} onUserLifecycle={(action, userId) => void handleUserLifecycle(action, userId)} onDeleteUser={handleDeleteUser} />}
      </ScrollView>
    </SafeAreaView>
  );
}

type ProfileSession = {
  id: string;
  email: string;
  organizationId: string;
  organizationName?: string | null;
  role: Role;
  fullName?: string | null;
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.surface
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm
  },
  loading: {
    fontSize: 18,
    fontWeight: "700",
    color: palette.ink
  },
  copy: {
    fontSize: 14,
    lineHeight: 22,
    color: palette.slate
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap"
  },
  secondaryButton: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
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
  meta: {
    fontSize: 13,
    color: palette.soft
  }
});
