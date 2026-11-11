# Build notes: journal note composer (direction B · Doorway)

**Files:** `composer.js` (replaces the stub) and `composer.css`. Nothing else was edited.
**Run:** open `goals.html` from disk (file:// works). There's no build step and no new dependency.

## What was built
- **One `<dialog id="composer" class="sheet composer">`**, created once and appended to `body`.
  - **Below 48 rem** it's full screen, with its height set from `visualViewport`, so the tool bar and Save ride on the on-screen keyboard. iOS ignores `interactive-widget`, so the JS covers it.
  - **From 48 rem** it's centred, `min(40rem, 100% − 32px)` wide, at most 90 dvh tall. Only the body scrolls; the head and the footer stay put.
  - It has its own `.dlg-live` (polite) and `role="alert"` regions.
  - Its name is "New note: {goalTitle}" or "Edit note: {goalTitle}", and `document.title` follows `note.title.*`.
- **URL contract.** `Z.composer.sync(route)` opens the composer when `route.query.note` is set and closes it when it isn't. It's idempotent: the composer also listens to `'route'`, and it always reads `Z.route`, so a stale route object can't close it.
  - Every URL it writes keeps the detail's other hash params (`?view=journal&note=new`).
  - **Closing** (save, cancel, discard or delete) calls `Z.back()` when the `?note=` entry was pushed. Otherwise it calls `Z.go(…, {replace:true})`.
  - **Browser Back while dirty** pushes `?note=` again, then asks "Discard this note?". Back while clean simply closes.
  - **Esc** is caught on keydown, so Chrome's close watcher can't skip the guard. A forced close re-opens the dialog and runs the guard.
- **Focus** (ia.md §6.3):
  - **On open:** a new note focuses its first text block, with the caret at the end. An edit focuses the heading.
  - **After saving a new note:** the new note's heading (`#note-<id>-h`).
  - **After saving an edit:** its Edit button (`[data-act="edit-note"][data-id]`).
  - **After a delete:** the next note's heading, or else `[data-act="write"]`.
  - **Otherwise:** the opener, or the detail's h1. The opener is re-found by its hook, or by its text inside the same `data-key`, if the detail re-rendered it.
- **Writing.** Text blocks are borderless `<textarea>`s on the sheet ("text on the sand"). They grow with `field-sizing: content`, with a JS fallback. A lone block fills the screen.
  - The first block's label is "Note" (visually hidden). Later blocks are named "Note text, part n".
  - The counter shows from 9,000 of the 10,000 characters a block allows.
  - The note-level cap of 20,000 characters blocks Save, using `note.limit.total`.
- **Add photo.**
  - A real `<input type=file accept="image/*" multiple>`.
  - The photo is inserted at the last caret, which splits the text there, and a text block follows every photo.
  - The text after the photo takes focus (F5).
  - Files are checked for JPEG, PNG or WebP, 10 MB, and the 10-photo cap. Any message appears in the tool bar.
  - The picked file shows at once through an object URL.
  - The simulated upload runs about 2.5 s. Its progress shows on a solid `surface-raised` pill: "Uploading… 62%", Cancel, and a 4 px bar. The percentage isn't announced.
  - When the upload finishes, the photo is downscaled to 1600 px through a canvas, which also drops EXIF and GPS. That data URL is what's saved, and what a draft keeps.
  - **Failed:** "Didn't upload." with Try again on the pill. Save is blocked with "1 photo didn't upload". Focus moves to Try again, except while you're typing.
- **Photos** are 4:5 arches with their width capped at 28 rem, the same geometry as the detail's journal (`--gd-photo-*`), so the composer shows the note as it will look.
  - Remove (44 px, "Remove", named "Remove photo n") sits in the corner the arch leaves free, on its own surface.
  - "Add a description" (IA Q1) is a disclosure that opens an optional field of up to 250 characters.
- **Reorder** shows only with two or more non-empty blocks, at least one of them a photo. It's a mode switch that reads Done in Reorder mode, with no `aria-pressed` (fix round 1).
  - **Rows:** position, "Text: first words…" or a thumbnail with "Photo", then 44 px Move up, Move down and Remove, 8 px apart.
  - **The ends** are `aria-disabled`, and pressing them shows and announces "First in the note" or "Last in the note".
  - **After a move:** focus follows the moved row (the other move button at an end), and "Photo moved to 1 of 3." is announced.
  - **Motion:** a 160 ms slide, only with `prefers-reduced-motion: no-preference`.
  - **Done** returns focus to the moved block and restores a text block after every photo.
- **Remove in a draft:** a "Removed photo" or "Removed text" row with Undo takes the block's place, with no timer, until the note is saved. Cancelling an upload removes the photo and joins the split text back together. Backspace never touches a photo.
- **Save** (Ctrl/⌘ + Enter, `aria-keyshortcuts`):
  - it's `aria-disabled` with a reason: empty (shown on press), offline (always shown), photos that didn't upload, or the note being too long;
  - pressing it during an upload shows "Saving after photos (0 of 1)" and saves when the upload finishes;
  - a save shows "Saving…" for a simulated 350 ms, then calls `Z.saveNote(goalId, {id?, blocks, updatedAt}, {})`;
  - empty text blocks and removed blocks are dropped from what's saved;
  - Close still works while it waits.
- **Edit:** "Save changes", and **Delete note** at the end of the note in danger style.
  - It's confirmed with "Delete this note?", naming its photo count, with Keep note focused.
  - Then the composer closes and the toast "Note deleted" appears.
  - Offline, Delete note is `aria-disabled` with "Deleting needs a connection." shown.
  - Notes by someone else don't open: their `?note=` is replaced away (author only, D6).
- **409:** "This note changed on your other device." takes focus, with Keep mine (saves with the new `updatedAt`), Load the latest (confirmed first), and the "See the latest version" disclosure.
- **404, or the goal deleted while writing:** a banner with Copy text and Close. Save and the tools are hidden, and the alert is announced. Copy uses the Clipboard API, then `execCommand`, and confirms "Text copied" visibly and to screen readers.
- **Offline:**
  - you can still write;
  - Add photo and Save are `aria-disabled` with their reasons;
  - an upload in progress fails;
  - Back online re-enables Save. While the composer is open, `Z.setOffline` announces its own sentences once each ("Back online. You can save your note now."), from fix round 1.
- **Uploads disabled:** no Add photo and no Reorder; the composer is a single text block. Existing photos become 2:1 "Photo unavailable" placeholders that can be removed.
- **Drafts** are kept in localStorage (inside try/catch) under `zamane.goals.noteDraft:[state:]<goalId>:<note>`.
  - They're written 250 ms after a change, and on `pagehide` or when the page is hidden.
  - **What survives:** text, uploaded photos and descriptions. An upload still in progress is lost, as it would be in the app.
  - **If the quota fails,** the draft is kept without its photos.
  - **On open,** a stored draft that differs from the note shows "Draft restored." with Discard draft, which is confirmed.
  - **They're cleared** on save, discard, delete and Close. `Z.composer.clearDrafts()` clears them all, for logout.
  - **Fixtures** use their own namespace and start fresh on every load.

## How to see each state
`goals.html?state=<s>#/goals/wedding`. On the first detail route, the composer replaces the URL with `?note=new`, or with `?note=n2` for the edit states.

| `?state=` | Shows |
|---|---|
| `composer` | new note, one empty focused block, Save `aria-disabled` |
| `composer-photos` | text, an example photo, text (writing) |
| `composer-uploading` | the photo held at "Uploading… 62%" with Cancel for 4 s, then it finishes |
| `composer-failed` | "Didn't upload." with Try again focused; Save blocked with "1 photo didn't upload" |
| `composer-reorder` | Reorder mode, three rows, the toggle reading Done |
| `composer-offline` | text kept; Add photo and Save `aria-disabled`; the offline reason shown. Run `Z.setOffline(false)` to see Save come back. |
| `composer-conflict` | edit n2: Sara's other device saved first, then Save returns 409 |
| *extra* `composer-edit` | edit n2 as it is, with Delete note |
| *extra* `composer-restored` | "Draft restored." with Discard draft |
| *extra* `composer-missing` | edit n2, deleted on the other device: 404 banner |
| *extra* `composer-goal-deleted` | "Youssef deleted Wedding fund. This note can't be saved." |
| `uploads-off` + `#/goals/wedding?note=new` | text only |

**Screenshots** (320×568, 390×844 and 1440×900, light and dark): `screenshots/<state>/` for each state above, for example `screenshots/composer-reorder/390x844-dark.png`.

**Flow test (first build).** A Playwright script drove about 60 checks in Edge, and all of them passed. Its one "fail" was a wrong expectation in the script. It covered:
- opening, focus, the title, and the empty Save reason;
- inserting at the caret, the upload, saving after photos, and the Esc guard;
- the new note's heading taking focus, and "Note saved.";
- reorder moves and their focus, remove and Undo, and the description;
- Back while dirty re-pushing and asking, the reload restore, and discarding the draft;
- edit, save, delete with focus on the next note and the toast, and a partner's note being refused;
- offline and back online, the 409 with Keep mine, the 404, the goal being deleted, retry, and uploads off.

No console errors.

## Deviations from the spec, and why
1. **Try again** and **Discard draft** are named by their visible text. Copy's `note.photo.retry.label` ("Try uploading photo {n} again") and `note.draft.discard.label` ("Discard the restored draft") don't contain the visible label as a phrase, which fails WCAG 2.5.3. The context comes from the photo's group name ("Photo 1") and the status text instead (`aria-describedby`). *Writer:* make these labels start with the visible words, for example "Try again: photo {n}".
2. **The reorder buttons are icon-only at every width,** with the copy's labels ("Move photo 2 up"). The visible "Move up" on wide screens would fail 2.5.3 against those names. The help line under the heading explains the arrows.
3. **The 409 copy says "your other device",** not the partner (verbatim copy, and decision (c): only the author can edit a note). The fixture simulates it with `Z.partner.saveNote(…, {by:'a'})`.
4. **No backdrop dismissal.** IA §6.5 rules it out for the composer because of data loss, so `Z.backdropClose` isn't used. ✕, Esc and Back are all guarded.
5. **The photo cap is on width** (28 rem, 4:5 kept), matching the detail's journal, rather than a height cap that would distort the ratio on wide screens.
6. **Size check:** the prototype checks the picked file for 10 MB, where the app checks after downscaling. Uploads fail only when offline (and in the fixture), so the prototype stays predictable.
7. **A failed upload moves focus** to Try again only when you aren't typing in a field, so the keyboard never loses your sentence.
8. **Discard draft is confirmed** with the same discard dialog (ia.md 6.9: a dirty draft is confirmed before it's lost).
9. **The composer shows the "Note deleted" toast** after closing, once the route has settled, because the detail re-mount would otherwise hide it. The detail shouldn't show a second one.
10. **The example-data caption** (`example.detail`) appears at the end of the composer when it shows example content (fixtures and the seeded notes).

## Known gaps
- No 429 or `503 uploads_disabled` simulation. The strings are in `C` but nothing triggers them.
- A draft can't hold an upload that was still in progress at reload.
- A partner's edit to the note I'm editing shows only when I save (the 409), not live.
- Adjacent text blocks left after a photo is removed are saved as separate blocks, not merged.

## Tokens added (in `composer.css`, proposed for the system)
- `--composer-w: 40rem`
- `--photo-ratio: 4 / 5`, `--photo-max: 28rem`, `--photo-off-ratio: 2 / 1`. These duplicate the detail's `--gd-photo-*` and should become one shared token.
- `--target: 44px`
- `--thumb-w: 40px`, `--thumb-h: 50px`
- `--pill-bar: var(--space-1)`
- `--dur-move: 160ms`
- `--text-line: 1.5em`

## Shared-layer requests
1. **`Z.placeSheet` runs on every `dialog.sheet[open]`,** including the full-screen composer, and sets `bottom` and `maxHeight`. The composer overrides this in its own `visualViewport` handler, which runs after the shared one.
   - **Request:** skip dialogs that opt out, for example `document.querySelectorAll('dialog.sheet[open]:not([data-place="self"])')` in the shared `place`.
2. **`.sheet .field input` gives every input in any sheet** the 20 px, 600, tabular amount style. The composer resets it with `.composer .field input`.
   - **Request:** scope the rule to `#sheet .field input`.
3. **`.btn-danger` has no `aria-disabled` style.** The composer adds `opacity:.5; cursor:not-allowed` for its own Delete note.
   - **Request:** add `.btn-danger[aria-disabled="true"]` next to the primary and secondary rules in `zamane.css`.
4. **`Z.announce` uses the first `dialog[open]` in DOM order,** not the topmost one. Today that's harmless, because the shared `#confirm` comes before `#composer`. A dialog appended later and stacked on the composer would announce into the wrong region.
   - **Request:** pick the last open dialog.
5. **`handle()` closes every open dialog on a re-mount.** The composer re-opens itself when the URL still has `?note=`, and the detail's `update()` makes that path rare. No change is needed; this is recorded for whoever touches routing.
6. **There's no logout in the shell.** When there is one, it should call `Z.composer.clearDrafts()` (D8: drafts are cleared on logout).
7. **`Z.saveNote` and `Z.deleteNote` are synchronous and never fail.** The composer simulates 350 ms of latency, and a failure when offline mid-save.
   - **Optional:** a shared `Z.latency` / `Z.failNext()` would let every view show its saving and failed states the same way.

## For other roles
- **Writer:** the two `.label` strings in deviation 1.
- **Detail:**
  - on `note-updated` from source `partner` with `by: 'a'` (Sara's other device), the detail shouldn't announce it as Youssef's;
  - the detail shouldn't toast "Note deleted" for the user's own delete (the composer does).

## Fix round 1 (reviews/accessibility.md; reviews/critique.md has no composer finding)

| Finding | Fix | Where |
|---|---|---|
| **Moderate 1:** connection changes were announced twice, and the first sentence ("Adding to goals still works") was wrong while writing. | On open, the composer saves `Z.offlineMessage` and `Z.onlineMessage`, then sets them to copy's `note.save.offline` and `note.save.online.announce`. It restores them on close and on leaving the route. Its own delayed re-announcement is deleted. **Verified** with a MutationObserver: offline, online, offline gives exactly one sentence each, and closing hands the detail's sentence back. | `composer.js` `ownConnectionMessages` / `restoreConnectionMessages`, and the `'connection'` handler |
| **Moderate 2:** the offline "Add photo" and the empty "Save" pointed `aria-describedby` at an empty, hidden paragraph. | `aria-describedby` now points at visually hidden spans (`#cmp-add-desc`, `#cmp-save-desc`) that always hold the current reason. Offline and at 10 photos, the Add photo reason is also shown. The empty-note reason still shows visibly on press (IA 6.8), but it's described from the start. **Verified:** both descriptions have text before any press. | `composer.js` `paintBar`, `build` and `disabledPress` |
| **Moderate 3:** the Reorder toggle exposed `aria-pressed` and changed its name to "Done". | It's a mode switch now: "Reorder" / "Done", with no `aria-pressed`. The mode change is still announced ("Reorder mode. Use Move up and Move down." / "Back to writing."). The CSS keys off `.is-on`. | `composer.js` `paintBar` and the markup; `composer.css` `.cmp-ro.is-on` |
| **Moderate 4:** disabled buttons used 50% opacity. | The shared layer now styles them solid sunken, so the local `.composer .btn-danger[aria-disabled]` opacity rule is deleted. | `composer.css` |
| **Moderate 5:** at 320×256 (400% zoom) only 126 px was left for writing. | **Below 32rem of height** the dialog becomes a single scroller: the head and the reason lines scroll with the note, and only the tool row stays pinned at the bottom, compacted to 61 px. **Pinned on purpose:** a phone with the keyboard open also matches this height (with `interactive-widget=resizes-content`), and the brief requires Save above the keyboard. **Also fixed:** the dialog's visually hidden live-region `<p>`s had default 16 px margins that extended the scroll area; they're now zeroed. **Measured** at 320×256 in composer-photos, composer-conflict and composer-offline: the head scrolls away, which leaves 195 px for writing (was 126), with the tools at 256/256. An empty note fits without scrolling: 140 px, and the head scrolls away once the text grows. | `composer.css` `@media (max-height:32rem)` |
| **Minor (direction of user text):** | The goal-title subtitle has `dir="auto"`. The goal title inside the goal-deleted banner is wrapped in `<bdi>`. Text blocks, descriptions, reorder snippets and the latest version already had `dir="auto"`. | `composer.js` `build` and `bannerHTML` |
| **Shared change:** `Z.placeSheet` now skips `.composer`. | `place()` stays, because it's now the composer's only placement. Its comment is updated. | `composer.js` `place` |
| **Shared change:** `#sheet` now scopes the amount input. | The `.composer .field input` reset is kept; it's harmless and makes the composer independent of that rule. | `composer.css` |

**Checks after the fixes.**
- **Flow test:** 75 checks in Edge, all passed, with no console errors. It now also covers the one-sentence offline and online announcements, both persistent descriptions, the missing `aria-pressed`, the restored detail sentence, and the 320×256 geometry in four states.
- **Screenshots:** every composer state at 320×568, 390×844, 1440×900 and 320×256, light and dark, in `screenshots/<state>/` (for example `screenshots/composer-offline/320x256-light.png`).

**Shared-layer requests.** After round 1:
- **Done by the Director:** 1 (placeSheet opt-out), 2 (`#sheet` scope), 3 (disabled buttons, now a solid style) and 4 (topmost dialog).
- **Still open:** 6 (logout calls `Z.composer.clearDrafts()`) and 7 (shared latency and failure simulation).
