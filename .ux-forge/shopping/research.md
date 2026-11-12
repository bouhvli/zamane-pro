# Research & strategy: Zamane Shopping

Sources: `brief.md` (this folder), ARCHITECTURE.md §4 (shopping_items, groups, category key), §5 (API, write semantics), §7 (realtime), §9 (offline queue), D14 (price per line); `.ux-forge/goals/decision.md` and `.ux-forge/trips/decision.md` for conventions. Category conventions come from my own knowledge of the apps, not from live research (web search not used, and no store or user numbers are cited). Treat app behaviours below as "as I know them", to be spot-checked by the Critic if one matters.

The shopping routes do not exist in `src/worker` yet (only goals and trips), so nothing here is constrained by built code beyond the schema in §4.

## Users

**Primary: Sara (partner A) and Youssef (partner B), a couple sharing one space, each on their own phone.** Both read and write the same list. Neither is the "list owner"; attribution is on every add and tick.

| Context | At home | In the shop |
|---|---|---|
| Device / posture | Phone, often one-handed, standing in the kitchen; sometimes the desktop | Phone in one hand, basket or trolley in the other, thumb only |
| Connection | Good | Weak or none (aisles, basements, car parks) |
| Attention | Half a second: "we're out of X" | Split between shelf, list and trolley; interrupted constantly |
| Frequency | Several short adds a day | One or two sessions a week, 10 to 40 minutes |
| Other person | Adds when they notice something is out | Often shopping **at the same time**, or at home adding while the other shops |
| Effort tolerance | Name only, nothing else | Zero typing; ticks and a glance at what's left |

