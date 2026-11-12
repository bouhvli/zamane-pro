# Directions: Zamane Shopping (the shared list)

**By:** Art Director · **For:** the Director (choice dialog), Design Systems, front-end engineers · Thu 12 Nov 2026
**Read:** `brief.md` (with the Director's decisions), `ia.md` (S1-S14, wireframes), `Zamane Design System.html` (ShoppingItem: `.zm-item`, `.zm-check`), `src/client/styles/tokens.css`, `.ux-forge/goals/decision.md`, `.ux-forge/trips/decision.md`, `.ux-forge/trips/zamane.css` (`.tick`, `.tally`, `.commit` / `.idea`).
**Not read:** the kit (`anti-generic.md`, `styles.md`, `fonts.md`, `tokens.md`) is outside the folders this session may read. The anti-generic audit below is written from the usual list of tells (see "Tells audit"), not from the kit file; re-check it against the file if the Director can. `contrast.mjs` **was** run (it is a script, not a read). Every ratio below comes from it.

All three directions stay inside the system: **Young Serif** (display, group heads and the h1 only), **Figtree** (everything else), sand surfaces, majorelle as the only filled action, zellige for done and nothing else, saffron absent from this screen, terracotta only as partner B's avatar, the arch absent (no imagery here). Google Fonts link, identical for all three (Goals and Trips already load it):

```
https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&family=Young+Serif&display=swap
```

## 0. The subject's world (collected before choosing)

1. **The pad on the fridge door.** A ruled notepad, a pencil on a string. Lines crossed out as you go; the list is in the order it was thought of (S3: oldest first, which is exactly how a pad is written).
2. **The souk stall.** Awnings, hand-lettered price boards, a cone of mint, one stall per kind of thing. You walk stall to stall, which is the "aisle" the brief means.
3. **The till slip.** A narrow printed strip, items in a left column, prices flush right with dotted leaders, a total at the foot over a double rule. This is the world of "numbers are earned": the slip is itself a breakdown.
4. **The basket.** Weight on one arm, the other hand free. One thumb. This is the shop context, and the reason nothing may move.
5. **The shared notebook in a riad kitchen.** Two people, two handwritings. This is attribution (who added, who bought) as a native thing, not as a badge.

## Shared rules (all three; these are the system, not the direction)

- **Row anatomy** (from ShoppingItem, extended by `ia.md`): `[tick 44x44] [name x qty / meta line] [price]`. Rows are at least **56 px** high. The tick is the Trips `.tick`: 24 px visual, 2 px `--line-strong` border, `--radius-sm`, a `::before { inset:-12px }` hit area (so 44 x 44), zellige fill with a check when on. The row body is one button (opens the item sheet). A 12 px dead zone separates adjacent tick targets.
- **Ticked in place:** colour and text change only. The row's height, position and content width never change on tick. The meta line is **always reserved** (one line, empty when there is nothing to say) so the "Bought by Sara · just now" text appears without a reflow. This is how "rows never move under the thumb" is held in CSS: no `display` switch, no height change, no reorder until Tidy up, route entry or foreground (S3, S4).
- **Not struck through by default** (S10: contrast stays 4.5:1). Bought text is `--ink-muted` (5.77:1 on sand, 8.07:1 dark). Direction C adds a pencil stroke *over* text that stays readable; see C.
- **Queued rows:** `cloud-off` icon (Lucide 1.75, 16 px) plus the words "Waiting to sync" in the meta line, in `--ink-muted`. Never colour alone. No saffron.
- **Attribution:** PartnerAvatar `sm` (20 px) at the start of the meta line, then "Sara" and when. Hidden in `solo`.
- **Group subtotal** is on the group head, right-aligned, `font-variant-numeric: tabular-nums`, Figtree 600. A group with no prices shows no amount. "· 1 no price" follows the count (S8).
- **Docked add field** (S1): `[ field ] [ + Add ] [ ... ]` above the bottom nav. The field is 44 px, 1 px `--line-strong` border (3.57:1 on raised, 3.51:1 dark), radius `--radius-md`. **Add** is the only filled majorelle button on the screen (white on majorelle 8.39:1; dark `#0e1a2b` on `#8fb4ea` 8.23:1). **More** is a 44 px ghost icon button. The bar clears the safe area and rides the keyboard. The toast sits above it.
- **Summary** (S8): "**7 left to buy**" in Figtree 600, then the amount as a disclosure button, then "2 items have no price." The breakdown is per group; "Bought so far" is quiet.
- **Reduced motion:** every transition below becomes an instant change. No state is conveyed by motion alone.
- **Forced colors:** tick border becomes `CanvasText`, checked becomes `Highlight` (the Trips `.tick` rule); decorative flourishes are hidden.
- **The 320 x 568 hold (S12):** h1 band at most 120 px, bar 56, nav 56, so 336 px are left for the summary and rows. Each direction below is measured against it.

---

## Direction A · Grounded · "Aisle ledger"

**Concept.** A household list printed like the till slip you will eventually get: category heads in Young Serif, prices flush right behind dotted leaders, rows flat on the sand with hairlines, and nothing on the screen that is not a word, a number or a tick.

**Style family.** Editorial / print ledger, quiet. **Take:** typographic hierarchy, hairline rules, tabular numerals, generous measure. **Leave:** cards, shadows on rows, any decorative illustration.

### Type
- Display: **Young Serif**, h1 "Shopping" 32/38 (phone 28/34); group heads 20/26, weight 400 (the face has one).
- Text: **Figtree** 400/500/600/700. Row name 16/22 at 600 (ShoppingItem uses 15/22 at 600; 16 is kinder to a hand-held phone in a shop and still the same family), meta 13/18 at 400, summary count 18/24 at 600, amounts 15/22 at 600, tabular.
- Scale: 1.25 (13, 16, 20, 25, 32). Blend check: Young Serif's low contrast, wide humanist shapes against Figtree's geometric sans is the pairing already in use on Goals and Trips; the serif only appears at 20 px and up, where its quirks read as character.

### Colour (all existing tokens; hex values from `tokens.css`)
| Role | Token | Light | Dark | Share |
|---|---|---|---|---|
| bg | `--surface` | `#f8f3ea` | `#12161d` | 62% |
| row / dock / sheets | `--surface-raised` | `#fffdf8` | `#1b2029` | 20% (the dock, sheets) |
| done group | `--surface-sunken` | `#efe6d6` | `#0d1015` | 8% |
| text | `--ink` | `#1d2230` | `#f1ebdf` | |
| muted | `--ink-muted` | `#5a5f6d` | `#a8adb9` | |
| action | `--majorelle` | `#1d4e89` | `#8fb4ea` | 1 button + links |
| done | `--zellige` / `--zellige-ink` | `#1e7a5f` / `#145a45` | `#63c9a3` / `#94dcc0` | ticks + the done head only |

Contrast (run with `contrast.mjs`):
- ink on surface **14.35:1** light, **15.27:1** dark. Ink on raised **15.61** / **13.76**.
- muted on surface **5.77** / **8.07**. Muted on sunken (done meta) **5.15** / **8.48**.
- on-majorelle on majorelle **8.39** / **8.23**. Majorelle on surface (links, focus ring) **7.59** / **8.53**.
- tick border `--line-strong` on surface **3.28** / **3.90** and on raised **3.57** / **3.51** (UI 3:1: pass).
- zellige tick fill on surface **4.74** / **8.99**; check (on-zellige) on zellige **5.24** / **8.12**.
- zellige-ink on sunken (done head text) **6.58** / **12.03**.
- hairline `--line` on surface 1.28 / 1.41: **decorative only**, never the sole boundary of a control (the tick and field carry their own 3:1 borders).
- **Dark mode:** same structure; the dock is `--surface-raised` with a 1 px `--line` top edge (no shadow); the done group is the one darker band.

### Shape and space
- Radius: tick 6, field 12, dock 0 (a flush bar, top hairline), sheets 20. No card radius, because there are no cards.
- Borders: hairline `--line` between rows only; none around groups.
- Density: comfortable. Row 56 min; group head 44 with 24 px above it (the space is the divider). Single column, 36 rem measure. Wide: list column + sticky rail as S11.
- Grid: 16 px gutters on phone; the price column is a fixed right-aligned track, so every price in the list lines up.

### Elements
- **Group head.** `h2` Young Serif 20 at the left, then a **dotted leader** (`border-bottom: 2px dotted var(--line-strong)`, flexible, `aria-hidden`), then the subtotal "175 MAD". Below the name, "2 items · 1 no price" in muted 13. A group with no prices: no leader, no amount.
- **Row.** Flat on the sand, no container. Price flush right under the subtotal's right edge. Meta line carries notes then the avatar and "Sara".
- **Tick.** Trips `.tick` as is. On: zellige fill, check draws.
- **Docked add field.** Raised bar, top hairline, the field has a label inside as placeholder "Add an item" (and a real label for AT). Enter adds, clears, keeps focus.
- **Summary.** Top of page: "7 left to buy" (600), then "243 MAD" as a text-button with a chevron; "2 items have no price." below in muted. The breakdown, when open, is the **till slip**: the same dotted-leader rows (group name ... subtotal) and a double rule above "Bought so far".
- **Done group.** Sunken band, head "Bought · 3" (zellige-ink, the only zellige text on the page) with its disclosure chevron, quiet "57 MAD", then **Clear bought** as a ghost danger-text button (danger-ink `#8f1d14` on sunken is above 7:1). Rows muted, meta "Dairy · Bought by Sara · 10:42".
- **Queued rows.** `cloud-off` + "Waiting to sync" in the meta line. Nothing else changes.
- **Tidy up (N).** Ghost button at the right of the summary line.

### Imagery and icons
None, by brief. Lucide 1.75: basket (nav), check, plus, sliders for More, cloud-off, refresh, trash, pencil, x, chevron. No category icons.

### Motion
- **Tick:** the check draws over 140 ms, border and fill cross-fade 140 ms (`--ease-out`).
- **Row settle:** text colour from ink to muted over 160 ms; the meta line fades its text in (opacity only, its height was already reserved).
- **Tidy up:** the only row movement. The leaving rows collapse and the done group grows over 220 ms; initiated by the person's own tap, so no thumb is under a moving row.
- **New (live or mine):** a 2 s `--majorelle-soft` wash that fades; no movement. The partner's insert is held while a finger is down (S5).
- **Never moves:** rows on tick, the dock, the summary.

### Signature element
**The dotted leader.** Every group head and every line of the breakdown is a name, a dotted run, and a flush-right number, exactly as on a till slip. It is the only decoration on the screen, and it is also the information design: the eye follows the dots from "Pantry" to "175 MAD" in a glance, which is the brief's success action 3.

### Key screen sketch (phone 390)
```
 Shopping
 7 left to buy   243 MAD v
 2 items have no price.        [Tidy up (2)]
 Dairy ..................... 28 MAD
 1 item
 [ ] Butter                 28 MAD
     (S) Sara
 Fruit & Veg ............... 18 MAD
 3 items · 1 no price
 [x] Tomatoes x6            18 MAD   <- ticked in place, muted
     (S) Bought by you · just now
 [ ] Mint
     fresh, big bunch · (Y) Youssef
 ...
 v Bought · 3 · 57 MAD   [Clear bought]
 [ Add an item ........ ] [+ Add] [...]
 [ Home  Goals  Trips  Shopping  Me ]
```

### Risks
- **a11y:** dotted leaders are `aria-hidden`; the amount sits in the DOM next to the name, so reading order is "Dairy, 1 item, 28 MAD". Low risk.
- **Performance:** none (CSS only).
- **Brand fit:** the lowest risk. It risks reading as "just a list", so the dots must be the right weight (2 px, `--line-strong`) not a pale hairline.
- **Build cost:** lowest. Almost all of it is the ShoppingItem CSS plus the leader.

---

## Direction B · Bold · "Stall awnings"

**Concept.** Every category is a stall in the souk: a raised crate of rows under a scalloped awning, so scanning "by aisle" in the shop means walking from stall to stall, and the done group is the crate you've already filled and covered.

**Style family.** Craft / tactile-flat, with a single graphic motif. **Take:** raised surfaces, a repeated edge motif, soft tile colour. **Leave:** skeuomorphic texture, illustration, stripes in saffron.

### Type
- Display: **Young Serif** for the h1 and for group heads at **22/28**, set on the awning, so the serif is bigger here than in A and does more work.
- Text: **Figtree** as A (row 16/22 600, meta 13/18). Group counts and subtotal 14/20 600 tabular.
- Scale 1.25 as A. Blend check as A; the larger serif makes the head the loudest thing, which is the point, since the head is what you scan.

### Colour (no new colours)
| Role | Token | Light | Dark | Share |
|---|---|---|---|---|
| bg | `--surface` | `#f8f3ea` | `#12161d` | 45% |
| stall (crate) | `--surface-raised` | `#fffdf8` | `#1b2029` | 35% |
| awning | `--majorelle-soft` | `#dfe8f5` | `#1b2b44` | 8% |
| awning text | `--majorelle-ink` | `#163d6b` | `#b9d0f3` | |
| done crate | `--surface-sunken` | `#efe6d6` | `#0d1015` | 7% |
| action / done | `--majorelle` / `--zellige` | as A | as A | |

Contrast:
- majorelle-ink on majorelle-soft (group head text on the awning) **8.88:1** light, **9.07:1** dark.
- ink on majorelle-soft **12.84** / **11.99**; muted on majorelle-soft (count and "1 no price") **5.16** / **6.33**.
- ink on raised **15.61** / **13.76**; muted on raised **6.27** / **7.27**.
- tick border on raised **3.57** / **3.51** (UI pass); zellige-ink on zellige-soft (done tile label) **6.76** / **8.62**.
- on-majorelle on majorelle **8.39** / **8.23** (Add).
- The awning's scallop edge is decorative; the awning's boundary is not relied on.
- **Dark mode:** crates `#1b2029` on `#12161d` (a step lighter than the page, shadow `--shadow-card` is 1 px only); the awning is the dark majorelle-soft `#1b2b44`, which keeps its identity without a bright block at night in the shop.

### Shape and space
- Radius: crate `--radius-lg` (20) at the bottom corners, **scalloped top edge** (below); tick 6; field 12; sheets 20.
- Borders: none on crates (shadow-card only); hairlines between rows inside a crate, inset 16 px.
- Density: roomier. 12 px gap between stalls; row 56; awning 48. Phone costs about 28 px more per group than A. Hold check at 320 x 568: summary 60 + awning 48 + three rows 168 = 276 of the 336 available. Passes, with three rows visible.
- Wide: still one column of stalls (S11, no masonry), rail on the right as the "slip" (see summary).

### Elements
- **Group head = the awning.** A full-width band, `--majorelle-soft`, 48 px high, holding the name (Young Serif 22, majorelle-ink), "3 items" and the subtotal flush right. Its bottom edge is a **scallop**: a row of 16 px half-circles, drawn in CSS with a `radial-gradient` mask, hanging over the first row. It is one 8 px strip, no image file.
- **Row.** Inside the crate, no per-row container. The row's meta line reads like a label on the goods.
- **Tick.** `.tick` as is, plus a 140 ms **tile fill**: the zellige square grows from the centre (scale .6 to 1) with the check.
- **Docked add field.** A raised bar that looks like the counter: `--surface-raised`, `--shadow-pop` upward, a 1 px `--line` top edge. Same controls.
- **Summary = a price tag.** "7 left to buy" sits in a `--surface-raised` tag with a 6 px-radius notch cut at the left and a small circle hole (CSS) so it reads as a tag on a string; the amount is the disclosure in the tag; the honesty line sits under it. Opened, the breakdown is the tag unfolding into per-stall rows.
- **Done group = the covered crate.** `--surface-sunken`, its awning is `--zellige-soft` with `--zellige-ink` text (the only place the zellige-soft token is used as a surface), a 4 px zellige bottom edge (the Goals "done is tiled" idea in a line). Rows muted, "Dairy · Bought by Sara · 10:42". **Clear bought** a ghost danger-text button in its head.
- **Queued rows.** `cloud-off` and "Waiting to sync"; the row's price is muted.
- **Tidy up (N).** A small ghost button in the tag.

### Imagery and icons
None; the awning scallop is the only graphic. Lucide as A.

### Motion
- **Tick:** the tile fill (140 ms), the stall's count on the awning ticks down with a 100 ms opacity swap (no movement of the head).
- **Row settle:** muted over 160 ms. Height unchanged.
- **Tidy up:** the leaving rows fade (120 ms) and the crate closes up and the done crate opens (240 ms, `--ease-out`); the one orchestrated moment on the screen, always at the person's request.
- **New:** a 2 s majorelle-soft wash on the row.
- **Never moves:** awnings, rows on tick, the dock. Sticky awnings are **not** used (a sticky head would overlap rows under the thumb).

### Signature element
**The scalloped awning.** Every group head is a scalloped canopy over its rows, in the same sky-blue family as the rest of the app; ticking the last item in a stall does nothing special (U4: no celebration). It makes the category the thing you navigate by, which is the aisle-scan the brief names.

### Key screen sketch (phone 390)
```
 Shopping
 [ 7 left to buy o  243 MAD v ]   <- price tag
 2 items have no price.
 .----------------------------------.
 |  Dairy          1 item   28 MAD  |  <- awning (majorelle-soft)
 |)()()()()()()()()()()()()()()()()(|  <- scallop edge
 | [ ] Butter                28 MAD |
 |     (S) Sara                     |
 '----------------------------------'
 .----------------------------------.
 |  Fruit & Veg  3 · 1 no price     |
 |)()()()()()()()()()()()()()()()()(|
 | [x] Tomatoes x6    18 MAD        |
 | [ ] Mint                         |
 '----------------------------------'
 [ Add an item ........ ] [+ Add] [...]
 [ Home  Goals  Trips  Shopping  Me ]
```

### Risks
- **a11y:** the awning must keep 4.5:1 text; passes (8.88:1). The scallop is a mask on a pseudo-element, hidden in forced colors. Medium-low.
- **Performance:** CSS masks only; the scallop is repeated per group (a dozen at most).
- **Brand fit:** sits with Goals' bold doorway and Trips' saffron band; the risk is "too much blue" on a list with many groups. Mitigation: only the head is tinted.
- **Build cost:** medium. The scallop mask, the tag, the covered crate. About a day over A.
- **Honest cost:** more vertical space per group; a 12-group list is longer than in A.

---

## Direction C · Unexpected · "Pencil on the pad"

**Concept.** The list is the pad on the fridge: ruled paper, a margin where the category lives, and each thing bought is crossed out with one pencil stroke by the person who bought it, so who did what is not a badge but a hand.

**Style family.** Stationery / notebook, restrained. **Take:** ruled lines, a margin column, a drawn stroke, a double rule under the sum. **Leave:** handwriting fonts, paper textures, torn edges, any skeuomorphic shadow.

### Type
- Display: **Young Serif** for the h1 only (32/38) and the summary's sum at 24/30. Group heads are **Figtree 700, small caps feel via `letter-spacing: .06em; text-transform: uppercase`, 12/16**, set in the margin, so the serif is rarer and louder.
- Text: **Figtree**, row 16/24 (the line height equals the rule spacing, 28 px rows are not used; rows stay 56 px = two rules), meta 13/18.
- Scale 1.333 (12, 16, 24, 32). Blend check: a uppercase sans label with a serif number is the classic ledger pairing; Young Serif is used for numerals in the sum, where its weight reads as "written in ink".

### Colour (no new colours)
| Role | Token | Light | Dark | Share |
|---|---|---|---|---|
| bg (paper) | `--surface-raised` | `#fffdf8` | `#1b2029` | 55% (the pad) |
| page behind | `--surface` | `#f8f3ea` | `#12161d` | 25% |
| rules | `--majorelle-soft` | `#dfe8f5` | `#1b2b44` | hairlines |
| ink / pencil | `--ink` | `#1d2230` | `#f1ebdf` | |
| muted | `--ink-muted` | `#5a5f6d` | `#a8adb9` | |
| action / done | `--majorelle` / `--zellige` | as A | as A | |

The ruled lines use `--majorelle-soft` (the blue of notebook rules, in the brand's blue). Contrast:
- ink on raised **15.61:1** / **13.76**; muted on raised **6.27** / **7.27**.
- **The pencil stroke** is a 2 px `--ink` line over bought text; bought text is `--ink-muted` on raised at **6.27 / 7.27:1**, with the stroke at 2 px and 60% opacity it stays readable (the line sits at the x-height, so it crosses the word and does not hide it). Stroke against raised is 15.6:1 at full opacity, 60% blends to about 8:1: UI pass.
- tick border on raised **3.57** / **3.51**.
- on-majorelle on majorelle **8.39** / **8.23**.
- The rules themselves (majorelle-soft on raised, about 1.2:1) are decorative; no information depends on them.
- **Dark mode:** the pad is `#1b2029` (raised) on `#12161d`, the rules `#1b2b44`. Ink `#f1ebdf` pencil reads as chalk. Same structure.

### Shape and space
- Radius: the pad has `--radius-md` (12) corners at phone width, sharp on wide; tick 6; field 12.
- Borders: the **margin rule** is a 1 px `--line-strong` vertical line at 72 px from the left on wide (and the tick sits in the margin). Phone: no margin rule (width), the tick sits at the left as in A.
- Density: standard. Rows are **two rules tall** (56 px) so lines and rows align.
- **Layout change (the kind of difference C makes):** from 36 rem the group name moves **into a left margin column** (96 px, sticky within its group so the label stays beside the group as you scroll; not a sticky bar over rows) and the rows sit to its right. On phone, the head sits above the rows as an uppercase label with its subtotal. Different reading order from A and B: category on the left, items on the right, like a ledger.

### Elements
- **Group head.** Uppercase label (12/16, 700, `--ink-muted` 6.27:1) with "3 items" and the subtotal beneath it in Figtree 600 15/22. On phone the label and subtotal sit on one line.
- **Row.** Sits on a rule. Name, ×qty, the price flush right.
- **Tick.** `.tick` as is, drawn by a 140 ms pencil check (a stroke-dashoffset check).
- **The stroke.** When the row is ticked, a pencil line is drawn across the name from left to right over 180 ms (`transform: scaleX(0 to 1)`, `transform-origin: left`) on a pseudo-element, 2 px, ink, 60% opacity, wavering by 1 px via a skewed gradient (no image). It is *added* to the colour change, never in place of it, and the meta line still says "Bought by Sara · just now". Under forced colors, the stroke is `text-decoration: line-through` instead.
- **Docked add field.** The pad's bottom line: a raised bar with a top 1 px `--line` rule, a pencil-icon (Lucide `pencil`) as the field's leading icon, same controls and widths as A.
- **Summary.** "7 left to buy" with the sum in Young Serif 24 and, below it, a **double rule** (two 1 px lines, 3 px apart, `--ink`) as under an accountant's total; the disclosure opens a ruled sum with the groups. Honesty line below.
- **Done group.** The pad's lower half, on `--surface-sunken`, with "Bought · 3" and Clear bought; its rows keep the stroke, now static (no re-animation at rebuild).
- **Queued rows.** `cloud-off` + "Waiting to sync"; the stroke for a ticked queued row is **dashed** until synced, then solid (the pencil to the pen). A text-bearing cue exists; the dash is a bonus.
- **Tidy up (N).** Ghost button in the summary.

### Imagery and icons
None. Lucide as A, plus `pencil` for the field and the Edit action.

### Motion
- **Tick:** the pencil check, then the stroke over the name (180 ms, `--ease-out`). Under reduced motion both appear at once.
- **Row settle:** the name goes muted over 160 ms; height unchanged.
- **Tidy up:** the leaving rows fade (120 ms), then the pad closes up over 220 ms.
- **New:** the row's rule flashes `--majorelle` for 2 s as a "just written" underline; no movement.
- **Never moves:** the margin labels (sticky inside their own group only), the dock, rows on tick.

### Signature element
**The pencil stroke across a ticked name**, drawn once, in graphite, by the tick, beside a margin that holds the category. It is the one gesture on the screen, it makes "bought" visible at arm's length in a shop aisle without colour, and it is the most distinctive thing in the three directions.

### Key screen sketch (phone 390 and wide)
```
 PHONE                                   WIDE (margin layout)
 Shopping                                Shopping   [ Add an item ] [+] [..]
 7 left to buy      243 MAD v            7 left to buy   243 MAD
 ==========================              ==============================
 DAIRY                  28 MAD           DAIRY  | [ ] Butter       28 MAD
 ---------------------------             1 item |-------------------------
 [ ] Butter             28 MAD           28 MAD | [ ] Eggs (waiting)
 FRUIT & VEG   18 MAD · 1 no price       -------+-------------------------
 ---------------------------             FRUIT  | [x] T~~~~~~~~ x6   18 MAD
 [x] T~~~~~~~~~x6        18 MAD          & VEG  | [ ] Mint
 [ ] Mint                                3 · 18 |
 [ Add an item ... ] [+ Add] [...]
```

### Risks
- **a11y:** the stroke is decorative on top of real text and a text label; the stroke must not drop contrast (kept 60% so the word reads). Sticky margin labels need `position: sticky` limited to the group and never overlap rows (they live in a column). Medium.
- **Performance:** pseudo-element animation on `transform` only. Low.
- **Brand fit:** the furthest from the Zamane app so far: a notebook metaphor in a system that has a doorway and a saffron light. It is still in the system's colours and faces. Risk of "cute".
- **Build cost:** highest. The margin layout (a grid with sticky per group), the stroke, the double rule, the dashed variant. About two days over A.
- **Wide layout:** the margin column lowers the list's measure; it needs the rail to be below 64 rem hidden. Reversible: fall back to the phone head layout at all widths.

---

## Token additions (all three; none are brand colours)

| Name | Value | Used by | Why |
|---|---|---|---|
| `--row-min` | `56px` | A, B, C | Row min-height; S12 hold 3 |
| `--tick-hit` | `44px` | A, B, C | The 44 px target (the Trips `.tick` already hard-codes it) |
| `--dock-h` | `56px` | A, B, C | Bottom padding of the page = dock + nav (S12) |
| `--leader` | `2px dotted var(--line-strong)` | A | The dotted leader, shared with the breakdown |
| `--scallop-r` | `8px` | B | Awning scallop radius |
| `--rule` | `1px solid var(--majorelle-soft)` | C | Notebook rule (reuses an existing colour) |
| `--ease-out` | `cubic-bezier(.2,.7,.2,1)` | A, B, C | If not already defined by Goals/Trips (check `zamane.css`) |

No new colour tokens. No new fonts. Existing tokens used: `--surface`, `--surface-raised`, `--surface-sunken`, `--line`, `--line-strong`, `--ink`, `--ink-muted`, `--majorelle`, `--majorelle-soft`, `--majorelle-ink`, `--zellige`, `--zellige-soft`, `--zellige-ink`, `--danger-ink`, `--shadow-card`, `--shadow-pop`, radii.

## Preview blocks (for the choice dialog)

```preview
A · Aisle ledger   (Young Serif + Figtree)
swatches: sand · ink #1d2230 · zellige (done) · majorelle (Add)
signature: the dotted leader, name ..... price, on every head and every line of the total
 Shopping
 7 left to buy  243 MAD v
 Dairy ................ 28 MAD
 [ ] Butter            28 MAD
 Fruit & Veg .......... 18 MAD
 [x] Tomatoes x6       18 MAD
 [ Add an item ] [+ Add]
```
```preview
B · Stall awnings   (Young Serif 22 on the awning + Figtree)
swatches: sand · raised cream · majorelle-soft awning · zellige (done) · majorelle (Add)
signature: every category is a stall, a scalloped awning over its crate of rows
 Shopping   [ 7 left o 243 MAD ]
 .--------------------------.
 | Dairy      1 item 28 MAD |
 |)()()()()()()()()()()()()(|
 | [ ] Butter       28 MAD  |
 '--------------------------'
 [ Add an item ] [+ Add]
```
```preview
C · Pencil on the pad   (Young Serif for the sum, uppercase Figtree labels)
swatches: paper cream · ruled majorelle-soft · graphite ink · zellige (done) · majorelle (Add)
signature: a pencil stroke drawn across what you bought; the category in the margin
 Shopping
 7 left to buy   243 MAD
 ==========================
 FRUIT & VEG       18 MAD
 [x] T~~~~~~~~~x6
 [ ] Mint
 [ Add an item ] [+ Add]
```

## Tells audit

The kit's `anti-generic.md` was not readable from this session; the audit uses the standard tells.

| Tell | A | B | C |
|---|---|---|---|
| Default or "AI" font pairing (Inter + a display) | No; Young Serif + Figtree is the app's own pairing | Same | Same |
| Purple/blue gradient, glass cards, glow | None | None | None |
| Cards-in-cards, shadow on every row | None (flat rows) | **Present:** crates are cards. Justified: a crate is the group, not a container for rows; rows themselves are flat | None |
| Everything rounded, pill buttons | No: only Add is a button; radii by role | Crate radius is large (20); justified, it matches Goals' tiles | Pad radius 12, sharp on wide |
| Emoji or stock icons as decoration | None, no category icons (brief) | None | None |
| Centred hero with an icon-in-circle | None | None | None |
| Three identical feature tiles | None | Stalls repeat by nature; the data differs per stall | None |
| Generic "empty state" illustration | None, text only (S11 of the brief) | Same | Same |
| Saffron/terracotta used as decoration | None, by rule | None | None |
| Template layout (a sidebar plus a list) | The wide rail is a summary, not navigation | Same | The margin column is new |
| Decoration with no information | The dots carry the eye to the number | **Present:** the scallop is decorative. Justified: it also marks where the head ends and the group starts | The stroke carries "bought" |

A has few tells and, honestly, the least personality; its single flourish is the leader, and it only works if the dots are drawn at the right weight and the numbers truly align. B's scallop is the biggest risk of "themed kitsch" (a bazaar cliche); it is held back by using the app's own blue and no stripes, no lanterns. C's metaphor is a different angle but is a recognised "notebook" style, so it must be done without paper texture or a handwriting face to avoid the "skeuomorphic" tell.

## Recommendation

**Recommend A · Aisle ledger, with C's pencil stroke as an optional graft on bought rows.** The reasons, tied to the brief:
- **The job is the shop.** One hand, a weak signal, a phone in the aisle: the success actions are speed and no mis-taps. A spends the least vertical space (rows are flat, so the 320 x 568 hold leaves room for more than three rows) and its surface adds no new thing that can move under the thumb.
- **"Numbers are earned"** is the leader: the same dotted run is the group subtotal and the till-slip breakdown. It is information design, not paint.
- **It is the Grounded option with a point of view** and the cheapest to port to React (the Goals and Trips ports show the cost of bolder surfaces).
- **Trade-off, honestly:** the user chose the bold direction on Goals (B) and Trips (B). If they want the same appetite again, choose **B**: it is the better match to the saffron-light and doorway family, and costs one more day and about 28 px per group. **C** is the most distinctive but the furthest from the app and the costliest.
- **Graft** (A + C): add C's drawn pencil stroke to the ticked name. It adds one 180 ms stroke and a one-line `::after`, gives "bought" a cue that is visible at arm's length, keeps text at 6:1 or better, and does not change the layout.

Open for the Director: confirm the `--ease-out` token exists in Goals/Trips CSS before adding it; confirm whether the group head subtotal should be tabular Figtree (assumed) and whether `Figtree` serves `tnum` from Google Fonts' static subset (it does in the variable font; check the `css2` response if the subset is trimmed).
