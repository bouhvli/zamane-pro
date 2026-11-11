# Build notes: Zamane auth and space setup (direction C · Two seats)

**Open:** `auth.html?state=<key>#/<route>` (one query parameter, before the hash). The state keys are listed in `ia.md` §4.

## Files
| File | Owner | What |
|---|---|---|
| `auth.html` | Director | The shell: header slot, `#view`, `#live`, `#confirm` alertdialog |
| `auth-shared.js` · `auth.css` | Director | `window.A`: router and fixtures, seats, field/error helpers, rate limit, offline, confirm, carry storage. Shell and seat styles. Tokens and base come from `../goals/zamane.css`, linked rather than copied. |
| `account.js` · `account.css` | Front-end (account) | `#/sign-in`, `#/create-account`, `#/forgot-password`, `#/reset-password`, plus a `#/privacy` placeholder. Notes in `build-notes/account.md`. |
| `email-reset.html` | Front-end (account) | The password-reset email rendered |
| `setup.js` · `setup.css` | Front-end (setup) | `#/setup`, `#/setup/start`, `#/setup/join` (with switch mode), `#/join`, `#/launch`. Notes in `build-notes/setup.md`. |

**Verification:**
- **Engineers' self-checks:** Playwright ran 296 checks on the account screens and 137 on setup, with 0 failures and no console errors. Every state was screenshotted in `screenshots/` at 320, 390 and 1440 px, light and dark.
- **No independent review:** at the user's request (10 Nov 2026), the Critic and Accessibility reviews and the fix rounds were not run.

## Open items
1. **The two halves disagree on two rules.** Pick one rule for each:
   - **Redirects to Home:**
     - account's `guard-member` goes to Home after 1.5 s with "Taking you there…", a string not in `copy.md`;
     - setup's six redirect-to-Home states stay on a splash with a labelled "Prototype" box and a link.
   - **Rate-limit wait:** 60 s on the account screens, 10 s on setup.
2. **Copy:** the Writer needs to supply or approve these strings:
   - `#/privacy` placeholder strings;
   - "Back to Home" (the switch Back link);
   - the time-zone line after a change;
   - the currency name: Intl gives "Moroccan Dirham (MAD)", while `copy.md` says "Moroccan dirham".
3. **Home follow-ups:**
   - the share message with the link;
   - "Join their space instead" → `auth.html?state=switch#/setup/join`;
   - the "already in a space" notices;
   - `@view-transition`, with `view-transition-name: pair` on the masthead pair;
   - the live switch to "Hi, you two" when the partner joins.
4. **Architecture:**
   - a solo-member "delete my space and join" endpoint (F9, an exception to D19);
   - `409 already_in_space`;
   - the `GET /api/me` shape;
   - `Retry-After` on 429;
   - the duplicate-email error code;
   - the reset sender domain;
   - keeping the offline queue after an involuntary 401;
   - recording A6 in the decision log.
5. **Design system:** confirm the dashed outline's second meaning, the empty seat.
6. **Deviation from `ia.md`:** "Another currency…" reveals its select without moving focus (WCAG 3.2.2).
7. **Shared-layer requests** (all worked around locally in each engineer's files):
   - `A.rateLimit` reason ids;
   - separate offline and rate-limit disable reasons;
   - a label-side slot in `A.field`;
   - field errors set by the server that survive blur;
   - `A.confirm` staying open while a request runs;
   - offline handling for Sign out;
   - `A.handoff('offline')`;
   - a header-hidden mode;
   - `A.idle` clearing the saved label.
8. **Not tested:** screen readers (the A5 announcement), real phones (iOS standalone autofill, `passwordrules`, Caps Lock, keyboard-up layout), right-to-left, and the privacy page itself (no owner).
