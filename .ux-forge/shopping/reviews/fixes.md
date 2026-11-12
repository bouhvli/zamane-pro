# Fix pass (the one allowed after the single review round)

Sources: Critic (PASS, conditional on 3 majors; avg 3.75) and Accessibility (FIX REQUIRED, 0 blockers, 5 majors). Apply all of the below, re-shoot, no further review.

## Critic majors
C1. `?state=long`: group heads and item names clip. In list.css raise `.r-title` clamp to 3 lines (the sheet shows the full name); let the group head wrap so the subtotal never squeezes the leader; allow notes to wrap onto their own line in `.r-meta` at narrow widths.
C2. `?state=offline`: Home group says "0 items" while a ticked row is still shown (rows ticked in place). Count rendered rows, and make the group subtotal agree with the summary line.
C3. `?state=empty`: dead end, about 600px of blank space. Add an inline cue that points to the add field (text and arrow on phones, the masthead field on wide), as Goals/Trips empty states do.
Critic minors: summary toggle gets a visible "By group" label; check main bottom padding clears dock + nav; bought-name contrast >= 6:1 if it is below.

## Accessibility majors
A1. list.js onTick: after Z.setBought, a debounced (about 400 ms) Z.announce("<name> bought. N left to buy." or "<name> put back. N left to buy."). Toast stays silent.
A2. Undo toasts (o.undo) persist at least 30 s (pause on hover/focus), never keyed on lastPointer; announcement text "Undo available. Press Escape to dismiss."; Ctrl+Z (while an undo toast is visible and focus is not in a text field) triggers it; toast sits after #view at the end of main in DOM order. After Undo, focus the restored row via Shop.focusRow(id), fallback add field.
A3. dialogs.js popstate: if the sheet has an open confirm, Back closes the confirm only and re-arms the sheet's history entry. Give Z.confirm its own history entry (push on open, pop on close) so Back dismisses any confirm.
A4. list.js quiet(): return false while focus is inside the list body; when the focused row is removed, move focus to Shop.neighbour(id), not the add field.
A5. #add-msg: announce the character count only at 20/10/5/0 left; remove role="status" from #add-msg (keep as aria-describedby); duplicate hint and "Type what you need" go through Z.announce (or a separate persistent status node).

## Accessibility minors to apply (cheap)
- `.sum-count:focus:not(:focus-visible){outline:none}`.
- Tick name: `name, quantity N` when N > 1; row button aria-label `name, details`.
- Pencil stroke at calc(50% + 2px), opacity 1, 1.5px.
- Done-group toggle: plain text (not a button) when there are no groups to collapse.
- Escape in the add field clears the value and keeps focus (no blur).
- Permanent empty role="status" node in #view for the skeleton; keep role="alert" permanently on #if-summary.
- Combobox: Home/End, announce suggestion count after typing, Escape or second click closes.
- `.btn-*`, `.toast-undo`, `.field input` use min-height instead of height.
- `@media (max-height:32rem)`: dock, nav and .if-bar become static; toast above.
- dir="auto" on .r-title and .r-notes.
- Skip to add item link.
