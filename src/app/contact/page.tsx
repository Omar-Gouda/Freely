import { ContactSupportContent } from "@/components/contact/contact-support-content";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { getSession } from "@/lib/auth";

export default async function ContactPage() {
  const session = await getSession();

  if (session) {
    return (
      <DashboardShell user={session}>
        <ContactSupportContent inWorkspace />
      </DashboardShell>
    );
  }

  return (
    <main className="landing-shell">
      <SiteHeader />
      <ContactSupportContent />
      <SiteFooter />
    </main>
  );
}
