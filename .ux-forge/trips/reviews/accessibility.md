# Accessibility review: Zamane Trips prototype (trips.html + shared/list/detail/dialogs/form)     VERDICT: FIX REQUIRED (one major, six minor)

Tested in Edge (Chromium) with Playwright at 320, 390, 1100 and 1440 px, light and dark, over 32 fixture states (list, detail x tabs, offline, errors, sheets, forms, confirm, toast), plus scripted keyboard runs. Automated sweeps (names, label-in-name, 44 px targets, duplicate ids, reflow, text contrast against computed backgrounds) found nothing beyond the items below. Not a substitute for a screen-reader pass.

## Summary
- Blocker: 0
- Major: 1 (toast Undo cannot be reached by keyboard in time; the announcement is false)
- Minor: 6
- EAA / WCAG 2.2 AA: no Blocker. After the major fix the prototype meets AA for everything testable here.

## Findings (ranked)

### 1. [Major] Toast Undo is unreachable by keyboard before the 10 s timeout, and the announcement says it is "the next button"     WCAG 2.2.1 Timing Adjustable, 2.4.3 Focus Order
Where: shared.js `Z.toast` (announce string, about line 730), `schedule()` / `TOAST_MS = 10000`, `placeToast()`.
Evidence: `?state=toast-added#/trips/chefchaouen`. Focus lands on the re-added row. The toast sits after `#primary` at the end of the view, so Tab needs 20 presses to reach Undo (measured). The live region says "...Undo is the next button.", which is false. The timer pauses only once focus is already inside the toast.
Fix (shared.js):
1. In `Z.toast`, when `toastUndo` is set and the last input was the keyboard (`!lastPointer`), do not auto-hide: call `schedule()` only if `lastPointer || !toastUndo`. Keep the toast until Undo, Esc, the next toast, or a route change. Add `document.addEventListener('keydown', e => { if (e.key === 'Escape' && toastEl && !toastEl.hidden && !Z.topDialog()) Z.hideToast(); })`.
2. Make the announce suffix true: ' Undo is at the end of the page. Escape dismisses.' Update copy key `a11y.live.undoNext` to match.
(Alternative if a persistent toast is unwanted: 30 s when keyboard-driven, and say so in the announcement.)

### 2. [Minor] Edit link is 50x32 px, toast Undo is 58x36 px (below the 44 px house rule; both pass 2.5.8 AA at 24 px)     WCAG 2.5.8 (house rule 44 px)
Where: detail.css `.td-edit` (`btn-sec btn-sm`), zamane.css `.toast-undo`; optionally `.brand` (125x36, desktop).
Fix: `.td-edit,.toast-undo{min-height:44px;min-width:44px}` and `.brand{min-height:44px;display:inline-flex;align-items:center}`.

### 3. [Minor] Sheets do not push history, so Android/browser Back leaves the trip while a modal sheet is open     (not WCAG; ia 6.5, dialogs.md deviation 4)
Where: dialogs.js `openSheet` / `closeSheet`.
Fix: in `openSheet` call `history.pushState({zSheet:1}, '')` and close the sheet on `popstate`; in `closeSheet` call `history.back()` when the entry was pushed. URL-backed forms already behave correctly (verified below).

### 4. [Minor] A zero estimate reads "About 0 MAD" on Places cards (Ras El Maa viewpoint, Spanish Mosque)     clarity / cognitive
Where: detail.js `placeHTML`, the `p.estimate != null` branch (about line 351).
Fix: when `p.estimate === 0` show and say "Free" (visible and `vh` text), or hide the estimate.

### 5. [Minor] Resizing across 64 rem while a tab has focus drops focus to the body     WCAG 2.4.3 (edge case, not exercised by hand)
Where: detail.js `applyTabs`. The tablist becomes `display:none` at >= 64 rem.
Fix: in `applyTabs`, if the active element was a `[role=tab]` and the tablist is now hidden, `Z.focus(byId('td-h-' + current))`.

### 6. [Minor] Dead selector `.on-light .tick` (zamane.css about line 371)
No element has the `on-light` class. Ticks sit on the page surface (border 3.28:1 light, 3.90:1 dark, both pass). Remove the rule, or apply the class if ticks ever move onto the saffron-soft card (line-strong there is 3.13 light, 2.85 dark and would fail).

### 7. [Minor] Forced-colors budget bar: ink and pencil are both Highlight     WCAG 1.4.11 (visual only; valuetext carries the meaning)
Where: zamane.css about lines 344-347.
Fix: `.bbar-pencil{background:Canvas;border-color:Highlight}` and `.bbar-mark{forced-color-adjust:none;background:CanvasText}`. Check in a Windows contrast theme.

