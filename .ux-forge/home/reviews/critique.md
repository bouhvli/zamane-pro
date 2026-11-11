# Design critique: Zamane Home + quick-add sheet (direction B · Within reach)     VERDICT: REVISE     CONFIDENCE: medium

**Evidence.** I opened every PNG in `screenshots/` (populated, small, all 8 states, 4 sheet steps, 3 toasts, live). Several were stale: `home.html` changed at 15:44, after `populated/` and `small/` (15:40) and `sheet-percent/390x844-dark` (15:42) were taken. The stale shots put the counts chevron at the far right and squeeze the percent stepper to about 32 px. So I re-shot the **current build** with headless Edge over CDP (exact device metrics, emulated light/dark). I used a scratch copy that adds only a test harness (theme, real `commit()` calls, scroll), and measured elements. Those shots are in `screenshots/critic/`. Every finding below comes from current-build shots or measurements unless it says otherwise.

**Lowered confidence because:** the kit (`protocol.md`, `principles.md`, `anti-generic.md`, `checklist.md`) is outside this session's readable folders, so the tells list is my own. I could not see the on-screen keyboard, real safe-area insets or motion (sheet rise, toast entry, bar fill) in stills.

## Scores

| # | Dimension | Score | Evidence |
|---|---|---|---|
| 1 | Brief fit | 4 | The add loop works end to end. Commit 500 updates the total to 20,750, the card to 14,750 and the attribution to "Sara added 500 · just now", shows the toast with Undo and returns focus to the dock. Undo restores the data. Queued and completed both work. The risk is the keyboard over the submit button (F1). |
| 2 | Five-second clarity | 4 | At 390 the bare total, then the trip, then goal 1 read top-down, and the one verb sits in the dock. Shopping, one of the brief's four glance answers, is off-screen on phones (F3). |
| 3 | Hierarchy & layout | 4 | It holds in grayscale (`critic/gray390.png`). The total leads by isolation and the dock is the bottom anchor. Wider screens weaken it (F6, F7). |
| 4 | Usability | 4 | Invalid input is kept ("12x" plus an inline error). Percent is pre-filled and selected, one open goal skips step A, Undo is in place, and the live update comes without a toast. Against that: the keyboard risk (F1) and the 12 px dock–tab gap, still untested (F5). |
| 5 | Craft | 3 | A widowed "Nov" in the trip meta at 375 and 390 in every trip state. The invite code splits at 320. Prompt widows. A 36 px Undo is off the button scale. The skeleton shifts the goals 8–10 px on load. |
| 6 | Distinctiveness | 4 | Faithful to B: the bare total, the dock as the hinge, the toast on the dock edge, the ز dot, and the short-viewport fallback, which works (`critic/short.png`). It reads calm and specific, not like a template. |
| 7 | Responsive & themes | 3 | Dark mode is clean everywhere. 320 holds apart from the code. At 768 the column hugs the left with 160 px of dead space on the right. At ≥ 48 rem the first-run buttons scatter. |
| 8 | States & content | 4 | All 8 states, 4 sheet steps, 3 toasts and live exist. Copy matches `copy.md` and `decision.md` almost string for string. Example data and fixtures sometimes contradict themselves (F9, F10). |

Average **3.75**, no dimension below 3 and no blocker, so the verdict is **REVISE**. It's close: none of the fixes touch the structure.

## Findings

