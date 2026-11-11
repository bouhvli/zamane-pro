# Accessibility review: Zamane Home prototype (home.html, 9 states + quick-add sheet + toast)     VERDICT: FIX REQUIRED

## Summary
Blocker 0 | Serious 6 | Minor 9. EAA applies (EN 301 549 = WCAG 2.1 AA, and the 2.2 criteria are the stated floor here).
The foundations are strong: lang/title/skip link/landmarks, names and 2.5.3 label-in-name, tokens pass contrast in both themes, target sizes, focus ring colours, native `<dialog>` with a labelled title, aria-invalid + describedby, reduced motion. The failures cluster in (a) focus loss when `render()` rebuilds the DOM, (b) the 6 s Undo toast for keyboard/SR users, (c) forced-colors, (d) a few dialog details.
Method: static read of the code, kit `contrast.mjs`, screenshot review (`small/320x568`). No axe/Playwright suite exists in the project, so none was run. Not a substitute for a screen-reader pass.

## Findings

### [Serious] Undo toast: keyboard/SR users cannot reach Undo within 6 s, and focus is lost after Undo     WCAG 2.2 2.2.1 Timing Adjustable, 2.4.3 Focus Order
Where: `#toast` (DOM after `<main>`, line ~317), `schedule()` 6000 ms, `undo()` in `commit()`.
Evidence: after submit, focus goes to `#primary` (in `#masthead`). The toast comes after `#rooms` in DOM, so Tab must pass every card/link first. Pause-on-hover/focus only helps after focus is already inside. Nothing tells SR users Undo exists. Clicking Undo calls `render()` then `toast()` with no undo, so `u.hidden = true` hides the focused button and focus drops to `<body>`. A mistaken contribution has no other reversal on Home.
Fix:
1. Move `<div id="toast">` in the markup to directly after `#masthead` (before `#rooms`). It is `position:fixed`, so visuals do not change. One Tab from `#primary` then reaches Undo.
2. Raise auto-dismiss to at least 10 s and also pause the timer on `keydown` (Tab) anywhere and while the toast has focus. Keep the existing hover/focus pause.
3. Append to the announced string when `undo` exists: `+ ' Undo is the next button.'` (the visible text is unchanged).
4. In `undo()`, after `render()`, call `$('#primary').focus()`.
Also ensure the Goals screen offers a persistent way to edit or remove a contribution (2.2.1 mitigation).

### [Serious] `render()` rebuilds `#masthead` and `#rooms`, destroying keyboard focus     WCAG 2.2 2.4.3 Focus Order, 3.2.2 On Input (context)
Where: `partnerAdds()` (realtime), `undo()`, retry handler, any `render()`.
Evidence: `innerHTML` replacement removes the focused element. A partner update while the user is on `#primary`, a goal link or "See all" resets focus to `<body>` and the next Tab starts from the top. The retry flow sets `a.disabled = true` on the focused button (focus is dropped in most browsers), re-renders, announces "Home loaded." but focus is on nothing.
Fix: in `render()`, capture `var k = document.activeElement` before replacing, record a stable key (`id`, or `getAttribute('href')`, or `data-act`), and after replacing restore `.focus({preventScroll:true})` on the matching node. For retry: use `aria-disabled="true"` (not `disabled`) and after the re-render focus `$('#main h1')` (add `tabindex="-1"` to the h1) or `#primary`.

### [Serious] Amount step never says which goal you are adding to     WCAG 2.2 1.3.1 Info and Relationships, 3.3.2 Labels or Instructions
Where: `renderSheet('amount')`; `#sheet-sub` ("Adding to Wedding fund") is a bare `<p>`; label is "Amount in MAD".
Evidence: with exactly one open goal the pick step is skipped (`openSheet`), so a SR user hears "Add to a goal, dialog, Amount in MAD, edit" and never the goal name. The same happens after pick -> amount, where focus jumps to the input past the caption.
Fix: add `id="sheet-sub"` to the `aria-describedby` of `#amt`: `aria-describedby="sheet-sub amt-help amt-err"`. For percent, the same. (Alternatively `aria-label` the dialog "Add to Wedding fund" when set.)

