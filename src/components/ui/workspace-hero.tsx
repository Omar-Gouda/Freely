import { ArrowRight } from "lucide-react";

import { ContextLottie } from "@/components/lottie/context-lottie";
import type { LottieSceneKey } from "@/lib/lottie-scenes";

type WorkspaceHeroProps = {
  scene: LottieSceneKey;
  eyebrow: string;
  title: string;
  description: string;
  stats?: Array<{ label: string; value: string }>;
  actions?: Array<{ label: string; href?: string; variant?: "primary" | "ghost" }>;
};

export function WorkspaceHero({ scene, eyebrow, title, description, stats = [], actions = [] }: WorkspaceHeroProps) {
  return (
    <section className="workspace-hero-card card">
      <div className="workspace-hero-copy stack-lg">
        <div className="stack-md">
          <p className="eyebrow eyebrow-soft workspace-hero-eyebrow">{eyebrow}</p>
          <div className="stack-sm">
            <h2 className="workspace-hero-title">{title}</h2>
            <p className="workspace-hero-description">{description}</p>
          </div>
        </div>

        {stats.length ? (
          <div className="workspace-hero-stats">
            {stats.map((stat) => (
              <div key={`${stat.label}-${stat.value}`} className="workspace-hero-stat">
                <small>{stat.label}</small>
                <strong>{stat.value}</strong>
              </div>
            ))}
          </div>
        ) : null}

        {actions.length ? (
          <div className="workspace-hero-actions">
            {actions.map((action) => (
              action.href ? (
                <a key={`${action.label}-${action.href}`} href={action.href} className={`button ${action.variant === "ghost" ? "button-ghost" : "button-primary"}`}>
                  <span>{action.label}</span>
                  <ArrowRight size={16} />
                </a>
              ) : null
            ))}
          </div>
        ) : null}
      </div>

      <div className="workspace-hero-visual">
        <ContextLottie scene={scene} />
      </div>
    </section>
  );
}
