export const lottieSceneMap = {
  landing: {
    title: "Recruitment system overview"
  },
  jobs: {
    title: "Job planning"
  },
  candidates: {
    title: "Candidate review"
  },
  interviews: {
    title: "Interview coordination"
  },
  analytics: {
    title: "Hiring analytics"
  },
  outreach: {
    title: "Recruiter outreach"
  },
  profile: {
    title: "Profile settings"
  },
  dashboard: {
    title: "Workspace overview"
  }
} as const;

export type LottieSceneKey = keyof typeof lottieSceneMap;
