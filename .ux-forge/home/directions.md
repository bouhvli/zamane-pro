# Directions: Zamane Home (compositions)

**By:** Art Director · **For:** the Director (studio mode) · **Inputs:** `brief.md`, `ia.md`, `Zamane Design System.html`, `.ux-forge/nav-bar/build-notes.md` and its Home screenshots, `assets/zamane-logo-sheet.png`. There is no `research.md` in this workspace, so the reasons below cite the brief and the IA.

**Scope.** These are three compositions, not three looks. The design system is binding: palette, Young Serif and Figtree, the type scale, radii, shadows, components, the voice and Lucide 1.75. The directions differ in hierarchy, layout, where the primary lives, how the total leads, how the first-run and empty states are built, and in one signature moment each. Copy in brackets, such as `[They type it in to join]`, is a layout placeholder for the Writer.

**Kit access.** `ux-forge/skills/design` is outside this session's readable folders, so I could not read `protocol.md`, `anti-generic.md`, `styles.md`, `fonts.md` or `tokens.md`, or run the kit's `contrast.mjs`. Contrast was checked with my own WCAG 2.x script, which matches the system's documented ratios exactly (14.4/15.3, 8.4/8.2, 5.8/8.1). The tells audit uses my own list of generic tells; the Critic should re-run the kit's list.

---

## Shared ground (true for all three)

### The subject's world (what the compositions borrow from)
1. **The riad entrance (*sqifa*).** A short bent passage, then the courtyard opens. You get one thing at the door and the rest further in. (A)
2. **The household *karni*, the ruled carnet.** Kept in a kitchen drawer or at the corner *hanout*: one line per thing, a name on the left, a figure on the right, the sum where you see it first. (C)
3. **Payday, one-handed.** "I just got paid, put 500 in the wedding fund", typed with a thumb on a tram or in a queue. (B)
4. **The departures board.** A time cell next to a destination: "12 days · Chefchaouen". That's already the TripCountdown, which every direction keeps.

### Fixed in every direction
- **Greeting:** `title-lg` 28/34 Young Serif, as in the system's Home mock. The type table assigns `display` 40/44 to "the screen title on Home", but a 40 px serif greeting would outweigh the 32 px `numeral` total, and the total must lead. *The Design Systems role needs to settle this conflict.*
- **Total:** `numeral` 32/36 · 600, tabular. It can't get bigger, so each direction makes it lead by a different means. This matters because the **countdown is the loudest thing on Home**: a saffron fill with a 32 px number.
- **Components** are used as documented: Button, PartnerAvatar and AvatarPair, Progress, GoalCard, TripCountdown. Only C proposes variants, and they are flagged.
- **Saffron:** the countdown block is the only saffron block, and the transient "Goal reached" toast follows the IA rule of one saffron moment at a time. The saffron swatch also lists a "nearest-to-done highlight on Home", which contradicts the one-block rule. **No direction uses it.**
- **Dashed outlines appear nowhere.** Dashed means "idea", so empty and first-run slots use solid hairlines or plain text, never dashed placeholders.
- **The arch** appears on goal covers only, never on the invite, empty states, buttons or cards.
- **Labels and icons:** section labels use `label` 13/18 · 600 on `surface`. "See all" is a `majorelle` link with a 44 px target. Icons are Lucide 1.75: `goal`, `map`, `shopping-basket`, `share`, `copy`, `cloud-off`, `chevron-right`. "Add to a goal" is label-only: no `plus`, no icon.
- **Skeletons** are static `surface-sunken` blocks in every direction, with no shimmer. The IA bans shimmer only under reduced motion; I drop it everywhere because most loads come from the persisted cache and a moving gradient is noise.

### Data, and the arithmetic behind the placeholders
- Example data from the system: Sara (partner a, majorelle) and Youssef (partner b, terracotta), MAD, Monday 9 Nov. Wedding fund 14,250 of 20,000, "Sara added 500 · 2 days ago". Chefchaouen, Rif mountains, Sat 21 – Wed 25 Nov, 12 days to go. 20,250 MAD saved, 3 open, 1 done, 7 left to buy. Invite code `K7QM-4XPA` (from `ia.md`).
- **14,250 + 6,000 = 20,250.** The "1 done" goal is almost certainly the system's **New sofa** (6,000 of 6,000, done, Youssef). The other two open goals therefore add 0 MAD to the total: **they must be general (percent) goals, or money goals with no entries.** Wherever a second or third card appears it is marked `*`: **Goal 2\*** is a general goal at 60% (the seed has one at 60%, per ARCHITECTURE.md §4.4), and **Goal 3\*** is a general goal with a lower percent the Director picks. Both get placeholder attribution.

### Fold budget method (the hard rule)
"Add to a goal" must be visible without scrolling at 375 × 667. I check three readings of that viewport, measured from below the status bar, with the 64 px nav at the bottom:

