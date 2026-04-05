"use client";

import { useMemo, useState } from "react";

import { useToast } from "@/components/feedback/toast";
import { CopyButton } from "@/components/ui/copy-button";

const channelLabels: Record<string, string> = {
  linkedin: "LinkedIn",
  facebook: "Facebook",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  jobBoard: "Job Board"
};

const channelOrder = ["linkedin", "facebook", "instagram", "whatsapp", "telegram", "jobBoard"];

type JobPostGeneratorProps = {
  jobId: string;
  initialAds: Array<{ id: string; channel: string; content: string }>;
};

export function JobPostGenerator({ jobId, initialAds }: JobPostGeneratorProps) {
  const { pushToast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [ads, setAds] = useState(initialAds);

  const orderedAds = useMemo(() => {
    const lookup = new Map(ads.map((ad) => [ad.channel, ad]));
    return channelOrder
      .map((channel) => lookup.get(channel))
      .filter((ad): ad is { id: string; channel: string; content: string } => Boolean(ad));
  }, [ads]);

  async function regenerate() {
    try {
      setGenerating(true);
      const response = await fetch(`/api/jobs/${jobId}/ads`, { method: "POST" });
      const payload = await response.json().catch(() => ({ error: "Could not generate posts" }));

      if (!response.ok) {
        throw new Error(payload.error || "Could not generate posts");
      }

      setAds(Object.entries(payload.data).map(([channel, content]) => ({
        id: channel,
        channel,
        content: String(content)
      })));
      pushToast({ title: "Job posts refreshed", description: "Platform-ready job copy is ready to use.", tone: "success" });
    } catch (error) {
      pushToast({ title: "Post generation failed", description: error instanceof Error ? error.message : "Please try again.", tone: "error" });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <section className="stack-lg">
      <div className="list-row list-row-start">
        <div>
          <h3 className="section-title">Platform post generator</h3>
          <p className="section-description">Generate recruiter-ready posts tuned for social channels, messaging apps, and job boards.</p>
        </div>
        <button type="button" className="button button-primary" onClick={regenerate} disabled={generating}>
          {generating ? "Generating..." : "Regenerate posts"}
        </button>
      </div>

      <div className="platform-post-grid">
        {orderedAds.map((ad) => (
          <article key={ad.channel} className="platform-post-card">
            <div className="list-row list-row-start">
              <div>
                <p className="eyebrow eyebrow-soft">{channelLabels[ad.channel] ?? ad.channel}</p>
                <strong>{channelLabels[ad.channel] ?? ad.channel} version</strong>
              </div>
              <CopyButton value={ad.content} />
            </div>
            <p className="platform-post-copy">{ad.content}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