### [Major] F1 · The amount sheet's submit button sits where the keyboard will be, and iOS has no Enter key there
Where: quick-add step B (money and percent), phones. `#sheet`, `.sheet-actions .btn-primary`, `<meta name="viewport">`.
Saw: at 390×844 the field is at 554–606 and **Add contribution** at 728–772, with the helper, preview and "Add a note" (122 px) between them. At 320×568 the field is at 278–330 and the button at 452–496 (`critic/sheetmoney-320.png`). The viewport meta has no `interactive-widget`, and there's no `visualViewport` handling in the JS. *Not seen on a device:* a numeric keyboard plus the iOS accessory bar is roughly 290–340 px tall. That leaves about 500–550 px visible at 844 and about 230–280 px at 568, so the button would be covered. iOS's `inputmode="decimal"` pad has no Return key, so "Enter submits" doesn't help there: the user has to tap Done and then the button.
Violates: the brief's one success action, "add to a goal in seconds", and B's promise that the whole add happens in the bottom third. Fitts: the target is hidden behind the keyboard. Nielsen #7 (efficiency).
Fix: (1) add `interactive-widget=resizes-content` to the viewport meta for Chrome on Android. (2) On `visualViewport` `resize` and `scroll`, set `#sheet{bottom: <innerHeight − vv.height − vv.offsetTop>px; max-height: calc(vv.height − 16px)}` so the sheet rides on top of the keyboard on iOS. (3) Reorder step B to label → field → helper/error → **Add contribution** → preview, "Add a note" and "Change goal". That puts the button about 40 px under the field instead of 122. Test on iPhone Safari and Android Chrome in the same thumb test the dock still needs.

