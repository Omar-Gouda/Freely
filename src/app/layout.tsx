import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Manrope } from "next/font/google";

import { AppProviders } from "@/components/providers/app-providers";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans"
});

export const metadata: Metadata = {
  title: "Freely | Recruiters Free Home",
  description: "Freely helps recruiters manage jobs, candidates, interviews, outreach, and team activity from one workspace.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg"
  }
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={manrope.variable}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