| Case | How the viewport is reached | Visible above the nav |
|---|---|---|
| (i) | 375 × 667 emulated, as the prototype is screenshotted | **603 px** |
| (ii) | installed PWA on an iPhone SE (20 px status bar) | **583 px** |
| (iii) | Safari tab with toolbars shown (innerHeight ≈ 553) | **489 px** |

Metrics come from the system and the nav prototype: `main` top padding 24, header 50 (16 caption + 34 greeting), block gap 16, total card ≈ 84, TripCountdown ≈ 128 (its meta wraps at 375–390), GoalCard ≈ 134, section label row 44 (raised from the mock's 18 px so "See all" meets the IA's 44 px target).

### Shared fixes (needed whichever direction wins)
1. **Toast focus ring.** The system's `majorelle` focus ring is **1.89:1 / 1.79:1** on the `ink` toast ground and **3.93:1 / 1.21:1** on the saffron "Goal reached" toast. Undo would show a near-invisible focus ring: in both themes on the ink toast, and in dark mode on the saffron toast. Inside toasts, use `outline-color: currentColor` instead: 14.35:1 / 15.27:1 on ink, and 7.71:1 / 9.40:1 on saffron.
2. **Toast position.** The system's toast sits 24 px above the bottom edge, which is on top of the bottom nav. On phones it must clear the nav: `nav + 12px` in A and C, and anchored to the dock in B.
3. **TripCountdown at 320 px** (flagged in the nav notes). "Chefchaouen" at 28 px Young Serif is ≈ 181 px wide (measured off the nav screenshots), and only ≈ 158 px is available. One proposal: below 22.5 rem, narrow the count cell from 96 to 80 px and the body padding from 16 to 12 px, which gives ≈ 182 px. That's too tight to trust, so verify it in the build and keep `hyphens: auto` as the fallback. This is a component fix for Design Systems.
4. **Sheet backdrop.** The quick-add `<dialog>::backdrop` needs a colour the system doesn't define (suggested: `ink` at 40%). It isn't a direction choice, but the prototype needs it.

### IA questions for the Director (they affect every direction)
- **`joined-empty`:** the empty versions of block 1 (total) and block 4 (goals) would both offer "Create a goal", which is already the primary, so the same action appears up to three times. **Proposal:** block 1 shows `0 MAD` with no button of its own, block 4 is omitted until a goal exists, and blocks 3 and 5 keep one secondary each.
- **`all-done`:** the primary becomes **New goal**, and the IA also gives block 4 a secondary **New goal**. **Proposal:** drop block 4's button and keep its text plus "See all".
- **Share code without Web Share** (for example Firefox on desktop) falls back to copying, which duplicates **Copy**. **Proposal:** when `navigator.share` is missing, hide Copy and label the primary "Copy code" (wording to the Writer).

### Contrast: pairings beyond the documented ones (my WCAG script, both themes)

| Pair | Light | Dark | Need | Used for |
|---|---|---|---|---|
| `ink` on `surface-raised` | 15.61 | 13.76 | 4.5 | card text, invite code (A, C) |
| `ink-muted` on `surface-raised` | 6.27 | 7.27 | 4.5 | captions, counts, attribution in cards |
| `ink` on `surface-sunken` | 12.81 | 16.05 | 4.5 | offline notice |
| `ink-muted` on `surface-sunken` | 5.15 | 8.48 | 4.5 | offline notice detail |
| `majorelle` on `surface` | 7.59 | 8.53 | 4.5 | "See all" link (A, B); primary edge on the page and in B's dock |
| `majorelle` on `surface-raised` | 8.25 | 7.69 | 4.5 | "See all" in C's sheet; primary edge inside a card (C); Sara's ink mark (C) |
| `saffron-ink` on `surface-raised` | 6.81 | 10.82 | 4.5 | "Next trip" / "Happening now" kicker |
| `majorelle` on `majorelle-soft` | 6.79 | 6.70 | 3 | progress fill against its track |
| `line-strong` on `surface-raised` | 3.57 | 3.51 | 3 | secondary button borders inside cards |
| `zellige-ink` on `zellige-soft` | 6.76 | 8.62 | 4.5 | Done badge (`all-done`) |
| `zellige` on `zellige-soft` | 4.36 | 6.77 | 3 | done progress fill |
| `terracotta-ink` on `terracotta-soft` | 6.12 | 8.16 | 4.5 | Youssef's avatar initial |
| `terracotta` on `surface-raised` | 4.87 | 6.70 | 3 | Youssef's ink mark (C, decorative) |
| `ink` on `majorelle-soft` | 12.84 | 11.99 | 4.5 | picked row in sheet step A |
| `majorelle` focus ring on `ink` toast | **1.89** | **1.79** | 3 | **fails: use currentColor (fix 1)** |
| `majorelle` focus ring on `saffron` toast | 3.93 | **1.21** | 3 | **fails in dark: use currentColor (fix 1)** |

