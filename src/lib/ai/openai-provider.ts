import OpenAI from "openai";

import {
  buildCvEvaluationPrompt,
  buildJobAdsPrompt,
  buildJobExtractPrompt,
  buildStageSuggestionPrompt,
  buildVoiceEvaluationPrompt,
  buildWhatsappTemplatePrompt
} from "@/lib/ai/prompts";
import type {
  AiProvider,
  CvEvaluationResult,
  JobAdsResult,
  JobExtractResult,
  StageSuggestionResult,
  VoiceEvaluationResult
} from "@/lib/ai/types";
import { env } from "@/lib/env";

function parseJson<T>(content: string): T {
  return JSON.parse(content) as T;
}

export class OpenAiProvider implements AiProvider {
  private client = new OpenAI({ apiKey: env.OPENAI_API_KEY });

  private async complete(prompt: string) {
    const response = await this.client.responses.create({
      model: env.OPENAI_MODEL,
      input: prompt
    });

    return response.output_text;
  }

  async extractJobDescription(rawDescription: string): Promise<JobExtractResult> {
    return parseJson<JobExtractResult>(await this.complete(buildJobExtractPrompt(rawDescription)));
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
    return parseJson<JobAdsResult>(await this.complete(buildJobAdsPrompt(input)));
  }

  async evaluateCv(input: { candidateName: string; jobTitle: string; cvText: string }): Promise<CvEvaluationResult> {
    return parseJson<CvEvaluationResult>(await this.complete(buildCvEvaluationPrompt(input)));
  }

  async transcribeAndEvaluateVoice(input: {
    candidateName: string;
    jobTitle: string;
    fileName: string;
    audioBuffer: Buffer;
  }): Promise<VoiceEvaluationResult> {
    const audioBytes = new Uint8Array(input.audioBuffer);
    const file = new File([audioBytes], input.fileName);
    const transcriptResponse = await this.client.audio.transcriptions.create({
      model: "gpt-4o-mini-transcribe",
      file
    });

    const transcript = transcriptResponse.text;
    const evaluation = parseJson<Omit<VoiceEvaluationResult, "transcript">>(
      await this.complete(
        buildVoiceEvaluationPrompt({
          candidateName: input.candidateName,
          jobTitle: input.jobTitle,
          transcript
        })
      )
    );

    return {
      ...evaluation,
      transcript
    };
  }

  async suggestStage(input: {
    jobTitle: string;
    cvScore: number | null;
    englishScore: number | null;
    currentStage: string;
  }): Promise<StageSuggestionResult> {
    return parseJson<StageSuggestionResult>(await this.complete(buildStageSuggestionPrompt(input)));
  }

  async generateWhatsappTemplate(input: {
    kind: string;
    candidateName?: string;
    jobTitle?: string;
    interviewTime?: string;
  }): Promise<string> {
    return this.complete(buildWhatsappTemplatePrompt(input));
  }
}
