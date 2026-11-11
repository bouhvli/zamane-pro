# Build notes: create and edit goal (form view)

**Files:** `form.js` (replaces the stub, registers `Z.view('form', {mount, unmount})`) and `form.css`. No other file was edited.
**Direction:** B · Doorway. **Routes:** `#/goals/new` (create) and `#/goals/:id/edit` (edit), one view keyed on `route.mode`.

## What was built
- **Task page (D7).** Below 48 rem there's a sticky task header (✕ Cancel + h1 "New goal" / "Edit goal", Figtree 18/24) and no bottom nav. The shell's `data-chrome="task"` handles the nav. `scroll-padding-top` matches the header [WCAG 2.4.11]. From 48 rem the header shows only the h1 (title-lg) in a 36 rem centred column. The form then ends with the primary followed by Cancel.
- **Primary.** It has `id="primary"` and lives in a `.dock`. It floats bottom-end on phones and follows the on-screen keyboard: `visualViewport` sets `bottom`, the way Home's sheet does, because iOS ignores `interactive-widget`. It's `type=submit` and placed in the DOM after the last field. The pressed state shows before the work starts ("Creating…" / "Saving…", `aria-disabled`, ~450 ms simulated latency), and a second tap is ignored.
- **Create**, in order:
  1. Title, focused. Young Serif 28/34 inside the field.
  2. Type: a native radio group inside `fieldset`/`legend`, as two equal cells. The whole cell selects through a stretched label. Money is the default. Each radio is described by its own helper plus "You can't change this later."
  3. Target: money only, MAD suffix, `inputmode=decimal`. Switching to Percent hides it and keeps the value.
  4. "Optional details": a disclosure with `aria-expanded`, holding the target date (native `type=date`), the description (counter from 450 of 500) and the cover.
  5. "Create goal".
  - Enter in Title moves to Target when a money goal has no target yet; otherwise Enter submits.
  - On success, `Z.go('#/goals/'+id, {replace:true})` runs, then "Goal created." is announced.
- **Edit.**
  - Every field is unfolded, with no toggle. The type is read-only text ("Money goal. The type can't be changed.").
  - **Completion preview.** Changing the target shows "Wedding fund will be done: 14,250 MAD is already saved." or "New sofa will no longer be done." in a polite live region under Target. The preview doorway shows (or drops) the zellige surround the goal will have. A done goal's preview shows its surround.
  - **After saving**, `Z.flash` shows "Changes saved", "… is done." or "… is open again." Then the page pops back to the detail when that is the previous entry, and otherwise replaces with the detail.
  - **Delete goal** comes last, below a hairline. It calls `Z.confirm` with counts from `Z.entries` and `Z.notes`; photos include the cover. Then `Z.deleteGoal`, then `Z.flash({msg:'<title> deleted'})`. It goes back two entries when the stack is list → detail → edit, and otherwise replaces with `#/goals`. The shell focuses the list h1.
- **Validation** follows copy.md:
  - the error sits under the field with an icon, and the input gets `aria-invalid`;
  - `aria-describedby` lists only what is shown (error, helper, then preview, counter or merge mark);
  - fields validate on blur only after typing, and errors clear as soon as the value is valid;
  - submit validates everything and focuses the first error, opening the details first if the error is inside them;
  - nothing validates on the blur caused by pressing Cancel.
- **Cover.**
  - The control is a hidden `<input type=file accept="image/*">` triggered by a visible button. JPEG, PNG and WebP up to 10 MB are accepted; anything else shows the copy's error.
  - The preview is an object URL inside `Z.doorway(…,'form')`. The empty-title "·" is stripped, so the arch is empty until a letter is typed.
  - Upload progress is simulated on a solid `surface-raised` pill ("Uploading photo… 61%"); the percentage isn't announced.
  - **Waiting and failure.** If an upload is still running, Create waits ("Creating after the photo…"). A failed upload shows an alert with Try again and Remove, and blocks Create.
  - **Edit** offers Replace or Remove, which apply on Save, with the restore note.
  - **Uploads off:** the whole cover group is absent, and an existing cover is never overwritten.
