export type Role = "ADMIN" | "ORG_HEAD" | "RECRUITER";
export type OrganizationStatus = "PENDING_APPROVAL" | "ACTIVE" | "SUSPENDED" | "CONTRACT_ENDED";
export type UserAccountStatus = "ACTIVE" | "DEACTIVATED";
export type JobStatus = "DRAFT" | "OPEN" | "ON_HOLD" | "CLOSED";
export type CandidateStage = "APPLIED" | "SCREENED" | "QUALIFIED" | "INTERVIEW_SCHEDULED" | "REJECTED" | "HIRED";
export type InterviewStatus = "AVAILABLE" | "BOOKED" | "COMPLETED" | "CANCELLED";
export type InterviewBookingStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
export type SupportThreadStatus = "OPEN" | "WAITING_ON_REQUESTER" | "RESOLVED";
export type SupportThreadSource = "IN_APP" | "PUBLIC_CONTACT";
export type OutreachKind = "ACCEPTANCE" | "REJECTION" | "INTERVIEW_INVITE";

export type AuthSession = {
  id: string;
  email: string;
  organizationId: string;
  organizationName?: string | null;
  role: Role;
  fullName?: string | null;
  avatarUrl?: string | null;
  onboardingCompleted?: boolean | null;
};

export type Profile = {
  id: string;
  username?: string | null;
  email: string;
  pendingEmail?: string | null;
  fullName: string;
  avatarUrl?: string | null;
  phone?: string | null;
  company?: string | null;
  position?: string | null;
  location?: string | null;
  address?: string | null;
  skills: string[];
  experienceSummary?: string | null;
  educationSummary?: string | null;
  bio?: string | null;
  role: Role;
};

export type Organization = {
  id: string;
  name: string;
  slug: string;
  status: OrganizationStatus;
  requestedByEmail?: string | null;
  approvedAt?: string | null;
  approvedById?: string | null;
  approvalNotes?: string | null;
  deactivatedAt?: string | null;
  contractEndsAt?: string | null;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WorkspaceUser = {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  organizationId: string;
  accountStatus: UserAccountStatus;
  deactivatedAt?: string | null;
  scheduledDeletionAt?: string | null;
};

export type JobAssignmentRecord = {
  id: string;
  recruiterId: string;
  assignedById: string;
  assignedAt: string;
  withdrawnAt?: string | null;
};

export type GeneratedAd = {
  id: string;
  channel: string;
  content: string;
};

export type Job = {
  id: string;
  organizationId: string;
  createdById: string;
  assignedRecruiterId?: string | null;
  assignmentHistory: JobAssignmentRecord[];
  title: string;
  rawDescription: string;
  structuredData?: Record<string, unknown> | null;
  status: JobStatus;
  headcount: number;
  location?: string | null;
  sourceCampaign?: string | null;
  candidateIds?: string[];
  generatedAds?: GeneratedAd[];
  mustHaveRequirements?: string[];
  niceToHaveRequirements?: string[];
  createdAt: string;
  updatedAt: string;
  _count?: { candidates?: number };
  candidates?: Candidate[];
};

export type CandidateFile = {
  id: string;
  fileName: string;
  kind: string;
  storageKey: string;
};

export type CandidateStageEvent = {
  id: string;
  fromStage?: CandidateStage | null;
  toStage: CandidateStage;
  reason?: string | null;
  createdAt: string;
};

export type CandidateInterviewEvaluation = {
  notes?: string | null;
  communicationRating?: number | null;
  languageRating?: number | null;
};

export type CandidateInterviewScorecard = {
  id: string;
  slotId: string;
  bookingStatus: InterviewBookingStatus;
  jobTitle: string;
  interviewerNames: string[];
  location?: string | null;
  scheduledAt: string;
  evaluation: CandidateInterviewEvaluation;
  createdAt: string;
  updatedAt: string;
};

export type Candidate = {
  id: string;
  organizationId: string;
  jobId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  country?: string | null;
  address?: string | null;
  linkedInUrl?: string | null;
  source: string;
  stage: CandidateStage;
  yearsExperience?: number | null;
  notes?: string | null;
  skills: string[];
  experienceSummary?: string | null;
  educationSummary?: string | null;
  resumeText?: string | null;
  cvScore?: number | null;
  englishScore?: number | null;
  overallScore?: number | null;
  rankingScore: number;
  files?: CandidateFile[];
  stageEvents?: CandidateStageEvent[];
  interviewScorecards?: CandidateInterviewScorecard[];
  createdAt: string;
  updatedAt: string;
  job?: { id: string; title: string };
};

export type InterviewBooking = {
  id: string;
  candidateId: string;
  status: InterviewBookingStatus;
  notes?: string | null;
  interviewEvaluation?: CandidateInterviewEvaluation | null;
  candidate?: Candidate;
};

export type InterviewSlot = {
  id: string;
  organizationId: string;
  jobId: string;
  assignedRecruiterId?: string | null;
  interviewerNames: string[];
  startsAt: string;
  endsAt: string;
  status: InterviewStatus;
  location?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  job?: { id: string; title: string };
  booking?: InterviewBooking | null;
};

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

export type SupportMessage = {
  id: string;
  authorType: "ADMIN" | "MEMBER" | "EXTERNAL";
  authorUserId?: string | null;
  authorName: string;
  authorEmail?: string | null;
  body: string;
  createdAt: string;
  deliveredByEmail?: boolean | null;
};

export type SupportThread = {
  id: string;
  organizationId: string;
  requesterUserId?: string | null;
  requesterName: string;
  requesterEmail: string;
  requesterCompany?: string | null;
  subject: string;
  status: SupportThreadStatus;
  source: SupportThreadSource;
  assignedAdminUserId?: string | null;
  lastMessageAt: string;
  resolvedAt?: string | null;
  messages: SupportMessage[];
  createdAt: string;
  updatedAt: string;
};

export type AnalyticsOverview = {
  selectedJob: { id: string; title: string } | null;
  totals: {
    jobs: number;
    candidates: number;
    activeJobs: number;
    hired: number;
  };
  sourceBreakdown: Array<{ name: string; value: number }>;
  funnel: Array<{ name: string; value: number }>;
  qualityBands: {
    excellent: number;
    strong: number;
    moderate: number;
    low: number;
  };
  avgTimeToHireDays: number;
  conversionRates: {
    appliedToScreened: number;
    screenedToQualified: number;
    qualifiedToHired: number;
  };
  recentActivity: Array<{
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    createdAt: string;
  }>;
};

export type OutreachTemplateResult = {
  id: string;
  candidateId?: string;
  candidateName?: string;
  content: string;
  phone?: string | null;
  whatsappLink?: string | null;
};
