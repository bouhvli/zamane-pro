# Build notes: space setup and the resolvers (direction C · Two seats)

**By:** front-end engineer (setup) · Tue 10 Nov 2026
**Routes:** `#/setup`, `#/setup/start`, `#/setup/join` (with the F9 switch), `#/join` (F10), `#/launch` (F11 and the redirects)

## Files
| File | What |
|---|---|
| `auth/setup.js` | The five views, registered with `A.view`. All strings are `copy.md`'s, verbatim, in `C` at the top. Prototype-only notes are in `P` and are labelled "Prototype" on screen. |
| `auth/setup.css` | The choice cards, currency radios and selects, time-zone disclosure, splash, prototype hold and launch messages. Tokens only. |
| `auth/build-notes/setup.md` | This file. |

Nothing else was touched. `auth.html` already loads both files.

**Tokens added** (in `setup.css`, layout only):
- `--choice-min: 72px` (ia §6.2);
- `--control-h: 52px` (the `.field` height, reused for radio rows);
- `--radio: 20px`.

## How to run
Open `auth.html?state=<key>#/<route>` over `file://`. There is one query parameter, and a fixture applies to the first view only. Without `?state=`, each route shows its first key.
- **Invite link:** `#/join?code=…` stands in for `/join#code=…` (for example `auth.html?state=no-space#/join?code=k7qm%204xpa`).
- **Offline fixtures:** a "Prototype: come back online" control under the notice calls `A.simulateOnline()`.

## Who is signed in
- **Sara** (slot a) on the choice screen and on Start. She creates the space, and the A7 line shows her email.
- **Youssef** (slot b) on Join and in switch mode. In switch mode he is shown as the slot-a creator of his own solo space (Y)(◌), as directions.md says ("the person's current majorelle seat").

## States (every ia.md §4 key)
| Route | Key | What you see |
|---|---|---|
| `#/setup` | `choose` | Header with the 40 px lockup, "Signed in as Sara" and Sign out. h1 with Sara's neutral (S). The gloss. Two equal cards: Start (S)(◌), then Join (●)(S). The A7 line. |
| | `long-email` | `sara.benali.elidrissi+zamane@example.com` wraps (`overflow-wrap:anywhere`, `dir=ltr`). |
| | `offline` | A slim notice under the gloss. The cards still navigate. Sign out (header and A7) is `aria-disabled` with "Signing out needs a connection." beside it, said on press. |
| | `guard-member` | Prototype hold: splash, then a note that the app replaces to Home, with a link. |
| `#/setup/start` | `idle` | Everything prefilled: "Our space", MAD preselected, "Casablanca (from this phone)". |
| | `invalid` | Empty name plus "Another currency…" with nothing picked: two inline errors, "2 fields need your attention.", focus on Space name. |
| | `other-currency` | The `<select>` of `Intl.supportedValuesOf('currency')`, named by `Intl.DisplayNames`, is revealed. |
| | `timezone-change` | The disclosure is open and its `<select>` (optgroups by region) is focused. |
| | `submitting` | "Starting…", `aria-disabled`; the request never resolves. |
| | `already-in-space` | Prototype hold showing Home's notice "You're already in a space." |
| | `offline` | A notice above the form. The primary is `aria-disabled` and described by the notice. Back online announces "Back online. You can start your space now." once. |
| | `network-error` | Alert "Couldn't reach Zamane. Try again. Nothing is created twice." The same UUID v7 is kept for the retry. |
| | `server-error` | Alert `auth.alert.server`. |
| | `long-name` | An 87-character space name (see deviation 2). |
| `#/setup/join` | `idle` | An empty field, or the session draft if there is one. |
| | `prefilled` | Filled from the pending code. On an in-app arrival, focus goes to Join space. |
| | `restored` | The draft "K7QM 4X" is restored, with no message. |
| | `invalid` | "Codes have 8 letters and numbers, like K7QM-4XPA." |
| | `invalid-letters` | "Codes don't use 0, O, 1, I or L. Check the code again." |
| | `invite-invalid` | Inline `role=alert` error. The value is kept and selected. |
| | `submitting` | "Joining…" |
| | `rate-limited` | Alert. The primary is `aria-disabled` for 10 s, then "You can try again now." |
| | `already-in-space` | Prototype hold showing Home's notice. |
| | `offline` | As on Start, with "Joining needs a connection." |
| | `network-error` | "Couldn't reach Zamane. Your code is kept. Try again." |
| | `server-error` | Alert `auth.alert.server`. |
| | `switch` | h1 "Join your partner's space". (Y)(◌). Back goes to Home first-run. No Start cross-link. |
| | `switch-confirm` | Alertdialog "Join with this code?". Body: "The space you started will be deleted, with 1 goal and 3 shopping items. This can't be undone." It is built with `Intl.PluralRules` and `Intl.ListFormat` from `A.EX.soloSpace`. **Keep my space** is focused. |
| `#/join` | `signed-out` | Splash with the hidden status "Opening your invite". The code is stored as `carry.code` and stripped from the URL, then the page replaces to `#/create-account` (`with-code`). |
| | `no-space` | Replaces to `#/setup/join` (`prefilled`). A malformed code is ignored, so Join opens empty. |
| | `member` | The code is dropped. Prototype hold showing "You're already in a space with Sara.", with links to Home and to Home first-run (solo case). |
| `#/launch` | `loading` | The mark only. After 1 s, "Loading Zamane" (`role=status`). The region is labelled the same and `aria-busy`. |
| | `signed-out` | Replaces to `#/sign-in`. |
| | `no-space` | Replaces to `#/setup`, or to `#/setup/join` with the A5 intent or a pending code. |
| | `member` | Prototype hold, linking to Home. |
| | `cached-offline` | Prototype hold, linking to Home `?state=offline`. |
| | `offline` | F11: h1 "You're offline", the body, **Try again** ("Trying again"). Coming back online announces "Back online. Opening Zamane." and retries. |
| | `error` | h1 "Zamane didn't open", **Try again**. |

