export const Role = {
  ADMIN: "ADMIN",
  ORG_HEAD: "ORG_HEAD",
  RECRUITER: "RECRUITER"
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const AccountType = {
  PERSONAL: "PERSONAL",
  ORGANIZATIONAL: "ORGANIZATIONAL"
} as const;
export type AccountType = (typeof AccountType)[keyof typeof AccountType];

export const OrganizationStatus = {
  PENDING_APPROVAL: "PENDING_APPROVAL",
  ACTIVE: "ACTIVE",
  SUSPENDED: "SUSPENDED",
  CONTRACT_ENDED: "CONTRACT_ENDED"
} as const;
export type OrganizationStatus = (typeof OrganizationStatus)[keyof typeof OrganizationStatus];

export const UserAccountStatus = {
  ACTIVE: "ACTIVE",
  DEACTIVATED: "DEACTIVATED"
} as const;
export type UserAccountStatus = (typeof UserAccountStatus)[keyof typeof UserAccountStatus];

export const JobStatus = {
  DRAFT: "DRAFT",
  OPEN: "OPEN",
  ON_HOLD: "ON_HOLD",
  CLOSED: "CLOSED"
} as const;
export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];

export const CandidateStage = {
  APPLIED: "APPLIED",
  SCREENED: "SCREENED",
  QUALIFIED: "QUALIFIED",
  INTERVIEW_SCHEDULED: "INTERVIEW_SCHEDULED",
  REJECTED: "REJECTED",
  HIRED: "HIRED"
} as const;
export type CandidateStage = (typeof CandidateStage)[keyof typeof CandidateStage];

export const FileKind = {
  CV: "CV",
  VOICE_NOTE: "VOICE_NOTE",
  AVATAR: "AVATAR"
} as const;
export type FileKind = (typeof FileKind)[keyof typeof FileKind];

export const InterviewStatus = {
  AVAILABLE: "AVAILABLE",
  BOOKED: "BOOKED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED"
} as const;
export type InterviewStatus = (typeof InterviewStatus)[keyof typeof InterviewStatus];

export const InterviewBookingStatus = {
  SCHEDULED: "SCHEDULED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  NO_SHOW: "NO_SHOW"
} as const;
export type InterviewBookingStatus = (typeof InterviewBookingStatus)[keyof typeof InterviewBookingStatus];

export const OutreachKind = {
  ACCEPTANCE: "ACCEPTANCE",
  REJECTION: "REJECTION",
  INTERVIEW_INVITE: "INTERVIEW_INVITE"
} as const;
export type OutreachKind = (typeof OutreachKind)[keyof typeof OutreachKind];

export const NotificationKind = {
  NEW_APPLICANT: "NEW_APPLICANT",
  INTERVIEW_REMINDER: "INTERVIEW_REMINDER",
  STATUS_UPDATE: "STATUS_UPDATE",
  SYSTEM: "SYSTEM"
} as const;
export type NotificationKind = (typeof NotificationKind)[keyof typeof NotificationKind];

export const SupportThreadStatus = {
  OPEN: "OPEN",
  WAITING_ON_REQUESTER: "WAITING_ON_REQUESTER",
  RESOLVED: "RESOLVED"
} as const;
export type SupportThreadStatus = (typeof SupportThreadStatus)[keyof typeof SupportThreadStatus];

export const SupportThreadSource = {
  IN_APP: "IN_APP",
  PUBLIC_CONTACT: "PUBLIC_CONTACT"
} as const;
export type SupportThreadSource = (typeof SupportThreadSource)[keyof typeof SupportThreadSource];

export const SupportMessageAuthorType = {
  ADMIN: "ADMIN",
  MEMBER: "MEMBER",
  EXTERNAL: "EXTERNAL"
} as const;
export type SupportMessageAuthorType = (typeof SupportMessageAuthorType)[keyof typeof SupportMessageAuthorType];

export type CandidateFileRecord = {
  id: string;
  candidateId: string;
  kind: FileKind;
  fileName: string;
  mimeType: string;
  storageKey: string;
  sizeBytes: number;
  createdAt: Date;
};

export type RequirementChecklistItem = {
  label: string;
  checked: boolean;
  notes?: string | null;
};