Every text and UI pairing used in the compositions passes. The two failures are the system's focus ring on toast grounds, fixed in shared fix 1. Hairlines (`line` on `surface-raised`, 1.39:1 / 1.27:1) and skeleton blocks (1.22:1 / 1.17:1) are decorative and need no ratio.

---

## A · Doorstep

### Preview (390 px, populated)
```
A · DOORSTEP: the total, then its verb
Monday 9 Nov                          (S)(Y)
Hi, you two
┌──────────────────────────────────────────┐
│ Saved together             3 goals open  │
│ 20,250 MAD                       1 done  │
└──────────────────────────────────────────┘
███████████████ Add to a goal ██████████████
┌───────┬──────────────────────────────────┐
│▓▓12▓▓▓│ Next trip                        │
│▓▓days▓│ Chefchaouen                      │
│▓to go▓│ Rif mountains · Sat 21 Nov –     │
└───────┴──────────────────────────────────┘
Closest to done                      See all
┌──────────────────────────────────────────┐
│ ╭─╮  Wedding fund                        │
│ │W│  14,250 MAD of 20,000 MAD            │
│ ╰─╯  ████████████████████░░░░░░░░        │
│      (S) Sara added 500 · 2 days ago     │
└──────────────────────────────────────────┘
┌─ Goal 2* ─── then Goal 3*, Shopping ─────┐
◆Home   Goals   Trips   Shopping   Profile
```
`*` placeholder goal (see Shared ground).

### Concept
The system's own Home, put in the right order. Like a riad's entrance, the doorstep gives you two things, what you have and the one thing you do, and the rooms (trip, goals, shopping) open beyond. Every component is used exactly as documented.

### Hierarchy, and how the total leads
1. Header: date, greeting, AvatarPair.
2. **Total card**: unchanged from the mock, with the counts right-aligned.
3. **Add to a goal**: full-width primary, on its own row directly under the total card.
4. TripCountdown.
5. "Closest to done": up to 3 GoalCards.
6. Shopping, as a bare 48 px link row ("Shopping · 7 left to buy ›"), not a card.

**The total leads by position and by its verb.** It's the first figure, and the only blue on the upper screen sits directly under it, so the eye reads number, then action, as one unit before the saffron block below. The total card stays a plain card: no tint and no extra weight.

### Where "Add to a goal" lives
On its own row between the total card and the trip, which is the IA skeleton's default slot. It's outside the card, so the total card stays the mock component and its whole area remains one link to Goals.

| 375 × 667 | Button (top–bottom) | (i) 603 | (ii) 583 | (iii) 489 | Also visible in (i) |
|---|---|---|---|---|---|
| A | 190–234 px | yes | yes | yes, 255 px spare | total, trip, all of goal 1 |

At 390 × 844 installed (699 px visible), you see goal 1 and about 80% of goal 2; Shopping needs a scroll. Below 22.5 rem, the counts move under the number as one caption line, "3 goals open · 1 done", which fixes the 320 px wrap noted in the nav notes.

### 1440 px (and 48–64 rem)
48–64 rem: the phone order in one 36 rem column, centred under the top bar.
From 64 rem: the header spans the width, then a 12-column grid with a 32 px gap. The left 5 columns hold total, Add, trip and Shopping; the right 7 hold the goals. DOM order stays in IA order (Shopping is placed in column 1 by the grid), so focus runs trip → goals → Shopping.
```
[logo]  Home  Goals  Trips  Shopping                         (S) Profile
──────◆─────────────────────────────────────────────────────────────────
Monday 9 Nov                                                      (S)(Y)
Hi, you two

┌─────────────────────────────┐   Closest to done               See all
│ Saved together 3 goals open │   ┌───────────────────────────────────┐
│ 20,250 MAD           1 done │   │ ╭─╮ Wedding fund                  │
└─────────────────────────────┘   │ │W│ 14,250 MAD of 20,000 MAD      │
████████ Add to a goal ████████   │ ╰─╯ ████████████████████░░░░░░░   │
┌──────┬──────────────────────┐   │     (S) Sara added 500 · 2 days…  │
│▓▓12▓▓│ Next trip            │   └───────────────────────────────────┘
│▓days▓│ Chefchaouen          │   ┌───────────────────────────────────┐
│to go▓│ Rif mountains · Sat… │   │ ╭─╮ Goal 2*                  60%  │
└──────┴──────────────────────┘   └───────────────────────────────────┘
Shopping           7 left to buy  ┌───────────────────────────────────┐
                                  │ ╭─╮ Goal 3*                       │
                                  └───────────────────────────────────┘
```
At 1440 × 900 everything is visible: the left column ends at ≈ 486 px and the right at ≈ 626 px.

### Quick-add sheet
A standard bottom sheet on phones and a centred dialog from 48 rem. On close, focus returns to the button at position 3. The toast sits 12 px above the nav.

