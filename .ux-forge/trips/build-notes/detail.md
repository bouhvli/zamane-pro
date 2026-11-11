# Build notes: trip detail (`#/trips/:id`), direction B · Saffron light

**Files (mine only):** `detail.js` (replaces the stub) and `detail.css`. I didn't touch `shared.js`, `zamane.css`, `trips.html`, `list.*`, `dialogs.*` or `form.*`.
**Read:** decision.md, directions.md (Shared ground and B), ia.md (D2–D15, §1, §2, F1/F5/F6/F7/F13/F14, §4.2–4.5, §5.2–5.4, §6, §8), copy.md (§2, Toasts, Live, Accessibility), shared.js, zamane.css, trips.html, Goals' detail.js, detail.css and build-notes/detail.md, and the kit's protocol.md, modern-web.md and accessibility.md (Operable and Robust).

## What was built
- **Summary.** It is one `<section aria-label="Summary">`, in this DOM order at every width:
  1. "‹ Trips" (named "Back to Trips") and **Edit** (`<a id="td-edit" data-act="edit" href="#/trips/:id/edit">`, named "Edit {trip}");
  2. the doorway (`Z.doorway(t,'detail')`), before and after the trip and when undated. Below 22.5 rem a photo also takes 2:1;
  3. the h1: `display` 40/44, or `title-lg` 28/34 during the trip, with the 32 × 40 `door--thumb` at the end of the row from 22.5 rem (hidden below that width);
  4. the status during the trip: "Day 3 of 4 · Happening now" (or "· Last day") as **saffron-ink text**;
  5. the meta: destination · dates. For an undated trip it reads "No dates yet" plus **Add dates** (ghost, `edit?focus=dates`);
  6. the band: before the trip, `Z.lightBand` with the kicker "Next trip · 4 nights" ("Next trip" only when this is the soonest upcoming trip); after the trip, the sunken band "Ended 64 days ago";
  7. the notes, clamped to 2 lines, with "More"/"Less" named "More notes"/"Less notes", `aria-expanded`, shown only when they overflow. They are hidden on phones during the trip;
  8. **What's left** (before the trip and undated): a hidden h2 and two links, "9 prep items left" and "1 must-do not in the plan yet", or "Nothing left to sort out.";
  9. **Budget** (h2 "Budget"):
     - Phones and tablets: a disclosure button, "Planned 9,200 MAD of 8,000 MAD ▾", then the bar (`Z.budgetBar`), then "Over by 1,200 MAD" in danger or "{n} MAD left" in ink, and Set a budget when there's no budget. Its open state is remembered in `localStorage` (`zamane.trips.budgetOpen`, in try/catch).
     - **During the trip on phones:** one 44 px row, "Budget · 400 MAD left ▾" with the bar beside it. The full figure moves into the breakdown (fold rule 3).
     - The breakdown: a "Planned adds up…" caption, the types largest first with icons, the dashed Ideas line (with an sr twin, and "Waiting to sync" when a queued place counts), "No cost yet on 2 plan items", and Change budget.
     - From 64 rem it is always open, with the figure and state on one line and the breakdown as a row.
  10. the primary (`#primary`): "Add to the plan" before the trip, "Add a place" during the trip and when undated, none after the trip or in not-cached. It is updated in place, so focus survives a label change.
