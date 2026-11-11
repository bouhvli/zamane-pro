# Directions: Zamane Trips (list, trip detail, create/edit, in-trip forms)

**By:** Art Director · **For:** the Director (department-lite) · Wed 11 Nov 2026
**Read:** `brief.md`, `ia.md` (all; D2, D3, D4, D6 especially), `decision.md` (U1–U5 override the IA: no Directions links, location is plain text), `Zamane Design System.html` (tokens, arch, TripCountdown, Progress `mode="budget"`, ideas vs commitments, icons, voice), `../goals/directions.md`, `../goals/decision.md`, `../goals/build-notes.md`, `../goals/zamane.css`, the Goals screenshots (detail and list, both themes), `../home/decision.md`. From the kit: `protocol.md`, `reference/anti-generic.md` (all), `styles.md`, `fonts.md` (blend-check), the colour section of `tokens.md`, and `scripts/contrast.mjs` for every ratio below. There is no `research.md`; reasons cite the brief, the IA and the design system (DS).

**Scope.** Three ways of dressing the IA's fixed skeleton, all inside the settled system and in the family of Goals' **B · Doorway** (the arch as the cover, Young Serif display h1, text on the sand, hairlines, the nav's diamond on the tab bar). Nothing here changes a screen, a field, a step or the DOM order. The directions diverge only where Trips has its own subject:
1. time and days (the day list; Today, Now and Next during the trip);
2. ideas vs commitments (dashed Places, solid plan entries, scheduling one into the other);
3. prep ticks;
4. the budget bar;
5. the list's lead countdown;
6. the trip cover in the arch.

No direction adds a hue, a font or a component family. Fonts and palette are identical across A, B and C, so the previews show composition and where the colours live.

---

## Shared ground

### The subject's world (written down before choosing anything)
1. **The departures board at Casa-Voyageurs.** ONCF and CTM boards lead every line with the hour, in one aligned column; the train that's boarding is the lit line. Time is read down the left edge. *(A's spine.)*
2. **The courtyard light.** In a riad the patch of sun crossing the zellige floor tells you the time of day. The DS's own lede names it: "sand walls, zellige blue, **saffron light**, arched doorways." *(B's spine.)*
3. **The *carnet de voyage*.** The notebook a couple keeps for a trip: bookings written in ink on the day's page, "maybe" places pencilled in the margin, tickets tucked in. Inking a pencilled idea is the moment it becomes a plan. *(C's spine.)*
4. **The riad doorway and the *maâlem*'s zellige.** Goals' Doorway: a finished door is a tiled one. Here: a packed bag is a tiled row. *(B's prep tally.)*
5. **The packing list on the back of an envelope.** Ticked in place, never reordered, the order is the memory. *(Every Prep panel; IA D9.)*

### Fixed in every direction
- **Structure from `ia.md` as amended by `decision.md`:** three tabs (Plan · Places · Prep) below 64 rem; 7|5 columns at 64–80 rem; 5|4|3 at ≥ 80 rem with a band on top; the floating primary by status (D5, U2); Earlier days folded and Today first during the trip (D6). **No Directions control, no maps link** (U5): a location is plain text; a link appears only for the entry's or place's own `url`.
- **Type:** Young Serif + Figtree, the DS roles. Detail h1 is `display` 40/44 before and after the trip, `title-lg` 28/34 in the compact during-trip summary (IA D6). Serif never below 24 px. Times 24-hour, `tabular-nums`.
  - Fonts: `https://fonts.googleapis.com/css2?family=Figtree:wght@400;600&family=Young+Serif&display=swap` (HTTP 200, checked today; the link Home and Goals use).
  - Blend-check (fonts.md), unchanged from Goals: distinct roles (soft heavy old-style serif for display, open humanist-geometric sans for text); similar large x-heights; same warm mid-century mood; Figtree legible at 16 px; 2 families, 3 weights; display:body 40/15 = 2.67×.
- **Colour meanings (DS, binding):**
  - **Saffron = time and celebration; at most one saffron block per screen.** `saffron-soft` is the DS's tint for countdown chips and "happening now" rows.
  - **Zellige = done:** a ticked plan entry, a packed line, a visited place.
  - **Terracotta = the budget bar fill.** Never text on sand (4.48:1 in light).
  - **Majorelle = action:** the primary, links, the selected tab, focus.
  - **Danger = over budget and deletes.** An over-budget bar is **all** danger on `danger-soft`: danger is never drawn next to terracotta (1.33 / 1.06:1, indistinguishable).
- **Ideas vs commitments (DS):** a Place is a **2 px dashed `line-strong` outline on the page, no fill, no shadow**; a plan entry is a **solid `surface-raised` card, 1 px `line`, `shadow-card`**. Never alike. Words carry it too ("idea", "In the plan", "From Places"). [WCAG 1.4.1]
- **The arch holds imagery only.** No cover, or uploads off: the title's initial (Young Serif, `majorelle-ink` on `majorelle-soft`, as in Goals). Example covers are sunken arches labelled "Example photo", never stock.
- **Ticks** are the DS ShoppingItem checkbox (24 px visual, 44 px target), tick and row button as siblings (IA D7). On a `saffron-soft` row the checkbox border switches from `line-strong` to `ink-muted`, because `line-strong` on `saffron-soft` is **2.85:1 in dark** (fails 3:1); `ink-muted` is 5.49 / 5.89.
- **"Now" and "Next" are always words**, never only a fill. They change on the minute with no animation (IA D6, §6.12). Budget bars never animate (DS).
- **Tabs:** Goals' 8 px majorelle diamond on the tab bar's hairline marks the selected tab.
- **Never used:** confetti, count-ups, shimmer skeletons, parallax, a collapsing photo header, star/lantern/mosaic patterns, faux-Arabic type.

### The during-trip fold (IA D6 hold), and the FAB
**320 × 568, Plan tab, Lisbon at 13:20:** 504 px sit above the 64 px nav. Home's floating primary ("Add a place", 56 px, 16 px above the nav) occupies **y 432–488, x 157–304** (16 + 20 + 8 + ≈ 79 + 24 = 147 px wide).

Every row between the top and the Now row is a 44 px target the IA requires: the back row, the budget toggle, the tabs, Earlier days, Today's heading. The doorway alone (Goals' 288 × 144) would push the Now row past 600. So all three directions share four compaction rules, and diverge in how the remaining summary looks:
1. **Main padding-top 8 px** on the detail during the trip (Goals: 24).
2. **The doorway leaves the phone summary during the trip** below 22.5 rem (each direction says what replaces it at wider sizes).
3. **The budget becomes one 44 px row:** the disclosure button "Budget · 400 MAD left ▾" with the bar beside it in the same row (the bar sits outside the button; a progressbar can't live inside a button). The full figure "5,600 of 6,000 MAD" moves into the breakdown when opened. Phones, during the trip only.
4. **Gaps of 4 px** around the tabs; Earlier days (44) and Today's heading (44) sit flush, each with its own internal air.

Shared skeleton (y in px): pad 0–8 · back row 8–52 · **summary 52–174** (direction-specific, 122 px including the budget row) · tabs 178–222 · Earlier days 226–270 · Today heading 270–314 · LX Factory (done, 2 lines) 314–388 · **Now row from 396**.

Each direction's table below gives the Now row's tick, first title line and bottom against the fold (504) and the FAB top (432). In all three, **the tick, the Now word and the first title line are clear of the FAB**; the FAB covers the right end of the Now row's second and third lines at load (Home's accepted trade-off, "it can cover the end of a row"). Margin to the fold is about 18 px in each, so the builder must screenshot 320 × 568 in both themes. **First thing to give if a title wraps one extra line:** the 4 px gaps around the tabs go to 0.

### Contrast: every pair the directions use (kit `contrast.mjs`, verbatim DS hex)

