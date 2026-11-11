# Design critique: Zamane Goals (list, detail + composer, create/edit), direction B · Doorway     VERDICT: REVISE     CONFIDENCE: medium

**Evidence.** I re-shot the current build (shared layer 12:06 and 12:14) with the kit's `shoot.mjs` at 320×568, 390×844, 768×1024 and 1440×900, in light and dark. I also took full-page shots and the state screens. Everything is in `screenshots/critic/` (`list`, `list-uploadsoff`, `list-empty`, `list-alldone`, `detail-wedding|sofa|guest|honeymoon`, `detail-offline`, `detail-loading`, `completed`, `journal`, `composer`, `form-new`, `form-edit`, `form-invalid`, `form-partner` and `full-*`). I opened every PNG I cite.

I also drove the real `goals.html` in headless Edge (Playwright, touch contexts) and measured element boxes. That covered four flows:
- list → detail → ‹ Goals, and browser Back;
- detail → Edit → Cancel;
- create → Enter → target → Create → Back;
- the completion moment, with frames at 150, 350, 550, 750 and 1100 ms.

Those shots are in `screenshots/critic/flow/`. There were no console errors in any run.

**Not verified:**
- the real on-screen keyboard;
- safe areas;
- motion beyond stills;
- screen-reader output;
- the below-20rem one-up fallback. Setting the root font size doesn't trigger rem media queries, so that check needs browser zoom or the OS text size.

## B's risks (decision.md), checked

| Risk | Hold | Verdict | Evidence |
|---|---|---|---|
| 1 Covers rare, sameness | 2:1 bare on detail; confident initial; Wedding has the example cover | **Held on detail, not on the list** | Detail: bare 288×144 at 320 and 358×179 at 390, with the initial in majorelle-ink, never a ghost. But below 22.5 rem it is 72 px, not 96 (`zamane.css:259`), an undocumented deviation. List with uploads off: three identical majorelle-soft domes (W, P, H), each 126 px of a 296 px tile at 390. That is the Home sameness made bigger (F5). |
| 2 Number above the fold at 320×568 | 14,250 MAD at y ≈ 400 | **Held for the number, broken for its context** | `14,250 MAD` sits at 392–428. The "of 20,000 MAD · 5,750 MAD to go" line (428–450) and the bar with 71% (462–480) are under the floating primary (432–488). The same overlap happens at 360×640 and 375×667 (F1). Offline, the number goes below the fold (F7). |
| 3 Home continuity | Same content order, bar, attribution | **Held** | The tile reads title → figure → "of" → bar → avatar + "Sara added 500 · 2 days ago" → "by …". The first three tiles are Home's three. Two differences remain. The arch flips from Home's portrait 64×80 to a 5:4 landscape dome. The title drops from Home's 18/24 to 15/20. |
| 4 Narrow tiles at 320 | Subgrid; overflow-wrap; one-up below 20 rem | **Held** | Measured at 320: both tiles put the figure at y 293 and the bar at 341. Titles take 2 lines. The attribution takes 4 lines (64 px) on Paint ("Youssef / moved it to / 60% · / yesterday"). No horizontal scroll at 320 on any route. |
| 5 Image weight | aspect-ratio reserved | **Mostly held** | Every arch reserves its box. The one exception is the loading skeleton, which is always 2:1, so Wedding fund shifts 48 px when it loads (F10). |

## Scores

