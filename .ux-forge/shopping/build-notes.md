# Build notes: Shopping prototype, part 1 (shared layer + list)

Direction A (Aisle ledger) with C's pencil stroke on bought names. Plain HTML/CSS/JS, no modules, `file://` works.

## Files (all in `.ux-forge/shopping/`)
- `shopping.html` : trips.html's shell (skip link, header/nav with Shopping current, `#main`, `#toast`, `#live`, shared `#confirm`). It already links `dialogs.css`, `form.css`, `dialogs.js`, `form.js`; until part 2 writes them the browser skips them (404 in the console only).
- `zamane.css` : trips' file minus Goals/Trips-only parts (doorway, light band, budget bar, tally, goal cards, FAB dock, task chrome), plus the Shopping additions at the end.
- `shared.js` : `window.Z`. The full API is in its header comment (read that). Same plumbing as Trips; data, derived values and writes are Shopping's.
- `list.js` / `list.css` : the Shopping view.
- Run: open `shopping.html` (or `shopping.html?state=<fixture>`). Fixtures: `populated` (default, 7 left / 243 MAD / 57 MAD bought) · `empty` · `all-bought` · `loading` · `error` · `error-cached` · `stale` · `offline` · `solo` · `live` · `long` · `frozen`. `?focus=add` in the hash (`#/shopping?focus=add`) focuses the add field. Browser offline/online events (DevTools) or `Z.setOffline(true|false)` drive the offline simulation.

## What the list does
- **Add row**: docked above the bottom nav on phones; in the masthead from 48 rem (beside the h1 from 64 rem). Enter or Add creates the row, clears the field and keeps focus. Category is copied from an earlier same-name item (bought included) when `category` is undefined; duplicate hint while typing; "Type what you need." on empty; character count in the last 20; IME composition never submits; **More** calls `Z.dialogs.itemForm({id:null, name:<typed>})` and leaves the typed text in place.
- **Summary**: "7 left to buy · 243 MAD" (the amount is a disclosure on phones, `aria-expanded`, remembered in localStorage; always open as a sticky rail from 64 rem), "2 items have no price.", the till-slip breakdown with dotted leaders and a double rule above "Bought so far". Totals come from item state, never from row positions, never estimated.
- **Groups**: A to Z (Collator base), Other last, oldest first inside; Young Serif head, dotted leader, subtotal; "2 items · 1 without a price" (short form below 360 px).
- **Rows**: native checkbox (24 px visual, 44 px target, zellige), body button (opens `Z.dialogs.itemSheet(id)`), name clamped to 2 lines, quantity, price (never shrinks), one always-reserved meta line (notes, avatar + "Added by X", or "Bought by X · when", "Waiting to sync" with cloud-off, "Couldn't sync" with x). Row >= 56 px.
- **Frozen order**: a layout of ids built on route entry, on foreground after >= 30 s hidden, on Tidy up and before Clear bought opens. A tick changes the row in place (stroke drawn in 180 ms, text muted, meta updates, checkbox is never replaced), so nothing moves. Adds and deletes apply in place; edits that change the category move the row. **Tidy up (n)** in the summary rebuilds, focuses the summary toggle and announces "Moved n items.".
- **Quiet moments**: a partner's inserts/removals are held while a pointer is down on the page and for 1 s after, capped at 5 s, never held while a dialog is open. Counts and totals are not held. Polite one-line announcements for partner acts; 3 adds within 3 s coalesce to "Youssef added 3 items.".
- **Tick** = set state, "Bought X" toast with Undo for 10 s, silent to assistive tech (the checkbox announces itself). **Add** toast "Added X to Y" 4 s, no Undo. Ticking something the partner already bought is a no-op that keeps the first buyer.
- **Bought group**: sunken band, disclosure "Bought · 3" (open when <= 5 items, always open when all bought), quiet amount, **Clear bought** in its head (aria-disabled with a visible reason when offline or while the queue drains). Rows read "Dairy · Bought by Sara · 10:42". Newest bought first.
- **Clear bought** has a built-in confirm (`Z.confirm`, count updates live and is announced if the partner ticks meanwhile) and a 10 s Undo that calls `Z.restore(items)`. If part 2 defines `Z.dialogs.clearBought`, the list calls that instead.
- **States**: populated, empty, all-bought (summary says "Nothing left to buy", calm line, done group open), loading (skeleton, add still works), error (add still works; Try again), error-cached (slim notice + Try again), stale ("Updated 12 min ago"), offline (notice, queued add + queued tick, Clear bought disabled), solo (no avatars, "you"), live (partner adds Eggs at 2.5 s, ticks Butter at 6 s, deletes Dish soap at 9.5 s, clears bought at 13 s), long (120-character name, long note, 60-character category, 1,250,000.50 MAD), frozen (two rows ticked in place and Tidy up (2)).
- Offline: adds and ticks queue and drain in order, 300 ms apart, on reconnect; "Back online." announced; no toast.

