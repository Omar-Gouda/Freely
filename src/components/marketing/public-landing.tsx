import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, CalendarClock, FileSearch, ShieldCheck } from "lucide-react";

import { ContextLottie } from "@/components/lottie/context-lottie";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { Card } from "@/components/ui/card";

const heroStats = [
  { value: "Job control", label: "Org heads create roles, assign recruiters, and keep ownership clear." },
  { value: "Candidate system", label: "Each organization keeps its own talent database, resumes, notes, and scorecards." },
  { value: "Interview flow", label: "Schedules, evaluations, and recruiter notes stay attached to the candidate record." }
];

const featureCards = [
  {
    icon: BriefcaseBusiness,
    title: "Role-based job management",
    description: "Create job briefs, assign recruiters per role, keep ownership history, and control status without losing the original brief."
  },
  {
    icon: FileSearch,
    title: "Candidate records recruiters can actually use",
    description: "Store resumes, extracted profile data, notes, interview scorecards, and pipeline movement inside one candidate record."
  },
  {
    icon: CalendarClock,
    title: "Interview scheduling with evaluation built in",
    description: "Recruiters schedule interviews, open scorecards from the calendar, and document feedback while the conversation is still fresh."
  },
  {
    icon: ShieldCheck,
    title: "Admin and organization governance",
    description: "Approve new organizations, manage teams, suspend access, and keep every workspace isolated and production-ready."
  }
];

const roleCards = [
  {
    title: "Admin",
    description: "Approves organizations, oversees all workspaces, manages access, and can suspend or reactivate organizations and users."
  },
  {
    title: "Org head",
    description: "Creates jobs, assigns recruiters, removes candidates when needed, and keeps the team aligned by role ownership."
  },
  {
    title: "Recruiter",
    description: "Adds candidates, updates the pipeline, schedules interviews, records interview notes, and works only inside assigned jobs."
  }
];

const workflowSteps = [
  "An organization requests access and waits for platform admin approval.",
  "The org head creates jobs, defines requirements, and assigns each role to the right recruiter.",
  "Recruiters add candidates, upload resumes, parse profiles, and move candidates through the pipeline.",
  "Interviewers and recruiters capture notes, evaluations, and scorecards directly on the candidate timeline.",
  "Leaders review recruiter activity, job progress, and organization-wide hiring visibility from one clean workspace."
];

const faqs = [
  {
    title: "Can every organization keep its own candidates and jobs?",
    description: "Yes. Freely is structured as a multi-organization platform where each organization works inside its own hiring data and team space."
  },
  {
    title: "Can recruiters see only the jobs they are responsible for?",
    description: "Yes. Assigned jobs appear in the recruiter workspace, and previously owned jobs remain visible as worked-on roles for follow-up visibility."
  },
  {
    title: "Can the org head manage the recruiter team?",
    description: "Yes. Org heads can create recruiter accounts, assign jobs, and keep delivery ownership clear across the organization."
  },
  {
    title: "What happens before a new organization can access the product?",
    description: "Every new organization stays pending until a platform admin approves the workspace request."
  }
];

export function PublicLanding() {
  return (
    <main className="landing-shell landing-shell-revamp landing-shell-production">
      <SiteHeader />

      <section className="landing-hero-band" id="platform">
        <Card className="landing-card landing-hero-card-revamp landing-hero-card-production">
          <div className="landing-hero-copy stack-lg">
            <div className="stack-md">
              <span className="eyebrow landing-eyebrow">Recruitment operating system</span>
              <h1>Run jobs, candidates, interviews, and recruiter ownership from one hiring workspace.</h1>
              <p className="landing-lead landing-copy-limit">Freely helps recruitment organizations build their own database of jobs and candidates, schedule interviews, evaluate applicants, manage recruiter ownership, and keep hiring operations simple for admins, org heads, and recruiters.</p>
            </div>
            <div className="landing-cta-row landing-cta-row-rich">
              <Link href="/signup" className="button button-primary">Request workspace <ArrowRight size={16} /></Link>
              <Link href="/login" className="button button-ghost">Sign in</Link>
              <Link href="/contact" className="button button-ghost">Book a demo</Link>
            </div>
            <div className="landing-metric-grid landing-metric-grid-revamp">
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
            <span className="eyebrow landing-eyebrow-soft">Platform features</span>
            <h2>Designed around real recruiting work, not generic project management.</h2>
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

        <Card className="landing-card landing-animation-card landing-workflow-card">
          <span className="eyebrow landing-eyebrow-soft">Recruiting workflow</span>
          <h2>Every step stays connected to the candidate and the job.</h2>
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
        <Card className="landing-card landing-lottie-panel landing-role-card">
          <div className="stack-md">
            <span className="eyebrow landing-eyebrow-soft">Role views</span>
            <h2>Each user sees the right level of control.</h2>
          </div>
          <div className="landing-team-grid">
            {roleCards.map((mode) => (
              <div key={mode.title} className="landing-point landing-point-rich">
                <strong>{mode.title}</strong>
                <span>{mode.description}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="landing-card landing-compact-visual landing-governance-card">
          <div className="stack-sm">
            <strong>Production-ready governance</strong>
            <p className="landing-copy">Workspace approval, recruiter ownership, clean team access, and isolated organization data help Freely fit real recruitment operations instead of demo-only flows.</p>
          </div>
          <div className="landing-checklist">
            <div className="landing-checklist-item">Admin approval before first access</div>
            <div className="landing-checklist-item">Recruiter assignment per job</div>
            <div className="landing-checklist-item">Candidate evaluation history per interview</div>
          </div>
        </Card>
      </section>

      <section className="landing-section-grid" id="faq">
        <Card className="landing-card landing-faq-card landing-faq-card-wide">
          <span className="eyebrow landing-eyebrow-soft">Questions</span>
          <h2>What teams usually ask before rollout.</h2>
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
          <span className="eyebrow landing-eyebrow-soft">Ready to launch?</span>
          <h2>Start with approval, structure, and clear ownership.</h2>
          <p className="landing-copy">Create the organization request, get approved by the platform admin, invite your recruiter team, and manage the full hiring workflow from one system.</p>
          <div className="landing-cta-row">
            <Link href="/signup" className="button button-primary">Request workspace</Link>
            <Link href="/contact" className="button button-ghost">Talk to sales</Link>
          </div>
        </Card>
      </section>

      <SiteFooter />
    </main>
  );
}