- **Offline (D8).**
  - The form works and keeps its draft.
  - The primary is `aria-disabled`, described by the reason notice, and drawn on a solid muted surface (not 50% opacity, which let content show through the floating button).
  - Delete goal and Add/Replace are also `aria-disabled`, each with its reason under it. Remove still works.
  - Pressing a disabled primary announces the reason. On phones it also shows the reason as a toast beside the primary.
  - Reconnecting re-enables everything and announces "Back online. You can create the goal now." or "… save your changes now.". The announcement is deferred so it replaces the shell's plain "Back online.".
- **Drafts.**
  - Keys are `zamane.goals.draft.new` and `zamane.goals.draft.edit.<id>`, and every storage call is in try/catch.
  - Drafts are written on input (debounced) and on unmount. Restoring one shows "Draft restored." with Discard draft.
  - Drafts are cleared on create, save, delete, Discard and Cancel.
  - An edit draft stores its base row. If the goal changed since, the restore runs the merge.
  - An unsaved upload isn't restored, because its object URL is gone.
- **Three-way merge (§6.7).**
  - It runs per field (title, target, date, description, cover) using B, M and T.
  - When only they changed a field, their value is taken and marked "Changed by Youssef", with the avatar.
  - When both changed a field differently, mine is kept, with "Youssef changed this to "Our wedding"." and **Use theirs**.
  - The notice names the actor. On a live partner change, focus stays put and one polite announcement is made. On a 409, the actor is "another phone" (socket down) and focus moves to the notice.
  - A 409 where nothing editable differs retries once, silently.
  - A 404, or a live delete, replaces the form with "This goal was deleted. Your changes weren't saved." and **Back to Goals**. The nav comes back.
- **Not found** (a bad id): "This goal isn't here any more" / "It may have been deleted." / Back to Goals.
- **Example-data footnote** (`example.form`): shown on edit, and on create fixtures that prefill values. It isn't shown on an empty create form, which holds no example data.

## How to see each state
Base URL: `file:///C:/Users/HamzaBouhali/Documents/Zamane/.ux-forge/goals/goals.html`. Use one query param, and put the goal in the hash.

| State | URL suffix |
|---|---|
| create (idle) | `#/goals/new` |
| invalid | `?state=invalid#/goals/new` (Title empty, Target 0) or `#/goals/wedding/edit` (Title cleared) |
| percent | `?state=percent#/goals/new` |
| details | `?state=details#/goals/new` |
| cover-uploading / cover-failed | `?state=cover-uploading#/goals/new`, `?state=cover-failed#/goals/new` (also work on edit) |
| offline | `?state=offline#/goals/new`, `?state=offline#/goals/wedding/edit` |
| uploads-off | `?state=uploads-off#/goals/new` |
| edit / done goal | `#/goals/wedding/edit`, `#/goals/sofa/edit`, `#/goals/guest-room/edit` (percent) |
| completion-preview | `?state=completion-preview#/goals/wedding/edit` (will be done) or `#/goals/sofa/edit` (will no longer be done) |
| partner-changed | `?state=partner-changed#/goals/wedding/edit`: Sara's edits are prefilled, and Youssef saves at 0.3 s through `Z.partner.updateGoal` |
| conflict | `?state=conflict#/goals/wedding/edit`: Youssef's save is missed (socket down), then Save is sent with the stale `updatedAt` and gets a 409 |
| not-found | `?state=not-found#/goals/wedding/edit` (deleted, then Save gets a 404); or a bad id, `#/goals/nope/edit` |
| delete-confirm | `?state=delete-confirm#/goals/wedding/edit` |

To try a failed upload by hand, pick an image whose file name contains "fail".

