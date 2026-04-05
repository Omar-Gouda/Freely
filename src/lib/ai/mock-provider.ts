import { CandidateStage } from "@/lib/models";

import type {
  AiProvider,
  CvEvaluationResult,
  JobAdsResult,
  JobExtractResult,
  StageSuggestionResult,
  VoiceEvaluationResult
} from "@/lib/ai/types";

function boundedScore(seed: number, floor = 65, ceiling = 94) {
  return Math.max(floor, Math.min(ceiling, seed));
}

function formatList(items: string[], fallback: string) {
  return items.length ? items.join(", ") : fallback;
}

function cleanSentence(value: string) {
  return value.trim().replace(/\s+/g, " ").replace(/[.]+$/, "");
}

export class MockAiProvider implements AiProvider {
  async extractJobDescription(rawDescription: string): Promise<JobExtractResult> {
    const titleLine = rawDescription.split(".")[0]?.slice(0, 80) || "Recruitment Role";

    return {
      title: titleLine,
      summary: rawDescription.slice(0, 220),
      seniority: rawDescription.toLowerCase().includes("senior") ? "Senior" : "Mid-Level",
      location: rawDescription.toLowerCase().includes("remote") ? "Remote" : "Cairo",
      skills: ["Communication", "Screening", "CRM", "Stakeholder management"],
      responsibilities: [
        "Screen large applicant volumes",
        "Coordinate hiring stages",
        "Maintain candidate records"
      ],
      qualifications: ["Relevant hiring or support experience", "Strong communication"],
      languages: ["English"],
      workMode: rawDescription.toLowerCase().includes("remote") ? "Remote" : "Hybrid",
      salary: rawDescription.match(/\$?\d+[\d,]*(?:\s*[-/]\s*\$?\d+[\d,]*)?/)?.[0],
      benefits: ["Growth opportunities", "Supportive team", "Fast-moving environment"]
    };
  }

  async generateJobAds(input: {
    title: string;
    summary: string;
    skills: string[];
    location?: string | null;
    salary?: string | null;
    requirements?: string[];
    benefits?: string[];
  }): Promise<JobAdsResult> {
    const location = input.location ?? "Cairo";
    const summary = cleanSentence(input.summary);
    const keyRequirements = input.requirements?.slice(0, 4) ?? [];
    const skills = input.skills.slice(0, 4);
    const requirementLine = formatList(keyRequirements, formatList(skills, "strong communication"));
    const salaryLine = input.salary ? `\n💰 Salary: ${input.salary}` : "";
    const benefitsLine = input.benefits?.length ? `\n🎁 Benefits: ${input.benefits.slice(0, 3).join(" | ")}` : "";
    const linkedinBenefits = input.benefits?.length ? `• Benefits: ${input.benefits.slice(0, 3).join(", ")}\n` : "";
    const linkedinRequirementLines = keyRequirements.length
      ? keyRequirements.map((item) => `• ${item}`).join("\n")
      : skills.length
        ? skills.map((item) => `• ${item}`).join("\n")
        : "• Relevant role alignment";

    return {
      facebook: `✨📢 New Opportunity Alert!\n🏢 ${input.title}\n📍 Location: ${location}${salaryLine}\n🧩 Key fit: ${requirementLine}${benefitsLine}\n\n${summary}.\n\nSend your CV now to apply.`,
      linkedin: `For professionals in my network who are exploring new opportunities:\n\n📢 Job Opening: ${input.title}\n\nWe are hiring for a ${input.title} position in ${location}.\n\nPosition Details:\n• ${summary}\n• Core strengths: ${requirementLine}\n${input.salary ? `• Compensation: ${input.salary}\n` : ""}${linkedinBenefits}Key Requirements:\n${linkedinRequirementLines}\n• Strong communication and stakeholder handling\n\nIf you are interested, please apply with your updated resume or message me directly for more details.\n\n#Hiring #Careers #${input.title.replace(/[^a-zA-Z]/g, "") || "Jobs"}`,
      instagram: `🌟 We're hiring!\n${input.title}\n📍 ${location}${salaryLine}${benefitsLine}\n\n${summary}.\n\nDM us or send your CV today.`,
      whatsapp: `Hi, we are hiring for ${input.title}${location ? ` in ${location}` : ""}. Key fit: ${requirementLine}.${input.salary ? ` Salary: ${input.salary}.` : ""} Send your CV if interested and I will share the next steps.`,
      telegram: `📢 ${input.title}${location ? ` | ${location}` : ""}${input.salary ? ` | ${input.salary}` : ""}\nKey fit: ${requirementLine}\nApply by sending your CV now.`,
      jobBoard: `${input.title}${location ? ` - ${location}` : ""}\n\n${summary}.\n\nKey requirements:\n- ${keyRequirements.length ? keyRequirements.join("\n- ") : requirementLine}\n${input.salary ? `\nCompensation: ${input.salary}` : ""}${input.benefits?.length ? `\nBenefits: ${input.benefits.join(", ")}` : ""}\n\nApply now with your updated resume.`
    };
  }