### [Serious] Backdrop-dismiss handler also closes the sheet on padding clicks and on drag-out     WCAG 2.2 2.5.2 Pointer Cancellation (best-practice breach), 3.3.4 data loss
Where: `sheet.addEventListener('click', ... if (e.target === sheet) sheet.close())`.
Evidence: a `<dialog>` with padding makes the padding strip (16-24 px around all content) the click target `sheet`. Press-in-input, drag-select, release outside also yields `click` on the dialog. Both silently discard a typed amount.
Fix: compute bounds: `var r = sheet.getBoundingClientRect(); var inside = e.clientX>=r.left && e.clientX<=r.right && e.clientY>=r.top && e.clientY<=r.bottom; if (e.target === sheet && !inside) sheet.close();` and track `pointerdown` target so only a down+up both on the backdrop dismisses.

### [Serious] Percent stepper: value change is silent, and names "-10"/"+10" are weak     WCAG 2.2 4.1.3 Status Messages, 2.5.3 Label in Name
Where: `.stepper [data-step]` buttons, `#amt` (percent).
Evidence: pressing a step button changes the input value while focus stays on the button. Nothing is announced. The accessible name is the literal text "−10" (U+2212) which many SRs read as "dash 10" or nothing.
Fix: keep the visible text and add hidden text so the name still contains it: `<button ...>−10<span class="vh"> percentage points</span></button>`. After the change, `announce(i.value + '%')` (reuse `#live`, which sits outside the inert dialog: place a second `role="status"` inside the `<dialog>` and write to that instead). Optionally give the input `role="spinbutton"` semantics via `type="text" inputmode="numeric"` plus `aria-valuemin/max/now`.

### [Serious] Forced-colors: progress bars vanish; toast and sheet lose their edges     WCAG 2.2 1.4.11 Non-text Contrast, 1.4.1 Use of Color
Where: `.track`, `.fill`, `.toast`, `.sheet`, `.zm-av` (ring is a box-shadow).
Evidence: forced-colors overrides author backgrounds and strips box-shadow. `.track` and `.fill` both become Canvas, so the bar is invisible (the amount text still carries the value). `.toast` (bg + shadow only) and `.sheet` (`border:0`, shadow only) have no boundary against the page or backdrop.
Fix:
```css
@media (forced-colors:active){
  .track{border:1px solid CanvasText}
  .fill{forced-color-adjust:none;background:Highlight}
  .toast{border:1px solid CanvasText}
  .sheet{border:1px solid CanvasText}
  .toast-undo{border-color:ButtonText}
}
```
Focus outlines survive forced-colors (outline, not box-shadow): pass.

### [Minor] Error `role="alert"` is added at the same moment the text appears     WCAG 2.2 4.1.3
Where: `showError()`: `e.setAttribute('role','alert')` and `e.hidden=false` together.
Evidence: many SR/browser combinations ignore an alert that is created already populated. Mitigated because focus moves to the input, which reads `aria-describedby` (help + error). Fix: ship `<p class="err" id="amt-err" role="alert"></p>` permanently (empty, without `hidden`; use `:empty{display:none}`), then set `textContent`. Remove the setAttribute/removeAttribute of role.

### [Minor] Toast can cover the focused element     WCAG 2.2 2.4.11 Focus Not Obscured
Where: `.toast` fixed above `.dock`; `html{scroll-padding-bottom}` accounts for nav + dock only.
Evidence: while a toast shows (up to ~60-80 px, taller with 2 lines), content scrolled into the strip above the dock can be fully hidden. Short-lived and Esc-less. Fix: add `Escape` on the toast to hide it; and while the toast is visible set `html{scroll-padding-bottom: calc(... + 88px)}` via a class on `<html>`.

### [Minor] Bottom nav labels truncate with text scaling / text spacing     WCAG 2.2 1.4.4 Resize Text, 1.4.12 Text Spacing
Where: `.nav-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}`, `--nav-bar-h:64px` fixed.
Evidence: at 320 px (screenshot) labels fit at 12 px. With OS font scale >= 150% or the 1.4.12 spacing bookmarklet, "Shopping" gets "Sho..."; the 64 px bar does not grow. The icon plus accessible name remain. Fix: `min-height:var(--nav-bar-h)` instead of `height`, allow `white-space:normal; overflow-wrap:anywhere` on `.nav-label` below 22.5rem. This is a shared nav-bar spec item.

### [Minor] Mobile tab order: nav precedes `<main>`, toast follows it     WCAG 2.2 2.4.3 (acceptable), 1.3.2
Where: `<header>` holds the fixed bottom nav; skip link exists. The dock's primary button is early in DOM (good). Fix: none required; keep the skip link. Document it.