### First-run and empty states
The rule: **the slot under the lead card always holds the state's primary.** In first-run, the invite card takes the total card's place, and the invite code takes the total's `numeral` style (it's the first figure the two of you share). Share code takes Add's slot.
```
Monday 9 Nov                             (S)
Hi, Sara
┌──────────────────────────────────────────┐
│ Invite your partner                      │
│ K7QM-4XPA                     [ Copy ]   │
│ [They type it in to join this space.]    │
└──────────────────────────────────────────┘
████████████████ Share code ████████████████
Start something
[ Create a goal                           ]
[ Plan a trip                             ]
[ Start the shopping list                 ]
```
The start points are three plain secondary block buttons with `goal`, `map` and `shopping-basket` icons. They aren't a checklist: no ticks, no progress, no "1 of 3". The header shows Sara's avatar alone, and there's no empty-seat avatar, because the partner's name isn't known yet.

| State | In this composition |
|---|---|
| `joined-empty` | Total card reads `0 MAD` with the caption `[Starts with your first goal]`. **Create a goal** takes the primary slot. The trip becomes the light prompt. Goals is omitted (IA question). The Shopping row reads `[Nothing on the list]` with secondary sm **Add an item**. |
| `no-trip` | A light row, not a card: `surface` ground, 1 px solid `line` border, `radius-lg`, no shadow, `map` 20 px in `ink-muted`, "No trips yet. Plan your first one.", secondary sm **Plan a trip**. |
| `all-done` | The total stays (done goals count). **New goal** takes the primary slot. Block 4 shows a zellige **Done** badge, `[Every goal reached]` and "See all". Values are placeholders. |
| `trip-now` | The component's own "2 · of 5 days" and "Happening now". Nothing else changes. |
| `loading` | Static sunken blocks shaped like each card, including a button-sized block in the primary slot. |
| `offline` | A slim `surface-sunken` row under the header with `cloud-off` 16 px and ink text: `[Offline · showing what was saved · adding still works]`. |
| `error` | One card in place of the blocks: message plus secondary **Try again**. The nav still works. |

### Signature moment: "Only the digits that changed"
- **Trigger:** a contribution lands, your own (the sheet closes) or your partner's (realtime).
- **Sequence:**
  - t = 0: the sheet closes and focus returns to "Add to a goal".
  - t = 120 ms: two things start together. The goal card's bar fills from the old width to the new one (400 ms, ease-out; the system's "animate only when a new contribution lands"). In the total, **only the digit positions whose value changed** roll: the old digit lifts 0.25 em and fades, and the new one rises from 0.25 em below (240 ms, ease-out, 40 ms stagger right to left). 20,250 → 20,750 moves one digit.
- **Width changes:** tabular figures mean no reflow. If the digit count changes (9,750 → 10,250), the whole figure cross-fades instead, because a width change can't be hidden.
- **Why:** "Numbers are earned, not typed." You see exactly which part of the sum your 500 changed.
- **Never moves:** the countdown, the layout, the button and the nav. Nothing animates on load. There's no count-up from zero.
- **Reduced motion:** the value swaps and the bar jumps; nothing travels. `aria-live="polite"` on the total fires for partner changes only (IA).

### System use
No new components, variants or tokens. The one change is that the counts move under the number below 22.5 rem. The 12-column grid is layout only.

### Risks
- **Card soup.** Three stacked cards of equal weight. Mitigated: labels sit bare, the button breaks the rhythm, and Shopping is a row, not a card.
- **Reach.** On 390 × 844 the button sits at ≈ 237–281 px from the screen top, in the stretch zone for one thumb. It's always visible, but it isn't where the thumb rests.
- **Salience.** The saffron block below is louder than the total card, so the total wins by position only.
- **Build:** lowest of the three, and a direct port of the existing mock.

---

## B · Within reach

### Preview (390 px, populated)
```
B · WITHIN REACH: the verb under the thumb
Monday 9 Nov                          (S)(Y)
Hi, you two

Saved together
20,250 MAD
3 goals open · 1 done                      ›

┌───────┬──────────────────────────────────┐
│▓▓12▓▓▓│ Next trip                        │
│▓▓days▓│ Chefchaouen                      │
│▓to go▓│ Rif mountains · Sat 21 Nov –     │
└───────┴──────────────────────────────────┘
Closest to done                      See all
┌──────────────────────────────────────────┐
│ ╭─╮  Wedding fund                        │
│ │W│  14,250 MAD of 20,000 MAD            │
│ ╰─╯  ████████████████████░░░░░░░░        │
──────── fixed dock, content under ─────────
███████████████ Add to a goal ██████████████
─◆──────────────────────────────────────────
Home    Goals   Trips   Shopping   Profile
```

### Concept
Home has two jobs, so B splits the screen between them. The **glance** is at the top, uncontained, and the **action** lives in a dock just above the nav, where a thumb already is on payday. The whole add flow (tap, sheet, amount, toast, Undo) then happens in the bottom third of the phone.

### Hierarchy, and how the total leads
1. Header.
2. **The bare total**: "Saved together", `numeral` total, then the counts caption with `chevron-right`, set straight on `surface` with 24 px above and 32 px below. The whole block is one link to Goals.
3. TripCountdown.
4. Closest to done (up to 3 GoalCards).
5. Shopping row.