  async evaluateCv(input: { candidateName: string; jobTitle: string; cvText: string }): Promise<CvEvaluationResult> {
    const score = Math.round((boundedScore(70 + Math.min(20, Math.floor(input.cvText.length / 200))) / 10) * 10) / 10;

    return {
      score,
      strengths: ["Relevant role alignment", "Readable CV structure", "Action-oriented experience"],
      weaknesses: ["Missing quantified outcomes", "Could clarify tool depth"],
      redFlags: input.cvText.length < 300 ? ["Thin CV content"] : [],
      recommendation: score >= 8 ? `Move ${input.candidateName} to screening for ${input.jobTitle}.` : "Request more context before progressing."
    };
  }

  async transcribeAndEvaluateVoice(input: {
    candidateName: string;
    jobTitle: string;
    fileName: string;
    audioBuffer: Buffer;
  }): Promise<VoiceEvaluationResult> {
    const score = Math.round((boundedScore(68 + Math.min(22, Math.floor(input.audioBuffer.byteLength / 4000))) / 10) * 10) / 10;
    const transcript = `Mock transcript generated for ${input.fileName}. Candidate introduces background, explains experience, and answers motivation questions clearly.`;

    return {
      score,
      fluency: "Good pacing with minor hesitations.",
      pronunciation: "Clear overall pronunciation with occasional accent-related variance.",
      grammar: "Mostly accurate spoken grammar.",
      confidence: score >= 8.2 ? "Strong and professional." : "Moderate confidence with room to improve.",
      summary: `${input.candidateName} demonstrates serviceable spoken English for ${input.jobTitle}.`,
      transcript
    };
  }

  async suggestStage(input: {
    jobTitle: string;
    cvScore: number | null;
    englishScore: number | null;
    currentStage: string;
  }): Promise<StageSuggestionResult> {
    const average = ((input.cvScore ?? 0) + (input.englishScore ?? 0)) / 2;
    const suggestedStage =
      average >= 8.5
        ? CandidateStage.QUALIFIED
        : average >= 7.5
          ? CandidateStage.SCREENED
          : CandidateStage.APPLIED;

    return {
      suggestedStage,
      rationale: `For ${input.jobTitle}, the blended readiness score suggests ${suggestedStage.replaceAll("_", " ").toLowerCase()} from ${input.currentStage.toLowerCase()}.`
    };
  }

  async generateWhatsappTemplate(input: {
    kind: string;
    candidateName?: string;
    jobTitle?: string;
    interviewTime?: string;
  }): Promise<string> {
    const name = input.candidateName ?? "there";
    const title = input.jobTitle ?? "our role";

    if (input.kind === "INTERVIEW_INVITE") {
      return `Hi ${name}, thanks again for your interest in the ${title} role. We would love to meet you for an interview ${input.interviewTime ? `at ${input.interviewTime}` : "at the next available slot"}. Please let me know if that works for you.`;
    }

    if (input.kind === "ACCEPTANCE") {
      return `Hi ${name}, great news. You are moving forward in our process for the ${title} role. I will share the next steps with you shortly.`;
    }

    return `Hi ${name}, thank you for the time you gave us during the process for the ${title} role. We will not be moving ahead this time, but we appreciate your interest and would be happy to keep your profile for future openings.`;
  }
}
