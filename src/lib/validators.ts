import { AccountType, CandidateStage, InterviewBookingStatus, JobStatus, OutreachKind, Role } from "@/lib/models";
import { z } from "zod";

const optionalUrlSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}, z.union([z.string().url(), z.literal("")]));

export const signupSchema = z.object({
  accountType: z.nativeEnum(AccountType),
  workspaceName: z.string().min(2).max(80),
  fullName: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(128)
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128)
});

export const profileUpdateSchema = z.object({
  username: z.string().min(2).max(40).optional().or(z.literal("")),
  fullName: z.string().min(2).max(80),
  phone: z.string().max(40).optional().or(z.literal("")),
  company: z.string().max(120).optional().or(z.literal("")),
  position: z.string().max(120).optional().or(z.literal("")),
  location: z.string().max(120).optional().or(z.literal("")),
  address: z.string().max(180).optional().or(z.literal("")),
  bio: z.string().max(500).optional().or(z.literal("")),
  skills: z.array(z.string().min(1).max(40)).max(30).default([]),
  experienceSummary: z.string().max(2000).optional().or(z.literal("")),
  educationSummary: z.string().max(2000).optional().or(z.literal("")),
  password: z.string().min(8).max(128).optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal(""))
});

export const userInviteSchema = z.object({
  fullName: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  role: z.nativeEnum(Role),
  organizationId: z.string().min(1).optional().or(z.literal(""))
});

export const contactRequestSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  company: z.string().max(120).optional().or(z.literal("")),
  subject: z.string().min(3).max(120),
  message: z.string().min(10).max(4000)
});

export const jobSchema = z.object({
  title: z.string().min(2).max(120),
  rawDescription: z.string().min(30),
  headcount: z.coerce.number().int().min(1).max(10000),
  location: z.string().max(80).optional().or(z.literal("")),
  sourceCampaign: z.string().max(120).optional().or(z.literal("")),
  sector: z.string().max(80).optional().or(z.literal("")),
  department: z.string().max(80).optional().or(z.literal("")),
  employmentType: z.string().max(80).optional().or(z.literal("")),
  seniority: z.string().max(80).optional().or(z.literal("")),
  workMode: z.string().max(80).optional().or(z.literal("")),
  salaryRange: z.string().max(120).optional().or(z.literal("")),
  languageRequirement: z.string().max(80).optional().or(z.literal("")),
  experienceRequirement: z.string().max(120).optional().or(z.literal("")),
  status: z.nativeEnum(JobStatus).default(JobStatus.DRAFT)
});

export const jobExtractSchema = z.object({
  rawDescription: z.string().min(30)
});

export const candidateSchema = z.object({
  jobId: z.string().min(1),
  firstName: z.string().min(2).max(80),
  lastName: z.string().min(2).max(80),
  email: z.string().email(),
  phone: z.string().max(40).optional().or(z.literal("")),
  country: z.string().max(80).optional().or(z.literal("")),
  address: z.string().max(180).optional().or(z.literal("")),
  linkedInUrl: optionalUrlSchema.optional(),
  source: z.string().min(2).max(80),
  yearsExperience: z.coerce.number().int().min(0).max(50).optional(),
  notes: z.string().max(2000).optional().or(z.literal("")),
  skills: z.array(z.string().min(1).max(40)).max(30).default([]),
  experienceSummary: z.string().max(4000).optional().or(z.literal("")),
  educationSummary: z.string().max(4000).optional().or(z.literal("")),
  resumeText: z.string().max(50000).optional().or(z.literal("")),
  parsedProfile: z.record(z.string(), z.unknown()).optional()
});

export const candidateUpdateSchema = z.object({
  firstName: z.string().min(2).max(80).optional(),
  lastName: z.string().min(2).max(80).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(40).optional().or(z.literal("")),
  country: z.string().max(80).optional().or(z.literal("")),
  address: z.string().max(180).optional().or(z.literal("")),
  linkedInUrl: optionalUrlSchema.optional(),
  source: z.string().min(2).max(80).optional(),
  stage: z.nativeEnum(CandidateStage).optional(),
  yearsExperience: z.coerce.number().int().min(0).max(50).optional(),
  notes: z.string().max(2000).optional().or(z.literal("")),
  skills: z.array(z.string().min(1).max(40)).max(30).optional(),
  experienceSummary: z.string().max(4000).optional().or(z.literal("")),
  educationSummary: z.string().max(4000).optional().or(z.literal("")),
  cvScore: z.coerce.number().min(0).max(10).nullable().optional(),
  englishScore: z.coerce.number().min(0).max(10).nullable().optional(),
  overallScore: z.coerce.number().min(0).max(10).nullable().optional(),
  englishLevel: z.string().max(40).optional().or(z.literal(""))
});

export const candidateResumeParseSchema = z.object({
  jobId: z.string().min(1),
  source: z.string().min(2).max(80).optional().or(z.literal(""))
});

export const stageUpdateSchema = z.object({
  stage: z.nativeEnum(CandidateStage),
  reason: z.string().max(200).optional().or(z.literal(""))
});

export const interviewSlotSchema = z
  .object({
    jobId: z.string().min(1),
    assignedRecruiterId: z.string().optional().or(z.literal("")),
    interviewerNames: z.array(z.string().min(1).max(80)).max(10).default([]),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
    location: z.string().max(120).optional().or(z.literal("")),
    notes: z.string().max(250).optional().or(z.literal(""))
  })
  .refine((values) => new Date(values.endsAt) > new Date(values.startsAt), {
    message: "End time must be after start time",
    path: ["endsAt"]
  });

export const interviewBookingSchema = z.object({
  slotId: z.string().min(1),
  candidateId: z.string().min(1),
  notes: z.string().max(200).optional().or(z.literal("")),
  status: z.nativeEnum(InterviewBookingStatus).optional()
});

export const interviewUpdateSchema = z.object({
  slotId: z.string().min(1),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  assignedRecruiterId: z.string().optional().or(z.literal("")),
  location: z.string().max(120).optional().or(z.literal("")),
  interviewerNames: z.array(z.string().min(1).max(80)).max(10).optional(),
  bookingStatus: z.nativeEnum(InterviewBookingStatus).optional(),
  slotNotes: z.string().max(250).optional().or(z.literal("")),
  notes: z.string().max(200).optional().or(z.literal("")),
  sendReminder: z.boolean().optional()
});

export const outreachTemplateSchema = z.object({
  kind: z.nativeEnum(OutreachKind),
  jobId: z.string().optional(),
  candidateId: z.string().optional(),
  candidateIds: z.array(z.string()).optional(),
  interviewTime: z.string().optional().or(z.literal(""))
});