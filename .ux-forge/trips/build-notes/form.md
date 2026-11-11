# Build notes: create and edit trip (form view)

**Files:** `form.js` (replaces the stub and registers `Z.view('form', {mount, unmount})`) and `form.css`. I edited no other file.
**Direction:** B · Saffron light. **Routes:** `#/trips/new` (create) and `#/trips/:id/edit[?focus=dates|budget]` (edit). One view handles both, keyed on `route.mode`.
**Port:** this is `.ux-forge/goals/form.js` and `form.css` with the same structure and behaviour (including the Goals fix round 1), with the fields swapped.

## What was built
- **Task page.**
  - Below 48 rem: a sticky task header (✕ Cancel and the h1 "New trip" / "Edit trip"), with no bottom nav. The shell sets `data-chrome="task"`.
  - From 48 rem: a 36 rem centred column. The form ends with the primary, then Cancel.
  - On phones the primary sits in a solid footer bar that rides the keyboard (`visualViewport`).
  - `scroll-padding-top` equals the sticky header [WCAG 2.4.11].
- **Create:**
  1. **Title** (focused, required). It's a growing one-row textarea in Young Serif 28/34. Enter submits (quick capture).
  2. **Optional details** (a disclosure with `aria-expanded`, closed). It holds Destination, then the **Dates** fieldset (legend "Dates"; "First day" and "Last day" as native `type=date` inputs, where Last day's `min` = First day), then Budget (MAD suffix, `inputmode=decimal`, accessible name "Budget in MAD"), then Notes, then the Cover.
  3. **Create trip.** `Z.createTrip`, which seeds the checklist. Then `Z.go('#/trips/:id', {replace:true})`, and "Trip created." is announced.
- **Light-band preview (create, direction B).** Once both dates make a valid pair, `Z.lightBand({title,start,end}, {lead:false, nights:true})` is drawn under the cover preview ("40 days to go · 7 nights"). There's no band without dates. With uploads off there's no cover preview, so the band ends the details instead.
- **Edit:**
  - Every field is unfolded (D12), with no toggle.
  - **Date-change preview** (`role="status"`, under Dates). It shows:
    - the number of plan items that *newly* fall outside (dated entries that were inside, or that belonged to an undated trip, and are outside the new range);
    - or the "cleared" line;
    - plus "will be happening now" / "will be in the past" when the status changes.
  - The preview is recomputed when a partner adds or moves plan items.
  - **Save changes:** `Z.updateTrip(id, f, {updatedAt})`. Then `Z.flash` "Changes saved", and it pops back to the detail (or replaces with it). Focus then goes to the detail's Edit (see the shared-layer requests).
  - **Delete trip** comes last, below a hairline. Its confirm uses the copy's counts (9 plan items, 4 places and 13 checklist items for Chefchaouen) plus "The cover photo is deleted too." when there is a cover. The danger button shows "Deleting…". Then `Z.flash({msg:'<trip> deleted'})`. It goes back two entries for list → detail → edit, and otherwise replaces with `#/trips`.
  - **`?focus=dates|budget`:** focuses First day or Budget, opens the details, and scrolls the field into view after the shell's `scrollTo(0,0)`.
- **Validation** (copy.md §7):
  - Each error sits under its field, with `aria-invalid`. `aria-describedby` lists only what is shown: error, helper, then preview or merge mark.
  - Fields validate on blur only after typing, and clear as soon as they're valid.
  - Submit validates everything and focuses the first error, opening the details if needed. With 2 or more errors, a `role=alert` count appears.
  - **Dates:**
    - One date only gives "Add the last day too…" / "Add the first day too…" on the empty one. This is checked on submit, so filling in the second day isn't nagged.
    - Last before first gives "Choose a last day on or after Wed 25 Nov." on Last day. This is checked on blur of either day, but not while moving between them.
  - **Helpers, not errors:** "These dates have passed." and "That's 63 days." (over 31 days).
  - **Budget:** `Z.parseMoney`. An unparseable value gives the copy's format error, and 0 gives the copy's zero error.
- **Cover** (Goals' simulation):
  - JPEG, PNG and WebP up to 10 MB. Progress shows on a solid pill in the arch.
  - Create waits for the upload ("Creating after the photo…"). A failed upload shows an alert with **Try again** (name "Try again: cover photo") and **Remove**, and blocks Create.
  - In edit, Replace and Remove apply on Save, with the restore note.
  - With uploads off, there's no cover group at all.
  - A file whose name contains "fail" fails at 35%.
- **Offline (D13):**
  - The form works and keeps its draft.
  - Create/Save, Delete and Add/Replace photo are `aria-disabled`, each with its reason beside it. A press announces the reason, or shows it as a toast on phones.
  - Reconnecting is announced once, in the form's own words.
- **Drafts:**
  - Keys are `zamane.trips.draft.new` and `zamane.trips.draft.edit.<id>`, and every storage call is in try/catch.
  - "Draft restored." comes with **Discard draft**. An edit draft merges against the row it was based on.
  - **Discard confirmation:** "Discard this trip?" / "Discard your changes?", with Keep editing focused.
- **Three-way merge** (Goals §6.7):
  - It runs over title, destination, **dates (one field)**, budget, notes and cover. "Changed by Youssef" marks the fields only they changed. Fields both of you changed get a conflict line with **Use theirs** (name "Use theirs: {field}", per copy.md).
  - Dates conflicts use `tripMerge.conflict.dates` with `Z.range`.
  - A live partner change gets one polite announcement. A 409 moves focus to the notice. A 409 with nothing editable different retries once, silently.
- **Gone:**
  - A 404 on save shows "This trip was deleted. Your changes weren't saved."
  - A live partner delete shows "Youssef deleted Chefchaouen." with the copy's body, and focus goes to Back to Trips.
  - A bad id shows "This trip isn't here any more". The nav comes back in all three.

## How to see each state
Base: `file:///C:/Users/HamzaBouhali/Documents/Zamane/.ux-forge/trips/trips.html`. Use one query parameter, with the route in the hash.

| State | URL suffix |
|---|---|
| create (idle) | `#/trips/new` |
| invalid | `?state=invalid#/trips/new` (no title, last before first, "8.000,5" budget: 3 errors) · `…#/trips/chefchaouen/edit` (title cleared) |
| one-date | `?state=one-date#/trips/new` · `…#/trips/chefchaouen/edit` (Last day cleared) |
| details (band preview) | `?state=details#/trips/new` |
| date-preview | `?state=date-preview#/trips/chefchaouen/edit` (22–26 Nov: 3 plan items) |
| cover-uploading / cover-failed | `?state=cover-uploading#/trips/new`, `?state=cover-failed#/trips/new` (both also work on edit) |
| offline | `?state=offline#/trips/new`, `?state=offline#/trips/chefchaouen/edit` |
| uploads-off | `?state=uploads-off#/trips/new` |
| partner-changed | `?state=partner-changed#/trips/chefchaouen/edit`. Sara's edits ("Chefchaouen and Akchour", 9,500) are prefilled. Youssef saves "Chefchaouen, Rif trip", 22–26 Nov at 0.3 s. |
| conflict | `?state=conflict#/trips/chefchaouen/edit`. The same edits, but the socket is down, so Save gets a 409. |
| not-found | `?state=not-found#/trips/chefchaouen/edit`, or a bad id: `#/trips/nope/edit` |
| delete-confirm | `?state=delete-confirm#/trips/chefchaouen/edit` |
| focus-budget / focus=dates | `?state=focus-budget#/trips/chefchaouen/edit` · `#/trips/fes/edit?focus=dates` |

The example values in fixtures are "Taghazout surf week", Atlantic coast, Sat 19 – Sat 26 Dec, 6,500 MAD, and "Book the surf lessons once the dates are fixed." The footnote labels them.

**Verified:**
- A scripted Playwright run (Chrome) passed 48 checks with no console errors. It covered:
  - focus on arrival and empty submit;
  - error text and describedby order, and errors clearing;
  - Enter-to-create → replace → Back to the list, with the seeded checklist (11);
  - one-date, before-first, the band, the long-trip helper and the zero budget;
  - discard confirm with Esc;
  - list → detail → edit → save, which pops back with the toast;
  - delete with the counts, back two entries, and the toast;
  - `?focus=dates` and focus-budget in view;
  - conflict → Use theirs → save;
  - partner-changed, not-found, a bad id, and a live delete;
  - offline → online, uploads off, draft restore and discard;
  - no horizontal scroll at 320 on four states.
- I looked at every screenshot below.

## Deviations, and why
1. **"Optional details", not "Add details"** (ia.md): copy.md's label decision wins.
2. **The footnote is shown only where example values are on screen:** the seeded trips in edit, and prefilled create fixtures. It isn't shown on an empty create form. This is Goals' critic F10 rule; the brief gives the text, not the rule.
3. **No "‹ Trips" up-link on wide create** (§5.7 desktop sketch), as in Goals deviation 3. The top bar's Trips tab and Cancel already cover leaving.
4. **Enter in Title submits**, in create too. Goals moved on to Target, but nothing else is required here.
5. **The light band is not `aria-hidden`.** It's the only place "40 days to go" is said, so a screen reader hears it once, in the cover group. It's static and not live.
6. **A budget of 0 is an error**, using copy's string `tripForm.error.budget.zero` [VERIFY]. No cap is enforced (`tooLarge` is [VERIFY]). Max lengths are title 80, destination 80 and notes 4,000.
7. **The error count line** ("3 fields need your attention.") is Goals' a11y-review wording, which isn't in copy.md → **Writer**.
8. **Live partner delete** uses `trip.deleted.*` (detail strings), not the F13 "banner with Copy text and Close". That banner has no copy for a task page, and the swap follows Goals' form.

## Known gaps
- **No fixture triggers the failure states.** The create-failed, save-failed and delete-failed alerts are wired, but `Z.createTrip`, `Z.updateTrip` and `Z.deleteTrip` never throw.
- **Native date inputs** follow the browser locale (the screenshots show dd/mm/yyyy).
- **The "self" actor** ("your other device") is implemented but never emitted.
- **Focus on Edit after save or cancel** looks for `#view a[href="#/trips/<id>/edit"]`, or failing that `#view [data-act="edit"]`. It couldn't be verified because detail.js was still a stub during this build.

## Requests for the shared layer
1. **Detail Edit control.** Please make the detail's Edit an `<a href="#/trips/:id/edit">` (or give it `data-act="edit"`), so the form's return focus (ia §6.3) finds it. → detail builder.
2. **History.** `Z.prevPath(n)` in shared.js would replace the form's own route stack, which it uses for "back two entries". This is the same request Goals made.
3. **Tokens.** Move `--task-head-h`, `--form-col` and `--field-col` (and the new `--date-col:11rem`) from `form.css :root` into zamane.css. No new colours.

## Screenshots
All are in `C:\Users\HamzaBouhali\Documents\Zamane\.ux-forge\trips\screenshots\`, in light and dark:

| Set | Viewports |
|---|---|
| `form-populated` (create, idle) | 320×568, 390×844, 1440×900 |
| `form-details` (full page) | 390, 1440 |
| `form-invalid` (full page) | 320, 390, 1440 |
| `form-one-date`, `form-offline`, `form-cover-failed`, `form-cover-uploading`, `form-uploads-off` (full page) | 390, 1440 |
| `form-edit` (full page) | 320, 390, 1440 |
| `form-edit-date-preview` | 320, 390, 1440 |
| `form-edit-conflict` (full page) | 320, 390, 1440 |
| `form-edit-delete-confirm` | 320, 390, 1440 |
| `form-edit-partner-changed`, `form-edit-offline`, `form-edit-focus-budget` | 390, 1440 |

In full-page shots, fixed elements (the phone footer bar) render at the viewport's position.