The dock holds **Add to a goal**. In the DOM it comes right after the total, so screen readers and keyboards meet it at position 2, the same pattern the nav uses (first in the DOM, visually at the bottom).

**The total leads by isolation.** It's the only content on Home that isn't in a container, with the most air around it. Everything else is a card or a row, so the bare figure reads first. It also never wraps at 320 px, because nothing shares its line.

### Where "Add to a goal" lives
In a **fixed dock above the nav** (phones only, < 48 rem):
- Ground: `surface`, 1 px `line` hairline on top, `space-3` padding, safe-area insets on the sides.
- Button: block primary, 44 px.
- Height: 69 px, bottom = nav height + `safe-area-inset-bottom`.
- Content scrolls under it. `body` padding-bottom and `scroll-padding-bottom` add 69 px, so focused content never hides behind it [WCAG 2.4.11].
- The ز dot sits on the nav hairline between the dock and the tabs, with 12 px of clearance from the button.
- **The dock always holds the state's single primary:** Add to a goal, Create a goal, New goal, Share code, or Try again.

| 375 × 667 | Button | (i) 603 | (ii) 583 | (iii) 489 | Content above the dock in (i) |
|---|---|---|---|---|---|
| B | pinned 547–591 px | yes, at any scroll | yes | yes | 534 px: total, trip, all of goal 1 (6 px spare) |

The cost is 69 px of every screen. At 390 × 844 installed, 630 px remain: goal 1 plus the top of goal 2.

**Short viewports:** when `(max-height: 30rem)` matches (landscape phones, 400% zoom on desktop), the dock stops being fixed and sits inline under the total. Fixed chrome would otherwise take most of the screen [WCAG 1.4.10].

### 1440 px (and 48–64 rem)
There's no dock from 48 rem; the action joins the total in a **masthead**.
- 48–64 rem: greeting row, then the total on the left with the primary (md, not block) on its right baseline, then the rest in one 36 rem column.
- From 64 rem: one bare masthead line across the full 1048 px (greeting and pair · total and counts · Add to a goal), closed by a `line` hairline, then 5 | 7 columns (trip and Shopping | goals), in the same DOM order as A.

```
[logo]  Home  Goals  Trips  Shopping                         (S) Profile
──────◆─────────────────────────────────────────────────────────────────
Monday 9 Nov          Saved together
Hi, you two  (S)(Y)   20,250 MAD  3 goals open · 1 done  ██ Add to a goal
────────────────────────────────────────────────────────────────────────
┌──────┬──────────────────────┐   Closest to done               See all
│▓▓12▓▓│ Next trip            │   ┌───────────────────────────────────┐
│▓days▓│ Chefchaouen          │   │ ╭─╮ Wedding fund                  │
│to go▓│ Rif mountains · Sat… │   │ │W│ 14,250 MAD of 20,000 MAD      │
└──────┴──────────────────────┘   │ ╰─╯ ████████████████████░░░░░░░   │
Shopping           7 left to buy  │     (S) Sara added 500 · 2 days…  │
                                  └───────────────────────────────────┘
                                  ┌ Goal 2* ──────────────────── 60% ─┐
                                  ┌ Goal 3* ──────────────────────────┐
```
At 1440 × 900 everything is visible (≈ 718 px).

### Quick-add sheet
It rises from the dock (see the signature moment). From 48 rem it's a centred dialog, opened from the masthead button.

### First-run and empty states
The masthead slot takes whatever leads in that state, and the dock takes that state's primary.
```
Monday 9 Nov                             (S)
Hi, Sara

Invite your partner
K7QM-4XPA                         [ Copy ]
[They type it in to join this space.]

Start something
[ Create a goal                           ]
[ Plan a trip                             ]
[ Start the shopping list                 ]

──────── fixed dock, content under ─────────
████████████████ Share code ████████████████
◆Home   Goals   Trips   Shopping   Profile
```
The code is bare in `numeral`, exactly where the total will appear, and **Copy** is a secondary sm button on its line.

| State | In this composition |
|---|---|
| `joined-empty` | The bare total reads `0 MAD` with the caption `[Starts with your first goal]`. Dock: **Create a goal**. Trip becomes the light prompt. Goals is omitted (IA question). The Shopping row has secondary sm **Add an item**. |
| `no-trip` | The same light row as A, in the trip's slot. |
| `all-done` | Dock: **New goal**. Block 4 shows the Done badge, `[Every goal reached]` and "See all" (placeholders). |
| `trip-now` | The component's own state. Nothing else changes. |
| `loading` | Sunken bars for the bare total, card-shaped blocks below, and a sunken 44 px block in the dock (the goals for quick add are unknown until data arrives). |
| `offline` | The slim notice under the header. The dock stays live, because adding works offline (IA). |
| `error` | The message sits in the masthead slot, and the dock holds **Try again** as the only primary. |

