# Build notes: Zamane Home (direction B · Within reach)

## Files
- **Prototype:** `.ux-forge/home/home.html`, a single file you open in a browser.
  - The layout is direction B; the nav comes from `.ux-forge/nav-bar/`.
  - Logos are referenced from `assets/` (read-only), not copied.
- **Screenshots:** `.ux-forge/home/screenshots/`, all shot from the current build after fix round 1. The Critic's own shots of the earlier build are in `screenshots/critic/`.

## How to see each state
Add **one** query parameter (an `&` breaks the kit's screenshot command on Windows):

| Parameter | Values |
|---|---|
| `?state=` | `populated` (default), `first-run`, `joined-empty`, `trip-now`, `no-trip`, `all-done`, `loading`, `offline`, `error` |
| `?sheet=` | `pick`, `money`, `percent`, `invalid` |
| `?toast=` | `added`, `completed`, `queued` (implies offline), `percent`; these run the real commit, so the cards and total change too |
| `?live=1` | Youssef adds 200 to Wedding fund after 0.3 s, through the realtime path, with no toast |
| `?noshare=1` | first-run without Web Share: Copy is hidden and the dock reads "Copy code" |

Interactions to try:
- "Add to a goal" → pick → amount → "Add contribution" → the toast with Undo.
- Push Wedding fund past 20,000 to see "Goal reached".
- With `?state=offline`, an add is queued.

## Structure as built
- **Phones (< 48 rem), from the top:** greeting and pair, the bare total (a link to Goals), the trip countdown, the Shopping row, then Closest to done (≤ 3 goals).
  - The state's one primary is a **floating button at the bottom-right**, 16 px above the nav. This replaced the full-width dock at the user's request (see decision.md).
  - In the DOM it still comes right after the total, so keyboard and screen-reader order is unchanged.
- **48–64 rem:** a full-width single column. Under the greeting, the total sits with its primary to the right.
- **≥ 64 rem:** a masthead line (greeting · total · primary), closed by a hairline. Below it, a 5 | 7 grid: trip and Shopping | goals.
- **The dock's primary per state:** Add to a goal · Share code (Copy code without Web Share) · Create a goal · New goal · Try again.

## Tokens added (proposed for the design system)
`--fab-h` 56px · `--fab-gap` 16px · `--fab-zone` (56 + 2 × 16, kept clear under the content) · `--dur-sheet` 240ms · `--dur-toast` 160ms · `--dur-fill` 400ms · `--backdrop` (ink at 40% / black at 60%). Plus the nav tokens from `.ux-forge/nav-bar/build-notes.md`.

## Fix round 1 (from `reviews/critique.md` and `reviews/accessibility.md`)

| Finding | Fix |
|---|---|
| Critic F1: the on-screen keyboard covers the submit | `interactive-widget=resizes-content`; `visualViewport` lifts the sheet onto the keyboard on iOS; submit moved directly under the field; the live preview now replaces the helper line instead of adding one |
| Critic F2: the invite code splits at 320 px | `.code` nowrap, `.code-row` wraps, 28 px below 22.5 rem |
| Critic F3: Shopping below the fold on phones | DOM order is now trip → Shopping → goals. That also makes desktop focus order match the columns. |
| Critic F4: widowed "Nov" | the date range is one nowrap span; `text-wrap: pretty` on prompts |
| Critic F5: 12 px dock–tab gap; focus ring after touch | `--dock-h` 73 gives a 16 px gap; focus returns with `focusVisible: false` after pointer use |
| Critic F6: 768 px content stopped at 592 px | removed the 36 rem cap between 48 and 64 rem |
| Critic F7: first-run anchors on wide screens | Copy sits beside the code |
| Critic F8: skeleton shift | skeleton heights match the cards (130 / 136 px), with a 44 px label row |
| Critic F9: toast fixtures changed no data | fixtures go through `commit()` |
| Critic F10: inconsistent example data | all-done total is 26,000; the error state shows "Home" with no pair; the footnote only names placeholders where they appear |
| A11y 1: Undo unreachable in time | the toast is in the DOM right after the masthead (one Tab from the primary); 10 s; paused on hover and focus, restarted by any key; Esc dismisses; "Undo is the next button." is announced; focus returns to the primary after Undo |
| A11y 2: re-render loses focus | `render()` restores focus to the equivalent control; Try again uses `aria-disabled` and focuses the `h1` on success |
| A11y 3: no goal context in the amount step | `aria-describedby="sheet-sub amt-help amt-err"` |
| A11y 4: accidental backdrop dismissal | closes only when pointerdown and click both land outside the sheet's box |
| A11y 5: silent stepper | the button names read "−10 percentage points"; new values are announced through a status region inside the dialog |
| A11y 6: forced colours | `.track` gets a border and `.fill` uses Highlight; `.toast` and `.sheet` get borders |
| A11y minor | permanent `role=alert` in the dialog; `role="list"` on unstyled lists; background scroll locked while the sheet is open |

## Fix round 2 (Critic PASS 4.25; Accessibility re-audit flagged one serious regression)

| Finding | Fix |
|---|---|
| A11y R2-1 (serious): focus restore matched the nav tab, because the nav, the total and "See all" share hrefs | The lookup is scoped to `#masthead` or `#rooms` and keyed by position among matches, with `focusPrimary()` as the fallback. **Verified** by a jsdom test (`scratchpad/scripts/focus-test.mjs`): focus is put on "See all", the total and the Shopping row, a live partner update re-renders the page, and focus stays on the same control each time. |
| A11y R2-2: the sheet lift also fired under pinch-zoom | `placeSheet()` ignores `visualViewport.scale > 1.01` and caps `maxHeight` to the visual viewport |
| A11y R2-3: any key press kept the toast alive; Esc only worked inside it | The global key restart is removed; hover and focus still pause it. Esc dismisses it from anywhere when no sheet is open. `scroll-padding-bottom` grows while it shows. |
| A11y R2-4: stale live and alert text | Cleared on close and in `clearError()` |
| Critic R1: the 568-tall phone sheet didn't fit above the keyboard | The CSS cap is now `min(100dvh − 8px, 40rem)`; `maxHeight` follows the visual viewport; "Add a note" and "Change goal" moved below the submit. The submit now really sits directly under the field and helper. |
| Critic R2: stale screenshots | Every screenshot was deleted and re-shot from the final build |
| Critic polish: the all-done total was inconsistent | 56,000 (Wedding fund 20,000 + New sofa 6,000 + Honeymoon 30,000) |

## Known gaps and deviations
- **Nav labels at large text sizes:** they still truncate, because the nav-bar spec uses a fixed 64 px height (A11y minor). This belongs to the nav component; fix it there by using `min-height` and recomputing the dock offset.
- **Partner updates during an open sheet:** they're announced into the page's live region, which is inert while the modal is open, so they may be missed.
- **"Saved together" link:** its accessible name is its content (total and counts), not its destination ("Goals"). The reviewer marked this optional.
- **Not verified on real devices:**
  - the on-screen keyboard behaviour on iOS and Android;
  - real safe areas;
  - the thumb test of the dock–tab gap;
  - screen-reader output;
  - 200% OS font size.