### [Minor] First-run invite row at 320 px     WCAG 2.2 1.4.10 Reflow
Where: `.code-row` (32 px code + Copy button, no wrap). Fix: `flex-wrap:wrap` on `.code-row`; verify with `?state=first-run` at `--sizes=320x640` (not screenshotted).

### [Minor] `list-style:none` lists lose list semantics in Safari/VoiceOver     WCAG 2.2 1.3.1
Where: `.goals`, `.pick-list`, `.nav-list`. Fix: `role="list"` on each `<ul>`.

### [Minor] Total link names its content, not its destination     WCAG 2.2 2.4.4 Link Purpose (in context)
Where: `a.total` name = "Saved together 20,250 MAD 3 goals open · 1 done". Passes 2.5.3 (name equals visible text) and 2.4.4 via context, since the chevron implies navigation. Optional: `<span class="vh"> View goals</span>` appended (still contains the visible label).

### [Minor] Modal sheet does not lock background scroll; live-region updates while it is open
Where: `#live` is outside `<dialog>`, which makes it inert when modal. Partner updates while the sheet is open may not be announced in some SRs. Fix: also mirror into a `role="status"` inside the dialog while `sheet.open`. Add `body:has(dialog[open]){overflow:hidden}`.

### [Minor] Text under 13 px and low-contrast card borders
`.caption`, `.goal-foot`, `.help` are 12 px (passes contrast, below comfortable size). `--line` borders (1.39:1) on cards, `.row-link`, `.prompt`, `.pick-row` are decorative/affordance only (text and chevron identify each); no 1.4.11 failure, but consider `--line-strong` on `.pick-row`.

## Criteria checklist (pass / fail)
| SC | Result | Note |
|---|---|---|
| 1.1.1 Non-text | Pass | icons aria-hidden; avatar pair has role=img + label; logo alt |
| 1.3.1 Info/Relationships | Fail | goal context in sheet (above); otherwise pass; list role Minor |
| 1.3.2 Meaningful sequence | Pass | |
| 1.3.5 Input purpose | Pass | amount/note are not personal-data fields; `autocomplete=off` ok |
| 1.4.1 Use of colour | Pass (Fail in forced-colors bars) | state always has text |
| 1.4.3 Contrast | Pass | table below |
| 1.4.4 Resize text | Pass with Minor | nav truncation |
| 1.4.10 Reflow | Pass | dock/toast become static or sit below the 30rem-height fallback; screenshot 320x568 clean; first-run unverified |
| 1.4.11 Non-text contrast | Fail (forced-colors only) | inputs 3.28+ light, 3.51+ dark; focus ring 7.6+ |
| 1.4.12 Text spacing | Pass with Minor | fixed 44 px button heights, nav ellipsis |
| 1.4.13 Hover/focus content | Pass | no hover-only content |
| 2.1.1 / 2.1.2 Keyboard / no trap | Pass | native dialog traps by design; Esc closes |
| 2.2.1 Timing | Fail | Undo toast |
| 2.2.2 Pause/stop/hide | Pass | no auto-moving content; skeletons static |
| 2.3.1 Flashes | Pass | |
| 2.4.1 Bypass | Pass | skip link |
| 2.4.2 Title | Pass | per-state titles |
| 2.4.3 Focus order | Fail | focus loss on re-render |
| 2.4.4 Link purpose | Pass | "See all goals", "Copy invite code" |
| 2.4.6 Headings/labels | Pass | h1 Home / Hi you two; h2 per room; h3 per goal; headings inside links are valid |
| 2.4.7 Focus visible | Pass | 2 px ring, stretched-link ring on `::after`, toast ring = currentColor (14.35:1 / 7.7:1) |
| 2.4.11 Focus not obscured | Pass (Minor: toast) | `scroll-padding-bottom` = nav + dock + 16; top-bar variant at >=48rem |
| 2.5.1 Gestures | Pass | |
| 2.5.2 Pointer cancellation | Fail | backdrop handler |
| 2.5.3 Label in name | Pass (stepper Minor/Serious) | "Copy"+hidden "invite code", "Undo: remove...", "See all"+" goals", total link |
| 2.5.7 Dragging | Pass | stepper, no slider |
| 2.5.8 Target size | Pass | `.btn-sm` 32 px + 6 px pseudo = 44 px; all other targets >= 44 px; Undo 36 + 4 |
| 3.2.1 / 3.2.2 | Pass | |
| 3.2.6 Consistent help | N/A | no help mechanism on Home |
| 3.3.1 Error identification | Pass | text + 2 px danger border |
| 3.3.2 Labels | Pass (goal context Serious) | |
| 3.3.3 Error suggestion | Pass | "Use numbers only, for example 500 or 500,50." |
| 3.3.7 Redundant entry | Pass | input preserved on error |
| 3.3.8 Accessible auth | N/A | no auth on Home |
| 4.1.2 Name/role/value | Pass | progressbar with valuetext, `aria-expanded` on note, dialog labelled |
| 4.1.3 Status messages | Fail | stepper silent; error alert timing Minor; toast/partner updates use `role=status` (pass) |
| Preferences: reduced motion | Pass | fill, toast, sheet, press-scale all gated; reduce path uses opacity only |
| Preferences: forced colours | Fail | see finding |

