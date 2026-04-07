"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BriefcaseBusiness, CalendarDays, LayoutDashboard, MessageSquare, Settings2, Users, X } from "lucide-react";

import { appName } from "@/lib/constants";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "Jobs", icon: BriefcaseBusiness },
  { href: "/candidates", label: "Candidates", icon: Users },
  { href: "/pipeline", label: "Pipeline", icon: Users },
  { href: "/interviews", label: "Interviews", icon: CalendarDays },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/outreach", label: "Outreach", icon: MessageSquare },
  { href: "/settings", label: "Settings", icon: Settings2 }
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ isOpen = false, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname();

  return (
    <>
      <aside className={cn("sidebar", "sidebar-responsive", isOpen && "sidebar-open")}>
        <div className="sidebar-mobile-row">
          <Link href="/dashboard" className="brand-mark brand-mark-compact" onClick={onClose}>
            <span className="brand-mark-badge">F</span>
            <span className="brand-mark-copy">
              <strong>{appName}</strong>
              <small>Recruitment OS</small>
            </span>
          </Link>
          <button type="button" className="sidebar-close-button" onClick={onClose} aria-label="Close navigation">
            <X size={18} />
          </button>
        </div>

        <div className="sidebar-section-label">Workspace</div>
        <nav className="nav-list">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link href={item.href} key={item.href} className={cn("nav-link", isActive(pathname, item.href) && "nav-link-active")} onClick={onClose}>
                <span className="nav-link-icon"><Icon size={18} /></span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-cta sidebar-cta-rich">
          <p>Keep hiring organized</p>
          <span>Jobs, interviews, notes, and follow-up stay connected even on smaller screens.</span>
        </div>
      </aside>
      <button type="button" className={cn("sidebar-overlay", isOpen && "sidebar-overlay-visible")} onClick={onClose} aria-label="Close navigation overlay" />
    </>
  );
}
