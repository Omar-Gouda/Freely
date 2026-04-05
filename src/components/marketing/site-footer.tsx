import Link from "next/link";

export function SiteFooter({ minimal = false }: { minimal?: boolean }) {
  return (
    <footer className="site-footer-shell">
      <div className="site-footer-inner site-footer-professional">
        <div className="site-footer-grid">
          <div className="site-footer-brand">
            <strong>Freely</strong>
            <p className="muted">Recruiters Free Home</p>
            <small>One workspace for jobs, candidates, interviews, outreach, analytics, and team accountability.</small>
          </div>

          {minimal ? (
            <div className="site-footer-mini-note">
              <small className="muted">Built for focused hiring teams that want clarity without the clutter.</small>
            </div>
          ) : (
            <>
              <div>
                <h3>Platform</h3>
                <nav className="site-footer-links" aria-label="Platform links">
                  <Link href="/site#platform">What Freely does</Link>
                  <Link href="/site#workflow">How the workflow works</Link>
                  <Link href="/site#roles">Role-based access</Link>
                  <Link href="/site#faq">Questions</Link>
                </nav>
              </div>
              <div>
                <h3>Access</h3>
                <nav className="site-footer-links" aria-label="Access links">
                  <Link href="/login">Sign in</Link>
                  <Link href="/signup">Sign up</Link>
                  <Link href="/contact">Contact us</Link>
                </nav>
              </div>
              <div>
                <h3>Use cases</h3>
                <nav className="site-footer-links" aria-label="Use case links">
                  <Link href="/site#platform">Recruiting operations</Link>
                  <Link href="/site#workflow">Interview scheduling</Link>
                  <Link href="/site#roles">Team administration</Link>
                  <Link href="/site#faq">Launch planning</Link>
                </nav>
              </div>
            </>
          )}
        </div>
      </div>
    </footer>
  );
}
