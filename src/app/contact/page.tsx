import { redirect } from "next/navigation";

import { ContactSupportContent } from "@/components/contact/contact-support-content";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { getSession } from "@/lib/auth";

export default async function ContactPage() {
  const session = await getSession();

  if (session) {
    redirect("/help");
  }

  return (
    <main className="landing-shell landing-shell-revamp landing-shell-production">
      <SiteHeader />
      <ContactSupportContent />
      <SiteFooter />
    </main>
  );
}
