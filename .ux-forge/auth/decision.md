# Decision: Auth and space setup

## IA questions settled by the user (Tue 10 Nov 2026)
All four of the Architect's recommendations in `ia.md` §7 were accepted.

1. **Q1, wrong path:**
   - **Decision:** a joiner who started their own space by mistake **can switch, only while they're alone in it.**
   - **Flow (F9):** they confirm, their space is deleted, and they join with the code. It's built in the prototype as `#/setup/join?state=switch` and `switch-confirm`.
   - **API impact:** this is an exception to D19 (leaving is stubbed). The architecture must add a solo-member "delete my space and join" path, recorded in `ia.md` §9.
2. **Q2, invite link:**
   - **Decision:** the invite link ships **in v1**, as `/join#code=K7QM-4XPA`. The fragment keeps the code out of server logs.
   - **Flow (F10):** the resolver is in scope.
   - **Home impact:** Home's share message changes to carry the link, with the code still in the text. This is a follow-up for `home/copy.md`.
3. **Q3, first screen:** **Sign in is the landing screen.** There's no welcome screen (A1). "Create an account" is visible without scrolling at 375×667.
4. **Q4, currency:** **preselected from the phone's region** (MAD for the example couple), with "You can't change this later" beside it.

## Accepted from research and IA
- **A6:** the sign-up enumeration leak is accepted in v1. Better Auth's own duplicate-email error is shown, and nothing more.
- **A7:** the email is trimmed and lower-cased, then shown back on the first setup screen.
- **Reset success:** sends the user to Sign in and never claims they're signed in. iOS Safari and the installed app don't share cookies.

## Copy rulings (Director, from `copy.md`'s open items)
- **Default space name:** "Our space". It replaces "Sara & Youssef" in the brief's example data, which matches the design system's "Ours, not mine".
- **The A5 toggle** ("Have a code from your partner?") changes its visible label and doesn't use `aria-pressed`, so the accessible name always matches the visible text. [2.5.3]
- **Privacy line:** a notice, not a consent checkbox. The link goes to a placeholder page. The privacy page itself is still an open item with no owner.
- **Open with the architect:**
  - the reset email's sender domain;
  - Better Auth's duplicate-email error code;
  - whether expired and used reset tokens are indistinguishable. The copy works either way.

## Direction
**Chosen: C · Two seats** (`directions.md`). The user picked it on Tue 10 Nov 2026, on the Art Director's recommendation.

### What C means
- **Imagery:** the partner avatars ("seats") are the only imagery. There's no arch: no picture means nothing to frame, by the four-test ruling in `directions.md`.
- **Logo:** the lockup heads every screen. It's 48 px on phones and 56 px from 48 rem on signed-out screens, and 40 px in the setup header row.
- **Create account:** your seat sits beside the "First name" label and shows your initial as you type. It's neutral, because no role exists yet.
- **Setup cards:**
  - **Start:** (S, majorelle)(dashed).
  - **Join:** (taken majorelle, no letter)(S, terracotta).
  - Both cards are equal: same build, nothing pre-selected, Start first, side by side from 40 rem.
- **Join success:** Sara's initial lands in the waiting seat (160 ms fade and scale, then a 240 ms hold). The page then replaces to Home `joined-empty`.
- **Start success:** goes to Home `first-run`.
- **Reduced motion:** no scale and no hold.
- **Colour roles:**
  - saffron appears only inside the logo, and zellige isn't used;
  - danger marks form errors, the error summary and F9's delete-and-join;
  - partner colours appear in seats only.

### Risks C is held to
1. **Dashed outline:** the dashed "not yet" outline gets a second use, the empty seat. It stays non-interactive: no plus, no hover, no pulse. **The user should confirm this extension of the design system** (open item).
2. **Join card colour:** it previews Sara in terracotta. If testing shows people read seat colour as "me", drop the colour from the person's own seat in the cards; position still carries it.
3. **Partner name:** the join response must include the partner's first name. If it's missing, the seat fills neutral with no letter.
4. **Transitions:** View Transitions don't run over `file://`. The prototype shows the in-place fill and the route fade.

## Director rulings for the build
- **Show/Hide password:** the visible label and accessible name change together ("Show password" / "Hide password"), with **no `aria-pressed`**. A pressed state with a changing label is read twice, the anti-pattern the Goals review flagged on Reorder. This overrides the `aria-pressed` in `ia.md` §6.2. The same rule applies to the A5 toggle (above).
- **The shared layer:**
  - **`auth-shared.js`** (`window.A`) provides the router, `?state=` fixtures, seats, the field and error helpers, rate-limit, offline, confirm, and carry storage.
  - **`auth.css`** holds the shell and seats.
  - **`../goals/zamane.css`** stays the token and base source, linked rather than copied, so there's one source of truth.
- **The example space name** is "Our space" (`ia.md` §4 example data says "Sara's space"; superseded).
