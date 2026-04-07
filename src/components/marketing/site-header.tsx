"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";

type SiteHeaderProps = {
  minimal?: boolean;
};

const navLinks = [
  { href: "/site#platform", label: "Platform" },
  { href: "/site#workflow", label: "Workflow" },
  { href: "/site#teams", label: "Teams" },
  { href: "/site#faq", label: "FAQ" }
];

export function SiteHeader({ minimal = false }: SiteHeaderProps) {
  const [open, setOpen] = useState(false);

  return (
    <header className="site-header-shell">
      <div className="site-header-inner site-header-revamp">
        <Link href="/site" className="site-brand-block" onClick={() => setOpen(false)}>
          <span className="site-brand-mark">F</span>
          <span className="site-brand-copy">
            <strong className="landing-wordmark">Freely</strong>
            <small>Recruitment OS</small>
          </span>
        </Link>

        {minimal ? null : (
          <>
            <button type="button" className="site-menu-button" onClick={() => setOpen((current) => !current)} aria-label="Toggle site menu">
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
            <div className={`site-header-nav-shell ${open ? "site-header-nav-shell-open" : ""}`.trim()}>
              <nav className="site-inline-nav site-inline-nav-rich" aria-label="Primary sections">
                {navLinks.map((link) => (
                  <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>{link.label}</Link>
                ))}
              </nav>
              <nav className="landing-nav-actions landing-nav-actions-rich" aria-label="Primary navigation">
                <Link href="/login" className="button button-ghost" onClick={() => setOpen(false)}>Sign in</Link>
                <Link href="/signup" className="button button-primary" onClick={() => setOpen(false)}>Start free</Link>
                <Link href="/contact" className="button button-ghost" onClick={() => setOpen(false)}>Talk to sales</Link>
              </nav>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
