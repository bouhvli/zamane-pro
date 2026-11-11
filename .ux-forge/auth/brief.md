# Brief: Zamane auth and joining (signed-out screens and space setup)

**Mode:** department. The user asked for the full team.
- **Discover:** Researcher ∥ Architect.
- **Express:** Writer ∥ Art Director.
- **Decide:** the user picks a direction.
- **Systematize:** the Director records token additions. The design system's tokens are fixed and binding, so there's no Design Systems pass unless the direction needs new primitives.
- **Build:** the Director builds the shared shell ∥ Front-end engineers build the screens.
- **Review:** Critic ∥ Accessibility.
- **Fix:** at most 2 rounds.

## Request
Design every screen a person meets **before they reach Home**, and deliver a working standalone HTML prototype (`auth.html`, hash-routed like `goals.html`) covering every state:

1. **Sign in:** email and password.
2. **Create account:** display name (their first name, as the app shows it), email and password.
3. **Forgot password:** request a reset link, then a "check your email" state.
4. **Reset password:** reached from the email link (`/reset-password?token=…`). Covers a valid token, an expired token and an already-used token.
5. **Set up your space** (signed in, no space yet: API `403 no_space`). Two paths:
   - **Start our space:** create it. `POST /api/spaces { id, name, currency, timezone }`. The timezone comes from the browser; the currency is picked, MAD for the example couple.
   - **Join with a code:** `POST /api/spaces/join { code }`. Takes the 8-character `XXXX-XXXX` code the partner shared, normalised for case, spaces and dashes.
6. **Hand-off:**
   - The creator lands on Home's `first-run` state, the invite card, which already exists in `.ux-forge/home/`.
   - The joiner lands on Home with "Hi, you two".
   - The auth flow doesn't redesign Home; it links to it.

The password-reset **email** (subject, text and HTML body, sent by Resend) is in scope for copy, plus a simple HTML rendering.

## Users and success actions
The same couple, Sara (partner A, who creates the space) and Youssef (partner B, who joins with her code), each on their own phone. Auth is met rarely: once at sign-up, then again on a new phone, after a sign-out, or when a password is forgotten.

- **Primary success:**
  - **Sara:** from a fresh install to her space being created and her code in hand, in under a minute.
  - **Youssef:** from Sara's message to "Hi, you two", in under a minute.
- **Returning:** "Let me back in": the password manager fills the form, one tap, and they're through.
- **Forgot:** "I can't remember it". They get the email, set a new password, and they're in, with no dead ends.

## Platform and stack (from ARCHITECTURE.md §5–6, binding)
- **Platform:** a mobile-first installable PWA, 320 px and up, light and dark, with safe areas. It's often opened from the home-screen icon (standalone display mode, no browser chrome).
- **Auth:** self-hosted **Better Auth**, email and password only (no OAuth, no magic links, no passkeys in v1).
  - The password is 10 to 128 characters.
  - The display name is Better Auth's `name` field.
  - There is no email verification step in v1. `email_verified` exists but nothing gates on it.
- **Password reset:**
  - The request gets the same response whether or not the email exists, so there's no account enumeration.
  - The token is single-use, expires after 1 hour, and a reset revokes all sessions.
- **Rate limits:** sign-in, sign-up and reset allow 10 per minute per IP and email; joining allows 5 per minute. The UI needs a "too many tries" state.
- **Join errors:** an unknown code and a full space give the **same** `404 invite_invalid`. The UI must not tell them apart.
- **Other errors:** "already in a space" and `UNIQUE(user_id)` are possible edge cases.
- **Connection:** auth needs a connection, and the offline state must say so.
- **Session:** after sign-in, `GET /api/me` decides where to go: Home, or space setup.
- **Target stack:** React 19 + TanStack Router/Query (not scaffolded yet). The prototype is plain HTML, CSS and JS, works over `file://`, and is hash-routed.

## Brand constraints (binding)
- **Design system:** `Zamane Design System.html`. It sets the tokens, the type (Young Serif and Figtree), the arch (imagery only), saffron (completion and time), zellige (done), danger (destructive actions and form errors), the partner colours (avatars only) and the voice: warm, plain, "you two", first names.
- **Logo files:** in `assets/`, read-only. These are the first screens where the brand mark leads.
- **Reuse:**
  - **Shared layer:** `.ux-forge/goals/zamane.css`, which holds the tokens, base styles, buttons, fields and notices.
  - **Field and form patterns:** from `.ux-forge/goals/form.js` and `form.css` (error summary, inline errors, `aria-describedby`).
  - **Invite-code format and copy:** from `.ux-forge/home/copy.md`.
- **No bottom nav** on any signed-out or setup screen. They're outside the app.

## Accessibility (beyond the WCAG 2.2 AA floor)
- **3.3.8 Accessible Authentication (Minimum):**
  - paste is allowed everywhere, including the code;
  - `autocomplete` is set: `username`/`email`, `current-password`, `new-password`, `name`/`given-name`, `one-time-code`?;
  - there's a show-password toggle;
  - there are no cognitive tests.
- **3.3.7 Redundant Entry:** the email typed on Sign in carries over to Forgot password.
- **Errors:** announced; focus moves to the error summary or the field.

## Example data (prototype only)
- **Sara:** `sara@example.com`.
- **Youssef:** `youssef@example.com`.
- **Space:** "Sara & Youssef", MAD, `Africa/Casablanca`.
- **Invite code:** `K7QM-4XPA` (from Home).
- **"Today":** fixed at Mon 9 Nov 2026, as in Goals.

## Assumptions (stated, not asked)
- **The space name** is asked at creation, because the API requires it, with a warm default built from the creator's name ("Sara's space"? the Writer decides). It isn't shown much elsewhere yet.
- **Currency:** a short list with the browser locale's currency first, plus MAD and EUR. It can't be changed later in v1, and the UI says so.
- **No invite link in v1:** the API joins by code only. The architect may propose `?code=` prefilling as an open item.
- **Sign out** lives in Profile (out of scope). Its destination, Sign in, is in scope.
- **Languages:** the copy is English, i18n-ready, and RTL-safe (Arabic later). There's no language switcher on these screens in v1 unless research says otherwise.