### Signature moment: "The dock is the hinge"
- **Open:** tap "Add to a goal" and the sheet's top edge starts **at the dock's top edge**, not the bottom of the screen. The button's label cross-fades into the sheet header "Add to a goal" while the sheet extends upward (240 ms, ease-out) and the backdrop fades in. The thumb doesn't travel; the amount field (step B, pre-picked with one goal) lands in the same bottom third.
- **Close on success:** the sheet sinks back into the dock (200 ms), and the toast ("Added 500 MAD to Wedding fund · Undo") **attaches to the dock's top edge**, rising 8 px and fading in over 160 ms. Undo is about 56 px above the thumb and never covers the button. It stays 6 s and fades in 160 ms. When offline the toast gains the "will sync" line, and when a goal is completed it's the saffron "Goal reached" variant, in the same place.
- **Never moves:** the dock itself. It doesn't hide on scroll, bounce, pulse or show a badge.
- **Reduced motion:** the sheet and toast appear and disappear by opacity only; nothing travels.

### System use
- Components unchanged.
- A proposed layout token, `--dock-h: 69px`.
- The bare total is a composition, not a new component.
- The toast is anchored to the dock instead of `bottom: space-5` (shared fix 2).

### Risks
- **Vertical cost:** 69 px of fixed chrome on top of the 64 px nav, 133 px in all, or 20% of a 667 px screen. The short-viewport rule limits this.
- **Mis-taps** between the dock and the tabs: they're separated by 12 px plus the hairline, and the targets are 44 and 64 px tall. It needs a thumb test.
- **First-run proximity:** the code at the top and Share code at the bottom are about 430 px apart. The trade buys one fixed place for "the next thing to do".
- **Brand:** sticky bottom buttons read as checkout. It's mitigated by the verb label, by holding only the one primary, and by never being a "+" FAB.
- **Build:** moderate. A fixed layer with safe areas, the sheet-origin animation (View Transitions or FLIP), toast anchoring and the media-query fallback.

---

## C · Carnet

### Preview (390 px, populated)
```
C · CARNET: one ruled sheet, line by line
Monday 9 Nov                          (S)(Y)
Hi, you two
╭──────────────────────────────────────────╮
│ Saved together           3 open · 1 done │
│ 20,250 MAD                               │
│ ███████████ Add to a goal ██████████████ │
├───────┬──────────────────────────────────┤
│▓▓12▓▓▓│ Next trip                        │
│▓▓days▓│ Chefchaouen                      │
│▓to go▓│ Rif mountains · Sat 21 Nov –     │
├───────┴──────────────────────────────────┤
│ Closest to done                  See all │
│ ╭W╮ Wedding fund            14,250 MAD   │
│ ╰─╯ ████████████████░░░░░ of 20,000 MAD  │
│ (S) Sara added 500 · 2 days ago          │
├──────────────────────────────────────────┤
│ ╭G╮ Goal 2*                        60%   │
│ ╰─╯ █████████████░░░░░░░░░░░  complete   │
│ (Y) Youssef* · placeholder               │
├──────────────────────────────────────────┤
◆Home   Goals   Trips   Shopping   Profile
```
Goal 3\* and Shopping follow below the fold.

### Concept
Home as **one ruled page the two of you keep together**, like the household *karni*: the sum on the top line, then one line per thing, each with a name on the left and a figure on the right. One raised sheet replaces the stack of cards, hairlines replace the gaps, and the page holds more of the answer before you scroll.

### Hierarchy, and how the total leads
One `surface-raised` sheet (`radius-lg`, `shadow-card`, 1 px `line`) holds every block as a hairline-ruled section:
1. **Sum section:** "Saved together" and the counts on one caption line, the `numeral` total, then **Add to a goal** as the section's last line.
2. Trip line: TripCountdown, flush, with the saffron cell running the line's full height.
3. "Closest to done" heading line with "See all".
4. Up to 3 goal lines.
5. Shopping line.

**The total leads by scale contrast.** Every other figure in the sheet is 15 px body, so the 32 px total is the only large number. The saffron cell is also tamer here: it's a 96 px cell inside the page, not a free-standing card.

### Where "Add to a goal" lives
**Inside the sum section**, as its foot line, so the sum and its verb are one ruled entry. The stretched link to Goals covers only the label and number lines; the button is a sibling, not nested.

| 375 × 667 | Button | (i) 603 | (ii) 583 | (iii) 489 | Also visible in (i) |
|---|---|---|---|---|---|
| C | 179–223 px | yes | yes | yes, 266 px spare | total, trip, goal 1, all but the padding of goal 2 |

At 390 × 844 installed (699 px), **all three goal lines** are visible (the third to within 5 px). A shows 1.8 goals and B 1.6. Shopping needs a short scroll. A goal line is ≈ 96 px, against 150 px per GoalCard with its gap, so three goals take ≈ 290 px instead of ≈ 450.

