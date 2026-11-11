# Build notes: in-trip dialogs (direction B · Saffron light)

**Files:** `dialogs.js` (replaces the stub; registers `Z.dialogs`) and `dialogs.css`. No other file was edited.
**Run:** open `trips.html` from disk (file:// works). There's no build step and no new dependency.
**Namespace:** classes and ids are `dg-*`, form fields `dgf-*`. The detail already uses `td-*`, and four of its classes (`.td-title`, `.td-notes`, `.td-notice`, `.td-why`) would have collided.

## What was built
- **Two `<dialog>`s,** created once and appended to `body`. Each has a hidden `.dlg-live` (polite) and a `role="alert"` region.
  - **`#dg-sheet`: the read sheets.** Not in the URL. Bottom sheet on phones; a centred 28 rem dialog from 48 rem. Dismissed with ✕, Esc or the backdrop (press and release outside).
  - **`#dg-form`: the URL-backed forms,** `data-no-place`. Full screen on phones, with its height taken from `visualViewport` so the footer rides the keyboard. From 48 rem it's centred: 36 rem wide (32 rem for Schedule), at most 90 dvh, with a fixed head and footer. No backdrop dismissal.
- **Ideas vs commitments in the sheets.**
  - **The plan item sheet** puts its facts (When, Where, Cost, Link, Done by) on a solid `.commit` card. "From Places: …" says where the item came from.
  - **The place sheet** puts its facts in a dashed `.idea` block. The block always carries a status in words: "Idea. Not in the plan yet.", "In the plan · …" or "Visited · …".
  - **The Schedule dialog** draws the place it's scheduling as a dashed idea block too.
  - **No saffron** appears in any dialog.
- **Plan item sheet**
  - **Content:** h2 title (Young Serif, 28/34, takes focus); then When, with a visual "17:30–19:00" and a spoken "17:30 to 19:00"; then "Ends the next day" when the end is before the start; Where as plain text; Cost ("No cost yet" when empty).
  - **Link:** shown as its host, with " (opens in a new tab)" in the name.
  - **Also:** the notes in full; **From Places: {place}**, which swaps to the place sheet; "Added by"; and "Waiting to sync".
  - **Actions:** **Edit**, which closes the sheet and pushes `?entry=<id>`; and **Delete**, danger at secondary weight.
- **Place sheet**
  - **Content:** type, the **Must-do** badge, Area, "About 150 MAD" or "No estimate", the link and the status.
  - **When it's in the plan:** **Show in the plan** (which uses `Z.detail.showEntry`) and the reschedule hint.
  - **Actions:** **Schedule** (ideas only), **Edit** and **Delete**. For a place in the plan, "Changes here don't change its plan item." describes Edit.
  - **A queued place:** Schedule and Edit are `aria-disabled` with "This place hasn't synced yet.", and **Remove** replaces Delete. Remove works offline and is confirmed with "It hasn't synced, so Youssef never saw it."
- **Prep item sheet**
  - **Fields:** Title, and Group as four radio cells, with "Moving it puts it at the end of the new group."
  - **Attribution:** "Added by" (not on seeded items) and "Done by".
  - **Actions:** **Save** and **Delete**.
  - **Behaviour:** the title is validated. Closing with changes is guarded by "Discard your changes?". Save runs the three-way merge on a 409, and a partner's edit is merged live.
- **Plan item form** (`?entry=new|<id>`, optional `&date=`)
  - **Fields:** Title, focused on new; Type, seven radio chips preset to Other; Day; Time (Start and End); and **Optional details**, folded on new and open on edit (Location, Cost with the MAD suffix and the name "Cost in MAD", Link, Notes with a counter from 3,600).
  - **Day:** a native select listing "Tue 24 Nov · Day 4 · 2 planned", then "No date yet" and "Another date…". "Another date…" reveals a date input, with "This is outside the trip dates." as a helper, not an error.
  - **Edit:** heading "Edit plan item", focus on the heading, every field unfolded, the "From Places: …" info line, and **Delete** last, set apart.
- **Place form** (`?place=new|<id>`)
  - **Fields:** Title, Type and the **Must-do** checkbox (the whole row toggles), then Optional details (Area, Estimated cost, Link, Notes).
  - **Edit:** "Changes here don't change its plan item." when the place is in the plan, and Delete last.
- **Schedule** (`?schedule=<placeId>`)
  - **Content:** what's being scheduled; Day, defaulting to "Choose a day", or today during the trip; Time; and the cost note.
  - **The primary** reads "Add to {date}" once a day is chosen.
  - **Close** isn't guarded, as copy allows.
  - **The body swaps** to "Youssef already put this on Tue 24 Nov." with **Show in the plan** (focused) and **Close**: on a `{taken}` result, live when the partner schedules it, or straight away when the place is already scheduled. It swaps to "Youssef deleted this place." with **Close** when the place goes.
- **Behaviour across the forms**
  - **Validation:** copy's errors go under the field, with `aria-invalid` and an `aria-describedby` that lists only what's on screen (error, helper, merge mark). A field is validated on blur only after typing, and its error clears as soon as it's valid. On submit, focus goes to the first error, opening Optional details if the error is in there.
  - **Submit:**
    - **Ctrl/⌘ + Enter** submits (`aria-keyshortcuts`), and Enter in Title submits too (quick capture).
    - "Adding…" / "Saving…" shows for a simulated 350 ms, and a double tap is ignored.
  - **Closing:**
    - **Esc, ✕, Cancel and Back** go through "Discard this plan item?" / "Discard this place?" / "Discard your changes?" when the form is dirty.
    - Esc is caught on keydown, so the close watcher can't skip the guard.
    - **Back while dirty** pushes the query again and asks.
    - Closing calls `Z.closeQuery('entry'|'place'|'schedule')`, plus `'date'` for a plan item.
  - **Drafts:** kept in localStorage under `zamane.trips.draft:[state:]<trip>:<kind>:<key>` (written 250 ms after a change, and on `pagehide` or when the page is hidden). On open they come back with "Draft restored." and **Discard draft**, which is confirmed. Drafts are cleared on save, discard and Close.
  - **Shell re-mounts:** when the shell re-mounts and calls `closeAll()`, the form is parked and resumed as it was if the same query is still in the URL.
  - **409:** the Goals §6.7 three-way merge, across every editable field. The notice "This plan item changed on another phone while you were editing. Check the marked fields, then save again." takes focus. Fields only they changed are taken and marked; a field both changed keeps my value, with "Use theirs", named "Use theirs: {field}". When nothing editable differs, Save retries once silently.
    - **A partner's live edit** runs the same merge: the notice is announced and focus stays put.
  - **404 / trip deleted:**
    - **Banner text:** "This plan item was deleted. Your changes weren't saved." (or the place's), or "Youssef deleted Chefchaouen. This can't be saved."
    - **Banner actions:** **Copy text** (Clipboard API, then `execCommand`) and **Close**.
    - **Behaviour:** the submit is hidden, the text stays, and the alert is announced. Focus moves to the banner only if focus was lost.
  - **Offline (ARCH §9):**
    - **New place:** submits and queues (`addPlace(…, {pending:true})`). Its helper is "You're offline. This place will be added when you're back online.", and the toast never says "saved".
    - **Plan item add and edit, place edit, Schedule and every Delete:** stay focusable with `aria-disabled` and copy's reason beside them. Pressing one shows and announces the reason. The draft is kept.
    - **While a form is open,** `Z.offlineMessage` and `Z.onlineMessage` are copy's form sentences ("Back online. You can add this now." and so on). The detail's own sentences are restored on close.
  - **Trip changes:** when the trip's dates change, the Day options are rebuilt, and a chosen day that left the range stays selected, labelled "{date} · outside the new dates". The subtitle, dialog name and title follow a rename.
- **Confirmations** use the shared `Z.confirm`: an alertdialog with focus on the safe button, where Esc keeps the item. The texts and buttons are copy's, verbatim:
  - **Plan item:** "Delete {title}?", with "It's removed from the plan for both of you.", then the place line ("{place} goes back to your ideas." or "…and is no longer visited."), then "You can't undo this."
  - **Place:** "Its plan item on {date} stays." (or "…with no date yet.").
  - **Prep item:** "Delete {title} from {group}?"
- **Deletes:**
  - **Feedback:** the sheet or form closes optimistically, and a toast ("Deleted {title} from the plan / Places / {group}", no Undo) follows.
  - **Focus:** goes to the next row, else the previous row, else the day's **Add** (`[data-act="day-add"][data-id=date]`) or the group's **Add to {group}** (`[data-act="add-open"]`), else the primary.
- **Toasts with Undo** for my own adds:
  - **Plan item added:** "Added {title} to Tue 24 Nov" (or "…to the plan, with no date yet"). Undo is named "Undo: remove {title} from the plan", and the toast becomes "Removed {title} from the plan".
  - **Scheduled:** "{title} is on {date}". Undo is named "Undo: take {title} out of the plan", and the toast becomes "{title} is back in your ideas".
  - **Place added:** "Added {title} to Places", or the queued "…Will sync when you're back online."
  - **Undo failures:** offline, Undo fails with copy's "Couldn't undo…" line. A queued place is the exception: its Undo cancels the queued add.
- **Focus when a dialog closes:**
  - **Default:** focus returns to the opener. If the detail re-rendered it, it's found again by id, then by `[data-act][data-id]`, then `#primary`. The toast is shown first, and the target is centred, so it stays clear of the toast and the floating primary (WCAG 2.4.11).
  - **After adding a plan item:** the new row.
  - **After scheduling:** the card's In the plan link (`[data-act="inplan"]`).
  - **After adding a place:** the new card, or the primary when Places isn't showing.
- **Trip deleted while a sheet is open:** the detail calls `closeAll()`, and focus goes to its **Back to Trips** (`#td-gone`).

## Fixtures (`trips.html?state=<s>#/trips/chefchaouen`, one query parameter)
They run on the first detail route. URL fixtures replace the URL with their query, so closing uses the replace branch of `Z.closeQuery`.

| `?state=` | Shows |
|---|---|
| `entry-sheet` | Hike to the Spanish Mosque, read sheet, heading focused |
| `place-sheet` | Goat cheese tasting (idea), with Schedule, Edit and Delete |
| `item-sheet` | Travel insurance, in Documents, with "Done by Youssef · Fri 6 Nov at 21:40" |
| `confirm-delete-entry` | the entry sheet with "Delete Hike to the Spanish Mosque?" on top, including "Spanish Mosque goes back to your ideas." |
| `confirm-delete-place` | the place sheet with "Delete Goat cheese tasting?" on top |
| `entry-form` | `?entry=new&date=2026-11-24`: Title focused, Day "Tue 24 Nov · Day 4 · 2 planned" |
| `entry-form-details` | `?entry=hike-mosque`: edit, every field unfolded, From Places, Delete |
| `entry-form-invalid` | new; submitted with no title, an end time without a start, cost "about 50" and link "east hill mosque": four errors, focus on Title |
| `entry-form-offline` | new, with "Breakfast on the roof" (example data) at 09:00 on Sun 22 Nov; Add to the plan is `aria-disabled` with the offline reason |
| `entry-form-conflict` | edit: I changed the start to 17:00 and added notes; Youssef saved first (start 16:45, new location); Save returns 409, and the notice, the conflict mark and the "Changed on another phone" mark show |
| `place-form` | `?place=new`: Title focused, Type Other, Must-do unchecked |
| `place-form-offline` | new, "Café with a view" (example data), Food; Add place enabled, with the queued helper |
| `schedule` | `?schedule=goat-cheese`: "Choose a day" |
| `schedule-taken` | `?schedule=spanish-mosque`: "Youssef already put this on Tue 24 Nov." with Show in the plan focused |
| `toast-added` | Hike to the Spanish Mosque re-added by Sara; "Added Hike to the Spanish Mosque to Tue 24 Nov" with Undo; focus on its row |
| `toast-scheduled` | Goat cheese tasting scheduled on Mon 23 Nov at 13:00 (example data); "Goat cheese tasting is on Mon 23 Nov" with Undo |
| `toast-place-queued` | offline; Goat cheese tasting re-added as queued; "Added Goat cheese tasting to Places. Will sync when you're back online." with Undo |

**Screenshots** are at 390×844 and 1440×900, light and dark, in `screenshots/dialog-<state>/` (for example `screenshots/dialog-entry-form-conflict/390x844-light.png`). `entry-form-conflict` and `toast-added` were re-shot after their fixes (the time-mark row, and the reveal moving the focused row clear of the toast).

## Deviations, and why
1. **The time marks name their field** ("Start time: Another phone changed this to "16:45"."). Start and End share one row, so the mark sits under the row, and copy's sentence alone wouldn't say which field changed. Before this fix, the mark sat inside the grid and pushed End below the fold.
2. **409 attribution is "another phone"** (actor `other`). The prototype's 409 body doesn't say who wrote it, and the fixture simulates a dropped socket, as in Goals. Live partner edits name Youssef.
3. **Schedule's Close isn't guarded.** Copy marks the guard optional ("skip if the dialog closes without confirming").
4. **The read sheets don't push history** (the brief: "not in the URL"). So Android Back leaves the trip instead of closing the sheet. ia §6.5 recommends a history entry; that's open.
5. **Schedule doesn't offer "Another date…".** Copy's `schedule.day.option` lists only the trip days and "No date yet".
6. **For an undated trip,** the Day options are the dates that already have plan items ("{date} · 2 planned", without "Day n"), then "No date yet" and "Another date…".
7. **Opening `?entry=<id>` or `?place=<id>` for a missing or queued record,** or `?schedule=` for a queued place, drops the query instead of showing a banner. A queued place can't be edited or scheduled until it syncs.
8. **Offline reasons for sheet actions are shown all the time,** not only on press, and pressing still announces them. Both reasons fit on one caption line.

## Known gaps
- **No failure simulation.** The writes never fail, so "Couldn't add this. Try again." and "Couldn't delete this. Try again." are wired but have no trigger.
- **Drafts of edit forms** survive a reload, but a draft for a record that was deleted in the meantime is dropped silently.
- **Item sheet moves:** after a group change, focus returns to the row in its new group. Its position isn't announced (the toast says "Changes saved").
- **Link coverage:** the seed has no `url` on the fixture items, so the link row was checked in code, not in a screenshot.
- **Length caps** are copy's [VERIFY] defaults: 80 for titles and areas, 120 for locations, 2,000 for links, 4,000 for notes, and 1,000,000 MAD for amounts.

## Requests for the shared layer
1. **`.btn-sec[aria-disabled]` is fine, but `.btn-danger[aria-disabled]`** inherits the sunken disabled look from `zamane.css`, which loses the danger cue for "Delete (offline)". That's acceptable; it's listed only in case the Director wants a danger-tinted disabled style.
2. **A shared `Z.latency` / `Z.failNext()`** (carried over from Goals' request) would let the dialogs show their failed states.
3. **Optional:** a `Z.pushSheet()` history helper, if the read sheets should close on Android Back (ia §6.5).

## For other roles
- **Detail:** dialogs.js uses `[data-act="entry|place|item"][data-id]`, `[data-act="inplan"][data-id]`, `[data-act="day-add"][data-id=<date>]`, `[data-act="new-entry"]`, `[data-act="new-place"]`, `[data-act="add-open"][data-id=<group>]`, `#primary`, `#td-gone` and `Z.detail.showEntry`. Please keep these stable.
- **Writer:** "Start time:" / "End time:" prefix the merge marks for those two fields (deviation 1).

## Tokens added (in `dialogs.css`, proposed for the system)
- **Widths:** `--dg-sheet-w: 28rem`, `--dg-form-w: 36rem`, `--dg-schedule-w: 32rem`, `--dg-form-max-h: 90dvh`.
- **Sizes:** `--dg-target: 44px`, `--dg-dt-w: 7.5rem`.
- **Icons and controls:** `--dg-chip-ic: 18px`, `--dg-ic-sm: 16px`, `--dg-check: 24px`.