Example values in the create fixtures: "Summer in Essaouira", 12 000 MAD, Sat 3 Jul 2027, "A week by the sea after the wedding."; and "Retile the kitchen" (percent). The edit fixtures use "Our wedding in Fes" / 22 000 (Sara) and "Our wedding" / Sat 19 Jun 2027 (Youssef). All of these are labelled by the footnote.

**Verified:**
- 55 scripted Playwright checks (Edge) pass with no console errors. They cover focus on arrival, blur validation, Enter-to-next, kind switching that keeps Target, create → replace → Back, save → pop, discard confirm with Esc returning focus, delete → list with focus on the h1, a draft across a reload, Use theirs, save after a 409, offline → online, uploads off, the upload fail/retry/wait path, and no horizontal scroll at 320.
- I looked at every screenshot below in light and dark.

## Deviations, and why
1. **Type helpers sit inside each cell** (direction B: "a radio, a label and a one-line helper"), not as one helper that "follows the choice" (copy.md / IA §4.5). Each radio is described by its own helper, which a screen reader hears while arrowing between them; a single changing helper wouldn't be re-read. The strings are verbatim.
2. **"Use theirs" keeps its visible text as the accessible name.** It's described by the conflict line and doesn't use `form.merge.useTheirs.label` ("Use their version of {field}"), which doesn't contain "Use theirs" and so would fail WCAG 2.5.3 (label in name). → Writer.
3. **No "‹ Goals" up-link on wide create** (the §5.5 desktop sketch). The top bar's Goals tab and the closing Cancel already cover leaving. A third exit would need its own discard guard.
4. **Edit has no "Optional details" toggle.** D7 says "all unfolded", and a toggle that only collapses adds nothing.
5. **Offline reason on phones** leads the form (CSS `order:-1`), because nothing can sit beside a floating button. A press on the disabled primary repeats the reason in a toast at the primary. From 48 rem the reason sits under the action row.
6. **A failed upload moves focus to Try again** only when focus is in the cover group, on the primary, or nowhere. Otherwise the alert is announced and the caret stays where the person is typing.
7. **Uploads cover has no Cancel in the pill.** copy.md has no cover-cancel string, so Remove cancels the upload.
8. **Edit waiting on a photo** shows "Saving…". copy.md has no "Saving after the photo…" for the form.
9. **Delete photo count** includes the cover (copy.md), so Wedding fund shows "2 photos", where IA F10's example says 1.
10. **Browser Back with input isn't guarded.** A hash router can't intercept it without the shell. The draft is kept and restored on return, so nothing is lost.
11. **No amount cap** is enforced: `form.error.target.tooLarge` is [VERIFY]. The title max is 80 and the description max is 500 (the decision.md prototype defaults).
12. **Title at 28 px** scrolls inside the input on a 320 px screen once it passes ~15 characters (normal single-line input behaviour; it stays 28 per direction B).

## Known gaps
- The save-failed and delete-failed alerts are wired up, but no fixture triggers them, because `Z.createGoal`, `Z.updateGoal` and `Z.deleteGoal` never throw.
- The "self" actor ("your other device") is implemented, but the prototype never emits it.
- The date input's display format follows the browser locale (e.g. `jj/mm/aaaa` on a French system).

## Tokens added (in `form.css :root`, proposed for the shared layer)
`--task-head-h:56px`, `--form-col:36rem`, `--field-col:20rem`, `--radio-size:20px`. No new colours. New pairs checked: `ink-muted` on `majorelle-soft` 5.16 / 6.33 (selected type cell); `majorelle` on `majorelle-soft` 6.79 / 6.70 (its border); `ink-muted` on `surface-sunken` 5.15 / 8.48 (offline primary).

