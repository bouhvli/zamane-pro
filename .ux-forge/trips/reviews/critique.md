# Design critique: Zamane Trips prototype (list, detail ×4 statuses, in-trip dialogs, create/edit)     VERDICT: REVISE     CONFIDENCE: high

**Evidence.** I opened the builders' PNGs in `screenshots/`: list-*, detail-* (all four trips), dialog-* and form-*, at 320/390/1024/1440, light and dark. Some captures were older than the last `detail.js`/`list.css` edits, so I re-shot with the current code into `screenshots/critic-*`: chefchaouen, lisbon, fes, list, places, essaouira-prep, each at 390/768/1440 in light and dark. Where a new shot disagreed with an old one, I used the new one. The "Packing · 0 of 5" break and the "1 Jan 1970" row are both fixed now.

**Limits.** The kit's `protocol.md`, `principles.md`, `anti-generic.md` and `checklist.md` were blocked by the read permission (outside the working directory). I judged against the workspace docs and the standard canon instead. I didn't test with a screen reader or on real devices.

**The five holds:**
- **One saffron block per screen:** held on every screen I saw.
- **Dashed ideas vs solid commitments:** held, including the sheets, Schedule and the budget breakdown.
- **320×568 during-trip fold:** held in the default state in both themes. It fails offline (F1) and degrades as the day goes on (F2).
- **Goals-family consistency:** held. The only drift is the 80 rem width (F9).
- **No Directions or maps links:** held. Grep finds no maps URL or Directions control in js/css/html, and every location is plain text.

## Scores
| # | Dimension | Score | Evidence |
|---|---|---|---|
| 1 | Brief fit | 4 | The primary changes with status: Add to the plan, then Add a place, then none after the trip. "What's left" answers "what's left to sort out". During the trip, Plan opens on Today with Now and Next. Weak point: the during-trip answer only holds in the fixture's ideal morning (F1, F2). |
| 2 | Five-second clarity | 4 | The list leads with the lit band ("12 days to go · Next trip"). On the Lisbon detail at 320, the Now cell is the first thing the eye lands on. On desktop, the plan starts below the fold (F3). |
| 3 | Hierarchy & layout | 3 | Phones are strong. On wide screens the summary band is 480–560 px tall. At 1024×768 no plan row is visible, and during the trip the 270 px budget block sits above Today. The list has lone half-width tiles. |
| 4 | Usability | 4 | Conventions, Undo toasts, aria-disabled controls that say why, Discard guards and 409 merges are all present. One misleading control: the budget bar with no budget is drawn 100 % full and reads as "100" (F4). |
| 5 | Craft | 4 | Spacing, radius and shadow logic are consistent, and the serif chapters are handsome. Slips: "~150 / MAD" wraps (F5), the arch thumb floats like an avatar (F6), stacked dialogs collide (F7), the left edge jumps between list and detail (F9). |
| 6 | Distinctiveness | 5 | B is executed precisely. The light moves from the list band to the detail band to the Now cell, and disappears between entries and after the trip. The zellige tally and C's pencil-and-ink bar are both clearly ownable. |
| 7 | Responsive & themes | 3 | Dark mode holds everywhere: saffron-soft becomes deep amber, and the danger bar is readable. But the 320 fold breaks offline, which is the brief's typical in-trip condition, and 1024 is all summary. |
| 8 | States & content | 4 | States are covered thoroughly: loading, partial, section-error, not-cached, live-deleted, queued ticks, conflict, cover failed. The copy is specific. Small copy slips are in the polish line. |

Average 3.875, with one blocker. **REVISE.**

## Findings

### [Blocker] Offline during the trip pushes the Now row off the 320×568 screen
Where: detail, Lisbon, 320×568, light and dark, `#td-notice`, rendered in `detail.js` ~l.189–191, styled at `detail.css` l.98–100 and l.226.
Saw: `detail-lisbon-offline/320x568-*`. The notice runs 5 lines (y≈182–318). The tabs drop to ≈335 and Today's heading to ≈435, where the FAB covers it. The Now row isn't on screen at all. The builders listed this as a known gap; I'm ranking it higher.
Violates: decision.md's fold hold. The brief says in-trip use is "phone, one hand, often a weak connection", so offline is the normal case here, not an edge case. Also Krug's "what's next today at zero taps".
Fix: during the trip, below 64 rem only (`.td--now`), render a **single 13/18 line** in a 32 px notice: cloud-off icon plus "Offline. Ticks and new places sync later." (≈41 characters, fits 288 px; new copy key, send to the Writer). Drop the second sentence there. Every aria-disabled control already gives its own reason, so nothing is lost. Spend the fold's first give: the 4 px gaps around the tabs go to 0 (`--td-now-air`). Net growth is about +24 px, so the Now row's bottom lands at ≈497, under the 504 limit. Re-shoot `?state=offline#/trips/lisbon` and `?state=tick-queued` at 320×568 in both themes, and check the numbers.

