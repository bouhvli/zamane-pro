# Research & strategy: Zamane auth and space joining

Sources: brief.md and ARCHITECTURE.md §5–6 read in full. Web search was available. Claims marked **(knowledge)** come from my own knowledge, not from a fetched source, and should be spot-checked. The couple-app findings are thin because the search returned little primary material (see Category conventions).

The ux-forge KIT files (protocol.md, process.md, principles.md) were outside my readable directories, so I did not read them. If protocol.md specifies a handoff file or summary format I missed, the caller should adjust.

## Users

**Primary: the couple, one phone each.** Sara (creator) and Youssef (joiner). Both are non-technical adults on personal phones, iOS or Android, opening the app from a home-screen icon in standalone mode. They are not buying anything and not shopping around. They are following a message from their partner or setting up a shared thing together.

- **Frequency:** auth is rare. It happens once at sign-up, then again only after a new phone, a sign-out or a forgotten password. Most visits never see these screens, so recognition has to carry the flow. Memory of "how this worked last time" cannot.
- **Expertise:** low to medium. Both probably have a phone password manager (iCloud Keychain, Google Password Manager) that is on by default. Neither should need to know what "space" means before the app teaches it.
- **Context:** Sara is often alone and calm. Youssef is often in a chat app, switching between WhatsApp or Messages and Zamane to read the code. His moment is "go and come back", so the code must survive a context switch and be pasteable.
- **Accessibility needs:** the usual range, plus cognitive load and motor needs (one-handed, small screens at 320 px). Arabic and RTL later. Names and emails in mixed scripts.

**Secondary:** the returning user on a new phone, and the user who forgot their password. Both are in a slightly stressed state and want the fewest steps.

## Jobs to be done

1. **Sara, creating.** When we decide to plan money and trips together, I want to make our shared place in one go, so I can send Youssef a code and start adding goals tonight.
2. **Youssef, joining.** When Sara sends me a code, I want to type or paste it and land in our space, so I can see what she has set up without making an account that leads nowhere.
3. **Youssef, wrong-path guard.** When I open the app for the first time after Sara's message, I want to be told clearly that I'm joining and not starting, so I don't end up alone in an empty space of my own.
4. **Either, returning.** When I open the app on a new phone or after signing out, I want my password manager to fill the form and one tap to get me in, so I don't have to recall anything.
5. **Either, forgot.** When I can't remember my password, I want a link that works the first time and a new password that signs me in, so I'm not locked out of our shared plans.
6. **Either, uncertain.** When something fails (wrong code, no connection, too many tries), I want to know what to do next in plain words, so I don't guess and make it worse.

## Success

| Screen | One success action | Business outcome | Measure |
|---|---|---|---|
| Sign in | Submit and land on Home | Returning use | Sign-in success rate on first submit; share of sign-ins with password-manager fill (form-fill proxy: time from focus to submit under 3 s) |
| Create account | Submit valid account | Activation start | Completion rate; median time under 30 s; validation errors per attempt |
| Forgot password | Submit email, see "check your email" | Recovery without support | Request-to-reset-completion within 1 h |
| Reset password | Set new password and be signed in | Recovered user | Valid-token completion; expired or used token followed by a new request |
| Set up your space | Choose the right path and finish it | Couple is paired (the real activation event) | Time from account to space: Sara under 60 s, Youssef under 60 s |
| Join code | Code accepted | Two-member space | Join success on first try; `invite_invalid` rate |

**North-star for this flow:** the share of accounts that reach a space with two members within 24 h of the creator's sign-up. Instrument these events: `signup_submitted`, `space_created`, `join_attempted`, `join_failed` (no reason split, mirroring the 404), `reset_requested`, `reset_completed`, `rate_limited`, and `wrong_path_suspected`. The last one fires when a user creates a space less than 10 minutes after arriving by a shared message. That is hard to detect, so use proxies: a space with one member and no entries after 24 h, from an account created within the same hour as another account's space.

## Scope

**In scope (v1)**
- Sign in, Create account, Forgot, Reset (valid, expired, used), Set up your space (Start / Join), hand-off to Home (links only), reset email copy.
- States for each screen: idle, submitting, field error, summary error, offline, rate-limited (429), server error.
- A visible show/hide password toggle, paste allowed in every field including the code, password-manager-compatible forms.

**Out of scope (v1)**
- OAuth, magic links, passkeys, email verification gating, invite links, language switcher, sign-out UI (Profile), changing currency after creation, leaving a space (stubbed 501).

