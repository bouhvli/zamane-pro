import type { Email } from "./email.ts";

/**
 * The password-reset email, ported from .ux-forge/auth/email-reset.html: same copy, light only, inline styles,
 * no tables. Colours are the design system's light tokens written out, because email clients ignore custom
 * properties. The logo is the PNG published with the app (public/email/zamane-logo.png, from `pnpm icons`).
 */
function esc(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);
}

export function resetPasswordEmail(o: { to: string; name: string; url: string; appUrl: string }): Email {
  const name = o.name.trim() || "there";
  const subject = "Reset your Zamane password";
  const text = [
    `Hi ${name},`,
    "",
    "Someone asked to reset the password for your Zamane account. Use the link below to choose a new one.",
    "",
    o.url,
    "",
    "The link works once and expires in 1 hour. Setting a new password signs you out on all your devices.",
    "",
    "Didn't ask for this? Ignore this email. Your password stays the same.",
    "",
    "You're getting this because this address is used for a Zamane account.",
  ].join("\n");

  const logo = `${o.appUrl.replace(/\/$/, "")}/email/zamane-logo.png`;
  const url = esc(o.url);
  const html = `<!doctype html>
<html lang="en" dir="ltr" style="margin:0;padding:0;background:#f8f3ea;">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f8f3ea;color:#1d2230;font-family:Figtree,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:24px;-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;font-size:1px;line-height:1px;">The link works once and expires in 1 hour.</div>
  <main style="display:block;max-width:560px;margin:0 auto;padding:32px 16px 48px;">
    <header style="margin:0 0 24px;">
      <img src="${esc(logo)}" alt="Zamane" width="139" height="40" style="display:block;height:40px;width:auto;border:0;">
    </header>
    <article style="background:#fffdf8;border:1px solid #e3d8c5;border-radius:20px;padding:32px 24px;">
      <p style="margin:0 0 16px;">Hi ${esc(name)},</p>
      <p style="margin:0 0 24px;">Someone asked to reset the password for your Zamane account. Use the button to choose a new one.</p>
      <p style="margin:0 0 24px;">
        <a href="${url}" style="display:inline-block;min-height:24px;padding:14px 24px;background:#1d4e89;border:1px solid #1d4e89;border-radius:12px;color:#ffffff;font-weight:600;font-size:16px;line-height:24px;text-decoration:none;">Reset your password</a>
      </p>
      <p style="margin:0 0 24px;">The link works once and expires in 1 hour. Setting a new password signs you out on all your devices.</p>
      <p style="margin:0 0 8px;color:#5a5f6d;font-size:14px;line-height:20px;">Button not working? Copy this link into your browser:</p>
      <p dir="ltr" style="margin:0 0 24px;padding:12px;background:#efe6d6;border-radius:6px;color:#1d2230;font-family:ui-monospace,Consolas,'Courier New',monospace;font-size:13px;line-height:20px;overflow-wrap:anywhere;word-break:break-all;user-select:all;">${url}</p>
      <p style="margin:0;">Didn't ask for this? Ignore this email. Your password stays the same.</p>
    </article>
    <footer style="margin:24px 0 0;padding:0 8px;color:#5a5f6d;font-size:13px;line-height:18px;">
      <p style="margin:0;">You're getting this because this address is used for a Zamane account.</p>
    </footer>
  </main>
</body>
</html>`;
  return { to: o.to, subject, text, html };
}
