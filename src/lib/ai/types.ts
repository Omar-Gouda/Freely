export type JobExtractResult = {
  title: string;
  summary: string;
  seniority: string;
  location?: string;
  skills: string[];
  responsibilities: string[];
  qualifications: string[];
  languages: string[];
  workMode?: string;
  salary?: string;
  benefits?: string[];
};

export type JobAdsResult = {
  facebook: string;
  linkedin: string;
  instagram: string;
  whatsapp: string;
  telegram: string;
  jobBoard: string;
};

export type CvEvaluationResult = {
  score: number;
  strengths: string[];
  weaknesses: string[];
  redFlags: string[];
  recommendation: string;
};

export type VoiceEvaluationResult = {
  score: number;
  fluency: string;
  pronunciation: string;
  grammar: string;
  confidence: string;
  summary: string;
  transcript: string;
};

export type StageSuggestionResult = {
  suggestedStage: string;
  rationale: string;
};

export interface AiProvider {
  extractJobDescription(rawDescription: string): Promise<JobExtractResult>;
  generateJobAds(input: {
    title: string;
    summary: string;
    skills: string[];
    location?: string | null;
    salary?: string | null;
    requirements?: string[];
    benefits?: string[];
  }): Promise<JobAdsResult>;
  evaluateCv(input: { candidateName: string; jobTitle: string; cvText: string }): Promise<CvEvaluationResult>;
  transcribeAndEvaluateVoice(input: { candidateName: string; jobTitle: string; fileName: string; audioBuffer: Buffer }): Promise<VoiceEvaluationResult>;
  suggestStage(input: { jobTitle: string; cvScore: number | null; englishScore: number | null; currentStage: string }): Promise<StageSuggestionResult>;
  generateWhatsappTemplate(input: {
    kind: string;
    candidateName?: string;
    jobTitle?: string;
    interviewTime?: string;
  }): Promise<string>;
}
