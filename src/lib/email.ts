import nodemailer from "nodemailer";

import { env } from "@/lib/env";
import { log } from "@/lib/logger";

type EmailConfigStatus = {
  enabled: boolean;
  missing: string[];
};

type EmailDeliveryResult = {
  skipped: boolean;
  reason?: string;
};

function getMissingEmailConfig() {
  const missing: string[] = [];

  if (!env.EMAIL_FROM) missing.push("EMAIL_FROM");
  if (!env.SMTP_HOST) missing.push("SMTP_HOST");
  if (!env.SMTP_USER) missing.push("SMTP_USER");
  if (!env.SMTP_PASS) missing.push("SMTP_PASS");

  return missing;
}

function getEmailErrorReason(error: unknown) {
  const details = error instanceof Error ? error : new Error(String(error));
  const code = typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code ?? "") : "";

  if (code === "EAUTH") {
    return "Email login failed. Double-check the SMTP username, password, and mailbox security settings.";
  }

  if (code === "ENETUNREACH" || code === "EHOSTUNREACH" || code === "ETIMEDOUT" || code === "ECONNREFUSED") {
    return "The email server could not be reached. Check the SMTP host, port, firewall, and whether the mailbox allows SMTP access.";
  }

  return details.message || "Email delivery failed.";
}

export function getEmailConfigStatus(): EmailConfigStatus {
  const missing = getMissingEmailConfig();
  return {
    enabled: missing.length === 0,
    missing
  };
}

const emailConfig = getEmailConfigStatus();

const transportOptions = {
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS
  },
  family: 4
};

const transporter = emailConfig.enabled
  ? nodemailer.createTransport(transportOptions)
  : null;

export function isEmailEnabled() {
  return Boolean(transporter);
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}): Promise<EmailDeliveryResult> {
  if (!transporter) {
    const reason = `SMTP is not configured. Missing: ${emailConfig.missing.join(", ")}`;
    log("warn", "Email skipped because SMTP is not configured", {
      to: input.to,
      subject: input.subject,
      missing: emailConfig.missing
    });
    return { skipped: true, reason } as const;
  }

  try {
    await transporter.sendMail({
      from: env.EMAIL_FROM,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
      replyTo: input.replyTo
    });

    return { skipped: false } as const;
  } catch (error) {
    const reason = getEmailErrorReason(error);
    log("error", "Email delivery failed", {
      to: input.to,
      subject: input.subject,
      reason,
      rawError: error instanceof Error ? error.message : String(error)
    });
    return { skipped: true, reason } as const;
  }
}

export async function sendSignupConfirmationEmail(input: {
  to: string;
  fullName: string;
  workspaceName: string;
  confirmationUrl: string;
}) {
  const firstName = input.fullName.trim().split(/\s+/)[0] || input.fullName;

  return sendEmail({
    to: input.to,
    subject: "Confirm your Freely account",
    text: [
      `Hello ${firstName},`,
      "",
      `Your ${input.workspaceName} workspace is almost ready.`,
      "Confirm your email address to activate your account and sign in:",
      input.confirmationUrl,
      "",
      "If you did not create this account, you can ignore this email."
    ].join("\n"),
    html: `
      <div style="font-family: Manrope, Arial, sans-serif; color: #24123a; line-height: 1.6;">
        <p>Hello ${firstName},</p>
        <p>Your <strong>${input.workspaceName}</strong> workspace is almost ready.</p>
        <p>Confirm your email address to activate your account and sign in.</p>
        <p>
          <a href="${input.confirmationUrl}" style="display: inline-block; background: #0f766e; color: #ffffff; text-decoration: none; padding: 12px 18px; border-radius: 999px; font-weight: 600;">
            Confirm email
          </a>
        </p>
        <p style="word-break: break-all; font-size: 14px; color: #5b4b72;">${input.confirmationUrl}</p>
        <p>If you did not create this account, you can ignore this email.</p>
      </div>
    `
  });
}