**Secondary: the solo user** (partner hasn't joined; `?state=solo`). Same list, no partner attribution to show; must not look broken or empty of meaning.

**Accessibility needs:** one-handed reach; large, forgiving tick targets (44 px, already in the system); readable in bright shop light (contrast in both themes); text zoom / 200% must not break rows (long-name fixture); screen-reader announcements for partner ticks (polite live region); no information by colour alone (zellige = done must also have a check and text). EAA applies (EU consumer product).

**Vocabulary the user already uses in the brief and Home:** "Shopping", "left to buy" (Home: `shoppingLeft`, "7 left to buy"), "bought", "Other". Use "bought", not "done" or "completed", in user-facing text (the data group is "done" internally only).

## Jobs to be done

1. **Capture.** When I notice we're out of something, I want to put it on the list in a couple of seconds, so I don't have to remember it, and my partner sees it.
2. **Capture offline.** When I'm in the basement store or a signal dead zone, I want adding and ticking to still work, so that I never have to remember "I'll add it later".
3. **Walk the aisles.** When I'm in the shop, I want to see what's left grouped by where I'll find it, so I can walk once and not backtrack.
4. **Tick as I go.** When I put something in the trolley, I want to tick it with one tap that can't hit the wrong row, so that I can see what's still missing at a glance.
5. **Coordinate live.** When my partner is shopping or adding too, I want their ticks and adds to appear without refreshing, so we don't buy the same thing twice or miss something.
6. **Know the damage.** When I'm about to pay, I want a rough total of what's left (and to know what isn't priced), so I'm not surprised at the till. (Secondary job: prices are optional and mostly for the planner at home, not the aisle.)
7. **Reset.** When the shop is done, I want to clear everything bought in one go, so the next list starts clean, without losing things I didn't mean to remove.

## Success

| Surface | The one success action | Business / product outcome | How to measure |
|---|---|---|---|
| List (in shop) | **Tick an item** without a mis-tap, with no row moving under the thumb | The list is trusted as the shop's source of truth, so the app is opened at the shop | Untick within ~5 s of a tick (mis-tap proxy); ticks per session; share of ticks that were queued offline and synced |
| Add (quick capture sheet) | **Add by name alone** | Capture at the moment of need; the list is full when the partner shops | Time from sheet open to saved (target: seconds, no field beyond name required); % of adds that use only the name; adds made offline |
| Header / summary | **Read "N left" (and the estimated total) at a glance** | Home's `shoppingLeft` is accurate, so Home links here | Home -> Shopping clicks; empty-state "Start a shopping list" conversion |
| Bought group | **Clear bought**, deliberately | Clean list for next time, no accidental loss | Clear actions; Undo rate after clear (high = confirmation or wording failing) |

Analytics event names do not exist yet; the Director should pick them. No baselines are claimed; the above are things to instrument, not targets with numbers.

## Scope

**In (per job)**
- Capture: quick-add sheet (name only required; quantity, category, price, notes in an "add details" expansion or in the item sheet); offline queued; undo via toast.
- Aisle walk: unbought items grouped by category (alphabetical, **Other** last), each group head with name, count and priced subtotal; stable order while the screen is open.
- Tick: set-state tick (replayable), 44 px target, attribution (who/when) in the bought group; ticked item moves to the bought group; untick returns it.
- Totals: "N left", total of priced unbought items, "M have no price" stated, breakdown by group subtotal on demand.
- Bought group: collapsible, newest bought first, "Bought by X, time"; **Clear bought** in its head, with a count-bearing confirmation and Undo.
- Item sheet: view, edit (name, quantity, category with suggestions, price per line with explicit help, notes), delete with confirmation; 409 merge flow.
- States: populated, empty, all-bought, loading, error, stale, offline with queued rows, solo, live, long text.

**Out (v1, restated from brief and D14)**
- Multiple lists, per-item photos, barcodes, recurring items, unit-price maths, aisle ordering by store, store-specific lists, item history/autocomplete of past names (see Q7), drag reorder, sharing outside the couple, category icons or colours.

**Where the system absorbs complexity [Tesler]**
- Category normalisation (key) and "keep existing spelling" are server/shared logic; the user types freely and never sees a duplicate group.
- Ordering and grouping are computed, not managed by the user.
- Queued offline writes replay in order with no user step; the UI only shows "waiting" rows.
- Totals are derived; unpriced items are counted, never guessed.
- Tick replay is idempotent and conflict-free; the user never resolves a tick conflict.

## Category conventions

Jakob's Law: couples arrive having used one or more of these. From knowledge, not live checks.

| Product | Convention worth knowing |
|---|---|
| **Bring!** | Visual, icon-per-item, tap to move an item to "recently bought" at the bottom; strong sharing; fast add from a catalogue. Ticking moves the item immediately, so the list reflows as you shop. |
| **AnyList** | Items grouped by category (store aisle), checked items drop to the bottom or strike through (a setting); shared with real-time sync; categories are a fixed-ish set the user can edit. |
| **OurGroceries** | Plain text list, categories as headers, tap to cross off (moves to a "crossed off" section at the bottom), with a clear "remove crossed-off items" action; sync between people. |
| **Apple Reminders (groceries list type)** | Auto-categorises into aisle sections, tapping the circle completes and the row moves to a completed section; "Clear completed" is a menu action. |
| **Google Keep** | Checklist note; ticked items sink to a collapsed "checked items" group with a count; "Delete checked items" in a menu. Very low friction, no categories. |

**Conventions to keep (users will expect them)**
1. A big round or square tick at the row's left; tapping the row body does something else (opens the item), so a tick is deliberate.
2. Bought items leave the active list and collect in a collapsible group at the end, with a count.
3. Group headers with item counts; one-line add at the top or a floating add.
4. "Clear" lives with the bought group, behind a confirmation.
5. Quantity next to the name, small; notes as a second line.
6. Partner changes appear live.

**What to avoid, and why**
| Pattern in the wild | Problem | Position |
|---|---|---|
| Item jumps to the bottom the instant it is ticked (common) | The rows under the thumb shift, so the next tap lands on the wrong item. This is the central in-shop mis-tap risk. | Keep the tick's immediate feedback in place (check state), and move rows on a defined rhythm (see Q2). Never reflow on partner events while the user is mid-gesture. |
| "Clear" one tap away at the top or in a toolbar | Wipes the shop's record by accident; partner loses their ticks. | Only in the bought group head, confirmation with the count, Undo restores. Never top-level. |
| Fixed or auto-guessed categories only | Wrong guesses are annoying and unfixable. | Free text with suggestions from existing categories. No guessing in v1. |
| Strike-through only for bought (no move) | Long lists become unreadable in the shop. | Move to the bought group, but only per Q2. |
| Silent offline failure | Item seems added, vanishes later. | Rows show "waiting to sync"; offline notice wording reused. |
| Price in the aisle row for every item | Clutters the scan; users rarely have prices. | Price is secondary text, shown only when set; the total is behind the header, not shouted. |
| Cross-device update with a toast on every partner tick | Noise during shared shopping. | Live updates with a polite announcement, no toast (project rule). |

**Openings to differentiate (within the system)**
- "Who did what" on every tick and add (partner colour avatar) is a couple-specific feature competitors treat as optional.
- Honest totals: "N have no price" instead of a misleading sum.
- Offline-first confidence: waiting rows are visible, not hidden.

## Risks and regulatory flags

**Product risks (Inspired's four)**
- **Value:** will a couple use this over the apps they already know (Notes, Reminders, WhatsApp)? Mitigation: capture speed and live sync must be at least as good as the shared Reminders list. Biggest risk to adoption; judge by in-shop use, not add-at-home.
- **Usability:** mis-taps and reflow in the shop (below), the weak-connection experience, and confusion over price per line.
- **Feasibility:** offline queue ordering for add then tick of the same item (tick must replay after the add; the id is client-generated, so OK, but a tick on an item the partner deleted meanwhile needs a defined outcome, see Q8); Phase 5 realtime transport is undecided (§7 superseded), so "live" may be polling at first.
- **Viability:** low cost; no third-party calls; works inside the free hosting model.

**Concrete scenario risks**
| Risk | What goes wrong | Direction |
|---|---|---|
| **Mis-taps on ticks** | Thumb hits neighbouring row or the row body instead of the tick | 44 px target, spacing between rows, tick separate from the row-open area, **Undo** toast (10 s) on tick; ticks are cheap to reverse because unticking is allowed |
| **Items jumping under the thumb** | Ticked row leaves the list and the next row slides up | Decide the move rhythm explicitly (Q2); partner ticks never move rows on screen while the user is touching or within a short window |
| **Weak connection** | Add or tick spinner hangs, or fails silently | Optimistic UI + queue; "waiting" marker on rows; edit/delete/clear disabled offline with a stated reason |
| **Two people tick the same item** | Both think they are the one buying it; double purchase | Set-state tick is idempotent, so no error; show **who** ticked and when (attribution); live update with polite announcement. Cannot be fully prevented (no reservation feature in v1); say so rather than invent a claim feature |
| **Add then tick offline, partner deletes meanwhile** | Replay hits a missing row | Server answers success or 404 on a tick for a missing item; client should drop the queued tick silently and refresh (Q8) |
| **Free-text category drift** | "Fruit & Veg", "Fruits and veg", "Veg" produce separate groups | Normalised key merges whitespace/case/diacritics only. It does **not** merge "Fruit" with "Fruits". Mitigate with **suggestions while typing** and showing the existing spelling; accept that semantic variants remain separate. Consider a "Rename category" later (out of scope) |
| **Price per line confusion** | User types unit price (e.g. 12 per kg) and the subtotal is wrong for quantity 3 | Field label "Price for the whole line" and help text (D14); show "Total price" wording not "Price"; the row shows "140 MAD" for ×2 so the meaning is visible; no "each" display |
| **Accidental Clear bought** | Loses the shop's record | Only in group head, confirmation with count, 10 s Undo restoring them; consider that Undo must survive on both phones (Q6) |
| **Partner changes an item mid-edit** | 409 on save | Merge flow like Trips' sheets (reuse); tick never 409 |
| **Long names / category** | Row breaks at 320 px or 200% zoom | `long` fixture; wrap, no truncation of the name |
| **Stale list shown as live** | Out-of-date data on weak signal | Reuse "stale" and offline notice wording |

**Regulatory / compliance flags**
- **EAA (EU accessibility):** applies. Target size, contrast, keyboard operation on desktop, live region for partner changes, no colour-only state, reduced-motion respected for any row movement, focus return after sheets. Note: a bottom-sheet and a floating add control must be reachable by keyboard and screen reader.
- **EU AI Act:** no AI feature in scope; no auto-categorisation or suggestions by model. Keep it that way in v1 (suggestions are existing-category lookup only), so no disclosure is needed.
- **GDPR / DSA:** attribution shows each partner's display name and timestamps to the other partner only, within the space; nothing leaves the space. No consent, subscription or cancellation flow here. Clear-bought and delete are real deletes, not retention; wording should not imply otherwise.
- **No dark patterns:** no nudges, no upsell, no streaks. Nothing here needs any.

## Assumptions to validate

Ranked by risk. Each is a 3-person think-aloud task [Rocket Surgery]; use the prototype with `?state=offline` and `?state=live` where noted, participants being people who shop with a partner (ideally in the real shop, or standing with a trolley or bag in one hand).

1. **"Ticked rows can leave the list without the user losing their place."** Hold the phone in one hand, in the walking posture. Task: "You're at the vegetables. Tick tomatoes, mint and the lemons you add now." Watch for taps on the wrong row, hesitation after a row moves, and whether they can say what's left afterwards. Fail signal: any wrong-row tap caused by movement.
2. **"People understand that price is for the whole line and that unpriced items are not in the total."** Task: "Add olive oil, two bottles, 140 MAD from the shelf label; now tell me what the total on screen means." Watch for entering the unit price, misreading the total as complete, and reading "N have no price". Fail signal: wrong explanation of total by 2 of 3.
3. **"Free-text category with suggestions keeps groups tidy."** Task: "Add 'oranges' under fruit and veg, however you'd naturally write it," then another person (or you) adds "Fruits". Watch what they type, whether suggestions are noticed, and whether a near-duplicate group appears. Fail signal: the suggestion is ignored by 2 of 3, and groups split.
4. **(Optional) "Clear bought is safe."** Task: "You've finished the shop; tidy the list." Watch whether they find Clear bought in the group head, read the count, and use Undo on purpose after a deliberate mis-clear. Fail signal: cannot find it, or does not realise Undo exists.

## Questions for the Architect / Writer (with recommended answers)

**Q1. Sort order inside a group.** Newest first, oldest first, or alphabetical?
*Recommend:* **newest added first**, so an item just added is findable at the top of its group; the order is frozen while the screen is on, recomputed on arrival/foreground (as Goals and Trips lists do). Alphabetical helps scanning but hides new items in the middle at the moment of adding. Record the choice in `ia.md`.

**Q2. When does a ticked item leave its group?**
*Recommend:* on tick the row shows its checked state in place for a short beat and then moves to the bought group, with **no reflow of the rows beneath for the user's own tick until the beat ends**, and **never** during partner-driven changes while a touch is active (apply on release or on next idle). Reduced motion: the move is instant but the beat is the same. This is a design question the Architect should settle; the alternative (strike-through in place until the next foreground) is safer for mis-taps but leaves long lists cluttered; pick one and test it (assumption 1).

**Q3. Where does quick add live and what does it capture?**
*Recommend:* floating primary on phones, masthead on wide (established pattern). Sheet with **name focused**, a visible but optional "Add details" expansion (quantity, category, price, notes) and "Add another" behaviour: after saving, the sheet stays open and clears for the next item (several adds in a row at home), closing on explicit Done. Category defaults to the group the user was last in, not guessed, only if that is cheap; otherwise leave blank (goes to **Other**).

**Q4. Is a category required, and do suggestions auto-fill?**
*Recommend:* optional. Suggestions appear as the user types and are tappable; no auto-fill from the name. Typing a variant that normalises to an existing key silently adopts the existing spelling (server rule), and the form should show "Added to Fruit & Veg" so the user sees the merge.

**Q5. How is the total shown and explained?**
*Recommend:* header line "N left" plus an estimated total for unbought priced items; "M have no price" beside it; tapping the total opens per-group subtotals (numbers are earned). Group heads show their own subtotal only when at least one item has a price. Bought items are not part of the total. Wording uses "estimated", never "total" alone.

**Q6. Clear bought: scope and Undo.**
*Recommend:* confirmation dialog stating the count ("Clear 3 bought items?"), then a 10 s Undo toast that restores them (re-creation with the original ids and attribution). Disabled offline with the standard reason. If the partner is on the list, a clear is a delete they will see live; the Undo is per-device and local to the clearer, so state in the toast copy that the other phone will see items return too. The Architect should confirm the API's restore path (clear-bought returns the deleted rows, which the client replays with their ids; idempotent creates make that safe).

**Q7. Name autocomplete from past items?**
*Recommend:* **out of v1** (no item history in the data model; the brief says suggestions are for categories only). Revisit if the think-aloud shows capture is slow.

**Q8. Tick on an item the partner just deleted or cleared.**
*Recommend:* the API answers a tick for a missing item as a no-op success (or 404 the client treats as already gone); the client drops the queued tick, removes the row on refetch, and announces nothing loud. A tick **never** shows an error dialog. Conversely, if the partner unticks while I tick, last write wins, per the §5 note on set-state endpoints, and the row shows whoever acted last.

**Q9. Attribution density.**
*Recommend:* avatar on the row for who added (small, as in the design system's ShoppingItem), and in the bought group "Bought by Youssef, 14:32" (time today, date otherwise; year only when not the current year). No attribution text on unbought rows beyond the avatar to keep the aisle scan quiet.

**Q10. Edit access in the shop.**
*Recommend:* tapping the row body opens the item sheet (view first; edit button inside) rather than editing inline; edit, delete and clear show a disabled state with "needs a connection" when offline, and the add and tick controls remain obviously enabled. This keeps the two offline-capable actions the loudest controls offline.

(Reversible small decisions the Architect may take without asking: default group collapse state, empty-state copy, quantity shown only when above 1, stepper limits, notes truncation lines.)