### [Major] Today's answer drifts below the fold as the day goes on, and "Nothing else planned today" doesn't say what's next
Where: detail, Lisbon, phones, `rowHTML()` (done-while-running branch, `detail.js` l.234–246) and `dayHTML()` l.274 (`.pl-left`).
Saw:
- `detail-lisbon-now-nothing-left/320x568-*`: under "Nothing else planned today", four done cards fill y≈340–568. The Next item (Flight home, tomorrow) isn't on screen, and the caption doesn't name it.
- The fixture's fold only works because exactly one done row (LX Factory, 74 px) sits above Now. Each extra done row pushes the Now row about 80 px further down. By mid-afternoon on a normal day, the Now row is below 504.

Violates: IA D6's hold, which should hold all day, not only at 13:20. Also visibility of system status (Nielsen #1).
Fix:
1. On phones during the trip, draw done rows as **one 48 px line**: tick, title (ellipsis), and "Sara · 12:05" right-aligned in `zellige-ink` 13/18, with the avatar dropped. The sheet keeps the detail. Rows stay where they are, so the "ticked items don't move" rule still holds.
2. When `nn.nothingLeft`, make the caption name the next item and link to it: "Nothing else today. Next: Flight home, tomorrow 18:40". Use a ghost button that calls `Z.detail.showEntry(nextId)`. This needs a new copy key, so send it to the Writer.
3. Add a fixture with three or more done rows before Now, and screenshot it at 320.

### [Major] On wide screens the summary band hides the plan (1024 shows no plan rows; during the trip the budget sits above Today)
Where: detail ≥ 64 rem: `.td-sum` grid (`detail.css` l.325–334), `--td-door-col: 20rem`, `--td-door-ratio-wide: 4/5`, and the budget breakdown.
Saw:
- `detail-chefchaouen-populated/1024x768-*`: the band runs from y 145 to 670, and only the "Plan" and "Places" h2s show above the fold.
- 1440×900: the first plan row is at y≈820.
- `critic-lisbon/1440x900` and `detail-lisbon-trip-now/1440x900`: the always-open budget (figure, bar, two-line caption, type row, Change budget; about 270 px) sits between the title and the columns, and the Now row is at y≈765–835.

Violates: the brief says desktop is "a first-class planning surface", and "Put this on Tuesday" needs the days in view. Content priority (ia §1) puts now/next ahead of the budget during the trip. One focal point per view.
Fix (U1 says the budget stays open on wide screens, and this keeps it open):
- (a) Set `--td-door-col: 15rem`. The 4:5 doorway becomes 240×300, so the doorway no longer sets the band's height.
- (b) Set the breakdown as **one row**: the type figures and the dashed "Ideas not in the plan yet" pill inline, with Change budget at the end of that row. Move the "Planned adds up…" caption into the bar's `aria-describedby` and a small "How it's counted" disclosure.
- (c) During the trip, with no door column, lay the band out as the IA D4 wrote it: identity and status on the left (7), budget on the right (5).

Target: at 1440×900 the first plan row is at y ≤ 600 before the trip, and the Now row is at y ≤ 520 during it. At 1024×768, at least one day heading and one row show.

### [Major] With no budget, the bar is drawn 100 % full and announced as 100
Where: the summary on any trip without a budget. `Z.budgetBar` in `shared.js` l.649–662: `aria-valuenow = … : 100`, and the track spans `planned`.
Saw: `detail-fes-populated/390x844-light` and `critic-fes/1440x900`: "Planned 440 MAD" over a terracotta bar that fills the whole track (solid, then dashed), with no mark. It reads as "maxed out". Every trip created with only a title, which is the brief's quick-capture path, ends up here once costs are added.
Violates: "Numbers are earned" (DS). A progressbar with no maximum is semantically wrong (WCAG 4.1.2 value). Honest data display.
Fix: when `b.budget == null`, return no `role="progressbar"`. Show only "Planned 440 MAD", then a one-line split, "380 in the plan · ~60 in ideas" (the dashed idea pill can be reused), then **Set a budget**. The bar comes back once a budget exists. Apply the same rule to the during-trip compact row.

### [Minor] Amounts break between the number and "MAD"
Where: place cards on phones; `Z.mad` in `shared.js` l.131 (`' MAD'`), and `dialogs.js` l.810.
Saw: `detail-chefchaouen-places/390x844-light`: "Outa el Hammam · ~150" with "MAD" alone on the next line (Goat cheese tasting, Kasbah museum).
Violates: typographic care (amount and unit are one token).
Fix: `Z.mad = n => Z.fmt(n) + ' MAD'`, and the same no-break space in dialogs.js l.810. Alternatively, add `.num{white-space:nowrap}`.