export type InterviewEvaluation = {
  mustHaveChecks: RequirementChecklistItem[];
  niceToHaveChecks: RequirementChecklistItem[];
  communicationRating?: number | null;
  languageRating?: number | null;
  notes?: string | null;
  educationNotes?: string | null;
  workExperienceNotes?: string | null;
  age?: string | null;
  nationalIdNumber?: string | null;
  updatedById?: string | null;
  updatedAt: Date;
};

export type CandidateInterviewScorecard = {
  id: string;
  slotId: string;
  bookingStatus: InterviewBookingStatus;
  jobTitle: string;
  interviewerNames: string[];
  location?: string | null;
  scheduledAt: Date;
  evaluation: InterviewEvaluation;
  createdAt: Date;
  updatedAt: Date;
};

export type CandidateStageEventRecord = {
  id: string;
  candidateId: string;
  fromStage?: CandidateStage | null;
  toStage: CandidateStage;
  reason?: string | null;
  createdAt: Date;
};

export type GeneratedJobAdRecord = {
  id: string;
  jobId: string;
  channel: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
};

export type JobAssignmentRecord = {
  id: string;
  recruiterId: string;
  assignedById: string;
  assignedAt: Date;
  withdrawnAt?: Date | null;
};

export type Organization = {
  id: string;
  name: string;
  slug: string;
  status: OrganizationStatus;
  requestedByEmail?: string | null;
  approvedAt?: Date | null;
  approvedById?: string | null;
  approvalNotes?: string | null;
  deactivatedAt?: Date | null;
  contractEndsAt?: Date | null;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type User = {
  id: string;
  organizationId: string;
  supabaseAuthId?: string | null;
  username?: string | null;
  email: string;
  pendingEmail?: string | null;
  passwordHash: string;
  fullName: string;
  avatarUrl?: string | null;
  avatarStorageKey?: string | null;
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
  accountStatus: UserAccountStatus;
  deactivatedAt?: Date | null;
  scheduledDeletionAt?: Date | null;
  onboardingCompleted?: boolean | null;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
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
  candidateIds: string[];
  generatedAds: GeneratedJobAdRecord[];
  mustHaveRequirements?: string[];
  niceToHaveRequirements?: string[];
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
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
  parsedProfile?: Record<string, unknown> | null;
  cvEvaluation?: Record<string, unknown> | null;
  voiceEvaluation?: Record<string, unknown> | null;
  cvScore?: number | null;
  englishScore?: number | null;
  overallScore?: number | null;
  rankingScore: number;
  suggestedStage?: CandidateStage | null;
  files: CandidateFileRecord[];
  interviewScorecards: CandidateInterviewScorecard[];
  stageEvents: CandidateStageEventRecord[];
  scheduledPurgeAt?: Date | null;
  purgedAt?: Date | null;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type InterviewSlot = {
  id: string;
  organizationId: string;
  jobId: string;
  assignedRecruiterId?: string | null;
  interviewerNames: string[];
  startsAt: Date;
  endsAt: Date;
  status: InterviewStatus;
  location?: string | null;
  notes?: string | null;
  reminderSentAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type InterviewBooking = {
  id: string;
  slotId: string;
  candidateId: string;
  status: InterviewBookingStatus;
  notes?: string | null;
  interviewEvaluation?: InterviewEvaluation | null;
  createdAt: Date;
  updatedAt: Date;
};

export type OutreachTemplate = {
  id: string;
  organizationId: string;
  jobId?: string | null;
  candidateId?: string | null;
  kind: OutreachKind;
  channel: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
};

export type Notification = {
  id: string;
  organizationId: string;
  userId?: string | null;
  kind: NotificationKind;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
};

export type SupportMessage = {
  id: string;
  authorType: SupportMessageAuthorType;
  authorUserId?: string | null;
  authorName: string;
  authorEmail?: string | null;
  body: string;
  createdAt: Date;
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
  lastMessageAt: Date;
  resolvedAt?: Date | null;
  messages: SupportMessage[];
  createdAt: Date;
  updatedAt: Date;
};

export type AuditLog = {
  id: string;
  organizationId: string;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  meta?: Record<string, unknown> | null;
  createdAt: Date;
};

export type QueueJob = {
  id: string;
  name: string;
  data: Record<string, unknown>;
  attempts: number;
  maxAttempts: number;
  priority: number;
  runAfter: Date;
  status: "queued" | "processing" | "completed" | "failed";
  lastError?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