### The goal line (a proposed GoalCard row variant)
```
│ ╭W╮ Wedding fund            14,250 MAD   │  title · saved: body-strong
│ ╰─╯ ████████████████░░░░░ of 20,000 MAD  │  Progress 8px · target: caption
│ (S) Sara added 500 · 2 days ago          │  avatar sm · attribution
```
- The arch cover shrinks to 32 × 40, still imagery only, with the initial on `majorelle-soft`.
- DOM reads: "Wedding fund, 14,250 MAD of 20,000 MAD, progress, Sara added 500 · 2 days ago".
- General goals show the percent on the right and "complete" after the bar.
- Below 22.5 rem, the target caption drops under the bar.
- Each line is a stretched link, ≥ 48 px tall (≈ 96), with its focus ring inset 2 px so the sheet's `overflow: hidden` doesn't clip it.

### 1440 px (and 48–64 rem)
48–64 rem: the same single sheet at 36 rem, centred.
From 64 rem, the page **widens into a ledger instead of splitting into cards**:
- A **summary line** of three hairline-divided cells: the sum (total, counts, Add), the trip (TripCountdown flush) and Shopping.
- Then the goal lines as a **table**: goal · saved of target · bar · last activity, one row each, on CSS subgrid so the columns align.
```
Monday 9 Nov                                                      (S)(Y)
Hi, you two
╭───────────────────────┬──────┬────────────────────┬──────────────────╮
│ Saved together        │▓▓12▓▓│ Next trip          │ Shopping         │
│ 20,250 MAD            │▓days▓│ Chefchaouen        │ 7 left to buy  › │
│ 3 goals open · 1 done │to go▓│ Rif mountains ·    │                  │
│ ███ Add to a goal ███ │▓▓▓▓▓▓│ Sat 21 – Wed 25 N… │                  │
├───────────────────────┴──────┴────────────────────┴──────────────────┤
│ Closest to done                                              See all │
│ ╭W╮ Wedding fund   14,250 of 20,000 MAD  ██████████░░░░  (S) Sara  … │
├──────────────────────────────────────────────────────────────────────┤
│ ╭G╮ Goal 2*                        60%   ████████░░░░░░  (Y) …*      │
├──────────────────────────────────────────────────────────────────────┤
│ ╭G╮ Goal 3*                                              …*          │
╰──────────────────────────────────────────────────────────────────────╯
```
At 1440 × 900 everything is visible (≈ 560 px). The width becomes columns of figures, not a stretched phone column. The table's amount column should keep the full "14,250 MAD of 20,000 MAD"; it's shortened above only to fit the sketch.

### Quick-add sheet
Step A's goal list reuses the goal line (title and "14,250 of 20,000 MAD" on the right), so picking a goal looks like picking a line on the page. On phones it's a bottom sheet; from 48 rem a centred dialog.

### First-run and empty states
**One skeleton for every state.** Loading, empty, first-run and populated share the same ruled lines, so content arriving never shifts the layout. An empty line is a ruled line with nothing written on it yet: its label, one quiet sentence and one secondary action, on solid hairlines (never dashed).
```
Monday 9 Nov                             (S)
Hi, Sara
╭──────────────────────────────────────────╮
│ Invite your partner                      │
│ K7QM-4XPA                       [ Copy ] │
│ ███████████████ Share code ████████████  │
├──────────────────────────────────────────┤
│ Trips     [Nothing planned] [Plan a trip]│
├──────────────────────────────────────────┤
│ Goals     [Nothing saved] [Create a goal]│
├──────────────────────────────────────────┤
│ Shopping  [List is empty]   [Add items]  │
╰──────────────────────────────────────────╯
```
The sum section becomes the invite: the code in `numeral` and Share code as its foot line. The three start points are the page's own lines, with secondary sm buttons right-aligned and `map`, `goal` and `shopping-basket` icons at 20 px.

| State | In this composition |
|---|---|
| `joined-empty` | The sum line reads `0 MAD` with **Create a goal** as its foot (primary). The trip and Shopping lines are empty lines with one secondary each. The goals section is omitted (IA question). |
| `no-trip` | The trip line loses its saffron cell, starts with `map` 20 px, and reads "No trips yet. Plan your first one." with secondary sm **Plan a trip**. |
| `all-done` | The sum line's foot is **New goal**. The goals section is one line: Done badge, `[Every goal reached]`, "See all" (placeholders). |
| `trip-now` | The flush cell shows "2 · of 5 days" with "Happening now". |
| `loading` | The same lines with sunken bars in place of the text. The saffron cell is drawn in `surface-sunken` until data arrives. |
| `offline` | The slim notice sits between the header and the sheet, not inside it. |
| `error` | The sheet shrinks to one line: message plus secondary **Try again**. |

