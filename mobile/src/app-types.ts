import type { CandidateStage, JobStatus, OutreachKind, Role, SupportThreadStatus } from "./types";

export type TopTab = "dashboard" | "jobs" | "candidates" | "interviews" | "workspace";
export type WorkspaceTab = "pipeline" | "analytics" | "support" | "outreach" | "profile" | "settings";

export type JobFormState = {
  title: string;
  rawDescription: string;
  headcount: string;
  location: string;
  sourceCampaign: string;
  status: JobStatus;
  assignedRecruiterId: string;
  mustHaveRequirements: string;
  niceToHaveRequirements: string;
};

export type CandidateFormState = {
  jobId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  source: string;
  yearsExperience: string;
  skills: string;
  notes: string;
  country: string;
  address: string;
  linkedInUrl: string;
};

export type SlotFormState = {
  jobId: string;
  assignedRecruiterId: string;
  interviewerNames: string;
  startsAt: string;
  endsAt: string;
  location: string;
  notes: string;
};

export type SupportFormState = {
  subject: string;
  message: string;
};

export type InviteFormState = {
  fullName: string;
  email: string;
  password: string;
  role: Role;
  organizationId: string;
};

export type ProfileFormState = {
  username: string;
  fullName: string;
  email: string;
  password: string;
  phone: string;
  company: string;
  position: string;
  location: string;
  address: string;
  bio: string;
  avatarUrl: string;
  skills: string;
  experienceSummary: string;
  educationSummary: string;
};

export type Notice = {
  tone: "success" | "error";
  message: string;
} | null;

export type JobEditState = {
  assignedRecruiterId: string;
  status: JobStatus;
};

export type CandidateEditState = {
  notes: string;
  cvScore: string;
  englishScore: string;
  overallScore: string;
};

export type InterviewEditState = {
  bookingCandidateId: string;
  notes: string;
  communicationRating: string;
  languageRating: string;
};

export const topTabs: Array<{ id: TopTab; label: string }> = [
  { id: "dashboard", label: "Dashboard" },
  { id: "jobs", label: "Jobs" },
  { id: "candidates", label: "Candidates" },
  { id: "interviews", label: "Interviews" },
  { id: "workspace", label: "Workspace" }
];

export const workspaceTabs: Array<{ id: WorkspaceTab; label: string }> = [
  { id: "pipeline", label: "Pipeline" },
  { id: "analytics", label: "Analytics" },
  { id: "support", label: "Support" },
  { id: "outreach", label: "Outreach" },
  { id: "profile", label: "Profile" },
  { id: "settings", label: "Settings" }
];

export const jobStatuses: JobStatus[] = ["DRAFT", "OPEN", "ON_HOLD", "CLOSED"];
export const candidateStages: CandidateStage[] = ["APPLIED", "SCREENED", "QUALIFIED", "INTERVIEW_SCHEDULED", "REJECTED", "HIRED"];
export const supportStatuses: SupportThreadStatus[] = ["OPEN", "WAITING_ON_REQUESTER", "RESOLVED"];
export const outreachKinds: OutreachKind[] = ["INTERVIEW_INVITE", "ACCEPTANCE", "REJECTION"];
export const roleOptions: Role[] = ["ADMIN", "ORG_HEAD", "RECRUITER"];

export const avatarPresets = [
  { id: "omar", label: "Omar", src: "/Avatar1.png" },
  { id: "noor", label: "Noor", src: "/Avatar2.png" },
  { id: "sami", label: "Sami", src: "/Avatar3.png" },
  { id: "maya", label: "Maya", src: "/Avatar4.png" },
  { id: "zayd", label: "Zayd", src: "/Avatar5.png" },
  { id: "lara", label: "Lara", src: "/GirlyAvatar1.png" },
  { id: "hana", label: "Hana", src: "/GirlyAvatar2.png" },
  { id: "reem", label: "Reem", src: "/GirlyAvatar3.png" },
  { id: "nadia", label: "Nadia", src: "/GirlyAvatar4.png" }
] as const;
