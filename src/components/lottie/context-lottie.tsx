"use client";

import { Player } from "@lottiefiles/react-lottie-player";
import { useState } from "react";

import type { LottieSceneKey } from "@/lib/lottie-scenes";
import { lottieSceneMap } from "@/lib/lottie-scenes";

type ContextLottieProps = {
  scene: LottieSceneKey;
  className?: string;
  compact?: boolean;
};

export function ContextLottie({ scene, className = "", compact = false }: ContextLottieProps) {
  const [failed, setFailed] = useState(false);
  const config = lottieSceneMap[scene];

  if (failed) {
    return (
      <div className={`context-lottie-fallback ${compact ? "context-lottie-fallback-compact" : ""} ${className}`.trim()} aria-label={config.title}>
        <span>{config.title}</span>
      </div>
    );
  }

  return (
    <div className={`context-lottie-shell ${compact ? "context-lottie-shell-compact" : ""} ${className}`.trim()}>
      <Player
        autoplay
        loop
        keepLastFrame
        src={config.src}
        onEvent={(event) => {
          if (event === "error") {
            setFailed(true);
          }
        }}
      />
    </div>
  );
}
