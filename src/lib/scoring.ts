import { clampTenPointScore } from "@/lib/utils";

export function calculateOverallScore(cvScore: number | null, englishScore: number | null) {
  const cvWeight = 0.6;
  const englishWeight = 0.4;
  const safeCv = clampTenPointScore(cvScore) ?? 0;
  const safeEnglish = clampTenPointScore(englishScore) ?? 0;

  return Math.round((safeCv * cvWeight + safeEnglish * englishWeight) * 10) / 10;
}

export function calculateRankingScore(input: {
  cvScore: number | null;
  englishScore: number | null;
  yearsExperience?: number | null;
}) {
  const overall = calculateOverallScore(input.cvScore, input.englishScore);
  const experienceBoost = Math.min(1, (input.yearsExperience ?? 0) * 0.12);
  return Math.min(10, Math.round((overall + experienceBoost) * 10) / 10);
}