### [Major] F2 · The invite code breaks at its hyphen at 320 px
Where: first-run, 320×568, `.code-row > .code` (`critic/first320.png`).
Saw: "K7QM-" on one line and "4XPA" on the next. The code box is 190 × 72 px, beside an 86 px Copy button. At 390 and above it stays on one line.
Violates: error prevention (Nielsen #5). Partners read this code aloud or type it in, and a split code with a trailing hyphen looks like two things. This is the moment the space becomes "ours".
Fix: `.code{white-space:nowrap}` plus `.code-row{flex-wrap:wrap;row-gap:var(--space-2)}`, so Copy drops below the code when the row is too narrow. Alternatively, below `22.5rem` set `.code{font-size:28px;letter-spacing:.02em}` (about 170 px, which fits beside Copy in the 288 px row). Re-check at 320.

### [Minor] F3 · Shopping, one of the brief's four glance answers, is never on screen on phones without scrolling
Where: populated, 390×844 and 375×667, `.room-shop`.
Saw: the Shopping row starts at y = 848 at 390×844. Content stops at the dock's top edge (711), so you scroll past all three GoalCards to learn "7 left to buy" (`critic/pop390-end.png`). At 1440 it sits beside the trip and is visible at once.
Violates: brief §"second job", the 5-second glance (Krug) answering "is there shopping to do?". This is an IA-order consequence that B's fixed dock (69 px) makes worse, not a build bug.
Fix (Director's call): on phones (< 48 rem), place the 52 px Shopping row directly after the TripCountdown, matching the desktop grouping (trip and Shopping | goals). Keep the DOM order trip → goals → Shopping if focus order matters more, and use `order` only inside `.rooms` on phones. It costs 64 px and answers all four glance questions above the fold at 390×844.

### [Minor] F4 · The trip meta leaves "Nov" alone on the second line at the two most common phone widths
Where: populated, trip-now, offline and all-done at 375 and 390, `.trip-meta`.
Saw: "Rif mountains · Sat 21 Nov – Wed 25" / "Nov" (and "Sun 8 Nov – Thu 12" / "Nov" in trip-now). At 768 and up it fits on one line. The same widow problem shows in `.prompt > p` ("No trips yet. Plan your first" / "one.") and in the invite body at 320 ("…join your" / "space.").
Violates: craft (no widows); it's the second-loudest block on the most-viewed screen.
Fix: render the range as one unbreakable span, `<span class="trip-dates">Sat 21 Nov – Wed 25 Nov</span>` with `.trip-dates{white-space:nowrap}`. The line then breaks after "Rif mountains ·", and the range (about 150 px) fits the 182 px body at 320. Add `text-wrap:pretty` to `.prompt > p`, `.lead-body` and `.trip-meta`.

### [Minor] F5 · The dock–tab gap is 12 px, and the dock keeps a focus ring after every touch add
Where: all phone states. `.dock` and `.nav-link`.
Saw: measured at 390×844, the dock button ends at 768 and the first tab target starts at 780, with the ز dot sitting in that 12 px gap. After a commit, `#primary` shows the 2 px majorelle ring (`critic/add500.png`, `critic/complete.png`), because focus moves programmatically from the input, which is always `:focus-visible`. On a touch phone the main button stays outlined as if it were selected.
Violates: B's own named risk (dock–tab mis-taps, a thumb test still owed) and a quiet "nothing moves" dock.
Fix: raise the dock's bottom padding to `space-4`. That's `--dock-h: 73px`, update body padding, scroll padding and the toast `bottom` with it, and it gives a 16 px gap. Run the owed thumb test. For the ring, when the sheet was opened by pointer (`pointerType` recorded on the opening click), call `primary.focus({focusVisible:false})` where supported, or blur and re-focus without the ring. Keyboard users keep it.

### [Minor] F6 · At 768 px the column hugs the left edge under a full-width top bar
Where: populated and every state, 768×1024, `.masthead` and `.rooms` (`max-width:36rem`) (`critic/pop768-light.png`).
Saw: content runs 16–592 px while the top bar runs 16–752. The AvatarPair and "See all" stop 160 px short of Profile, so the page looks off-centre.
Violates: alignment and layout (Refactoring UI: deliberate alignment). B only says "one 36 rem column".
Fix: from 48 to 64 rem, drop the `max-width:36rem` so the masthead and rooms span the `.wrap` and line up with the logo and Profile. GoalCards at 736 px still read well. If a narrow measure is wanted, centre the column instead (`margin-inline:auto` on `.masthead`, `.rooms` and `.footnote`), but full width matches the top bar better.

### [Minor] F7 · On wide screens the first-run masthead scatters its two buttons
Where: first-run at 768 and 1440 (`critic/first768-light.png`, `critic/first1440-light.png`), `.masthead` grid with `align-items:end`, and `.code-row{justify-content:space-between}`.
Saw: at 1440, Copy (sm, 32 px) floats at x≈992 and y≈133, aligned with nothing. Share code sits at x≈1126 and y≈183. The greeting sits at the bottom left, below the "Invite your partner" label line. That gives three different vertical anchors. At 768, Copy sits mid-row and Share code lower right, in a diagonal stagger.
Violates: proximity and alignment; the two actions on the same object should read as a pair.
Fix: at ≥ 48 rem, set `.invite .code-row{justify-content:flex-start;gap:var(--space-4)}` so Copy sits right after the code. In first-run, also align the dock with the code row: give the masthead `align-items:center`, or give the dock `align-self:start` with a top margin equal to the label height, 22 px. That way Copy and Share code share one baseline band. Phone layout is unchanged.

### [Minor] F8 · The loading skeleton shifts the goals 8–10 px when data lands
Where: `state=loading` vs populated, 390×844, `.sk-*` sizes.
Saw: measured. The trip block is 128 tall vs 130. The goal-label row is 18 tall at 362 vs a 44 tall `.sec-head` at 352. Goal 1 is at 392 vs 400 and goal 2 at 538 vs 548.
Violates: IA §3 "Skeletons keep the real layout's shape (no layout shift)".
Fix: set `.sk-trip{height:130px}` and `.sk-goal{height:136px}`. Wrap the skeleton label in a `.sec-head`, so it sits in the same 44 px row with its negative margins, or give `.sk-lbl` in `.room-goals` `margin-block:13px 5px`.

### [Minor] F9 · The `?toast=` fixtures show toasts that contradict the screen, and the shipped screenshot set is mixed-build
Where: `home.html` prototype helpers (lines 702–706). Screenshots in `toast-*/`, `populated/`, `small/` and `sheet-percent/390x844-dark.png`.
Saw: `toast-added` says "Added 500 MAD to Wedding fund" while the card still shows 14,250 and the total 20,250. `toast-completed` says "Wedding fund: 20,000 MAD together" over a 71% blue bar with no Done badge. `toast-queued` shows no "waiting to sync" on the card. The real `commit()` path renders all of these correctly (`critic/add500.png`, `critic/complete.png`, `critic/queued390.png`). These screenshots will be read as the port spec.
Violates: honest feedback (Nielsen #1) in the reference material; review evidence goes stale.
Fix: make the fixtures go through the real path. `toast=added` → `commit(wedding, 500, '')`, `toast=completed` → `commit(wedding, 5750, '')`, `toast=percent` → `commit(guest-room, 70)`, and `toast=queued` sets `state='offline'` and commits 500. Then re-shoot the whole set from one build.

### [Minor] F10 · Example content contradicts itself in a few states
Where: all-done, error, every state's footnote, and `shopHTML()`.
Saw: all-done shows **20,250 MAD** with "4 goals done", which is impossible because Wedding fund (20,000) plus New sofa (6,000) already makes 26,000. Error shows "Hi, you two" and the pair even though `/api/home` (the members source in the IA) failed with no cache. The footnote naming "Paint the guest room" and "Honeymoon" appears in first-run, joined-empty and error, where neither exists. In code, any `shopLeft === 0` renders the joined-empty "Nothing on the list yet." with "Add an item", but `copy.md` has `home.shopping.none`, "Nothing left to buy", for a list whose items are all bought.
Violates: "Nothing is invented as real" (brief) and specific, honest copy.
Fix: set all-done `total` to 56,000 (20,000 + 6,000 + 30,000, with the guest room as a general goal). On error, show `Hi, {firstName}` from the session and no pair, or keep the pair only if membership is cached. Show the footnote only in populated-type states. Branch the Shopping empty copy on whether the list ever had items.

**Polish (one line):**
- The toast Undo is 36 px tall, off the 32/44 button scale. Use 32 px `radius-sm` with the existing 44 px hit area.
- The toast is a `radius-md` card, not the DS pill. Record it as a proposed "Toast with action" variant.
- In joined-empty, the trip prompt has no visible title but the Shopping prompt does. Make them parallel: add a visible "Trips" title or drop "Shopping".
- At 1440, joined-empty leaves the 7 goal columns empty. Let the left rooms span 12 when there are no goals.
- `home.trip.dates` says "to" while the build uses the DS component's "–". It's fine visually, but use "to" in the accessible name.

## Protect

1. **The bottom-third geometry of B.** The dock holds each state's single primary (Add to a goal, Create a goal, New goal, Share code or Copy code, Try again; all seen). The toast sits 8 px above the dock edge (643–703 vs 711) and never covers the button. The sheet rises from the bottom. Under `max-height:30rem` the dock goes inline (`critic/short.png`). Don't trade this away while fixing F1 and F5; make it ride the keyboard instead.
2. **The real commit, undo and live loop.** Total, amount, attribution ("Sara added 500 · just now"), bar, the zellige Done badge, "2 goals open · 2 done", the queued line with cloud-off ("waiting to sync"), Undo restoring with "Removed 500 MAD from Wedding fund", focus back on the dock, and Youssef's live +200 arriving with no toast. This is the product's heartbeat and it's right.
3. **Copy and the bare total.** Strings follow `copy.md` and `decision.md` closely: the "3 goals open · 1 done" counts line, the offline notice, "Update progress" with "Enter the new total, not the amount to add.", "It works once." dropped, errors that keep "12x". The uncontained total leads by isolation and holds at 1,284,750 MAD and 320 px (`critic/long390.png`).

## Tells count

Checked against my own list; the kit's `anti-generic.md` was unreadable.
- **Sticky bottom CTA:** present, **justified** by B. It's labelled with a verb, holds the one primary, has no FAB or "+", and goes inline on short viewports.
- **Stack of equal cards:** present, **mitigated**. There are three identical GoalCards with the same blue initial arch (W, P, H), but the total is bare and Shopping is a lighter row. Real cover photos will break the sameness.
- **Greeting plus avatar header:** present, **DS canon**.
- **Chevron list rows** (Shopping, pick list): present, conventional and appropriate.
- **Two saffron blocks for 6 s** during "Goal reached" (the countdown cell plus the toast): present, **allowed** by the IA ("one saffron moment at a time; the countdown is unaffected"). Noted, not re-opened.
- Absent: skeleton shimmer (static blocks), confetti, emoji or time-of-day greeting, dashed empty slots, illustrated empty states, an animated counter, and a phone column stretched on desktop (1440 splits 5 | 7; 768 has the opposite problem, F6).

## Round 2

# Design critique: Home, verification after fix round 1     VERDICT: PASS     CONFIDENCE: medium

**Evidence.** I opened every PNG in `screenshots/` (populated ×6, small ×2, the 8 states plus first-run at 320 and 1440, sheets ×7, toasts ×8, live). Two of them predate the 16:01 build (see R2). The rest are current. I also drove the **real** `home.html` in headless Edge over CDP, with no copy, and saved those shots to `screenshots/critic/r2-*.png`:
- **Touch flow:** touch taps, then key presses, then a touch tap on the submit (`r2-touch-add`).
- **Keyboard flow:** Enter, Enter, digits, Enter (`r2-kbd-add`).
- **iOS keyboard, simulated:** a stub `visualViewport` whose height shrinks by 336 px at 844 and by 260 px at 667 and 568, while the layout viewport stays put (`r2-ios-kb-*`).
- **Android keyboard, simulated:** with `resizes-content`, the viewport shrinks to 390×508 and 320×308 (`r2-android-kb-*`).
- **Re-shoots:** percent at 320, first-run at 768 and at 1440 dark, joined-empty at 1440.

**Not verifiable from this setup:** a real on-screen keyboard (both keyboards above are simulations), real safe areas, the owed thumb test, motion, the 10 s toast timing and pause, and screen-reader output. The kit references are still unreadable from this session.

### Round-1 findings against the current build

| # | Status | Evidence |
|---|---|---|
| F1 keyboard over submit | **Mostly fixed** | `interactive-widget=resizes-content` is present. `placeSheet()` lifts the sheet by the keyboard height. Simulated: at 390 the sheet is at 142–508 with a visible area of 508, and at 375 it's at 41–407 of 407. The submit is visible in both. A residual at 568-tall phones remains (R1). |
| F2 code splits at 320 | Fixed | `state-first-run/320x568`: "K7QM-4XPA" on one line with Copy beside it. |
| F3 Shopping below the fold | Fixed | At 390×844 the Shopping row is at 364–416. It's also above the dock at 320×568. |
| F4 widowed "Nov" | Fixed | The line breaks after "Rif mountains ·", and the range stays whole at 320, 375 and 390 in every trip state. The prompt now ends "Plan your / first one.", which is acceptable. |
| F5 dock–tab gap, ring after touch | Fixed (the thumb test is still owed, a known gap) | Gap measured at 16 px (764 → 780). After a touch add, `#primary` has focus with `:focus-visible` false and no outline. After a keyboard add the 2 px ring stays. The ring in the `toast-*` shots is correct: those fixtures commit without pointer input. |
| F6 768 column hugs left | Fixed | Content spans 16–752 and lines up with the top bar. |
| F7 first-run anchors | Fixed | Copy sits beside the code at 768 and 1440. Share code and the greeting share the bottom band. |
| F8 skeleton shift | Fixed | The skeleton's trip, Shopping and goal 1 blocks sit at the same y as populated (210–340, 364–416, 476–612). Goal 2 is at 624 vs 625. |
| F9 fixtures lie | Fixed in code | `toast-added` shows 20,750 and 14,750 with "just now". `toast-completed` shows 26,000, Done, a green bar and "2 open · 2 done". The shot set still mixes builds (R2). |
| F10 inconsistent data | Mostly fixed | Error shows "Home" with no pair. The footnote is scoped to the states that use the placeholders. All-done shows 26,000. The Shopping empty-copy branch was not done (see polish). |

## Scores

| # | Dimension | R1 | R2 | Evidence |
|---|---|---|---|---|
| 1 | Brief fit | 4 | 5 | All four glance answers are above the fold at 390×844. With real touch input, the add, Undo and live loop end on the dock with no stray ring. |
| 2 | Five-second clarity | 4 | 5 | The total, the trip, "7 left to buy" and goal 1 read top-down. There is one verb in the dock. |
| 3 | Hierarchy & layout | 4 | 4 | 768 and first-run are fixed. Joined-empty at 1440 still leaves the 7-column goals side blank (`r2-joined-1440`). |
| 4 | Usability | 4 | 4 | Gap, focus and order are fixed. The keyboard residual on small phones remains (R1). |
| 5 | Craft | 3 | 4 | No widows, the code doesn't split, the skeleton holds. Undo is still 36 px. |
| 6 | Distinctiveness | 4 | 4 | Unchanged and faithful to B. Nothing generic was added. |
| 7 | Responsive & themes | 3 | 4 | 320, 768 and 1440 hold in light and dark. The residual is the 320×568 sheet with the keyboard up. |
| 8 | States & content | 4 | 4 | The fixtures are honest now. One stale shot contradicts the build (R2). |

Average **4.25**, no dimension below 3, no blocker: **PASS**.

## Findings (still open)

### [Minor] R1 · On 568-tall phones the amount sheet is taller than the space above the keyboard
Where: quick-add amount step, 320×568. `placeSheet()` sets only `bottom`, and `.sheet{max-height:min(88dvh,40rem)}`.
Saw (simulated): **iOS:** the sheet sits at −58 to 308, so "Add to a goal", "Adding to Wedding fund" and the close button are above the screen (`r2-ios-kb-320`). The field and submit are visible. **Android at 320×308:** the sheet is capped at 271 px and its content is 366 px, so the submit at 287–331 is cut off by the keyboard edge at 308 (`r2-android-kb-320`). The build notes say "submit moved directly under the field", but the helper and "Add a note" (44 px) still sit between them, 92 px in all, down from 122.
Violates: B's promise that the whole add fits in the bottom third, and Nielsen #3 (the close control and goal context are out of reach). It affects the smallest phones only; 375×667 and up are fine in simulation.
Fix:
1. In `placeSheet()`, also set `sheet.style.maxHeight = (visualViewport.height - 8) + 'px'`, and clear it on close.
2. Change the CSS cap to `max-height:min(calc(100dvh - var(--space-2)),40rem)`.
3. Move "Add a note" and its field below the submit, so the order is field → helper/preview/error → **Add contribution** → Add a note → Change goal. That brings the gap between field and submit to about 48 px, and both fit in a 308 px visible area.
4. Then correct the build-notes line.

### [Minor] R2 · Two shots in the "current build" set are from the old build
Where: `screenshots/state-first-run/1440x900-dark.png` (15:43) and `screenshots/sheet-percent/320x568-light.png` (15:45). The build is from 16:01.
Saw: the 1440 dark first-run still shows round 1. Copy floats at x≈992, away from the code, and the footnote names "Paint the guest room" and "Honeymoon". Both are fixed in the build (`r2-first-1440-dark`). The percent shot happens to match the current build.
Violates: this set is the port spec, and `build-notes.md` says all of it is current.
Fix: re-shoot both files from the current build, or replace them with `critic/r2-first-1440-dark.png` and `critic/r2-percent-320.png`.

**Polish (one line):**
- `.toast-undo{height:36px}` is still off the 32/44 scale.
- `shopHTML()` still shows the joined-empty "Nothing on the list yet." for any `shopLeft === 0`, so `home.shopping.none` ("Nothing left to buy") is never used.
- Joined-empty at 1440 leaves the goals side empty; let the rooms span 12 columns.
- The trip prompt and the Shopping prompt still don't have parallel titles.
- The all-done total of 26,000 assumes the other two goals are percent goals, but in populated Honeymoon is a 30,000 MAD goal. This isn't visible on screen and is fine as a standalone fixture.

## Protect
1. **Pointer-aware focus return** (`lastPointer` + `focusVisible`). Touch users get a quiet dock and keyboard users keep the ring. Don't let a refactor collapse it into a plain `focus()`.
2. **The bottom-third geometry and the commit/undo/live loop** from round 1. Both are intact. The toast is still 8 px above the dock, and the sheet now rides the keyboard.
3. **The phone order trip → Shopping → goals**, which answers the brief's four glance questions without scrolling and matches the desktop columns.

## Tells count
Unchanged from round 1. The sticky bottom CTA is justified, the equal-card stack is mitigated, the greeting plus avatar is DS canon, and the chevron rows are conventional. No new tells.