## Token additions (zamane.css, no new colours)
`--row-min:56px` · `--tick-hit:44px` · `--dock-h:56px` · `--leader:2px dotted var(--line-strong)` · `--price-w:4.5rem` (declared, unused: prices right-align on the row edge) · `--dur-tick:140ms` · `--dur-stroke:180ms` · `--dur-settle:160ms` · `--dur-wash:2s`. `--ease-out` already existed. New avatar size `.zm-av-xs` (20 px). `.tick` is now a native `input[type=checkbox]` (appearance none, check as a CSS mask), replacing Trips' `role=checkbox` button.

## Deviations (and why)
- **Seed names**: "Milk" (not "Milk 2 L") so that typing "Milk" demonstrates the category copy (the name-key must match). The all-bought fixture totals 243 MAD (7 items) rather than ia's 241.
- **Pronouns**: adds read "Added by Sara" in a pair (the viewer is Sara), "you" only in solo; ticks read "Bought by you" when the viewer bought it (wireframe and `shop.row.boughtBy.self`).
- **Tidy up accessible name** is "Tidy up (2), move 2 items" (visible text first, WCAG 2.5.3) instead of copy's "Tidy up, move 2 items".
- **Row body button** has `aria-label` = item name and `aria-describedby` = a hidden sentence (quantity, price, category in done rows, notes, who/when, sync state), as ia 6.1 asks.
- **Group with all rows ticked in place** reads "0 items" until Tidy up (no copy exists for it).
- **Toast** moved to bottom-left from 48 rem (Trips centres it). Toast gained `silent` and `ms`.
- **Tidy up** animation is a 120 ms fade then rebuild (ia asks for a 220 ms collapse); no collapse animation. Reduced motion: instant.
- Fonts: Figtree 400;500;600;700 (Trips loaded 400;600).

## Known gaps
- The Clear bought confirm and Undo are minimal and live in list.js; part 2 may replace them via `Z.dialogs.clearBought`.
- No item sheet, form, delete confirm, merge, or category combobox (part 2). `Z.dialogs` is a no-op stub in shared.js.
- Not implemented: the "Couldn't sync" state is rendered but no fixture or action produces it (Try again / Remove live in the sheet, part 2); `?focus=add` is handled as a hash query only.
- Pointer-hold logic is verified with a mouse in Playwright, not on a real touch device.

