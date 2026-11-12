# Copy: Zamane Shopping (list, add row, item sheet, item form, confirmations, states)

**Format.** `id` | string | notes. `{braces}` are values the app fills in. Counts use ICU plural syntax inside one whole-sentence key. Dates, times and amounts arrive pre-formatted from `Intl` (`{date}` = "Sat 7 Nov", `{time}` = "10:42", `{amount}` = "243", shown as "243 MAD"; year only when not the current year). Nothing is assembled from fragments.
**Reuse.** Rows marked **(Home)**, **(Goals)** or **(Trips)** are those files' settled strings, used verbatim. The offline notice's first sentence is Home's, word for word.
**Names.** `{name}` is a partner's first name (or "you" in solo, see the select keys). `{item}` is an item name as typed. `{group}` is a category as stored. Namespaces: `shop.*` list, `shopAdd.*` add row, `shopSheet.*` item sheet, `shopForm.*` item form, `shopCat.*` category combobox, `shopConfirm.*`, `shopToast.*`, `shopLive.*`, `shopOffline.*`, `shopA11y.*`.
**Limits (aligned with `ia.md`).** The brief for this copy listed name 80, category 80, notes 500. `ia.md` is the binding source and says: **name 120** (ARCH §4.1, S2), **notes 4,000** (ARCH §4.1, A8), **category 60** and **quantity up to 999** (A8, "assumed, confirm", Q1). This file uses the `ia.md` numbers. If the user wants the tighter numbers, only `{max}` values change; no string has a number written into it.

| Field | Limit | Counter appears | Source |
|---|---|---|---|
| Name | 120 characters | in the last 20 | ia S2, ARCH §4.1 |
| Quantity | whole number, 1 to 999 | never | ia A8 (confirm Q1) |
| Category | 60 characters | in the last 20 | ia A8 (confirm Q1) |
| Price | a number, up to the currency's decimals (MAD: 2), at least 0 | never | ia F4 U3 |
| Notes | 4,000 characters | in the last 200 | ARCH §4.1 |

---

## Voice

Inherited from Home, Goals and Trips: **warm, plain, specific.** Sentence case, verbs first, "you", first names. No exclamation marks, no emoji, no urgency. Shopping adds one rule: **in the shop, shortest wins.** A row, a toast and a count each say one thing.

| Adjective | This | Not that |
|---|---|---|
| Warm | "Add what you need and you'll both see it." | "Your list is empty! Start adding items now!" |
| Plain | "2 items have no price." | "Total is a lower bound; some line items lack a price value." |
| Specific | "Added Milk to Dairy" | "Item added successfully" |

**Tone by moment.**
- **At home, adding:** instant and quiet. One short toast, no cheering.
- **In the shop:** the fewest words. Names, counts and prices do the talking. Errors say what still works.
- **Totals:** a fact, never a promise. "243 MAD" is the sum of the prices you entered; the next line says what it leaves out. Nothing is estimated.
- **Offline or error:** what is true, what still works, what is kept. No apology, no "Oops", no blame.
- **Destructive:** slower and exact. The title names the thing or the count; the body names who it affects; the safe button comes first and has focus. Undo is offered after, and the copy says "You can undo this" only in the toast, where it is true.
- **Partner news:** a fact, name first. "Youssef added Eggs."

**Honesty.** No fake urgency, no confirmshaming, no invented figures. Example data on screen is labelled. The total never hides that it is partial. "Bought" means someone ticked it, nothing more.

---

## Glossary

Home's, Goals' and Trips' glossaries apply (partner, space, "waiting to sync", "Back online", delete, draft).

| Term | Meaning | Never call it |
|---|---|---|
| list | the one shared shopping list (nav label "Shopping") | cart, basket (that is the icon), wishlist |
| item | one line on the list | product, entry (data-model word), task |
| category | the free-text group an item belongs to ("Dairy") | aisle, section, department, tag |
| Other | the group of items with no category | Uncategorised, Misc, General |
| bought | an item someone ticked | done (as a state word; "Bought" is the group name), checked, purchased, got |
| left to buy | items not yet bought | remaining, outstanding, to do |
| Bought (group) | the last group, all bought items | Done, Completed, History |
| clear bought | remove every bought item at once | empty, purge, archive |
| put back | untick a bought item, from the sheet | undo (Undo is the toast button), restore (Restore is the Undo of a delete) |
| Tidy up | move ticked rows to Bought and unticked ones back | refresh, sort, reorder |
| price | what the whole line cost or will cost. **Always per line, never per unit.** | unit price, cost, amount (amount is a number formatted in the summary only) |
| quantity | how many (a whole number) | count, units, qty (not even abbreviated in a visible label) |
| total | the sum of prices of items left to buy. Said as "{amount} MAD" next to "left to buy" | estimate, budget, bill |
| no price | an item with no price entered | unpriced, free, 0 MAD |
| Waiting to sync | an add or a tick on this phone the server hasn't received | pending, queued (internal word), unsaved |
| Add with details | the button that opens the item form | Advanced, More options, Expand |

