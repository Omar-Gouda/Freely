import Link from "next/link";

type SiteHeaderProps = {
  minimal?: boolean;
};

export function SiteHeader({ minimal = false }: SiteHeaderProps) {
  return (
    <header className="site-header-shell">
      <div className="site-header-inner site-header-professional">
        <Link href="/site" className="site-brand-block">
          <span className="site-brand-mark">F</span>
          <span className="site-brand-copy">
            <strong className="landing-wordmark">Freely</strong>
            <small>Recruiters Free Home</small>
          </span>
        </Link>

        {minimal ? null : (
          <>
            <nav className="site-inline-nav" aria-label="Primary sections">
              <Link href="/site#platform">Platform</Link>
              <Link href="/site#workflow">Workflow</Link>
              <Link href="/site#roles">Teams</Link>
              <Link href="/site#faq">FAQ</Link>
            </nav>
            <nav className="landing-nav-actions" aria-label="Primary navigation">
              <Link href="/login" className="button button-ghost">Sign in</Link>
              <Link href="/signup" className="button button-primary">Sign up</Link>
              <Link href="/contact" className="button button-ghost">Contact us</Link>
            </nav>
          </>
        )}
      </div>
    </header>
  );
}