### Signature moment: "Fresh ink"
- **Trigger:** a contribution lands, yours or your partner's.
- **Sequence:**
  - A 3 px rule appears on the touched goal line's leading edge **in the contributor's partner colour** (`partner-a` majorelle for Sara, `partner-b` terracotta for Youssef), as if the line were just written.
  - Its attribution rewrites to "Youssef added 200 · just now", and the bar fills (400 ms).
  - The rule draws in 120 ms, holds 2.4 s, and fades over 600 ms.
- **Fit with the system:** it uses the partner tokens for their documented job, attribution, and it isn't the only cue, because the text names who. Contrast: 8.25:1 / 7.69:1 for majorelle and 4.87:1 / 6.70:1 for terracotta on `surface-raised`.
- **Never moves:** line order. If ratios re-sort the goals, the new order appears on the next render, without an animated reshuffle.
- **Reduced motion:** the rule appears and disappears without the fade, with the same hold.

### System use
Two **proposed variants** for Design Systems:
- **GoalCard `layout="row"`:** flush, 32 × 40 arch, the ledger figures above.
- **TripCountdown `flush`:** no border, radius or shadow of its own inside a sheet.

The sheet container follows the system's `card-flush` pattern for ShoppingItem rows. The goal row would also suit the Goals list later.

### Risks
- **"Never a bank."** A ruled page of figures can read as a bank statement, the one feeling the system forbids. The serif greeting, arch thumbnails, saffron cell and partner-colour ink carry the warmth, but less of it than the full GoalCards in A and B.
- **Covers lose impact:** photo covers at 32 × 40 are thumbnails.
- **Variants:** two new component variants to specify, test and port.
- **Clipping:** focus rings and the saffron cell inside the sheet's rounded corners need care, with inset rings.
- **Build:** moderate to high (variants, subgrid table, one skeleton across states).

---

## Tells audit
This is checked against my own list of generic-product tells, because the kit's `anti-generic.md` was unreadable this session.

| Tell | A | B | C | Verdict |
|---|---|---|---|---|
| Card soup (every block an equal card) | present | reduced (total is bare) | absent | **A, justified:** three cards, not five. Labels are bare, Shopping is a row, and the button breaks the rhythm. |
| Sticky bottom CTA or FAB | – | **present** | – | **Justified:** it carries the one success action, labelled with its verb, never a "+" FAB. It holds each state's single primary and turns inline on short viewports. |
| Animated number counter | **present (signature)** | – | – | **Justified:** changed digits only, 240 ms, only when money actually moves. Never on load, never counting up from zero. |
| Stat tiles or bento grid | – | – | desktop summary line | **Justified:** three hairline-divided cells inside one sheet, with no icons in circles, no uneven tiles and no decorative figures. |
| Onboarding checklist ("1 of 3 done") | avoided | avoided | avoided | Start points are plain secondary actions with no ticks and no progress. |
| Dashed "+" empty slots | avoided | avoided | avoided | Dashed means "idea" in this system; empty lines are solid. |
| Illustrated or mascot empty states | avoided | avoided | avoided | Text plus one action; the voice bans "Nothing here yet :(". |
| Skeleton shimmer | **replaced** | **replaced** | **replaced** | Static sunken blocks everywhere. |
| Confetti or celebration burst | avoided | avoided | avoided | Completion is the system's saffron "Goal reached" toast only. |
| Time-of-day or emoji greeting | avoided | avoided | avoided | "Hi, you two" from the system. |
| Phone column stretched on desktop | avoided | avoided | avoided | A and B split into columns; C widens into a table. |
| Ledger reads as a bank statement | – | – | **present** | **Mitigated, not removed.** This is C's main brand risk (see C › Risks). |

## Recommendation
**B · Within reach.** It's the only direction that builds the whole Home around the brief's one success action: "Add to a goal in seconds. Tap, pick the goal, type the amount, done, with clear feedback and undo."
1. **It meets the IA's hard rule with margin in every case,** not just at 375 × 667: at any scroll position, on any phone height, and in every state, because the dock always holds the state's single primary. A and C pass the 375 × 667 check, but their button sits in the top third, which is a stretch for a thumb on 390 × 844 phones.
2. **The whole add happens in one place.** Button, sheet, amount field, toast and Undo all live in the bottom third, so a one-handed "I just got paid" add is three touches without moving the hand. The signature moment exists to keep it there.
3. **The 5-second glance is cleaner at the top.** The bare total leads by isolation, never wraps at 320 px, and the trip follows directly. That answers "how much" and "when" before anything else is drawn.

What to hold B to:
- the short-viewport fallback, `(max-height: 30rem)`, which makes the dock inline;
- a thumb test of the dock–tab gap;
- `scroll-padding-bottom` that includes the dock;
- shared fixes 1 and 2 (toast focus ring, toast anchored to the dock).

If the Critic finds the double bottom layer too heavy, or the build budget is tight, **A · Doorstep** is the safe fallback: it ports the existing mock with no new parts. **C · Carnet** is the densest glance, but it trades away the warmth the system protects, so I'd keep its goal row in mind for the Goals list rather than for Home. Please don't merge the directions: B's dock and A's in-flow button answer the same question two ways.
