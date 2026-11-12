# Structure & skeleton: Zamane Shopping (the list, quick add, item sheet, item form, clear bought, delete)

**By:** Information Architect · **For:** Writer, Art Director, Design Systems, Director, front-end engineers · Thu 12 Nov 2026
**Read:** `brief.md` (binding); `ARCHITECTURE.md` §4 (shopping_items, §4.3 derived values, category normalisation), §5 (shopping endpoints), §9 (offline mutation map), D14, D47; `.ux-forge/trips/ia.md` (D5, D9, D13, D14, F-flows, realtime table), `.ux-forge/goals/ia.md` (§6.7 three-way merge), `.ux-forge/home/ia.md` + `copy.md` (`shoppingLeft`, "Nothing left to buy", "Start a shopping list"), `.ux-forge/nav-bar/brief.md` (Shopping is the fourth tab, `shopping-basket`). `src/worker/services/home.ts` confirms `shoppingLeft` = count of `bought_at is null`.
**Not read:** the kit (`protocol.md`, `principles.md`, `accessibility.md`, `styles.md`) is outside the folders this session can read. Laws are cited by name, WCAG by success criterion. There is no `research.md`; if one lands, reconcile §0 against it.
**Document shape:** the same as Trips' `ia.md`: §0 decisions, §1 inventory, §2 navigation, §3 flows, §4 state matrix, §5 wireframes, §6 interaction specs, §7 API needs, §8 open questions, fixtures and example data. Decisions here are `S1`…; architecture decisions are "ARCH D14".
**Copy:** every string is working copy. The Writer owns the final wording. Home's and Goals' glossary applies ("waiting to sync", "Back online", "your partner" only when the name is unknown).

**Breakpoints are Trips':** **phone** < 48 rem (bottom nav, docked add bar) · **tablet** 48–64 rem (top bar, add row in the masthead, one column) · **wide** ≥ 64 rem (masthead add row, list column plus a sticky summary rail).

---

## 0. Structural decisions