## Contrast table (kit `contrast.mjs`)
| Pair | Light | Dark | Result |
|---|---|---|---|
| ink on surface | 14.35 | 15.27 | pass |
| ink-muted on surface | 5.77 | 8.07 | pass |
| ink-muted on surface-raised | 6.27 | 7.27 | pass |
| ink-muted on surface-sunken | 5.15 | 8.48 | pass |
| majorelle link text on surface | 7.59 | 8.53 | pass |
| majorelle on surface-raised (focus ring) | 8.25 | 7.69 | pass (>=3) |
| on-majorelle on majorelle (primary btn, skip) | 8.39 | 8.23 | pass |
| on-saffron on saffron (trip count, done toast) | 7.71 | 9.40 | pass |
| saffron-ink on raised (kicker) | 6.81 | 10.82 | pass |
| danger on raised (error text) | 6.47 | 7.13 | pass |
| zellige-ink on zellige-soft (Done badge) | 6.76 | 8.62 | pass |
| majorelle-ink on majorelle-soft (cover/avatar) | 8.88 | 9.07 | pass |
| terracotta-ink on terracotta-soft (avatar) | 6.12 | 8.16 | pass |
| toast text (surface on ink) | 14.35 | 15.27 | pass |
| line-strong on surface (input / btn-sec border) | 3.28 | 3.90 | pass (UI >= 3) |
| line-strong on surface-raised | 3.57 | 3.51 | pass (UI >= 3) |
| line on surface-raised (card borders) | 1.39 | not run | decorative; see Minor |

## Not testable here (needs a human with a screen reader / device)
- NVDA/JAWS (Windows), VoiceOver (iOS/macOS), TalkBack: whether `role=status` announcements for toast and partner updates fire reliably, including while the modal sheet is open.
- Dialog focus return and virtual-keyboard behaviour with `inputmode="decimal"` on real iOS/Android (dvh and keyboard overlap with the bottom sheet).
- OS text-scaling at 200% (Dynamic Type / Android font scale) on the bottom nav and the dock.
- Voice Control / Dragon: "click Wedding fund", "click Copy invite code".
- Windows High Contrast themes beyond the CSS reasoning above.
- Arabic/French localisation (the `dir`, `lang` and truncation of longer labels).


## Round 2

Method: static read of current `home.html` (770 lines), screenshot check (`state-first-run/320x568-light.png`). No device or screen-reader run. No axe suite exists.

### Round 1 findings
| # | Finding | Result | Note |
|---|---|---|---|
| S1 | Undo toast reachability, timing, focus after Undo | PASS | Toast follows `#masthead` (one Tab from `#primary`), 10 s, paused on hover/focus, restarted on any keydown, Esc dismisses when focus is inside, "Undo is the next button." announced, `focusPrimary()` after Undo. |
| S2 | `render()` loses focus | FAIL (partial), see R2-1 | Works for ids, `data-act` and unique hrefs. Breaks for `#/goals` and `#/shopping`. Retry flow passes (`aria-disabled`, h1 focus). |
| S3 | Goal context in amount step | PASS | `aria-describedby="sheet-sub amt-help amt-err"` on both money and percent. |
| S4 | Backdrop dismissal | PASS | pointerdown and click both must be outside the rect. A drag from the input to the backdrop no longer closes. |
| S5 | Silent stepper | PASS | Name is "−10 percentage points" (visible text is a prefix). Value announced via `#sheet-live` inside the dialog. |
| S6 | Forced colours | PASS | `.track` border, `.fill` Highlight (also wins over `.is-done .fill` because `forced-color-adjust:none`), `.toast`/`.sheet` borders. |
| m1 | Error alert timing | PASS | permanent `#sheet-alert` (see R2-4 for a side effect) |
| m2 | Toast covers focus | PARTIAL (Minor) | Esc is only handled when focus is inside the toast, and `scroll-padding-bottom` is unchanged. See R2-3. |
| m3 | Nav label truncation | Unchanged | Known gap. Agree it is Minor. |
| m4 | Tab order note | PASS | n/a |
| m5 | First-run code row at 320 | PASS | `flex-wrap` plus 28 px code. The screenshot is clean. |
| m6 | `role="list"` | PASS | `.goals`, `.pick-list`, `.nav-list` |
| m7 | Total link name | Unchanged | Known gap, optional |
| m8 | Live region inside the modal, scroll lock | PASS | `#sheet-live` and `#sheet-alert` in the dialog; `html:has(.sheet[open]){overflow:hidden}`. Partner updates during an open sheet still go to inert `#live` (known gap, agree Minor). |
| m9 | 12 px text, line contrast | Unchanged | Minor |

