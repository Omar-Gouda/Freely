"use client";

import { Copy } from "lucide-react";
import { useState } from "react";

export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      className="link-button copy-button"
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      }}
    >
      <Copy size={14} /> {copied ? "Copied" : label}
    </button>
  );
}
