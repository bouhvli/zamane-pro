# Build notes: account screens (signed out), direction C · Two seats

**By:** Front-end (account screens) · Tue 10 Nov 2026
**Scope:** `#/sign-in`, `#/create-account`, `#/forgot-password` (form + Check your email), `#/reset-password` (valid · Link doesn't work · Password changed), plus `email-reset.html`.

## Files
| File | What |
|---|---|
| `auth/account.js` | The four views and a `#/privacy` placeholder. Registered with `A.view`, built only on `window.A`. All strings are from `copy.md`, held verbatim in one `C` object at the top. |
| `auth/account.css` | Screen styles only. Uses tokens; adds `--btn-h-lg: 52px` and `--btn-h: 44px` (layout). |
| `auth/email-reset.html` | A standalone rendering of the reset email (`email.reset.*`). Light only, inline styles, no tables. |
| `auth/build-notes/account.md` | This file. |

Nothing else was touched: not `auth-shared.js`, `auth.css`, `auth.html`, `../goals`, `../home`, `setup.*`.

## How to run
- **Open the app:** `auth.html#/sign-in` over `file://` (no server). Any state is `auth.html?state=<key>#/<route>`.
- **Prototype rules:**
  - Any password of 10 or more characters works.
  - `wrong-password-1` gives `wrong`. On Sign in, so does any password under 10 characters (the server would say "don't match").
- **A fixture applies to the first load only.** After that the screen behaves normally, so a retry works (`network-error`, then submit again, and you're through).
- **`offline`:** lifts on the window `online` event (DevTools network toggle, or `A.simulateOnline()` in the console). A real `offline` event also drops any screen into the offline state.
- **The email**, once typed, is kept in `sessionStorage` (`A.carry 'email'`). With no `?state=`, a reload restores it. An explicit fixture resets it, so fixtures are deterministic.

## States: every key from ia.md §4
| Route | Keys | How they're shown |
|---|---|---|
| `#/sign-in` | `idle` `prefilled` `invalid` `wrong` `submitting` `rate-limited` `offline` `network-error` `server-error` `signed-out` `session-ended` `reset-done` `guard-member` `guard-no-space` | **`invalid`:** a malformed email plus an empty password, which gives 2 inline errors and the count alert.<br>**`wrong`:** the alert with its *reset your password* link; Password focused and selected, and described by the alert.<br>**Guards:** "Taking you there…", then after 1.5 s a replace to `../home/home.html` or `#/setup`. |
| `#/create-account` | `idle` `has-code` `invalid` `email-taken` `submitting` `rate-limited` `offline` `network-error` `server-error` `with-code` | **`invalid`:** 3 errors and "3 fields need your attention."<br>**`email-taken`:** an inline `role="alert"` with *Sign in instead* and *reset your password* (both carry the email); Email focused and selected. |
| `#/forgot-password` | `idle` `prefilled` `invalid` `submitting` `sent` `resent` `rate-limited` `offline` `network-error` `server-error` | **`sent` / `resent`:** the Check your email step. **`resent`** shows "Sent again." under Send again. |
| `#/reset-password` | `valid` `invalid` `submitting` `success` `expired` `used` `expired-on-submit` `signed-in` `rate-limited` `offline` `network-error` `server-error` | **`expired` and `used`:** one view, Link doesn't work.<br>**`expired-on-submit`:** the form, whose token dies on submit. It switches to Link doesn't work, focuses its h1 and announces "This link doesn't work any more."; the typed password is discarded. |

## Hand-offs
- **Sign in success:**
  - `A.go('#/setup', {replace:true})` by default.
  - `#/setup/join` with the A5 intent or a pending code.
  - From `session-ended`, `location.replace('../home/home.html')`, because the person had a space and returns to where they were (F1).
- **Create account success:** `#/setup`, or `#/setup/join` with the intent or a pending code. Both are replaces.
- **Password changed → Sign in:** `<a href="#/sign-in" data-state="reset-done" data-replace>`.
- **Link doesn't work → Send a new link:** clears the carried email first, so Forgot opens empty and focused (F4.5).

## Decisions
- **Focus (§6.1).**
  - A first load with no fixture moves nothing.
  - An in-app arrival follows the table:
    - Sign in goes to the h1, or to Password when the email is carried;
    - Create account, Check your email, Link doesn't work and Password changed go to the h1;
    - Forgot goes to Email.
  - Reset `valid` always focuses New password, because the email link is always a first load.
  - A fixture for a non-default state applies that state's rule on first load, so the state can be checked by keyboard.
- **Show/Hide** is the shared toggle: the label and name change together, with no `aria-pressed` (Director ruling).
- **The A5 toggle** is a `btn-sec` under the primary.
  - **Off:** "Have a code from your partner?"
  - **On:** "✓ You'll enter your partner's code next. Undo", with the check `aria-hidden`. The name equals the text, and there's no `aria-pressed`.
  - Each press also sends one polite `A.say` with the new sentence, because a name change on a focused button isn't reliably read.
  - It's hidden under `with-code`, because a code is already pending.
- **The seat (direction C)** is a 32 px neutral seat inside the First name `<label>`, at its end. It's `aria-hidden`, so it doesn't enter the name.
  - The initial updates on `input` via `A.initial` (graphemes), with no animation.
  - It's dashed when empty and never shows "?".
  - There are no seats on Sign in, Forgot or Reset.
- **"New to Zamane? Create an account"** is one string. The link is styled as a full-width secondary button below 48 rem and as an inline link from 48 rem (copy.md note).
- **Forgot's "Back to sign in"** is a link after the form, not in the header. `A.header({back})` would replace the lockup, and direction C keeps the lockup heading every signed-out screen. The IA ranks Back last on that screen (content priority 5).
- **Check your email:** Send again sits in its own `<form id="fs">`, so the shared alert slot and rate limit work there too. "Use a different email" is a `<button>` (it stays on the route); "Back to sign in" is a link.
- **Server errors on a field** (`email-taken`) clear `data-touched`. Otherwise the shared blur validation would wipe the error and its links when the person tabs to *Sign in instead*. The error clears once the email is edited.
- **Rate limit:** 60 s, with the primary described by the alert. On lift, the alert clears and "You can try again now." is announced (shared). If the screen is offline by then, the primary is disabled again with the offline reason.
- **Inputs:**
  - `autocomplete`, `enterkeyhint`, `dir="ltr"`, `autocapitalize` and `spellcheck` follow §6.9.
  - `passwordrules` is on the new-password fields only.
  - No `maxlength` or `minlength` on passwords; over 128 shows the error.
  - `required` is set and the form is `novalidate`.
  - The Caps Lock line is added to the description while it's on, and isn't announced per key.
- **Long values:** emails use `overflow-wrap:anywhere` and `dir="ltr"`. Full-width buttons wrap instead of truncating, with a min-height of 52 or 44 px.

## Deviations (and why)
1. **The footnote uses copy.md's `auth.example`** ("Example data. The names, email addresses and code on this screen are made up.") through `A.footnote()`, not the shared `A.FOOTNOTE`. Copy is binding. It shows on every account screen, including ones with no example data yet.
2. **`#/privacy`** is a placeholder view, because decision.md says the link goes to a placeholder page. Its strings are not in copy.md: h1 "Not in this prototype" (the Goals precedent), then "The privacy page isn't written yet." and a link back. The Writer should replace them, or the route can be dropped.
3. **Primary hover** darkens to `--majorelle-ink`. The design system's Button has no hover spec, so this is proposed.
4. **The reset token** isn't simulated. There's no `?token=` in the prototype, so the `replaceState` strip from F4.1 isn't built.
5. **Natural triggers:** only `wrong` and `invalid` happen from input. `email-taken`, `rate-limited`, `network-error` and `server-error` are fixtures.
6. **`email-reset.html`:**
   - The colours are the design system's light hex values written inline, because email clients ignore custom properties.
   - The logo is the SVG; production needs a PNG.
   - The button goes to `auth.html#/reset-password` so the prototype works, while the fallback shows an example production URL (`https://zamane.example/...`). In production both carry the same `{resetUrl}`.
   - The plain-text sign-off "Zamane" is left out, because it isn't in the HTML string list.

## Shared-layer requests (implemented locally for now)
1. **`A.FOOTNOTE`:** set it to copy.md `auth.example`, so setup and account screens match.
2. **`A.rateLimit(btn, ms, onLift, reasonId)`:** let it take the alert id as the `aria-describedby` reason. Today `account.js` sets it after the call.
3. **`A.disable` / `A.enable`:** track reasons as a set (offline + rate-limited). `A.enable` currently clears every reason, so `account.js` re-disables in `onLift` while offline.
4. **`A.field`:** add a `labelAside` slot that renders outside `<label>`, for the seat. It works inside the label (it's `aria-hidden`, so it's excluded from the name), but outside would be cleaner.
5. **`A.wireForm`:** let a server-set error survive blur until the next input. That would replace the local `delete input.dataset.touched`.
6. **`.alt-links .link-btn`** has 4 px inline padding, so a link starting a line sits 4 px in from the text edge. `account.css` offsets the first child.
7. **`A.header({back})` drops the lockup.** If a screen ever needs both, add an option.

## Verification
- **Screenshots:** all 46 account states at 320×568, 390×844 and 1440×900, light and dark (276 PNGs). They're in `auth/screenshots/<route>-<key>/<size>-<scheme>.png`. Looked at: Sign in idle, wrong, offline, rate-limited; Create idle, invalid, email-taken, has-code, with-code; Forgot idle, sent, resent; Reset signed-in, expired, success. Fixed after looking:
  - the A5 check icon detached from its wrapped label at 320;
  - link-buttons were 4 px off the column edge.
- **Email:** `auth/screenshots/email-reset/320x568-light.png` and `1440x900-light.png`.
- **Automated pass:** no console errors and no horizontal scroll at 320 for any state.
- **Playwright checks: 296 passed, 0 failed.** They cover:
  - tab order and names on Sign in;
  - Show/Hide (no `aria-pressed`, type and label);
  - the count alert and first-invalid focus;
  - the `wrong` alert, its link to the field and the selection;
  - trim and lower-case;
  - pending labels and `aria-disabled`;
  - replace hand-offs;
  - the email carry Sign in → Forgot → sent → different email → Sign in, with focus at each step, and Back;
  - the seat (empty, dashed, initial);
  - the A5 toggle by Enter and Space, with focus kept, intent set and `#/setup/join`;
  - `email-taken`'s links surviving blur;
  - offline: reason announced on press, nothing sent, the `online` event re-enables and announces, the `offline` event disables;
  - `rate-limited` described by its alert;
  - reset descriptions, success, `reset-done` and dead-on-submit;
  - per state: one h1, every input labelled, no dangling `aria-describedby`, targets ≥ 24 px, no `aria-pressed`;
  - the guard redirect.

## Open items
- **Screen readers:** not run. Verify the A5 polite announcement isn't read twice alongside the name change (NVDA, VoiceOver).
- **Not checked on real devices:**
  - Caps Lock detection;
  - `passwordrules` on an iPhone;
  - password-manager save and fill.
- **For setup:** the normalised email stays in `A.carry 'email'` after Create account, so "Signed up as {email}" (A7) can read it. It's cleared on a successful sign-in (§6.7.2), so after Sign in setup falls back to the example email.
- **Copy for the Writer:** the `#/privacy` placeholder strings (deviation 2).