- **The offline notice** sits under the summary: Home's first sentence, the Trips replacement, and `trip.offline.notice.more`.
- **Tabs below 64 rem.** ARIA tabs with automatic activation: ←/→ (mirrored in RTL), Home and End, and a roving tabindex. The name is "Plan, places and prep" and the labels carry no counts. `?view=` is replaced, never pushed (checked: history length doesn't change). The selected tab gets the nav's diamond. A panel with nothing focusable gets `tabindex=0`. The panel h2s are visually hidden.
- **Columns from 64 rem.** Plan 7 | Places + Prep 5, with Prep under Places. From 80 rem it is 5 | 4 | 3 and `main` grows to 80 rem.
  - The summary becomes a band: the upright 4:5 doorway | the facts, with Edit and the primary on the h1 row.
  - During the trip there is no door column; the thumb sits at the end of the h1 row.
  - Column h2s are serif 28 with a caption ("3 ideas", "4 of 13 done"). Day chapters drop to 24 px.
- **Plan.**
  - **Day chapters:** h3 = serif "Sat 21 Nov" + caption "Day 1" (the text reads "Sat 21 Nov · Day 1"), with **Add** (named "Add to Sat 21 Nov", it pushes `?entry=new&date=`). "Any time" captions the untimed entries, which come first.
  - **Empty days:** a sunken well, "Nothing planned", with the day's Add inside the well (one Add per day, never two with the same name). Runs of 3 or more empty days become single 48 px lines.
  - **Rows:** the tick (`.tick`, `role=checkbox`, "{title} done", `aria-describedby` the attribution) sits outside a sibling solid card button (`data-act="entry"`) that holds:
    - the type icon and an sr type word;
    - the title;
    - the meta: Next · time · location (truncated to one line) · cost · "From Places: X";
    - the attribution: the adder's avatar (floated) with an sr "Added by", or "Done by Sara · 12:05" in zellige-ink;
    - "Waiting to sync" when queued.
  - **During the trip:**
    - **Earlier days:** a closed disclosure, "Earlier days" / "Sat 7 – Sun 8 Nov · 4 of 4 done".
    - **Today:** "Today" (serif) + "Mon 9 Nov · Day 3".
    - **The Now row:** a 56 px saffron **Now cell** ("Now", "12:45", "–14:00") on a saffron-soft body.
    - **The Next row:** "Next" (ink, 600) leads its meta.
    - Done rows during the trip show only the title and "Done by…", which is what keeps LX Factory at two lines (the fold).
    - "Nothing else planned today" when nothing timed is left. Tomorrow's first timed entry is then Next (`now-nothing-left`).
  - **Groups after the days:** "Outside the trip dates" (with intro, full date, and "Before the trip"/"After the trip") and "No date yet". An undated trip shows only "No date yet". The empty strings are `plan.empty.undated` and `plan.empty.past`. Trips longer than 7 days get the "Jump to a day" select plus **Go** (named "Go to day").
  - "Add to the plan" (secondary) sits at the **end** of the panel and is hidden while the primary has that label.
- **Places.**
  - Intro line, and "Add a place" (hidden while the primary has that label).
  - Groups: **Ideas** (must-dos first, then creation order; "Every idea is in the plan." when empty), **In the plan** (by plan date and time), **Visited**.
  - Groups and order are frozen per mount. A place scheduled or visited while on screen updates in place, and new places append.
  - Cards are `.idea` (dashed, no fill). The main button (`data-act="place"`) holds the icon, title, area and "~150 MAD" (sr "About 150 MAD"), the Must-do badge, the avatar with sr "Added by", "Visited · Sun 8 Nov · Youssef", and an sr ", Idea".
  - The sibling is **Schedule** (named "Schedule {title}", it pushes `?schedule=`) or the link **"In the plan · Tue 24 Nov, 17:30"**, which selects Plan and focuses the row without pushing.
  - Offline, Schedule is `aria-disabled` ("Scheduling needs a connection."). A queued place's Schedule reads "This place hasn't synced yet.".
- **Prep.**
  - The intro, then the four groups. Each h3 is "{icon} Packing · 0 of 5", followed by `Z.tally` and Reorder.
  - Rows: the tick ("… packed" / "… done") and the row button (`data-act="item"`) with "Packed by / Done by / Added by" (none on seeded items). Ticked items don't move.
  - **Inline add:**
    - "Add to Packing" turns into a labelled field ("Add an item to Packing"), with Add ("Add to Packing") and Close ("Close, Packing").
    - Enter adds the item, clears the field, keeps focus and announces "Added Sunscreen to Packing.".
    - Esc or Close closes it and returns focus to "Add to Packing". Leaving an empty field also closes it. The typed text survives re-renders.
    - Offline, Add is `aria-disabled` and the helper reads "Adding to the checklist needs a connection.".
  - **Reorder mode:**
    - The toggle's text and name change ("Reorder Packing" → "Done reordering Packing"; no `aria-pressed`, per copy).
    - Move up and Move down are 44 px, 8 px apart. They're icon-only in narrow containers and show their words from 30 rem of container. At the ends they're `aria-disabled` with "First in Packing" / "Last in Packing".
    - Focus stays on the same button of the moved row, or moves to the other one when that button becomes disabled. Each move announces "X moved to 2 of 6.". Done returns focus to the moved row.
    - Offline, Reorder is `aria-disabled`.
- **Disabled reasons:** a press on an `aria-disabled` control shows its reason beside it and announces it once. The reason is always linked with `aria-describedby`.
- **The light leaves (the one motion).**
  - Ticking the Now entry:
    1. the box fills zellige (`--dur-press`);
    2. the card gets `.is-leaving`: the cell goes `scaleX(0)` and fades, the body slides back by the cell width, and the tint fades to `surface-raised` (`--dur-light`, transform and opacity, plus one background-color);
    3. the Plan panel is redrawn as an ordinary done row.
  - The rest of the page updates at once. Next stays where it is. With reduced motion the redraw is immediate.
- **Live partner updates.**
  - Every Z 'change' for this trip re-renders inside `Z.keepFocus`, with manual scroll anchoring.
  - Partner acts are announced with copy's `tripLive.*` strings, never as toasts.
  - If the focused row is deleted, focus goes to the next row, else the previous one, else the panel h2.
  - A partner trip delete swaps the page to "Youssef deleted Chefchaouen." with "Its plan, places and checklist are gone too." and **Back to Trips**, which takes focus. Confirm and sheet dialogs close; URL dialogs are left to dialogs.js.
- **Time.** Now, Next and the status are recomputed every 30 s and on returning to the tab. Only a changed signature re-renders. Nothing is announced.
- **Focus (ia 6.3):**
  - The h1 on forward arrival (the shell).
  - **Edit**, when arriving back from this trip's edit route.
  - What's left and In the plan focus the target h2 or row.
  - Every interactive element has an id or a `data-act` + `data-id` for `Z.keepFocus`.
- **The dialogs contract:**
  - `Z.dialogs.fromRoute(route)` is called in mount and update; update returns true.
  - Rows call `entrySheet`, `placeSheet` and `itemSheet`.
  - The forms open by `Z.go(Z.withQuery(...))`. `Z.detail.showEntry(id)` / `showPlace(id)` / `showItem(id)` / `select(tab)` are exposed so dialogs.js can use them for "Show in the plan" and "From Places".
  - The document title is mine only when no `?entry`, `?place` or `?schedule` is open.
- **Footnote:** `example.trips.detail` on seeded trips (not on trips created in the session). On Lisbon it adds the scenario sentence: `lisbon`, `lisbonLast` or `lisbonLate` by state.

## How to see each state
Open `trips.html?state=<fixture>#/trips/<id>`, with `<id>` = `chefchaouen`, `lisbon`, `fes` or `essaouira`. Use one query parameter only.

| Fixture | What it does |
|---|---|
| `populated` | default (Lisbon is always during the trip) |
| `places` / `prep` | that tab, with the hash rewritten to `?view=` |
| `budget-open` | the breakdown open (not saved) |
| `loading` | skeleton door, title, band and rows; `aria-busy`; hidden h1 and status "Loading trip"; no primary |
| `partial` | identity and status real; What's left, budget and panels as static skeletons, each panel with its "Loading …" status |
| `section-error` | "The plan didn't load." and "The budget didn't load.", each with Try again → "Trying again" → loads, then focus moves to the section |
| `error` | "This trip didn't load", the body, Try again; `role=alert` filled after 50 ms |
| `not-found` | "This trip isn't here any more" + Back to Trips (any unknown id does the same) |
| `offline` | the notice; Schedule, Reorder and the checklist add `aria-disabled` with their reasons; ticks queue |
| `not-cached` | offline; the summary from the "list cache" (identity and status only); each panel reads "This isn't on this phone yet…"; no primary |
| `uploads-off` | the initial in the doorway (shared) |
| `adding-item` | Prep, Packing's field open and focused |
| `reorder` | Prep, Packing in reorder mode |
| `tick-queued` | offline; the Now entry (or the first undone one) ticked with "Waiting to sync" |
| `sync-rejected` | queued tick on Tram 28 (Lisbon) or the first undone entry; after 1.2 s the replay rejects it: the row is removed and the toast reads "Couldn't tick Tram 28. It was deleted." |
| `live-tick` | Prep; Youssef packs Phone chargers (or the first undone item) |
| `live-place` | Places; Youssef adds "Café with a view" (food, ~60) |
| `live-entry` | Youssef adds "Breakfast on the roof", 09:00 on Sun 22 Nov (day 2 elsewhere; no date for Fes) |
| `live-dates` | Youssef moves the trip one day later (Chefchaouen: Sun 22 – Thu 26 Nov); Train to Fes is still outside, the day list rebuilds |
| `live-deleted` | the in-place swap |
| `trip-now` | Lisbon also shows on the list; the detail is as for any id |
| `now-last-day` | Lisbon, Tue 10 Nov 19:00: "Day 4 of 4 · Last day"; Flight home is Now |
| `now-nothing-left` | Lisbon, 21:00: "Nothing else planned today"; tomorrow's Flight home is Next; no saffron on screen |
| dialog fixtures (entry-sheet, place-sheet, item-sheet, confirm-*, entry-form*, place-form*, schedule*, toast-*) | the page renders as `populated`; dialogs.js drives them |

## Tokens added (in `detail.css`, proposed for the system; no new colours)
- `--td-target: 44px`, `--td-row-min: 56px`, `--td-tab-h: 44px`
- `--td-door-col: 20rem`, `--td-door-ratio-wide: 4 / 5`, `--td-wide-max: 80rem`
- `--td-clamp-notes: 2`, `--td-now-air: var(--space-1)` (the 4 px fold gaps)

Everything else uses the shared Trips tokens (`--now-cell`, `--dur-light`, `--light*`, `--bbar-h`, `--light-band-h`).

## Deviations and why
- **The 64–80 rem band** follows B's ≥ 80 rem layout (doorway | identity, light band and budget), not IA D4's "budget on the right". One band at both wide tiers, and the doorway keeps its column.
- **Plan's own "Add to the plan" sits at the end of the panel**, not the top. At the top it would push Today's Now row below the fold during the trip.
- **Done rows during the trip** drop time, location and cost and keep the title plus "Done by…" (the sheet has the rest). This is directions.md's two-line LX Factory row.
- **"From Places: X" in a row is text, not a link.** A link inside the row button would nest interactive elements. The sheet carries the link (dialogs.js).
- **The adder's avatar in plan rows and place cards** is a visual with an sr "Added by {name}"; Prep rows show the visible "Added by Sara", as in the wireframe.
- **Group h3s have no counts** ("Ideas", not "Ideas · 3"): copy.md has no key for one, and copy wins.
- **"Tomorrow" day heading:** copy has only `plan.day.heading` and `.today`, so tomorrow reads "Tue 10 Nov · Day 4".
- **The budget h2:** visible "Budget" kicker plus the button with the figure ("the h2 supplies 'Budget'"). During the trip the button reads only "400 MAD left". Every visible word is in a name.
- **`section-error`** fails two sections (Plan and Budget) so both copy strings can be seen. The IA describes one failing query.
- **The light-leaves motion** is transform and opacity on the cell and body plus a background-color fade, instead of animating the cell's inline size (front-end rule: transform and opacity only). The redraw afterwards reflows the title into the freed width.
- **`main` width at ≥ 80 rem** is set from detail.css with `main.wrap:has(> #view > .td)`. Without `:has` it falls back to 1,080 px.

## Known gaps
- **Offline during the trip breaks the fold.** At 320 × 568 the notice (5 lines) pushes the Now row to y ≈ 535. The hold is met in the default state only. Option for the Director: a one-line notice during the trip, with the rest behind "More".
- The Now row's lines 2–3 sit under the floating "Add a place" at load (Home's accepted trade-off, as directions.md says).
- During the trip, a long title on the Now row (3+ lines at 320) leaves about 18 px of margin; fold rule's first give, the 4 px tab gaps, is the `--td-now-air` token.
- Tab names carry no counts (copy: "no counts"); counts appear only in the 64 rem column captions.
- Reorder sends one `moveItem` per press (shared; ia A4).

