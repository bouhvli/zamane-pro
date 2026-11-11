# Structure & skeleton: Zamane auth and space setup

**By:** Information Architect · **For:** Director, Writer, Art Director, front-end engineers · Tue 10 Nov 2026 (prototype "today": Mon 9 Nov 2026)
**Read:**
- `auth/brief.md` and `auth/research.md`. research.md landed after my first draft. §8 records what I took from it and where I disagree.
- `ARCHITECTURE.md`: §3 (middleware, error shape), §4.1 (two members, `UNIQUE(user_id)`, the join statement), §5 (auth, me and spaces endpoints, idempotent creates, rate limits), §6 (Better Auth, reset, cookie cache), §9 (offline), §12 (invite-code alphabet), D19 and D26.
- The design system (principles, buttons, type, voice).
- `home/ia.md` and `home/copy.md` (first-run, joined-empty, invite strings).
- `goals/ia.md` (§2, §6), `goals/form.js`, `goals/form.css`, `goals/build-notes/form.md` and `goals/zamane.css` (field, notice and button classes).

**Not read:** the kit (`protocol.md`, `principles.md`, `accessibility.md`, `styles.md`) is outside the folders this session can read, so laws are cited by name and WCAG by success criterion.

**Copy:** every string below is working copy. The Writer owns the final wording, and Home's glossary applies (space, invite code, partner, "you two").

**Breakpoints** are the same as everywhere else: phone < 48 rem, then ≥ 48 rem (with an optional brand pane from 64 rem). **No bottom nav and no top app bar** on any screen here.

---

## 0. Structural decisions

### A1 · Sign in is the landing screen. There's no welcome screen.
- **Routing:** a signed-out `/` goes to `/sign-in` (replace).
- **Layout:** "New to Zamane? **Create an account**" sits right under the form. At 375 × 667 it shows without scrolling.
- **Why:**
  - **The returning case is the common one.** Each person signs up once but signs in on every new phone and after every sign-out. The brief's returning job is "password manager fills, one tap, through", and a welcome screen would add a tap to it. [Hick, Krug]
  - **The brand mark still leads:** it heads every screen here.
  - **No marketing carousel** (research: differentiate).
- **Exception:** an invite link (A4, if Q2 is accepted) lands on **Create account**.

### A2 · Space setup is a choice, then a short form. The wrong path is the top risk.
**Structure:** `/setup`, then `/setup/start` or `/setup/join`.

**Decision:**
- **Two equal choice cards (links), neither pre-selected.** There's no majorelle primary on the choice screen. Neither path is "the" main one, and the two partners take one each. [DS "Ours, not mine"; research R1; DSA: no pre-selected option]
- **Role-based wording, so a person picks by situation, not by jargon:**
  - **Start our space:** "I'm first. I'll invite my partner with a code."
  - **Join with a code:** "My partner already started. I have their code."
- **A one-line gloss of "space" under the h1, on first sight:** "Your shared place for goals, trips and shopping. One of you starts it; the other joins with a code." [research R1]
- **The wrong-path line** "Only one of you starts. If your partner already has a code, join instead." appears twice, inline, with no modal [research R2]:
  - in the Start card's description;
  - again directly under Start's primary, where it links to Join.
- **The intent can be set earlier.** Create account carries "Have a code from your partner?" (A5). When set, setup skips the choice and opens Join. [research R3]
- **Each form has one primary** and ends with a quiet cross-link to the other path. A person who chose wrong never has to go Back to find the other path.

**Why not one page with both forms?**
- Start has three fields and Join has one. Side by side, two primaries would compete, and a joiner could fill in the wrong form. [Von Restorff]
- **The costly mistake is a joiner who starts their own space.** `UNIQUE(user_id)` plus the `501` on leaving (D19) traps them (Q1). An explicit fork, with each card naming who it's for, is the guard.

### A3 · `GET /api/me` is the one router decision, and only `401` means signed out
A network failure or a `5xx` never sends anyone to Sign in. With a persisted cache, the app opens from the cache (§9 offline reads). Without one, a neutral launch screen says what's true (F11).

### A4 · An invite link carries the code through sign-up (Q2: v1 or v1.1)
- **The link:** `https://<app>/join#code=K7QM-4XPA`, using a fragment so the code never reaches server logs or link-preview fetches. Research proposes `?code=` (R8); a fragment is the same client-only route without the logging.
- **On arrival:** the code is kept on the device and prefilled in Join, and the Start/Join choice is skipped.
- **Timing:** research files this as v1.1 (R8). I recommend v1, because it's client-only and removes most of the top risk (§8). **The rest of this spec works without it.** If deferred, the `#/join` route and the `with-code`, `prefilled` and `member` link states are simply not built. A5's "Have a code?" intent stays in v1 either way.

### A5 · Create account knows the intent: "Have a code from your partner?" [research R3]
- **The control:** a toggle button (`aria-pressed`) under the Create account form, not a navigating link. Joining needs an account first, so leaving the form would only add a step.
- **When pressed,** its label becomes "You'll enter your partner's code next." with **Undo**.
- **What it sets:** a client flag (`zamane.setupIntent = "join"`, session storage). After sign-up, the person goes straight to `/setup/join`. Back still leads to `/setup`, so the choice stays reachable.
- **The flag carries across Sign in** ("Have an account? Sign in") and is cleared on join or sign-out.

### A6 · Decision: accept the sign-up enumeration leak in v1 [research R12]
- **The leak:** signing up with an already-registered email gets Better Auth's error, which confirms that an account exists.
- **Decision:** accept it.
- **Why:**
  - The app is private and tiny.
  - The compensating control is the sign-up rate limit (10/min per IP and email, D26).
  - The alternative (a fake success plus an "you already have an account" email through a Better Auth hook) costs engineering for little gain.
- **Bound:** the UI reveals **no more** than the endpoint does. One message, no name, no hint of whose account it is: "That email already has an account. Sign in instead, or reset your password."
- **Sign in and Forgot stay enumeration-safe** (same message, same response).
- **Architect:** record this in the decision log.

### A7 · The email is checked back, because nothing else will catch a typo [research R11]
There's no email verification and no API to change an email, so a mistyped sign-up email makes the account unrecoverable.
- **Normalising:** the client **trims and lower-cases** the email on Create account, Sign in and Forgot. Better Auth also lower-cases it.
- **Shown back:** the first screen after sign-up (Setup) shows it back in full: "Signed up as **sara@example.com**." If that's wrong, the recovery is a direct line: "Not right? ‹Sign out› and create your account again with the right email."
- **What's left:** a stray account remains, which is the accepted cost.
- **If `PATCH /api/me` ever accepts an email,** the line becomes "Change email".

### A8 · Auth forms put the primary inline, as a full-width button under the last field
There's no floating dock here, unlike the Goals form.
- **Why:**
  - These forms are 1 to 3 fields long, and a sign-in form ending in its button is the convention password managers and people expect. [Jakob]
  - The dock exists for long forms whose end is off screen.
- **Keyboard rule:** when the last field is focused, the primary scrolls into view above the on-screen keyboard (`scroll-padding-bottom` from `visualViewport`).

---

## 1. Screen inventory

