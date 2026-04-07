import Link from "next/link";

export function SiteFooter({ minimal = false }: { minimal?: boolean }) {
  return (
    <footer className="site-footer-shell">
      <div className="site-footer-inner site-footer-revamp">
        <div className="site-footer-grid site-footer-grid-rich">
          <div className="site-footer-brand">
            <strong>Freely</strong>
            <p className="muted">Recruitment OS for structured hiring teams.</p>
            <small>Plan jobs, parse resumes, review interviews, save scorecards, and keep recruiter follow-up organized from one clean workspace.</small>
          </div>

          {minimal ? (
            <div className="site-footer-mini-note">
              <small className="muted">Built for focused hiring teams that want clarity without the clutter.</small>
            </div>
          ) : (
            <>
              <div>
                <h3>Explore</h3>
                <nav className="site-footer-links" aria-label="Platform links">
                  <Link href="/site#platform">Platform overview</Link>
                  <Link href="/site#workflow">Hiring workflow</Link>
                  <Link href="/site#teams">Team modes</Link>
                  <Link href="/site#faq">Questions</Link>
                </nav>
              </div>
              <div>
                <h3>Access</h3>
                <nav className="site-footer-links" aria-label="Access links">
                  <Link href="/login">Sign in</Link>
                  <Link href="/signup">Create workspace</Link>
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