## Shared-layer requests
1. **`Z.on('route')` / history.** `history.state.zIdx` comes from a counter that never decreases, so `zIdx - 1` isn't the previous entry after a Back. form.js keeps its own stack from `route` events to apply §2. Proposal: expose `Z.prevPath(n)` from shared.js (keep a stack in `handle()`), so the detail and composer can use the same rule.
2. **`Z.doorway` with an empty title** renders a 96 px "·". Proposal: in `Z.doorway`, use `|| ''` instead of `|| '·'` for the initial. form.js strips it locally.
3. **Focus on Edit after save or cancel (§6.3).** The detail should focus its Edit button when it is arrived at from `/goals/:id/edit`. Proposal: `Z.flash` could carry `{focus:'edit'}`, or the detail could check the previous path. → detail builder.
4. **Online and offline events.** Nothing calls `Z.setOffline` when the browser's `online`/`offline` events fire, so the offline fixture can only be left from the console (`Z.setOffline(false)`). Proposal: `addEventListener('online'|'offline', …)` in `Z.start`.
5. **Disabled button styles.** `.btn-danger` has no `[aria-disabled]` style in zamane.css (form.css adds one), and `.btn-primary[aria-disabled]` uses 50% opacity, which can't work for a floating button. Proposal: move form.css's solid-muted rule into the shared `.dock`.
6. **Tokens:** move the four layout tokens above into zamane.css's "Goals area additions".

## For other roles
- **Writer:** `form.merge.useTheirs.label` fails WCAG 2.5.3 (deviation 2). The cover upload needs a "Cancel" string if one is wanted. Edit needs a "Saving after the photo…" string.
- **Detail builder:** focus **Edit** on return from edit (6.3). The detail also has to render a cover `{url: blob:…}` created by the form.