| # | Dimension | Score | One-line evidence |
|---|---|---|---|
| 1 | Brief fit | 4 | All three jobs work end to end. One glance and one tap opens the right goal. "Who put in what" is on the first screen at 390. Create needs a title, Enter, a target and Create, and lands on the new goal's detail. At 320–375 the floating primary covers the progress bar (F1). |
| 2 | Five-second clarity | 4 | Doorway → title → number → bar reads top-down on every goal, with one verb in the corner. On a done goal the primary correctly becomes "Write a note". |
| 3 | Hierarchy & layout | 3 | 1440 is excellent. From about 30 rem up to 64 rem the doorway becomes a flat lens (F3). The done surround crowds the h1 (F6). At 1440 the 4-up list leaves an empty quarter. |
| 4 | Usability | 3 | Conventions, feedback and Back all work, and focus returns to the opened tile. But on the 320 form the floating primary covers a field error and the disclosure (F4). The completion toast hides the Done text at 320 (F2). Focus after Edit → Cancel lands on the h1, not Edit (F8). |
| 5 | Craft | 3 | Collisions: the surround is 9 px from the h1, and the journal photo is 0–4 px above its next paragraph. The Title field clips at 28 px (F9). Number format is inconsistent: "20 000" in the form, "20,000" elsewhere. Type helpers end in widows. |
| 6 | Distinctiveness | 4 | The doorway, the zellige surround and the 4:5 journal arches are specific to this product and nothing else. It is weakened at tablet width (lens, F3) and on the bare list (F5). |
| 7 | Responsive & themes | 3 | Dark mode is clean everywhere, and the surround brightens correctly. 1440 holds. 768 squashes the signature shape. 320 has three overlay collisions (F1, F2, F4). |
| 8 | States & content | 4 | Every fixture renders, including 409, partner-changed, offline, all-done, empty and loading. Copy is specific. The example-data labels contradict the empty list and the just-created goal, and "No contributions yet" appears twice (F10). |

Average **3.5**. No dimension is below 3 and there is no blocker, so the verdict is **REVISE**. No finding touches the structure; the fixes are layout and CSS.

## Findings

### [Major] F1 · On 320–375 px phones the floating primary sits on the progress bar
Where: detail, money and percent goals, 320×568, 360×640 and 375×667, both themes. `detail.css` (`.gd-door .door--detail`) and `zamane.css:252–253`.
Saw (measured):
- **320×568:** `#primary` at 432–488 (x 139–304). It covers "of 20,000 MAD · 5,7…" (428–450) and the bar with "71%" (462–480). "14,250 MAD" is clear at 392–428 (`critic/detail-wedding/320x568-light.png`).
- **360×640:** "71%" at 515 against the primary at 504–560.
- **375×667:** "71%" at 525–543 against 531–587.
- **Result:** at rest, the first screen shows the number but hides how far there is to go.

Violates: B's hold 2 in spirit (the number above the fold, with its meaning). One focal block per view, and the primary must not occlude it [Refactoring UI]. Visibility of status [Nielsen #1].
Fix: on short phones, give photo doorways the bare ratio as well. Add to `detail.css`: `@media (max-width:47.9375rem) and (max-height:42rem){ .gd-door .door--detail.has-photo{aspect-ratio:var(--doorway-ratio-bare)} }`. The photo is `object-fit:cover`, so it crops and doesn't distort. Projected savings:
- 320×568: 48 px, which puts the bar and 71% at about 414–432, clear of the primary.
- 360×640: 55 px.
- 375×667: 57 px.

Re-measure at all three sizes. Taller phones (390×844 and up) keep 3:2.

### [Major] F2 · At 320 × 568 the "Goal reached." toast covers the Done badge and the "Reached" line
Where: `?state=toast-completed#/goals/wedding`, 320×568, both themes. `#toast` (shared), `.gd-titlerow .badge`, `.gd-reached`.
Saw (measured at 1.1 s): the toast is at 342–424. It covers the badge (332–352), "✓ Reached Mon 9 Nov · Sara" (356–378) and the top of "20,000 MAD" (`critic/flow/complete-320-1100.png`). The toast is 82 px tall because "Wedding fund: 20,000 MAD together." wraps. At 390 it covers only the share cells (636–700), which is fine (`critic/completed/390x844-light.png`). The sequence itself is right: fill → zellige → surround closing at 350 ms → saffron toast → focus on "Write a note".
Violates: B's surround is "never alone", because the badge and the "Reached" line carry the meaning [WCAG 1.4.1]. For the peak moment's 10 s, the text half of that is hidden on the smallest phone [Peak-End].
Fix:
1. F1's shorter doorway moves the badge to about 284–304 and the "Reached" line to about 308–330, above the toast.
2. On the goal's own detail, drop the goal name from the toast message: show "20,000 MAD together." (new key `toast.completed.here` for the Writer), because the h1 already names the goal. The toast then fits on one message line (about 64 px, top ≈ 360).
3. Re-shoot `toast-completed` at 320 and check that the bottom of `.gd-reached` is above the toast's top.

