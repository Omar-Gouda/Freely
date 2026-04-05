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

export type Organization = {
  id: string;
  name: string;
  slug: string;
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
  title: string;
  rawDescription: string;
  structuredData?: Record<string, unknown> | null;
  status: JobStatus;
  headcount: number;
  location?: string | null;
  sourceCampaign?: string | null;
  candidateIds: string[];
  generatedAds: GeneratedJobAdRecord[];
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
  stageEvents: CandidateStageEventRecord[];
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
  status: "queued" | "processing" | "completed" | "failed";
  attempts: number;
  maxAttempts: number;
  priority: number;
  lastError?: string | null;
  runAfter: Date;
  createdAt: Date;
  updatedAt: Date;
};
