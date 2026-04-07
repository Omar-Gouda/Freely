import { ContactForm } from "@/components/contact/contact-form";
import { Card } from "@/components/ui/card";

export function ContactSupportContent() {
  return (
    <div className="stack-xl contact-support-shell">
      <div className="landing-grid contact-layout-grid">
        <Card className="landing-card landing-hero-card contact-copy-card">
          <span className="eyebrow landing-eyebrow">Contact Freely</span>
          <h1>Reach the Freely team for onboarding, contract questions, or production support.</h1>
          <p className="landing-lead">If you are not signed in as a workspace member yet, send your request here and our admin team will reply by email within 24 to 48 hours during working hours: Monday to Friday, 10 AM to 4 PM.</p>
          <div className="landing-points">
            <div className="landing-point"><strong>Support follow-up</strong><span>We log every public request in the admin support channel so nothing is lost between handoffs.</span></div>
            <div className="landing-point"><strong>Workspace access</strong><span>Need approval, onboarding, or contract help? Send the organization details and we will route it quickly.</span></div>
            <div className="landing-point"><strong>Members already inside Freely?</strong><span>Use the in-app Support page after signing in so replies stay in one shared thread.</span></div>
          </div>
        </Card>

        <Card className="landing-card contact-form-card">
          <ContactForm />
        </Card>
      </div>
    </div>
  );
}