## Screenshots
All are in `C:\Users\HamzaBouhali\Documents\Zamane\.ux-forge\goals\screenshots\`, at 320×568, 390×844 and 1440×900, light and dark:
`form-create`, `form-invalid`, `form-percent`, `form-details`, `form-offline`, `form-edit`, `form-edit-completion-preview`, `form-edit-partner-changed`, `form-edit-conflict`, `form-edit-delete-confirm`, `form-edit-offline`. Full-page shots at 390, light and dark: `form-edit-sofa` (done surround) and `form-edit-partner-changed-full`. Fixed elements in a full-page shot render at viewport position.

## Fix round 1
Source: `reviews/critique.md` (REVISE) and `reviews/accessibility.md` (FIX REQUIRED). Only `form.js` and `form.css` changed. The rows below replace deviations 5 (where the offline reason sits on phones) and 12 (Title clipping) and shared-layer requests 1, 4 and 5, which the Director has since met.

| Finding | Fix | Where | Verified |
|---|---|---|---|
| Critic F4 [Major]: at 320 the floating primary covers "Optional details" and the Target error | **Phones:** the primary now sits bottom-end in a solid footer bar, as in the composer (`surface`, hairline on top, safe-area padding, no shadow). The bar follows the keyboard: `placeDock` now sets `bottom` to the keyboard height. The body's task-chrome padding (fab-zone + safe area, 88 px) is taller than the 81 px bar. The toast is lifted above the bar. | `form.css` `#view .form-page .dock` (< 48 rem); `form.js` `placeDock` | Playwright: the bar is fixed, 0–320 wide, at the bottom; the Target error and the disclosure end above it once scrolled into view; the page end clears it. Screenshots: `form-create` and `form-invalid` at 320. |
| Critic F9: the Title field clips | Title is a one-row `<textarea>` with `field-sizing:content`, `overflow-wrap:anywhere` and `resize:none`, still in Young Serif 28/34. Where `field-sizing` isn't supported, a JS `scrollHeight` autosize takes over. Enter never adds a line: on create it moves to an empty Target, and otherwise it submits (`requestSubmit`). Pasted line breaks become spaces. There's no `maxlength`, so the copy's too-long error stays reachable. | `form.js` render, `fitTitle`, `onKey`, `onInput`; `form.css` `.field-title textarea` | Playwright: "Paint the guest room before Eid" wraps (field > 70 px, no overflow); Enter adds no line, moves to Target, then submits. Screenshot: `form-edit-partner-changed` at 320 ("Our wedding in / Fes"). |
| Critic F10: number format | The edit Target is prefilled with the display format ("20,000", "6,000"). The fixtures use "12,000" and "22,000". Both formats still parse. | `form.js` `inputAmount` | Playwright: edit shows `20,000`. |
| Critic F10: example label on a user's own goal | The edit footnote shows only for seeded example goals (`createdAt` before the prototype's today) or for a prefilled create fixture. An empty create form shows none. | `form.js` `isExample`, mount | Playwright: no footnote on an empty create form. |
| Critic F6: the done surround pokes into the gutter | A done preview door is inset by its 3 + 4 px surround (margin plus a reduced width), so the tiling frames the arch inside the column. My earlier stage margin is removed. | `form.css` `.cover-stage .door--form.is-done` | `form-edit-sofa`, `form-edit-completion-preview`. |
| Critic polish: footnote outside the 36 rem column on wide screens; type helpers widow | `#footnote` takes the form column on form routes. The type helpers get `text-wrap:pretty`. | `form.css` | `form-*/1440x900`, `768x1024`. |
| A11y Minor: several errors, only the first is spoken | When 2 or more fields are invalid, the permanent `role="alert"` `#form-alert` says "2 fields need your attention." Focus goes to the first invalid field. The count is removed (silently) as soon as one field is fixed, so it never goes stale. Copy has no string for this: **Writer**, please add `form.error.count` (ICU plural). | `form.js` `validateAll`, `setError` | Playwright: alert text, focus on Title, and it clears. Screenshot: `form-invalid`. |
| A11y Moderate: connection changes announced twice | `Z.offlineMessage` / `Z.onlineMessage` are set in mount to the form's own sentences (`form.create.submit.offline` / `form.create.online.announce`, and the edit versions). The 120 ms re-announcement is deleted, and both are cleared when the goal is gone. | `form.js` mount, `onConn`, `renderGone` | Playwright: exactly one announcement on reconnect, "Back online. You can save your changes now." |
| A11y Moderate: opacity-dimmed disabled controls | My local `is-offline` primary style and the `.btn-danger[aria-disabled]` opacity rule are removed. zamane.css's solid sunken disabled style now covers both, and matches what the form used. | `form.css`, `form.js` `renderActions` | `form-offline` (primary solid and readable). |
| A11y Minor / Critic F8: focus after Save or Cancel goes to the h1 | Before navigating back from Edit (Save, Cancel, or Discard), the form registers a one-shot `route` listener. It focuses `#gd-edit` once the detail has mounted, using `Z.focus`, which respects pointer versus keyboard. If detail.js also does this, the second call is harmless. | `form.js` `focusEditOnReturn`, `leave`, `commitEdit` | Playwright: `document.activeElement` is `gd-edit` after Cancel and after Save. |

**Not changed:**
- The date input still shows the browser locale's placeholder ("jj/mm/aaaa" on a French system). A native `type=date` can't be overridden; a custom picker would break the brief's "native date".
- The Target helper still reads "For example 20000 or 20 000" (copy). The prefill now shows "20,000", which the helper doesn't mention. **Writer:** consider "For example 20,000".
- I kept my own history stack for delete, because `Z.prevRoute` gives only one step and delete needs two.

**Re-verified:**
- **Playwright** (Edge): 68 checks, all passing, no console errors. These are the original 55 plus 13 for this round.
- **Screenshots**, re-shot at 320×568, 390×844, 768×1024 and 1440×900, light and dark: `form-create`, `form-invalid`, `form-details`, `form-offline`, `form-edit`, `form-edit-completion-preview`, `form-edit-partner-changed`. Plus `form-edit-sofa` (390, full page). All are in `C:\Users\HamzaBouhali\Documents\Zamane\.ux-forge\goals\screenshots\`.
