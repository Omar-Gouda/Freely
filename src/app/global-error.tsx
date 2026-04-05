"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "2rem", background: "#f7f1ff", color: "#24123a", fontFamily: "sans-serif" }}>
          <div style={{ width: "min(520px, 100%)", background: "white", borderRadius: "24px", padding: "2rem", boxShadow: "0 24px 60px rgba(15, 23, 42, 0.12)" }}>
            <p style={{ marginTop: 0, color: "#7c6c92", fontWeight: 700 }}>Something went wrong</p>
            <h1 style={{ marginTop: 0 }}>The page hit an unexpected error.</h1>
            <p style={{ color: "#6f5f88" }}>The issue has been captured for review. Try loading the page again.</p>
            <button type="button" onClick={reset} style={{ marginTop: "1rem", border: 0, borderRadius: "14px", padding: "0.9rem 1.1rem", background: "#7c3aed", color: "white", fontWeight: 700 }}>
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}