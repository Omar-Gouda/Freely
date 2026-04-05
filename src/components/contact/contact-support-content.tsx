import { ContactForm } from "@/components/contact/contact-form";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";

export function ContactSupportContent({ inWorkspace = false }: { inWorkspace?: boolean }) {
  return (
    <div className="stack-xl">
      {inWorkspace ? (
        <SectionHeading title="Contact support" description="Stay signed in while you send product questions, bug reports, onboarding requests, or launch planning notes." />
      ) : null}

      <div className="landing-grid contact-layout-grid">
        <Card className="landing-card landing-hero-card">
          <span className="eyebrow landing-eyebrow">Contact us</span>
          <h1>{inWorkspace ? "Need help without leaving the workspace?" : "Reach out for support, bug reports, onboarding, or a live product walkthrough."}</h1>
          <p className="landing-lead">If something broke, if you need help setting up your workspace, or if you want to see how Freely can speed up your recruiting team, send a message here.</p>
          <div className="landing-points">
            <div className="landing-point"><strong>Support</strong><span>Report issues, blockers, or anything affecting your recruiters.</span></div>
            <div className="landing-point"><strong>Sales</strong><span>Ask for a demo, discuss your workflow, or plan a rollout for your organization.</span></div>
            <div className="landing-point"><strong>Launch help</strong><span>Get help with account setup, workspace access, or opening the platform for your team.</span></div>
          </div>
        </Card>

        <Card className="landing-card">
          <ContactForm />
        </Card>
      </div>
    </div>
  );
}
