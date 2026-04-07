import Link from "next/link";

export function SiteFooter({ minimal = false }: { minimal?: boolean }) {
  return (
    <footer className="site-footer-shell">
      <div className="site-footer-inner site-footer-revamp site-footer-production">
        <div className="site-footer-grid site-footer-grid-rich">
          <div className="site-footer-brand">
            <strong>Freely</strong>
            <p className="muted">Recruitment OS for structured hiring teams.</p>
            <small>Jobs, candidates, interviews, recruiter ownership, and organization approval stay inside one calmer system.</small>
          </div>

          {minimal ? (
            <div className="site-footer-mini-note">
              <small className="muted">Built for recruitment teams that need clarity, control, and cleaner execution.</small>
            </div>
          ) : (
            <>
              <div>
                <h3>Explore</h3>
                <nav className="site-footer-links" aria-label="Platform links">
                  <Link href="/site#platform">Platform</Link>
                  <Link href="/site#workflow">Workflow</Link>
                  <Link href="/site#teams">Roles</Link>
                  <Link href="/site#faq">Questions</Link>
                </nav>
              </div>
              <div>
                <h3>Access</h3>
                <nav className="site-footer-links" aria-label="Access links">
                  <Link href="/login">Sign in</Link>
                  <Link href="/signup">Request workspace</Link>
                  <Link href="/contact">Book a walkthrough</Link>
                </nav>
              </div>
              <div>
                <h3>Product</h3>
                <nav className="site-footer-links" aria-label="Use case links">
                  <Link href="/jobs">Jobs</Link>
                  <Link href="/candidates">Candidates</Link>
                  <Link href="/interviews">Interviews</Link>
                  <Link href="/analytics">Analytics</Link>
                </nav>
              </div>
            </>
          )}
        </div>
      </div>
    </footer>
  );
}
