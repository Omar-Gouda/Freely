import { getApiBaseUrl } from "./api";

export function createJobForm() {
  return {
    title: "",
    rawDescription: "",
    headcount: "1",
    location: "",
    sourceCampaign: "",
    status: "OPEN" as const,
    assignedRecruiterId: "",
    mustHaveRequirements: "",
    niceToHaveRequirements: ""
  };
}

export function createCandidateForm() {
  return {
    jobId: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    source: "LinkedIn",
    yearsExperience: "",
    skills: "",
    notes: "",
    country: "",
    address: "",
    linkedInUrl: ""
  };
}

export function createSlotForm() {
  return {
    jobId: "",
    assignedRecruiterId: "",
    interviewerNames: "",
    startsAt: "",
    endsAt: "",
    location: "",
    notes: ""
  };
}

export function createSupportForm() {
  return { subject: "", message: "" };
}

export function createInviteForm() {
  return {
    fullName: "",
    email: "",
    password: "",
    role: "RECRUITER" as const,
    organizationId: ""
  };
}

export function createProfileForm(profile?: {
  username?: string | null;
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  position?: string | null;
  location?: string | null;
  address?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  skills?: string[];
  experienceSummary?: string | null;
  educationSummary?: string | null;
}) {
  return {
    username: profile?.username || "",
    fullName: profile?.fullName || "",
    email: profile?.email || "",
    password: "",
    phone: profile?.phone || "",
    company: profile?.company || "",
    position: profile?.position || "",
    location: profile?.location || "",
    address: profile?.address || "",
    bio: profile?.bio || "",
    avatarUrl: profile?.avatarUrl || "/Avatar1.png",
    skills: (profile?.skills || []).join(", "),
    experienceSummary: profile?.experienceSummary || "",
    educationSummary: profile?.educationSummary || ""
  };
}

export function formatLabel(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (character) => character.toUpperCase());
}

export function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

export function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

export function parseCommaList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function toOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const next = Number(trimmed);
  return Number.isFinite(next) ? next : null;
}

export function toIsoDateTime(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed.includes("T") ? trimmed : trimmed.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function avatarUri(path: string) {
  try {
    return `${getApiBaseUrl()}${path}`;
  } catch {
    return undefined;
  }
}
