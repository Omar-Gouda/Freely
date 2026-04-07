export const lottieSceneMap = {
  landing: {
    src: "https://assets3.lottiefiles.com/packages/lf20_UJNc2t.json",
    title: "Recruitment flow"
  },
  jobs: {
    src: "https://assets3.lottiefiles.com/packages/lf20_XZ3pkn.json",
    title: "Job planning"
  },
  candidates: {
    src: "https://assets3.lottiefiles.com/packages/lf20_UJNc2t.json",
    title: "Candidate review"
  },
  interviews: {
    src: "https://assets3.lottiefiles.com/packages/lf20_XZ3pkn.json",
    title: "Interview coordination"
  },
  analytics: {
    src: "https://assets3.lottiefiles.com/packages/lf20_UJNc2t.json",
    title: "Hiring analytics"
  },
  outreach: {
    src: "https://assets3.lottiefiles.com/packages/lf20_XZ3pkn.json",
    title: "Recruiter outreach"
  },
  profile: {
    src: "https://assets3.lottiefiles.com/packages/lf20_UJNc2t.json",
    title: "Profile settings"
  },
  dashboard: {
    src: "https://assets3.lottiefiles.com/packages/lf20_XZ3pkn.json",
    title: "Workspace overview"
  }
} as const;

export type LottieSceneKey = keyof typeof lottieSceneMap;
