import { Role } from "@/lib/models";

export const appName = "Freely";

export const roles = [Role.ADMIN, Role.ORG_HEAD, Role.RECRUITER] as const;

export const pipelineStages = [
  "APPLIED",
  "SCREENED",
  "QUALIFIED",
  "INTERVIEW_SCHEDULED",
  "REJECTED",
  "HIRED"
] as const;

export const uploadMimeTypes = {
  cv: [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ],
  voice: [
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/x-wav",
    "audio/webm",
    "audio/ogg",
    "application/ogg",
    "audio/mp4",
    "audio/x-m4a",
    "audio/aac"
  ],
  avatar: ["image/png", "image/jpeg", "image/webp"]
};