import type { Email } from "./email.ts";

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);
}

/**
 * The confirmation sent to the NEW address when someone changes their email. Same look as the reset email (light
 * only, inline styles). The address on the account changes only when this link is opened.
 */
export function changeEmailEmail(o: { to: string; name: string; url: string; appUrl: string }): Email {
  const name = o.name.trim() || "there";
  const subject = "Confirm your new Zamane email";
  const text = [
    `Hi ${name},`,
    "",
    "Someone asked to use this address for a Zamane account. Open the link below to confirm the change.",
    "",
    o.url,
    "",
    "Until you do, your account keeps its current email. The link expires in 1 hour.",
    "",
    "Didn't ask for this? Ignore this email. Nothing changes.",
  ].join("\n");
  const logo = `${o.appUrl.replace(/\/$/, "")}/email/zamane-logo.png`;
  const url = esc(o.url);
  const html = `<!doctype html>
<html lang="en" dir="ltr" style="margin:0;padding:0;background:#f8f3ea;">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f8f3ea;color:#1d2230;font-family:Figtree,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:24px;">
  <main style="display:block;max-width:560px;margin:0 auto;padding:32px 16px 48px;">
    <header style="margin:0 0 24px;"><img src="${esc(logo)}" alt="Zamane" width="139" height="40" style="display:block;height:40px;width:auto;border:0;"></header>
    <article style="background:#fffdf8;border:1px solid #e3d8c5;border-radius:20px;padding:32px 24px;">
      <p style="margin:0 0 16px;">Hi ${esc(name)},</p>
      <p style="margin:0 0 24px;">Someone asked to use this address for a Zamane account. Use the button to confirm the change.</p>
      <p style="margin:0 0 24px;"><a href="${url}" style="display:inline-block;min-height:24px;padding:14px 24px;background:#1d4e89;border:1px solid #1d4e89;border-radius:12px;color:#ffffff;font-weight:600;font-size:16px;line-height:24px;text-decoration:none;">Confirm new email</a></p>
      <p style="margin:0 0 24px;">Until you do, your account keeps its current email. The link expires in 1 hour.</p>
      <p style="margin:0 0 8px;color:#5a5f6d;font-size:14px;line-height:20px;">Button not working? Copy this link into your browser:</p>
      <p dir="ltr" style="margin:0 0 24px;padding:12px;background:#efe6d6;border-radius:6px;color:#1d2230;font-family:ui-monospace,Consolas,'Courier New',monospace;font-size:13px;line-height:20px;overflow-wrap:anywhere;word-break:break-all;">${url}</p>
      <p style="margin:0;">Didn't ask for this? Ignore this email. Nothing changes.</p>
    </article>
  </main>
</body>
</html>`;
  return { to: o.to, subject, text, html };
}