## Focus-area results (pass unless listed above)
- **Tick checkboxes:** `<button role=checkbox aria-checked>` named "{title} done" / "{title} packed", with `aria-describedby` for who did it. Space and Enter toggle. 24 px visual in a 48 px hit area (44 px layout box). Focus stays on the tick after the toggle and after the light-leaves re-render (`Z.keepFocus`). The tick and the row button are siblings, never nested.
- **Light leaves and reduced motion:** with `prefers-reduced-motion: reduce` there are 0 running animations and the row redraws at once. Time-driven changes are not announced, by design (copy a11y.status.noChange); the checkbox state is the feedback.
- **Now and Next:** "Now" and "Next" are text inside the row button name ("Now, 12:45 to 14:00, Food, Lunch...", "Next, 15:00 to 16:00..."). Saffron is never the only cue; the band says "Happening now". Dashed ideas: the card name ends "Idea", Must-do is a text badge, the breakdown says "Ideas not in the plan yet", and the bar's dashed part is covered by `aria-valuetext`.
- **Tabs:** roving tabindex, ArrowLeft/Right (RTL-aware), Home/End, `aria-controls`, panels `role=tabpanel` labelled by the tab. `?view=` uses replace (history length unchanged after three switches; Back leaves the trip). At >= 64 rem the tablist is `display:none` and panels lose their role (correct). Tab from a tab enters the panel.
- **Budget:** `role=progressbar` named "Budget" with full valuetext ("9,200 MAD planned, of which about 250 MAD are ideas, of 8,000 MAD, over by 1,200 MAD"). The disclosure is a button inside the h2 with `aria-expanded` and `aria-controls`; the figure is its visible name; Enter toggles and keeps focus. Over budget is said in words, not just colour.
- **Route and dialog focus:** list to detail lands on the h1 and updates the title; detail to list returns to the trip card; a sheet opens on its h2 (the dialog is named by it); Esc closes and returns to the row. The URL form opens on Title; Esc removes the query through history (length and hash correct) and returns to "Add to the plan". Confirm focuses the safe "Keep it"; Esc returns to the sheet. Modal dialogs contain Tab. The skip link works and is not obscured.
- **Forms:** every field labelled; `aria-invalid` plus `aria-describedby` (error first, then help); focus to the first invalid field; trip form has a count line ("3 fields need your attention."); entry form errors have the same wiring; `autocomplete="off"` is fine (no personal-data fields).
- **Label-in-name (2.5.3):** programmatic scan of every `aria-label` against visible text over all states: no mismatches.
- **Reflow:** no horizontal scroll at 320 px in any of the 32 states (400 % equivalent). A text-spacing override (line-height 1.5, letter-spacing .12em, word-spacing .16em) caused no overflow at 390. Tabs stay 44 px high at 320.
- **Targets:** every control >= 44 px except item 2.
- **Forced colors:** outlines survive, the Now card gets a 2 px CanvasText border, ticks and light band are handled (screenshot reviewed).
- **Document:** `lang="en"`, per-route titles, h1 then h2/h3 outline correct at 390 and 1440, one main, labelled nav, no duplicate ids, no positive tabindex, no images without alt.

## Contrast table (kit `contrast.mjs`, tokens from zamane.css)
| Pair | Light | Dark | Result |
|---|---|---|---|
| ink-muted on surface | 5.77 | 8.07 | pass |
| ink-muted on sunken | 5.15 | 8.48 | pass |
| ink-muted on saffron-soft | 5.49 | 5.89 | pass |
| on-saffron on saffron (light band) | 7.71 | 9.40 | pass |
| majorelle (tab text, focus ring) on surface | 7.59 | 8.53 | pass |
| on-zellige on zellige (check) | 5.24 | 8.12 | pass |
| line-strong on surface (tick border, dashed ideas; UI 3:1) | 3.28 | 3.90 | pass |
| line-strong on sunken | 2.93 | 4.10 | not used there |
| line-strong on saffron-soft | 3.13 | 2.85 | not used there (item 6) |
| terracotta bar fill on sunken track (UI 3:1) | 4.00 | 7.81 | pass |
| danger on surface / sunken | 5.95 / 5.31 | 8.32 (sunken) | pass |
| saffron-ink on saffron-soft | 5.96 | 8.77 | pass |

Computed-style sweep of all visible text in 32 states, both themes, at 390 and 1440: 0 failures (elements over gradients or images are excluded; covers carry no text).

## Not testable here
- Real screen-reader output (NVDA, VoiceOver, TalkBack): announcement order after a tick, a tab change and a toast.
- Windows High Contrast themes beyond Chromium emulation; the budget bar in particular (item 7).
- RTL (Arabic) layout and `dir="auto"` titles.
- Android Back (item 3), true 400 % browser zoom, touch spacing on a phone.
- Failure states ("Couldn't add this", "Couldn't delete this"): no fixture triggers them, so their announcement is unverified.
