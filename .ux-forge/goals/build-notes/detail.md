# Build notes: goal detail (`#/goals/:id`), direction B · Doorway

**Files (mine only):** `detail.js` (replaces the stub), `detail.css`. Nothing in `shared.js`, `zamane.css`, `goals.html` or the other views was touched.
**Not read:** the kit (`protocol.md`, `modern-web.md`, `accessibility.md`) is outside the folders this session can read. The binding spec came from `decision.md`, `directions.md`, `ia.md` and `copy.md`.

## What was built
- **Summary.**
  - The doorway comes from `Z.doorway(g,'detail')`: full width, 3:2 with a photo or 2:1 bare, capped at 15 rem.
  - The h1 is `display` 40/44 with `overflow-wrap:anywhere` and a Done badge beside it.
  - The date line is one of three: "by {date}", "Target date was {date}" (neutral ink), or, when done, "✓ Reached {date} · {name}" in zellige-ink, which replaces the "by" line (B's sketch).
  - The description clamps behind More/Less.
  - The progress block shows the numeral, then "of … · … to go" (or "· … over"), then the bar with its % end label. On a done goal a ghost button follows: "Add more" for money, "Update progress" for percent.
  - "Who put in what" (or "Who updated it") is two equal cells in slot order, with avatar rings only. A solo partner gets one cell plus the line "Your partner hasn't joined yet." With no entries, "No contributions yet" / "No updates yet" replaces the share and the stats.
  - Stats is a disclosure inside an h2 below 64 rem, remembered in `localStorage` (`zamane.goals.statsOpen`, wrapped in try/catch). From 64 rem it is the always-visible line.
- **Primary.**
  - It reads "Add to this goal" or "Update progress", and opens `Z.quickAdd`. On a done goal it reads "Write a note" and pushes `?note=new`.
  - It sits in the DOM right after the progress block, and the toast follows it.
  - It floats on phones, sits at the end of the progress line at 48–64 rem, and sits on the title line, after Edit, from 64 rem.
  - It is updated in place, so focus survives a label change.
  - Loading, error, not-found and deleted have no primary (`Z.setFab(false)`).
- **Tabs below 64 rem.**
  - ARIA tabs with automatic activation: ←/→ (mirrored in RTL), Home and End, and a roving tabindex.
  - Tab names carry the count ("History, 7 contributions"); the visible count is a badge.
  - `?view=` is replaced, never pushed. The selected tab is marked by the nav's 8 px majorelle diamond centred on the hairline (Highlight plus underline in forced colours).
  - A panel with nothing focusable gets `tabindex=0`.
  - If the tablist is above the viewport when a tab is selected, the page scrolls it back into view (instantly under reduced motion).
- **Side by side from 64 rem.** Both feeds show, each with its own h2 (visually hidden inside the tab panels below 64 rem). The roles are switched by `matchMedia`.
- **History.**
  - Month groups with an h3 "{month} · {total} MAD". The total covers the whole month, not only the loaded page.
  - Each row is a single `<button>` named with the full copy sentence ("Sara added 500 MAD, bonus month, Sat 7 Nov").
  - Rows are at least 56 px and sit on the sand with hairlines between them.
  - A queued row shows cloud-off and "Waiting to sync", linked to the button with `aria-describedby`. A new row reads "just now" and is refreshed every 30 s.
  - "Show older" loads 30 more, focuses the first new row and announces "{n} more loaded."
- **Journal.**
  - Each note is an `<article>` with an h3 "{name} · {date}" (`#note-<id>-h`, `tabindex=-1`).
  - Edit appears on my notes only and pushes `?note=<id>`.
  - Text blocks clamp at 12 lines behind Read more.
  - Photos are full text width in 4:5 arches, capped at 28 rem. Each photo is a button named "View photo" and described by its alt.
  - With uploads off, photos show "Photo unavailable". Offline, uncached photos show "Photo not available offline".
  - "Write a note" sits at the top of the journal, with the offline helper under it. It is hidden on a done goal.
  - The empty state uses the uploads or no-uploads string. "Show older notes" loads 10 more.
- **Entry sheet.**
  - It is a `<dialog class="sheet">` created by `detail.js`, with its own `.dlg-live`. Focus goes to its h2 on open and returns to the row on close.
  - It shows the summary, "{date with year} at {time}" (or "Waiting to sync") and the full note.
  - Its button is "Delete contribution", "Delete update" or "Remove" (queued). Offline, Delete is `aria-disabled` with "Deleting needs a connection." beside it, and the reason is announced when it's pressed.
  - Delete opens `Z.confirm` with the consequence, "will no longer be done." when it applies, and "You can't undo this."
  - Confirming is optimistic: both dialogs close, the row goes, the figures update without animation, focus moves to the next row (or the previous one, or the History h2), and a toast without Undo appears.
  - If the partner deletes the entry while the sheet is open, the body swaps to "Youssef deleted this contribution." and Close takes focus.
- **Photo viewer.** A `<dialog>` named "Photo": full screen on phones, centred at no more than 90 vw × 90 vh from 48 rem. Focus goes to Close, Esc and the backdrop close it, and focus returns to the photo.
- **Completion moment.**
  1. The bar fills in majorelle (400 ms), then turns zellige.
  2. The surround closes after the fill: `{closing:true}`, plus an `animation-delay` of `--dur-fill`.
  3. Home's saffron toast comes from `Z.commitAdd`.
  - With reduced motion there's no fill travel, no delay and an opacity-only surround (the shared rule).
- **Live updates.**
  - My adds, Undo and the partner's adds animate the bar. Deletes and edits don't.
  - Rows and notes inserted above keep the scroll position (manual anchor; `overflow-anchor:none` on the feeds).
  - The partner's acts are announced with the copy strings, never on load or for my own acts.
  - If the goal is deleted under me, the page swaps in place to "Youssef deleted Wedding fund." with Back to Goals, which takes focus. My dialogs close; the composer is left alone.
  - When my own note is saved, the Journal tab is selected so the composer can focus the new heading.
- **Focus.** The h1 (`#gd-title`) gets focus on mount through the shell. Every re-render runs inside `Z.keepFocus`, and every interactive element has an id or a `data-act`/`data-id` pair. `Z.afterRender()` runs after every render.
- **Composer contract.** `Z.composer.sync(route)` is called from `mount` and `update`, and guarded. "Write a note" and the done-goal primary push `?note=new`, keeping `view=journal` when that tab is open. Edit pushes `?note=<id>`. While `?note=` is present, the composer owns `document.title`. `update()` handles `?view=` and `?note=` without remounting and returns true. If the composer pops back to a URL without `?view=`, the tab is kept and the URL is quietly replaced to match.

## How to see each state
`goals.html?state=<fixture>#/goals/<id>`, with `<id>` one of `wedding` (example photo cover), `guest-room` (percent), `honeymoon` (empty) or `sofa` (done). Use a single query parameter only.

| Fixture | What happens |
|---|---|
| `populated` | default |
| `journal` | Journal tab, hash rewritten to `?view=journal` |
| `stats-open` | Stats open (not saved to the device) |
| `loading` | skeleton door, title, figure, share and rows; `aria-busy`; no primary |
| `partial` | identity and progress real; share, stats and feeds skeletons; tabs without counts (static) |
| `offline` | Home's notice plus "Editing, deleting and saving notes need a connection."; Delete disabled; photo shows "not available offline" |
| `error` | "This goal didn't load", Try again ("Trying again", then loads the goal and focuses the h1) |
| `not-found` | "This goal isn't here any more" and Back to Goals (any unknown id does the same) |
| `uploads-off` | initial in the doorway; "Photo unavailable" in the journal |
| `solo` | one share cell plus "Your partner hasn't joined yet." |
| `entry-sheet` | the latest entry's sheet open |
| `confirm-delete` | sheet plus confirmation on top, focus on Keep it |
| `toast-added` / `toast-completed` / `toast-queued` | real `Z.commitAdd` after 60 ms (500 MAD or +10%; the remainder to complete; queued offline) |
| `toast-deleted` | real delete of the latest entry, focus on the next row |
| `live-add` / `live-note` / `live-goal-deleted` | `Z.partner.*` after 300 ms (200 MAD or +10%; a text note on the Journal tab; goal deleted) |

## Tokens and classes added (all in `detail.css`, proposed for the system)
- `--gd-target:44px`: the system's minimum target, used as a literal 44px elsewhere.
- Feed sizes:
  - `--gd-row-min:56px`
  - `--gd-tab-h:48px`
- Journal photos:
  - `--gd-photo-max:28rem`
  - `--gd-photo-ratio:4 / 5`
  - `--gd-photo-off-ratio:2 / 1`
- Wide masthead:
  - `--gd-door-col:22rem`
  - `--gd-door-ratio-wide:4 / 5`
- `--gd-measure:68ch`
- Clamps:
  - `--gd-clamp-desc` (2, or 1 below 22.5 rem)
  - `--gd-clamp-note:12`
  - `--gd-clamp-row:2`

No new colours. The viewer's backdrop is `color-mix(var(--ink) 40%, transparent)`. Skeleton heights mirror the type line heights in px.

Classes are all prefixed `gd-`. The doorway at 64 rem and up is set upright here (`.gd-door .door--detail{aspect-ratio:4/5;max-height:none}`), as `zamane.css` asked.

## Deviations and why
- **Wide masthead.** The doorway column is `minmax(0,22rem)` against `1fr`, not a strict 5/12. At 1440 a 5/12 column made a 4:5 arch about 420 × 525, taller than the facts, and it pushed the feeds down. Capped, the arch is 352 × 440, about 4.5 | 7.5. History and Journal use the same two columns, so History lines up under the doorway, the way IA's 5 | 7 spread intends.
- **Edit on wide screens.** Edit sits on the title line next to the primary. In the DOM it comes before the h1, because it shares the top row with "‹ Goals" on phones, so the tab order is ‹ Goals → Edit → … → primary.
- **Description at 320 px.** It clamps to one line below 22.5 rem, with "More" inline (22 px of layout, a 44 px target overhang). That keeps "14,250 MAD" at y 392–428, above the floating primary (y 432) and the nav (y 503), which Playwright measured at 320 × 568.
- **More / Less names.** These use the visible "More" / "Less" as the name, with copy's "Show the full description" / "Show less of the description" as `aria-describedby`. Copy's strings as `aria-label` would fail WCAG 2.5.3 (Label in Name). For the Writer.
- **The bar's `aria-label`.** It uses copy's `goal.progress.label` ("{title}: {saved} MAD of {target} MAD, {pct}%"), which repeats the `aria-valuetext`. It is verbatim, but verbose: for the Writer and the Accessibility reviewer.
- **Strings with no key:**
  - Queued percent confirm: uses the delete-percent title.
  - Pending percent attribution: "… · waiting to sync".
  - "Show older contributions": used on percent goals too.
  - Wide percent stats line with no updates this month: the month clause is dropped.
- **Loading.** The visually hidden h1 and the status both read "Loading goal".
- **Example photo button.** Its name is "View photo" while the placeholder shows "Example photo". It is prototype only.
- **Not built (no fixture):**
  - section errors (History, Journal, Stats didn't load);
  - `sync-rejected`;
  - `date-passed` and `over-target` have code paths but no example data.
- **Partial is static.** It never resolves, so it can be reviewed.

## Shared-layer requests (for the Director)
1. **`elsewhere()` doesn't call the previous view's `unmount`.** Going detail → `#/trips` leaves the detail's listeners attached. Change needed in `handle()`: run `views[prev.view].unmount()` before `elsewhere(r)`. My workaround: `mount` tears down first, and every handler checks that the view is still in the DOM.
2. **The offline announcement on the detail.** `Z.setOffline(true)` announces Home's "Adding to goals still works."; the detail's copy is "You're offline. Adding to this goal still works." I re-announce after 120 ms. Proposal: let `Z.setOffline` take the message from a view hook (for example `Z.offlineMessage`), or emit `'connection'` after its own announce so a view can override it.
3. **`Z.announce` picks the first `dialog[open]` in DOM order, not the topmost.** It works today only because my dialogs are appended after `#confirm`. Proposal: track a stack of opened dialogs and use the last one.
4. **Fixture-only offline.** `toast-queued` sets `Z.offline = true` directly, to avoid an announcement on load. Proposal: `Z.setOffline(bool, {silent:true})`.
5. **Danger button disabled state.** `.btn-danger[aria-disabled="true"]` (opacity .5, not-allowed) is missing from `zamane.css`. I scoped it to `.gd-sheet`; it belongs next to the primary and secondary rules.
6. **Dialog sizing vs the IA.** The confirmation is a bottom sheet on phones, while IA 6.5 says "small, centred at every size". The entry sheet inherits the shared 30 rem width; the IA says 28 rem. I left both as the shared layer has them.
7. **The composer stub.** It exposes `open/close`, not `sync`, so `?note=` currently does nothing visible until `composer.js` lands. I call `sync` behind a guard.

## Verification
- **Screenshots** in `screenshots/`, all opened and checked:
  - `detail-populated/` (320, 390, 1024, 1440; light and dark)
  - `detail-populated-full/` and `detail-journal-full/` (light and dark)
  - `detail-journal/`, `detail-sofa/`, `detail-sofa-journal-full/`, `detail-guest-room/`, `detail-honeymoon/`, `detail-entry-sheet/`, `detail-confirm-delete/`
  - `detail-toast-completed/` (plus dark), `detail-offline/`, `detail-loading/` (320, 390, 1440)
  - `detail-toast-added/`, `detail-toast-queued/`, `detail-toast-deleted/`, `detail-live-add/`, `detail-live-note/`, `detail-live-goal-deleted/`, `detail-error/`, `detail-not-found/`, `detail-partial/`, `detail-uploads-off/`, `detail-solo/`, `detail-stats-open/` (390)
  - `detail-tablet/` (800)
  - Full-page captures paint the fixed nav at the first viewport's bottom edge; that is a capture artifact.
- **Playwright checks: all pass, no console errors.**
  - No horizontal scroll at 320 in 11 states; the 320 × 568 fold measurement.
  - Tabs: keyboard, replace rather than push, names with counts, and Tab into the panel.
  - Entry sheet: open, Esc and focus return; Keep it returns to Delete; delete moves focus to the next row and shows a toast without Undo.
  - Offline: `aria-disabled` with its reason announced inside the sheet; a queued Remove.
  - Viewer focus in and out. The composer pushes (`?view=journal&note=new`, `?note=n2`) and Back pops them.
  - Stats is remembered after a reload.
  - Partner completion while the primary has focus: the label changes in place and the announcements are right. Zellige after the fill. Partner removal reopens the goal. A partner note updates the count.
  - My percent add: toast after the dock, "just now", Undo.
  - Wide columns and the roles switch on resize; 48–64 rem puts the primary at the end of the progress line.
  - Focus on the h1 and the document title after a route change.
  - The test script is outside the project; no project file depends on it.

## Fix round 1 (reviews/critique.md, reviews/accessibility.md)
Only `detail.js` and `detail.css` changed. Every number below was measured with Playwright (elementFromPoint and boxes) and checked in the re-shot PNGs. The original 80-check suite still passes after its one expectation update (the row name order).

| Finding | Fix | Measured after |
|---|---|---|
| **Critic F1**: the primary covers "to go" and the bar at 320 to 375 px | At `(max-width:47.99rem) and (max-height:43.75rem)` a photo doorway takes the bare 2:1 ratio (`object-fit:cover` crops it). Below 22.5 rem the progress block's top margin is 12 px. | **320×568:** figure 340–376, "to go" 376–398, bar 410–428; primary top 432.<br>**360×640:** bar 460–478; primary 504.<br>**375×667:** bar 468–486; primary 531.<br>Guest room and Honeymoon are clear too. 390×844 keeps 3:2 (358×239). |
| **Critic F2**: the completion toast hides Done and "Reached" at 320 | F1, plus the Director's shorter on-page toast | Badge 291–311, "Reached" 315–337, toast top 360, in both themes. Focus is on "Write a note". |
| **Critic F3**: a flattened arch from 30 to 64 rem | The shared width cap is kept. The detail starts the doorway at the column's start edge (`margin-inline:0`), flush with the h1. The upright ≥ 64 rem override still wins. | **768:** wedding 360×240 (1.50), sofa 480×240 (2.00).<br>**1024 / 1440:** 352×440 and 338×423 (0.80) with the surround. |
| **Critic F6**: the surround is 9 px from the h1 and inside the gutter | `.gd-door.is-done` pads by gap + ring (7 px), so the ring frames the door inside its box. JS toggles the class. | Ring outer edge at x = 16 (the gutter) at 320, 390 and 768. Ring to h1: 16 px at 390 and 768; 12 px at 320, the same as the door to h1 on open goals there. |
| **Critic F7**: offline pushes the number off the first screen | Below 48 rem the notice's grid area is after the progress block (the DOM order is unchanged). From 48 rem it stays at the top. | Offline 320×568: figure 340–376 above the primary (432); the notice starts at 444. |
| **Critic F8**: focus after Edit → Cancel or Save | In `mount`, if `Z.prevRoute` is this goal's edit route, Edit gets focus (`Z.focus`, pointer-aware) and the view returns `'focus-handled'`. | After Back from Edit, `activeElement` is `#gd-edit`. |
| **Critic F10**: example labels and empty states | The footnote shows only for seeded goals (example data or Home's placeholders), not for a goal created in the session. With no entries, "Who put in what" is dropped and History's empty state says it once. The loading skeleton is a real `.door--detail` box with `has-photo` taken from the cached goal. | New goal: no footnote, no share, no "0" badges. Honeymoon keeps the footnote. Skeleton = loaded door at 320 (288×144), 390 (358×239) and 1440 (352×440). |
| **Critic polish** | The "0" count badges are gone, in the tabs and the h2s; the names still say "0 notes". The photo-to-text gap is fixed: `.gd-text{margin:0}` was beating the sibling rule, and the photo's description now sits inside its button. In dark mode the example placeholder is on `surface-raised`. | Photo to next text: 16 px (was 0). |
| **A11y**: the progressbar name repeats its value | `Z.bar(g,{label:g.title})`; the value stays in `aria-valuetext` | name "Wedding fund" |
| **A11y**: the row name reorders the visible pieces | Order: what, date, note, e.g. "Sara added 500 MAD, Sat 7 Nov, bonus month" | checked in the test |
| **A11y**: Edit hit area 41 px | `.gd-edit::before` extends by the 44 px target plus 4 px | elementFromPoint height 52 px |
| **A11y**: two offline announcements | `Z.offlineMessage = "You're offline. Adding to this goal still works."` in `mount`. The 120 ms re-announce is deleted. `toast-queued` uses `Z.setOffline(true,{silent:true})`. | MutationObserver on `#live`: exactly one sentence |
| **A11y**: disabled buttons at opacity .5 | My scoped `.gd-sheet .btn-danger[aria-disabled]` rule is removed; the solid sunken rule in `zamane.css` now applies. | n/a |
| **A11y**: amounts and user text without direction | `dir="ltr"` on the numeral, row amounts, share amounts and month totals. `dir="auto"` on the h1, description, note text, row notes and the entry note. | n/a |
| **A11y**: live regions inserted already populated | Loading `role="status"` and error `role="alert"` are rendered empty and filled 50 ms later | the alert holds "This goal didn't load. Try again." |

**Superseded in the sections above:**
- the bar-label deviation (now the title only);
- the row-name example (new order);
- "No contributions yet replaces share and stats" (the section is now dropped);
- Shared-layer requests 2, 4 and 5, now done by the Director.

**Still open:** the tab diamond can touch the nav diamond when the tab hairline scrolls to just above the bar. That is scroll-dependent and was left as is.

**Screenshots** (overwritten, 320×568, 360×640, 375×667, 768×1024 and 1440×900, light and dark): `screenshots/detail-populated`, `detail-sofa`, `detail-guest-room`, `detail-honeymoon`, `detail-journal`, `detail-toast-completed`, `detail-offline`, `detail-loading`, `detail-entry-sheet`, `detail-confirm-delete`.
