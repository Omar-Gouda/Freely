"use client";

import { BarChart3, BriefcaseBusiness, CalendarDays, LayoutDashboard, MessageSquare, Users } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

const slides = [
  {
    title: "Welcome to your recruiting workspace",
    description: "This platform keeps jobs, candidates, schedules, outreach, and analytics connected so recruiters can work from one place.",
    label: "Overview",
    icon: LayoutDashboard
  },
  {
    title: "Build the hiring plan in Jobs",
    description: "Create the role, define demand, and keep the brief, hiring setup, and generated post content tied to one role record.",
    label: "Jobs",
    icon: BriefcaseBusiness
  },
  {
    title: "Review talent in Candidates and Pipeline",
    description: "Add resumes, review extracted profiles, and move applicants through one role pipeline without mixing stages across jobs.",
    label: "Candidates",
    icon: Users
  },
  {
    title: "Use Interviews as the live schedule",
    description: "Track recruiter-owned slots on the calendar, inspect daily agendas, assign candidates, and keep every schedule change visible through in-app alerts.",
    label: "Interviews",
    icon: CalendarDays
  },
  {
    title: "Use Outreach and Analytics for follow-through",
    description: "Send recruiter-ready messages, then monitor sourcing, conversion, and hiring movement from the analytics dashboard.",
    label: "Outreach & analytics",
    icon: BarChart3
  },
  {
    title: "Reopen this guide any time",
    description: "Use the Help & get started link in the profile menu whenever you want a refresher on what each area of the system is for.",
    label: "Help",
    icon: MessageSquare
  }
];

function getTourStorageKey(userId: string) {
  return `freely:get-started-complete:${userId}`;
}

export function GetStartedTour({ userId, completedInitially }: { userId: string; completedInitially: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const shouldForceOpen = searchParams.get("tour") === "1";
    const storageKey = getTourStorageKey(userId);
    const completedLocally = typeof window !== "undefined" && window.localStorage.getItem(storageKey) === "true";

    if (shouldForceOpen) {
      setOpen(true);
      setStep(0);
      return;
    }

    if (!completedInitially && !completedLocally) {
      setOpen(true);
      setStep(0);
    }
  }, [completedInitially, searchParams, userId]);

  const currentSlide = slides[step];
  const Icon = currentSlide.icon;

  const closeTour = useCallback(async () => {
    setOpen(false);
    const storageKey = getTourStorageKey(userId);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, "true");
    }

    try {
      await fetch("/api/profile/onboarding", { method: "PATCH" });
    } catch {
      // The local per-user key prevents the tour from reopening immediately if the network request fails.
    }

    const params = new URLSearchParams(searchParams.toString());
    if (params.has("tour")) {
      params.delete("tour");
      router.replace(params.size ? `${pathname}?${params.toString()}` : pathname);
    }
  }, [pathname, router, searchParams, userId]);

  const progressLabel = useMemo(() => `${step + 1} of ${slides.length}`, [step]);

  if (!open) {
    return null;
  }

  return (
    <div className="tour-overlay" role="dialog" aria-modal="true" aria-label="Getting started tour">
      <div className="tour-backdrop" onClick={() => void closeTour()} />
      <div className="tour-modal card">
        <button type="button" className="tour-close" onClick={() => void closeTour()} aria-label="Close guide">Close</button>
        <div className="tour-icon-shell">
          <Icon size={34} />
        </div>
        <small className="tour-kicker">{currentSlide.label}</small>
        <h2>{currentSlide.title}</h2>
        <p>{currentSlide.description}</p>
        <div className="tour-footer">
          <div>
            <div className="tour-dots" aria-hidden="true">
              {slides.map((item, index) => (
                <span key={item.title} className={`tour-dot${index === step ? " active" : ""}`} />
              ))}
            </div>
            <small className="muted">{progressLabel}</small>
          </div>
          <div className="tour-actions">
            <button type="button" className="button button-ghost" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0}>Back</button>
            {step === slides.length - 1 ? (
              <button type="button" className="button button-primary" onClick={() => void closeTour()}>Finish</button>
            ) : (
              <button type="button" className="button button-primary" onClick={() => setStep((current) => Math.min(slides.length - 1, current + 1))}>Next</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
