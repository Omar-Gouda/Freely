import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function SectionHeading({ title, description, className, ...props }: HTMLAttributes<HTMLDivElement> & { title: string; description?: string }) {
  return (
    <div {...props} className={cn("section-heading", className)}>
      <h2 className="section-title">{title}</h2>
      {description ? <p className="section-description">{description}</p> : null}
    </div>
  );
}