## Requests for the shared layer
1. **`Z.focusPrimary` falls back to the h1** when the dock is hidden. That is right after a status change to past; just noting it's relied on.
2. **`Z.dialogs.closeAll()` on partner trip delete:** I call it only when no URL dialog is open, so the forms keep their text behind their own banner (ia F13). dialogs.js should handle `trip-deleted` for open forms.
3. **The shell has no hook for a fixture that needs to run after the dialogs have mounted.** Dialog fixtures are left to dialogs.js, as agreed.
4. **`.btn-sec[aria-disabled]` is styled solid sunken** in zamane.css, which suits Move up/down. A ghost `aria-disabled` (Reorder offline) keeps majorelle text with a not-allowed cursor; its reason carries the state. Consider a shared ghost-disabled style.

## Fixed after looking at the screenshots
- **"No date yet" rows** showed "Thu 1 Jan 1970 · After the trip": that group had reused the outside-dates context. It now has its own context.
- **Place cards** put Schedule beside the body from 20 rem of container (it was 24 rem). A card whose action is the long "In the plan · …" link stays stacked, so its title keeps its width.
- **The Prep group head** is a grid. In narrow containers (≤ 22 rem: 320 phones and the 3/12 column) the tally drops under the heading, so "Packing · 0 of 5" never breaks.
- **The inline add row** stays on one line (Add and Close at 16 px padding). At 320 the input keeps about 140 px.
- **Day chapters** are 24 px from 64 rem, so the serif column h2s lead.
- **`reorder` and `adding-item`** scroll Packing into view, one tick after the shell's scroll-to-top.