Pronoun rule as Goals: "you" to the person, first name for the partner, "you" for your own acts in solo ("Bought by you"), "your other device" for the same person.

---

## Screens

Document titles are unique, `{screen} – Zamane`.

| id | String | Notes |
|---|---|---|
| `shop.title.list` | Shopping – Zamane | also `?focus=add` |
| `shop.title.list.offline` | Shopping (offline) – Zamane | (Trips pattern) |
| `shop.title.form.new` | Add item – Zamane | `?item=new` |
| `shop.title.form.edit` | Edit {item} – Zamane | `?item=<id>` |

### Shopping list

#### Masthead and add row (reading order: h1, add row, summary)

| id | String | Notes |
|---|---|---|
| `shop.h1` | Shopping | page title; focus lands here from the tab |
| `shopAdd.label` | Add an item | the field's accessible name; also the placeholder (the label is the name, not the placeholder alone: it is repeated in the accessible name) |
| `shopAdd.submit` | Add | button; verb; 44 px |
| `shopAdd.more` | Add with details | accessible name of the icon-only More button. Tooltip: same |
| `shopAdd.error.empty` | Type what you need. | under the field; focus stays; announced once |
| `shopAdd.hint.duplicate` | {item} is already on the list ({group}). | shown while typing; Enter still adds. If the existing item has no category: "{item} is already on the list." (`shopAdd.hint.duplicateNoGroup`) |
| `shopAdd.count` | {remaining, plural, one {# character left} other {# characters left}} | only in the last 20 characters |
| `shopAdd.limit` | Names can be up to {max} characters. | helper once the limit is reached; the field stops there |

#### Summary (the answer to "how much is left?")

| id | String | Notes |
|---|---|---|
| `shop.summary.left` | {n, plural, one {# left to buy} other {# left to buy}} | the bold count. Same definition as Home's `shoppingLeft` |
| `shop.summary.leftWithAmount` | {n} left to buy · {amount} MAD | the line as it reads: "7 left to buy · 243 MAD". Built as one whole string per locale, not from the two keys above |
| `shop.summary.none` | Nothing left to buy | 0 unbought, list not empty. (Home) wording |
| `shop.summary.noPrice` | {n, plural, one {# item has no price.} other {# items have no price.}} | shown whenever n >= 1: "2 items have no price." |
| `shop.summary.toggle` | Show prices by group | accessible name of the amount button when closed; `aria-expanded` carries the state |
| `shop.summary.toggle.open` | Hide prices by group | when open |
| `shop.summary.loading` | Loading… | reserved slot, no layout shift |
| `shop.summary.tidy` | Tidy up ({n}) | ghost button; hidden at 0; name `Tidy up, move {n} items` (`shop.summary.tidy.name`: {n, plural, one {Tidy up, move # item} other {Tidy up, move # items}}) |

Breakdown (disclosure on phones, always open in the wide rail):

| id | String | Notes |
|---|---|---|
| `shop.breakdown.h` | By group | rail heading / disclosure heading |
| `shop.breakdown.row` | {group} · {amount} MAD | one row per group; item count is in the group head, not repeated |
| `shop.breakdown.noPrices` | No prices | in place of an amount for a group with no priced item |
| `shop.breakdown.unpriced` | {n, plural, one {# without a price} other {# without a price}} | final line, only when n >= 1 |
| `shop.breakdown.bought` | Bought so far · {amount} MAD | quiet, below a rule; only when a bought item has a price |

#### Groups and rows

| id | String | Notes |
|---|---|---|
| `shop.group.other` | Other | the name of the no-category group (never "Uncategorised") |
| `shop.group.count` | {n, plural, one {# item} other {# items}} | in the head, beside the subtotal |
| `shop.group.subtotal` | {amount} MAD | no amount at all for a group with no price (never "0 MAD") |
| `shop.group.unpriced` | · {n} without a price | same line as the subtotal, only when the group has both priced and unpriced items. Compact form below 360 px: `shop.group.unpriced.short` = · {n} no price |
| `shop.row.qty` | ×{n} | shown only when n > 1 |
| `shop.row.price` | {amount} MAD | price slot; empty when no price (no dash) |
| `shop.row.addedBy` | Added by {name} | meta line; solo: "Added by you" (`shop.row.addedBy.self`) |
| `shop.row.boughtBy` | Bought by {name} · {when} | `{when}` = "just now", "10:42" (today) or "Sun 8 Nov" |
| `shop.row.boughtBy.self` | Bought by you · {when} | |
| `shop.row.boughtIn` | {group} · Bought by {name} · {when} | in the Bought group the category joins the meta line |
| `shop.row.pending` | Waiting to sync | cloud-off icon plus words, never colour alone |
| `shop.row.failed` | Couldn't sync | x icon plus words |
| `shop.row.new` | New | the 2 s highlight has no text; this is the accessible hidden label only if the row is read in that window (not used visually) |

#### Bought group

| id | String | Notes |
|---|---|---|
| `shop.done.head` | Bought · {n} | disclosure button; `aria-expanded` |
| `shop.done.amount` | {amount} MAD | quiet, only when a bought item has a price |
| `shop.done.clear` | Clear bought | ghost danger-text button, sibling of the disclosure; name `Clear {n} bought items` (`shop.done.clear.name`) |
| `shop.done.clear.name` | {n, plural, one {Clear # bought item} other {Clear # bought items}} | label-in-name: contains "Clear bought"? No: see audit below; the visible label is "Clear bought", so the name is "Clear bought, {n} items" instead |
| `shop.done.clear.name.final` | {n, plural, one {Clear bought, # item} other {Clear bought, # items}} | **use this one** |
| `shop.done.clear.offline` | Clearing needs a connection. | reason beside the `aria-disabled` button |
| `shop.done.clear.syncing` | Syncing… try again in a moment. | while the queue is not empty |

#### Empty, all-bought

| id | String | Notes |
|---|---|---|
| `shop.empty.title` | Nothing on the list yet. | (Home) wording. This is the heading |
| `shop.empty.body` | Add what you need and you'll both see it. | one sentence, one action (the add row below). Solo: "Add what you need." (`shop.empty.body.solo`) |
| `shop.allBought.title` | Nothing left to buy | calm text, no celebration (U4). Same string as `shop.summary.none` |
| `shop.allBought.body` | Everything on the list is bought. Add more below, or clear the bought items. | one short line under the title |

#### Loading, error, stale, offline

| id | String | Notes |
|---|---|---|
| `shop.loading.sr` | Loading the list | visually hidden, on the skeleton region; `aria-busy` |
| `shop.error.title` | The list didn't load. | no cache; heading |
| `shop.error.body` | You can still add items. They'll show up here once the list loads. | tells what still works |
| `shop.error.retry` | Try again | |
| `shop.error.stale` | Couldn't refresh. Showing the latest data on this phone. | **(Goals)** verbatim; slim notice under the summary |
| `shop.stale.updated` | Updated {age} ago | only when the cache is >= 10 min old and a refetch is pending; `{age}` "12 min" |
| `shopOffline.notice` | You're offline. Showing the latest data on this phone. Adding items and ticking them off still work and sync when you're back online. Editing, deleting and clearing bought items need a connection. | first sentence is Home's, verbatim; second adapted as Trips; `role="status"` once on entering offline |
| `shopOffline.announce` | You're offline. Adding items and ticking them off still work. | polite, once on change |
| `shopOffline.online` | Back online. | polite when the connection returns (Home) |

### Item sheet (read)

| id | String | Notes |
|---|---|---|
| `shopSheet.title` | {item} | the dialog's title (h2, focus lands here) |
| `shopSheet.qtyPrice` | ×{n} · {amount} MAD | shown parts only; no price: "×{n}"; qty 1 and no price: nothing |
| `shopSheet.priceNote` | for the whole line | muted, after the amount: "140 MAD for the whole line" |
| `shopSheet.category.label` | Category | |
| `shopSheet.category.none` | Other | an item with no category reads "Other" |
| `shopSheet.notes.label` | Notes | full text, wrapping, selectable |
| `shopSheet.addedBy` | Added by {name} · {date} | solo: "Added by you · {date}" |
| `shopSheet.boughtBy` | Bought by {name} · {date}, {time} | e.g. "Bought by Youssef · Sun 8 Nov, 10:42" |
| `shopSheet.edit` | Edit | secondary; name `Edit {item}` |
| `shopSheet.putBack` | Put back on the list | only when bought; name `Put {item} back on the list` |
| `shopSheet.delete` | Delete | danger secondary; name `Delete {item}` |
| `shopSheet.close` | Close | icon button name |
| `shopSheet.edit.offline` | Editing needs a connection. | reason beside `aria-disabled` Edit |
| `shopSheet.edit.queued` | This item hasn't synced yet. | reason for a queued row's Edit |
| `shopSheet.delete.offline` | Deleting needs a connection. | |
| `shopSheet.remove` | Remove from the queue | queued add only; works offline; no confirm; name `Remove {item} from the queue` |
| `shopSheet.failed.body` | This item couldn't sync. Try again, or remove it. | for a row in the "Couldn't sync" state |
| `shopSheet.retry` | Try again | |
| `shopSheet.gone` | {name} deleted {item}. | sheet body swap when the partner deletes it while open; focus to Close. Solo/other: "{item} was deleted." |
| `shopSheet.loadFail` | Couldn't load this item. | only when opened by a stale id |

### Item form (add with details, edit)

| id | String | Notes |
|---|---|---|
| `shopForm.title.new` | Add item | |
| `shopForm.title.edit` | Edit item | |
| `shopForm.close` | Close | icon button name |
| `shopForm.name.label` | Name | required; marked "Name (required)" in the accessible name |
| `shopForm.name.help` | Put units or weight here, for example "Rice 1 kg". | |
| `shopForm.name.error.empty` | Add a name. | |
| `shopForm.name.error.long` | Use {max} characters or fewer. | on submit; the field already stops at the limit |
| `shopForm.qty.label` | Quantity | |
| `shopForm.qty.dec` | Decrease quantity | icon-only − |
| `shopForm.qty.inc` | Increase quantity | icon-only + |
| `shopForm.qty.error` | Use a whole number from 1. | zero, negative, decimal, not a number. Typed text is kept. The − button stops at 1 |
| `shopForm.qty.error.max` | Use a number up to {max}. | above the maximum (999) |
| `shopForm.cat.label` | Category | |
| `shopForm.cat.help` | Optional. Items with no category go under Other. | |
| `shopForm.cat.match` | Will be filed under "{group}". | feedforward when the typed spelling matches an existing group. Never shown when identical |
| `shopForm.cat.error.long` | Use {max} characters or fewer. | |
| `shopForm.price.label` | Price ({currency}) | label "Price (MAD)" |
| `shopForm.price.help` | Price for the whole line, not per unit. | |
| `shopForm.price.error.format` | Use numbers only, for example 12 or 12,50. | unparseable ("12,5x"). Typed text is kept |
| `shopForm.price.error.decimals` | {currency} has {n, plural, one {# decimal} other {# decimals}}. | "MAD has 2 decimals." |
| `shopForm.price.error.negative` | Use a price of 0 or more. | |
| `shopForm.notes.label` | Notes | |
| `shopForm.notes.help` | Optional. Brand, size, or where to find it. | |
| `shopForm.notes.count` | {remaining, plural, one {# character left} other {# characters left}} | last 200 only |
| `shopForm.notes.error.long` | Use {max} characters or fewer. | |
| `shopForm.submit.new` | Add item | primary |
| `shopForm.submit.edit` | Save changes | primary |
| `shopForm.cancel` | Cancel | secondary, closes with the discard guard |
| `shopForm.draft.restored` | Draft restored. | above Name |
| `shopForm.draft.discard` | Discard draft | |
| `shopForm.pending` | Saving… | primary label while pending (name stays) |
| `shopForm.save.offline` | You're offline. You can save your changes when you're back online. What you've changed stays here. | **(Trips `tripOffline.reason.save`)** reason beside the `aria-disabled` Save |
| `shopForm.save.online.announce` | Back online. You can save your changes now. | polite, when Save re-enables |
| `shopForm.new.offline` | You're offline. This item will be added when you're back online. | helper beside the **enabled** Add item (it queues) |
| `shopForm.error.save` | Couldn't save. Try again. | alert; fields kept; retry is safe |
| `shopForm.error.summary` | {n, plural, one {Fix 1 field to continue.} other {Fix # fields to continue.}} | alert above the primary on a failed submit; first invalid field gets focus |
| `shopForm.gone` | {name} deleted {item}. This can't be saved. | alert banner, focus to it; solo/other: "{item} was deleted. This can't be saved." |
| `shopForm.gone.copy` | Copy text | copies the typed name and notes |
| `shopForm.gone.close` | Close | |

Merge after a 409 (Goals §6.7, Trips pattern):

| id | String | Notes |
|---|---|---|
| `shopMerge.notice` | {actor, select, partner {{name} changed this item while you were editing. Check the marked fields, then save again.} self {This item changed on your other device while you were editing. Check the marked fields, then save again.} other {This item changed on another phone while you were editing. Check the marked fields, then save again.}} | `role="status"`; focus goes here after a 409 |
| `shopMerge.changed` | Changed by {name} | per field, where only they changed it |
| `shopMerge.conflict` | {actor, select, partner {{name} changed this to "{value}".} self {Your other device changed this to "{value}".} other {Another phone changed this to "{value}".}} | both changed differently; yours is kept |
| `shopMerge.useTheirs` | Use theirs | button next to the conflict line; name `Use theirs for {field}` |
| `shopMerge.live` | (= `shopMerge.notice`) | same wording when it arrives live before Save |

### Category combobox (inside the item form)

| id | String | Notes |
|---|---|---|
| `shopCat.listLabel` | Existing categories | accessible name of the suggestions list |
| `shopCat.count` | {n, plural, one {# suggestion} other {# suggestions}} | polite, on open |
| `shopCat.none` | No matching category. This will be a new one. | shown in the list area when nothing matches; polite |
| `shopCat.new` | New category: {value} | not used as an option; reserved if the list adds a "create" row (not in this design) |

### Confirmations

| id | String | Notes |
|---|---|---|
| `shopConfirm.delete.title` | Delete {item}? | alertdialog title |
| `shopConfirm.delete.body` | {name} added it {date}. It will be removed for both of you. | solo: "You added it {date}. It will be removed." |
| `shopConfirm.delete.keep` | Keep it | safe, focused |
| `shopConfirm.delete.confirm` | Delete | danger; name `Delete {item}` |
| `shopConfirm.delete.error` | Couldn't delete. Try again. | stays open, Delete re-enables |
| `shopConfirm.clear.title` | {n, plural, one {Clear # bought item?} other {Clear # bought items?}} | |
| `shopConfirm.clear.body` | They'll be removed for both of you. | solo: "They'll be removed." |
| `shopConfirm.clear.keep` | {n, plural, one {Keep it} other {Keep them}} | safe, focused |
| `shopConfirm.clear.confirm` | {n, plural, one {Clear # item} other {Clear # items}} | danger; follows the live count |
| `shopConfirm.clear.error` | Couldn't clear. Try again. | |
| `shopConfirm.clear.live` | The list changed. Now clearing {n, plural, one {# bought item} other {# bought items}}. | polite, when the partner ticks while the dialog is open |
| `shopConfirm.discard.title` | Discard changes? | |
| `shopConfirm.discard.body` | What you've typed won't be kept. | |
| `shopConfirm.discard.keep` | Keep editing | safe, focused |
| `shopConfirm.discard.confirm` | Discard | |

---

## System messages

### Toasts (10 s with Undo; add toast 4 s without)

| id | String | Notes |
|---|---|---|
| `shopToast.added` | Added {item} to {group} | `{group}` is a category or "Other": "Added Batteries to Other" |
| `shopToast.added.offline` | Added {item} | offline: the row says "Waiting to sync"; the toast adds nothing |
| `shopToast.bought` | Bought {item} | with **Undo**; `aria-live="off"` (the checkbox announces) |
| `shopToast.deleted` | Deleted {item} | with **Undo** |
| `shopToast.cleared` | {n, plural, one {Cleared # item} other {Cleared # items}} | with **Undo**; `{n}` is the server's count |
| `shopToast.removed` | Removed {item} | queued add removed; **Undo** re-queues |
| `shopToast.restored` | Restored {item} | 4 s; after Undo of a delete |
| `shopToast.restoredMany` | {n, plural, one {Restored # item} other {Restored # items}} | after Undo of clear bought |
| `shopToast.alreadyGone` | {item} was already removed. | 404 on delete; no Undo |
| `shopToast.undo` | Undo | button; name `Undo: {summary}` e.g. "Undo: Deleted Mint" |
| `shopToast.undo.error` | Couldn't undo. {item} is still removed. | clear: "Couldn't undo. The items are still removed." with **Try again** |
| `shopToast.undo.offline` | Undo needs a connection. | reason beside the `aria-disabled` Undo; the 10 s keep running |
| `shopToast.dismiss` | Dismiss | icon button name |

### Failures

| Failure | String | Where |
|---|---|---|
| Add rejected by the server | Couldn't sync. (row) · sheet: `shopSheet.failed.body` | row + one alert: "Couldn't add {item}. Open it to try again or remove it." (`shopAdd.error.rejected`) |
| Tick rolled back (404/403) | Couldn't mark {item} as bought. | alert (`shopToast.tick.error`) |
| Tick on a deleted item | {name} removed {item}. | polite; row removed on replay. Solo/other: "{item} was removed." |
| Name too long (server 413) | Use {max} characters or fewer. | `shopForm.name.error.long` |
| List load, no cache | `shop.error.title` + `shop.error.body` | in the list |
| Refresh, with cache | `shop.error.stale` | slim notice |
| Save fails | `shopForm.error.save` | in the form |
| Delete fails | `shopConfirm.delete.error` | in the dialog |
| Clear fails | `shopConfirm.clear.error` | in the dialog |
| Undo fails | `shopToast.undo.error` | in the toast |
| 409 | `shopMerge.notice` | form |
| Offline | `shopOffline.*`, `shopSheet.edit.offline`, `shopSheet.delete.offline`, `shop.done.clear.offline` | beside each control |

### Empty, loading, success

| State | String |
|---|---|
| Empty list | `shop.empty.title` + `shop.empty.body` |
| All bought | `shop.allBought.title` + `shop.allBought.body` |
| Loading | skeleton rows; `shop.summary.loading`; `shop.loading.sr` |
| Add success | `shopToast.added` |
| Edit success | no toast; announce "Saved." (`shopA11y.saved`) |
| Tick success | the checkbox state; toast `shopToast.bought` (silent to assistive tech) |

### Live announcements (polite; one per partner act; mirrored into an open sheet; never for my own acts, never on load)

| id | String |
|---|---|
| `shopLive.added` | {name} added {item}. |
| `shopLive.addedMany` | {name} added {n} items. (bursts of 3 or more within 3 s) |
| `shopLive.bought` | {name} bought {item}. |
| `shopLive.putBack` | {name} put {item} back on the list. |
| `shopLive.changed` | {name} changed {item}. |
| `shopLive.removed` | {name} removed {item}. |
| `shopLive.cleared` | {name} cleared {n, plural, one {# bought item} other {# bought items}}. (without a count if the server sends none: "{name} cleared the bought items.") |

Solo has no partner, so `shopLive.*` does not occur. If the partner's name is unknown, "Your partner" replaces `{name}` (Home's rule).

---

## Accessibility strings

| id | String | Notes |
|---|---|---|
| `shopA11y.tick` | {item}, {n} | accessible name of the row checkbox, e.g. "Tomatoes, 6"; quantity omitted at 1: "Mint". Visible name is contained (WCAG 2.5.3) |
| `shopA11y.tick.pending` | Waiting to sync | accessible description when the row is queued |
| `shopA11y.row.open` | {item} | the row-body button's name; the description carries quantity, notes, price, attribution: "{n} items, {notes}, {amount} MAD, added by {name}" built per locale as one string (`shopA11y.row.desc`) |
| `shopA11y.row.desc` | {qtyPart}{pricePart}{notesPart}Added by {name} | the engineer passes a complete sentence per case; no fragment assembly in the translation file: use the four whole-sentence variants `shopA11y.row.desc.*` as needed |
| `shopA11y.group` | {group}, {n, plural, one {# item} other {# items}} | the h2's text content; subtotal is a separate span with its own text |
| `shopA11y.list` | Shopping list | `aria-label` of the groups region |
| `shopA11y.done` | Bought items | `aria-label` of the Bought group's list |
| `shopA11y.pending.icon` | Waiting to sync | cloud-off icon (Home) |
| `shopA11y.failed.icon` | Couldn't sync | x icon |
| `shopA11y.chevron` | (decorative) | `aria-hidden`; the disclosure button's text and `aria-expanded` carry the meaning |
| `shopA11y.more` | Add with details | (= `shopAdd.more`) |
| `shopA11y.saved` | Saved. | polite, after an edit |
| `shopA11y.deleted` | Deleted {item}. | polite, after delete |
| `shopA11y.cleared` | {n, plural, one {Cleared # item.} other {Cleared # items.}} | polite |
| `shopA11y.moved` | {n, plural, one {Moved # item.} other {Moved # items.}} | polite, after Tidy up |
| `shopA11y.added` | Added {item} to {group}. | polite; the toast's announcement (the toast itself is not announced twice) |
| `shopA11y.offline` | (= `shopOffline.announce`) | |
| `shopA11y.online` | Back online. | |
| `shopA11y.form.online` | (= `shopForm.save.online.announce`) | |
| `shopA11y.skip` | (none) | no "Skip to Bought" link (IA Q3) |
| `shopA11y.nav.current` | Shopping | nav tab (`aria-current="page"`); icon is a basket, decorative |
| `shopA11y.dialog.sheet` | {item} | `aria-labelledby` of the item sheet |
| `shopA11y.dialog.confirm` | (= the confirm's title) | `aria-labelledby`; the body via `aria-describedby` |
| `shopA11y.alt.none` | (no meaningful images on this screen) | no `alt` text needed; the arch is not used here |

---

## Label-in-name audit (WCAG 2.5.3)

| Visible label | Accessible name | OK |
|---|---|---|
| Add | Add | yes |
| (icon) | Add with details | n/a icon-only |
| Edit | Edit {item} | starts with the visible text |
| Delete | Delete {item} | yes |
| Put back on the list | Put {item} back on the list | **no**: the visible words are split; use "Put back on the list" as the name and rely on the dialog title for the item |
| Clear bought | Clear bought, {n} items | yes |
| Tidy up (2) | Tidy up, move 2 items | yes |
| Undo | Undo: Deleted Mint | yes |
| Tick (checkbox) | {item}, {n} | label is the visible name |
| Use theirs | Use theirs for {field} | yes |

Decision: `shopSheet.putBack` keeps its visible text as the accessible name, "Put back on the list", with no item inserted. The sheet's title already names the item.

---

## i18n notes (French and Dutch for length; Arabic and RTL)

- Allow 30 to 40% growth. The tightest places are the group head line ("3 items 18 MAD · 1 without a price", which has a short form below 360 px), the 44 px buttons (Add, Tidy up, Clear bought) and the sheet's action row, which wraps to two lines before it truncates.
- Plurals are ICU, one whole sentence per key (no "item(s)"). Arabic needs more plural forms than English; do not hard-code "item/items" outside the key.
- Amounts, dates and times arrive from `Intl`; "MAD" follows the space's currency. The example "12,50" in the price error follows the user's locale decimal separator; the string takes `{example}` pre-formatted (`12 or 12,50` in fr/nl, `12 or 12.50` in en) so the message matches what the field accepts.
- The group head shows `{group}` as typed; it is user text and is never translated or cased.
- Icons never carry text. "Other" is one translatable key; it is not matched by value anywhere in code.

---

## Open items

- **Limits.** This file follows `ia.md` (name 120, notes 4,000, category 60, quantity 999). The request mentioned name 80, category 80, notes 500; say if you want those and only the `{max}` values change. Category and quantity caps are unconfirmed in the Zod schemas (ia Q1, A8).
- **Price error.** The wording is the requested "Use numbers only, for example 12 or 12,50." `ia.md` F4 U3 had "Use a number like 12.50."; this file uses the requested one. Make `{example}` follow the locale (see i18n notes).
- **A9.** If the realtime notice for clear bought carries no count, use the count-less `shopLive.cleared`.
- **Solo.** Every string with a partner name has a "you" variant; confirm none of them is shown in the prototype's `solo` fixture with "Added by Sara".
- **No invented data.** The example list (Olive oil 140 MAD, Tomatoes ×6, and so on) is design-system sample data and is labelled "Example data; 7 left, as on Home." in the prototype footnote (`shop.example.note`). No testimonials, statistics or customer names appear.