### S1 · The primary action is a persistent add field, not a floating button
**Decision.**
- **One component, "the add row":** a text field (label "Add an item", placeholder "Milk, tomatoes ×6…" is *not* used: a placeholder is not a label; visible label via the field's accessible name and a placeholder of "Add an item") plus an **Add** button (44 px) plus a **More** icon-button (`sliders` or `plus-square`; name "Add with details").
- **Phone: docked** to the bottom edge of the page content, directly above the bottom nav (safe-area aware, keyboard-aware: it rides on top of the keyboard and the bottom nav is covered by it, which is fine because the nav is irrelevant mid-typing).
- **Tablet and wide: in the masthead**, on the h1's line (wide) or directly under it (tablet). Not docked, not floating.
- **No floating primary on this screen.** The brief's "floating primary on phones" is the established pattern for pages whose primary opens a *form*. Here the primary is a one-field capture, so the field itself is the primary.
- **Hidden when there is nothing to add to:** never. It is shown in every state except loading-with-no-cache and error-with-no-cache (it would have nowhere to put the item... see S10; in those two states it is shown but `aria-disabled` is not used, because add works from an empty cache; see the state matrix).

**Why (justified against the floating primary):**
- **The job is "add as things run out, one hand, seconds".** A floating button costs: tap → sheet animation → keyboard rises → type → submit → sheet closes → repeat. The docked field costs: tap → type → Enter, and the keyboard stays up for the next item. For a list typed in one go ("milk, eggs, soap") that is one tap for ten items instead of ten. [Fitts, Doherty, Tesler: the system keeps the context open]
- **Thumb reach.** The bottom of the phone is the reachable zone; a field in the masthead is the farthest point from the thumb.
- **It is always there in the shop,** mid-scroll, with no scroll-to-top. A masthead-only field scrolls away exactly when you are deep in the list and remember the lemons.
- **No Hick cost:** the field is the one primary [Von Restorff]; the majorelle **Add** button is the only filled button on the screen. Everything else is ghost or icon.
- **It matches the offline contract.** Add is one of two things that work offline (ARCH §9). A primary that is always usable offline is honest. A sheet would hold a draft; a field just queues.
- **Cost, stated:** the docked bar takes about 56 px on a 568 px-high phone, on top of the 56 px nav. The 320 × 568 hold (S12) proves three rows still fit. And the bar is a field, so it earns its space.
- **The brief says "quick add is a sheet".** Reconciled: the field is the quick add; the **item form (a sheet)** is what **More** opens, pre-filled with the typed text, for quantity, category, price and notes. Reversible: if the user prefers a floating primary, the field moves into a sheet and Enter-to-continue survives (S2). See §8 U1.

### S2 · After adding, the field stays focused for the next item
**Decision.**
- **Enter or Add:** the item is created (client-generated id, optimistic), the field **clears and keeps focus**, the keyboard stays up, and the toast "Added Milk to Dairy" (no Undo; S9) is shown for 4 s and announced politely.
- **Only the name is read.** Quantity, category and price are not in the field. Three Tesler defaults, in order:
  1. **Quantity** is 1.
  2. **Category** is copied from an earlier item with the same name (compared with the category key's normalisation applied to the name: case, diacritics, whitespace), **bought items included**, taken from the cache so it works offline. "Milk" bought last week in Dairy lands in Dairy. No match: no category, so **Other**. The toast names where it went, so a wrong guess is visible and one sheet away from fixed.
  3. **Price** is never copied (it changes).
- **Not guessed from the text:** "Tomatoes x6" is **not** parsed into a quantity. Parsing hides a rule; the name keeps what was typed. "×6" in the name is fine: the brief says units and weights go in the name (ARCH D14). (§8 U2 asks whether to parse a trailing "×N".)
- **Duplicate hint, never a block.** If an unbought item with the same name already exists, a line appears under the field before submit: "Milk is already on the list (Dairy)." Enter still adds. Fixing a double is one tap; blocking a legitimate second "milk" is worse. [Postel]
- **Empty submit:** "Type what you need." under the field; focus stays; nothing is announced twice.
- **Name limit:** 120 characters (ARCH §4.1). The field has `maxlength=120` and a count only appears in the last 20 characters.
- **Focus rules:** the field is never blurred by an add, a tick, a toast, a realtime update or a sheet closing *when the sheet was opened from the field's More button* (focus returns to the field). Tapping elsewhere blurs it as normal.

### S3 · Ordering: groups A→Z with Other last; items oldest first; ticked rows stay put until tidied
**Decision.**
1. **Groups** (unbought items by `category_key`): ordered by display name, `Intl.Collator` (base sensitivity, so accents and case are ignored), ascending. **Other** (null key) is **always last** among unbought groups, whatever its letters. The **done group** is always after everything, even Other.
2. **Items within a group: oldest first** (`created_at` ascending, `id` as the tiebreak). Brief's proposal (newest first) is **rejected**. See why below.
3. **Ticked rows do not move when ticked.** A tick (mine, or the partner's arriving live) marks the row in place (zellige check, muted text, "Bought by Sara · just now"). It **moves to the done group when the list is rebuilt**, which happens only (a) when the route is entered, (b) when the app returns to the foreground after ≥ 30 s hidden, (c) when the person taps **Tidy up** (S4), (d) when a sheet or form that changed the row's category saves (the row moves; that is the person's own act). Unticking in the done group is the mirror: the row stays in the done group, shown unticked, until rebuilt.
4. **Inserts and deletes apply in place** (S5). An added item takes its place at the **end** of its group, a new group takes its alphabetical slot, a deleted row disappears.
5. **Derived numbers update at once** (left count, subtotals, left-to-buy total): they are not row positions.

**Why oldest first:**
- **Stable.** Appending at a group's end means an add never moves a row above it. Newest-first inserts at the *top* of a group, pushing every row of that group down under the thumb on every add, mine and the partner's. [Fitts, spatial memory]
- **It reads like the list was written.** "Tomatoes, then mint" is the order the couple thought of them; position is how people remember a list.
- **Findability of a new item is handled by feedback, not position:** the toast says which group it joined, and its row shows a 2 s "New" highlight when on screen. The row is **not** scrolled into view automatically (a list typed in one go would scroll on every Enter); the toast is the confirmation. For a screen-reader user the announcement is the same sentence.
- **No manual order, no alphabetical-by-name within group:** there is no `position` column (ARCH §4), and alphabetical would insert mid-group on every add.

**Why ticks do not move rows (the shop rule):** the brief's success action 2 is "tick without mis-taps and without items jumping under the thumb". A row that leaves the group on tick shifts every row below it up by one row height, which is exactly when the thumb is heading for the next row. [Fitts; Goals D1 "a list never moves while it is on screen"] The tick still has full feedback (check, colour, the left count falls, the toast offers Undo). Focus stays on the checkbox, so keyboard users are not thrown either.

### S4 · Tidy up: the person decides when ticked rows move
- When one or more rows are **ticked or unticked in place** (waiting to move), the summary shows a ghost button **Tidy up (3)**; hidden when 0. It sits at the summary's right edge, not floating.
- **Tidy up** rebuilds the list in the S3 order: ticked rows go to the done group, unticked done rows go back to their category group. Focus goes to the summary's total toggle (the button itself disappears). "Moved 3 items." is announced.
- **Also rebuilt automatically** on route entry and foreground (S3). Nobody has to press Tidy up; it is there for people who finish an aisle and want the list shorter.
- **When the last item is ticked** the summary reads "Nothing left to buy" at once, but the rows still wait for Tidy up or the next entry. The **all-bought** state (S11) is rendered at the rebuild, not at the tick, so the moment of finishing is not a layout jump. (If the Art Director wants a finish moment, it appears at the rebuild, §8 U4.)

### S5 · Live changes: apply in place, in quiet moments, one polite announcement
- Realtime notices invalidate `['shopping']` and `['home']` (ARCH §7). **No toast** for a partner's act; **one polite announcement** each, mirrored into an open sheet (as Trips).
- **The partner adds:** the row is inserted at the end of its group (or a new group in its slot). **The partner ticks:** the row ticks in place (S3). **The partner unticks / edits:** in place. **The partner deletes:** the row is removed.
- **Quiet moments.** Row inserts and removals are **held** while a pointer or finger is down on the list or within 1 s of its release, then applied together. This stops "my thumb was about to tick the row that just slid". The hold is capped at 5 s. Nothing is held while a sheet or form is open (the list is dimmed and not being touched). Browser scroll anchoring (`overflow-anchor`) keeps rows above the viewport from moving what you see.
- **Counts and totals** are not held.
- **Announcements (working copy):** "Youssef added Eggs." · "Youssef bought Mint." · "Youssef put Mint back on the list." · "Youssef changed Olive oil." · "Youssef removed Dish soap." · "Youssef cleared 3 bought items." Bursts (≥ 3 within 3 s) coalesce: "Youssef added 4 items."
- **Same-item ticks:** set-state, last write wins (ARCH D9) **with one safeguard**: see §7 A1 (a second tick must not steal "bought by" from whoever ticked first).

### S6 · Item sheet is read-only; editing is a separate form; neither is a page
- **Tap the row body** (not the tick) → the **item sheet** (bottom sheet on phones, centred 28 rem dialog from 48 rem, Home's sheet, no URL): name, quantity, category, price ("for the whole line"), notes (full, wrapping), added by + when, bought by + when (if bought). Actions: **Edit** (secondary), **Delete** (danger secondary), **Close**. When bought: also **Put back on the list** (the untick, for people who read before they act).
- **Edit** opens the **item form** as a dialog: bottom sheet on phones (tall, keyboard-aware), centred 28 rem from 48 rem. URL-backed like Trips' form dialogs: `?item=new` or `?item=<id>`; Back closes it behind the discard guard; a reload restores it with "Draft restored." Fields: Name · Quantity · Category · Price · Notes. **More** from the add row opens `?item=new&name=<typed>`.
- **Why a read step:** in the shop a tap on the row body is often "what was that note?" not "change it". Reading first prevents accidental edits [Trips D11]. The cost, one extra tap to edit, is acceptable because editing is the rare act on this page.
- **Why sheets, not pages:** the brief and Home's quick add; task pages (no bottom nav) are for create/edit of top-level things. An item is a line, not an entity.

### S7 · Offline: add and tick work; everything else says so and waits
**Works offline (ARCH §9):** `['shopping','add']` and `['shopping','setBought']`, queued in order, optimistic.
- **A queued row** shows a `cloud-off` icon and the words "Waiting to sync" (not colour alone) in its meta line. It is in the list in its right group, ticked or not. Both a queued add and a queued tick show the same label; a ticked queued row says "Waiting to sync" until the PUT lands.
- **A queued add that is then ticked** queues the PUT after the POST (same id; order preserved by the queue).
- **Everything else needs a connection** and says why next to itself (Goals D8):
  - **Edit** (in the sheet) and **Save** (in a form that was open when the connection dropped): `aria-disabled` with "Editing needs a connection." The form keeps its draft.
  - **Delete** and **Clear bought**: `aria-disabled` with "Deleting needs a connection." / "Clearing needs a connection."
  - **Undo of delete or clear**: needs a connection (§7 A2). An Undo for a tick or an add works offline (it is another setBought).
  - **Exception:** **Remove** on a **queued, unsynced add** cancels the queued add, offline too (Trips D13). In its sheet: **Remove from the queue**, no confirm (it never reached the partner), an Undo toast.
  - **A queued row's Edit** is `aria-disabled`: "This item hasn't synced yet."
  - **Category suggestions** work offline from the cache.
- **The notice** (slim, under the summary, `role="status"` once on entering offline): "You're offline. Showing the latest data on this phone. Adding items and ticking them off still work and sync when you're back online. Editing, deleting and clearing bought items need a connection." (Home's first sentence verbatim; the second adapted as in Trips D13; the Writer owns it.)
- **Back online:** "Back online." announced; the queue drains in order; "Waiting to sync" labels clear row by row, no toast; disabled controls re-enable and, inside an open form, that is announced.
- **A queued add the server rejects** (validation, or the space is gone): the row stays with `x` "Couldn't sync" and two actions in its sheet, **Try again** and **Remove**; an alert is announced once.

### S8 · Totals: the left-to-buy figure is a lower bound that says so
**Decision.**
- **The summary line** (below the h1; the first thing after it; on wide it is the sticky rail's heading):
  - **count:** "**7 left to buy**" (Figtree 600, the number the eye hits). It equals Home's `shoppingLeft`. Ticked-in-place rows are **not** counted (they are bought as far as the data is concerned).
  - **amount:** "**243 MAD**" after it, in a disclosure button (`aria-expanded`), formatted by `formatAmount` (ARCH D47: "20,250 MAD", decimals only when present).
  - **honesty line** (always shown when ≥ 1 unbought item has no price): "2 items have no price." The amount is exactly the sum of the **priced** unbought items; nothing is estimated, averaged or carried from earlier purchases.
- **The disclosure opens the breakdown** (closed on phones, always open on wide; the open/closed choice is remembered on the device as in Goals' Stats): one row per **group**: name, item count, subtotal; groups with no prices read "No prices"; a final line "2 without a price" if any; and, below a rule, "Bought so far · 57 MAD" (sum of priced bought items, quiet). [DS: numbers are earned]
- **Group head:** the category name (h2), "3 items" and the **subtotal** ("175 MAD") on the right. A group with some unpriced items adds "· 1 without a price" in the same line (shortened to "· 1 no price" below 360 px). A group with no price at all shows no amount (not "0 MAD").
- **No unpriced "—" placeholder on rows.** A row with no price shows nothing in the price slot; the group head and summary carry the honesty line.
- **Price is per line (ARCH D14):** the form says "Price for the whole line, not per unit." Rows show "×2 · 140 MAD" and never multiply.
- **0 items priced:** the summary shows only the count; no amount, no honesty line ("Add prices to see a total" is **not** said: nobody asked).
- **Currency** is the space's (`GET /api/home` → `currency`); MAD in the prototype.

### S9 · Destructive and reversible acts: confirm names the consequence, Undo reverses it (10 s)
This area deliberately differs from Trips D14 ("no Undo except my own adds"), because the brief and the architecture call for Undo on shopping, and a shopping line is low-value and re-creatable (but see §7 A2: the *restore* must not falsify attribution).

| Act | Confirm (alertdialog) | Toast with Undo (10 s) | Undo does | Works offline |
|---|---|---|---|---|
| **Tick** | none | "Bought Mint" · **Undo** (latest tick only; replaced by the next) | `setBought false` | yes |
| **Untick** | none | none (the Undo of a tick is an untick; an untick needs no undo, it is itself the undo) | — | yes |
| **Add** | none | "Added Milk to Dairy" **without** Undo (4 s) | — (a mistyped add is deleted from its sheet; §8 U3) | yes |
| **Delete an item** | yes: "Delete Mint?" + "Youssef added it Sat 7 Nov. It will be removed for both of you." + **Keep it** (focused) / **Delete** | "Deleted Mint" · **Undo** | restores the row verbatim (§7 A2) | no |
| **Clear bought** | yes: "Clear 3 bought items?" + "They'll be removed for both of you." + **Keep them** (focused) / **Clear 3 items** | "Cleared 3 items" · **Undo** | restores all 3 | no |
| **Remove a queued add** | none | "Removed Milk" · **Undo** | re-queues the add | yes |

- **Why confirm *and* Undo for delete/clear:** the confirm exists because the data is shared and the act is invisible to the partner until it happens (Goals D5); Undo exists because a one-tap shop gesture is where mistakes happen. The consequence is stated in the confirm: the count for clear bought, and "for both of you".
- **The tick toast is silent to assistive tech** (`aria-live="off"` on that toast): the checkbox's own state change is the announcement, and double-speaking every tick makes a shop list unusable with VoiceOver. Keyboard users have the plain inverse (Space again); the toast Undo is a pointer convenience.
- **Toasts replace each other,** one at a time, 10 s. Newer act, newer toast; only the latest act is undoable through the toast (the older ones stay untickable by hand).
- **Undo failure:** "Couldn't undo. The items are still removed." with **Try again**. Offline: Undo is `aria-disabled` ("Undo needs a connection.") and the 10 s keep running; the toast does not extend.
- **Clear bought** is in the **done group's head**, never at the top, never in the summary (brief). It is `aria-disabled` offline and when the done group is empty it does not render.
- **Toast position:** above the docked add bar on phones (never over it, never over the keyboard); bottom-left on wide. Same plumbing as Trips' `Z.toast`.

### S10 · The done group: collapsible, last, one line per item, who and when
- **Head:** a disclosure button "**Bought · 3**" (`aria-expanded`, chevron) with a quiet "57 MAD" (sum of priced bought items) and, as a sibling control at the right, the ghost danger-text button **Clear bought** (44 px).
- **Default:** open when it has ≤ 5 items, closed above that, on first arrival; the person's choice is remembered for the session. While **all-bought**, always open (it is the only content).
- **Rows:** same row anatomy, ticked (zellige check, name muted but **not** struck through: the contrast stays ≥ 4.5:1 and it stays readable in the shop), and the meta line "Bought by Sara · 10:42" or "· Sun 8 Nov" (year only when not the current year, Trips' rule). The category name appears in the meta line here (the group no longer tells you), "Dairy · Bought by Sara · 10:42".
- **Order:** newest bought first (`bought_at` descending). Position inside the done group is stable until a rebuild, as S3.
- **Tick again to put back.** Unticking is in place (S3), a rebuild returns it to its category group, at the end (oldest-first by `created_at`, so it returns to its original slot).

### S11 · Wide layout: a list column and a sticky summary rail
- **≥ 64 rem:** the masthead holds the h1 and the add row side by side. Below it, two columns: **the list** (7/12, comfortable measure) and **the rail** (5/12, sticky under the top bar): the summary, **always open**: "7 left to buy · 243 MAD", "2 items have no price", then the per-group subtotals, then "Bought so far · 57 MAD". Tidy up lives in the rail.
- **Groups are not laid out in columns.** Multi-column groups (masonry) would make inserts reflow neighbouring columns and break "no row jumps" and reading order. One column of groups scrolls; the rail uses the width instead. [Trips D4: no reordering by CSS]
- **DOM order is the same at every width:** h1 → add row → summary → groups → done group. The rail is a grid placement, not a reorder [WCAG 1.3.2, 2.4.3].
- **48–64 rem:** one column; the add row in the masthead; the summary inline (collapsed breakdown).

### S12 · Phone holds (320 × 568) and the field's neighbours
- **Hold 1:** with the keyboard closed, the h1 + summary + at least **three rows** and the docked bar are all visible on first paint (so the h1 band is ≤ 120 px, the bar ≤ 56 px, the nav 56 px).
- **Hold 2:** with the keyboard open, the bar and **one** row are visible above the keyboard (the page scrolls under the bar; the bar never covers the focused field of a sheet).
- **Hold 3:** a row's tick is a 44 × 44 target; rows are ≥ 56 px high, so adjacent targets have a ≥ 12 px dead zone and the minimum WCAG 2.5.8 spacing is exceeded.
- **Bottom padding** of the page equals the bar's height + the nav's, so the last row is never hidden behind them.

### S13 · Solo and long content
- **Solo (partner hasn't joined):** per-row avatars are hidden (one person; nothing to disambiguate); the sheet says "Added by you · Sat 7 Nov". The announcements and attribution strings use "you". No invite prompt here (Home owns it). The layout does not change.
- **Long names** (to 120): wrap to **two lines** in the row (`overflow-wrap: anywhere`, line-clamp 2); the sheet shows all. **Notes** (to 4,000): one clamped line in the row (`line-clamp: 1`, with a "…" and no "More"); the sheet shows all, wrapping, with the text selectable. **Long category** (cap per Zod, confirm §8 Q1): group heads clamp to two lines; the sheet and form show all. **Long price** ("1,250,000.50 MAD"): the price slot never shrinks; the name wraps first. 200% text zoom: the row stacks the price under the name's meta line rather than clipping.

### S14 · Relation to Home's `shoppingLeft`
- **Home → Shopping:** Home's row "Shopping · 7 left to buy" links to `/shopping` (a plain link, no `?` params). With `shoppingLeft = 0`, Home says "Nothing left to buy" (Home copy) and the link still goes to `/shopping`, which shows all-bought or empty. Home's first-run **Start a shopping list** and its empty state's **Start a shopping list** go to **`/shopping?focus=add`**: the page opens with the add field focused, keyboard up on phones (a user-initiated navigation, so no surprise).
- **Same number:** Shopping's "N left to buy" and Home's `shoppingLeft` are the same definition (unbought count). They can differ **only** by queued offline adds (Shopping counts them, Home is server data) and by a realtime lag of < 2 s. After the queue drains, `['home']` is invalidated and they agree.
- **Home's empty state** ("Nothing on the list yet.") cannot distinguish an empty list from an all-bought one from `shoppingLeft` alone. Home says "Nothing left to buy" for 0, which is true for both; Home's separate "Nothing on the list yet." copy is for a Home first-run/empty fixture. See §7 A3.
- **Shopping → Home:** none (the tab bar does it).

---

## 1. Screen inventory

| Screen or view | Route | Primary job | Primary action | Entry points |
|---|---|---|---|---|
| **Shopping list** | `/shopping` (`?focus=add`) | Add things fast; in the shop, scan by group, tick, see what's left and what it costs | **The add row** (field + **Add**) | Shopping tab; Home's Shopping row; Home's "Start a shopping list" |
| **Item sheet** (read) | dialog over the list | Read one item in full: note, price, who added/bought | none (**Edit** secondary, **Delete** danger secondary; **Put back on the list** when bought) | Tap a row body |
| **Item form** (add details / edit) | `/shopping?item=new\|<id>` (dialog) | Add with details, or change one item | **Add item** / **Save changes** | **More** in the add row; **Edit** in the item sheet |
| **Clear bought confirm** | `alertdialog` | Confirm removing all bought items, naming how many | **Clear N items** | **Clear bought** in the done group's head |
| **Delete confirm** | `alertdialog` | Confirm removing one item for both partners | **Delete** | **Delete** in the item sheet |
| Discard confirm | `alertdialog` | Don't lose a typed draft | **Keep editing** (focused) / **Discard** | Close, Back or Esc on a dirty form |
| Summary breakdown | inline disclosure (rail on wide) | Show what the total is made of | the toggle | The amount in the summary |

**Merged:** quick add and "add with details" share one name field (S1); the breakdown is part of the summary, not a screen; create and edit are one form. **Split:** reading (sheet) is separate from editing (form) (S6); delete and clear are separate confirms because they name different consequences.

### Content priority (what the eye must hit, in order)
**List, populated, phone:**
1. h1 "Shopping".
2. "**7 left to buy**" and the amount: the answer to "how much is left?".
3. The first group's head and its first rows with their ticks (the thumb target).
4. The add row (docked, always visible; the primary).
5. The other groups; Other; then the done group (quiet).
6. Secondary chrome: Tidy up (when shown), the offline notice, Clear bought.

**List, wide:** h1 + add row (masthead) → list's first group → the rail's "7 left to buy · 243 MAD" and breakdown → rest of the groups → done group.
**All-bought:** "Nothing left to buy" → the add row → the done group (open) with Clear bought.
**Empty:** "Nothing on the list yet." → the add row (focused when arriving from Home).
**Item sheet:** name → quantity and price → category → notes → who/when → actions.
**Item form:** Name → Quantity → Category → Price → Notes → Add item / Save changes.

---

## 2. Navigation model

| Route | Phone chrome | ≥ 48 rem | Document title (Writer) |
|---|---|---|---|
| `/shopping` | **bottom nav, Shopping current** (`aria-current="page"`); docked add row above the nav | top bar, Shopping current | Shopping – Zamane |
| `/shopping?item=new\|<id>` | covered by the form dialog (bottom sheet) | top bar under the dialog | Add item – Zamane / Edit {item} – Zamane |
| `/shopping?focus=add` | as above; the add field is focused on entry, then the param is removed (replace) | same | Shopping – Zamane |

- **Not a task page.** The bottom nav stays on `/shopping` (it is a top-level list, like Goals' and Trips' lists). The family rule "task pages hide the bottom nav" does not apply: there are none here, because quick add, the item sheet and the item form are sheets/dialogs. This is also why the add row can sit directly above the nav.
- **Back:** the browser/OS Back pops a pushed `?item=` (closing the form behind the discard guard). The item sheet and confirms have no URL; Back from them leaves the page as usual (Home's sheet precedent), so they close on Esc and on the close button, and the app **traps Back to close an open sheet** only if the nav-bar/Home convention does so (follow Home's behaviour; §8 Q2).
- **The Shopping tab:** tapping it when already on `/shopping` scrolls to the top (nav-bar convention) and does **not** rebuild the list (so it is not a tick-undo surprise); entering from another tab rebuilds (S3).
- **Entry focus:** arriving via the tab moves focus to the h1. Arriving with `?focus=add` moves focus to the add field.
- **Counts:** five top-level destinations, unchanged [Miller]. No help item added, so WCAG 3.2.6 is as in Goals/Trips.
- **After a write:** saving the form pops `?item=`; focus returns to the opener (S2 for More; the row button for Edit). Deleting returns focus to the next row's button, else the previous, else the add field.

---

## 3. Flows

Notation: **U** = unhappy path.

### F1 · Open the list
1. Tap the Shopping tab (or Home's row). Focus goes to the h1. The cached list shows at once and refetches in the background; the order is built (S3).
2. Skeleton rows (no layout shift) fill only if there is no cache.

**U:**
1. **First load, no cache:** the h1, the add row (usable: an add queues even with nothing loaded; see state matrix), and 5 skeleton rows of fixed height. The summary reads "Loading…" in its slot (reserved height).
2. **The list fails, no cache:** inline "The list didn't load." + **Try again**; the add row is still shown and **works** (the queue/optimistic add does not need the list; the new row appears once loaded). The nav works.
3. **A refresh fails, cache exists:** cached rows, plus "Couldn't refresh. Showing the latest data on this phone." with **Try again** (Goals' string, a slim notice under the summary). Rows don't move.
4. **Offline:** the S7 notice and cached rows; queued rows labelled.
5. **Stale** (cache older than 5 min and the refetch hasn't returned): rows with the S7-style notice "Updating…" is **not** shown; a quiet "Updated 12 min ago" under the summary only when the cache is ≥ 10 min old and a refetch is pending. No spinner covers rows.
6. **Space deleted / signed out in another tab:** the app's guard handles it (not a Shopping screen).
7. **The partner joined while I'm on it (solo → pair):** avatars appear in place; "Youssef joined." is announced by the app's existing realtime notice (not a Shopping string).

### F2 · Add an item, fast
1. Tap the add field (or arrive with `?focus=add`). The keyboard rises. The docked bar rides above it.
2. Type "Tomatoes", press **Enter** (or tap Add).
3. The row appears at the end of its group (S3), the field clears and keeps focus, the toast "Added Tomatoes to Fruit & Veg" shows 4 s and is announced. The summary's count goes to +1 at once.
4. Type the next one. No tap needed between items.

**U:**
1. **Empty or whitespace only:** "Type what you need." under the field; focus stays; nothing is added.
2. **Name > 120:** the field stops at 120; the count shows in the last 20.
3. **Duplicate of an unbought item:** the hint "Tomatoes is already on the list (Fruit & Veg)." appears while typing; Enter still adds (S2).
4. **Name matches an earlier bought item** ("Milk" was bought in Dairy): lands in Dairy; the toast says "Added Milk to Dairy". If that group doesn't exist among the unbought items, it is created in its alphabetical slot.
5. **No category, no match:** lands in Other: "Added Batteries to Other".
6. **Offline:** same flow; the row shows "Waiting to sync" (S7); the toast adds nothing (the row says it). The count includes it.
7. **Server rejects** (400, or 413 for text too long): the row stays in the list as "Couldn't sync", with Try again / Remove in its sheet; one alert announcement. The input was already cleared (that's the cost of fast add; the row holds the text).
8. **Double-tap on Add or double-Enter:** the second is ignored while the first is pending (the field is already cleared, so it is a no-op).
9. **IME composition:** Enter while composing does not submit.
10. **The list is frozen mid-tick** (rows awaiting Tidy up): the add inserts at the end of its group as usual; waiting-to-move rows keep their places.
11. **Add while the done group's category group is closed:** n/a (only the done group collapses).
12. **Realtime echo:** the server's `created` notice for my own add (same id) is a no-op; no announcement twice.
13. **More** (add with details): opens the item form with the typed name; on **Add item** the row is added, the dialog closes, focus returns to the add field (S2), toast as above. Close with a changed form → discard guard.

### F3 · Shop: scan and tick
1. In the shop, scroll by group. Each row's tick (44 × 44, at the row's start) is the only thing the thumb needs.
2. Tick Tomatoes: the check fills (zellige), the text mutes, "Bought by Sara · just now" appears on the meta line, the summary's count drops (7 → 6), the group subtotal drops, the toast "Bought Tomatoes · Undo" shows 10 s. **The row does not move. No row moves.**
3. Tick the next. The toast replaces itself. **Tidy up (2)** appears in the summary.
4. Optionally **Tidy up**: ticked rows go to Bought; "Moved 2 items." is announced.

**U:**
1. **Mis-tap:** tap **Undo** in the toast (pointer), or tap/Space the tick again (everyone). Both are set-state `false`.
2. **Offline tick:** works; the row says "Waiting to sync"; Undo works; the queue replays in order on reconnect. A tick on a row the partner deleted in the meantime: the PUT returns 404 on replay, the row is removed with "Mint was removed by Youssef." announced.
3. **Both partners tick the same item:** first write wins for `bought_by`/`bought_at` (§7 A1); my row shows "Bought by Youssef · 10:41" in place, announced "Youssef bought Mint."
4. **The partner unticks what I ticked:** the row unticks in place; "Youssef put Mint back on the list." The count rises. The row sits in the done group or its category group according to where it was when the list was built.
5. **The tick fails with a network error while online:** the optimistic tick stays; the mutation retries with the standard backoff; the row gets "Waiting to sync" after the first failure (it is, in effect, queued).
6. **A non-retryable error** (404/403): the tick rolls back and "Couldn't mark Mint as bought." is an alert.
7. **Tick a queued, unsynced add:** allowed (S7).
8. **Long list, 40 items:** native Tab through 2 stops per row (tick, row button). Group headings are `h2` for screen-reader heading navigation. A **Skip to Bought** link is not added: the done group is the last landmark-able region and the heading shortcut suffices (§8 Q3).
9. **Foreground after > 30 s:** the list is rebuilt (S3) and ticked rows move to Bought. No announcement (nobody did it now).

### F4 · Read an item, then edit it
1. Tap a row's body. The item sheet opens (focus to its title). Notes are shown in full.
2. **Edit** → the item form (`?item=<id>`), fields filled, focus on Name, base `updatedAt` held.
3. Change a field, **Save changes** → PATCH with `updatedAt`. The form closes, the row updates in place; if the category changed the row **moves to its new group** (the person's own act, S3.3). Toast "Saved" is **not** shown (no toast for plain saves in this family); the row's change is the feedback and "Saved." is announced. Focus returns to the row button.

**U:**
1. **No name:** "Add a name." under Name; focus there; input kept.
2. **Quantity 0, negative, decimal or not a number:** blur validation "Use a whole number from 1." Typed junk is kept. The − button stops at 1.
3. **Price unparseable** ("12,5x"): "Use a number like 12.50." Empty price is allowed (no price). Too many decimals for the currency: "MAD has 2 decimals." (`parseMoney`).
4. **Category too long / name too long:** field counts in the last 20; the Zod cap message on submit.
5. **Category spelling differs but the key matches an existing one:** feedforward under the field: "Will be filed under "Fruit & Veg"." (client uses the same `category.ts`). Saved spelling is the server's.
6. **409, the partner changed it first:** the **three-way merge** (S8 of Goals §6.7 verbatim, fields: name, quantity, category, price, notes): the notice "Youssef changed this item while you were editing." and per-field marks ("Changed by Youssef"; or, where we both changed the same field differently, mine is kept with "Youssef changed this to "{theirs}"." + **Use theirs**). B becomes T; `updatedAt` becomes `T.updatedAt`; the person presses Save again. If nothing editable differs (only the bought state changed because of a tick), **retry once silently** (§7 A4). A second 409 shows the notice.
7. **The partner changed it live while I'm editing:** the same merge runs from the realtime refetch before I save (Goals §6.7), "Youssef changed this item while you were editing." (or "on your other device" / "on another phone" if unknown).
8. **The item was ticked by the partner while I edit:** no field changes; the sheet/row show bought; saving does not touch the bought state (PATCH carries no bought fields).
9. **The partner deleted the item while I'm in the form or the sheet:** the sheet body swaps to "Youssef deleted Mint." with **Close**, and focus goes to Close. The form shows an alert banner "Youssef deleted Mint. This can't be saved." with **Copy text** and **Close**; focus to the banner. The row disappears from the list (in a quiet moment, S5).
10. **Save fails (500/network):** alert "Couldn't save. Try again." Fields kept. Retry is safe (PATCH is idempotent with the same body, base `updatedAt` unchanged).
11. **Offline when I tap Edit:** the sheet's **Edit** is `aria-disabled` "Editing needs a connection." If the connection drops with the form open: Save becomes `aria-disabled`, the draft is kept, re-enabling is announced.
12. **Close, Back or Esc with changes:** "Discard changes?" with **Keep editing** (focused) and **Discard**. No changes: closes at once.
13. **Reload or killed app:** the draft returns with "Draft restored." and **Discard draft** (localStorage, keyed by item id or `new`).
14. **Editing a bought item:** allowed; it stays bought and in the done group.
15. **Editing a queued, unsynced item:** disabled (S7).
16. **Double submit:** ignored while pending.

### F5 · Delete an item
1. Item sheet → **Delete** (danger). An alertdialog: "Delete Mint?" "Youssef added it Sat 7 Nov. It will be removed for both of you." Focus on **Keep it**. **Delete** confirms.
2. The sheet and dialog close; the row disappears (focus to the next row's button, else previous, else the add field); the toast "Deleted Mint · Undo" shows 10 s.

**U:**
1. **Esc / Keep it / backdrop:** cancels; focus returns to **Delete** in the sheet.
2. **Offline:** Delete is `aria-disabled` "Deleting needs a connection." (queued adds: **Remove from the queue** instead, S7).
3. **Already gone (404 — the partner deleted it first):** treated as success: the row goes, toast "Mint was already removed." with no Undo.
4. **Server error:** the confirm stays open with the alert "Couldn't delete. Try again."; **Delete** re-enables.
5. **Undo:** POST restore (§7 A2): the row returns to its place by the S3 order with its original "added by" and bought state; toast becomes "Restored Mint" (4 s). If the partner already re-added "Mint" meanwhile, restore still succeeds (new ids don't collide). If restore fails: "Couldn't undo. Mint is still removed." with **Try again**.
6. **The 10 s pass while in another route:** the toast is app-level and persists across the tab; if the app is backgrounded, the Undo window is wall-clock 10 s.
7. **The deleted item had been open in the partner's sheet:** see F4 U9 (from their side).

### F6 · Clear bought
1. In the done group's head, tap **Clear bought**. The alertdialog: "Clear 3 bought items?" "They'll be removed for both of you." Focus on **Keep them**; **Clear 3 items** confirms. The count is computed from the list the person sees **plus** rows awaiting Tidy up that are ticked? **No: the count is of rows in the done group at the moment of opening**, after an implicit rebuild so the number is what the dialog says (S3 exception: opening Clear bought rebuilds first, because the dialog's count and the group must agree). Rows waiting to move are included.
2. `POST /api/shopping/clear-bought`; the group empties; "Cleared 3 items" · **Undo**; focus to the add field.

**U:**
1. **Nothing bought:** the button isn't rendered.
2. **Offline:** `aria-disabled` "Clearing needs a connection."
3. **The partner ticked another item while the dialog is open:** the dialog's count updates live ("Clear 4 bought items?") and announces politely; the primary label follows. (Prevents confirming "3" and deleting 4.)
4. **The server cleared a different number than shown** (race): the toast reports the real count ("Cleared 4 items") and Undo restores what the server returned (§7 A2).
5. **Undo restores all of them,** including attribution; the rows return to the done group (the rebuild puts them where they were).
6. **Unticks in flight:** if the partner unticked one between confirm and request, the server only removes bought items: the toast count is the server's.
7. **Server error:** the dialog stays with "Couldn't clear. Try again."
8. **A queued tick is still waiting** (an item ticked offline then back online, not yet synced): Clear bought is disabled while the queue is not empty ("Syncing… try again in a moment."), so a not-yet-bought item isn't skipped silently.

### F7 · Both partners at once (realtime)
1. Youssef adds "Eggs" while Sara is in aisle 3: Sara's list shows Eggs at the end of Dairy in a quiet moment; announced "Youssef added Eggs."; the count goes to 8.
2. Youssef ticks "Butter": Sara sees the row tick in place with "Bought by Youssef · just now"; announced. Nothing moves.
3. Sara ticks something Youssef already ticked: no change; her tick is a no-op (§7 A1), her row shows his name.
4. The solo → paired switch needs no action.

**U:**
1. **Socket down:** the list is still correct on the next foreground refetch; no banner (Goals' behaviour).
2. **Many updates while a sheet is open:** applied behind the sheet; the sheet's own item is mirrored; one announcement each (coalesced ≥ 3).

### F8 · From Home
1. Tap "Shopping · 7 left to buy". `/shopping`, focus on h1, cached and refetched.
2. "Start a shopping list" (Home, no items yet): `/shopping?focus=add`: the empty state with the field focused.

**U:** Home shows 0 left: the list shows all-bought (if there are bought items) or empty; there is no difference in the link.

---

## 4. State matrix

| Surface | empty | loading | error | success | partial | first-run |
|---|---|---|---|---|---|---|
| **List** | "Nothing on the list yet." + one sentence ("Add what you need and you'll both see it.") + the add row (focused if from Home). No illustration. No summary amount. | h1 + add row (usable) + 5 skeleton rows; the summary slot reserved | no cache: "The list didn't load." + **Try again** (add row still usable). cache: slim "Couldn't refresh. Showing the latest data on this phone." + **Try again** | groups + done group | **offline** (S7 notice, queued rows); **stale** (quiet "Updated 12 min ago"); **frozen** (Tidy up shown); **all-bought**; **solo** (no avatars); **live** (in-place updates); **long** | same as empty, from Home with the field focused |
| **Summary** | hidden when no items (nothing to total) | "…" in a reserved slot | cached numbers + the notice | "7 left to buy · 243 MAD" + "2 items have no price." | no prices: count only | — |
| **Group** | (never rendered with no unbought items) | — | — | head + rows + subtotal | some unpriced: "· 1 without a price" | — |
| **Done group** | not rendered | skeleton row | — | "Bought · 3 · 57 MAD" + **Clear bought** + rows | collapsed (> 5 items) | — |
| **All-bought** | — | — | — | "Nothing left to buy" + the add row + done group, open | — | — |
| **Row** | — | skeleton | "Couldn't sync" + sheet actions | check, name, ×qty, price, notes line, attribution | queued: `cloud-off` "Waiting to sync"; ticked-in-place: muted + "Bought by … · just now" | — |
| **Item sheet** | — | content from cache at once | "Couldn't load this item." only when opened by a stale id | full content | bought: + "Put back on the list"; queued: Edit disabled | — |
| **Item form** | — | — | alert "Couldn't save. Try again." | closes, row updates | conflict (merge marks); offline (Save disabled, draft kept); draft restored | new: Name focused, quantity 1 |
| **Clear bought confirm** | — | — | "Couldn't clear. Try again." | toast "Cleared 3 items · Undo" | count changed live | — |
| **Delete confirm** | — | — | "Couldn't delete. Try again." | toast "Deleted Mint · Undo" | already gone (404) = success | — |
| **Add row** | idle | — | "Type what you need." (inline) | toast + clears + keeps focus | duplicate hint; offline (works, queued) | focused on arrival from Home |
| **Toast** | — | — | "Couldn't undo. …" + **Try again** | "Cleared 3 items · Undo" | Undo disabled offline | — |

---

## 5. Wireframes

Legend: `[ ]` unticked tick target (44 px) · `[x]` ticked · `☁̸` queued (cloud-off icon) · (S) Sara avatar · (Y) Youssef avatar.

```
PHONE 390 · Shopping (populated, default fixture: 7 left)
┌──────────────────────────────────────┐
│ Shopping                       h1  1 │
│ 7 left to buy · 243 MAD  ▾ (toggle)  │ ← 2 · summary (breakdown closed)
│ 2 items have no price.               │
│                       [Tidy up (2)]  │ ← only when rows await a move
│ ──────────────────────────────────── │
│ Dairy                    1 item  28 MAD │ ← h2 group head (3)
│ [ ] Butter                      28 MAD │
│     (S) Added by Sara                  │
│ Fruit & Veg    3 items 18 MAD · 1 no price │
│ [ ] Tomatoes ×6                 18 MAD │
│ [ ] Mint                               │
│     fresh, big bunch · (Y) Youssef     │
│ Home                     1 item  22 MAD │
│ [ ] Dish soap                   22 MAD │
│ Pantry                  2 items 175 MAD │
│ [ ] Olive oil ×2               140 MAD │
│ [ ] Rice 1 kg                   35 MAD │
│ Other                    1 item          │
│ [ ] Batteries AA                        │
│ ▸ Bought · 3 · 57 MAD    [Clear bought]│ ← done group head (collapsible)
│ ┌ Add an item ─────────────┐ [＋ Add] [⋯]│ ← DOCKED, primary, always visible
│ ├ Home · Goals · Trips · Shopping · Me ┤│ ← bottom nav (Shopping current)
└──────────────────────────────────────┘
Rows: tick = 44×44 at the row start; row body = button → sheet.
Tick toast (above the bar): "Bought Tomatoes ·· Undo"

PHONE 390 · After two ticks (frozen: nothing moved)
│ 5 left to buy · 207 MAD ▾                [Tidy up (2)] │
│ Fruit & Veg    3 items 0 MAD ... (subtotal drops)       │
│ [x] Tomatoes ×6        Bought by you · just now  18 MAD │ ← muted, in place
│ [ ] Mint                                               │

PHONE 390 · Offline with queued rows
│ ┌ You're offline. Showing the latest data on this     ┐│
│ │ phone. Adding items and ticking them off still work ││
│ │ and sync when you're back online. Editing, deleting ││
│ │ and clearing bought items need a connection.        ││
│ └──────────────────────────────────────────────────────┘│
│ Dairy                                                    │
│ [ ] Butter                                      28 MAD   │
│ [ ] Eggs     ☁̸ Waiting to sync                          │
│ ▸ Bought · 3          (Clear bought: needs a connection) │

PHONE 390 · All bought
│ Shopping                                                 │
│ Nothing left to buy                                      │
│ ▾ Bought · 7 · 241 MAD                  [Clear bought]   │
│ [x] Butter · Dairy · Bought by Sara · 10:42              │
│ …                                                        │
│ [ Add an item ……………………] [＋ Add] [⋯]                    │ docked

PHONE 390 · Empty (also first-run from Home)
│ Shopping                                                 │
│ Nothing on the list yet.                                 │
│ Add what you need and you'll both see it.                │
│ [ Add an item ……………………] [＋ Add] [⋯]   ← focused           │ docked

PHONE 390 · Item sheet (bottom sheet, read)
│ ─ ─ handle ─ ─                                      ✕    │
│ Olive oil                                       h2       │
│ ×2 · 140 MAD (for the whole line)                        │
│ Category   Pantry                                        │
│ Notes      extra virgin, the 5 L tin if on offer         │
│ (S) Added by Sara · Sat 7 Nov                            │
│ (bought: (Y) Bought by Youssef · Sun 8 Nov, 10:42)       │
│ [Edit]  [Put back on the list]*  [Delete]  (* if bought) │

PHONE 390 · Item form (bottom sheet, keyboard-aware)
│ Add item / Edit item                                ✕    │
│ Name *            [ Olive oil ………………………… ]               │
│ Quantity          [ − ] [ 2 ] [ + ]                      │
│ Category          [ Pantry ……………… ▾ ]  suggestions list     │
│                   Will be filed under "Pantry".          │
│ Price             [ 140 ] MAD  Price for the whole line,   │
│                   not per unit.                          │
│ Notes             [ …………………………………… ]                  │
│ [ Save changes ]                                         │ ← primary (sticky above keyboard)

PHONE 390 · Confirms (alertdialog, centred)
│ Clear 3 bought items?                                    │
│ They'll be removed for both of you.                      │
│ [ Keep them ]  (focused)      [ Clear 3 items ] danger   │
```

```
DESKTOP 1440 · Shopping (wide, single list column + sticky rail)
┌ logo ─ Home  Goals  Trips  Shopping ──────────── [? Help] (avatar) ┐
│ H1 Shopping     [ Add an item ……………………… ] [＋ Add] [⋯ Add with details] │ ← primary (masthead)
│ ┌ list (7/12) ───────────────────────┐ ┌ rail, sticky (5/12) ─────────┐ │
│ │ Dairy                1 item 28 MAD │ │ 7 left to buy · 243 MAD       │ │
│ │ [ ] Butter                 28 MAD  │ │ 2 items have no price.        │ │
│ │ Fruit & Veg    3 items 18 MAD · 1 no price │ [Tidy up (2)]         │ │
│ │ [ ] Tomatoes ×6            18 MAD  │ │ ─ By group ─────────────────  │ │
│ │ [ ] Mint — fresh, big bunch        │ │ Dairy            28 MAD        │ │
│ │ Home                1 item 22 MAD  │ │ Fruit & Veg      18 MAD        │ │
│ │ [ ] Dish soap              22 MAD  │ │ Home             22 MAD        │ │
│ │ Pantry            2 items 175 MAD  │ │ Pantry          175 MAD        │ │
│ │ [ ] Olive oil ×2          140 MAD  │ │ Other         No prices        │ │
│ │ [ ] Rice 1 kg              35 MAD  │ │ ─ Bought so far · 57 MAD ─────  │ │
│ │ Other           1 item             │ └───────────────────────────────┘ │
│ │ [ ] Batteries AA                   │                                   │
│ │ ▸ Bought · 3 · 57 MAD [Clear bought]│                                   │
│ └────────────────────────────────────┘                                   │
└──────────────────────────────────────────────────────────────────────────┘
Item sheet and item form: centred 28 rem dialog (dimmed list behind). Tablet 48–64 rem: the list column only, the summary inline above it.
EMPTY: "Nothing on the list yet." + one sentence; add row in the masthead (focused from Home).
```

Primary-action placement summary: **phone** docked add row above the nav; **tablet/wide** masthead add row; **More** opens the item form; no floating button anywhere (S1).

---

## 6. Interaction specs

### 6.1 Keyboard model (no custom widget uses arrows except the category combobox)
| Widget | Tab stops | Keys | Focus |
|---|---|---|---|
| **Add row** | the field; **Add**; **More** | **Enter** in the field = Add (not while composing); **Esc** blurs the field; **Space/Enter** on buttons | After Add: the field keeps focus (S2). After the form closes (opened from More): back to the field. |
| **Summary toggle** | one button (`aria-expanded`, `aria-controls`) | Enter/Space toggles | stays |
| **Tidy up** | one button | Enter/Space | moves to the summary toggle; "Moved N items." announced |
| **Row tick** | a native `<input type="checkbox">`, label "{name}, {qty}" (+ "price" only in the sheet) | **Space** toggles | stays on the checkbox (the row doesn't move) |
| **Row body** | one `<button>` (name, qty, notes, price, attribution as its accessible description) | Enter/Space opens the item sheet | the sheet's title; Esc/Close returns focus to the same row button (or the group `h2` if the row is gone) |
| **Group h2** | none (heading navigation for SR) | — | — |
| **Done group head** | a disclosure button (`aria-expanded`); **Clear bought** as a sibling button | Enter/Space | Clear bought opens the alertdialog |
| **Item sheet** | Edit, Delete, (Put back), Close; trapped | **Esc** closes; Tab cycles | initial focus: the sheet title (`tabindex=-1`); return focus to the opener |
| **Item form** | Name, quantity − / input / +, Category combobox, Price, Notes, Save/Add, Close; trapped | **Esc** closes (guard if dirty) | initial: Name (empty new) or Name; first invalid field on a failed submit |
| **Quantity stepper** | − and + are buttons (44 px), the input is a text field with `inputmode="numeric"` | **Up/Down** on the input change by 1; − stops at 1 | stays |
| **Category combobox** | one input (`role="combobox"`, `aria-autocomplete="list"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`) | **Down/Up** move through suggestions; **Enter** picks the active one (or keeps the typed text); **Esc** closes the list first, then (second press) the dialog | focus never leaves the input; "3 suggestions" announced politely on open; no match: "No matching category. This will be a new one." |
| **Confirm alertdialog** | Cancel (focused), the destructive button | **Esc** = Cancel | back to the opener, or per F5/F6 after a successful act |
| **Toast** | **Undo** is a real button; the toast is the last landmark-ish element before the docked bar in DOM so Tab from the list end reaches it | Enter/Space | focus unchanged by showing the toast |

- **No drag anywhere, no swipe-to-tick, no swipe-to-delete:** WCAG 2.5.7 needs no alternative because nothing needs one; sidesteps accidental gestures in the shop.
- **Labels:** every control has a visible label or text (icons only for **More** and the sheet close; both have names). The tick label contains the visible name [WCAG 2.5.3].
- **Targets:** tick 44 × 44; row ≥ 56 px; the stepper buttons, Add, More, sheet buttons ≥ 44.
- **Reduced motion:** the new-row highlight is a 2 s background tint with no movement.

### 6.2 Feedback: what responds, and where [Norman]
| Act | Immediate feedback | Elsewhere | Announcement |
|---|---|---|---|
| Add | the row appears in its group (highlight 2 s, if visible); the field clears | the count +1; the toast "Added … to …" | polite: "Added Milk to Dairy." |
| Tick | the checkbox fills; text mutes; "Bought by you · just now" | count −1; subtotal; the toast Undo (silent to AT); Tidy up (n) | none beyond the native checkbox state |
| Untick | the checkbox empties | count +1 | none beyond native |
| Edit save | the row updates in place (or moves if the category changed) | — | polite: "Saved." |
| Delete | the row leaves; focus moves to the neighbour | toast Undo; count; subtotal | polite: "Deleted Mint." |
| Clear bought | the group empties; focus to the add field | toast Undo | polite: "Cleared 3 items." |
| Partner act | in place (S5) | — | polite, one sentence, coalesced |
| Offline/online | the notice appears/disappears; "Waiting to sync" labels | disabled controls with reasons | "You're offline. …" / "Back online." |

### 6.3 What the system does for the person [Tesler]
- Copies the category from a same-named earlier item; keeps the existing category spelling when the key matches (server and optimistic client).
- Pre-fills the item form's Name from the add field.
- Fills suggestions from the space's categories (latest spelling per key).
- Hides empty groups and the done group when empty; picks open/closed for the done group by size.
- Rebuilds the order on entry and foreground so the person never maintains it.
- Remembers the form draft, the summary toggle and the done-group choice.

### 6.4 Ordering and grouping rules (one place for the engineers)
1. `key = normalise(category)` (`src/shared/category.ts`, NFKD, strip diacritics, lower-case, remove whitespace). `null` or empty key = **Other**.
2. Unbought groups sorted by `Collator(base).compare(display, display)`; **Other last**; **done group after Other**.
3. Group display name = the category spelling stored on the group's items (the server keeps one spelling per key; if mixed, the spelling of the most recently updated item, as `GET /categories`).
4. Items within a group: `created_at` asc, `id` asc. Done group: `bought_at` desc, `id` desc.
5. Group subtotal = Σ `price` of unbought items **that have a price**; items with null price add nothing and are counted in "without a price". **Ticked-in-place rows are excluded** from the subtotal, the count and the total (they are bought).
6. Left-to-buy total = Σ of the group subtotals. Shown with the count of unpriced items; never estimated.
7. The rebuild (S3) happens on route entry, foreground ≥ 30 s, **Tidy up**, a category-changing save, and when opening **Clear bought**; nothing else moves rows.
8. A queued row participates exactly like a synced one.

---

## 7. API needs (ARCHITECTURE.md lacks these; the prototype assumes them)

**A1 · Idempotent `PUT /api/shopping/:id/bought { bought: true }` that keeps the first buyer.** If the item is already bought, the call is a no-op (200 with the row; `bought_at` and `bought_by` unchanged). `{ bought: false }` clears both. Why: both partners often shop at once; a second tick must not silently reassign "who bought it" or reorder the done group (the done group is sorted by `bought_at`). ARCH D9 already calls ticks "set state, not toggle"; this pins down which write wins.

**A2 · Restore for Undo of delete and clear bought, preserving attribution.** The architecture has no undelete, and Trips/Goals deliberately refuse one so a re-create can't falsify "who did what". Two options, in order of preference:
  1. `DELETE /api/shopping/:id` and `POST /api/shopping/clear-bought` **return the removed rows** (`{ deleted: ShoppingItem[] }`, full rows with `id`, `created_by`, `created_at`, `bought_at`, `bought_by`, `updated_at`); and `POST /api/shopping/restore { items: ShoppingItem[] }` re-inserts them verbatim (same ids), `ON CONFLICT (id) DO NOTHING`, space-scoped, same Zod, max 200 items, only rows whose `created_by`/`bought_by` are members of the space. No schema change.
  2. Soft delete (`deleted_at`, purged after 24 h): a schema change, so not preferred.
  Without either, **Undo for delete and clear bought cannot be built honestly**; the fallback is confirm-only, as Trips (the confirm screens are designed either way).

**A3 · Home can't tell "empty" from "all bought".** `shoppingLeft` is only the unbought count. Home says "Nothing left to buy" for 0, correct in both cases. If Home's "Nothing on the list yet." (empty state) is to be shown for a truly empty list, `GET /api/home` needs `shoppingTotal` (or a boolean `shoppingEmpty`). Not needed for Shopping itself.

**A4 · 409 body and tick vs `updated_at`.** `PATCH /api/shopping/:id` returns **409 with the full current row**. Please confirm whether `PUT …/bought` bumps `updated_at`; if it does, a partner's tick makes my open edit 409. The client retries once silently when no editable field differs (Goals Q5, Trips A3). If ticks do **not** bump it, the retry is never needed.

**A5 · `POST /api/shopping` response and client-generated id.** Idempotent on `id` (replay after a lost response returns the same row, 200 or 201). `category` is optional in the body (the item form sends it; the add row sends the guessed category from S2). `quantity` defaults to 1. The server applies the existing-spelling rule and returns the stored spelling, so the optimistic row can reconcile.

**A6 · `GET /api/shopping` returns everything in one payload:** all items (unbought and bought), each with `createdBy`, `createdAt`, `boughtAt`, `boughtBy`, `updatedAt`, `categoryKey`. The grouping, ordering, subtotals and the unpriced count are computed on the device (S3, §6.4), so offline and optimistic rows group identically. A list size cap is assumed (≤ 500 items; bought items are expected to be cleared). If the list can exceed that, pagination changes S3.

**A7 · `GET /api/shopping/categories`** may be derived client-side from A6 (so it works offline); keep the endpoint for the first load. No changes.

**A8 · Text caps.** Name 120, notes 4,000 (ARCH §4.1). Category cap and quantity max are not in the architecture: assume category 60 and quantity ≤ 999 (client-enforced), please confirm in the Zod schemas (`src/shared/schemas/`, not yet written for shopping).

**A9 · Realtime payloads.** `shopping_item` notices (`created`, `updated`, `deleted`) with `actorId` (as ARCH §7); additionally a notice for `clear-bought` that carries the **count** ("Youssef cleared 3 bought items.") or the client announces "Youssef cleared the bought items." without a count.

**A10 · Rate limit** (D58) must not throttle a burst of ~30 `PUT …/bought` or `POST` replays after reconnecting offline. Please confirm the limits allow a queue drain of 50 requests in a few seconds, or the client paces the queue (default: 5 concurrent, in order).

---

## 8. Open questions, fixtures, example data

### Open questions for the user
- **U1 · Docked add field instead of a floating primary (S1).** A deliberate change from "floating primary on phones". Reversible at the cost of Enter-to-continue being in a sheet. Default: the docked field.
- **U2 · Parse "×6" or "x6" at the end of the name into quantity?** Default: no (S2); the name keeps what was typed.
- **U3 · Undo for a mistyped add?** Default: no (the objective lists Undo for tick, delete and clear bought only). A mistyped add is removed from its sheet (confirm + Undo). One line to add an Undo to the add toast.
- **U4 · A finish moment on all-bought?** Zellige means done; saffron is "for time and celebration", so the default is none. If the Art Director wants one, it renders at the rebuild (S4), never at the tick.
- **Q1 · Category cap and quantity max** (A8). **Q2 · Does Back close an open sheet?** Follow Home's sheet (the convention was not read here). **Q3 · A "Skip to Bought" link?** Default: no.

### Fixtures (`?state=`) and what each must show
| Fixture | What it shows |
|---|---|
| `populated` (default) | **7 left**: Dairy (Butter 28), Fruit & Veg (Tomatoes ×6 18; Mint "fresh, big bunch" no price), Home (Dish soap 22), Pantry (Olive oil ×2 140; Rice 1 kg 35), Other (Batteries AA); Bought · 3 (Milk 2 L 12 Dairy; Coffee 45 Pantry; Sponges no price Home). Left-to-buy **243 MAD**, "2 items have no price.", bought so far **57 MAD**. Footnote: "Example data; 7 left, as on Home." |
| `empty` | "Nothing on the list yet." + the add row (also `?focus=add`, first-run from Home) |
| `all-bought` | "Nothing left to buy", done group open (7 items), Clear bought |
| `loading` | skeleton rows, usable add row |
| `error` | no-cache error + cache-with-refresh-error variants (`error` and `error-cached`) |
| `stale` | cached list, "Updated 12 min ago", a refetch pending |
| `offline` | the notice, cached data, 2 queued rows (one add, one tick), Edit/Delete/Clear `aria-disabled` with reasons; add and tick work and queue |
| `solo` | no avatars, "Added by you" |
| `live` | the partner adds Eggs (Dairy), ticks Butter, deletes Dish soap, clears bought, on a timer; shows quiet-moment application and the polite announcements; ticks never move rows |
| `long` | a 120-character name, a long note, a long category, a long price |
| `item-sheet` | open on Olive oil; `item-sheet-bought` variant |
| `item-form` | open new (with Name prefilled from More) and edit; `item-form-invalid`, `item-form-offline` |
| `item-form-conflict` | the three-way merge (Goals §6.7) with per-field marks and **Use theirs**; also `item-gone` (the partner deleted it) |
| `clear-bought-confirm` | "Clear 3 bought items?" with the live count variant |
| `delete-confirm` | "Delete Mint?" |
| `frozen` (extra) | two rows ticked in place and **Tidy up (2)** shown |

### Builder notes (engineers)
- **Shared layer:** reuse Trips' `Z` plumbing (toast with Undo and one-at-a-time replacement, confirm alertdialog, sheets, live region, focus return, hash routing, offline simulation, `?state=`). Add: `Z.shop.key()` (the normalisation), `Z.shop.groups()` (S3 ordering), `Z.shop.totals()` (left count, subtotals, unpriced count, bought sum), a **quiet-moment queue** for realtime inserts/removals (S5), and the "pending moves" set for Tidy up.
- **Row markup:** `<li>` with a native checkbox (`.tick`, 24 px visual, 44 px target, zellige when checked, from `.ux-forge/trips/zamane.css`) and a sibling `<button>` for the body; never nested. Group head is an `<h2>` with the subtotal inside it as visually separate text.
- **Docked bar:** `position: sticky`/`fixed` at the bottom with `padding-bottom: env(safe-area-inset-bottom)` and `visualViewport` handling for the keyboard; the page's bottom padding is the bar + nav.
- **React port:** the offline mutation defaults are in `src/client/lib` (`['shopping','add']`, `['shopping','setBought']`); the order/group/total code belongs in `src/shared/` (a `shopping-groups.ts`, with unit tests: Other last, key merging, ticked-in-place exclusion, no price guessing) so client, offline rows and tests agree.