## Verification
- **Playwright (Edge, scratchpad scripts, not in the project):**
  - 25 states × 4 trips at 320 × 568: no console errors and no horizontal scroll. The live and toast strings match copy.md.
  - **Fold (320 × 568, Lisbon, Plan, light and dark):**
    - Now row tick y 407–431;
    - Now cell top 392, "Now" and "12:45" inside 392–432;
    - first title line bottom 420;
    - row bottom 473.
    - All within the 432 / 504 limits. The summary matches the directions' skeleton to within 1 px: back 8–52, h1 52–86, status 90–108, meta 108–126, budget 130–174, tabs 178–223, Earlier 227–271, Today 271–315.
  - **Interactions:**
    - Tick Now → `.is-leaving`, then no Now row; focus stays on the checkbox ("Lunch at Time Out Market done", checked); Next is still Tram 28.
    - Tabs: → and End write `?view=` with replace (history length unchanged); the primary pushes `?place=new`.
    - Inline add: two Enters add Sunscreen and Hat with focus kept; Esc returns to "Add to Packing".
    - Reorder: moving to first focuses Move down.
    - What's left → `?view=prep`, focus `#td-h-prep`.
    - The budget disclosure opens.
- **Screenshots** (`screenshots/`, opened and checked):
  - `detail-lisbon-trip-now` (320, 390, 1440; light and dark)
  - `detail-chefchaouen-populated` (320, 390, 1024, 1440)
  - `detail-chefchaouen-budget-open`, `-places`, `-prep` (390 and 1440, full)
  - `detail-fes-populated`, `detail-essaouira-populated` (390 and 1440, full)
  - `detail-lisbon-offline` (320, 390)
  - `detail-lisbon-now-nothing-left`, `-now-last-day`, `-tick-queued` (320, 390)
  - `detail-chefchaouen-reorder`, `-adding-item`, `-section-error`, `-loading`, `-not-cached`, `-live-deleted`, `-partial` (390 light)
  - Full-page captures paint the fixed nav and floating primary mid-page; that is a capture artifact.