### New findings (regressions)

#### [Serious] R2-1 Focus restoration jumps to the top nav for "See all", the total link and the Shopping row     WCAG 2.2 2.4.3 Focus Order
Where: `focusKey()` / `render()` (lines 398-417): `document.querySelector('a[href="#/goals"]')`.
Evidence: the key is searched across the whole document, and `<header>` precedes `<main>`. `a[href="#/goals"]` therefore matches the nav "Goals" tab, not "See all" or the total link. `a[href="#/shopping"]` matches the nav "Shopping" tab, not the Shopping row. After any re-render (partner update, `?live=1`) focus moves up into the nav. "See all" and the total share the same href, so the key is ambiguous even inside `<main>`.
Fix: scope the search and disambiguate by position. In `focusKey` return `{sel, i}` where `i` is the index of `el` in `$('#masthead, #rooms')`-scoped `querySelectorAll(sel)`. In `render()` use `var n = document.querySelectorAll('#masthead ' + sel + ', #rooms ' + sel)[i]`. If nothing matches, fall back to `focusPrimary()`; today focus drops to `<body>` when the focused goal leaves the "Closest to done" list.

#### [Minor] R2-2 Sheet lift misfires under pinch-zoom     WCAG 2.2 1.4.4 Resize Text (unverified, needs iOS)
Where: `placeSheet()` line 662.
Evidence: `innerHeight - visualViewport.height - offsetTop` is also positive when the user pinch-zooms (`scale > 1`), so the sheet is lifted although no keyboard is open. This could push it out of view for low-vision users.
Fix: `if (visualViewport.scale > 1.01) { sheet.style.bottom = ''; return; }`. Also cap `max-height` by `visualViewport.height` so the header and Close stay reachable above a keyboard on short phones.

#### [Minor] R2-3 Toast Esc and obscuring
Evidence: because every keydown restarts the 10 s timer, a keyboard user who keeps Tabbing keeps the toast on screen, and Esc only works once focus is inside it. Fix: handle Esc anywhere while the toast is visible, unless the dialog is open, and add about 80 px to `scroll-padding-bottom` while it is shown. The card title stays visible, so this is not a 2.4.11 failure.

#### [Minor] R2-4 Stale and duplicate announcements in the sheet
Evidence: `#sheet-alert` and `#sheet-live` keep their last text, so browse-mode readers may meet it as a stray paragraph, and an error is announced twice (the alert, then `aria-describedby` on the refocused input). Fix: empty both on `close` and on `clearError()`, and optionally drop `amt-err` from the alert path.

#### Checked, no issue
- DOM order trip, Shopping, goals: phones, 48-64 rem and the ≥64 rem grid all match the visual order. Heading outline h1, h2, h3 is intact. `.room-goals` spans rows 1-3 correctly.
- The toast inside `<main>` is `position:fixed` with no transformed ancestor, so visuals are unchanged. `hidden` removes it from the tab order.
- `commit()` and `undo()` call `focusPrimary()` after `render()`. The sheet `close` handler also does, and `#primary` is re-queried, so no stale node.
- `sheet.style.bottom` is reset on close and does not apply at ≥48rem. With `interactive-widget=resizes-content` (Android) `kb` is 0, so there is no double lift.

### Verdict: FIX REQUIRED
0 Blocker, 1 Serious (R2-1, a small scoped-selector fix), 3 Minor new. Five of the six round-1 Serious items pass. Once R2-1 is fixed this should be PASS with the Minors tracked. Still needs a human: iOS keyboard and pinch-zoom with the sheet, and screen-reader checks of the toast, `#sheet-live` and `#sheet-alert`.
