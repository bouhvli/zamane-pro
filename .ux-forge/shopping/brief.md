# Brief: Zamane Shopping (the shared list, quick capture, category groups, "bought", clear bought)

**Mode:** department (the user's choice, Thu 12 Nov 2026), **one review round only**.
- Pipeline: Researcher ∥ Architect → Writer ∥ Art Director → the user picks a direction → Design Systems (token additions only) → Director builds the shared layer ∥ front-end engineers build the list and the item sheet/forms → **one** Critic + Accessibility pass → one fix round → the Director ports the result to the React app (`src/client`).
- The user said "design and develop": the prototype in `.ux-forge/shopping/` is the design; the React port follows the way Goals and Trips were ported. After the one review round, no more.

## Request
Design the Shopping area of the Zamane PWA ("Shopping" in the nav). Deliver a working standalone HTML prototype in `.ux-forge/shopping/` (plain HTML, CSS and a little JS, no modules, `file://` must work), linked into one flow like `goals.html` and `trips.html` (`shopping.html`; shared layer `shared.js` = `window.Z`; one stylesheet and one script per view). Same family as Goals and Trips: read `.ux-forge/goals/shared.js`, `.ux-forge/trips/shared.js` and `.ux-forge/trips/trips.html` for the plumbing (toast with Undo, confirm alertdialog, sheets, live region, focus rules, hash routing, offline simulation, `?state=` fixtures). The nav bar is `.ux-forge/nav-bar/`; Shopping is its fourth tab.

The product facts (ARCHITECTURE.md §4–§5, §9, D14):
- **Item:** `name` (required), `quantity` (integer, default 1, > 0), `category` (free text as typed, trimmed; grouping uses a normalised key: lower-case, no diacritics, no whitespace, so "Fruit & Veg", "fruit &veg" and "Frúit & veg" are one group; when the key already exists the server keeps the existing spelling), `price` (money, **per line**: the price paid for the whole line, not per unit; units and weights go in the name or notes), `notes`, `bought_at` / `bought_by` (who bought it and when), plus who added it and when.
- **The list:** unbought items grouped by category, each group with a **price subtotal** (of the items that have a price); items without a category form **Other**. **Bought items form a separate "done" group** at the end. A total for what's left to buy is computed from prices (items without a price are not guessed, the screen says how many have none).
- **Actions:** add (quick capture: the name alone is enough), tick to mark bought (**set state**, not toggle: replayable), untick, edit (name, quantity, category with suggestions from the space's existing categories, price, notes), delete, **clear bought** (removes every bought item at once, with a confirmation that says how many, and an Undo that restores them).
- **Category suggestions:** the distinct existing categories (latest spelling for each key), offered while typing a category.
- **Offline (§9):** **add item** and **tick bought** work offline and sync in order; the screen shows which rows are waiting. Everything else (edit, delete, clear bought) needs a connection and says so.
- **Realtime:** the partner's adds and ticks appear without a refresh (Phase 5 in the app; the prototype simulates it with `?state=live`, as Goals and Trips do).
- **Conflicts:** edits use `updatedAt`; the API answers 409 when the partner changed the item first (merge flow like Trips' sheets). Ticks never conflict.
- **Home** shows `shoppingLeft` (unbought count) and links here. Empty state there says "Nothing on the list yet." with a "Start a shopping list" button that lands here.

## Users and success actions
The same couple as Home, Goals and Trips: Sara (partner A, majorelle) and Youssef (partner B, terracotta), each on their own phone.
- **At home**, adding things as they run out: one hand, seconds. **In the shop**, a phone in one hand, a weak connection: scan the list by aisle (category), tick as you go, see what's left and roughly what it costs. Often both partners shop at once, or one adds while the other is in the shop.
- **Success actions:** (1) **add an item in seconds**, even offline; (2) **tick things off while walking the aisles** without mis-taps and without items jumping under the thumb; (3) at a glance: how many are left, roughly how much.

## Platform and stack
- Mobile-first PWA, 320 px and up, light and dark, safe areas. Desktop is a first-class surface (wide: groups in columns or a comfortable single column, the add row in the masthead).
- Target stack: React 19 + TanStack Router/Query (already scaffolded; Goals and Trips are built).
- A **task page** is one that hides the bottom nav on phones (Goals, Trips forms). Quick add and the item sheet are **sheets**, not pages, as Home's quick add is.

## Brand constraints (binding)
- **Design system:** `Zamane Design System.html`. It already has a **ShoppingItem** component (checkbox row: name, quantity, price, notes, "added by" avatar). Reuse its structure and states; the prototype's `.tick` checkbox (24 px visual, 44 px target, zellige when checked) is in `.ux-forge/trips/zamane.css`.
- **Zellige means done:** a bought item. **Saffron is for time and celebration** (not used here unless an "all done" moment earns it). **Terracotta** is partner B's colour, not a status colour. **The arch is for imagery only** (there is none on this screen). **Who did what, always:** attribution on adds and ticks (PartnerAvatar). **Numbers are earned:** the total opens its breakdown (per group subtotals), it doesn't shout.
- Icons: Lucide 1.75 (basket for Shopping; check, plus, x, trash, pencil, cloud-off, refresh; category icons are NOT needed, text only).
- The look must sit in the same family as Goals B and Trips B (Young Serif for display, Figtree for text, sand surfaces, majorelle primary). The Art Director proposes directions **within** the system, not a rebrand.
- **Established patterns, reused:** the floating primary on phones and masthead primary on wide screens; the toast with Undo (10 s); live updates without a toast but with a polite announcement; the offline notice wording ("You're offline. Showing the latest data on this phone. … still work and sync when you're back online."); the year only when a date isn't in the current year; form/sheet conventions from Trips' dialogs (bottom sheet on phones, centred from 48 rem, keyboard-aware, focus returns to the opener, drafts in localStorage, "Draft restored.").
- Logo files in `assets/` are read-only.

## Example data (prototype only, labelled on screen)
- Prototype "today": **Mon 9 Nov 2026** (as in Goals, Home, Trips). Currency **MAD**.
- From the design system's ShoppingItem: Olive oil (×2, 140 MAD, added by Sara), Mint ("fresh, big bunch", added by Youssef). The seed adds Tomatoes ×6, Dish soap, Milk (bought). The design system's phone mock says "7 left to buy": make the default example list add up to that (**7 left**), and say so in the footnote.
- Categories in the example: Fruit & Veg, Pantry, Dairy, Home, and Other (an uncategorised item or two); one bought group of 3 items; at least one group with a mix of priced and unpriced items; one item with long text and a long note.
- Fixtures to design (`?state=`): `populated` · `empty` (nothing on the list; also first-run from Home) · `all-bought` (nothing left, only the done group) · `loading` · `error` · `stale` · `offline` (cached data; add and tick still work, with queued rows) · `solo` (partner hasn't joined) · `live` (partner adds and ticks while open) · `long` (very long names/notes/category) · sheets and forms: `item-sheet`, `item-form`, `item-form-conflict`, `clear-bought-confirm`, `delete-confirm`.

## Assumptions (state and keep)
- One shared list per space (not several lists); no per-item photo; no barcode; no recurring items; no unit-price maths (D14). Quantity is a whole number with − / + steppers or a typed number; "price per line" is stated in the form help.
- **Sorting:** groups alphabetical by display name with **Other** last; within a group, newest first?—the Architect decides and records it (an item you just added should be findable; ticked items leave the group for the done group; the order must not jump while someone is mid-shop: freeze while on screen, recompute on arrival/foreground, as Goals and Trips lists do).
- The done group is collapsible, newest bought first, each row says who bought it and when; **Clear bought** lives in the done group's head, never at the top.
- No ratings of the design by the user are expected before the build; the user picks one of three directions.

## Director's decisions after Discover (binding for every later role)
- **U1 accepted:** the primary is a **persistent add field** (docked above the bottom nav on phones, in the masthead from 48 rem), not a floating button; "More" opens the item form with the typed name. Enter adds, clears and keeps focus.
- **U2:** no parsing of "x6" in the name. **U3:** adds get a short toast with no Undo. **U4:** no "all bought" celebration; the all-bought state is calm text.
- Back closes an open sheet/form (Home's convention). Ordering, totals, Undo, done group, wide-layout rail: as `ia.md` S3, S8-S11.
- `ia.md` blemishes: ignore the muddled last bullet of S1; F4 U6 should read "Goals §6.7".
- API needs: A1 satisfied by design (set-state tick keeps the first buyer); A2: Undo for delete and clear-bought is built honestly, with a restore path added to the API in the React port (rows keep their ids and attribution); A3: Home keeps its "Nothing on the list yet." for a list with no unbought items; A4 ticks do not bump `updated_at`, a 409 returns the full row.
- Review: ONE round only (Critic + Accessibility in parallel after the build), one fix pass, no more.