## The contract for part 2 (exact)
- `Z.dialogs.itemSheet(id)`, `Z.dialogs.itemForm({id|null, name?})`, `Z.dialogs.fromRoute(route)` (return true if a `?item=` dialog is open or was opened; called in the list's `mount()` and `update()`), `Z.dialogs.closeAll()`, optional `Z.dialogs.clearBought()`. Override by assigning `Z.dialogs = {...}` in dialogs.js (loaded after list.js).
- The list never opens URL dialogs itself. Forms pop their query with `Z.closeQuery('item')`; the list's `update(route)` returns true so no re-mount.
- Writes part 2 calls: `Z.addItem({id?, name, quantity?, category?, price?, notes?})` (category `undefined` = guess from same-name item, `''`/null = Other), `Z.updateItem(id, fields, {updatedAt})` (-> `{item}|{conflict, current}|{notFound}`), `Z.deleteItem(id)` (-> `{item}` full copy), `Z.restore([rows])`, `Z.setBought(id, bool)`, `Z.clearBought()`. Partner simulation: `Z.partner.<same>`.
- The list reacts to the `'change'` event (types `added|bought|updated|deleted|cleared|restored|synced`): layout, "Added … to …" toast (for any add by me, including from the form), announcements. Part 2 should not toast adds.
- Focus helpers: `Z.shop.neighbour(id)` (read before deleting), `Z.shop.focusRow(id)` (else add field), `Z.focusPrimary()` (add field `#primary`), `Z.focus(el)`. After More closes, focus the add field.
- Offline gating: read `Z.offline`, `Z.queued()`, item `.pending` / `.unsynced` / `.failed`.
- Helpers: `Z.shop.categories()` (suggestions), `Z.shop.spelling(text)`, `Z.shop.key(text)`, `Z.parseMoney`, `Z.confirm`, `Z.backdropClose`, `Z.placeSheet`, `Z.announce` (give dialogs a `.dlg-live` status paragraph), `Z.toast({msg, undo, undoLabel, ms, silent})`.
- Styles to reuse: `.sheet`, `.sheet-head`, `.sheet-actions`, `.confirm`, `.btn-*`, `.icon-btn`, `.field`, `.field-label`, `.help`, `.err`, `.notice`, `.link-btn`, `.badge`, `.zm-av` (+ `-xs`). The sheet's `clip-path` open animation still reads `--fab-zone`, which is kept.

## Screenshots
`.ux-forge/shopping/screenshots/list/`: `390x844|768x1024|1440x900-light|dark.png` (populated, full page), and per-fixture `<fixture>-390x844-light.png` (empty, all-bought, loading, error, error-cached, stale, offline, solo, live, long, frozen), `wide-ticked-1440x900-light.png`.

---

# Part 2: item sheet, item form, confirmations, merge, drafts

Files: `dialogs.js` + `dialogs.css` (sheet, delete and clear-bought confirms, the contract, sheet fixtures), `form.js` + `form.css` (the form, combobox, merge, drafts, form fixtures). `shopping.html` is unchanged. `dialogs.js` replaces the `Z.dialogs` stub and exposes `Z.dlg` (store, say, P, closeSheet) to `form.js`, which exposes `Z.form = {open, fromRoute, leave, closeAll, isOpen}`. Verified in Edge with Playwright (sheet, Back, Edit, Esc, discard guard, Back while dirty, reload draft, save, More then add, combobox keys, invalid, delete + Undo, offline) with no console errors.

## Fixtures (`shopping.html?state=`)
`item-sheet` (Olive oil) · `item-sheet-bought` (Milk) · `item-gone` (partner deletes Mint 0.6 s after the sheet opens) · `delete-confirm` · `clear-bought-confirm` · `clear-bought-live` (partner ticks Butter at 1.2 s: "Clear 4 bought items?" + announcement) · `item-form` (new, "Lemons" as if from More) · `item-form-edit` · `item-form-invalid` · `item-form-offline` (edit, Save aria-disabled, draft kept) · `item-form-conflict` (409, "another phone") · `item-form-live` (the partner's edit arrives before Save: names Youssef) · `item-form-gone` (banner). Screenshots: `screenshots/<fixture>/<size>-<scheme>.png` for item-sheet and item-form (390, 768, 1440, light and dark), and item-form-conflict, item-form-offline, item-gone (390, 768), delete-confirm, clear-bought-confirm, item-sheet-bought, item-form-invalid (390, 1440).

## What it does
- **Sheet** (`#item-sheet`, `.sheet.ish`): title (Young Serif 24, focus lands on it), `x2 · 140 MAD for the whole line`, a dotted-leader "Category ···· Pantry" row (Other when none), notes in full, "Added by Sara · Sat 7 Nov", bought line ("Bought by Youssef · Sun 8 Nov, 10:42", zellige), "Waiting to sync". Actions: **Put back on the list** (bought only) · **Edit** · **Delete**. Offline: Edit and Delete `aria-disabled` with the reason under them, read again on press. Queued unsynced add: Edit disabled "This item hasn't synced yet.", **Remove from the queue** replaces Delete (no confirm, works offline, "Removed X" + Undo re-queues). `failed` row: notice + **Try again** / **Remove**. Partner edits re-render the open sheet in place (focus kept); a partner delete swaps the body to "Youssef deleted Mint." with focus on Close.
- **Back closes the sheet**: opening pushes one history entry (`state.sheet`); Close, Esc and the backdrop pop it; Edit pops it, then pushes `?item=<id>`. Focus returns to the row button (`Z.shop.focusRow(id)`), or the next row after a delete.
- **Delete**: `Z.confirm` ("Delete Mint?", "Youssef added it Sun 8 Nov. It will be removed for both of you." / solo "You added it … It will be removed."), Keep it focused, the confirm button named "Delete Mint"; then the sheet closes, focus goes to the neighbour, toast "Deleted Mint" + Undo (10 s) calls `Z.restore`, then "Restored Mint" (4 s). Already gone: "Mint was already removed."
- **Clear bought** (`Z.dialogs.clearBought`, so the list's built-in one is no longer used): clicks Tidy up first if it is showing, focuses the Clear button (Keep them returns there), the count follows partner ticks and is announced, "Cleared 3 items" + Undo then "Restored 3 items". Focus to the add field.
- **Form** (`#item-form`, `.sheet.if-form`): URL `#/shopping?item=new[&name=…]` or `?item=<id>`; tall bottom sheet on phones (footer always visible, `Z.placeSheet` for the keyboard), centred 28 rem from 48 rem. Name (120, count in the last 20, the "Rice 1 kg" help, `(required)` in the accessible name) · Quantity (− / input / +, Up/Down, 1 to 999, `inputmode=numeric`) · Price (MAD) with "Price for the whole line, not per unit." · Category combobox · Notes (4,000, count in the last 200). Validation on blur after typing, errors linked with `aria-describedby`, summary "Fix 3 fields to continue." above the primary, first invalid field focused, typed junk kept. Ctrl/Cmd+Enter submits. 350 ms simulated save ("Saving…", ignored while pending).
- **Category combobox** (ARIA 1.2, focus stays in the input): suggestions from `Z.shop.categories()` filtered by key; opens on typing, click or Down; Down/Up wrap, Enter picks, Esc closes the list first then (second press) the dialog; "3 suggestions" announced; feed-forward `Will be filed under "Fruit & Veg".` when the key matches another spelling. On a **new** item, leaving Name fills Category with the guess from an earlier same-name item when the field is empty and untouched (Tesler; visible and editable). An empty Category is sent as Other (`''`).
- **Add** from the form calls `Z.addItem` only (the list toasts). More leaves the typed text; once the form has added, the add field is cleared if it still equals the name More passed. Focus goes to the add field. **Save** calls `Z.updateItem(id, fields, {updatedAt})`, closes, announces "Saved." (no toast), focus to the row.
- **Merge**: base, mine, theirs per field (name, quantity, category, price, notes). Only they changed it: their value is written and the field marked "Changed by Youssef" (avatar) or "Changed on another phone" (icon). Both changed: mine kept, "Another phone changed this to "150 MAD"." + **Use theirs** (accessible name "Use theirs for Price"). Notice (`role=status`; focused after a 409, polite and unfocused when live): "… changed this item while you were editing. Check the marked fields, then save again." Nothing editable differs: one silent retry. Marks under Quantity and Price render full width below the pair.
- **Banner**: the partner deletes the item while the form is open: "Youssef deleted Mint. This can't be saved." with **Copy text** / **Close**, focus on it, footer hidden.
- **Drafts**: `localStorage` key `zamane.shopping.draft:<fixture-state:>new|<id>` (debounced 250 ms, also on pagehide and hidden), only while dirty, cleared on save, discard or close. Reload with `?item=` restores it with "Draft restored." + **Discard draft** (confirm). A draft older than the row merges against the new row.
- **Discard guard**: Cancel, X, Esc, backdrop or Back with changes opens `Z.confirm` "Discard changes?" / "What you've typed won't be kept." / Keep editing (focused) / Discard. Back while dirty pushes the query again and asks.
- **Offline**: edit Save is `aria-disabled` + "You're offline. You can save your changes when you're back online. What you've changed stays here."; a new item keeps Add item enabled with "You're offline. This item will be added when you're back online." (it queues). `Z.offlineMessage/onlineMessage` are set while the form is open ("Back online. You can save your changes now.") and restored on close.

## DOM ids and classes for the React port
- Sheet: `dialog#item-sheet.sheet.ish[aria-labelledby=ish-h]` > `#ish-body` (`.ish-head`, `h2#ish-h.ish-title[tabindex=-1]`, `.ish-sum` (`.ish-amt`, `.ish-note`), `dl.ish-facts > .ish-row > dt/dd`, `.ish-notes`, `.ish-by` / `.ish-done`, `.ish-queued`, `.ish-failed`, `.ish-acts` (`button[data-act=put-back|edit|delete|remove|retry|close]`, `.ish-del`), `.ish-reasons`, `#ish-why-edit`, `#ish-why-del`, `p#ish-gone.ish-gone`) + `p.dlg-live` + `p[role=alert]`.
- Form: `dialog#item-form.sheet.if-form[aria-labelledby=if-h]` > `form#if-f` > `.if-head` (`h2#if-h`, close `[data-act=close]`), `.if-body#if-body` (slots `#if-banner`, `#if-restored`, `#if-merge`; groups `#if-g-<field>`), `.if-bar#if-bar` (`#if-why`, `#if-summary`, `.if-acts`, `button#if-submit`).
- Field ids: `if-name` (`if-name-help`, `if-name-count`, `if-name-err`, `if-name-mark`), `if-qty` (+ `[data-act=dec|inc]`, `.if-step`, `.if-stepbtn`), `if-price`, `if-cat` (`role=combobox`, `aria-controls=if-cat-list`, `ul#if-cat-list[role=listbox]` > `li.if-opt#if-opt-<i>[role=option]`, `#if-cat-help`, `#if-cat-match`, `#if-cat-none`), `if-notes` (`if-notes-help`, `if-notes-count`). Marks: `.if-mark`, `.if-mark-conflict`, `.if-mark-text`, `[data-act=use-theirs][data-field]`; notice `#if-notice.if-notice`; banner `.if-banner`, `#if-banner-h`, `[data-act=copy|close-now]`; restored `.if-restored` with `[data-act=discard-draft]`.
- Confirms reuse the shell's `#confirm` (`#confirm-h`, `#confirm-body`, `#confirm-ok`, `#confirm-cancel`); Delete sets `aria-label="Delete {item}"` on `#confirm-ok` while open.
- Tokens added (CSS only): `--ish-w:28rem`, `--ish-max-h:90dvh`. No new colours; merge marks use `majorelle-soft` (saffron stays off this screen).

## Deviations
- **No-match category text** (`shopCat.none`) is a line under the field, not inside the list (the list only renders when something matches); announced politely when it first appears.
- **Put back on the list** closes the sheet (the row unticks in place; focus to its button) and announces "{item} is back on the list." (no string in copy.md; Writer to own it). Its accessible name is "Put back on the list: {item}" (copy's "Put {item} back …" would not contain the visible text, WCAG 2.5.3); Use theirs likewise "Use theirs for {field}".
- **Sheet title** is Young Serif 24 (the list's group heads are 20); the facts reuse the till-slip leader.
- **Quantity max 999 and category cap 60** are the ia A8 assumptions; the category input stops at 80 and errors above 60 so the message can show.
- **409 actor** is "another phone" (the socket is down on that path, as in Goals and Trips); the live path names Youssef. ia F4 U6 names Youssef on a 409, which needs an `updatedBy` from the server.
- **Clear bought** while Tidy up is showing: the click on Tidy up moves focus and announces "Moved n items." before the confirm opens.

## Known gaps
- Not simulated: "Couldn't delete. Try again.", "Couldn't clear. Try again.", "Couldn't save. Try again." (the `F.failed` path in `paintBar` exists but nothing sets it), a failing Undo ("Couldn't undo…") and the Undo `aria-disabled` reason (offline, pressing Undo shows the toast "Undo needs a connection." and the 10 s window is lost). No fixture produces a `failed` row; test with `Z.item(id).failed = true` then open its sheet.
- The sheet's `popstate` handling is verified with Playwright's `goBack`, not on a device. Forward onto a stale sheet entry does nothing.
- `closeAll()` (route re-mount) stores the draft and closes the form; it comes back only if the URL still has `?item=`.
- Reload on `?item=<id>` of a row that is queued, unsynced or unknown replaces the URL back to the list silently.

---

## Fix pass (after the single review round)

Applied from `reviews/fixes.md`: Critic C1-C3, Accessibility A1-A5 and the cheap minors. Direction A kept. Checked with Playwright (`screenshots/fix/check.mjs`, 40 checks, all pass) and re-shot at 390/768/1440 light and dark: `screenshots/fix/{long,offline,empty,populated,item-sheet,delete-confirm,frozen}/`.

### What changed
- **C1 long.** `.r-title` clamps at 3 lines (was 2) and uses `text-wrap:balance`; the group head wraps (`flex-wrap`), so a long category takes its own lines and the leader plus subtotal drop to the next line instead of being squeezed; `.g-name` clamps at 3. Below 30 rem a note takes its own full line in `.r-meta` (3-line clamp, no leading dot before the "Added by" part); from 30 rem it stays one ellipsised line beside the avatar.
- **C2 offline.** Group heads count the rows on screen: "1 item · 1 bought" over a ticked row, never "0 items". The amount still comes from totals, so it agrees with the summary line.
- **C3 empty.** An inline cue under the empty copy: on phones the cue sits at the foot of the empty area, just above the docked field, with a down chevron; from 48 rem it sits under the text with an up chevron. `.empty` is a flex column with a viewport-based min-height on phones.
- **Critic minors.** The summary toggle shows "By group" next to the amount. Bought names use `--ink-bought` (78 % ink over the surface: 7.3:1 on the sand, 6.5:1 on the sunken Bought band, was 5.8). Body bottom padding already clears dock + nav (checked in `long`).
- **A1.** `onTick` announces once per burst, 400 ms after the last tick: "{name} bought. N left to buy." / "{name} put back. N left to buy." / "Nothing left to buy." The toast stays silent. Undo of a tick announces the put-back too.
- **A2.** An Undo toast lasts 30 s (was 10 s, and keyed on the last pointer), paused on hover and on focus, restarted on leave. Announcement: "{message}. Undo available. Press Escape to dismiss." Ctrl/Cmd+Z runs the visible Undo unless focus is in a text field, textarea, select or contenteditable, or a dialog is open. The toast is the last child of `main` (`shopping.html` and `placeToast`). After Undo, focus goes to the restored row (`Shop.focusRow`), falling back to the add field (tick, delete, clear bought).
- **A3.** `Z.confirm` pushes its own history entry on open and pops it on close (the promise resolves after the pop, so callers that navigate next see the right history). Back closes the confirm only; the item sheet keeps its entry (`sheet:1`). `dialogs.js` popstate re-pushes the sheet's entry if the confirm is asking and the entry is gone. Verified: Back closes the confirm, a second Back closes the sheet, the delete button leaves history balanced.
- **A4.** `quiet()` is false while keyboard focus (`:focus-visible`) is inside `#body`, and the 5 s cap does not force a flush under it; held partner changes apply when focus leaves. Pointer focus on a tick does not hold anything. When the focused row is removed, `renderBody` moves focus to its nearest surviving neighbour row (own implementation next to `renderBody`, so a neighbour removed in the same batch is skipped); the outer `keepFocus` in `flushHeld` is gone.
- **A5.** `#add-msg` has no `role`; it only describes the input. Character count is announced at 20, 10, 5 and 0 left; the duplicate hint is announced once per hint; "Type what you need." goes through `Z.announce` as well as showing.
- **Minors.** `.sum-count:focus:not(:focus-visible)`; tick name "{name}, quantity N" when N > 1; row button `aria-label` "{name}, details"; pencil stroke 1.5 px, full opacity, painted per line of the title (so a wrapped name is struck on every line; a 50 % + 2 px position would miss lines 1 and 3); done heading is plain text (no button, no chevron) when there are no groups; Escape in the add field clears and keeps focus (empty field: Escape falls through and dismisses the toast); permanent `#list-status` (`role="status"`) filled for the skeleton; `#if-summary` is `role="alert"` from the start and never `hidden` (`:empty` collapses it); combobox Home/End (when an option is active), a debounced suggestion count after typing, a second click closes; `.btn-*`, `.btn-sm`, `.toast-undo`, `.field input`, `.add-input` use `min-height`; `@media (max-height:32rem)` makes the dock, nav and form footer static and drops the toast to 12 px from the bottom; `dir="auto"` on `.r-title` and `.r-notes`; "Skip to add item" link.

### New strings (add to the React port and to copy.md)
- Row group sub line: "{n} items · {k} bought" (the " · {k} bought" part only when k > 0).
- Summary toggle label: "By group".
- Empty cue: "Type it in the field below." (phones) / "Type it in the field above." (48 rem and up).
- Tick announcements: "{name} bought. {n} left to buy." / "{name} put back. {n} left to buy." / "Nothing left to buy." after either.
- Add field: "{n} characters left." (spoken at 20/10/5), "Type what you need." (now also spoken).
- Undo toast announcement suffix: "Undo available. Press Escape to dismiss."
- Skip link: "Skip to add item". Loading status text is unchanged ("Loading the list") but now written into a permanent node.
- Accessible names: tick "{name}, quantity {n}"; row button "{name}, details". The suggestion count reuses "{n} suggestions".

### Renamed or added hooks (for the port)
- Added: `#list-status`, `.empty-cue` with `.cue-u/.cue-d/.cue-above/.cue-below`, `.sum-bylbl`, `.done-toggle.is-static`, `.skip-add`, token `--ink-bought`, `history.state.confirm` (confirm entry flag).
- Changed behaviour, same names: `#add-msg` lost `role="status"`; `#if-summary` lost `hidden`, gained `role="alert"`; the toast moved to the end of `main`. Nothing renamed or removed.

### Not fixed, and why
- Pencil stroke "calc(50% + 2px)" was replaced by the per-line gradient above (same intent, correct for 2 and 3 line names). It is drawn on `::after` with `transform`, so motion stays compositor-only.
- Long totals (1,250,303.50 MAD) still push the summary line to wrap on a phone, leaving a dangling "·" after "9 left to buy". Only the `long` fixture does this; a real list would need a separator that hides on wrap.
- Notes from 30 rem up are still one ellipsised line (the item sheet shows the full text).
- Ctrl+Z does not cover the Undo of "Restored" (there is none) and is skipped while a dialog is open, by design.
- Landscape short screens (`max-height:32rem`) were not shot, only written; check on a device.

## Change 3 (unit, date, FAB)

Three user changes, ported in shopping.html, shared.js, list.js, list.css, dialogs.js, dialogs.css, form.js, form.css, zamane.css. Direction A, tick behaviour, pencil stroke, Tidy up, offline queue, Undo toast + Ctrl+Z, drafts, discard guard, category suggestions and the a11y fix-pass behaviours are untouched. Screenshots: `screenshots/c3/<state>/<size>-<scheme>.png` (populated, empty, long, offline, item-form, item-sheet at 390/768/1440, light and dark; also item-sheet-bought and item-form-conflict at 390 light).

### 1. Unit replaces price
- Item field `unit`: stored codes `piece | l | g | kg`, default `piece`. `price` is gone from the item, writes, drafts, merge and fixtures. Quantity stays a whole number, now 1 to 9999 (was 999); `maxlength=4`.
- Display (`Z.shop.qtyText(qty, unit)`): `2 L`, `500 g`, `1 kg`, `3 pcs`, `1 pc` (piece with quantity 1). Thousands use a comma: `1,250 L`.
- Seed: Milk 2 L (bought), Coffee 500 g (bought), Sponges 3 pcs (bought), Butter 250 g, Tomatoes 1 kg, Olive oil 2 L, Mint 1 pc, Dish soap 1 pc, Rice 1 kg (name no longer "Rice 1 kg"), Batteries AA 4 pcs. Offline fixture: Eggs 12 pcs. Long fixture: 1,250 L and Figs 500 g.
- Row: the quantity and unit sit flush right in the name line (`.r-qty`, always shown, also for 1). No "x6" next to the name any more.
- Summary: `"{n} left to buy"` (or `"Nothing left to buy"`) then, when any are bought, `.sum-bought` `"{k} bought"`; Tidy up unchanged. The By group toggle, breakdown, "N without a price" line, group subtotals, Bought total and the currency are removed (Z.mad, Z.parseMoney, `zm-shop-sum` localStorage).
- Group head: name, dotted leader (`.g-lead`), `.g-count` `"{n} item"` / `"{n} items"` flush right. The old second line `.g-sub` ("n items · k bought") is gone; n counts rows on screen.
- Item sheet: one line `.ish-sum` with the quantity and unit (visually hidden prefix "Quantity "), then Category, Notes, who/when. The "for the whole line" note is removed.
- Form: Name, then a pair row: Quantity (stepper) and Unit (`<select id="if-unit">`, options Piece / Litre (L) / Gram (g) / Kilogram (kg), values `piece|l|g|kg`), then Category, Notes. Price field, its help and its errors are removed; the Name help line ("Put units or weight here...") is removed because the unit now has its own field. Quantity errors: "Use a whole number from 1." and "Use a number up to 9999.".
- Merge flow: `unit` is a merged field (`FIELDS.unit`, mark slot `#if-unit-mark`, conflict text shows the label: `Another phone changed this to "Gram (g)".`, Use theirs aria-label "Use theirs for Unit"). The conflict and live fixtures now change Name, Quantity and Unit.
- Drafts: stored values are `{name, quantity, unit, category, notes}` (draft key unchanged: `zamane.shopping.draft:<key>`; an old draft with `price` is ignored because restore only writes known fields).
- Footnote unchanged: "Example data; 7 left, as on Home." / "Example data.".

### 2. No "added by" on rows
- Row meta line (`.r-meta`): optional `.r-notes`, then `<time class="r-when" datetime="ISO">` with the added date and hour. A ticked row (in place or in the Bought group) shows the bought stamp instead. Bought-group rows read `"{Category} · Bought today, 15:10"` in one `.r-when` span. No avatar, no name, no "Added by". Pending/failed flags (`.r-flag`) are unchanged and follow the date.
- Format (`Z.shop.stamp(date, lower)`), relative to Z.now() (Mon 9 Nov 2026 13:20 in the prototype): same calendar day `Today, 14:32`; the day before `Yesterday, 09:05`; older `Mon 9 Nov, 18:20` (weekday, day, month; the year is appended, `Sat 7 Nov 2025, 18:20`, only when it is not the current year). 24-hour clock, zero-padded. Bought rows prefix "Bought " and lower-case only Today / Yesterday: `Bought today, 15:10`, `Bought yesterday, 09:05`, `Bought Sun 8 Nov, 10:42`. There is no "just now" any more.
- Row description (`.r-desc`, the button's aria-describedby): `"Quantity 2 L. {Category. if bought} {notes.} Added today, 14:32."` or `"... Bought today, 15:10."`, plus "Couldn't sync." / "Waiting to sync.".
- Tick aria-label: `"{name}, {qty text}"` (e.g. "Olive oil, 2 L"); always includes the quantity now. Row button aria-label unchanged: `"{name}, details"`.
- Tapping the row opens the item sheet, which says `"Added by {Sara|Youssef|you} · {stamp}"` (avatar `xs` unless solo) and, for a bought item, `"Bought by {you|Youssef} · {stamp}"` with the check icon, e.g. `Added by Youssef · Wed 4 Nov, 19:05`, `Bought by Youssef · Yesterday, 10:42`. The delete confirm body uses `Shop.stamp(createdAt, true)` ("Sara added it today, 14:32.").

### 3. Floating Add item button
- The docked add field is gone: `#addrow`, `.add-input`, `.add-btn`, `.more-btn` (`#add-more`), `#add-msg`, `.add-hint/.add-count/.add-err`, the 120-character counter and its announcements, `MAX`, `lastDup/lastLeft`, and the empty-state cue (`.empty-cue`, `.cue-*`).
- New: `<div class="dock"><button class="btn-primary" type="button" id="primary" data-act="add">[plus icon]Add item</button></div>` inside `.masthead`, after the h1. It is the same `.dock` as Goals and Trips (fixed, 56 px tall, `--radius-lg`, `--shadow-pop`, above the bottom nav with `--fab-gap` and the safe area; from 48 rem `position: static`, 44 px, beside the h1; from 64 rem the masthead gets a bottom hairline). `--dock-h` is replaced by `--fab-zone`: body bottom padding, `scroll-padding-bottom`, toast position (`bottom: nav + safe-area + fab-gap + fab-h + space-2`) and the sheet clip-path all use it, so the last row and the toast clear the FAB. Short landscape (max-height 32rem): the dock joins the flow with the nav.
- Click handler: `data-act="add"` calls `Z.dialogs.itemForm({id: null})`, which goes to `#/shopping?item=new` (history entry pushed) and focuses Name. The `&name=` query parameter and the form's `nameParam` are gone. Closing or saving returns focus to `#primary`; the "Added {name} to {category}" toast is unchanged.
- Pointers to the button: skip link "Skip to add item" (`href="#primary"`), `Z.focusPrimary()` (toast dismiss, clear bought, form close), Home's `?focus=add` (focuses the button, then removes the query). The empty state is only "Nothing on the list yet." plus "Add what you need." / "Add what you need and you'll both see it.".
- All-bought line: "Everything on the list is bought. Add more with Add item, or clear the bought items."
- Duplicate hint moved with the field: when adding a new item the form's Name shows `#if-name-dup` (class `help if-ff`): `"{name} is already on the list ({category})."`, announced once per change. This keeps the old add-field warning now that the field is gone. The React port can drop it if the server already de-duplicates.

### Removed hooks and classes
- DOM/classes: `#addrow`, `.addrow`, `#primary` as an input (now the button), `.add-input`, `.add-btn`, `.more-btn`, `#add-more`, `#add-msg`, `.add-msg`, `.add-hint`, `.add-count`, `.add-err`, `.empty-cue`, `.cue-u/.cue-d/.cue-above/.cue-below`, `.r-price`, `.r-who`, `.r-whotext`, `.g-amt`, `.g-sub`, `.g-unp*`, `.done-amt`, `.sum-toggle`, `.sum-bylbl`, `.sum-sep`, `.sum-amt`, `.sum-note`, `.breakdown`, `#sum-break`, `.slip*`, `.s-name/.s-amt/.s-none`, `.ish-amt`, `.ish-note`, form `#if-price*`, `#if-name-help`, `#if-price-mark`.
- JS: `data-act="sum-toggle"`, `Z.mad`, `Z.parseMoney`, `Z.ago`, `Z.dayTime`, `Z.shop.when`, `Z.isWide`, `Z.onWide`, `Z.setFab`, `localStorage zm-shop-sum`, icons `sliders`, `chevronUp`, `chevronDown`, field `price`, totals `total/priced/noPrice/groups/boughtSum`.
- Fixtures: `item-form` no longer pre-fills "Lemons" (no More link); the others keep their names.

### New DOM ids, classes and strings for the React port
- Ids: `#primary` (button), `#if-unit`, `#if-unit-mark`, `#if-unit-err`, `#if-name-dup`. Data attribute: `data-act="add"`. Classes: `.dock`, `.r-qty` (now the right column), `.r-when`, `.g-count`, `.sum-bought`, `.field-select`, `.sel-ic`.
- Strings (exact): "Add item" (button, form title, form submit), "Skip to add item", "{n} left to buy", "Nothing left to buy", "{k} bought", "{n} item" / "{n} items", "Bought {today|yesterday|Sun 8 Nov}, {HH:MM}", "Added by {name} · {stamp}", "Bought by {name} · {stamp}", "Unit", "Piece", "Litre (L)", "Gram (g)", "Kilogram (kg)", "Use a number up to 9999.", "{name} is already on the list ({category}).", "Use theirs" (aria "Use theirs for Unit"), "Quantity " (visually hidden prefix in the sheet).
- Unit labels: `piece` is "pc" / "pcs"; `l` is "L"; `g` is "g"; `kg` is "kg". Number, a normal space, then the label ("500 g"); "pcs" for piece with a quantity other than 1.
- Aria: the FAB name is its text "Add item"; stepper buttons "Decrease quantity" / "Increase quantity"; the unit select is labelled by `<label for="if-unit">Unit</label>`; the row `<time>` carries `datetime` (ISO).

### Known gaps
- Row meta on phones (< 30 rem): notes stay on their own line, so a row with notes is three lines tall (name, notes, date). Kept from before; the date is the only new line.
- Z.shop.stamp reads "Today" from the prototype clock (Mon 9 Nov 2026); the React port should use the real now and a 24-hour clock.
- Short landscape and the all-bought, solo, frozen and live fixtures were not re-shot after this change (same markup as the shots reviewed). A Playwright smoke run (open FAB, dup hint, add 500 g, tick, open sheet) had no console errors.