### [Major] F3 · From about 30 rem to 64 rem the doorway turns into a flat lens, and the form preview does at every width
Where:
- the detail at 768×1024: `critic/detail-wedding/768x1024-dark.png` (736×240, 3.07:1) and `critic/detail-sofa/768x1024-light.png` (with the surround);
- the form cover preview at 1440: `critic/full-form-edit/1440x900-light.png` (576×240).

The cause is `zamane.css:252–258` (`width:100%` plus `max-height:var(--doorway-max)`) with the arch radius `50% 50% … / 40% 40% …`. Once the height is capped, the radius flattens to the box.
Saw: a wide, low dome with almost straight sides. It is not a riad arch, and nothing like Home's 64×80 portrait arch or the detail's own 352×440 upright arch at 1440.
Violates: the direction's signature element ("the arch dominates the page"), and Home continuity (hold 3). The DS shape should keep its shape [anti-generic: signature element].
Fix:
- **Detail:** start the two-column masthead (upright doorway | facts) at **48 rem** instead of 64 rem. Move the `.gd-mast` grid and `.gd-door .door--detail{aspect-ratio:var(--gd-door-ratio-wide);max-height:none}` from the 64 rem block into a 48 rem block, with the door column at `minmax(0,15rem)`. Tabs and the stats fold stay as they are below 64 rem.
- **Form**, and as a fallback for the detail: cap the width, not the height. Use `.door--detail,.door--form{max-width:calc(var(--doorway-max) * 2)}` and `.door--detail.has-photo,.door--form.has-photo{max-width:calc(var(--doorway-max) * 3 / 2)}`, aligned to the start edge so the door sits flush with the h1 or the field column.
- Re-shoot 768 and 1024 for wedding and sofa, and the edit form at 1440.

### [Major] F4 · On the 320 form, the floating primary covers the disclosure and the Target error; the composer, the other task surface, uses a footer bar instead
Where: `#/goals/new` and `?state=invalid#/goals/new` at 320×568. `form.css` `.dock`, `zamane.css:312`.
Saw (measured):
- `#primary` at 164–304 × 496–552 sits over the "Optional details" button (16–304 × 490–538) and hides its chevron (`critic/form-new/320x568-light.png`).
- After submit, "Enter a target greater…" is cut off by the button (`critic/form-invalid/320x568-light.png`).
- The composer puts "Save note" in a footer bar with a hairline (`critic/composer/390x844-light.png`). So two task pages use two different primary patterns.

