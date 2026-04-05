import Link from "next/link";

import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { Card } from "@/components/ui/card";

const capabilities = [
  {
    title: "Jobs become structured hiring plans",
    description: "Paste the raw job description once and keep the brief, extracted details, generated posting content, and delivery plan tied to the same role."
  },
  {
    title: "Candidates stay connected to the right pipeline",
    description: "Track every applicant inside the correct role, keep evaluation notes visible, and avoid losing context when the pipeline gets busy."
  },
  {
    title: "Interviews run from one live schedule",
    description: "Create recruiter-owned slots, assign candidates, and keep scheduling changes visible through the in-app notification system."
  },
  {
    title: "Admins keep control across organizations",
    description: "Platform admins can manage access, create accounts, review organizations, and control account lifecycle without leaving the workspace."
  }
];

const workflowSteps = [
  "Create the role and keep the hiring brief clean from day one.",
  "Review resumes, profiles, and evaluation signals in the same place.",
  "Move candidates through the pipeline with clear ownership.",
  "Schedule interviews, track recruiters, and keep the team aligned.",
  "Use analytics and outreach to tighten the loop and hire faster."
];

const roleBenefits = [
  {
    title: "Admin control",
    description: "See every organization, control roles, deactivate access safely, reactivate within the recovery window, and remove accounts permanently when needed."
  },
  {
    title: "Organization head workflow",
    description: "Create recruiters inside the organization, keep hiring activity coordinated, and maintain structure without platform-wide admin risk."
  },
  {
    title: "Recruiter focus",
    description: "Stay inside jobs, candidates, outreach, interviews, and notifications without carrying setup clutter meant for admins."
  }
];

const faqs = [
  {
    title: "Who is Freely built for?",
    description: "Recruiters, agency teams, and hiring leads who want one organized workspace instead of scattered tools and manual follow-up."
  },
  {
    title: "Can it support multiple organizations?",
    description: "Yes. Platform admins can manage multiple organizations and assign the right access level inside each one."
  },
  {
    title: "Does it help with interview coordination?",
    description: "Yes. Recruiters can create slots, assign candidates, and rely on in-app notifications to keep the schedule visible."
  },
  {
    title: "What if we need onboarding help?",
    description: "Use the contact page to request support, report issues, or plan a guided launch before your team rolls it out fully."
  }
];

export function PublicLanding() {
  return (
    <main className="landing-shell landing-shell-spacious">
      <SiteHeader />

      <section className="landing-grid landing-hero-grid" id="platform">
        <Card className="landing-card landing-hero-card landing-hero-spotlight landing-hero-large">
          <span className="eyebrow landing-eyebrow">Recruitment operating system</span>
          <h1>Turn recruiting chaos into one organized hiring workspace.</h1>
          <p className="landing-lead landing-copy-limit">Freely helps recruiters, organization heads, and platform admins manage the entire hiring flow from one system. Jobs, candidates, interviews, outreach, analytics, permissions, and support stay connected instead of scattered across disconnected tools.</p>
          <div className="landing-cta-row">
            <Link href="/login" className="button button-ghost">Sign in</Link>
            <Link href="/signup" className="button button-primary">Sign up</Link>
            <Link href="/contact" className="button button-ghost">Contact us</Link>
          </div>
          <div className="landing-metric-grid landing-metric-grid-wide">
            <div className="landing-metric-card"><strong>Structured jobs</strong><span>Keep descriptions, extracted details, and job content connected.</span></div>
            <div className="landing-metric-card"><strong>Clear pipelines</strong><span>Track candidate progress by role without losing context.</span></div>
            <div className="landing-metric-card"><strong>Live interview views</strong><span>Schedule slots and keep recruiter ownership visible.</span></div>
            <div className="landing-metric-card"><strong>Admin oversight</strong><span>Manage organizations, users, and account lifecycle from one place.</span></div>
          </div>
        </Card>

        <Card className="landing-card landing-proof-card">
          <div className="stack-lg">
            <div>
              <span className="eyebrow landing-eyebrow-soft">Why teams switch</span>
              <h2>Less admin drag. More visible hiring momentum.</h2>
            </div>
            <div className="landing-points">
              {capabilities.map((point) => (
                <div key={point.title} className="landing-point">
                  <strong>{point.title}</strong>
                  <span>{point.description}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </section>

      <section className="landing-grid landing-three-column-grid" id="workflow">
        <Card className="landing-card">
          <span className="eyebrow landing-eyebrow-soft">Workflow</span>
          <h2>Built around the real hiring sequence.</h2>
          <div className="marketing-step-list">
            {workflowSteps.map((step, index) => (
              <div key={step} className="marketing-step-row">
                <span>{index + 1}</span>
                <p>{step}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="landing-card">
          <span className="eyebrow landing-eyebrow-soft">Visibility</span>
          <h2>Everyone sees what matters to them.</h2>
          <p className="landing-copy">Recruiters stay focused on execution. Organization heads keep team activity organized. Admins keep account control, organization visibility, and long-term platform governance.</p>
          <div className="landing-points compact-points">
            <div className="landing-point"><strong>Notifications</strong><span>Important changes stay visible in the workspace and on the device while the app is open.</span></div>
            <div className="landing-point"><strong>Support</strong><span>Users can reach support without leaving the product context.</span></div>
          </div>
        </Card>

        <Card className="landing-card">
          <span className="eyebrow landing-eyebrow-soft">Results</span>
          <h2>One system instead of repeated re-entry.</h2>
          <p className="landing-copy">Freely keeps the job brief, candidate records, scheduling context, outreach, and analytics connected so the team does less manual recovery work and more actual hiring work.</p>
          <div className="landing-cta-row">
            <Link href="/signup" className="button button-primary">Start with Freely</Link>
            <Link href="/contact" className="button button-ghost">Book a walkthrough</Link>
          </div>
        </Card>
      </section>

      <section className="landing-grid landing-secondary-grid" id="roles">
        {roleBenefits.map((item) => (
          <Card className="landing-card" key={item.title}>
            <span className="eyebrow landing-eyebrow-soft">Team structure</span>
            <h2>{item.title}</h2>
            <p className="landing-copy">{item.description}</p>
          </Card>
        ))}
      </section>

      <section className="landing-grid landing-secondary-grid" id="faq">
        <Card className="landing-card landing-faq-card landing-faq-card-wide">
          <span className="eyebrow landing-eyebrow-soft">Questions</span>
          <h2>Common questions before launch.</h2>
          <div className="landing-points faq-grid">
            {faqs.map((item) => (
              <div key={item.title} className="landing-point">
                <strong>{item.title}</strong>
                <span>{item.description}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="landing-card landing-cta-panel">
          <span className="eyebrow landing-eyebrow-soft">Ready to move?</span>
          <h2>Bring your recruiting workflow into one place.</h2>
          <p className="landing-copy">Start with a workspace account, or contact support if you want help planning the rollout for your recruiters.</p>
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
