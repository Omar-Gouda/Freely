export function buildJobExtractPrompt(rawDescription: string) {
  return `
You are a recruiting operations assistant.
Extract structured hiring data from the following job description.
Return strict JSON with keys:
title, summary, seniority, location, skills, responsibilities, qualifications, languages, workMode, salary, benefits.

Job description:
${rawDescription}
`.trim();
}

export function buildJobAdsPrompt(input: {
  title: string;
  summary: string;
  skills: string[];
  location?: string | null;
  salary?: string | null;
  requirements?: string[];
  benefits?: string[];
}) {
  return `
Create platform-specific recruitment posts for a high-volume hiring team.
Return strict JSON with keys facebook, linkedin, instagram, whatsapp, telegram, jobBoard.

Rules:
- facebook: social-media recruiter post with tasteful emoji bullets and fast-scanning lines
- linkedin: professional, polished, recruiter-grade, with a short intro, Position Details, Key Requirements, and clear CTA
- instagram: punchy, visual, high-energy, short stacked lines
- whatsapp: concise recruiter outreach with direct CTA
- telegram: concise job alert style
- jobBoard: polished and professional listing summary
- avoid robotic wording
- mention salary, location, and benefits only when they are available
- keep each platform appropriate to its audience
- use at most 3 hashtags on linkedin and only when natural
- do not invent requirements or benefits
- write linkedin copy the way an experienced recruiter would post for professional connections
- write facebook and instagram copy closer to Egyptian social hiring posts when the role feels high-volume
- if language level, graduates-only, nationality, shift, work mode, or allowances are present in the input, include them naturally

Job title: ${input.title}
Summary: ${input.summary}
Skills: ${input.skills.join(", ")}
Key requirements: ${(input.requirements ?? []).join(", ") || "Not specified"}
Benefits: ${(input.benefits ?? []).join(", ") || "Not specified"}
Salary: ${input.salary ?? "Not specified"}
Location: ${input.location ?? "Not specified"}
`.trim();
}

export function buildCvEvaluationPrompt(input: { candidateName: string; jobTitle: string; cvText: string }) {
  return `
Evaluate this candidate CV for the specified role.
Return strict JSON with keys score, strengths, weaknesses, redFlags, recommendation.
Score must be on a 0 to 10 scale, with one decimal place when helpful.

Candidate: ${input.candidateName}
Job: ${input.jobTitle}
CV:
${input.cvText}
`.trim();
}

export function buildVoiceEvaluationPrompt(input: {
  candidateName: string;
  jobTitle: string;
  transcript: string;
}) {
  return `
Evaluate spoken English for hiring.
Return strict JSON with keys score, fluency, pronunciation, grammar, confidence, summary.
Score must be on a 0 to 10 scale, with one decimal place when helpful.

Candidate: ${input.candidateName}
Job: ${input.jobTitle}
Transcript:
${input.transcript}
`.trim();
}

export function buildStageSuggestionPrompt(input: {
  jobTitle: string;
  cvScore: number | null;
  englishScore: number | null;
  currentStage: string;
}) {
  return `
Based on the scores below, suggest the next recruiting stage.
Return strict JSON with keys suggestedStage and rationale.
Treat scores as 0 to 10.

Job: ${input.jobTitle}
CV score: ${input.cvScore ?? "unknown"}
English score: ${input.englishScore ?? "unknown"}
Current stage: ${input.currentStage}
`.trim();
}

export function buildWhatsappTemplatePrompt(input: {
  kind: string;
  candidateName?: string;
  jobTitle?: string;
  interviewTime?: string;
}) {
  return `
Create a WhatsApp message template for a recruitment workflow.
Return plain text only.

Rules:
- human and warm
- concise
- mention the candidate name and job title naturally
- avoid robotic HR wording

Kind: ${input.kind}
Candidate name: ${input.candidateName ?? "Candidate"}
Job title: ${input.jobTitle ?? "Open role"}
Interview time: ${input.interviewTime ?? "TBD"}
`.trim();
}