| Screen | Route (app · prototype) | Primary job | Primary action | Entry points |
|---|---|---|---|---|
| **Launch** (resolver) | `/` · `#/launch` | Decide where to go from `GET /api/me` | none. A splash at most; on failure, **Try again** | App icon, `start_url`, any reload |
| **Sign in** | `/sign-in` · `#/sign-in` | Get a returning person back in | **Sign in** | Signed-out `/` and app routes; Create account "Sign in instead"; after reset; after sign-out; after a `401` mid-session |
| **Create account** | `/create-account` · `#/create-account` | Make an account in one step | **Create account** | Sign in "Create an account"; invite link (A4) |
| **Forgot password** (form) | `/forgot-password` · `#/forgot-password` | Ask for a reset link | **Send reset link** | Sign in "Forgot password?" (email carried); wrong-credentials alert; email-taken error; "Link doesn't work" |
| **Check your email** | same route, `sent` step | Know the link is on its way and what to do next | none (secondary: **Send again**, **Use a different email**) | after a successful request |
| **Reset password** | `/reset-password?token=…` · `#/reset-password` | Set a new password | **Set new password** | the link in the email |
| **Link doesn't work** | same route, `link-invalid` | Recover from an expired or used link | **Send a new link** | a token rejected on arrival or on submit |
| **Password changed** | same route, `success` | Get back in with the new password | **Sign in** | after a reset |
| **Set up your space** (choice) | `/setup` · `#/setup` | Pick: start our space or join one; see which email the account uses | none (two equal choice cards) | signed in with no space (`me.space = null`, or `403 no_space`) |
| **Start our space** | `/setup/start` · `#/setup/start` | Create the shared space | **Start our space** | choice card; cross-link from Join |
| **Join with a code** | `/setup/join` · `#/setup/join` | Join the partner's space | **Join space** | choice card; cross-link from Start; the A5 intent; invite link |
| **Invite link** (resolver, Q2) | `/join#code=…` · `#/join` | Keep the code, then route | none | the shared message |
| → **Home `first-run`** | `/` · `../home/home.html?state=first-run` | (Home's) invite the partner | Share code | after Start |
| → **Home, "Hi, you two"** | `/` · `../home/home.html?state=joined-empty` | (Home's) | (Home's) | after Join |

**Merged:**
- "Check your email" is a step of Forgot password, not its own route. A reload or a URL must not resend, and the email typed shouldn't live in the URL.
- The three reset outcomes are views of one route, keyed by the token's state.

**Split:**
- Start and Join are separate forms (A2).

### Content priority (what the eye must hit, in order)

| Screen | Priority, in order |
|---|---|
| Sign in | 1. brand mark · 2. h1 "Sign in" · 3. Email and Password · 4. **Sign in** · 5. "Forgot password?" · 6. "New to Zamane? Create an account" |
| Create account | 1. mark · 2. h1 · 3. First name, Email, Password (with its rule shown up front) · 4. **Create account** · 5. "Have a code from your partner?" (A5) · 6. "Have an account? Sign in" · 7. the privacy line |
| Forgot password | 1. h1 · 2. one line: what will happen · 3. Email (carried) · 4. **Send reset link** · 5. Back to sign in |
| Check your email | 1. h1 "Check your email" · 2. "If there's a Zamane account for {email}, we've sent a link. It works once, for 1 hour." · 3. what to do if nothing arrives (spam, Send again) · 4. Back to sign in |
| Reset password | 1. h1 · 2. New password (rule up front, Show) · 3. **Set new password** · 4. "This signs you out on your other devices" note |
| Link doesn't work | 1. h1 · 2. why (in plain words, covering both expired and used) · 3. **Send a new link** · 4. Back to sign in |
| Password changed | 1. h1 "Password changed" · 2. "Sign in to Zamane with your new password." · 3. **Sign in** · 4. "You've been signed out on your other devices." · 5. the home-screen note (F4.9) |
| Setup choice | 1. h1 "Set up your space" · 2. the gloss: what a space is, one starts and one joins · 3. the two cards, equal · 4. "Signed up as {email}. Not right? Sign out…" (A7) |
| Start | 1. h1 · 2. Space name (prefilled) · 3. Currency (preselected, "can't change later") · 4. Time zone (inferred, folded) · 5. **Start our space** · 6. "Only one of you starts…" with the link to Join |
| Join | 1. h1 · 2. "Enter the code your partner shared. It looks like K7QM-4XPA." · 3. Code field · 4. **Join space** · 5. cross-link to Start |

---

## 2. Navigation model

**Chrome on every screen here:**
- a brand header (the lockup, `img alt="Zamane"`, not a link);
- the page h1;
- no app nav.

**Setup screens add an account line.** "Signed in as {firstName}" and a **Sign out** link-button sit in the header on phones and at the end of the column from 48 rem. A person with no space can't reach Profile, so this is the only way out of a wrong account, and the A7 recovery uses it.

**Up and back:**
- **Sign in ↔ Create account ↔ Forgot:** these are sibling links and *push* history, so Back returns. The email (and the A5 intent) travel with them (§6.7).
- **Start and Join:** a "‹ Back" link-button goes to `/setup` (`aria-label` "Back to set up your space", containing the visible "Back"). [WCAG 2.5.3] The cross-links *replace* rather than push, so Back always goes to `/setup`.
- **After a success, every exit replaces:** sign in, create account, reset and setup complete. Back from Home never lands on an auth or setup screen.

**Current location:**
- There's no nav, so nothing carries `aria-current`.
- Location is the h1 plus a **unique document title per screen and state**: "Sign in – Zamane", "Create your account – Zamane", "Reset your password – Zamane", "Check your email – Zamane", "Link doesn't work – Zamane", "Password changed – Zamane", "Set up your space – Zamane", "Start our space – Zamane", "Join with a code – Zamane". [WCAG 2.4.2]

**Help** [WCAG 3.2.6]:
- No help mechanism exists in v1.
- "Forgot password?" is the only self-help, and it sits in the same place on Sign in every time.
- If a "Trouble signing in?" contact is ever added, it goes at the foot of every screen here, in the same position.

### 2.1 Guards: what `GET /api/me` decides

**Response shape** (proposed; the architecture names the endpoint but not its body):
```
200 { user: { id, displayName, email }, space: null | { id, name, currency, timezone, slot, memberCount } }
401 { error: { code: "unauthenticated" } }
```

**Route classes.** Each is a TanStack layout route with `beforeLoad` calling `queryClient.ensureQueryData(meQuery)`.

| Route class | Routes | Signed out (`401`) | Signed in, no space | Signed in, with space |
|---|---|---|---|---|
| **public-only** | `/sign-in`, `/create-account`, `/forgot-password` | render | → `/setup` (replace), or `/setup/join` with the A5 intent | → `/` (replace), silently. Switching accounts is Profile → Sign out. |
| **token** | `/reset-password` | render | render + signed-in notice (F4.8) | render + signed-in notice |
| **invite** (Q2) | `/join#code=` | store the code → `/create-account` (with-code) | store the code → `/setup/join` (prefilled) | → `/`; then F10 |
| **setup** | `/setup`, `/setup/start`, `/setup/join` | → `/sign-in` (replace) | render | → `/` (replace); `/setup/join` is allowed for a solo member in switch mode (F9) |
| **app** | `/`, `/goals/*`, `/trips/*`, `/shopping`, `/profile` | → `/sign-in?redirect=<path>` (replace) | → `/setup` (replace); the target is dropped, since nothing exists to show | render. `/` is Home; Home decides first-run (`memberCount = 1`) or joined. |

**Failure while resolving:**

| `GET /api/me` result | Persisted cache present | No cache |
|---|---|---|
| network error or offline | open the cached app; revalidate on `online` and focus | **Launch offline** screen (F11) |
| `5xx` | open the cached app (Home's offline and error semantics) | **Launch error** screen with **Try again** |
| slow (> 1 s) | the cached app is already showing (stale-while-revalidate) | splash: the mark on `surface` (matches the manifest `background_color`), then a status line "Loading Zamane" after 1 s |

**Mid-session:**
- **Any API `401`** means the session was revoked (a reset elsewhere, or expiry). Go to `/sign-in?redirect=<path>` with the `session-ended` notice.
- **Any API `403 no_space`** goes to `/setup`. In v1 this is defensive.
- **Recommendation to the architect:** an *involuntary* `401` keeps the persisted cache and paused offline mutations (keyed by `userId`). They resume if the same user signs back in, and are cleared only if a different user does. §9 currently clears on logout, which is right for a chosen sign-out but would drop queued contributions on a revoked session.

**`?redirect=`:**
- Only a same-origin path that starts with `/` and not `//` is accepted.
- It's honoured only when the user turns out to have a space.
- In the URL it holds a path, never an email.

---

## 3. Flows

Notation: each happy path is a numbered list, followed by its unhappy paths. "Alert" means the form's permanent `role="alert"` slot at the top of the form (`#form-alert`, `notice-danger`, the form.js pattern). "Inline" means the error under the field (`.err`, `aria-invalid`, `aria-describedby`). Each unhappy path names its `?state=` key in brackets.

### F1 · Sign in (returning: "let me back in")
1. Sign in opens and focus goes to the h1. There's no autofocus on a field, so no keyboard covers the brand and "Create an account".
2. The password manager offers the saved login when the Email field is focused, or fills both fields on load.
3. Tap **Sign in**, or press Enter in either field.
4. The email is trimmed and lower-cased. The button shows "Signing in…" (`aria-disabled`), and a second tap is ignored.
5. `POST /api/auth/sign-in/email` returns `200`, then `GET /api/me` runs.
6. **Route:** with a space, to `redirect` or `/`. With no space, to `/setup`, or `/setup/join` with the A5 intent. Either way it's a replace.
7. Focus lands on the destination's h1, as the destination defines.

**Unhappy paths:**
- **Empty or malformed fields** [`invalid`]: inline errors. With two errors, the alert also says "2 fields need your attention." Focus goes to the first invalid field. Nothing is sent.
- **Wrong email or password** [`wrong`], from `401 INVALID_EMAIL_OR_PASSWORD`:
  - The alert says "That email and password don't match. Check them and try again, or reset your password." It contains a **Reset your password** link that carries the email.
  - Both values are kept, and the form isn't re-rendered (research R6: keeps managers working). Focus moves to Password with its content selected, so typing replaces it. Password's `aria-describedby` includes the alert.
  - The message never says which of the two is wrong.
- **Too many tries** [`rate-limited`], from `429 rate_limited`:
  - The alert says "Too many tries. Wait a minute, then try again."
  - The primary turns `aria-disabled`, described by the alert, for `Retry-After` seconds (60 by default). There's no ticking countdown.
  - When it re-enables, a polite announcement says "You can try again now." Input is kept.
- **Offline** [`offline`]:
  - A notice above the form says "You're offline. Signing in needs a connection." The primary is `aria-disabled` and described by it.
  - The fields stay usable. On `online`, the primary re-enables and "Back online. You can sign in now." is announced once.
- **Network failure while online** [`network-error`], from a fetch error or a 15 s timeout: the alert says "Couldn't reach Zamane. Check your connection and try again." Input is kept and focus stays on the primary.
- **Server error** [`server-error`], from a `5xx`: the alert says "Something went wrong on our side. Try again in a moment." Input is kept.
- **Arrived signed out by choice** [`signed-out`]: a polite status note "You're signed out." No email is prefilled.
- **Arrived after a revoked session** [`session-ended`]: a notice "You've been signed out. Sign in again to carry on." On success the person returns to `redirect`.
- **Arrived with the email carried** (from Create account "Sign in instead", or from Forgot) [`prefilled`]: Email is filled and focus goes to Password.
- **Arrived from Password changed** [`reset-done`]: the notice "Password changed. Sign in with your new password." The email isn't prefilled, because the reset ran in a new tab that doesn't know it. The password manager fills it. Focus goes to the h1.
- **A signed-in person opens `/sign-in`:** a silent replace (guards). There's no state to design.

### F2 · Create account (Sara, first minute)
1. Create account opens and focus goes to the h1. With a pending invite code [`with-code`, Q2], a notice reads "Create your account, then you'll join with code K7QM-4XPA."
2. **Fields:**
   - **First name** (helper: "As your partner will see it.");
   - **Email**;
   - **Password**, with its rule shown up front ("At least 10 characters.") and **Show**.
   - There's **no confirm-password field** (§6.7).
3. **Under the primary** come:
   - the A5 toggle, **Have a code from your partner?** [`has-code` when pressed];
   - "Have an account? ‹Sign in›";
   - one privacy line, "By creating an account you agree to how we handle your data. ‹Privacy›". It has no checkbox and nothing pre-ticked (research, GDPR). **The privacy page itself is out of scope and needs an owner.**
4. Validation runs on blur after typing and clears as soon as the value is valid.
5. **Create account** shows "Creating your account…". The email is trimmed and lower-cased (A7).
6. `POST /api/auth/sign-up/email {name, email, password}`. Better Auth signs the person in (autoSignIn), then `GET /api/me` returns `space: null`.
7. Replace to `/setup`, which shows "Signed up as {email}" (A7). With the A5 intent or a pending code, replace to `/setup/join` instead, which shows the same line.

**Unhappy paths:**
- **Invalid** [`invalid`]:
  - inline errors: name empty; email malformed; password under 10 or over 128 characters.
  - With two or more, the count alert. Focus goes to the first.
  - There's no `maxlength` on Password, which would silently truncate a pasted or generated password. Over 128 shows the error instead.
- **Email already has an account** [`email-taken`], from `422 USER_ALREADY_EXISTS` [VERIFY the exact code against Better Auth 1.7.18]:
  - This is the accepted leak (A6).
  - An inline error on Email: "That email already has an account."
  - It's followed by two links: **Sign in instead** (carries the email) and **Reset your password** (carries the email).
  - The password stays in the field but isn't carried anywhere.
  - Nothing more is revealed: no name, no "whose".
- **Too many tries** [`rate-limited`], **offline** [`offline`], **network error** [`network-error`] and **server error** [`server-error`]: as in F1, with the verb "Creating an account needs a connection."
- **Account created, but `GET /api/me` fails:** the person is signed in, so go to `/setup` anyway. Setup re-fetches `/api/me` and has its own error state. Never show "account failed" after a `200` from sign-up.
- **Mistyped email noticed afterwards** (on Setup): A7, Sign out and create again.

### F3 · Forgot password ("I can't remember it")
1. "Forgot password?" on Sign in opens `/forgot-password` with the email carried. Focus goes to the Email field, with its value kept.
2. **Send reset link** shows "Sending…".
3. `POST /api/auth/request-password-reset {email, redirectTo: "/reset-password"}`.
4. The step becomes **Check your email** (same route, a replace of the step, with a new document title). Focus goes to its h1.
   - Body: "If there's a Zamane account for **{email}**, we've sent a link to reset your password. It works once, for 1 hour."
   - Then: "Nothing yet? Check your spam folder, or send it again."
   - Secondary actions: **Send again** and **Use a different email** (back to the form, email kept and selected). The text link **Back to sign in** carries the email.
5. **Send again:**
   - It's available straight away but counts toward the rate limit.
   - On success, a polite status says "Sent again." [`resent`]
   - The copy never promises that an older link stops working [VERIFY whether Better Auth invalidates it].

**Unhappy paths:**
- **Malformed email** [`invalid`]: inline error, nothing sent.
- **The email has no account:** identical to success, on purpose (§6 no-enumeration; OWASP). The copy's "If there's a Zamane account" carries the honesty. Never "No account found".
- **Too many tries** [`rate-limited`]: as in F1, on the form or on Send again.
- **Offline** [`offline`], **network error** [`network-error`], **server error** [`server-error`]: as in F1. A `5xx` keeps the form and doesn't pretend the email was sent.
- **Reload on Check your email:** returns to the form with the email restored from session storage. Nothing is resent automatically.

### F4 · Reset password (from the email)
**Architect note.** Use Better Auth's own callback link (the `url` it passes to `sendResetPassword`, which is `/api/auth/reset-password/:token?callbackURL=/reset-password`). It checks the token *before* the page loads and redirects with `?token=…` or `?error=INVALID_TOKEN`. That way the page knows on arrival whether the link works, and nobody types a new password into a dead link.

**Expired vs used:** Better Auth deletes a token on use and reports an expired one the same way, so the client **can't tell "expired" from "used"** [VERIFY]. Research notes it would be acceptable to say which (the token proves possession, not existence). But with one signal, both render one view, **Link doesn't work**, whose copy covers both cases. The prototype keeps two keys (`expired`, `used`) that render the same view unless the architect confirms a distinction.

**The email is unknown here.** The link opens a new tab or a different browser, so nothing carried in session storage reaches it. So:
- no hidden username field (research: skip it);
- the password manager may save without a username, which is accepted;
- "Send a new link" asks for the email once.

1. **Arrival with a valid token** [`valid`, default]:
   - `history.replaceState` strips the token from the address bar. It's kept in memory and session storage, which survives a reload in the same tab.
   - Focus goes to the **New password** field (single task). Its rule shows up front, with **Show**.
   - A note under the field: "This signs you out on your other devices."
2. **Set new password** shows "Saving…", then `POST /api/auth/reset-password {newPassword, token}`.
3. **Success:**
   - Replace to the `success` view [`success`], with a new document title. Focus goes to its h1.
   - Content: h1 "Password changed"; "Sign in to Zamane with your new password."; the primary **Sign in** (→ `/sign-in` [`reset-done`]); "You've been signed out on your other devices." [research R9]
   - It never claims "you're in" (finding 2: Safari and the installed app don't share cookies).

**Unhappy paths:**
- **4.4 Invalid new password** [`invalid`]: inline errors (under 10, over 128). Focus goes to the field. The token isn't spent.
- **4.5 Link doesn't work on arrival** [`expired` / `used`], from `?error=INVALID_TOKEN`:
  - h1 "This link doesn't work any more".
  - Body: "Reset links work once, for 1 hour. Ask for a new one."
  - Primary **Send a new link** goes to `/forgot-password`, with the email empty and focused. Secondary: **Back to sign in**.
- **4.6 The token dies while the form is open** (over an hour, or used in another tab), from `400 INVALID_TOKEN` on submit:
  - The view switches to 4.5 and focus goes to its h1.
  - The typed password is discarded deliberately, never stored.
- **4.7 No token at all** (`/reset-password` typed by hand): render 4.5.
- **4.8 Signed in in this browser when the link opens** [`signed-in`]:
  - The form renders, plus a notice: "You're signed in as {firstName} here. Setting a new password signs you out here too."
  - On success, the client calls sign-out to clear this browser's cookie, because the 5-minute cookie cache would otherwise keep it alive. Then it shows `success`.
  - If the token belonged to the other account (the partner's link opened on this phone), the cost is one sign-in. That's accepted, because the client can't know whose token it is.
- **4.9 The home-screen seam** (iOS especially, research finding 2):
  - The link opens in the browser, not in the installed app.
  - So `success` adds one line under the primary: "Use Zamane from your home screen? Open it there and sign in."
  - The installed app gets a `401` once its session is revoked (within 5 minutes, the cookie cache) and lands on Sign in [`session-ended`]. No dead end either way.
- **4.10 Rate-limited** [`rate-limited`], **offline** [`offline`], **network error** [`network-error`], **server error** [`server-error`]: as in F1. The token is kept, so Try again works.

### F5 · Sign out → Sign in (the destination only; the control lives in Profile and in the setup header)
1. Sign out runs (`POST /api/auth/sign-out`). Then the client clears the query cache and the persisted client, closes the socket (§9), and clears the pending code, the A5 intent and the carried email.
2. Replace to `/sign-in` [`signed-out`]. Focus goes to the h1, and the status "You're signed out." is announced.
- **Offline:** Sign out is `aria-disabled` with the reason "Signing out needs a connection." The server session can't be revoked offline, and an httpOnly cookie can't be cleared by script.

### F6 · Set up your space: the choice
1. `/setup` opens and focus goes to the h1 "Set up your space".
   - The gloss under it: "Your shared place for goals, trips and shopping. One of you starts it; the other joins with a code."
2. Two equal cards (links), each a single tab stop, neither pre-selected:
   - **Start our space**: "I'm first. I'll invite my partner with a code. Only one of you starts."
   - **Join with a code**: "My partner already started. I have their code."
3. **Card order:** Start first, then Join (the chronological order of the couple's story). Equal size, weight and colour, with no majorelle primary.
4. **The A7 line under the cards:** "Signed up as **sara@example.com**. Not right? ‹Sign out› and create your account again." The email is `dir="ltr"` and wraps.
- **Skipped** with the A5 intent or a pending code: the person goes straight to Join.
- **Header:** "Signed in as Sara" and **Sign out** (F5).
- **Offline** [`offline`]: the cards still navigate (the forms show their own offline state). A slim notice says "You're offline. Setting up needs a connection."

### F7 · Start our space (Sara)
1. `/setup/start` opens and focus goes to the h1. The client generates the space id (UUID v7) **once per form session** and keeps it across retries, so a retry after a timeout is an idempotent replay (§5).
2. **Fields** (all prefilled, so the happy path is one tap):
   - **Space name:** prefilled with the Writer's default, built from the first name. Helper: "Only you two see this."
   - **Currency:** a radio group with at most three options, deduplicated: the currency of the browser locale's region (`fr-MA` → MAD), then MAD, then EUR, plus "Another currency…", which reveals a native `<select>` of ISO 4217 codes with names from `Intl.DisplayNames`. The inferred one is preselected (Q4). The fixed helper inside the fieldset says "You can't change this later."
   - **Time zone:** never asked [Tesler]. It's shown read-only from `Intl.DateTimeFormat().resolvedOptions().timeZone` as a city ("Casablanca") with "(from this phone)". **Change** is a disclosure that reveals a native `<select>` of `Intl.supportedValuesOf('timeZone')`.
3. **Start our space** shows "Starting…", then `POST /api/spaces {id, name, currency, timezone}`.
4. On `201`, or a `200` replay: invalidate `me`, then replace to `/`. Home renders `first-run`: "Hi, Sara" and the invite card with `K7QM-4XPA` and **Share code**. Home focuses its h1, and a polite announcement says "Your space is ready. Share the code with your partner." (Home owns the string.)
- **Directly under the primary:** "Only one of you starts. Partner already has a code? ‹Join with their code›" (replace to `/setup/join`). [research R2] Typed values are kept if they come back.

**Unhappy paths:**
- **Invalid** [`invalid`]: inline errors for an empty name or one over 120 characters. A missing currency is impossible, since one is preselected. If the browser returns no time zone, the `<select>` shows open and required.
- **Already in a space** [`already-in-space`], from `409 already_in_space` (proposed; today `UNIQUE(user_id)` would surface as a `5xx`):
  - Re-fetch `/api/me`. If there's now a space, replace to `/` with the notice "You're already in a space."
  - Never show an error for a create that, in effect, succeeded.
- **Offline** [`offline`]: the form works, and the primary is `aria-disabled` with "You're offline. Starting a space needs a connection." Back online re-enables it with one announcement.
- **Network error or timeout** [`network-error`]: the alert says "Couldn't reach Zamane. Try again." The retry uses the same id, so there's no duplicate space.
- **Server error** [`server-error`]: the alert, input kept.
- **Validation from the server** (`400 validation_failed` with `fields`): mapped to inline errors per field.

### F8 · Join with a code (Youssef)
1. `/setup/join` opens and focus goes to the **Invite code** field (single task; paste first).
   - The line above it: "Enter the code your partner shared. It looks like K7QM-4XPA."
   - With a pending code [`prefilled`], the field is filled and focus goes to **Join space** instead, so it's one tap.
2. **Input is forgiving** [Postel]. Anything can be typed or pasted, including the whole share message "Join me on Zamane. Use this code: K7QM-4XPA". §6.6 gives the normalisation.
   - On blur, and when a paste differed from the canonical form, the value is shown back as `XXXX-XXXX` (research R7).
   - **The typed value survives a trip to the chat app:** it's saved to session storage on input, and restored after a reload or a discarded tab (research risk 5).
3. **Join space** shows "Joining…", then `POST /api/spaces/join {code}` (normalised).
4. On `200`: invalidate `me`, clear the pending code, the intent and the saved input, then replace to `/`. Home shows "Hi, you two" (`joined-empty`, or `populated` if Sara already made things). A polite announcement says "You joined {partnerName}'s space." (Home owns it.)
   - **On Sara's phone**, Home's first-run should switch live to the joined state and announce "{partnerName} joined." That's a reconciliation item for Home and the architect: it needs a `space_member` change notice.
- **Cross-link at the end:** "No code yet? **Start our space**".

**Unhappy paths:**
- **Wrong shape** [`invalid`, `invalid-letters`], checked client side after normalising:
  - fewer or more than 8 characters: "Codes have 8 letters and numbers, like K7QM-4XPA."
  - a character outside the alphabet (0, O, 1, I, L or a symbol): "Codes don't use 0, O, 1, I or L. Check the code again."
  - Inline, focus kept, nothing sent, and it doesn't count toward the limit.
- **Code doesn't work** [`invite-invalid`], from `404 invite_invalid`:
  - One message for every cause (unknown code, rotated code, full space), with **no hint** of which: "That code didn't work. Check it with your partner, or ask them to share a new one."
  - Inline on the field, with the value kept and selected so it can be retyped. It counts toward the 5/min limit. No "tries left", because the API doesn't expose it.
- **Too many tries** [`rate-limited`], from `429` (5/min): the alert, with the primary disabled for `Retry-After` seconds, as in F1.
- **The response was lost but the join succeeded** (a retry after a timeout): today the second call returns `404 invite_invalid` (`ON CONFLICT DO NOTHING` → zero rows).
  - **Architect:** answer `200` when the caller is already a member of that code's space.
  - **Client safety net:** on any join failure, re-fetch `/api/me`. If there's a space, proceed as on success.
- **Already in another space** [`already-in-space`], from `409 already_in_space` (proposed; today the same `ON CONFLICT DO NOTHING` swallows the `UNIQUE(user_id)` conflict and returns `invite_invalid`, which would lie). On `/setup/join` this happens only when raced from another tab. The client re-fetches `/me`, then replaces to `/`. The recovery path is F9.
- **Offline** [`offline`], **network error** [`network-error`], **server error** [`server-error`]: as in F7. The code is kept.

### F9 · The joiner who accidentally started their own space (Q1)
Research and I agree this is the top risk. A2 and A5 are the prevention. This is the cure, which research lists only as "later" (a merge or leave tool, manual support in v1).

**Recommendation:** a scoped exception to D19, allowed only while the caller is the **only member** of their space. That's exactly the case D19's questions don't touch: no partner, no shared attribution.
1. **Where:** Home `first-run` (Home's invite card) gets a quiet secondary link under the code: "Got a code from your partner? **Join their space instead**". It's shown only while `memberCount = 1`.
2. It opens `/setup/join?switch` (the same form, h1 "Join your partner's space").
3. **Join space** opens a **confirmation** (`alertdialog`):
   - "Join with this code? The space you started will be deleted, with its {n} goals, {n} trips and {n} shopping items." Without content, it says only "The space you started will be deleted."
   - Buttons: **Keep my space** (focused first) · **Join and delete my space** (danger).
4. `POST /api/spaces/join {code, replaceSolo: true}`. In one transaction, the server re-checks that the caller is alone, deletes the solo space (cascade, plus Cloudinary cleanup in `waitUntil`) and joins. Then it lands on Home with "Hi, you two".
5. **Unhappy paths:**
   - `invite_invalid`: nothing is deleted, because the check runs before the delete.
   - The partner has since joined the solo space: `409`. The link disappears and "{partnerName} already joined your space." is shown.
   - **Both partners started a space:** either one uses this path.
6. **If Q1 is declined:** v1 support is manual (a database edit), and the instrumentation event `wrong_path_suspected` (research R13) is how such cases get found.

### F10 · Invite link (only if Q2 is accepted for v1)
1. Youssef taps the link in Sara's message, `/join#code=K7QM-4XPA`. The client reads the fragment, normalises it, stores `zamane.pendingInvite` (session storage) and strips the fragment with `replaceState`.
2. **Then by session:**
   - **Signed out:** replace to `/create-account` [`with-code`]. Its "Have an account? Sign in" keeps the code.
   - **Signed in, no space:** replace to `/setup/join` [`prefilled`].
   - **Signed in, with a space:** replace to `/`. If it's a solo space, Home shows F9's link with the code ready. Otherwise the notice says "You're already in a space with {partnerName}." and the code is dropped.
3. **Malformed fragment:** it's ignored. There's no error on a link the person didn't write.
4. **The seam:** a chat app opens the link in the browser, not the installed app (research finding 8). Youssef signs up and joins there. If he later installs to the home screen, he signs in once more (the password manager fills it). That's accepted, and it's the reason the link matters more than the context.

### F11 · Launch with no connection and no cache
- **Screen:** the mark, h1 "You're offline", body "Zamane needs a connection to open on this phone for the first time." and **Try again**.
- **Retry:** it also retries automatically on `online`, announced once.
- **Why not Sign in?** A signed-in person with no cache would be wrongly asked for a password.

### F12 · Long content and other cases
- **Long values:**
  - **Long email** ("Check your email", "Signed up as", "Signed in as"): `overflow-wrap:anywhere`, marked `dir="ltr"`, never truncated. It's the person's proof of where the link went and of A7.
  - **Long first name** (up to 120 by the Zod cap): wraps in "Signed in as …" and "Hi, …". The helper "As your partner will see it" keeps most names short.
  - **Long space name:** wraps in the field.
- **Translations:** allow about 40% expansion on buttons. Buttons are full-width and wrap, never truncate.
- **RTL:** the layout mirrors. The code, emails and password fields stay `dir="ltr"`. The Show button sits at the inline end.
- **Small screens:**
  - **At 320 × 568:** no horizontal scroll, and the primary is reachable with the keyboard open.
  - **At 375 × 667:** on Sign in, with no keyboard, "Create an account" shows without scrolling.

---

## 4. State matrix

**Prototype rule (as in Goals):** one query parameter per URL, `?state=<key>` before the hash route. For example `auth.html?state=wrong#/sign-in`. No `?state=` means the default (first key). Hand-offs link to `../home/home.html?state=first-run` and `?state=joined-empty`.

| Route | Keys (default first) |
|---|---|
| `#/launch` | `loading` · `signed-out` (→ sign-in) · `no-space` (→ setup) · `member` (→ Home link) · `cached-offline` (→ Home link, with a note) · `offline` (F11) · `error` |
| `#/sign-in` | `idle` · `prefilled` · `invalid` · `wrong` · `submitting` · `rate-limited` · `offline` · `network-error` · `server-error` · `signed-out` · `session-ended` · `reset-done` · `guard-member` (shows the redirect to Home) · `guard-no-space` (→ setup) |
| `#/create-account` | `idle` · `has-code` (A5 pressed) · `invalid` · `email-taken` · `submitting` · `rate-limited` · `offline` · `network-error` · `server-error` · `with-code` (Q2) |
| `#/forgot-password` | `idle` · `prefilled` · `invalid` · `submitting` · `sent` · `resent` · `rate-limited` · `offline` · `network-error` · `server-error` |
| `#/reset-password` | `valid` · `invalid` · `submitting` · `success` · `expired` · `used` (same view as `expired`) · `expired-on-submit` · `signed-in` · `rate-limited` · `offline` · `network-error` · `server-error` |
| `#/setup` | `choose` · `long-email` · `offline` · `guard-member` (→ Home) |
| `#/setup/start` | `idle` · `invalid` · `other-currency` · `timezone-change` · `submitting` · `already-in-space` · `offline` · `network-error` · `server-error` · `long-name` |
| `#/setup/join` | `idle` · `prefilled` · `restored` (input back after a reload) · `invalid` · `invalid-letters` · `invite-invalid` · `submitting` · `rate-limited` · `already-in-space` · `offline` · `network-error` · `server-error` · `switch` (F9, from Home) · `switch-confirm` |
| `#/join` (Q2) | `signed-out` (→ create-account with-code) · `no-space` (→ setup/join prefilled) · `member` (→ Home notice) |

**Per screen, by the standard state columns:**

| Screen | empty / first-run | loading | error | success | partial |
|---|---|---|---|---|---|
| Sign in | idle: fields empty; `prefilled` when the email is carried | `submitting`: button "Signing in…", `aria-disabled`, fields editable | `invalid` (inline) · `wrong` (alert, field-linked) · `rate-limited` · `offline` · `network-error` · `server-error` | replace → destination | `signed-out` / `session-ended` / `reset-done` notices |
| Create account | idle; `has-code`; `with-code` | `submitting` | `invalid` · `email-taken` (inline, with links) · `rate-limited` · `offline` · `network-error` · `server-error` | replace → `/setup` or `/setup/join` | account made but `/me` failed → `/setup` anyway |
| Forgot | idle; `prefilled` | `submitting` | `invalid` · `rate-limited` · `offline` · `network-error` · `server-error` | `sent` (and `resent`) | — |
| Reset | — | `submitting` | `invalid` · `expired`/`used` · `expired-on-submit` · `rate-limited` · `offline` · `network-error` · `server-error` | `success` | `signed-in` notice |
| Setup choice | `choose` (with the A7 email line) | splash while `/me` resolves | `offline` notice | — | `long-email` |
| Start | idle: all prefilled | `submitting` | `invalid` · `offline` · `network-error` · `server-error` · `already-in-space` (→ Home) | replace → Home `first-run` | `other-currency`, `timezone-change` (disclosures open) |
| Join | idle: empty; `prefilled`; `restored` | `submitting` | `invalid` · `invalid-letters` · `invite-invalid` · `rate-limited` · `offline` · `network-error` · `server-error` · `already-in-space` | replace → Home "Hi, you two" | `switch` / `switch-confirm` (F9) |
| Launch | — | `loading` (splash) | `offline` (F11) · `error` | redirect | `cached-offline` |

**Example data:**
- Sara: `sara@example.com`. Youssef: `youssef@example.com`. `long-email` uses `sara.benali.elidrissi+zamane@example.com`.
- The prototype password that "works" is any value of 10 or more characters, except the literal `wrong-password-1`, which triggers `wrong`.
- Code `K7QM-4XPA` works. Any other well-formed code gives `invite-invalid`.
- Space: "Sara's space" (the Writer's default), MAD, `Africa/Casablanca`.
- Every prefilled value is labelled with the example footnote, as in Goals.

---

## 5. Wireframes

Grayscale structure only. `[ ]` is a control, `( )` a radio, `‹ ›` a link, and `▸` a disclosure. "← primary" marks the one majorelle button.

### 5.1 Sign in
```
PHONE 390 · Sign in                       ≥48rem · Sign in (centred column, 24rem)
┌──────────────────────────────┐          ┌──────────────────────────────────────────────┐
│        [mark] Zamane         │ brand    │                [mark] Zamane                  │
│                              │          │        ┌──────────────────────────┐           │
│ H1 Sign in                   │          │        │ H1 Sign in               │ card,     │
│ ┌alert slot (empty)────────┐ │          │        │ ┌alert slot─────────────┐│ surface-  │
│ Email                        │          │        │ Email                    │ raised    │
│ [sara@example.com………………]   │          │        │ [……………………………………]       │           │
│ Password                     │          │        │ Password                 │           │
│ [••••••••••••    ][Show]     │          │        │ [••••••••    ][Show]     │           │
│            ‹Forgot password?›│          │        │      ‹Forgot password?›  │           │
│ [         Sign in          ] │← primary │        │ [       Sign in        ] │← primary  │
│ ──────────────────────────── │          │        └──────────────────────────┘           │
│ New to Zamane?               │          │        New to Zamane? ‹Create an account›     │
│ [     Create an account    ] │ secondary│                                               │
└──────────────────────────────┘          └──────────────────────────────────────────────┘
no nav · footnote (example data) at the foot  ≥64rem optional: brand pane (arch imagery + one line)
                                              at inline-start, form column at inline-end.
                                              The form column never exceeds 24rem.
WRONG: the alert reads "That email and password don't match… ‹Reset your password›";
       Password is focused with its content selected.
OFFLINE: a notice replaces the alert slot; [Sign in] is solid muted (aria-disabled).
RESET-DONE: a notice at the alert slot: "Password changed. Sign in with your new password."
```

### 5.2 Create account
```
PHONE 390 · Create account                ≥48rem · same column as 5.1
┌──────────────────────────────┐          ┌──────────────────────────────────────────────┐
│        [mark] Zamane         │          │                [mark] Zamane                  │
│ H1 Create your account       │          │        ┌ H1 Create your account ──┐           │
│ First name                   │          │        │ First name [……………]       │           │
│ [Sara……………………………………]        │          │        │ Email      [……………]       │           │
│ As your partner will see it. │ helper   │        │ Password   [……… ][Show]   │           │
│ Email                        │          │        │ At least 10 characters.  │           │
│ [sara@example.com………………]   │          │        │ [   Create account     ] │← primary  │
│ Password                     │          │        │ [Have a code from your   │ toggle    │
│ [••••••••••     ][Show]      │          │        │  partner?]               │           │
│ At least 10 characters.      │ helper,  │        └──────────────────────────┘           │
│ [      Create account      ] │← primary │        Have an account? ‹Sign in›             │
│ [Have a code from your       │ toggle   │        By creating an account… ‹Privacy›      │
│  partner?]                   │ (A5)     └──────────────────────────────────────────────┘
│ Have an account? ‹Sign in›   │
│ By creating an account you   │ caption
│ agree to… ‹Privacy›          │
└──────────────────────────────┘
HAS-CODE: the toggle becomes "✓ You'll enter your partner's code next. ‹Undo›" (aria-pressed=true).
EMAIL-TAKEN: under Email, "That email already has an account."
             ‹Sign in instead› ‹Reset your password› (both carry the email)
WITH-CODE (Q2): a notice above First name: "Create your account, then you'll join with code K7QM-4XPA."
```

### 5.3 Forgot password → Check your email
```
PHONE 390 · Forgot (form)                 PHONE 390 · Check your email (sent)
┌──────────────────────────────┐          ┌──────────────────────────────┐
│ ‹ Back to sign in            │          │        [mark] Zamane         │
│        [mark] Zamane         │          │ H1 Check your email          │
│ H1 Reset your password       │          │ If there's a Zamane account  │
│ We'll email you a link to    │          │ for sara@example.com, we've  │ email bold, dir=ltr,
│ set a new one.               │          │ sent a link. It works once,  │ wraps
│ Email                        │          │ for 1 hour.                  │
│ [sara@example.com………………]   │ carried  │ Nothing yet? Check spam, or: │
│ [     Send reset link      ] │← primary │ [        Send again        ] │ secondary
│                              │          │ ‹Use a different email›      │
└──────────────────────────────┘          │ ‹Back to sign in›            │
                                          └──────────────────────────────┘
≥48rem: both in the 24rem centred card of 5.1. "Check your email" has no primary.
```

### 5.4 Reset password: valid · link doesn't work · changed
```
PHONE 390 · Reset (valid)          PHONE 390 · Link doesn't work     PHONE 390 · Password changed
┌────────────────────────────┐     ┌────────────────────────────┐    ┌────────────────────────────┐
│       [mark] Zamane        │     │       [mark] Zamane        │    │       [mark] Zamane        │
│ ┌notice: signed in as Sara │     │ H1 This link doesn't work  │    │ H1 Password changed        │
│ │ (signed-in state only)─┐ │     │    any more                │    │ Sign in to Zamane with     │
│ H1 Set a new password      │     │ Reset links work once, for │    │ your new password.         │
│ New password               │     │ 1 hour. Ask for a new one. │    │ [         Sign in        ] │← primary
│ [••••••••••    ][Show]     │     │ [   Send a new link      ] │←   │ You've been signed out on  │
│ At least 10 characters.    │     │ ‹Back to sign in›          │    │ your other devices.        │
│ This signs you out on your │     └────────────────────────────┘    │ Use Zamane from your home  │
│ other devices.             │                                       │ screen? Open it there and  │
│ [  Set new password      ] │← primary                              │ sign in.                   │
└────────────────────────────┘                                       └────────────────────────────┘
≥48rem: each in the 24rem centred card. There's no hidden username field (the email is unknown here).
```

### 5.5 Set up your space (choice)
```
PHONE 390 · Setup choice                          ≥48rem · Setup choice (column 36rem; cards side by side ≥40rem)
┌──────────────────────────────┐                  ┌──────────────────────────────────────────────────────────┐
│ [mark] Zamane   Sara ‹Sign out›│ account line   │ [mark] Zamane                    Signed in as Sara ‹Sign out›│
│ H1 Set up your space         │                  │            H1 Set up your space                          │
│ Your shared place for goals, │ gloss            │   Your shared place for goals, trips and shopping.       │
│ trips and shopping. One of   │                  │   One of you starts it; the other joins with a code.     │
│ you starts it; the other     │                  │   ┌──────────────────────────┐ ┌──────────────────────────┐ │
│ joins with a code.           │                  │   │ Start our space        › │ │ Join with a code       › │ │
│ ┌──────────────────────────┐ │                  │   │ I'm first. I'll invite   │ │ My partner already       │ │
│ │ Start our space        › │ │ card = 1 link    │   │ my partner with a code.  │ │ started. I have their    │ │
│ │ I'm first. I'll invite my│ │ ≥ 72px tall      │   │ Only one of you starts.  │ │ code.                    │ │
│ │ partner with a code.     │ │                  │   └──────────────────────────┘ └──────────────────────────┘ │
│ │ Only one of you starts.  │ │                  │   Signed up as sara@example.com. Not right? ‹Sign out›…  │
│ └──────────────────────────┘ │                  └──────────────────────────────────────────────────────────┘
│ ┌──────────────────────────┐ │                    equal width, equal weight, none pre-selected, no primary
│ │ Join with a code       › │ │
│ │ My partner already       │ │
│ │ started. I have their    │ │
│ │ code.                    │ │
│ └──────────────────────────┘ │
│ Signed up as                 │ A7, caption
│ sara@example.com. Not right? │
│ ‹Sign out› and create your   │
│ account again.               │
└──────────────────────────────┘
OFFLINE: a slim notice under the gloss
```

### 5.6 Start our space
```
PHONE 390 · Start                                 ≥48rem · Start (column 24–28rem, form ends with primary)
┌──────────────────────────────┐                  ┌──────────────────────────────────────────────┐
│ ‹ Back          Sara ‹Sign out›│                │ ‹ Back               Signed in as Sara ‹Sign out›│
│ H1 Start our space           │                  │        H1 Start our space                     │
│ Space name                   │                  │        Space name [Sara's space………]          │
│ [Sara's space………………………]     │ prefilled        │        Currency                               │
│ Only you two see this.       │                  │        (•) MAD  Moroccan dirham               │
│ Currency  (fieldset)         │                  │        ( ) EUR  Euro                          │
│ (•) MAD  Moroccan dirham     │ preselected (Q4) │        ( ) Another currency…                  │
│ ( ) EUR  Euro                │                  │        You can't change this later.           │
│ ( ) Another currency…        │ → reveals select │        Time zone  Casablanca (from this       │
│ You can't change this later. │                  │                   phone)  ▸Change             │
│ Time zone                    │                  │        [      Start our space      ]          │← primary
│ Casablanca (from this phone) │                  │        Only one of you starts. Partner        │
│                    ▸ Change  │ disclosure       │        already has a code?                    │
│ [     Start our space      ] │← primary         │        ‹Join with their code›                 │
│ Only one of you starts.      │ wrong-path line  └──────────────────────────────────────────────┘
│ Partner already has a code?  │ (research R2)
│ ‹Join with their code›       │
└──────────────────────────────┘
OTHER-CURRENCY: a native <select> under the radios, focused when revealed.
TIMEZONE-CHANGE: a native <select> under the line, focused; the line updates on change.
```

### 5.7 Join with a code
```
PHONE 390 · Join                                  ≥48rem · Join (column 24rem)
┌──────────────────────────────┐                  ┌──────────────────────────────────────────────┐
│ ‹ Back       Youssef ‹Sign out›│                │ ‹ Back            Signed in as Youssef ‹Sign out›│
│ H1 Join with a code          │                  │        H1 Join with a code                    │
│ Enter the code your partner  │                  │        Enter the code your partner shared.    │
│ shared. It looks like        │                  │        It looks like K7QM-4XPA.               │
│ K7QM-4XPA.                   │                  │        Invite code                            │
│ Invite code                  │                  │        [ K7QM-4XPA            ]               │
│ [ K7QM-4XPA              ]   │ large, tabular,  │        You can paste the whole message.       │
│ You can paste the whole      │ letter-spaced,   │        [        Join space        ]           │← primary
│ message.                     │ dir=ltr          │        No code yet? ‹Start our space›         │
│ [        Join space        ] │← primary         └──────────────────────────────────────────────┘
│ No code yet? ‹Start our space›│
│ Signed up as youssef@…       │ A7 line (when arrived straight from sign-up)
└──────────────────────────────┘
INVITE-INVALID: under the field, "That code didn't work. Check it with your partner,
                or ask them to share a new one." Value kept and selected.
SWITCH (F9): H1 "Join your partner's space"; the primary opens the confirmation:
  ┌ alertdialog ───────────────────────────────┐
  │ Join with this code?                        │
  │ The space you started will be deleted,      │
  │ with its 1 goal.                            │
  │ [Keep my space]  [Join and delete my space] │ safe first and focused; danger second
  └─────────────────────────────────────────────┘
```

### 5.8 Launch
```
PHONE 390 · loading               PHONE 390 · offline (no cache)     ≥48rem: the same, centred
┌────────────────────────────┐    ┌────────────────────────────┐
│                            │    │       [mark] Zamane        │
│                            │    │ H1 You're offline          │
│        [mark] Zamane       │    │ Zamane needs a connection  │
│                            │    │ to open on this phone for  │
│   (after 1 s: "Loading     │    │ the first time.            │
│    Zamane", status)        │    │ [        Try again       ] │← primary
└────────────────────────────┘    └────────────────────────────┘
```

---

## 6. Interaction specs

### 6.1 Focus on arrival and after actions

| Arrival or event | Focus goes to | Announced |
|---|---|---|
| First load of the app (any route) | nothing is moved (document start) | — |
| Route change to Sign in, Create account, Setup choice, Start, Link doesn't work, Password changed, Check your email | the h1 (`tabindex="-1"`) | `document.title` |
| Sign in with the email carried (`prefilled`) | **Password** | title |
| Forgot password | **Email** (value kept, or empty from "Send a new link") | title |
| Reset password (valid) | **New password** | title |
| Join | **Invite code**; with a prefilled code, **Join space** | title |
| Client-side validation fails | the first invalid field | its inline error (via `aria-describedby`); with 2 or more errors, also the count alert |
| `wrong` | Password, content selected | the alert (`role="alert"`) |
| `email-taken`, `invite-invalid` | that field, content selected | its inline error (`role="alert"` on first appearance) |
| `rate-limited`, `network-error`, `server-error` | stays on the primary | the alert |
| Rate limit lifts | stays put | polite: "You can try again now." |
| Offline → online | stays put | polite, once, in this screen's words ("Back online. You can sign in now.") |
| "Have a code?" toggled (A5) | stays on the toggle | its new label is read (`aria-pressed` changes) |
| Disclosure (Another currency, Change time zone) opens | the revealed `<select>` | — |
| Disclosure closes | its toggle | — |
| Confirmation (F9) opens | **Keep my space** (safe) | the dialog name and description |
| Confirmation closes | the control that opened it | — |
| Success → Home | Home's h1 (Home's rule) | the polite hand-off line (Home owns it) |

### 6.2 Keyboard model

| Widget | Keys |
|---|---|
| Forms | A native `<form novalidate>` with a real `type=submit` button, handled on the `submit` event. Enter in any single-line field submits (`requestSubmit`). `enterkeyhint`: `next` on every field except the last, `go` on the last. Tab order equals visual order. |
| Show password | `<button type="button">` after the input, inside the field box. Visible "Show" or "Hide"; accessible name "Show password" or "Hide password", which contains the visible word [WCAG 2.5.3]; `aria-pressed`, and `aria-controls` the input. Enter or Space toggles. Focus stays on the button, and the caret position in the input is kept. On submit the input goes back to `type=password`, so browsers offer to save. It doesn't reset on blur. |
| "Have a code from your partner?" (A5) | `<button type="button" aria-pressed>`. Enter or Space toggles. The pressed label is "You'll enter your partner's code next", and **Undo** is the same button (the visible text changes and the name follows). |
| Choice cards (setup) | Each is one `<a>` (a stretched link over the card), so it's one Tab stop with Enter to activate. The card title is the link's text and the description is in `aria-describedby`. No arrow-key roving: they're links, not a radio group, so nothing can be pre-selected. |
| Currency | A native radio group in `fieldset` / `legend` "Currency". One Tab stop, arrows move and select (mirrored in RTL). "Another currency…" is a radio too: choosing it reveals the `<select>` (required) and focuses it. Choosing a listed currency again hides the select and keeps its value. The fixed helper is linked to the group with `aria-describedby`. |
| Time zone Change | A disclosure button with `aria-expanded` and `aria-controls`. Enter or Space toggles, and opening focuses the native `<select>`. It's the platform picker, so there's no custom listbox. |
| Invite code | One `<input type=text>`. No `maxlength`, and the value isn't rewritten while typing (§6.6); it's formatted on blur. Paste is never blocked. Enter submits. |
| Account line (setup) | "Signed in as Sara" is text. **Sign out** is a `link-btn` (44 px). No menu widget. |
| Back / cross-links | Plain links. Back is a real link to its parent, so it works with no JS history. |
| Confirmation (F9) | `role="alertdialog"`, labelled by the question and described by the consequence. Focus starts on **Keep my space**. Esc means keep. No backdrop dismissal. Tab is trapped (native `<dialog>`). Enter activates only the focused button. |
| Links inside alerts (`wrong`'s "Reset your password") | The link is a normal Tab stop inside the alert, before the fields. Because focus goes to Password, a keyboard user reaches it with Shift+Tab. The alert text names the route too. |

**Targets:**
- every control is ≥ 44 × 44 px; fields are 52 px tall (`zamane.css .field`); choice cards are ≥ 72 px;
- adjacent links have ≥ 8 px between them;
- "Forgot password?" is a 44 px `link-btn`.

**Drag:** nothing on these screens drags or swipes. [WCAG 2.5.7]

### 6.3 Errors: the shared pattern (from `goals/form.js`, applied unchanged)
- **Inline:**
  - The error sits under the field with an icon, and the field gets `aria-invalid="true"` and `.is-invalid`.
  - The field's `aria-describedby` lists only what is on screen: error, then helper.
  - Validation runs on blur only after the field was typed in, and clears as soon as the value is valid. The blur caused by pressing Back or a cross-link doesn't validate.
  - Errors never rely on colour alone: danger, an icon and text.
- **Count alert:** two or more invalid fields on submit put "{n} fields need your attention." in `#form-alert` (`role="alert"`), and focus goes to the first. The count clears silently once any field is fixed. This is the "error summary": forms here have at most three fields, so a linked list adds nothing.
- **Form-level errors** (`wrong`, `rate-limited`, `network-error`, `server-error`) use the same `#form-alert` slot. When the alert is about a specific field (`wrong`), that field's `aria-describedby` gains the alert id.
- **Input is never cleared by an error,** and the form isn't re-mounted (that keeps password managers working). [Postel, Norman] The one exception is a dead reset token (F4.6).
- **Error-code adapter:** Better Auth answers `{ code, message }`, and our Worker answers `{ error: { code, message, fields? } }`. `src/client/lib/api.ts` normalises both to `{ code, fields }` before the UI maps them:

| Source | Code | UI state |
|---|---|---|
| sign-in | `401 INVALID_EMAIL_OR_PASSWORD` | `wrong` |
| sign-up | `422 USER_ALREADY_EXISTS` [VERIFY] | `email-taken` (A6) |
| sign-up / reset | `400 PASSWORD_TOO_SHORT` · `PASSWORD_TOO_LONG` · `INVALID_EMAIL` | inline on that field (normally caught client side first) |
| reset | `400 INVALID_TOKEN` (or `?error=INVALID_TOKEN` on arrival) | `expired` / `used` → Link doesn't work |
| any | `429 rate_limited` + `Retry-After` | `rate-limited` |
| spaces | `400 validation_failed` + `fields` | inline per field |
| spaces | `409 already_in_space` (proposed) | re-check `/me` → Home |
| join | `404 invite_invalid` | `invite-invalid` |
| any | `5xx` | `server-error` |
| any | a fetch `TypeError`, or a 15 s timeout | `offline` if `navigator.onLine` is false, else `network-error` |

### 6.4 Feedback: what responds, and where [Norman]

| Action | Immediate | Then |
|---|---|---|
| Any submit | the button shows its pending label and `aria-disabled`, before the request (INP) | navigation (success) or the alert/inline (failure) |
| Show password | the field switches type and the button label flips | — |
| Paste a code | the field keeps what was pasted | normalised and shown back as `XXXX-XXXX` on blur or submit |
| Send reset link | pending label | the step changes to Check your email, focus on its h1 |
| Send again | pending label on that button | polite "Sent again." |
| Press an `aria-disabled` primary (offline, rate-limited) | nothing changes | its reason, already shown, is announced once more |
| Start or join succeeds | navigation | Home's announcement |

### 6.5 Destructive actions: undo or confirm

| Action | Mechanism | Why |
|---|---|---|
| Sign out (setup header, Profile) | none: immediate | nothing is lost; on a no-space account there's no data at all |
| Set new password (signs out other devices) | none, but the consequence is stated before pressing and again after | it's what the person asked for. A confirmation would slow down a recovery flow. |
| Join, deleting my solo space (F9) | **Confirm** (`alertdialog`), naming the counts | it deletes data, and there's no undelete. [DS: danger is always confirmed] |
| "Have a code?" (A5) | Undo on the same button | client-only flag |
| Use a different email (Check your email) | none | the email is kept and selected in the form |

### 6.6 What the system does for the user [Tesler]
- **The email travels** between Sign in, Create account and Forgot (§6.7). Nobody types it twice.
- **Emails** are trimmed and lower-cased on the client (A7). Better Auth also lower-cases them.
- **Invite-code normalisation**, the same function in `src/shared` on the client and the server:
  1. Uppercase, using NFKC so full-width characters work.
  2. If the raw input contains a run matching `[A-Z0-9]{4}[\s-]?[A-Z0-9]{4}` from the code alphabet, take the **last** such run. That's what makes pasting the whole share message work.
  3. Otherwise, remove every space, dash, dot and underscore.
  4. Valid when exactly 8 characters remain, all from `23456789ABCDEFGHJKMNPQRSTUVWXYZ`.
  5. Shown as `XXXX-XXXX` **on blur and on paste**, not while typing (§8, disagreement 3).
- **Start prefills everything:**
  - the name (from the first name);
  - the currency (the locale's region, then MAD, then EUR);
  - the time zone (the browser's, never asked).
  - The client space id is generated once per form session, so retries are safe.
- **Sign-up signs the person in** (autoSignIn). There's no second sign-in step.
- **The A5 intent or a pending code** skips the choice and opens Join.
- **Rate limits:** the primary re-enables by itself when the wait ends.
- **Caps Lock hint** (keyboards with modifier state): on password fields, a helper line "Caps Lock is on" appears while it is on, with no announcement on every key.

### 6.7 WCAG 3.3.7 Redundant Entry: the rules
1. **The email typed on Sign in carries to Forgot password, Create account, and back.** The same holds from Create account to Sign in ("Sign in instead"), and from Forgot and Check your email back to Sign in.
2. **Storage:** `sessionStorage['zamane.auth.email']`, in the router's memory first. **Never** in the URL. It's cleared on successful sign-in and on sign-out.
3. **The reset page is a new tab,** so the email doesn't reach it. "Send a new link" asks for it once. 3.3.7 covers one process in one session, and a new tab opened from an email is a fresh start.
4. **The A5 intent and a pending invite code** carry through Create account and Sign in into Join, and are cleared on a successful join or on sign-out.
5. **The code typed into Join** is kept in session storage on input, so a trip to the chat app or a reload doesn't lose it. It's also kept after an error.
6. **Start form values** are kept when the person uses the cross-link to Join and comes back (in memory, never persisted).
7. **No field asks for something already given:**
   - no confirm-password and no confirm-email (the show toggle and A7's show-back replace them);
   - the name typed at sign-up feeds the space-name default;
   - the time zone is never asked.
8. **Passwords are never carried, stored or prefilled by the app.** Password managers do that.

### 6.8 WCAG 3.3.8 Accessible Authentication (Minimum): the rules
1. **No cognitive test** at any step: no CAPTCHA, no puzzle, no "type these characters", no security questions. Rate limiting is the brute-force defence (D26). If abuse control is ever needed, it has to be invisible.
2. **Paste works in every field:** email, password, new password and invite code. No `onpaste` blocking, no `maxlength` on passwords, and no split one-character code boxes.
3. **Password managers work:**
   - real `<form>` elements with a submit button, handled on `submit`;
   - each field has a stable `id` and `name`, a visible `<label>`, and the `autocomplete` tokens in §6.9;
   - no hidden email field, and no email-first two-step flow;
   - separate sign-in and sign-up routes;
   - a route change after success, so managers offer to save;
   - errors re-render in place.
4. **Show password** on every password field (§6.2), so it can be checked instead of recalled.
5. **No timeouts on the forms themselves.** A reset link's 1-hour life is stated up front and recovered in one tap (Send a new link). [WCAG 2.2.1]
6. **The invite code isn't a cognitive test:**
   - it can be pasted;
   - it's normalised (case, spaces and dashes);
   - its alphabet has no look-alikes;
   - it arrives in a message the person can copy from.
7. **A manual typing path always works,** whatever the manager does in a home-screen app on iOS. That's an unverified risk (research), to test on a real iPhone.

### 6.9 `autocomplete` and input attributes per field
Matches research's "Form structure" token set, except where noted.

| Screen | Field | `type` | `autocomplete` | Other |
|---|---|---|---|---|
| Sign in | Email | `email` | `username` | `autocapitalize="none"`, `spellcheck="false"`, `enterkeyhint="next"`, `dir="ltr"`, 16 px+ text |
| Sign in | Password | `password` | `current-password` | `enterkeyhint="go"`, no `maxlength`, `dir="ltr"` |
| Create account | First name | `text` | `given-name` | `autocapitalize="words"`, `enterkeyhint="next"` |
| Create account | Email | `email` | `email` | as Sign in. Lets the browser offer the person's own address, and the manager pairs it with the following `new-password` on save. Research allows either `email` or `username`. |
| Create account | Password | `password` | `new-password` | `passwordrules="minlength: 10; maxlength: 128;"` (test the syntax on an iPhone), no `minlength`/`maxlength` attributes, `enterkeyhint="go"` |
| Forgot | Email | `email` | `username` | so the manager suggests the saved account address |
| Reset | New password | `password` | `new-password` | `passwordrules` as above, `enterkeyhint="go"`. No hidden username (the email is unknown). |
| Start | Space name | `text` | `off` | `autocapitalize="sentences"`, `enterkeyhint="next"` |
| Start | Currency, Time zone | radios + `<select>` | `off` | — |
| Join | Invite code | `text` | `off` | `autocapitalize="characters"`, `autocorrect="off"`, `spellcheck="false"`, `inputmode="text"`, `enterkeyhint="go"`, `dir="ltr"`. **Never `one-time-code`**: it would make iOS and Android offer SMS codes. Research agrees. |

`autocomplete="off"` is used only on non-credential fields. [research R6]

### 6.10 Announcements and semantics
- **Headings:** one h1 per screen. The choice cards' titles are part of their links and aren't headings.
- **Live regions:** one polite page region (`#live`, the shared layer's) carries status messages: "Sent again.", "You can try again now.", "Back online…", "You're signed out.". Errors use `#form-alert` (`role="alert"`) or the inline `role="alert"` on first appearance. Nothing is announced on load except the route's title.
- **The brand lockup** is `<img alt="Zamane">` in a `<header>`, not a link. On the splash it's `alt=""` inside a region labelled "Loading Zamane" with `aria-busy="true"`.
- **The invite code and emails** are `dir="ltr"` wherever they appear.
- **Pending buttons** keep their accessible name in step with their visible label ("Signing in…"). `aria-disabled` keeps them focusable.
- **Language:** `lang="en"` on `<html>`; i18n-ready, with no string concatenation (Home's rules).

### 6.11 Motion
- No transitions between auth screens beyond the shared route fade (none under reduced motion).
- The Check your email step swaps in place without motion.
- The disclosures open instantly. Their chevron rotates (`--dur-mark`), and not at all under reduced motion.
- No spinners. Pending is the button label. The splash shows only the mark, plus a status line after 1 s.

---

## 7. Questions for the user (each has a recommended answer)

1. **A joiner who started their own space by mistake: should they be able to switch?** Today they're stuck, since one space per person and leaving is disabled (D19).
   **Recommended: yes, but only while they're alone in their space.** Home's invite card offers "Join their space instead". It confirms, then deletes the solo space and its contents and joins (F9). This needs a small API addition (`replaceSolo` on join) and a scoped exception to D19. Without it, v1 recovery is a manual database edit.
2. **Invite link in v1 or v1.1?** Home's share text has no way to reach the app ("Join me on Zamane. Use this code: {code}").
   **Recommended: v1.** Send "Join me on Zamane: https://…/join#code=K7QM-4XPA", with the code still in the text. It's client-only, and it puts the joiner straight on the Join path, which the research calls the category norm and the biggest wrong-path fix. Research recommends v1.1 (R8). If you defer it, nothing else in this spec changes.
3. **What should a signed-out person see first: Sign in, or a welcome screen with "Create account / Sign in"?**
   **Recommended: Sign in directly**, with "Create an account" visible without scrolling (A1). Returning sign-ins outnumber sign-ups, and the brief's returning job is one tap.
4. **Currency at space creation: preselect the phone's currency, or make Sara pick one explicitly?** It can't be changed later in v1.
   **Recommended: preselect** the currency inferred from the phone's region (MAD on a Moroccan phone), with "You can't change this later" beside the choice. Research agrees ("show the pick only as a confirm"). That's one tap for the common case, and the warning sits where the decision is made.

---

## 8. Reconciliation with `research.md`

### Taken from research
| Item | Where |
|---|---|
| R1: two equal cards, role-based wording, none pre-selected, a gloss of "space" | A2, F6, 5.5 |
| R2: "Only one of you starts" line, inline with no modal | A2, F6 card, F7 under the primary, 5.6 |
| R3: "Have a code from your partner?" on Create account → Join | A5, F2, 5.2 |
| R4: route by `/me`; "already in a space" → Home with a notice | §2.1, F7, F8 |
| R5–R6: token set, `passwordrules`, a real form, no hidden email field, no clearing on error | §6.8, §6.9, §6.3 |
| R9 / finding 2: reset success sends to Sign in, says "Sign in to Zamane", states other devices were signed out, never "you're in" | F4.3, 5.4 |
| R10: unified messages (mismatch, code, rate limit) | F1, F8 |
| R11: trim and lower-case, show the email back after sign-up | A7, F6, 5.5 |
| R12: accepted sign-up enumeration leak, recorded as a decision | A6 |
| Risk 5: keep the join input across the chat-app switch | F8.2, §6.7 |
| No hidden username on reset (the email is unknown) | F4, §6.9; this replaces my first draft's "hidden username when known" |
| GDPR: one privacy line on Create account, nothing pre-ticked | F2.3, 5.2 |

### Where I differ, and why
1. **The invite link: v1, not v1.1 (Q2).** It's client-only by research's own account, and it's the strongest fix for research's top risk. It's left to the user, and nothing else depends on it. I also prefer `#code=` to `?code=`, so the code stays out of server logs and link-preview fetches. That's an implementation detail.
2. **"Have a code?" is a toggle, not a navigating link** (A5). Joining needs an account first, so a link would only leave the form. The toggle records intent, and sign-up then lands on Join. The outcome is the same as R3.
3. **The dash isn't auto-inserted while typing** (R7 asks for it). Rewriting the value mid-typing moves the caret, breaks backspace over the dash and fights IMEs and screen readers. The code is shown back as `XXXX-XXXX` on blur and on paste, which gives R7's "show the formatted code back" without those costs.
4. **The time zone has a folded "Change"** where research says "never asked". It's still never asked, since the default is used without a tap. The disclosure exists only for the rare creator who is travelling, because it can't be changed later.
5. **Expired vs used** can't be told apart by the API [VERIFY], so the copy is one message. That stays within research's "acceptable to say which".

### Still to test (research's list, plus mine)
- Password-manager save and fill in the installed app on iOS and Android, including after a reset.
- Whether people return to the installed app after a browser reset (F4.9).
- Joiners arriving cold choosing Join (A2), as research's assumption 1 (3 of 3).

---

## 9. For other roles

### For the architect (none blocks the prototype; defaults in brackets)
1. **`GET /api/me` body** as in §2.1, including `space.memberCount`.
2. **The reset link uses Better Auth's callback URL**, so the token is checked on arrival (F4). Expired and used can't be told apart; confirm. [Default: one "Link doesn't work" view.]
3. **Join idempotency:** answer `200` when the caller is already a member of that code's space. Today a retried join returns `404 invite_invalid` (F8).
4. **`409 already_in_space`** for create and join. Today `UNIQUE(user_id)` surfaces as a `5xx` on create, and as `invite_invalid` on join because of `ON CONFLICT DO NOTHING`, which would lie to the user.
5. **`replaceSolo` on join and the D19 exception**, if Q1 is accepted (F9).
6. **An involuntary `401`** keeps the persisted cache and the paused mutations for the same user (§2.1).
7. **`429` responses carry `Retry-After`** (seconds) and the code `rate_limited`.
8. **Record A6** (the accepted sign-up enumeration leak, with 10/min as the control) in the decision log, and confirm Better Auth 1.7.18's duplicate-email response (`422 USER_ALREADY_EXISTS`).
9. **A realtime notice when a member joins**, so Sara's first-run Home updates to "Hi, you two" (F8.4).
10. **The reset page:** the token is stripped from the URL on arrival, there are no third-party resources other than fonts, and the referrer policy is `strict-origin-when-cross-origin` or stricter.
11. **A7's lockout risk:** there's no email change in the API. Log it as known, or add email to `PATCH /api/me` later.

### For the Writer
- Every string here is working copy. Research's enumeration-safe strings are the baseline.
- **Needed:**
  - the space-name default;
  - the `form.error.count` plural (shared with Goals);
  - the A5 toggle labels;
  - the A7 show-back line;
  - the privacy line;
  - the hand-off announcements on Home;
  - F9's confirmation with plural counts;
  - the home-screen line on Password changed.
- **Home's "It works once"** is effectively true: a code stops working once the space is full, and it can be rotated. If Q2 is accepted, update `home.firstRun.share.message`.

### For Home
- **Hand-off states:** after Start, Home shows `first-run`; after Join, it shows `joined-empty` (or `populated`).
- **The live switch** from first-run to joined when the partner joins.
- **F9's link** under the invite code while `memberCount = 1` (if Q1 is accepted).

### For the builders
- **Reuse:** `goals/zamane.css` (`.field`, `.help`, `.err`, `.notice`, `.notice-danger`, `.btn-primary`/`.btn-sec`/`.btn-block`, `.link-btn`, `.vh`). Use form.js's validation and alert functions as the model: `validate`, `setError`, `describe`, `validateAll`, `setAlert`.
- **Don't reuse** the dock or the task header (A8).
- **One query parameter per URL** (§4).
- **The prototype simulates:**
  - latency, about 450 ms;
  - `Retry-After`, shortened to 10 s so it can be seen;
  - the browser time zone, fixed to `Africa/Casablanca`;
  - the locale region, fixed to `MA`.
- **Privacy:** the prototype's ‹Privacy› link goes to `#` with the footnote "Privacy page not designed yet".