Violates: error messages must be visible next to the field [Postel; Nielsen #9]. Internal consistency [Jakob].
Fix: below 48 rem on the two form routes, keep the primary at bottom-right but give it a solid bar, matching the composer: `.form-page .dock{position:sticky;bottom:0;inset-inline:0;display:flex;justify-content:flex-end;padding:var(--space-3) var(--space-4) calc(var(--space-3) + env(safe-area-inset-bottom,0px));background:var(--surface);border-top:1px solid var(--line)}`, with the `.btn-primary` keeping its FAB size and no shadow. The existing `visualViewport` code still lifts the bar above the keyboard. The content then ends above the bar instead of under it. If the Director wants to keep the free-floating button, the minimum is `scroll-margin-bottom:calc(var(--fab-h) + 2 * var(--fab-gap))` on every field and error, plus a check that no error line ends inside the button's box after submit.

### [Minor] F5 · With covers off (the likely real case), the list is a grid of identical pale domes
Where: `?state=uploads-off#/goals` at 390 (`critic/list-uploadsoff/390x844-light.png`), and the populated list after creating a goal (`critic/flow/390-5-list-after-create.png`, C and H side by side). `zamane.css:254` `.door--tile`.
Saw: W, P and H in identical majorelle-soft 5:4 domes, each about 126 px of a 296 px tile. The Done section starts at y 737, under the primary, so on a 390 phone you never see the done goal without scrolling.
Violates: B's risk 1, which the decision held only on the detail (the 2:1 bare ratio). [anti-generic: identical cards]
Fix: apply the detail's own rule to the list. Use `.tiles:not(:has(.door.has-photo)) .door--tile{aspect-ratio:var(--doorway-ratio-bare)}`, so that when no open goal has a cover the domes are 2:1 (158×79 at 390), and raise `--arch-initial-tile` to 48px. Mixed rows keep 5:4, so subgrid alignment is unaffected. That saves about 47 px per tile row at 390 and brings "Done · 1" above the fold.

### [Minor] F6 · The done surround crowds the h1 and pokes into the page gutter
Where: detail, done goals, every phone width and 768 (`critic/detail-sofa/390x844-light.png`, `critic/detail-sofa/768x1024-light.png`). `detail.css:54` `.gd-door`.
Saw: the door ends at 255 and the 3 + 4 px surround reaches 262, while the h1 box starts at 271. That leaves 9 px against 16 px on open goals. The surround's outer edge also sits at x = 9, inside the 16 px gutter. List tiles already inset their done arch (`list.css` `.tile.is-done>.door{margin…}`); the detail doesn't.
Violates: consistent spacing on the scale [Refactoring UI]. The surround should frame the doorway, not touch the title.
Fix: `.gd-door .door.is-done{margin:calc(var(--surround-gap) + var(--surround));width:calc(100% - 2 * (var(--surround-gap) + var(--surround)))}`, and use the same rule on `.door--form.is-done` (`critic/full-form-sofa/390x844-light.png`). Check that the 12 px starting spread of `surround-in` isn't clipped by an ancestor's `overflow`.

### [Minor] F7 · Offline, the detail's number is pushed off the first screen at 320
Where: `?state=offline#/goals/wedding`, 320×568 (`critic/detail-offline/320x568-light.png`). `.gd-notice` (grid area `notice`, above the door).
Saw: the four-line notice (76–212) pushes the doorway to 220–412. The h1 is half under the primary at about 430, and the number is below the fold. Offline is a first-class case for this PWA, because adding works offline (ARCHITECTURE §9).
Violates: B's hold 2, offline. One emphasis per view: the notice becomes the hero.
Fix: below 48 rem, place `.gd-notice` after the progress block and before "Who put in what" (move it in the grid template, keeping the DOM order). Keep both sentences, which `decision.md` copy item 4 accepted. Every disabled control already states its own reason ("Deleting needs a connection."), so nothing is lost by the move.

### [Minor] F8 · After Edit → Cancel (or Save), focus lands on the h1, not on Edit
Where: `#/goals/wedding/edit` → ✕ Cancel, 390 and 320. `detail.js` mount focus.
Saw (measured): `document.activeElement` is `H1#gd-title` with the scroll at 0. IA §6.3 says to return to Edit. This was the form builder's request 3 and is still open.
Violates: focus order after closing a task [WCAG 2.4.3]. Keyboard and switch users have to Tab back from the top.
Fix: in the detail's mount, if the previous path matches `/goals/:id/edit` (form.js already keeps a route stack, or add `Z.prevPath()` to shared.js), focus the Edit button. Use `focusVisible:false` after a pointer Cancel, the same pointer-aware pattern Home's critic asked to protect.

### [Minor] F9 · The Title field clips the title it is meant to preview
Where: `#/goals/new` at 320, after typing "Car for the family" (`critic/flow/320-3-create-filled.png`). `form.js` `#f-title`, `form.css`.
Saw: "Car for the famil" is cut at the field's edge. On the detail, the same title wraps to two lines at 40 px (`critic/flow/320-4-created-detail.png`). The build notes record it (deviation 12), but at 28 px only about 15 characters fit, and most of the example titles are longer ("Paint the guest room").
Violates: direction B, "What you type is how the doorway will read." Recognition over recall: you can't check what you typed.
Fix: make the title a `<textarea id="f-title" rows="1" maxlength="80">` with `field-sizing:content` (with a JS autosize fallback), `overflow-wrap:anywhere` and `resize:none`, and keep the 28/34 Young Serif face. form.js already intercepts Enter, so it still moves to Target or submits.

### [Minor] F10 · Example-data labels and empty states contradict the screen
Where: several places.
- **Footnote on an empty list:** `critic/list-empty/390x844-light.png` says "Example data. The goals and amounts on this screen are made up." over no goals. This repeats Home's critic F10.
- **Footnote on a just-created goal:** the user's own new goal says "…contributions, notes, photos and stats on this screen are made up." (`critic/flow/390-4-created-detail.png`).
- **"No contributions yet" twice:** on Honeymoon and on any new goal it appears both under "Who put in what" and in the History panel, about 130 px apart (`critic/detail-honeymoon/390x844-light.png`).
- **Number format:** the edit form's Target shows "20 000" and "6 000", while every other screen says "20,000 MAD".
- **Skeleton shift:** the loading doorway is 2:1 for a photo goal (144 vs 192 at 320), a 48 px shift.

Violates: "Nothing invented is presented as real" (brief). Honest, specific copy. No layout shift (IA §3).
Fix:
- Show the footnote only when example rows are on screen: `Z.footnote('')` on `empty`, and on goals with no example entries or notes.
- With no entries, drop the whole "Who put in what" section and let the History empty state speak.
- Prefill Target with the display formatter (`Z.fmt(g.target)` → "20,000"); the parser already accepts both forms.
- Pick the skeleton door's ratio from the list cache's `cover`.

**Polish (one line):**
- Type-cell helpers widow ("money.", "100%." at 390). Add `text-wrap:pretty` to the helpers.
- The journal photo sits 0–4 px above the next text block; give it the `space-4` gap it has above.
- The tab diamond touches the nav diamond when the tab hairline scrolls to just above the nav (`critic/detail-sofa/390x844-light.png`).
- On the wide form, the footnote starts at x 196, outside the 36 rem column (x 432).
- In dark mode the example-photo placeholder reads as a black void; use `surface-raised` there.
- At 1440 the 4-up list with 3 open goals leaves an empty quarter. Cap the columns at the open count, up to 4.
- "History 0" and "Journal 0" badges add noise on empty goals.
- The date input shows "jj/mm/aaaa" in an English UI (browser locale).

## Protect

1. **The 1440 detail spread and the journal arches.** The upright 4:5 doorway beside the facts, with the initial standing at the threshold. History sits under the door and Journal beside it, and the journal's full-width 4:5 photo arches read like an album page (`critic/detail-sofa/1440x900-dark.png`, `critic/full-journal/390x844-light.png`). This is B at its best. F3 should spread it down to 48 rem, not dilute it.
2. **One done language across the three screens and Home:**
   - the zellige surround (2 + 2 px on the list, 3 + 4 px on the detail and the form preview);
   - the Done badge and "Reached {date} · {name}";
   - the zellige bar;
   - the completion sequence: fill → zellige → surround closes → saffron toast at the primary, with focus on "Write a note". It's right in both themes. Keep it while fixing F2 and F6.
3. **The flow plumbing.** These paths all work:
   - list → detail → Back restores the list's scroll (measured 227) and focuses the opened tile;
   - the up-link pushes, as the IA says;
   - create replaces `/goals/new`, so Back lands on the list;
   - Enter in Title jumps to Target;
   - on phones the form routes hide the bottom nav.

   Subgrid keeps money and percent figures on one baseline at 320.

## Tells count

- **Identical rounded cards with a soft shadow** (list tiles): present. It is justified with covers (they're the only raised cards, and imagery leads). With no covers it is the plain tell (F5).
- **Floating bottom CTA:** present and **justified** (the user's decision, Home's pattern, one verb per view). It is mis-executed where it covers content (F1, F4).
- **Middle-dot meta strings:** present. The summary line and done rows are compact metadata and justified. The five-clause stats line at 1440 is borderline: it's legible, but a label/value list would scan better.
- **Badges that encode nothing:** "0" count badges on empty feeds (polish).
- **Absent:**
  - gradients, glass and blobs;
  - side-tab accent borders;
  - emoji glyphs (the ✓ is a real icon);
  - all-caps eyebrows;
  - shimmer (skeletons are static);
  - illustrated empty states and confetti;
  - a template hero;
  - Inter-style brand type (Young Serif and Figtree come from the DS).

Cover the logo and this is still clearly Zamane: the arch and the zellige surround do it.