**Where the system absorbs complexity [Tesler]**
- Code input normalises case, spaces, dashes and look-alikes. The user never learns the format rules, so the client accepts "k7qm 4xpa" and inserts the dash.
- Timezone comes from the browser. The user is never asked.
- Currency defaults to the browser locale. Show the pick only as a confirm, and say it cannot be changed later.
- Space name defaults to something warm from the creator's name, editable, and not a blocker.
- Email carries from Sign in to Forgot (3.3.7).
- After auth, `GET /api/me` routes silently to Home or Setup. The user never picks "where do I go".
- Password rules are one line ("10 or more characters"), with no composition rules, which matches the 10–128 length rule in the architecture.

## Category conventions

### Sign in / create account / reset (mobile, 2024–26)

Keep these. Users will expect them (Jakob's Law):
- **Email + password on one screen, one primary button, link to "Forgot password?" below the password field, and a switch link to the other screen.** The standard shape across consumer apps **(knowledge)**.
- **Show-password toggle** inside the field. It also serves 3.3.8 users with memory or typing difficulties.
- **Inline validation on blur or submit, not on every keystroke,** with a summary for screen readers.
- **Single-column, full-width fields, 16 px+ input text** (prevents iOS zoom on focus), email keyboard (`type="email"`, `inputmode="email"`).
- **Reset: request, "check your email", link, new password, signed in.** Signing the user in after reset is a convenience. The architecture revokes all sessions on reset, so after setting the password the UI should either sign in immediately with the new session (if Better Auth issues one) or send to Sign in with the email prefilled and a success notice. The Architect must confirm which.

Differentiate: the brand mark leads, the voice is warm and plain ("you two", first names), no marketing carousel before the form, and the display-name field says "Your first name" with a hint that your partner will see it.

### Couple and shared apps: "start" vs "join"

The search was thin. What I could confirm:
- **Honeydue** invites the partner by email or text after you sign up, and the partner receives a link to download the app and join ([NerdWallet review](https://www.nerdwallet.com/finance/learn/honeydue-app-review), [Honeydue help centre listing](https://support.honeydue.com/en/articles/3179655-how-do-i-invite-my-partner-to-honeydue); the article body was not retrievable). So the creator always creates first and the joiner arrives through a link, not a choice screen.
- **Other couple apps** (Peggy's landing page describes a short-lived numeric code: [source](https://peggy-landingpage.pages.dev/couples-budget-app)) show code-based pairing exists in the category, but the source is marketing copy.
- From **(knowledge)**, not verified in this session: Splitwise adds people by email or invite link. Zenly-style and shared-calendar apps pair through a link or a short code shown on the first device and entered or opened on the second. Link-based joining is the dominant pattern. A bare code is the less common one, and it is the one Zamane has chosen.

**What this implies:**
1. **The dominant convention is a link that carries the intent.** Zamane has no invite link in v1, so the joiner opens the app cold and must pick a path. That is the single biggest wrong-path risk. The design must compensate with a strong, explicit choice screen (below).
2. **A "later" item:** a shareable link `https://<app>/join?code=K7QM-4XPA` that prefills the code and puts the joiner straight on the join path. It needs no new backend. It is a client-only route that reads `?code=`. Flagged in the brief as an open item, and I recommend it for v1.1 (see Recommendations R8).

## Platform and autofill evidence

- **`autocomplete` tokens.** Safari factors in `autocomplete` when deciding how to fill, benefits from explicit values on login forms, and ignores `autocomplete="off"` ([Apple, Safari AutoFill](https://developer.apple.com/documentation/safari-developer-tools/autofill.md)). Apple's platform guide says to set `autocomplete="new-password"` when the heuristic misses a new-password context ([Apple Platform Security](https://support.apple.com/guide/security/secc84c811c4/web)). Never use `off` on auth fields.
- **`passwordrules`.** Safari-originated attribute (2018) that lets a generator honour site rules. Support is patchy outside Safari and Apple's ecosystem ([Scott Brady](https://scottbrady.io/authentication/perfecting-the-password-field-with-the-html-passwordrules-attribute), [NSHipster](https://Www.nshipster.com/uitextinputpasswordrules/)). It is cheap to add and harmless where ignored. Because the only rule is length 10–128, use `passwordrules="minlength: 10; maxlength: 128;"` and rely on the same message in the hint text. I could not verify the exact current syntax in a spec, so test on a real iPhone.
- **Hidden fields.** Password AutoFill ignores fields hidden with CSS ([developer write-up in search results](https://medium.com/@wanxiao1994/experience-in-adapting-ios-password-autofill-8ba8f5c544de)). Do not hide the email field on any password screen, and do not build a two-step flow that hides the password field on step 1 (the email-first pattern breaks several managers **(knowledge)**).
- **Standalone PWA.** I found no current Apple statement on autofill in home-screen web apps. The evidence is an old 1Password iOS 12 thread where a home-screen site failed to autofill ([1Password community](https://1password.community/discussion/comment/475066/)) and a forum report of passkey oddities from home-screen launches ([Apple Developer Forums](https://developer.apple.com/forums/tags/passkeys-in-icloud-keychain)). Treat as an unverified risk: **test on a real iPhone installed to the home screen**, including the iCloud Keychain suggestion and a third-party manager. Make a manual typing path always work.
- **Form structure that keeps managers working** **(knowledge, consistent with the above):**
  - A real `<form>` with a real submit button (`type="submit"`), submitted through `submit` event handling (not a click handler on a div).
  - Stable `name` and `id` on fields, with a visible `<label>`.
  - Sign in: `<input type="email" name="email" autocomplete="username">` (or `email`) then `<input type="password" autocomplete="current-password">`.
  - Create account: name `autocomplete="given-name"`, email `autocomplete="email"` (or `username`), password `autocomplete="new-password"`.
  - Reset: only the password field, `autocomplete="new-password"`. Include a visually hidden, non-`display:none` email field with `autocomplete="username"` only if the token page knows the email. It does not, so skip it. Managers will still offer to save, possibly without a username. Accept this.
  - Do not clear the form on error. Re-render in place so the manager can still save on success.
  - In the SPA, after a successful submit, navigate (a route change) so the browser or manager sees the form go away and offers to save. With hash routing in the prototype this is best-effort.
  - Do not use `autocomplete="one-time-code"` anywhere. There is no OTP in v1. The join code is not a one-time code, and the token would make iOS offer SMS codes (`one-time-code` would wrongly suggest messages content). Use `autocomplete="off"` only on the code field to avoid history clutter, with `autocapitalize="characters"`, `autocorrect="off"`, `spellcheck="false"`, `inputmode="text"`. Paste must stay enabled.

## WCAG 2.2 for auth

- **3.3.8 Accessible Authentication (Minimum), AA.** Authentication cannot require a cognitive function test (including recalling a password) unless there is an alternative or an assistive mechanism. Paste and password-manager support are the recognised mechanisms. The criterion covers authentication of existing users, not account creation ([W3C Understanding 3.3.8](https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication.html), [GOV.UK guide](https://alphagov.github.io/guide-to-wcag/sc/3.3.8.html)). So: no `onpaste` blocking, no "type this code from memory" puzzles, correct `autocomplete`, and `type="password"` toggle. Do not add a CAPTCHA that asks users to identify images or transcribe text. If abuse control is needed later, use an invisible check.
- **1.3.5 Identify Input Purpose** is satisfied by the same `autocomplete` tokens.
- **3.3.7 Redundant Entry, A.** Do not ask again for information entered earlier in the same process. Carry the email from Sign in to Forgot. The join code needs no re-entry if the user navigates back from an error.
- **3.3.1 / 3.3.3** error identification and suggestion. Name the field and say how to fix it.
- **Do not rely on colour alone** for errors (danger token plus icon plus text).
- **Focus and announcements:** move focus to the error summary on submit failure (form-level errors) or to the first invalid field, and use `role="alert"` or an `aria-live` region for rate-limit and offline messages.
- **Touch targets:** 2.5.8 (24 px minimum). Use 44 px+ for toggle and buttons.

## Enumeration-safe copy

[OWASP's Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html) says to return the same message whether or not the account exists, to keep timing and status codes uniform, and not to lock accounts in response to reset attempts. The architecture already does the server side (same response, dummy lookup, email sent from `waitUntil`).

Copy must hold up too:
- **Forgot, after submit (always):** "If there's a Zamane account for **sara@example.com**, we've sent a link to reset your password. It works for one hour. Check your spam folder if it doesn't arrive in a few minutes." Never "We've sent you an email" without the conditional, and never "No account found".
- **Sign in failure:** one message for both unknown email and wrong password: "That email and password don't match. Check them and try again." Never say which one.
- **Sign up with an email already registered:** this is a real enumeration tension. Better Auth returns an error for an existing email by default, which reveals the account. Options: (a) accept the leak because the app is private and tiny (the cost: someone can test if an email has an account), or (b) return the same "check your email" response and email the owner a "you already have an account" message (requires a Better Auth hook, extra engineering). My recommendation: **(a) for v1, flagged as a known, accepted leak**, with copy that is helpful: "That email already has an account. Sign in instead, or reset your password." Rate limits (10/min) bound the abuse. The Architect should record this in the decision log.
- **Join:** one message for unknown code and full space (matches the brief): "That code didn't work. Check it with [partner's first name if known, else 'your partner'] and try again." It must not hint at "full".
- **Reset token expired or used:** it is acceptable to tell the user a link has expired or been used, because the token proves possession of an email. It does not leak account existence. Offer "Send a new link" with the email field prefilled if known (it is not known on this page, so ask once).
- **Rate-limited:** "Too many tries. Wait a minute and try again." State the wait, don't lock the account. Never rate-limit by email alone in a way that lets a third party lock out the victim: the architecture keys by IP and email, so an attacker can burn the victim's quota from their own IP. At 10/min the lockout lasts at most one minute, which is acceptable.

## Risks & regulatory flags

**Value / usability / feasibility / viability [Inspired]**
1. **Wrong path: the joiner creates his own space (highest risk).** A user with an empty space and a partner with a different empty space cannot merge them in v1. There is no leave-space (501) and no merge, and `UNIQUE(user_id)` blocks joining while in a space. This is a dead end that needs support or a database edit. Mitigations are in R1–R3 and R8.
2. **Drop-off at account creation.** Three fields on a phone is fine. Extra fields, strict password composition rules or a failed submit that clears the form are the killers. Also: a user who just wants to see the app is being asked for everything up front. That's accepted by the architecture. Keep the form short and the benefit stated in one line.
3. **Lockout.** There is no email verification, no passkey and one recovery path (email). If the user mistypes their email at sign-up, reset goes nowhere and the account is unrecoverable. Mitigation: show the typed email back for confirmation on the post-sign-up screen ("Signed up as sara@example.com"), use `type="email"` with trimming and lowercasing, and make it easy to correct (PATCH /api/me for email is not in the API, so flag it). Also: reset revokes all sessions, so a reset logs out the partner's other devices (only that user's). Say so in the success notice.
4. **Join code friction.** An 8-character code typed from a chat message. Errors are the most likely failure (O/0, I/1, spaces). The code alphabet should exclude look-alikes (check `home/copy.md`), and the client should normalise. Rate limit is 5/min: legitimate typos burn it, so the UI should show "X tries left" only if the API exposes it. Otherwise generic.
5. **Cross-app context switch (feasibility).** On mobile, Youssef leaves the app to read the code. A page reload or loss of the typed state on return would hurt. Persist the in-progress join input in `sessionStorage` (not the code itself if the architecture prefers none stored; the code is low sensitivity but expiring) and avoid full re-renders on `visibilitychange`.
6. **Standalone PWA autofill** unproven on iOS (see above). Viability risk for the "one tap" returning promise.
7. **Offline.** Auth needs a connection. Show an explicit offline state and keep typed values. Disable nothing silently.
8. **Reset-link opened in a different context.** On iOS the email link opens Safari, not the installed PWA. The user finishes the reset in the browser, then opens the home-screen icon and signs in there. Cookies are separate between Safari and the installed app on iOS **(knowledge)**. That is fine for reset (they sign in again) but if reset auto-signs-in, it signs in the Safari context only. **The copy after reset must say "Now open Zamane and sign in"** and not "You're in". This is a high-value finding for the Writer. Likewise, a shared-code message tapped in a chat might open a browser instead of the PWA.

**Regulatory flags**
- **EAA (EU Accessibility Act, in force June 2025):** applies to consumer e-services including account flows if the product is offered in the EU. WCAG 2.2 AA is the working target (EN 301 549 still references 2.1, so 2.2 is a safe superset). Morocco is the example, but the Resend and Neon stack suggests EU users are plausible. Flag, not blocker.
- **GDPR:** the signup creates personal data. Needs a one-line privacy notice link on Create account. No pre-ticked consent boxes. No marketing opt-in on this screen. Strictly necessary cookies (session) need no banner **(knowledge)**.
- **DSA deceptive patterns / dark patterns:** none planned. Keep "Create account" and "Sign in" equal-weight links, no confirm-shaming, no pre-selected options on the space screen.
- **EU AI Act:** no AI features. N/A.

## Assumptions to validate

Run a 3-person think-aloud per row (couples where possible, one phone each, installed PWA, real keychain).

1. **Joiners will pick "Join with a code" rather than "Start our space" when they arrive cold.**
   - Task: "Sara just sent you this message on WhatsApp: 'Download Zamane, code K7QM-4XPA.' Do whatever you'd do to get into your shared space." Start at Create account, with no hints.
   - Watch for: which button they tap on Setup, whether they hesitate, whether anyone creates a space. Success: 3 of 3 join without a wrong turn.
2. **Password-manager one-tap works from the installed PWA on iOS and Android.**
   - Task: install to the home screen, create an account, sign out, then "get back in."
   - Watch for: whether the manager offers to save on sign-up, offers to fill on sign-in, and works after a reset. Success: fill offered without the user typing.
3. **Users understand the reset flow across browser and PWA.**
   - Task: "You've forgotten your password. Get back in." Use a real email.
   - Watch for: do they come back to the app after resetting? Do they expect to be signed in already? Do they find the PWA again?
4. (Lower) **The code entry is forgiving enough.** Task: paste "k7qm 4xpa", then type it from memory with a deliberate O/0 slip. Watch for recovery from the error without confusion.

## Recommendations for the Architect

**Flow and IA**
- **R1. Setup screen is a two-card choice with equal weight and role-based wording, not a default.** "I'm starting our space" / "My partner already started one (I have a code)". Don't pre-select. Put the join card first when the user arrived via `?code=` (see R8). The word "space" needs a one-line gloss on first sight ("Your shared place for goals, trips and shopping").
- **R2. Add a wrong-path check on "Start our space":** a one-line confirm under the button: "Only one of you starts. If your partner already has a code, join instead." This is cheap and addresses the top risk without a modal.
- **R3. Make the Create account screen aware of intent in the prototype:** a small link "Have a code from your partner?" under the form that sets a flag so Setup opens on the Join card. It is client state only. No backend change.
- **R4. Route after auth by `GET /api/me`:** Home if in a space, Setup if `403 no_space`. Never show Setup to a user in a space. If Join returns "already in a space", send to Home with a notice.

**Form and autofill**
- **R5. Use the exact token set** in "Form structure" above. `passwordrules="minlength: 10; maxlength: 128;"` on new-password fields. No composition rules. Show the length rule as a persistent hint, not only on error.
- **R6. One real `<form>` per screen with a submit button, no hidden email field, no `autocomplete="off"` on credentials, no `onpaste` handlers anywhere.** Do not clear fields on error.
- **R7. Join-code input:** single field, auto-inserted dash, `autocapitalize="characters"`, `autocorrect="off"`, paste allowed, normalise on submit exactly as the API does (case, spaces, dashes). Show the formatted code back before submit if the pasted value differed.

**Copy and states**
- **R8. Later (v1.1), not in v1:** shareable `/join?code=…` link on the invite card (client-reads `?code=`, no new API). It matches the category convention and removes most of the wrong-path risk. The prototype may show a disabled or absent state. Record in the decision log as an open item.
- **R9. Reset copy:** conditional "If there's an account…" message, always the same. After a successful reset say "Password changed. Sign in to Zamane." and state that other devices were signed out. Do not claim "you're in" (Safari vs installed app cookie jars).
- **R10. Unified errors:** sign-in mismatch, join invalid and rate-limit messages as listed above. Use `role="alert"` or move focus to the summary.
- **R11. Email typo guard on sign-up:** trim and lowercase the email, show it back after creation, and add a "Not you? Change email" path only if an API exists. Otherwise accept and log as a known lockout risk (no email verification in v1).
- **R12. Accepted enumeration leak on sign-up** with an already-registered email. Record in the decision log with the 10/min limit as the compensating control.

**Instrumentation**
- **R13.** Emit the events listed under Success. Keep `join_failed` free of a reason split to match the 404 design.

**Out-of-scope but note for later:** passkeys (remove the memory task for 3.3.8 entirely), email verification before the reset path is trusted, a "merge or leave space" tool for wrong-path recovery (D19 stubs leave at 501, so v1 support is manual), a language switcher with Arabic and RTL.
