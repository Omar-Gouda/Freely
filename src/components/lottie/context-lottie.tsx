"use client";

import { BarChart3, BriefcaseBusiness, CalendarClock, LayoutDashboard, MessageSquareText, ShieldCheck, UserRoundSearch, UsersRound } from "lucide-react";

import type { LottieSceneKey } from "@/lib/lottie-scenes";
import { lottieSceneMap } from "@/lib/lottie-scenes";

const sceneVisuals: Record<LottieSceneKey, { icon: typeof LayoutDashboard; chips: string[]; score: string }> = {
  landing: { icon: ShieldCheck, chips: ["Jobs", "Candidates", "Interviews"], score: "3 roles" },
  jobs: { icon: BriefcaseBusiness, chips: ["Brief", "Owner", "Headcount"], score: "Open" },
  candidates: { icon: UserRoundSearch, chips: ["Resume", "Notes", "Score"], score: "Fit" },
  interviews: { icon: CalendarClock, chips: ["Schedule", "Scorecard", "Owner"], score: "Ready" },
  analytics: { icon: BarChart3, chips: ["Funnel", "Source", "Velocity"], score: "Live" },
  outreach: { icon: MessageSquareText, chips: ["WhatsApp", "Invite", "Follow-up"], score: "Send" },
  profile: { icon: UsersRound, chips: ["Identity", "Access", "Presence"], score: "Profile" },
  dashboard: { icon: LayoutDashboard, chips: ["Demand", "Pipeline", "Reports"], score: "Today" }
};

type ContextLottieProps = {
  scene: LottieSceneKey;
  className?: string;
  compact?: boolean;
};

export function ContextLottie({ scene, className = "", compact = false }: ContextLottieProps) {
  const config = lottieSceneMap[scene];
  const visual = sceneVisuals[scene];
  const Icon = visual.icon;

  return (
    <div className={`context-lottie-shell recruitment-motion recruitment-motion-${scene} ${compact ? "context-lottie-shell-compact" : ""} ${className}`.trim()} aria-label={config.title}>
      <div className="recruitment-motion-orb recruitment-motion-orb-a" />
      <div className="recruitment-motion-orb recruitment-motion-orb-b" />
      <div className="recruitment-motion-card">
        <div className="recruitment-motion-head">
          <span className="recruitment-motion-icon"><Icon size={compact ? 20 : 24} /></span>
          <div>
            <strong>{config.title}</strong>
            <small>Built for recruiters, org heads, and platform admins.</small>
          </div>
        </div>
        <div className="recruitment-motion-bars">
          <span style={{ width: compact ? "56%" : "68%" }} />
          <span style={{ width: compact ? "84%" : "92%" }} />
          <span style={{ width: compact ? "44%" : "58%" }} />
        </div>
        <div className="recruitment-motion-chip-row">
          {visual.chips.map((chip) => <span key={chip}>{chip}</span>)}
        </div>
        <div className="recruitment-motion-footer">
          <div>
            <small>Workspace signal</small>
            <strong>{visual.score}</strong>
          </div>
          <div className="recruitment-motion-ring">
            <span />
          </div>
        </div>
      </div>
    </div>
  );
}
