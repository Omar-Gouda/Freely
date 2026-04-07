import Link from "next/link";
import { ArrowRight, CheckCircle2, Layers3, MessageSquareShare, ShieldCheck, UsersRound } from "lucide-react";

import { ContextLottie } from "@/components/lottie/context-lottie";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { Card } from "@/components/ui/card";

const heroStats = [
  { value: "Jobs", label: "structured with must-have and nice-to-have requirements" },
  { value: "Candidates", label: "parsed into profiles, files, notes, and scorecards" },
  { value: "Interviews", label: "managed from live schedules with recruiter ownership" }
];

const featureCards = [
  {
    icon: Layers3,
    title: "Role setup that stays structured",
    description: "Recruiters enter job requirements manually, keep must-have versus nice-to-have clean, and generate posting content without losing the original brief."
  },
  {
    icon: UsersRound,
    title: "Candidate profiles built for action",
    description: "Parsed resumes, CV previews, voice notes, pipeline stages, and interview references stay visible on the same candidate profile."
  },
  {
    icon: MessageSquareShare,
    title: "Outreach and interviews in the same flow",
    description: "Keep schedule changes, follow-up messaging, and recruiter notes connected so teams do less manual recovery work."
  },
  {
    icon: ShieldCheck,
    title: "Multi-role control without clutter",
    description: "Admins, org heads, and recruiters each get the views they need without turning the product into a maze."
  }
];

const workflowSteps = [
  "Create the role with recruiter-defined requirements and package details.",
  "Parse incoming resumes into editable candidate profiles with better skill and education detection.",
  "Schedule interviews, open scorecards from the calendar, and keep the evaluation on the candidate profile.",
  "Move accepted or rejected candidates through retention rules so old files are purged automatically.",
  "Review analytics, outreach, and recruiter activity from one responsive workspace."
];

const teamModes = [
  {
    title: "Recruiters",
    description: "Fast job posting, candidate review, outreach, scheduling, and scorecards without admin clutter."
  },
  {
    title: "Org heads",
    description: "A cleaner operational view over jobs, recruiters, and hiring throughput across the team."
  },
  {
    title: "Admins",
    description: "Centralized control for organizations, access, and long-term platform governance."
  }
];

const faqs = [
  {
    title: "Can we manage resumes, voice notes, and scorecards together?",
    description: "Yes. Candidate files, interview evaluations, and recruiter notes stay tied to the same profile for later reference."
  },
  {
    title: "Is the product mobile friendly?",
    description: "Yes. The redesign includes a burger navigation on mobile and tablet, with cleaner spacing for crowded operational pages."
  },
  {
    title: "Do users need to upload personal photos?",
    description: "No. Recruiters can now select from preset workspace avatars instead of uploading profile images."
  },
  {
    title: "What happens after a candidate is accepted or rejected?",
    description: "Candidate resumes and voice notes can be purged automatically after the retention period while user avatars stay intact."
  }
];

export function PublicLanding() {
  return (
    <main className="landing-shell landing-shell-revamp">
      <SiteHeader />

      <section className="landing-hero-band" id="platform">
        <Card className="landing-card landing-hero-card-revamp">
          <div className="landing-hero-copy stack-lg">
            <div className="stack-md">
              <span className="eyebrow landing-eyebrow">Recruitment operating system</span>
              <h1>Turn scattered recruiting work into one animated, organized hiring workspace.</h1>
              <p className="landing-lead landing-copy-limit">Freely brings jobs, candidates, interviews, analytics, outreach, and admin control into one system that feels clearer on desktop, tablet, and mobile. The landing experience now mirrors the product: structured, visual, and designed for momentum.</p>
            </div>
            <div className="landing-cta-row landing-cta-row-rich">
              <Link href="/signup" className="button button-primary">Create workspace <ArrowRight size={16} /></Link>
              <Link href="/login" className="button button-ghost">Sign in</Link>
              <Link href="/contact" className="button button-ghost">Book a demo</Link>
            </div>
            <div className="landing-metric-grid landing-metric-grid-wide landing-metric-grid-revamp">
              {heroStats.map((stat) => (
                <div key={stat.value} className="landing-metric-card landing-metric-card-rich">
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="landing-hero-visual">
            <ContextLottie scene="landing" />
          </div>
        </Card>
      </section>

      <section className="landing-showcase-grid" id="workflow">
        <Card className="landing-card landing-showcase-card">
          <div className="stack-md">
            <span className="eyebrow landing-eyebrow-soft">Why teams switch</span>
            <h2>Less clutter. Stronger recruiter focus. Better context retention.</h2>
          </div>
          <div className="landing-feature-grid">
            {featureCards.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="landing-feature-tile">
                  <span className="landing-feature-icon"><Icon size={18} /></span>
                  <strong>{feature.title}</strong>
                  <p>{feature.description}</p>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="landing-card landing-animation-card">
          <span className="eyebrow landing-eyebrow-soft">Interactive workflow</span>
          <h2>Built for the real recruiting sequence.</h2>
          <div className="marketing-step-list">
            {workflowSteps.map((step, index) => (
              <div key={step} className="marketing-step-row marketing-step-row-rich">
                <span>{index + 1}</span>
                <p>{step}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="landing-section-grid" id="teams">
        <Card className="landing-card landing-lottie-panel">
          <div className="stack-md">
            <span className="eyebrow landing-eyebrow-soft">Teams</span>
            <h2>Every role gets a cleaner view of the work.</h2>
          </div>
          <div className="landing-team-grid">
            {teamModes.map((mode) => (
              <div key={mode.title} className="landing-point landing-point-rich">
                <strong>{mode.title}</strong>
                <span>{mode.description}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="landing-card landing-compact-visual">
          <ContextLottie scene="dashboard" compact />
          <div className="stack-sm">
            <strong>Catchy UI without losing clarity</strong>
            <p className="landing-copy">Animated cues, strong hierarchy, and responsive layouts help recruiters scan information faster instead of wrestling with crowded screens.</p>
          </div>
        </Card>
      </section>

      <section className="landing-section-grid" id="faq">
        <Card className="landing-card landing-faq-card landing-faq-card-wide">
          <span className="eyebrow landing-eyebrow-soft">Questions</span>
          <h2>Common questions before rollout.</h2>
          <div className="landing-points faq-grid">
            {faqs.map((item) => (
              <div key={item.title} className="landing-point landing-point-rich">
                <strong>{item.title}</strong>
                <span>{item.description}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="landing-card landing-cta-panel landing-cta-panel-rich">
          <span className="eyebrow landing-eyebrow-soft">Ready to move?</span>
          <h2>Launch a cleaner hiring workflow.</h2>
          <p className="landing-copy">Start with a workspace account, invite recruiters, and keep every job, candidate, interview, and evaluation inside one system.</p>
          <div className="landing-checklist">
            <div className="landing-checklist-item"><CheckCircle2 size={16} /> Manual job requirements</div>
            <div className="landing-checklist-item"><CheckCircle2 size={16} /> Candidate scorecard history</div>
            <div className="landing-checklist-item"><CheckCircle2 size={16} /> Preset avatars and lighter storage</div>
          </div>
          <div className="landing-cta-row">
            <Link href="/signup" className="button button-primary">Create workspace</Link>
            <Link href="/contact" className="button button-ghost">Talk to support</Link>
          </div>
        </Card>
      </section>

      <SiteFooter />
    </main>
  );
}