oklch equivalents are computed from the DS hex, not new colours (see each direction's colour table).

| Pair | Light | Dark | Need | Used for | Dirs |
|---|---|---|---|---|---|
| `ink` on `surface` | 14.35 | 15.27 | 4.5 | h1, rows on sand | A B C |
| `ink` on `surface-raised` | 15.61 | 13.76 | 4.5 | plan cards, sheets | A B C |
| `ink` on `surface-sunken` | 12.81 | 16.05 | 4.5 | Must-do badge, past count, offline notice | A B C |
| `ink-muted` on `surface` | 5.77 | 8.07 | 4.5 | meta, captions on sand | A B C |
| `ink-muted` on `surface-raised` | 6.27 | 7.27 | 4.5 | meta in cards, A's end time | A B C |
| `ink-muted` on `surface-sunken` | 5.15 | 8.48 | 4.5 | "Nothing planned" wells, "Example photo" | A B C |
| `ink` on `saffron-soft` | 13.66 | 11.16 | 4.5 | Now row title | A B C |
| `ink-muted` on `saffron-soft` | 5.49 | 5.89 | 4.5 | Now row meta; **Now row checkbox border (UI)** | A B C |
| `saffron-ink` on `saffron-soft` | 5.96 | 8.77 | 4.5 | "Now" word (A column, C margin), C's "Day 3 of 4" chip | A C |
| `line-strong` on `saffron-soft` | 3.13 | **2.85** | 3 | **not used**: fails in dark, replaced by `ink-muted` | – |
| `majorelle` (focus ring) on `saffron-soft` | 7.22 | 6.23 | 3 | focus on the Now row's button | A B C |
| `on-saffron` on `saffron` | 7.71 | 9.40 | 4.5 | count cells, B's light band and Now cell | A B C |
| `saffron-ink` on `surface` | 6.26 | 12.01 | 4.5 | B's "Day 3 of 4 · Happening now" status text | B |
| `saffron-ink` on `surface-raised` | 6.81 | 10.82 | 4.5 | TripCountdown kicker "Next trip", "Happening now" | A B C |
| `saffron` on `surface` / `surface-raised` | 1.93 / 2.10 | 10.36 / 9.33 | – | edge of a saffron block in light: decorative, the block always holds its own text (7.71) | A B C |
| `saffron` on `saffron-soft` | 1.84 | 7.56 | – | B's Now cell against its row body: decorative, the word "Now" carries it | B |
| `line-strong` on `surface` | 3.28 | 3.90 | 3 | dashed Place outline, checkboxes on sand, B's empty tally tiles | A B C |
| `line-strong` on `surface-raised` | 3.57 | 3.51 | 3 | checkboxes inside plan cards | A C |
| `zellige` on `surface` | 4.74 | 8.99 | 3 | checked box on sand (Prep, B's ticks), B's filled tally tiles | A B C |
| `zellige` on `surface-raised` | 5.16 | 8.10 | 3 | checked box inside a card, C's Prep sheet | A B C |
| `on-zellige` on `zellige` | 5.24 | 8.12 | 3 | the check mark | A B C |
| `zellige-ink` on `surface` / `surface-raised` | 7.37 / 8.01 | 11.45 / 10.32 | 4.5 | "Done by Sara · 12:05", "Visited · Sun 8 Nov" | A B C |
| `terracotta` fill on `surface-sunken` track | 4.00 | 7.81 | 3 | budget bar; C's dashed ideas segment | A B C |
| `terracotta` on `surface` / `surface-raised` | 4.48 / 4.87 | 7.43 / 6.70 | 3 | bar end against the page or band | A B C |
| `danger` fill on `danger-soft` track | 5.41 | 6.75 | 3 | over-budget bar | A B C |
| `danger` on `surface` | 5.95 | 7.92 | 4.5 | "Over by 1,200 MAD" | A B C |
| `danger` next to `terracotta` | **1.33** | **1.06** | – | **never adjacent** (over = whole bar danger) | – |
| `ink` budget mark on `surface` | 14.35 | 15.27 | 3 | B and C's budget mark (taller than the bar, so it reads against the page) | B C |
| `majorelle` on `surface` / `surface-raised` | 7.59 / 8.25 | 8.53 / 7.69 | 4.5 | links, Schedule, ghost Add, selected tab | A B C |
| `majorelle` on `surface-sunken` | 6.78 | 8.97 | 4.5 | "Add" inside an empty-day well | A B C |
| `on-majorelle` on `majorelle` | 8.39 | 8.23 | 4.5 | the primary | A B C |
| `majorelle-ink` on `majorelle-soft` | 8.88 | 9.07 | 4.5 | arch initial | A B C |
| `ink` on `saffron` | 7.43 | – | 4.5 | reserve (B uses `on-saffron`, 7.71) | – |

**Changed, not footnoted:** `line-strong` on `saffron-soft` (2.85 in dark) is replaced by `ink-muted` on Now rows; danger beside terracotta (1.33 / 1.06) is ruled out by making an over-budget fill all danger. Every other text pair is ≥ 4.5:1 and every UI pair ≥ 3:1 in both themes.

---

## A · Itinerary

### Preview
```
A · ITINERARY · Young Serif + Figtree · every plan leads with its time
saffron oklch(0.766 0.145 79.8) · saffron-soft oklch(0.949 0.042 87.4)
terracotta oklch(0.559 0.137 40.0) · zellige oklch(0.520 0.094 168.6)
Lisbon weekend
▐Day 3▌ Happening now
▐of 4 ▌ Portugal · Sat 7 – Tue 10 Nov
┃☑ 10:00 LX Factory · Done by Sara · 12:05  ┃
┃☐ Now   Lunch at Time Out Market     250  ┃ saffron-soft
┃☐ Next  Tram 28 · Martim Moniz        30  ┃
┆   Pena Palace · Sintra · ~110 MAD        ┆ an idea has no time
SIGNATURE the time column, read down like a departures board
```

### Concept
The doorway on top, then the trip as a printed itinerary: **every commitment leads with its time**, read down one aligned column like the departures board at Casa-Voyageurs. Ideas have no time yet, so they have no column. It is the lowest-risk option: the DS components almost verbatim, Goals' Doorway untouched, and one point of view about time.

### Style family
**Editorial / magazine** (family D, as Goals B) with **Swiss column discipline** (family A).
- **Taken:** one aligned tabular column, hairlines, hierarchy by type and position.
- **Left behind:** the board's all-caps, its black ground, split-flap motion.

### Type
- **h1:** `display` 40/44 before and after the trip; `title-lg` 28/34 during it.
- **The time column (signature):** start time `body-strong` 15/22 tabular in `ink`; end time 13/18 in `ink-muted` under it. Untimed: "Any time" `caption` on two lines. During the trip the start slot carries the status word: **Now** `label` 13/18 · 600 in `saffron-ink` over "–14:00"; **Next** `label` in `ink` over "15:00".
- **Day h3:** `body-strong` "Sat 21 Nov", then " · Day 1" in `ink-muted` 400. Today: "Today · Mon 9 Nov · Day 3".
- **Card text:** title `body-strong`; location · cost 13/18 `ink-muted`; attribution `caption`.
- **TripCountdown:** DS as drawn (count `numeral` 32/36, kicker 13/18 `saffron-ink`).

### Colour
| Role | Token | Light | Dark |
|---|---|---|---|
| page (dominant) | `surface` | oklch(0.966 0.013 82.4) | oklch(0.199 0.015 261.6) |
| commitments | `surface-raised` | oklch(0.994 0.007 88.6) | oklch(0.243 0.019 262.1) |
| text / muted | `ink` / `ink-muted` | oklch(0.254 0.028 269.2) / oklch(0.486 0.023 269.9) | oklch(0.941 0.017 84.6) / oklch(0.747 0.018 267.7) |
| action | `majorelle` | oklch(0.423 0.111 255.1) | oklch(0.763 0.088 257.7) |
| time (one block + the Now card) | `saffron` / `saffron-soft` | oklch(0.766 0.145 79.8) / oklch(0.949 0.042 87.4) | oklch(0.823 0.139 81.6) / oklch(0.309 0.047 84.5) |
| budget / done | `terracotta` / `zellige` | oklch(0.559 0.137 40.0) / oklch(0.520 0.094 168.6) | oklch(0.736 0.120 41.9) / oklch(0.764 0.111 166.7) |

- **Proportions:** about 60% sand, 30% raised (plan cards, the countdown), majorelle ≤ 5% (primary, links, tab mark). Saffron is one count cell per screen, plus one `saffron-soft` card during the trip. Terracotta is one 8 px bar. Zellige only on ticks and "Visited".
- **Dark mode:** tokens swap. The Now card becomes a deep amber `#3b2e12` with `ink` at 11.16:1; its checkbox border is `ink-muted` (5.89). Cards read by the lighter raised surface and their line, not by shadow.

### Shape and space
- **Radius by role:** `radius-lg` TripCountdown; `radius-md` plan cards, place cards, wells; `radius-sm` bars; pills for badges and avatars. The time column has no box of its own.
- **Borders:** 1 px `line` + `shadow-card` on plan cards; 2 px dashed `line-strong` on places; hairlines above day headings and between Prep rows.
- **Density:** card padding 12; 8 px between cards in a day, 24 between days; rows ≥ 56 px.
- **Plan card at 390:** tick 24 (target 44) · 8 · time 44 · 8 · text. At 320 the text column is 178 px, so long titles wrap.
- **Grid:** one column on phones; 7|5 at 64–80 rem; at ≥ 80 rem a band (doorway 3 | identity and status 5 | budget 4) over Plan 5 | Places 4 | Prep 3.

### Imagery and iconography
- **Cover:** Goals' doorway exactly: full content width, 2:1 bare with the 96 px initial, 3:2 with a photo, capped at 15 rem. **During the trip:** hidden below 22.5 rem; a 40 × 50 arch at the end of the h1 row from 22.5 rem; the full doorway returns at ≥ 64 rem in the band. Past trips keep the full doorway (a look back).
- **List:** the lead is the DS TripCountdown with a 56 × 70 arch at the body's end (IA §5.1); every other trip is a raised row with Goals' 32 × 40 row arch.
- **Icons (Lucide 1.75):** plan types `plane`, `train-front`, `bed-double`, `utensils`, `landmark`, `ticket`, `circle-dot`; Prep `luggage`, `file-text`, `calendar-check`, `list-checks`; chrome `chevron-left`, `plus`, `chevron-down`, `check`, `cloud-off`, `image` (example). No must-do icon: the badge is text.

### Motion personality
- **No orchestrated moment.** Restraint is the point: it's an itinerary.
- The checkbox's own state change (120 ms, `--dur-press`); sheets, dialogs and toasts as Home.
- **Never moves:** the time column, Now and Next (they swap on the minute, instantly), cards on partner changes, the doorway.
- **Reduced motion:** the tick is instant.

### Signature element: the time column
A 44 px column at the start of every plan card, holding start over end time in tabular figures, so a day reads down one edge like a board: "08:00 · 12:45 · 15:00 · 20:30". Untimed entries say "Any time" and sit first (IA D7). During the trip the same slot carries the status word, so **Now and Next are read in the same place as the times**. A place card has no column at all: an idea has no time until it's scheduled, and scheduling is visibly what gives it one.

### Key screens

```
MOBILE 390 · Trips list · populated
Trips                                         title-lg 28
Coming up
╭───────────────────────────────────────────╮  DS TripCountdown,
│▐ 12  ▌ Next trip                   ╭────╮ │  the one saffron
│▐ days▌ Chefchaouen                 │ ph │ │  block; 56 × 70
│▐to go▌ Rif mountains ·             ╰────╯ │  arch at the end
│▐     ▌ Sat 21 – Wed 25 Nov                │
╰───────────────────────────────────────────╯
No dates yet
╭───────────────────────────────────────────╮  raised row,
│ ╭F╮ Weekend in Fes                         │  32 × 40 arch
│ ╰─╯ Fes · No dates yet                     │
╰───────────────────────────────────────────╯
Past
┌───────────────────────────────────────────┐  flat row, no
│ ╭E╮ Essaouira · Atlantic coast             │  shadow
│     Wed 2 – Sun 6 Sep · 64 days ago        │
└───────────────────────────────────────────┘
                         ╭─────────────────╮
                         │ + Plan a trip   │
                         ╰─────────────────╯
```

```
MOBILE 390 · Detail · Chefchaouen · before the trip · Plan tab
‹ Trips                                  [Edit]
   ╭──────────────────────────────────────╮
   │            Example photo, 3:2        │   doorway, Goals parity
   ╰──────────────────────────────────────╯
Chefchaouen                                     display 40
Rif mountains · Sat 21 – Wed 25 Nov
The riad has no heating. Pack warm layers.
╭▐ 12  ▌ Next trip ──────────────────────╮     DS TripCountdown
│▐ days▌ 4 nights                         │     (no title: h1 above)
╰▐to go▌──────────────────────────────────╯
9 to prep · 1 must-do not in the plan           links → tabs
[Budget ▾]          Over by 1,200 MAD           danger text
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓      all danger
9,200 of 8,000 MAD
   Plan        Places        Prep
───◆─────────────────────────────────────
Sat 21 Nov · Day 1                   [+ Add]
┃☐ Any  ‹bed› Riad in the medina   4,400 (S)┃
┃  time        Check-in from 14:00          ┃
┃☐ 08:00 ‹train› Bus to Chefchaouen  160 (Y)┃
┃  12:15        CTM station, Fes            ┃
┃☐ 20:00 ‹fork› Dinner on the square 350 (S)┃
┃               Outa el Hammam              ┃
Sun 22 Nov · Day 2                   [+ Add]
┃☐ 08:30 ‹ticket› Akchour waterfalls 1,200  ┃
Mon 23 Nov · Day 3                   [+ Add]
░ Nothing planned ░░░░░░░░░░░░░░ [Add] ░░░░      sunken well
```
- **320 × 568:** the doorway is 288 × 144 (2:1 even with a photo below 22.5 rem), so the countdown sits at y ≈ 362–442, above the fold.

```
MOBILE 320 · Detail · Lisbon · during the trip · 13:20 (fold at 504)
‹ Trips                         [Edit]       8–52
Lisbon weekend                               52–86   title-lg 28
▐Day 3▌ Happening now                        90–126  compact count
▐of 4 ▌ Portugal · Sat 7 – Tue 10 Nov                cell 56 × 36
[Budget · 400 MAD left ▾] ▓▓▓▓▓▓▓▓▓░        130–174
  Plan      Places      Prep                 178–222
──◆─────────────────────────────
[▸ Earlier days · Sat 7 – Sun 8 Nov ·        226–270
   4 of 4 done]
Today · Mon 9 Nov · Day 3      [+ Add]       270–314
┃☑ 10:00 ‹landmark› LX Factory     ┃         314–388
┃  12:00 (S) Done by Sara · 12:05  ┃         zellige tick
┃☐ Now  ‹fork› Lunch at Time Out  ┃          396–486  saffron-soft
┃  –14:00 Market         ╭────────────╮       FAB 432–488
┃         Cais do Sodré  │+ Add a place│       covers the right
┃☐ Next ‹train› Tram 28  ╰────────────╯       of lines 2–3
┃  15:00 Martim Moniz · 30 MAD    ┃
```

| At 320 × 568 | y | vs fold 504 | vs FAB 432 |
|---|---|---|---|
| Now card top | 396 | ✓ | ✓ |
| Tick (24 visual, x 29–53) | 408–432 | ✓ | ✓ clear (left of x 157) |
| "Now" word and first title line | 408–430 | ✓ | ✓ |
| Now card bottom (3 lines: the time column narrows the title to 178 px) | 486 | ✓ 18 px spare | right end of lines 2–3 under the FAB |

```
DESKTOP 1440 · Detail · Chefchaouen · ≥ 80 rem, content ≈ 80 rem
‹ Trips
╭──────────╮ Chefchaouen                              [Edit] [+ Add to the plan]
│ example  │ Rif mountains · Sat 21 – Wed 25 Nov     Budget
│ photo    │ The riad has no heating. Pack…  More    9,200 of 8,000 MAD
│ 3:2      │ ╭▐12 days to go▌ Next trip · 4 nights╮  Over by 1,200 MAD
╰──────────╯ 9 to prep · 1 must-do not in the plan  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
  (3 cols)     (5 cols)                             ‹bed› Stay 4,400 · ‹ticket›
                                                    Activity 3,500 · … ┆Ideas ~250┆
──────────────────────────────────────────────────────────────────────────────
Plan                             │ Places · 4               │ Prep · 4 of 13
Sat 21 Nov · Day 1        [+ Add]│ Ideas · 3                │ ‹luggage› Packing · 0 of 5
┃☐ Any  Riad in the medina 4,400 ┃│┆ Ras El Maa viewpoint   ┆│ ☐ Walking shoes
┃☐ 08:00 Bus to Chefchaouen  160 ┃│┆ old medina · ~0 MAD    ┆│ ☐ Phone chargers
┃  12:15 CTM station, Fes        ┃│┆ [Must-do]   [Schedule] ┆│ ─────────────────
┃☐ 20:00 Dinner on the square 350┃│┆ Goat cheese tasting    ┆│ ‹file-text› Documents
Sun 22 Nov · Day 2        [+ Add]│┆ ~150 MAD    [Schedule] ┆│ ☑ ID cards or passports
┃☐ 08:30 Akchour waterfalls 1,200┃│In the plan · 1           │   Done by Sara · Sun 8 Nov
Mon 23 Nov · Day 3        [+ Add]│┆ Spanish Mosque         ┆│ …
░ Nothing planned ░░░░░ [Add] ░░ │┆ [In the plan · Tue 24  ┆│
                    (5 cols)     │┆  Nov, 17:30]           ┆│     (3 cols)
```
- **Ideas beside commitments:** the Places column has no time column at all, so the eye sees the difference across the gutter before it reads a word.

### Create and edit
Goals' form (B) as built: the Title field in Young Serif 28/34; Add details folded; the cover preview is the 2:1 doorway with the live initial; Dates as a fieldset with First day and Last day. Nothing A-specific.

### Tokens added (no colour)
- `--time-col: 2.75rem` (44 px);
- `--arch-thumb-w: 2.5rem`, `--arch-thumb-h: 3.125rem` (40 × 50);
- `--count-strip-w: 3.5rem` (the compact count cell, 56 × 36);
- aliases: `--budget-fill: var(--terracotta)`, `--budget-track: var(--surface-sunken)`, `--now-fill: var(--saffron-soft)`, `--now-word: var(--saffron-ink)`, `--now-check-border: var(--ink-muted)`.

### Risks
- **Least distinctive.** Cover the logo and a careful itinerary app could look like this. The doorway, the serif and the sand carry the brand; the time column carries the subject.
- **The column costs width at 320.** 52 px less for titles, so the Now card is three lines (90 px). The fold margin is 18 px.
- **Doorway sameness** is inherited from Goals unchanged (L, C, F, E initials on the list and details with uploads off).
- **The compact count cell** (56 × 36, "Day 3 / of 4") is a new small variant of TripCountdown's now state; it must stay one block per screen.
- **Build cost:** the lowest. A time-column slot in the plan row, the compact count strip, the thumb arch.

---

## B · Saffron light

### Preview
```
B · SAFFRON LIGHT · Young Serif + Figtree · the light falls on now
saffron oklch(0.766 0.145 79.8) · on-saffron oklch(0.241 0.043 80.2)
saffron-soft oklch(0.949 0.042 87.4) · zellige oklch(0.520 0.094 168.6)
BEFORE   ╭────── doorway ──────╮
         Chefchaouen
         ████ 12 days to go █████ Next trip ███   the light band
DURING   Lisbon weekend · Day 3 of 4 · Happening now   (text only)
         ☑ ┃LX Factory · Done by Sara · 12:05      ┃
         ☐ ┃█Now █┃ Lunch at Time Out Market  250 ┃ the light moved
         ☐ ┃Tram 28 · Next · 15:00              30 ┃
PREP     Packing ▪▪▫▫▫ 2 of 5                         zellige tally
```

### Concept
The light in a riad courtyard tells the time. In Zamane saffron is that light, and **it falls on whatever is nearest in time**: on the countdown while the trip is ahead, on the thing that's happening right now once you're there, and nowhere after it's over. One saffron block per screen, always, and it moves. It's the DS's own sentence ("saffron light"), and both DS saffron rules (the countdown block, the happening-now row) become one rule.

### Style family
**Editorial / magazine** (family D, as Goals B) lit by a single source.
- **Taken:** image-led opening, serif chapter heads, text on the sand, one strong colour field.
- **Left behind:** glow, gradients and dark dramatic grounds. The light is a flat saffron field with its own text, never a halo.

### Type
- **h1:** `display` 40/44 before and after; `title-lg` 28/34 during.
- **The light band:** count `numeral` 32/36 in `on-saffron`, "days to go" `body-strong`, kicker "Next trip · 4 nights" 13/18.
- **Day headings are chapters:** Young Serif `title-lg` 28/34 "Sat 21 Nov", with "Day 1" as a `caption` and the Add button on the same line. "Today" is set the same way, with "Mon 9 Nov · Day 3" as the caption.
- **The Now cell:** "Now" `label` 13/18 · 600; "12:45" `body-strong` tabular; "–14:00" `caption`, all `on-saffron`.
- **Status during the trip:** "Day 3 of 4 · Happening now" `label` 13/18 · 600 in `saffron-ink` (saffron as text, not a block).
- **Rows:** title `body-strong`; time · location · cost 13/18 `ink-muted`; "Next" `label` in `ink`.

### Colour
| Role | Token | Light | Dark |
|---|---|---|---|
| page (dominant) | `surface` | oklch(0.966 0.013 82.4) | oklch(0.199 0.015 261.6) |
| the light (one block) | `saffron` | oklch(0.766 0.145 79.8) | oklch(0.823 0.139 81.6) |
| text on the light | `on-saffron` | oklch(0.241 0.043 80.2) | oklch(0.241 0.043 80.2) |
| lit row | `saffron-soft` | oklch(0.949 0.042 87.4) | oklch(0.309 0.047 84.5) |
| text / muted | `ink` / `ink-muted` | oklch(0.254 0.028 269.2) / oklch(0.486 0.023 269.9) | oklch(0.941 0.017 84.6) / oklch(0.747 0.018 267.7) |
| done (ticks, tally) | `zellige` | oklch(0.520 0.094 168.6) | oklch(0.764 0.111 166.7) |

- **Proportions:** about 55% sand, 25% imagery (doorway and tiles), 10% raised. The light is one block: about 6% of the first screen before the trip, about 2% during it (one 56 px cell). Majorelle ≤ 5%. Terracotta one bar.
- **Dark mode:** the light is the brightest thing in the app (`#f2bb4e` on night), deliberately: it's where to look. `on-saffron` holds 9.40:1. The lit row becomes deep amber with `ink` at 11.16:1.

### Shape and space
- **The light band** (TripCountdown laid flat): full content width, 64 px, `radius-md`; count at the start, kicker at the end. Past trips: the same band in `surface-sunken` with `ink-muted` (the DS past state).
- **The Now card:** the tick sits **outside**, on the sand (so its border is `line-strong` at 3.90, no dark-mode fix); the card holds a 56 px saffron cell at its start and a `saffron-soft` body. When nothing is happening now, no card has the cell and the screen has no saffron.
- **Plan cards:** DS commit (raised, `line`, `shadow-card`, `radius-md`), tick outside at the start (IA D7).
- **Places:** DS idea; and in B, a place never takes saffron, even when it's scheduled for today. Ideas stay in the shade.
- **Prep tally:** each group heading carries one 8 × 8 tile per item, 2 px apart: `zellige` filled when ticked, `line-strong` outline when not, `aria-hidden`; the text "2 of 5" carries the meaning. Over 12 items the tiles hide and only the count remains.
- **Budget mark:** the track spans max(planned, budget). A 2 × 16 px `ink` mark (taller than the 8 px bar, so it reads against the page) stands at the budget. Under budget: terracotta fill. Over: the whole fill is danger on `danger-soft`, and the mark shows where the budget ran out (87% for 8,000 of 9,200).
- **Grid:** the list is Goals' tile grid: the lead spans the row, the others are 2-up (3-up from 48 rem, 4-up from 64). The detail at ≥ 80 rem: band (doorway 4 | identity, light band and budget 8) over Plan 5 | Places 4 | Prep 3.

### Imagery and iconography
- **Cover:** Goals' doorway at full width before the trip (2:1 bare with the 96 px initial, 3:2 with a photo, ≤ 15 rem; 2:1 for photos too below 22.5 rem so the light band stays above the fold). **During the trip the doorway shrinks** to a 32 × 40 arch at the h1 row's end from 22.5 rem (hidden below it, see the fold): the light has left the door and gone into the day.
- **List tiles:** Goals' 5:4 tile arches (2:1 when no trip on the list has a cover); the lead tile's arch sits directly on its light band.
- **Icons:** the same Lucide set as A.

### Motion personality
- **The one orchestrated moment: the light leaves a done thing.** Ticking the Now entry:
  1. the checkbox fills zellige (120 ms);
  2. the saffron cell's inline size collapses from 56 to 0 while the body fades from `saffron-soft` to `surface-raised` (240 ms, ease-out, `--dur-light`);
  3. the card is now an ordinary done card. Nothing else moves; the Next label stays where it is (IA D6).
- **Reduced motion:** the cell and the tint are removed at once.
- **Never moves:** the light never travels on its own. When the clock passes 14:00 the cell is simply drawn on the next Now row (IA §6.12). No band animation, no doorway animation, no bar animation.

### Signature element: the light moves
One saffron block per screen, and it is always "when":
- **List:** on the lead trip, the band under its arch: "12 days to go · Next trip", or "Day 3 of 4 · Happening now" during Lisbon.
- **Detail before:** the full-width band under the meta.
- **Detail during:** no band. The status is saffron-ink text under the h1, and the block becomes the **Now cell** on the row that's happening.
- **Between entries or after the last one:** no saffron at all. Nothing is happening now, and the screen says so by having no light.
- **After the trip:** the band falls back to sunken (DS).

Home's TripCountdown keeps its block during the trip; tapping it lands on the trip, where the light has moved to the row it was pointing at. That's the one sentence of explanation the pattern needs.

### Key screens

```
MOBILE 390 · Trips list · populated
Trips
Coming up
╭───────────────────────────────────────────╮  lead tile spans
│      ╭────────────────────────────╮       │  the row: arch
│   ╭──╯      Example photo         ╰──╮    │  2:1 sits on the
│   ╰──────────────────────────────────╯    │  light band
│████ 12 days to go ████████ Next trip ████ │  64 px, the one
│ Chefchaouen                                │  saffron block
│ Rif mountains · Sat 21 – Wed 25 Nov        │
╰───────────────────────────────────────────╯
No dates yet
╭────────────────────╮                         2-up tiles, as
│   ╭────────────╮   │                         Goals' list
│   │     F      │   │
│   ╰────────────╯   │
│ Weekend in Fes     │
│ Fes · No dates yet │
╰────────────────────╯
Past
┌───────────────────────────────────────────┐  flat row, sunken
│ ╭E╮ Essaouira · 64 days ago                │  count as text
└───────────────────────────────────────────┘
```

```
MOBILE 390 · Detail · Chefchaouen · before the trip · Plan tab
‹ Trips                                  [Edit]
   ╭──────────────────────────────────────╮
   │            Example photo             │   doorway, Goals parity
   ╰──────────────────────────────────────╯
Chefchaouen                                     display 40
Rif mountains · Sat 21 – Wed 25 Nov
██ 12  days to go ████████ Next trip · 4 nights  the light band
The riad has no heating. Pack warm layers.
9 to prep · 1 must-do not in the plan
[Budget ▾]                  Over by 1,200 MAD
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│▓▓▓▓▓▓       mark at 87%, all danger
9,200 of 8,000 MAD
   Plan        Places        Prep
───◆─────────────────────────────────────
Sat 21 Nov  Day 1                    [+ Add]    serif chapter
☐ ┃‹bed› Riad in the medina        4,400 (S)┃
  ┃Any time · Check-in from 14:00           ┃
☐ ┃‹train› Bus to Chefchaouen        160 (Y)┃
  ┃08:00–12:15 · CTM station, Fes           ┃
Sun 22 Nov  Day 2                    [+ Add]
☐ ┃‹ticket› Akchour waterfalls     1,200 (Y)┃
Mon 23 Nov  Day 3                    [+ Add]
░ Nothing planned ░░░░░░░░░░░░ [Add] ░░░░░░
```
- **Order:** the band follows the meta and precedes the notes. That matches IA §1's priority (identity → when → … → notes 7th) in both the DOM and the paint; nothing is reordered by CSS.
- **320 × 568:** doorway 288 × 144 (76–220), h1 236–280, meta 284–302, band 314–378: the count is above the fold with room to spare.

```
MOBILE 320 · Detail · Lisbon · during the trip · 13:20 (fold at 504)
‹ Trips                         [Edit]        8–52
Lisbon weekend                                52–86
Day 3 of 4 · Happening now                    90–126  saffron-ink text
Portugal · Sat 7 – Tue 10 Nov                         (no block here)
[Budget · 400 MAD left ▾] ▓▓▓▓▓▓▓▓▓│░         130–174
  Plan      Places      Prep                  178–222
──◆─────────────────────────────
[▸ Earlier days · Sat 7 – Sun 8 Nov ·         226–270
   4 of 4 done]
Today  Mon 9 Nov · Day 3       [+ Add]        270–314  serif chapter
☑ ┃‹landmark› LX Factory          ┃          314–388
  ┃(S) Done by Sara · 12:05       ┃
☐ ┃█ Now  █┃‹fork› Lunch at Time  ┃           396–486  the light
  ┃█ 12:45█┃Out Market ╭────────────╮         FAB 432–488
  ┃█–14:00█┃Cais do So │+ Add a place│
  Next                ╰────────────╯
☐ ┃‹train› Tram 28 · 15:00–16:00  ┃
```

| At 320 × 568 | y | vs fold 504 | vs FAB 432 |
|---|---|---|---|
| Now card top | 396 | ✓ | ✓ |
| Tick (outside the card, x 26–50) | 408–432 | ✓ | ✓ clear |
| Now cell ("Now", "12:45") and first title line | 408–430 | ✓ | ✓ (the cell is at x 65–121) |
| Now card bottom (body 158 px wide: 3 lines) | 486 | ✓ 18 px spare | right end of lines 2–3 under the FAB |

The Now cell is the most visible thing on the screen at load: the answer to "what's next today?" is where the eye lands first, at zero taps.

```
DESKTOP 1440 · Detail · Chefchaouen · ≥ 80 rem
‹ Trips
      ╭────────╮      Chefchaouen                          [Edit] [+ Add to the plan]
  ╭───╯        ╰───╮  Rif mountains · Sat 21 – Wed 25 Nov
  │                │  ███ 12  days to go ████████████████ Next trip · 4 nights ███
  │ Example photo  │  The riad has no heating. Pack warm layers.
  │ 4:5, 4 cols    │  9 to prep · 1 must-do not in the plan
  ╰────────────────╯  Budget  9,200 of 8,000 MAD · Over by 1,200 MAD
                      ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│▓▓▓▓▓▓  (danger)
                      ‹bed› Stay 4,400 · ‹ticket› Activity 3,500 · ‹train› 700 · …
───────────────────────────────────────────────────────────────────────────────────
Plan                             │ Places · 4                │ Prep · 4 of 13
Sat 21 Nov  Day 1         [+ Add]│ Ideas · 3                 │ Packing ▫▫▫▫▫ 0 of 5
☐ ┃Riad in the medina    4,400  ┃│┆ Ras El Maa viewpoint    ┆│ ☐ Walking shoes
☐ ┃Bus to Chefchaouen      160  ┃│┆ old medina · ~0 MAD     ┆│ ☐ Phone chargers
  ┃08:00–12:15 · CTM, Fes       ┃│┆ [Must-do]    [Schedule] ┆│ Documents ▪▪▫ 2 of 3
Sun 22 Nov  Day 2         [+ Add]│┆ Goat cheese tasting     ┆│ ☑ ID cards or passports
☐ ┃Akchour waterfalls    1,200  ┃│┆ ~150 MAD     [Schedule] ┆│   Done by Sara · Sun 8 Nov
Mon 23 Nov  Day 3         [+ Add]│In the plan · 1            │ Bookings ▪▪▫ 2 of 3
░ Nothing planned ░░░░ [Add] ░░░ │┆ Spanish Mosque          ┆│ To-do ▫▫ 0 of 2
```
- **During the trip on wide screens:** the band is gone, "Day 3 of 4 · Happening now" sits under the h1, the doorway is the 32 × 40 arch, and the light is the Now cell in the Plan column.

### Create and edit
Goals' form (B) as built. The cover preview shows the doorway, and in Create, once dates are entered, a static light band preview under it ("12 days to go") so the couple sees what the trip will look like. With no dates, no band.

### Tokens added (no colour)
- `--light-band-h: 4rem` (64 px);
- `--now-cell: 3.5rem` (56 px);
- `--arch-thumb-w: 2rem`, `--arch-thumb-h: 2.5rem` (32 × 40, Goals' row arch);
- `--tally: 8px`, `--tally-gap: 2px`, `--tally-max: 12`;
- `--budget-mark-w: 2px`, `--budget-mark-h: 16px`;
- `--dur-light: 240ms` (= `--dur-sheet`);
- aliases: `--light: var(--saffron)`, `--on-light: var(--on-saffron)`, `--light-soft: var(--saffron-soft)`, `--budget-fill: var(--terracotta)`, `--budget-track: var(--surface-sunken)`, `--budget-mark: var(--ink)`.

### Risks
- **IA D6 wording.** D6 says the compact summary shows "the status as TripCountdown's now state". B shows the same words ("Day 3 of 4 · Happening now") as saffron-ink text and moves the block to the Now row. That needs the user's yes. If refused, B falls back to A's compact count cell and the Now cell becomes a `saffron-soft` row only, which loses the signature.
- **Loud before the trip.** A 64 px full-width saffron band is the biggest colour field in the app, and in dark it's the brightest. It's one per screen, but it competes with the doorway. Hold: no other saffron (no saffron badges, no saffron text) on a screen with a band.
- **No light between entries.** From 14:00 to 15:00 there is no Now, so the screen has no saffron. That's honest, but someone might read the absence as "nothing planned". "Next · 15:00" stays visible as text.
- **Serif day chapters** cost 12 px per day heading over A (34 vs 22). On a 5-day trip that's 60 px. Below 22.5 rem they stay at 28 px: the fold table already counts them.
- **Doorway sameness** on list tiles (L, C, F, E with uploads off): inherited from Goals B, with the same mitigation (2:1 bare ratio when no trip has a cover).
- **Tally as gamification:** it could read as a progress game. Held back by: no totals across groups, no streaks, no celebration on a full row, tiles `aria-hidden` and capped at 12.
- **Build cost:** moderate. The band variant of TripCountdown, the Now cell, the tally, the budget mark and the one transition.

---

## C · Pencil and ink

### Preview
```
C · PENCIL AND INK · Young Serif + Figtree · booked in ink, maybes in pencil
terracotta oklch(0.559 0.137 40.0) · line-strong oklch(0.621 0.025 78.1)
saffron-soft oklch(0.949 0.042 87.4) · zellige oklch(0.520 0.094 168.6)
╭───────────────── transom 3:1 ─────────────────╮
Chefchaouen                    ▐12 days to go▌
Budget ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓┆┆│      ink 8,950 · pencil ~250
21 │┃☐ Bus to Chefchaouen · 08:00     160 MAD ┃  ink: solid, 600
Sat│┃☐ Dinner on the square · 20:00   350 MAD ┃
   │┆  Goat cheese tasting · ~150 MAD [Schedule]┆ pencil: dashed, 400
LIST  ┆ Weekend in Fes · no dates yet ┆           an undated trip is pencilled
WIDE  Schedule → the dashed card is inked into Tue 24 Nov
```

### Concept
A *carnet de voyage*. What you've booked is written **in ink** on the day's page; what you might do is **pencilled** in the margin; and scheduling is **inking an idea in**. The direction is organised around certainty rather than time: the DS's "ideas look lighter than commitments" applied to every surface where a maybe meets a must, including money.

### Style family
**Editorial / magazine** (family D) with the notebook's line weights.
- **Taken:** page and margin, ink weight vs pencil weight, the serif date in the margin.
- **Left behind:** paper textures, torn edges, perforations, handwriting fonts. Pencil and ink are carried only by stroke (dashed vs solid), fill (none vs raised) and weight (400 vs 600). [anti-generic: skeuomorphic kitsch]

### Type
- **h1:** `display` 40/44 before and after; `title-lg` 28/34 during.
- **The date margin:** the day numeral "21" in Young Serif `title-lg` 28/34 over "Sat" (`label` 13/18). The h3's accessible text is "Sat 21 Nov · Day 1"; "Day 1" and Add sit at the top of the page column. Today's margin reads "9" over "Today".
- **Ink (plan entries):** title `body-strong` 15/22 · 600; exact figures "160 MAD".
- **Pencil (places):** title `body` 15/22 · **400**; estimates written "~150 MAD"; the **Must-do** badge is the one inked word on a pencil card (`ink` on `surface-sunken`, 12.81 / 16.05).
- **During the trip:** "Day 3 of 4" in a DS countdown chip (`saffron-ink` on `saffron-soft`, 5.96 / 8.77); "Now" and "Next" written in the margin (`label`, `saffron-ink` and `ink`).

### Colour
| Role | Token | Light | Dark |
|---|---|---|---|
| page (dominant) | `surface` | oklch(0.966 0.013 82.4) | oklch(0.199 0.015 261.6) |
| ink (commitments) | `surface-raised` + `ink` | oklch(0.994 0.007 88.6) / oklch(0.254 0.028 269.2) | oklch(0.243 0.019 262.1) / oklch(0.941 0.017 84.6) |
| pencil (ideas) | `line-strong` dashed, no fill | oklch(0.621 0.025 78.1) | oklch(0.560 0.029 261.1) |
| budget ink / pencil | `terracotta` solid / `terracotta` dashed | oklch(0.559 0.137 40.0) | oklch(0.736 0.120 41.9) |
| time | `saffron` (count cell before the trip) / `saffron-soft` (chip, Now row) | oklch(0.766 0.145 79.8) / oklch(0.949 0.042 87.4) | oklch(0.823 0.139 81.6) / oklch(0.309 0.047 84.5) |
| done | `zellige` | oklch(0.520 0.094 168.6) | oklch(0.764 0.111 166.7) |

- **Proportions:** about 65% sand (pencil cards are sand with a dashed line), 25% raised (ink cards, the Prep sheet), majorelle ≤ 5%. Saffron: the DS count cell before the trip; **no solid saffron during the trip** (a chip and the Now row tint only). C is the quietest of the three.
- **Dark mode:** pencil outlines are `line-strong` at 3.90:1 on night; ink cards lift by the raised surface. The pencil budget segment is terracotta dashed on the sunken track (7.81).

### Shape and space
- **Ink cards:** DS commit (raised, `line`, `shadow-card`, `radius-md`), tick inside at the start.
- **Pencil cards:** DS idea (2 px dashed `line-strong`, no fill, `radius-md`, no shadow).
- **The date margin:** 3.5 rem (56 px) from 22.5 rem. Below 22.5 rem it folds into the heading line ("21 Sat · Day 1 [+ Add]") so 320 px keeps its width for titles.
- **The ink-and-pencil budget bar:** 12 px tall, `radius-sm`, on a `surface-sunken` track spanning max(planned, budget):
  - a **solid terracotta** segment for plan costs (ink);
  - a **dashed terracotta-outlined** segment for the estimates of unscheduled places (pencil), at least 12 px wide when non-zero so the dashes show;
  - a 2 × 20 px `ink` budget mark;
  - **over budget:** both segments turn danger (solid and dashed) on `danger-soft`; never danger beside terracotta.
  - Its `aria-valuetext` names both: "9,200 MAD planned, of which about 250 MAD are ideas, of 8,000 MAD, over by 1,200 MAD".
- **Prep:** one raised sheet per group, ruled into lines (the list written on one page), DS checkboxes; ticked lines stay put with a zellige box and "Packed by Sara · Sun 8 Nov" in `zellige-ink`.
- **Grid:** the list is one column of cards (ink, pencil or flat). The detail at ≥ 80 rem: band (transom 5 | identity and status 4 | budget 3) over Plan 5 | Places 4 | Prep 3, the Places column read as the page's margin.

### Imagery and iconography
- **Cover: a transom, not a full doorway.** The same arch component at **3:1 bare** (the initial at 56 px) and **2:1 with a photo**, full content width, capped at 10 rem tall. At 390 the bare transom is 358 × 119 instead of Goals' 358 × 179. It answers Goals B's two risks head-on: a pale initial costs a third less height, and the countdown climbs ~60 px. During the trip it's hidden below 48 rem and returns in the band on wide screens.
- **List:** dated trips are ink cards with a 32 × 40 arch; **trips with no dates are pencil cards** (dashed): a trip without dates is still an idea. Past trips are flat rows.
- **Icons:** the same Lucide set as A, plus `calendar-plus` on Schedule (with its text label).

### Motion personality
- **The one orchestrated moment: inking in** (≥ 64 rem only, where Places and Plan are both on screen). After Schedule:
  1. the dialog closes;
  2. a same-document View Transition carries a snapshot of the place card from the Places column to its new slot in the day; on the way the outline goes from 2 px dashed to 1 px solid, the fill from none to raised, and `shadow-card` fades in (320 ms, ease-out, `--dur-ink`);
  3. the place card stays in Places, its Schedule turned to "In the plan · Tue 24 Nov, 17:30"; focus goes to that link after `updateCallbackDone` (IA F3).
- **Phones:** no travel (the Plan tab isn't visible); the card updates in place and the toast says where it went.
- **Reduced motion, or no View Transitions:** the new entry appears in place, no travel.
- **Never moves:** cards on partner changes (a partner's schedule appears without the transition), the transom, budget segments.

### Signature element: pencil and ink
One rule, four places:
1. **Places are pencil, plan entries are ink:** dashed and weight 400 against solid and weight 600, "~150" against "150".
2. **The budget bar is ink plus pencil:** the honest picture of ARCH D11's formula (estimates count, but as estimates), in the bar itself and not only in the breakdown.
3. **An undated trip on the list is pencilled.**
4. **Scheduling is inking in,** and on wide screens you watch it happen.

### Key screens

```
MOBILE 390 · Trips list · populated
Trips
Coming up
╭───────────────────────────────────────────╮  ink: DS TripCountdown
│▐ 12  ▌ Next trip                     ╭──╮ │  32 × 40 arch
│▐ days▌ Chefchaouen                   ╰──╯ │
│▐to go▌ Rif mountains · Sat 21 – Wed 25 Nov│
╰───────────────────────────────────────────╯
No dates yet
┆ ╭F╮ Weekend in Fes                         ┆  pencil: dashed,
┆ ╰─╯ Fes · No dates yet                     ┆  no fill, title 400
Past
┌───────────────────────────────────────────┐  flat
│ ╭E╮ Essaouira · 64 days ago                │
└───────────────────────────────────────────┘
```

```
MOBILE 390 · Detail · Chefchaouen · before the trip · Plan tab
‹ Trips                                  [Edit]
╭──────────────── Example photo, 2:1 ────────────╮   transom
╰────────────────────────────────────────────────╯   (bare: 3:1)
Chefchaouen                                     display 40
Rif mountains · Sat 21 – Wed 25 Nov
The riad has no heating. Pack warm layers.
╭▐ 12  ▌ Next trip ──────────────────────╮     DS TripCountdown
╰▐days ▌ 4 nights ───────────────────────╯
9 to prep · 1 must-do not in the plan
[Budget ▾]                  Over by 1,200 MAD
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│▓▓▓▓▓┆┆┆     ink, then pencil
9,200 of 8,000 MAD · ~250 of it ideas                (all danger: over)
   Plan        Places        Prep
───◆─────────────────────────────────────
 21  Day 1                            [+ Add]
 Sat ┃☐ ‹bed› Riad in the medina  4,400 (S)┃
     ┃   Any time · Check-in from 14:00     ┃
     ┃☐ ‹train› Bus to Chefchaouen  160 (Y)┃
     ┃   08:00–12:15 · CTM station, Fes     ┃
 22  Day 2                            [+ Add]
 Sun ┃☐ ‹ticket› Akchour waterfalls 1,200   ┃
 23  Day 3                            [+ Add]
 Mon ░ Nothing planned ░░░░░ [Add] ░░░░░░░
```
- **320 × 568:** transom 288 × 144 (photo, 2:1) or 288 × 96 bare; with the bare transom the countdown sits at y ≈ 310–390.

```
MOBILE 390 · Places tab (only the area under the tabs changes)
Ideas · 3
┆ ‹landmark› Ras El Maa viewpoint          ┆   pencil: title 400
┆ old medina · ~0 MAD           [Must-do]  ┆   the one inked word
┆ (S) Added by Sara          [⊕ Schedule]  ┆
┆ ‹fork› Goat cheese tasting               ┆
┆ Outa el Hammam · ~150 MAD                ┆
┆ (Y) Added by Youssef       [⊕ Schedule]  ┆
In the plan · 1
┆ ‹landmark› Spanish Mosque · ~0 MAD       ┆
┆ [In the plan · Tue 24 Nov, 17:30]        ┆   link → the inked entry
```

```
MOBILE 320 · Detail · Lisbon · during the trip · 13:20 (fold at 504)
‹ Trips                         [Edit]        8–52
Lisbon weekend                                52–86
(Day 3 of 4) Happening now                    90–130  saffron-soft chip
Portugal · Sat 7 – Tue 10 Nov                         (no solid block)
[Budget · 400 MAD left ▾] ▓▓▓▓▓▓▓▓┆│░         134–178  ink + pencil
  Plan      Places      Prep                  182–226
──◆─────────────────────────────
[▸ Earlier days · Sat 7 – Sun 8 Nov ·         230–274
   4 of 4 done]
9 Today · Day 3                [+ Add]        274–318  margin folded
┃☑ ‹landmark› LX Factory              ┃       318–392
┃  (S) Done by Sara · 12:05           ┃
┃☐ ‹fork› Lunch at Time Out Market    ┃       400–486  saffron-soft
┃  Now · until 14:00 · ╭────────────╮         FAB 432–488
┃  Cais do Sodré · 250 │+ Add a place│
┃☐ ‹train› Tram 28     ╰────────────╯
┃  Next · 15:00 · Martim Moniz · 30   ┃
```

| At 320 × 568 | y | vs fold 504 | vs FAB 432 |
|---|---|---|---|
| Now card top | 400 | ✓ | ✓ |
| Tick (inside the card, x 29–53, border `ink-muted`) | 412–436 | ✓ | ✓ clear (left of x 157) |
| First title line (full 204 px width: one line) | 412–434 | ✓ | ✓ |
| "Now · until 14:00" | 438–456 | ✓ | "Now" clear at x 61–90; the rest under the FAB |
| Now card bottom | 486 | ✓ 18 px spare | right end of lines 2–3 under the FAB |

```
DESKTOP 1440 · Detail · Chefchaouen · ≥ 80 rem · the moment after Schedule
‹ Trips
╭──────── Example photo, 2:1 ────────╮ Chefchaouen       [Edit] [+ Add to the plan]
╰────────────────────────────────────╯ Rif mountains ·   Budget
           (transom, 5 cols)           Sat 21 – Wed 25   9,200 of 8,000 MAD
                                       ╭▐12 days to go▌╮ Over by 1,200 MAD
                                       9 to prep · …     ▓▓▓▓▓▓▓▓▓▓▓▓│▓▓▓┆┆
──────────────────────────────────────────────────────────────────────────────────
Plan                             │ Places · 4               │ Prep · 4 of 13
 23 Day 3                 [+ Add]│ Ideas · 2                │ ╭ Packing · 0 of 5 ──╮
 Mon ┃☐ Ras El Maa viewpoint   ┃◀━│━┆ Ras El Maa viewpoint  ┆ │ │☐ Walking shoes     │
     ┃   17:00 · old medina   ┃  │ ┆ [In the plan · Mon 23 ┆ │ │☐ Phone chargers    │
     ┃   0 MAD · From Places  ┃  │ ┆  Nov, 17:00]          ┆ │ ╰────────────────────╯
 24 Day 4                 [+ Add]│ ┆ Goat cheese tasting   ┆ │ ╭ Documents · 2 of 3 ─╮
 Tue ┃☐ Cooking class   1,400  ┃  │ ┆ ~150 MAD  [Schedule]  ┆ │ │☑ ID cards or        │
     ┃☐ Hike to the Spanish    ┃  │ In the plan · 1          │ │  passports          │
     ┃   Mosque · 17:30   0 MAD┃  │ ┆ Spanish Mosque        ┆ │ │  Done by Sara ·      │
                                                                  Sun 8 Nov
  ◀━ inking in: the dashed snapshot travels and lands solid (320 ms)
```
- **The Places column is the margin:** pencil beside ink, one gutter apart, which is the core desktop planning view (IA D4).

### Create and edit
Goals' form (B) with C's cover preview: the transom with the live initial. The Dates fieldset's helper adds the ink rule in words: "Add dates to put the trip in ink. Without them it stays an idea." (Writer owns the wording.)

### Tokens added (no colour)
- `--date-margin: 3.5rem`;
- `--doorway-ratio-transom: 3 / 1`, `--doorway-ratio-transom-photo: 2 / 1`, `--transom-max: 10rem`, `--arch-initial-transom: 56px`;
- `--budget-bar-h: 12px`, `--budget-mark-w: 2px`, `--budget-mark-h: 20px`, `--budget-pencil-min: 12px`;
- `--dur-ink: 320ms`;
- aliases: `--ink-card: var(--surface-raised)`, `--pencil: 2px dashed var(--line-strong)`, `--budget-ink: var(--terracotta)`, `--budget-pencil: 2px dashed var(--terracotta)`, `--budget-over: var(--danger)`, `--budget-track: var(--surface-sunken)`, `--now-fill: var(--saffron-soft)`, `--now-check-border: var(--ink-muted)`.

### Risks
- **Dashed gets a second meaning.** The DS says "a trip Place has a dashed outline". C adds "an undated trip" to dashed, which turns the rule into "dashed = not committed". It's consistent, but it's a DS edit and needs the user's yes. If refused, drop item 3: undated trips become ink cards and the rest of C stands.
- **No solid saffron during the trip.** The summary shows a `saffron-soft` chip, not TripCountdown's now block (IA D6 wording), as in B but without B's payoff on the Now row. The Now row is a tint: the quietest "what's next" of the three.
- **The pencil segment is small.** 250 of 9,200 is 2.7% (8 px at 288); the 12 px minimum distorts the scale slightly. The breakdown carries the exact figure.
- **Ink-in is the costliest motion:** a cross-column View Transition (unique names per place and entry, both nodes present, progressive enhancement), wide screens only. Phones, where most scheduling during the trip happens, never see it.
- **Weight 400 on place titles** lowers their scan weight; the Must-do badge compensates. Places must not drift into looking disabled: titles stay `ink` (14.35), never muted.
- **Less doorway.** The transom is the same component, but it is a smaller image moment than Goals' doorway, which the user chose for its imagery.
- **Build cost:** the highest. The segmented bar, the date margin with its fold, the transom ratio, the pencil list card and the View Transition.

---

## Tells audit

Each direction run through anti-generic.md's self-review: *Cover the logo. Could this belong to ten other products?*
- **A:** partly. Itinerary apps (a timeline of timed cards) look like this; the doorway, the serif, the sand and the time column with Now/Next in it are what make it Zamane.
- **B:** no. A saffron light that moves from the countdown to the row that's happening, with a doorway above and zellige tiles laid as you pack, belongs to this system only.
- **C:** mostly no. Dashed vs solid is the DS's own rule; the ink-and-pencil budget bar and the inking-in transition are specific to a couple planning a trip together. A careful planner app could use dashed placeholders, though.

| Tell (kit list, plus Zamane's own) | A | B | C | Verdict |
|---|---|---|---|---|
| Overused font as the brand voice | – | – | – | Young Serif + Figtree (system) |
| Purple/blue gradient, glow, aurora | – | – | – | none; B's light is a flat field with text, no glow |
| Cream background with a terracotta accent | **present** | **present** | **present** | **Required by the brief:** the DS's sand, and terracotta as the trip budget bar. Terracotta is never the action colour (majorelle is) and never text on sand. |
| Glassmorphism | – | – | – | solid surfaces, solid tab bar |
| Identical rounded cards, shadow on everything | **present** | reduced | reduced | **A, mitigated:** shadow only on commitments; places, Prep and headings are flat; radius by role. The shadow *encodes* "booked". B and C keep Prep and places shadowless. |
| Side-tab accent border | – | – | – | none. A's column and B's Now cell are content (times, the word "Now"), not a coloured stripe. |
| Icon in a rounded square, repeated | – | – | – | type icons sit bare at 20 px |
| Emoji or generic glyphs as icons | – | – | – | Lucide; B's tally tiles are plain squares that count items |
| Stock imagery, 3D shapes | – | – | – | the couple's covers; "Example photo" placeholders |
| Centred hero with an eyebrow | – | – | – | none; the h1 leads at start |
| Alternating identical blocks | – | – | – | day groups vary with their content and empty days |
| All-caps kickers on every section | – | – | – | sentence case `label` 13 |
| Middle-dot meta strings | **present** | **present** | **present** | **Required by the system's voice** ("in 12 days · Day 2 of 5"); they separate facts, not slogans. |
| Trailing arrows on links | – | – | – | "‹ Trips" is an up-link; "In the plan · Tue 24 Nov" has no arrow |
| 01 / 02 / 03 on non-sequences | – | – | – | "Day 1, Day 2" is a real sequence |
| Borders and badges that encode nothing | – | – | – | dashed = idea, solid + shadow = booked, B's tiles = items ticked, C's segments = ink vs pencil, the mark = the budget |
| Bento grid | – | – | – | three columns are three lists, not bento |
| *Zamane: Moroccan kitsch (star patterns, lanterns, mosaic textures, faux-Arabic type)* | – | **risk** | – | **B, held:** the tally tiles are plain 8 px squares in zellige colour, no pattern, no gaps drawn as grout |
| *Zamane: gamification (streaks, scores, confetti)* | – | **risk** | – | **B, held:** see B's risks (no totals across groups, no celebration, capped) |
| *Zamane: parallax or collapsing photo header* | – | – | – | the doorway never moves on scroll; it shrinks by status, not by scroll |
| *Zamane: paper skeuomorphism (torn edges, textures, script fonts)* | – | – | **risk** | **C, avoided:** pencil and ink are stroke, fill and weight only |
| Skeleton shimmer | – | – | – | static (Home) |

**Count:** A has 3 present (all required or mitigated); B has 2 present plus 2 held risks; C has 2 present plus 1 avoided risk. None was replaced: every remaining tell is required by the system or carries data.

---

## Recommendation

**B · Saffron light.** It's the only direction whose signature is built around the job the IA calls "the most important new design in this area" (IA D1): the trip that's happening now.
1. **"What's next today?" at zero taps** (brief, during-trip job; IA D6). At 320 × 568 the Now cell is a solid saffron block holding "Now · 12:45" at y 408, left of the floating primary, and it's the only saffron on the screen, so it's where the eye lands. A answers with a word in a column; C with a tint.
2. **"Tick it off" one-handed** (brief). B's tick sits outside the card on the sand: a clean 44 px target at the start of the row [Fitts], `line-strong` at 3.90 in dark, so it needs none of the `saffron-soft` border fix A and C need.
3. **Both DS saffron rules become one learnable rule.** "The countdown is the only saffron block" and "saffron-soft happening-now rows" turn into "the light is on whatever is nearest in time": the lead trip on the list, the countdown before, the Now row during, nothing after. That also explains Home's block during the trip: you tap it and the light has moved to the row it pointed at.
4. **It sits squarely in Goals' family.** Goals' doorway, untouched, leads the page and the list tiles; the Prep tally lays zellige tiles as you pack, which is Goals' "a finished door is a tiled one" at row scale. The user chose Doorway for its imagery; B keeps all of it.
5. **"When do we leave, and what's left?"** (brief, before-trip job) is answered by the band at y ≈ 314 at 320 × 568, the highest countdown of the three for a trip with a cover (C's bare transom is level with it), with "What's left" under it.

**What to hold B to:**
- **The user's yes on IA D6's wording:** during the trip the summary shows the status as saffron-ink text, and the block lives on the Now row. Without it, B degrades to A.
- **One saffron block per screen, audited per state:** list, upcoming, tomorrow, now, now-last-day, no-Now gap, nothing-left, past. No saffron badges or saffron text on a screen that has a band.
- **The fold:** the Now row's bottom at ≤ 504 and its tick, cell and first title line at ≤ 432, screenshotted at 320 × 568 in both themes, including `now-last-day` and 200% text (where the hold is waived but nothing may overlap).
- **The light-leaves transition** is the only orchestrated motion in Trips; the minute recompute stays instant.
- **The tally:** `aria-hidden`, capped at 12, no cross-group total.

**Grafts:**
- **C's ink-and-pencil budget bar grafts onto B cleanly** and I'd take it: it's self-contained, it uses B's own budget mark, and it shows ARCH D11's formula honestly in the bar (IA D10 already draws the ideas line dashed). It brings no motion.
- **Don't graft C's inking-in onto B:** B spends its one orchestrated moment on the Now tick.
- **Don't graft A's time column onto B:** B's times are on the row's second line and the Now cell carries the time; two time systems would compete.

**Fallbacks:**
- **A · Itinerary** if the user wants the DS components literally (TripCountdown's block stays in the summary during the trip) and the lowest build cost.
- **C · Pencil and ink** if desktop planning, not the trip itself, is where the couple will live, and the user accepts "dashed = not committed" as a DS rule.

---

## Assumptions
- **Fold geometry:** Figtree 600 at 15 px averages about 7.6–8 px per character, Young Serif at 28 px about 15.5 px. "Lisbon weekend" fits 288 px on one line at 28 px; it may not fit beside a count cell, which is why every direction keeps the h1 full width at 320. All y values are arithmetic from the tokens and ia.md §6.2 targets; the builder confirms them with `shoot.mjs`.
- **The floating primary** keeps Home's geometry (56 px, 16 px gaps, label "Add a place" ≈ 147 px wide at 320).
- **"Earlier days"** wraps to two lines inside its 44 px button at 320.
- **The compact budget row** (phones, during the trip only) shows "400 MAD left" or "Over by …" and moves "5,600 of 6,000 MAD" into the breakdown. This is a visual compaction of IA D10, not a content change.
- **Dates** were checked against the 2026 calendar: Sat 7, Mon 9, Tue 10, Sat 21, Wed 25 Nov; Wed 2 and Sun 6 Sep (64 days before Mon 9 Nov).

## For other roles
- **Director / builders (any direction):**
  - the four shared fold rules and the `--now-check-border: var(--ink-muted)` fix on every `saffron-soft` row;
  - an over-budget bar is all danger on `danger-soft`: never danger beside terracotta;
  - IA §5.3 still draws Directions buttons: remove them per U5;
  - IA §5 key uses ‹bus› for transport; the DS icon is `train-front`.
- **Director (B):** IA D6's "TripCountdown's now state" wording needs the user's decision with the direction pick; Home's `trip-now` keeps its block (U3), which B explains rather than changes.
- **Writer:**
  - B: "Day 3 of 4 · Happening now" as one status string; the band's "12 days to go · Next trip · 4 nights"; the progressbar `aria-valuetext` with the budget mark;
  - C: the Dates helper about ink, and the bar's two-part `aria-valuetext`;
  - all: the compact budget toggle's label ("Budget · 400 MAD left").
- **Front-end:**
  - B: the Now cell is part of the row button's content, so "Now" is in the row's name (IA §6.11); the cell's collapse uses `inline-size`, not `transform`, so the row doesn't overlap its neighbours mid-animation;
  - C: View Transition names must be unique per place and per entry, focus after `updateCallbackDone`, and the transition is skipped for a partner's schedule.
- **Design system (via build notes):** the winning direction adds one TripCountdown variant (A: compact strip; B: band; C: none) and its tokens above. No colour values are new.