### [Minor] The during-trip arch thumb reads as an avatar or button, detached from the title
Where: Lisbon at 390, 768 and 1440; `.td-titlerow .door--thumb` (`detail.css` l.38–39) and its placement in the wide actions cluster.
Saw: at 390 and 768 a lone "L" tile sits at the far inline end under Edit, 300–500 px from the title. At 1440 it sits inside the button group, just before Edit, where it looks like a third control. Its rounded blue tile echoes the S and Y avatar discs.
Violates: proximity and grouping (Gestalt). The direction says "a 32 × 40 arch at the end of the h1 **row**", meaning attached to the title, not to the actions.
Fix: place the thumb **immediately before the h1 text** (inline-start, 12 px gap, aligned to the cap height) at every width ≥ 22.5 rem, and never inside the Edit/primary group.

### [Minor] Stacked dialogs collide on wide screens
Where: `dialog-confirm-delete-entry/1440x900-*` and `dialog-confirm-delete-place`. `Z.confirm` opens over `#dg-sheet`.
Saw: the sheet's h2 "Hike to the / Spanish Mosque" sticks out above the confirm, cut through its second line. The sheet's own Edit and Delete show below the confirm, so the screen has two Delete buttons.
Violates: one focal point; it creates ambiguity about which Delete is live.
Fix: while a confirm is open over the sheet, set `#dg-sheet` to `visibility:hidden` (it's already inert behind the modal), and restore it on "Keep it". On phones, keep the current behaviour if it looks right there.

### [Minor] List: a section with one trip shows a lone half-width tile
Where: `list.css` grid on phones; `list-populated/390x844` (Fes) and `list-trip-now/390x844-*` (Chefchaouen and Fes, each alone in its section).
Saw: two stacked half-width tiles, each with an empty right half. The screen looks unfinished, even though most couples will have only one or two trips in each section.
Violates: rhythm and balance. (Goals has the same pattern, but its sections hold several goals, so it rarely shows there.)
Fix: on phones, when a section has exactly one non-lead tile, let it span both columns as a horizontal tile (arch 5:4 at 40 % width, text beside it). Same component, so it stays in the family.

### [Minor] The left edge jumps 100 px between list and detail at ≥ 80 rem
Where: 1440; detail `main.wrap:has(> #view > .td)` at 80 rem vs the top bar and list at 1,080 px.
Saw: on the list, the logo, "Trips" h1 and tiles share x = 196. On the detail, "‹ Trips" and the doorway start at x = 96, out of line with the logo directly above.
Violates: alignment, and consistency across a click (the page "shifts").
Fix: on detail routes ≥ 80 rem, widen the top bar's wrap to match (`body:has(.td) .topbar .wrap{max-width:80rem}`), so logo, back link and doorway share one edge.

### [Minor] Polish (one line each)
- Essaouira (past), Places: the caption says "0 ideas" and the panel says "Every idea is in the plan.", but its only place was *visited*. Use a past-trip empty string, for example "No open ideas." (send to the Writer).
- Edit forms keep the example hint under a filled Title ("For example, Weekend in Fes" on `form-edit`, "For example, Dinner on the square" on `dialog-entry-form-details`). Show the hint only when the field is empty, or only on create.
- At 390×844, the floating "Add to the plan" covers the "Places" tab label at load (`detail-chefchaouen-populated/390x844-light`). Add `scroll-padding-bottom` equal to the dock height, so a keyboard-focused tab is never under the FAB (WCAG 2.4.11).
- 409 on the plan item form at 390: the notice says "Check the marked fields", but the first mark (Start time) is below the fold. Make the notice end with a "Go to the first change" link.

## Protect
1. **The moving light.** There is exactly one saffron block on every screen: the list band, the detail band, and the 56 px Now cell during the trip. There is none in dialogs, none between entries, and the band is sunken after the trip. At 320 the Now cell is where the eye lands first. Don't add saffron chips, saffron "Next" labels or saffron headers while fixing F1 to F3.
2. **Ideas vs commitments everywhere.** Dashed `.idea` cards, the dashed facts block in the place sheet and the Schedule dialog, the solid `.commit` card in the plan item sheet, the dashed pencil segment in the bar and the dashed "Ideas not in the plan yet" pill all keep the distinction. Keep them; compacting done rows (F2) must stay solid.
3. **The compact during-trip phone summary and quick capture.** The saffron-ink status line, the 44 px "Budget · 400 MAD left ▾" row, the folded Earlier days, and the create form with only a title (Enter submits). These carry the brief's two speed jobs; F1 should only add one line to that summary.

## Tells count
I judged against the general anti-generic canon, because `anti-generic.md` couldn't be read. There are **0 unjustified tells.** Three are present and justified:
- The image-icon "Example photo" placeholder in the arch. It's labelled example data, and the arch is imagery only.
- An avatar disc on every row and card. This is the DS rule "who did what, always".
- Outlined pill secondary buttons repeated in the Places column (Schedule ×3). These are DS buttons, but they're visually loud next to the dashed cards. A ghost Schedule would keep the ideas "lighter", which is optional.

There's no gradient, glow, glassmorphism, emoji, generic hero, stock imagery or uniform card grid.
