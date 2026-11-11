# Accessibility review: Zamane Goals (goals.html: list, detail, entry sheet, photo viewer, composer, create/edit form)     VERDICT: FIX REQUIRED

## Summary
Blocker 1 | Serious 0 | Moderate 5 | Minor 11. EAA applies (consumer finance-adjacent service; WCAG 2.2 AA is the floor and satisfies EN 301 549 V3.2.1 and V4.1.1).

The build is strong. Every Home audit fix still holds here: focus restoration on re-render (`Z.keepFocus`), toast one Tab after the primary with "Undo is the next button", 10 s timer, Esc, pause on hover/focus, focus return after Undo, stepper announces its value, goal named in the amount step, backdrop press-and-release, forced-colours rules for track/fill/toast/sheet, `role="list"` on every `ul`. Focus on route change matches IA 6.3 in every row but one (see M5). No horizontal scroll at 320 px or at 400 % zoom (320x256) in any of 24 states. No target under 24 px. No contrast failure in either theme. Forced colours, reduced motion and text spacing behave.

The one blocker is the skip link: it breaks the hash router and replaces the screen with "Not in this prototype".

Method (all run, nothing assumed):
- Scripted Edge via Playwright against `file:///.../goals.html?state=<s>#/<route>`: keyboard flows, focus tracking, live-region mutation recording, ARIA snapshots, computed styles.
- axe-core 4.10.3 (wcag2a, 2aa, 21a, 21aa, 22aa, best-practice) on 58 state/route pairs at 390 px light and dark and 1280 px light, plus 52 more form/toast/failure states in both themes: **0 violations**. (axe logs file:// stylesheet CORS noise; its `color-contrast` rule still ran and passed.)
- Kit `contrast.mjs` on every token pair, both themes (table below).
- Target-size scan at 320, 390, 800, 1280 (hit-area measured with `elementFromPoint`, so `::before` extensions count).
- Reflow at 320x568, 320x256 (400 % of 1280x1024), 1280x1024: horizontal overflow, dialog scroll, and a Tab-through that tests whether each focused element is covered by the nav, dock, toast, sticky header or a dialog bar.
- Forced colours (`forcedColors: active`, dark and light) screenshots; reduced-motion computed transitions; 1.4.12 text-spacing override.
- Test scripts and screenshots are in the session scratchpad, not in the project. Not a substitute for a screen-reader pass.

## Findings

### [Blocker] The skip link wipes the screen: it routes to "Not in this prototype"     WCAG 2.2 2.4.1 Bypass Blocks, 2.4.3 Focus Order
Where: `goals.html` line 28 `<a class="skip" href="#main">`; `shared.js` `parse()` / `handle()` / `elsewhere()` (hashchange router).
Evidence: first Tab lands on "Skip to main content" (correct). Enter sets `location.hash = '#main'`, which `parse()` sends to the `elsewhere` view. Observed after Enter: hash `#main`, `#view` = "Not in this prototype / This prototype covers Goals only", focus on that h1, title "Not in this prototype – Zamane". The goal, list or form the user was on is unmounted (an open create/edit form and its typed values are lost). Every keyboard and screen-reader user hits this on the first Tab of every page. The workaround (Tab past it, Back) is not discoverable.
Fix: take the link out of the router. In `Z.start()` in `shared.js`, before `handle()`:
```js
document.querySelector('.skip').addEventListener('click', function (e) {
  e.preventDefault();
  var m = $('#main'); m.scrollIntoView(); m.focus({ preventScroll: true }); // main has tabindex="-1"
});
```
Also make the router ignore non-route fragments, so no future in-page anchor can do this. First line of `handle()`:
```js
if (location.hash && location.hash.charAt(1) !== '/') return;
```
Re-test: Tab, Enter on the skip link leaves the hash unchanged and `document.activeElement === main`.

### [Moderate] Connection changes are announced twice, and the first sentence is wrong for the screen     WCAG 2.2 4.1.3 Status Messages (best practice: no announcement spam)
Where: `shared.js` `Z.setOffline` (generic message), then `detail.js:644`, `form.js:726` and the composer's equivalent re-announce 120-220 ms later.
Evidence (MutationObserver on the live regions):
- Detail goes offline: "You're offline. Adding to goals still works." at 57 ms, then "You're offline. Adding to this goal still works." at 191 ms.
- Composer goes offline: the same two, into the composer's `.dlg-live`. "Adding to goals still works" is irrelevant while writing a note.
- Form back online: "Back online." then "Back online. You can create the goal now." Composer back online: the same pattern.
Polite regions queue or truncate these inconsistently across screen readers, so users hear a repeated or half sentence.
Fix: let the view supply the single sentence. In `shared.js`:
```js
Z.offlineMessage = null;                 // views set: function(off, syncedCount) -> string
// inside Z.setOffline, replacing the two Z.announce lines:
var m = o.message || (Z.offlineMessage && Z.offlineMessage(off, queued.length));
Z.announce(m || (off ? 'You\'re offline. Adding to goals still works.' : (queued.length ? 'Back online. Syncing your changes.' : 'Back online.')));
```
Each view sets `Z.offlineMessage` on mount and clears it on unmount; delete the `later(..., 120)` re-announcements in `detail.js:644`, `form.js:726` and the composer. The composer's offline sentence should be "You're offline. Your note stays here." (copy: `note.save.offline`).

### [Moderate] Composer "Add photo" (offline) and "Save" (empty) point `aria-describedby` at an empty paragraph     WCAG 2.2 3.3.2 Labels or Instructions, 4.1.2 Name, Role, Value
Where: `composer.js:343` (`line('cmp-add-why', addWhy && S.show.add ...)`), `composer.js:353-354` (`cmp-save-why`).
Evidence: `?state=composer-offline`: "Add photo" is `aria-disabled="true"`, `aria-describedby="cmp-add-why"`, and that element is empty and `hidden` until the button is pressed. Same for the empty-note Save (`?state=composer`). A screen-reader user who lands on either hears "Add photo, dimmed" with no reason. Pressing it does announce "Photos need a connection." (verified in `[role=alert]`), so the IA 6.8 press path works, but `copy.md` (`note.addPhoto.offline`, `note.addPhoto.max`) specifies these as the persistent `aria-disabled` reason, and Save offline already does it right (reason always shown, `desc` present).
Fix: show the reason whenever it is a standing condition, and only reference an element that has text.
```js
// composer.js:343
line('cmp-add-why', addWhy && (S.show.add || Z.offline || photos().length >= MAX_PHOTOS) && !add.hidden ? addWhy : '', Z.offline ? 'cloudOff' : null);
// composer.js:353 - reference the reason only while it is rendered
setOff(sv, busy || !!why, !busy && why && (why.persist || S.show.save) ? 'cmp-save-why' : null);
```
(`setOff(el, on, id)` already drops the attribute when `id` is null; check `setOff` does so for the add button too.)

### [Moderate] Reorder toggle changes its name AND exposes `aria-pressed`     WCAG 2.2 4.1.2 Name, Role, Value
Where: `composer.js:347-348`, markup at `composer.js:974` (`data-act="reorder" aria-pressed`; label "Reorder" becomes "Done").
Evidence: in reorder mode the accessibility tree reads `button "Done" pressed=true`. A toggle must keep a constant name (APG): "Done, toggle button, pressed" is contradictory (is Done on or off?). Voice users saying "click Reorder" fail once it is pressed.
Fix: it is a mode switch, so drop the pressed state and keep the label swap (the mode is also announced via `C.reorderOn`/`reorderOff`):
```js
// composer.js:347 - remove this line, and remove aria-pressed="false" from the markup at :974
ro.setAttribute('aria-pressed', String(reorder));
```
Alternative: keep `aria-pressed` and keep the label "Reorder" in both states, with `aria-keyshortcuts` unchanged.

### [Moderate] Disabled-looking controls drop to 2.5-3:1 text because of `opacity:.5`     WCAG 2.2 1.4.3 Contrast (inactive components are exempt by the letter; this is legibility of controls that carry a reason)
Where: `zamane.css:109` and `:319` (`.btn-primary/.btn-sec/.btn-danger[aria-disabled="true"]`), `detail.css:209`, `composer.css:138`, `form.css:110`. Applies to: composer Save (empty/offline/failed), Add photo (offline), Delete goal/Delete contribution/Delete note offline, Create/Save changes. (Form's offline primary already uses a solid style: `form.css:102`.)
Evidence (computed over the page surface): light primary text 2.56:1 (`#fffefc` on `#8ea3c0`), dark primary 3.07:1; danger outline at 50 % is about 2.5:1 on `surface-raised`. These controls are focusable, carry the reason, and are the only route to "why can't I save", so low-vision users meet the button first and cannot read it.
Fix: use the solid pattern form.css already proves (5.15:1 light / 8.48:1 dark), once, in `zamane.css`:
```css
.btn-primary[aria-disabled="true"],.btn-sec[aria-disabled="true"],.btn-danger[aria-disabled="true"]{
  opacity:1;background:var(--surface-sunken);border-color:var(--line-strong);color:var(--ink-muted);cursor:not-allowed}
```
and delete the per-view `opacity:.5` rules.

### [Moderate] At 400 % zoom the composer leaves 126 px for the writing area     WCAG 2.2 1.4.10 Reflow (passes; usability), 1.4.4
Where: `composer.css` (`.cmp-head` fixed 61 px + `.cmp-bar` fixed 69 px + `.cmp-body` scrolling).
Evidence: 320x256 viewport: head 61 + bar 69 = 130 of 256 px; `.cmp-body` client height 126 px (scroll height 680 with photos, 589 with the 409 banner). Nothing is lost and there is no horizontal scroll, but you see about four lines, and the 409 recovery buttons need scrolling inside a 126 px window.
Fix: below a short viewport let the bar scroll with the content.
```css
@media (max-height:32rem){ .composer .cmp-bar{position:static} .composer .cmp-body{overflow:visible} .composer{overflow-y:auto} }
```
(keep Save reachable: put it at the end of the flow, not hidden).

### [Minor] After saving or cancelling Edit, focus goes to the h1, not the Edit button (IA 6.3)
Where: `form.js` return path (`Z.go(...)` then the shell `Z.focusHeading()`), `shared.js handle()`.
Evidence: save: `#/goals/wedding`, focus `H1#gd-title`, "Changes saved" announced. Cancel: same. IA 6.3 says "the Edit button". Not a WCAG failure (the h1 is a valid, announced landing and the toast reads), but a keyboard user loses their place in the Edit/primary cluster.
Fix: form sets `Z.returnFocus = '#gd-edit'` before navigating; in `shared.js handle()`, after mount: `if (Z.returnFocus) { var r = $(Z.returnFocus); Z.returnFocus = null; if (r) { Z.focus(r); res = 'focus-handled'; } }`.

### [Minor] Edit button and toast Undo have a 41 px hit area; IA 6.2 says 44
Where: `.gd-edit` (`btn-sm`, 32 px + `::before inset:-6px 0`) measured 49x41; `.toast-undo` 58x41 at 390 and 800 px. Passes 2.5.8 (24 px). `.brand` logo link is 36 px high (shared nav, desktop).
Fix: `.toast-undo::before{inset:-6px 0}`; for `.gd-edit` check that `.gd-back` or the h1 row overlaps the extension, or raise `.btn-sm::before` to `inset:-7px 0`; `.brand{min-height:44px;display:flex;align-items:center}`.

### [Minor] Confirmation dialog closes on backdrop press; IA 6.4/6.5 says no backdrop dismissal
Where: `shared.js:665` `Z.backdropClose($('#confirm'), ... cancel.click())`.
Evidence: harmless (it means "Keep it", the safe outcome), but it contradicts the spec and an accidental outside tap discards the user's intent to confirm. Fix: delete that line.

### [Minor] Form submit with several errors focuses the first and says nothing about the rest
Where: `form.js` submit path; `#form-alert` (`role="alert"`, permanent, correct) stays empty.
Evidence: `?state=` empty create form, Enter twice: focus on Title with "Enter a title for the goal."; Target also has `aria-invalid` and its message, but the user is not told a second field needs fixing. 3.3.1 passes (each error is in text beside its field and in `aria-describedby`).
Fix: fill `#form-alert` with a count sentence on submit ("2 fields need your attention.", needs copy) and focus stays on the first field.

### [Minor] List goal headings read as whole sentences, and the figures are read three times
Where: `list.js` `tileHTML` (`<h3><a aria-label="Wedding fund: 14,250 MAD of 20,000 MAD, 71%">`), then the figure paragraphs, then the progressbar.
Evidence (ARIA snapshot): `heading "Wedding fund: 14,250 MAD of 20,000 MAD, 71%"`. Heading navigation becomes noisy. Matches `copy.md` (`goals.card.label.money`), so decide deliberately.
Fix (optional): drop `aria-label` from the link so the heading is just the title, and give the progressbar the figures (`aria-valuetext` already carries them); or keep the label and mark `.tile-fig`/`.tile-of` `aria-hidden="true"`.

### [Minor] Detail progressbar name repeats its value text
Where: `detail.js progressHTML` (`aria-label` "Wedding fund: 14,250 MAD of 20,000 MAD, 71%" plus `aria-valuetext` "14,250 MAD of 20,000 MAD"). Already flagged in build-notes. Fix: `label` = just the goal title (`Z.bar(g,{label:g.title})`).

### [Minor] Amounts and user text carry no direction or language hints
Where: IA 6.11 asks for `dir="ltr"` on amounts; no `dir="ltr"` exists in the code. `.gd-text`, `.gd-ent-note`, note headings and goal titles lack `dir="auto"` (the composer has it, so an Arabic note written there is displayed left-aligned in the Journal). No `lang` on French or Arabic user content (3.1.2, AA).
Fix: wrap amounts in `<bdi dir="ltr" class="num">`; add `dir="auto"` to `.gd-text`, `.gd-ent-note`, `.tile-title`, `.gd-title`. `lang` cannot be inferred; leave as a known gap.

### [Minor] Loading and error regions are inserted already populated
Where: `list.js` `bodyHTML` (`<p class="vh" role="status">Loading goals</p>` and the error `role="alert"` rendered together with their text), `detail.js renderLoading/renderError`.
Evidence: many screen readers ignore a live region that is created with content. Focus lands on the h1 after a route change, so the information is still reached. Same pattern Home flagged. Fix: render empty `role="status"` / `role="alert"` once in `goals.html` (or the view shell), then set `textContent` on the next frame.

### [Minor] The 10 s toast has no extend control and ignores window blur
Where: `shared.js` `TOAST_MS`, `toastPaused`.
Evidence: passes in practice: Undo is the next Tab stop, the timer pauses on hover and focus, Esc dismisses, the text is announced with "Undo is the next button". Only a user who opens a dialog or switches window during the 10 s loses the Undo. Deletes (no Undo, by IA) are unaffected. Fix: pause the timer on `blur` of the window and while any `dialog[open]` exists; resume on `focus`/close.

### [Minor] History row name reorders the visible pieces
Where: `detail.js rowHTML`. Visible: "Sara added 500 MAD", "Sat 7 Nov", "bonus month". Name: "Sara added 500 MAD, bonus month, Sat 7 Nov" (the IA/copy string). Each visible fragment is contained, so 2.5.3 passes; voice users reading the whole row in visual order would not match. Optional: reorder the name to "…, Sat 7 Nov, bonus month".

### [Minor] Small text and a carried-over nav item
`.caption`, `.help`, `.gd-count`, badges are 12 px (contrast passes). The bottom-nav label ellipsis with large text and the fixed 64 px bar from Home's audit is shared code and was not re-tested under OS font scaling (`.nav-label{text-overflow:ellipsis}`, `--nav-bar-h`); same fix as Home: `min-height` and wrapping below 22.5 rem.

## Checks that pass (the priorities you set)
| Area | Result | Evidence |
|---|---|---|
| Focus on route change | Pass (one Minor) | list h1 / card link on Back; detail h1; edit h1; new Title; after create h1 + "Goal created."; delete goal -> list h1 + "Paint the guest room deleted"; titles per route |
| Focus return from dialogs | Pass | entry sheet -> row; confirm Esc -> "Delete contribution"; composer clean Esc -> "Write a note" or Edit button; browser Back -> Edit button; composer save -> new note heading + "Note saved."; real delete -> next note heading; photo viewer -> "View photo"; quick-add Esc -> primary |
| Delete a contribution | Pass | focus to next row, toast without Undo, announced |
| Toast Undo reachable | Pass | DOM: `.dock` -> `#toast`; one Tab from the primary reaches "Undo: remove 250 MAD from Wedding fund"; after Undo focus on primary; 10 s; Esc hides; announced with "Undo is the next button" |
| Live announcements | Pass except M1 | partner add/remove/note/complete: one sentence each, into the open dialog when one is open; none on load or for my own acts; goal deleted under me moves focus to "Back to Goals" |
| aria-disabled reasons | Pass except M2 | Delete (entry, goal, note), Create/Save offline, Save in composer, reorder ends: reason in `aria-describedby` with visible text; presses announce once |
| Tabs (below 64 rem) | Pass | `tablist` named, tabs `aria-selected`/roving tabindex, ArrowRight/Left/Home/End select and focus, URL `?view=` replaced, panel `aria-labelledby`, Tab moves into panel, non-selected panel `display:none`; at 1280 px roles removed and both feeds visible |
| Reorder without drag | Pass | per-row Move up/down/Remove (44 px), ends `aria-disabled` with "First/Last in the note", focus follows the moved row, "Text moved to 2 of 3." announced; no drag anywhere |
| Form errors | Pass | `aria-invalid`, icon + text, `aria-describedby` lists only what is shown, first error focused, preserved input, 409 notice takes focus, "Use theirs" described by the field's message |
| Targets | Pass | all >= 24 px; all >= 44 px except Edit / Undo at 41 px (Minor) |
| Reflow 320 / 400 % | Pass | 0 px overflow in 24 states x 3 viewports; no focused element covered by nav/dock/toast/sticky header |
| Forced colours | Pass | track, fill, toast, sheets, arch outline, surround (3 px `CanvasText` outline), tab indicator (Highlight), focus rings, type-radio cells (`Highlight`) all visible |
| Reduced motion | Pass | fill, door, tab, buttons 0 s; toast and sheets opacity only; reorder slide skipped (`motionOK`); smooth scrolls guarded. The viewer's 0.24 s opacity fade is not guarded (opacity only) |
| Text spacing 1.4.12 | Pass | line-height 1.5, 0.12em, 0.16em: no clipped text on detail, composer, sheet, form, list |
| 2.5.3 Label in name | Pass | scanned every `aria-label` against visible text in 24 states; the four builder-flagged strings use the visible text as the name; row names are the IA string |
| Quick-add (Home carry-over) | Pass | goal in `aria-describedby`; stepper "-10 percentage points" with live "100%"; error also into `role="alert"` |
| Landmarks / headings / names | Pass | `lang="en"`, per-route titles, skip link present (broken: Blocker), one h1, h2 "Progress" visually hidden, h3 month groups and note headings, `article` named by its heading, dialogs named, alertdialog described |
| Authentication, redundant entry | N/A / Pass | no login; draft, form values and 409 merge preserve entry; `autocomplete="off"` is correct for these fields |

## Contrast table
Kit `contrast.mjs`; both themes; thresholds 4.5 text, 3 UI/large.

| Pair | Light | Dark | Result |
|---|---|---|---|
| ink on surface | 14.35 | 15.27 | pass |
| ink on surface-raised | 15.61 | 13.76 | pass |
| ink-muted on surface | 5.77 | 8.07 | pass |
| ink-muted on surface-raised | 6.27 | 7.27 | pass |
| ink-muted on surface-sunken (notices, placeholders, example photo) | 5.15 | 8.48 | pass |
| majorelle on surface (links, ghost, focus ring) | 7.59 | 8.53 | pass |
| majorelle on surface-raised | 8.25 | 7.69 | pass |
| on-majorelle on majorelle (primary) | 8.39 | 8.23 | pass |
| majorelle-ink on majorelle-soft (avatar, door) | 8.88 | 9.07 | pass |
| majorelle on majorelle-soft | 6.79 | 6.70 | pass |
| zellige-ink on zellige-soft (Done badge) | 6.76 | 8.62 | pass |
| zellige-ink on surface ("Reached" line) | 7.37 | 11.45 | pass |
| zellige on surface (surround, 3:1 UI) | 4.74 | 8.99 | pass |
| zellige on surface-raised (tile surround) | 5.16 | 8.10 | pass |
| on-saffron on saffron (toast "Goal reached.") | 7.71 | 9.40 | pass |
| surface on ink (toast) | 14.35 | 15.27 | pass |
| saffron toast edge on surface (non-text) | 1.93 | n/a | boundary only, text carries the message; fine |
| danger on surface (errors, danger text) | 5.95 | 7.92 | pass |
| danger on surface-raised | 6.47 | 7.13 | pass |
| danger-ink on danger-soft | 7.34 | 9.09 | pass |
| terracotta-ink on terracotta-soft (avatar b) | 6.12 | 8.16 | pass |
| saffron-ink on saffron-soft | 5.96 | 8.77 | pass |
| line-strong on surface (input and secondary-button borders, 3:1) | 3.28 | 3.90 | pass |
| line-strong on surface-raised | 3.57 | 3.51 | pass |
| focus ring (majorelle) on surface | 7.59 | 8.53 | pass (>= 3) |
| Disabled primary, aria-disabled at opacity .5 | 2.56 | 3.07 | below 4.5; exempt as inactive, see Moderate |
| Disabled danger outline/text at opacity .5 | about 2.5 | about 3.0 | same |
| Offline primary (form, solid sunken) | 5.15 | 8.48 | pass |

## Not testable here (needs a human)
- Screen-reader output in NVDA + Firefox/Chrome and VoiceOver + Safari/iOS: heading/tab/dialog reading, whether polite announcements are spoken or coalesced (M1), `aria-describedby` on `aria-disabled` buttons, the progressbar sentence, the `alertdialog`.
- iOS and Android virtual keyboards: `visualViewport` lift of the quick-add sheet, form primary and composer tool bar; Android Back with a sheet open.
- Real Windows High Contrast themes (only Chromium emulation here), OS font scaling at 200 % and nav-label truncation, Switch Control, Voice Control ("click Edit" with several Edit buttons).
- RTL (Arabic) rendering: no RTL state exists; direction is only reasoned from code (Minor above).
- Real photo upload, camera permissions, large-file behaviour; the simulated uploads were tested.
- Cognitive review with users (the 409 copy "your other device", offline wording).
