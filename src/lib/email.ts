import nodemailer from "nodemailer";

/**
 * Provider-neutral email layer.
 *
 * Call sites (the register route, resend-verification route -- both
 * later files in this phase) import ONLY `sendEmail()` and
 * `buildEmailVerificationEmail()` below -- never `nodemailer` directly.
 * This is the seam that lets a future provider change (e.g. pointing
 * SMTP_HOST at a Resend/Brevo/SES SMTP relay, or swapping to a different
 * transport entirely) touch only the internals of this one file, never
 * any route handler.
 *
 * Same lazy-env-read pattern as src/lib/auth.ts's getAccessSecret() /
 * getRefreshSecret(): config is read inside functions, not at module
 * load time, so a missing SMTP var fails loudly when an email is
 * actually attempted, with a clear message, rather than silently
 * producing a broken transporter at import time.
 */

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string; // always provide a plain-text fallback alongside html
}

export interface EmailSendResult {
  sent: boolean;
  /** Present only when sent: false -- safe to log, not to show the end user. */
  error?: string;
}

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const from = process.env.SMTP_FROM_EMAIL;

  if (!host || !port || !user || !pass || !from) {
    throw new Error(
      "SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, and SMTP_FROM_EMAIL in your environment (.env)."
    );
  }

  return {
    host,
    port: Number(port),
    // Port 465 is implicit TLS; anything else (587, 25) uses STARTTLS,
    // which nodemailer negotiates automatically when secure: false.
    secure: Number(port) === 465,
    auth: { user, pass },
    from,
  };
}

let cachedTransporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (cachedTransporter) return cachedTransporter;

  const config = getSmtpConfig();
  cachedTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  });
  return cachedTransporter;
}

/**
 * Sends an email. Never throws -- callers (route handlers) get a result
 * object back so a transient SMTP outage degrades gracefully (e.g. the
 * register route can still create the account + token and let the user
 * retry via "resend verification" later) instead of becoming an
 * unhandled 500 that loses the user's submitted registration.
 */
export async function sendEmail(message: EmailMessage): Promise<EmailSendResult> {
  try {
    const config = getSmtpConfig();
    const transporter = getTransporter();

    await transporter.sendMail({
      from: config.from,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });

    return { sent: true };
  } catch (err) {
    console.error("[EMAIL SEND ERROR]", err);
    return { sent: false, error: err instanceof Error ? err.message : "Unknown email error" };
  }
}

// ----------------------------------------------------------------------------
// Templates
//
// Phase 1 scope: email verification only. No password-reset template is
// included here -- that is explicitly out of scope for this phase.
// ----------------------------------------------------------------------------

export function buildEmailVerificationEmail(params: { verifyUrl: string }): Omit<EmailMessage, "to"> {
  return {
    subject: "Verify your PondyHub email address",
    text: `Welcome to PondyHub! Verify your email address to finish setting up your account:\n\n${params.verifyUrl}\n\nThis link expires in 48 hours. If you didn't create a PondyHub account, you can ignore this email.`,
    html: `
      <p>Welcome to PondyHub!</p>
      <p><a href="${params.verifyUrl}">Click here to verify your email address</a>.</p>
      <p>This link expires in 48 hours.</p>
      <p>If you didn't create a PondyHub account, you can ignore this email.</p>
    `,
  };
}