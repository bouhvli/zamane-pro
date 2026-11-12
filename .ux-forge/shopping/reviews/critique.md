# Design critique: Shopping prototype (list, sheet, form, confirms)   VERDICT: PASS (with one fix pass)   CONFIDENCE: medium

Evidence: builders' screenshots in screenshots/ (list 390/768/1440 light+dark, fixtures empty, all-bought, offline, long, item-sheet, item-form-conflict, confirms). I did not re-shoot or run the prototype, so interaction (stroke animation, tick behaviour) is judged from code/notes only.

## Scores
| Dimension | Score | Evidence |
|---|---|---|
| Brief fit | 4 | Count + total at top, per-group subtotals, "N have no price", add dock always reachable, offline queue + Tidy up (1) |
| Five-second clarity | 4 | "7 left to buy · 243 MAD" is the focal line; dock + Add obvious |
| Hierarchy & layout | 4 | Young Serif heads with leader read well; desktop two-column with the slip card is clean |
| Usability | 4 | 44px ticks in 56px rows, rows stay put offline ("Waiting to sync"), conflict banner + "Use theirs" |
| Craft | 3 | Long-text clipping on group heads and names; "0 items" group header offline; sparse empty state |
| Distinctiveness | 4 | Aisle ledger + pencil stroke holds; zellige only for done; no saffron seen |
| Responsive & themes | 4 | 390/768/1440 light and dark all hold; no overflow seen |
| States & content | 3 | Long case truncates meaning; empty state thin; stale "0 items" |

Average 3.75 by raw scores; no blocker, no dimension < 3. Treated as PASS conditional on the Major fixes below (they are small).

## Findings
### [Major] Long names/categories are clipped with no way to read them in the list
Where: 390 light, ?state=long; `.g-name` and `.r-title` in list.css (line-clamp:2), `.r-notes`
Saw: group head "Fresh fruit and vegetables from..." and item "Sparkling mineral water i..." cut off; notes "Ask for the ones with th...". Group head also loses its leader to ~16px.
Violates: Nielsen 8/recognition; ticking an item whose name you can't read is a mis-buy risk.
Fix: allow `.r-title` 3 lines (or clamp 2 but full name in the sheet, and say so via `title`/sheet header); on `.g-name` keep 2 lines but drop the `text-wrap:balance` clamp to 3 lines and let the subtotal wrap below the name under 400px (`.g-head{flex-wrap:wrap}`) so the amount is never squeezed. Confirm the item sheet shows the full untruncated name.

### [Major] Offline: group header says "0 items" while it still shows a ticked row
Where: 390 light, ?state=offline, Home group (`.g-count` text)
Saw: "Home / 0 items" above a bought-offline "Dish soap" row (kept in place by design).
Violates: honesty of content; count contradicts the screen.
Fix: count rows rendered in the group (incl. pending-ticked) or render "1 item · ticked" ; same for the group subtotal so it agrees with the summary line (221 MAD) until Tidy up.

### [Major] Empty state is a dead end
Where: 390 light, ?state=empty (`.empty` region)
Saw: heading + one line at top, ~600px of blank, "Add an item" dock far below.
Violates: first-run clarity; Goals/Trips empties offer a primary action in place.
Fix: add an inline cue pointing to the input ("Type a name, press Add. Quantity and price can wait.") and auto-focus the input on desktop only; optionally tap-target "Add your first item" that focuses `.add-input`. Keep copy per copy.md.

### [Minor] Summary toggle affordance is weak
Where: `.sum-toggle` (chevron after "243 MAD")
Saw: price styled as link-blue with a tiny chevron; reads as a link to elsewhere. Desktop shows the breakdown permanently, which is better.
Fix: add visible label "By group" (as the desktop card does) or aria-expanded text; keep 44px.

### [Minor] Meta line loses information on narrow widths
Where: `.r-meta` (Olive oil row: notes + avatar + "Added by Sara" squeezed, notes ellipsised)
Fix: on <400px put notes on their own line (`.r-notes{flex-basis:100%;white-space:normal;-webkit-line-clamp:1}`) and the "Added by" below; row min-height stays 56.

### [Minor] Fixed dock overlays content in full-page captures; confirm bottom padding
Where: list at 390, dock over Rice/Batteries rows in the capture
Fix: verify `main` has `padding-bottom: calc(var(--dock-h) + nav height + safe-area)` so the last row and the "Example data" footer clear both bars in real scroll. (Likely a capture artefact; the all-bought shot shows adequate clearance.)

### [Minor] Bought checkmark contrast in the done group dark/light
Struck-through names are muted grey; confirm >= 6:1 as decided (run KIT/scripts/contrast.mjs on `.row.bought .r-title`). Light looks ~5:1.

Polish: unify "Clear bought" red-brown in light with the destructive token used on Delete; spacing above "Other" uses the same rhythm, fine.

## Protect
1. Dotted-leader group heads with flush-right tabular subtotals and the matching slip card on desktop.
2. Rows never jump: offline ticks stay in place with "Waiting to sync" and a single "Tidy up (1)" action.
3. Zellige used only for done (checks, Bought heading), flat sand surfaces, no saffron.

## Tells count
Near zero. Possible: uniform vertical rhythm on all group heads (justified by ledger direction). No gradient, no card-per-row, no icon-in-circle tiles.