### Behaviour worth knowing
- **Join success (the signature moment):**
  1. "Joining…" is shown, then the `200` returns `partnerName: "Sara"`.
  2. Sara's "S" replaces the taken seat with `.seat.is-filling` (160 ms fade and 0.9 to 1 scale, from `--dur-seat`).
  3. After the `--seat-hold` (240 ms) hold, the page calls `location.replace(A.handoff('joined-empty'))`.
  4. Home then shows the same (S)(Y).
  - **Reduced motion:** `auth.css` drops the animation and the hold is 0.
  - **Switch:** the fill waits `--dur-sheet` so the sheet's backdrop has gone first. Y moves to the terracotta seat.
  - **No partner name:** the seat fills neutral with no letter.
  - On success, `code`, `intent` and `joinDraft` are cleared.
- **Start success:** `location.replace(A.handoff('first-run'))`, with no motion here (directions.md: Sara's seat is already majorelle).
- **Code input:**
  - Never rewritten while typing. It is shown back as `XXXX-XXXX` on blur and on paste.
  - Pasting Home's two-line share message picks the last code.
  - Saved to `carry.joinDraft` on input.
  - A server error clears on the first edit.
  - The 6th request in a minute answers `429`.
- **Start draft:** kept in memory across the replace-links to Join and back (§6.7.6). Back after a cross-link lands on `/setup`.
- **Focus:** I use account.js's `land()` rule so both halves agree:
  - the first load moves nothing;
  - an in-app arrival, or a non-default fixture, applies §6.1.

## Verification
- **Screenshots:** every key at 320×568, 390×844 and 1440×900, light and dark, in `auth/screenshots/<route-with-dashes>-<key>/`, for example `screenshots/setup-join-switch-confirm/390x844-dark.png`.
  - Full-page shots of `setup-long-email` and `setup-start-long-name` at 320.
  - Mid-hold frames of the moment: `screenshots/setup-join-success-moment/390x844-light-{join,switch}.png`.
- **Playwright** (`scratchpad/setup-checks.mjs`): **137 checks passed, 0 failed, no console errors.** They cover:
  - tab order;
  - names and descriptions;
  - card height (72 px or more) and equal side-by-side cards;
  - arrows in the radio group;
  - disclosure focus;
  - the count alert;
  - offline aria-disabled, announcements and the Sign out guard;
  - paste normalisation, and no rewrite while typing;
  - draft restore after reload;
  - the `invite-invalid` select and alert;
  - the rate limit;
  - the seat fill and the hold of more than 250 ms; under reduced motion, no animation and no hold;
  - the alertdialog's focus, Esc and Esc being blocked while joining;
  - switch failure ("Your space wasn't deleted.");
  - resolver redirects and code stripping;
  - the splash status after 1 s;
  - no horizontal scroll at 320, and targets of 24 px or more on every state.

## Deviations (and why)
1. **"Another currency…" reveals the select but doesn't move focus** (§6.2 says it focuses it). Moving focus while someone arrows through a radio group is a change of context on input [WCAG 3.2.2]. The select is the next Tab stop. The time-zone **Change** button does move focus, because it's an activation.
2. **The long space name scrolls inside the input** rather than wrapping (F12). A `<textarea>` would announce as multi-line and break Enter-to-submit.
3. **Home-bound redirects are held** on the splash with a labelled prototype note and a link, instead of navigating. Home is another file and doesn't render these notices. Redirects inside `auth.html` happen for real.
4. **`#/join` takes `?code=` in the hash**, because the prototype's fragment is the router.
5. **Retry-After is 10 s** (ia §9). account.js uses 60 s; see request 7.

## Shared-layer requests (implemented locally for now)
1. **`A.confirm`:** an async `onOk` that keeps the dialog open with a pending label and blocks Esc. Today it closes on press, so `setup.js` drives `#confirm-ok` and `#confirm-cancel` itself and restores them afterwards.
2. **`A.header`:** Sign out offline (F5). I add a capture-phase click guard, `aria-disabled` and an injected `#signout-reason`. It belongs in the header.
3. **`A.handoff('offline')`** for Home's offline state. I build `../home/home.html?state=offline` locally.
4. **`A.idle`** should also clear `dataset.label`, or a reused button keeps a stale label. I clear it by hand on the confirm button.
5. **A splash mode for the header** (hide it). I hide `.auth-head-wrap` and restore it on cleanup.
6. **`A.FOOTNOTE`** differs from copy.md `auth.example`. Both screen engineers use `auth.example`, so make it the default.
7. **Reconcile with account.js:** its `guard-member` auto-redirects to Home after 1.5 s with "Taking you there…", which isn't in copy.md, and it uses a 60 s rate-limit wait. Pick one rule for both.
8. **The view transition:** the Join pair carries `view-transition-name: pair` (`.seat-pair--vt`). Home must add `@view-transition { navigation: auto }` and the same name on its masthead pair for the cross-document hand-off.

## Open items
- **Copy gaps (Writer):**
  - The switch Back link's name, "Back to Home". It contains "Back", but it isn't in copy.md.
  - The time-zone line after a change shows `{city}` alone. "(from this phone)" would be false, so it needs a key like `setup.start.timezone.valueChosen`.
- **Currency names:** `Intl.DisplayNames` gives "Moroccan Dirham (MAD)" in title case, while copy.md's example is "Moroccan dirham". The name comes from Intl by design.
- **For Home:**
  - The notices "You're already in a space." and "You're already in a space with {partnerName}." are not rendered in `home.html`.
  - F9's "Join their space instead" on first-run should link to `../auth/auth.html?state=switch#/setup/join`.
- **Not built:**
  - F9's `409` "{partnerName} already joined your space.";
  - the setup guard for a signed-out person;
  - F8's re-fetch of `/api/me` after a failed join.

  None of these has a state key.
- **A7 on Join** shows only with the A5 intent (`carry.intent === 'join'`), the one signal that the person came straight from sign-up.
- **Decision.md risk 1** (the dashed seat's second meaning) still needs the user's confirmation.
