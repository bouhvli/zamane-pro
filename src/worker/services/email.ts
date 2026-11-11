import type { AppConfig } from "../env.ts";

export interface Email {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Local outbox for the E2E test-only route (__E2E__ builds only). It holds the last reset link per address in this
 * isolate's memory. It never exists in a production build: the define makes the whole branch dead code.
 */
export const devOutbox = new Map<string, string>();

/**
 * Sends through Resend's HTTP API with fetch (no SDK). In development with no RESEND_API_KEY, a dev logger prints
 * the message (and its link) to the Worker console instead. Never returned in an HTTP response.
 */
export async function sendEmail(config: AppConfig, email: Email, meta?: { link?: string }): Promise<void> {
  if (config.RESEND_API_KEY === "") {
    if (config.APP_ENV !== "development") throw new Error("RESEND_API_KEY is required outside development");
    if (typeof __E2E__ !== "undefined" && __E2E__ && meta?.link) devOutbox.set(email.to, meta.link);
    console.log(`[dev email] "${email.subject}" → ${email.to}${meta?.link ? `\n[dev email] link: ${meta.link}` : ""}`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${config.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: config.EMAIL_FROM,
      to: [email.to],
      subject: email.subject,
      text: email.text,
      html: email.html,
    }),
  });
  if (!res.ok) throw new Error(`Resend answered ${res.status}`);
}
