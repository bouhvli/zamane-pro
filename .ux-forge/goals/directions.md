# Directions: Zamane Goals (list, goal detail, create and edit)

**By:** Art Director · **For:** the Director (department-lite) · Tue 10 Nov 2026
**Read:** `brief.md`, `ia.md` (all of it, especially §0, §5, §6 and §8), `zamane.css`, `../home/directions.md`, `../home/decision.md`, `../home/build-notes.md`, `../home/reviews/critique.md`, the Home screenshots, `Zamane Design System.html` and `assets/zamane-logo-sheet.png` (viewed only). From the kit: `protocol.md`, `reference/anti-generic.md` (all of it), `styles.md`, `fonts.md`, the colour section of `tokens.md`, and `scripts/contrast.mjs` for every ratio below. There is no `research.md`, so the reasons cite the brief, the IA and the design system.

**Scope.** These are three ways of dressing the same skeleton (ia.md §5) inside the settled system. Every direction keeps the same:
- palette, Young Serif and Figtree, type roles, radii, shadows and components;
- Lucide icons at 1.75;
- Home patterns: the floating primary, the quick-add sheet, the toast with Undo, and live updates without a toast.

The directions differ in four places:
1. the top of the goal detail;
2. the list's cards;
3. how journal notes sit next to History rows;
4. one signature element each.

No direction adds a colour, a font, a screen, a field or a step. Fonts and palette are identical, so the previews show composition only.

---

## Shared ground

### The subject's world
1. **The savings envelope.** Cash for one purpose goes into a named envelope in a drawer. The outside says what it's for and roughly how much is in it. Open it and the slips of what went in are inside. *(Used by A.)*
2. **The *daret* booklet.** The notebook of a rotating savings circle. Each payment gets one line with a name, an amount and a date, so everyone can check who paid what. *(Used by C, and by every History row.)*
3. **The riad doorway.** A big door set in an arch, with its surround clad in zellige by a *maâlem*. A finished doorway is a tiled one. *(Used by B.)*
4. **The photo album on the salon shelf.** Prints in sleeves, in the order things happened, with a date and a few words in pen under each. *(Used by the journal in all three.)*
5. ***Zaman*, time.** The app's name means time. Fes's Dar al-Magana water clock marks the hours with a row of windows facing the Bou Inania madrasa. In this area, time means months, target dates and the day a goal was reached. This is saffron's job in the system. *(C's spine.)*

### Fixed in every direction
- **Structure, content and behaviour come from ia.md and don't change:** D1–D8, the §5 skeletons, the §6 interaction specs and the §8 prototype states. Copy is working copy; the Writer owns it.
- **The primary:**
  - **Phones:** it floats at the bottom-end (Home's `.dock`). It reads "Add to this goal", or "Update progress" on percent goals, or "Write a note" on done goals.
  - **48–64 rem:** it sits at the end of the progress line.
  - **≥ 64 rem:** it sits on the masthead line.
- **Type roles:**
  - The detail's h1 is `display` 40/44 Young Serif. The design system assigns display to "a goal or trip detail header".
  - The list's h1 "Goals" is `title-lg` 28/34. The list has no display type.
  - The saved figure is `numeral` 32/36, Figtree 600, tabular. Everything else is Figtree at 15, 13 or 12 px.
- **Progress** is the design system's 8 px bar: majorelle on majorelle-soft, or zellige on zellige-soft when done. The fill animates only when a contribution lands.
- **The arch** holds covers and journal photos only. With no photo, it shows the title's initial on majorelle-soft (uploads off, or no cover set). Covers are decorative (`alt=""`).
- **Colour meanings:**
  - Saffron appears as Home's "Goal reached." toast in every direction. Only C adds a permanent saffron mark, and that mark is a date.
  - Zellige only ever means done.
  - Danger is used only for deletes, and they're always confirmed.
  - Partner colours appear in avatar rings only, never as text or figure colours.
- **Example data** is from ia.md §8. Note text appears in the sketches as `[example text]`. Entries, notes and stats are example data and are labelled on screen in the prototypes.
- **Never used:** skeleton shimmer, confetti, count-ups or decorative patterns. Every skeleton is static.
- **Logical properties everywhere.** The sketches are left-to-right. In right-to-left everything mirrors, including C's sides: Sara keeps the start side, which is then on the right.

### Contrast: every pair the directions use (kit `contrast.mjs`, both themes)

Token values are verbatim from the design system. Their oklch equivalents (computed, not new colours) are listed under each direction.

| Pair | Light | Dark | Need | Used for | Dirs |
|---|---|---|---|---|---|
| `ink` on `surface` | 14.35 | 15.27 | 4.5 | body, h1, figures on the page | A B C |
| `ink` on `surface-raised` | 15.61 | 13.76 | 4.5 | card, tile and sheet text; upload pill | A B C |
| `ink` on `surface-sunken` | 12.81 | 16.05 | 4.5 | offline notice, stats well | A B C |
| `ink-muted` on `surface` | 5.77 | 8.07 | 4.5 | captions, dates, "of 20,000 MAD"; C's date pills | A B C |
| `ink-muted` on `surface-raised` | 6.27 | 7.27 | 4.5 | captions in cards and sheets | A B C |
| `ink-muted` on `surface-sunken` | 5.15 | 8.48 | 4.5 | "Example photo" placeholder label | A B C |
| `majorelle` on `surface` | 7.59 | 8.53 | 4.5 | links, selected tab, focus ring, B's tab diamond | A B C |
| `majorelle` on `surface-raised` | 8.25 | 7.69 | 4.5 | ghost buttons and links in cards; focus ring | A B C |
| `on-majorelle` on `majorelle` | 8.39 | 8.23 | 4.5 | the floating primary | A B C |
| `majorelle-ink` on `majorelle-soft` | 8.88 | 9.07 | 4.5 | arch initial, Sara's avatar | A B C |
| `terracotta-ink` on `terracotta-soft` | 6.12 | 8.16 | 4.5 | Youssef's avatar initial | A B C |
| `zellige-ink` on `zellige-soft` | 6.76 | 8.62 | 4.5 | Done badge | A B C |
| `zellige-ink` on `surface` | 7.37 | 11.45 | 4.5 | check plus "Reached …" on the page | B C |
| `zellige-ink` on `surface-raised` | 8.01 | 10.32 | 4.5 | check plus "Reached …" inside a card | A |
| `saffron-ink` on `surface` | 6.26 | 12.01 | 4.5 | C's "Goal reached · Fri 30 Oct" node label | C |
| `on-saffron` on `saffron` | 7.71 | 9.40 | 4.5 | "Goal reached." toast (Home) | A B C |
| `danger` on `surface` | 5.95 | 7.92 | 4.5 | Delete goal (edit form) | A B C |
| `danger` on `surface-raised` | 6.47 | 7.13 | 4.5 | Delete contribution, Delete note | A B C |
| `majorelle` fill on `majorelle-soft` track | 6.79 | 6.70 | 3 | progress | A B C |
| `zellige` fill on `zellige-soft` track | 4.36 | 6.77 | 3 | done progress | A B C |
| `zellige` on `surface` | 4.74 | 8.99 | 3 | B's done surround; C's done spine | B C |
| `zellige` on `surface-raised` | 5.16 | 8.10 | 3 | B's surround on done rows in a raised area | B |
| `line-strong` on `surface` | 3.28 | 3.90 | 3 | input and radio borders | A B C |
| `line-strong` on `surface-raised` | 3.57 | 3.51 | 3 | secondary buttons in cards | A B C |
| `majorelle` ring on `surface-raised` | 8.25 | 7.69 | 3 | Sara's avatar ring | A B C |
| `terracotta` ring on `surface` | **4.48** | 7.43 | 3 | Youssef's avatar ring. **Fails 4.5, so terracotta is never text on sand.** | A B C |
| `terracotta` ring on `surface-raised` | 4.87 | 6.70 | 3 | Youssef's avatar ring in cards | A B C |
| `saffron` on `surface` | **1.93** | 10.36 | 3 | C's node fill. **Fails 3:1 in light, so the node gets a `saffron-ink` edge (6.26 / 12.01).** | C |
| `saffron-ink` edge on `saffron` fill | 3.24 | 1.16 | – | inside the node; decorative | C |
| `line` on `surface` | 1.28 | 1.41 | – | hairlines and C's open-goal spine. Decorative: the sides are also carried by alignment, avatar and name. | A B C |
| `majorelle-soft` on `surface` | 1.12 | 1.27 | – | the edge of a fallback arch. Decorative: the initial carries it (9.93 / 11.55 on sand). | A B C |
| `terracotta-ink` on `surface` | 7.03 | 10.20 | 4.5 | reserve: the only safe partner-B text colour on sand | – |

Every text pair passes 4.5:1 and every UI pair passes 3:1 in both themes, with two exceptions:
- **saffron on sand in light** (1.93): fixed by the edge;
- **terracotta as text on sand in light** (4.48): ruled out.

### Shared fixes (needed whichever direction wins)
1. **Upload progress inside an arch.** "Uploading 62%" and Cancel sit on a solid `surface-raised` pill (ink 15.61 / 13.76), never directly on the photo. No scrim token is needed.
2. **No terracotta text on sand** (4.48:1 in light). Youssef's name and figures are always ink. If a partner-tinted word is ever needed, use `terracotta-ink` (7.03 / 10.20).
3. **A saffron shape on sand gets a `saffron-ink` edge.** The fill alone is 1.93:1 in light.
4. **A detail title beside an arch at 320 px.** Young Serif at 40 px is about 23.5 px per character, so "Paint the guest room" would break into four lines next to an 88 px arch. Below 22.5 rem, a title that shares its row with an arch drops to `title-lg` 28/34 (A and C). B's title is full width, so it stays at 40 with `overflow-wrap: anywhere`.
5. **The smallest arch initial is 24 px** (the system's "serif never below 24 px"). It goes in the 32 × 40 list arch.
6. **Example photos.** `assets/` has no photos, so placeholders are sunken arches labelled "Example photo", never stock images.
7. **Partial state** (arriving from the list). The summary renders from the list cache at once, so no direction may put anything above the progress block that the list cache doesn't hold. All three comply.

---

## A · Card, opened

### Preview
```
A · CARD, OPENED
The detail is the GoalCard you tapped, opened up.
‹ Goals                                            [ Edit ]
╭──────────────────────────────────────────────────────────╮
│ ╭───────╮                                                │
│ │       │  Wedding                                       │
│ │   W   │  fund                                          │
│ ╰───────╯  by Sat 12 Jun 2027                            │
│ 14,250 MAD  of 20,000 MAD                                │
│ ███████████████████████████████████░░░░░░░░░░░░░░   71%  │
│ 5,750 MAD to go                                          │
│ Who put in what                                          │
│ (S) Sara                            7,750 MAD     54%    │
│ (Y) Youssef                         6,500 MAD     46%    │
│ Stats ▾                                                  │
╰──────────────────────────────────────────────────────────╯
   History 7                      Journal 2
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━─────────────────────────────
╭──────────────────────────────────────────────────────────╮
│ November                                     1,500 MAD   │
│ (S) Sara added 500 MAD                       Sat 7 Nov   │
│ (Y) Youssef added 1,000   ╭──────────────────────────╮   │
╰───────────────────────────│ + Add to this goal       │───╯
                            ╰──────────────────────────╯
DONE   zellige bar and Done badge; saffron only in toasts
LIST   Home's GoalCards; done goals as flat 64 px rows
NOTES  each note its own card; photos in a 4:3 arch
```

### Concept
The goal is an envelope. The card on the list (and on Home) is its outside. The detail is the same envelope opened: the same face on top (arch, title, figure, bar), and the slips inside (History) and the notes tucked in with them (Journal). It's the grounded option. It uses the system's GoalCard exactly as documented, and its point of view is **one object at three sizes**: Home, list and detail.

### Style family
**Card-based** (styles.md, family E) on the system's warm surfaces.
- **Taken:** things you open are discrete objects, and the radius depends on the role.
- **Left behind:** a shadow on everything. Only the GoalCards and the summary card carry `shadow-card`. The History panel and the notes are flat, with a 1 px `line`, so the stack doesn't become a card pile. [anti-generic: identical cards, shadow everywhere]

### Type
- **h1 (goal title):** `display` 40/44 Young Serif 400 with `text-wrap: balance`, beside the arch. It sets as two balanced lines, "Wedding / fund", which matches the arch's height (2 × 44 + 16 px caption ≈ 104 px against a 110 px arch).
  - Below 22.5 rem it's `title-lg` 28/34 beside a 64 × 80 arch (shared fix 4).
- **Saved figure:** `numeral` 32/36. "of 20,000 MAD" is body 15/22 in `ink-muted`; at 320 px it wraps under the figure (≈ 186 + 100 px doesn't fit in 256).
- **Labels and rows:**
  - "Who put in what" and the month groups: `label` 13/18 · 600.
  - History rows: body, with the amount in `body-strong` and the date in `caption`.
- **Notes:** body 15/22, at most 65ch.
- **Fonts:** `https://fonts.googleapis.com/css2?family=Figtree:wght@400;600&family=Young+Serif&display=swap`, verified HTTP 200 today, the same link Home uses.
- **Blend check (fonts.md), the same for all three:**
  - The roles are distinct: a soft, heavy old-style serif for display and an open geometric-humanist sans for text.
  - Both have large x-heights.
  - The mood matches: warm and mid-century.
  - Figtree is legible at 16 px.
  - Two families, three weights.
  - The display-to-body ratio is 40/15 = 2.67×, which counts as decisive.

### Colour
| Role | Token | Light | Dark |
|---|---|---|---|
| page (dominant) | `surface` | oklch(0.966 0.013 82.4) | oklch(0.199 0.015 261.6) |
| objects | `surface-raised` | oklch(0.994 0.007 88.6) | oklch(0.243 0.019 262.1) |
| text | `ink` | oklch(0.254 0.028 269.2) | oklch(0.941 0.017 84.6) |
| muted | `ink-muted` | oklch(0.486 0.023 269.9) | oklch(0.747 0.018 267.7) |
| action, progress | `majorelle` | oklch(0.423 0.111 255.1) | oklch(0.763 0.088 257.7) |
| done | `zellige` | oklch(0.520 0.094 168.6) | oklch(0.764 0.111 166.7) |

- **Proportions:** about 60% sand and 35% raised. A is the most contained of the three. Majorelle stays at or below 5%: the primary, the bar and the selected tab. Zellige appears only on done goals, and saffron only in the toast.
- **Dark mode:** the tokens swap. Cards read through the lighter raised surface plus their `line` border, not through shadow, which is nearly invisible on dark (the system's own rule).

### Shape and space
- **Radius by role:** `radius-lg` for the summary card, GoalCards, the History panel and notes. `radius-md` for rows, buttons and inputs. `radius-sm` for bars. Pills for avatars, badges and counts.
- **Borders:** 1 px `line` on every container, and hairlines between History rows. Nothing else.
- **Density:**
  - summary card padding 16 px (20 px from 22.5 rem);
  - 12 px between cards;
  - History rows at least 56 px; share rows 44 px.
- **Grid:** one column on phones. From 64 rem, a 12-column grid: summary full width, then History 5 | Journal 7.

### Imagery and iconography
- **Covers:** an 88 × 110 arch at the start of the summary (64 × 80 below 22.5 rem), with a 40 px initial when there's no photo. On cards, the system's 64 × 80.
- **Journal photos:** an arch at the card's content width, 4:3, with `object-fit: cover`. A tap opens the uncropped viewer.
- **Icons (Lucide 1.75):** `chevron-left` (Goals), `plus` (primary), `calendar` (by date), `check` (Done), `chevron-down` (Stats), `image-plus` (Add photo), `cloud-off`.

### Motion personality
- **The one orchestrated moment** is the signature morph (below): 240 ms (`--dur-sheet`), ease-out.
- **A contribution lands:** the 400 ms fill.
- **On completion:** the fill colour cross-fades to zellige over 160 ms, and the Done badge fades in from scale 0.96. The saffron toast is Home's.
- **Never moves:** the list order (D1), the tabs, note cards and photos. There's no hover lift on touch.
- **Reduced motion:** no morph (an instant route swap), and the bar jumps.

### Signature element: "The card opens"
- **What happens:** tapping a GoalCard (on the list or on Home) morphs its arch, title and bar into the detail's summary card. It uses same-document View Transitions with `view-transition-name: goal-<id>-arch | -title | -bar` on both ends. The rest of the detail cross-fades in over 160 ms. Back reverses the morph into the same card, which then gets focus (ia §6.3).
- **Why:** the IA's `partial` state already renders the summary from the list cache. So the morph always lands on real content, never on a skeleton.
- **Focus** moves to the h1 after `updateCallbackDone`, not after the animation finishes. A slow device never delays focus.
- **Browsers without View Transitions** get the instant swap.

### Key screen sketches

```
MOBILE 390 · Detail · Wedding fund · History tab
‹ Goals                                   [Edit]
╭──────────────────────────────────────────────╮  summary card = the
│ ╭────────╮                                   │  GoalCard opened:
│ │        │  Wedding                          │  raised, line,
│ │        │  fund                             │  shadow-card, lg
│ │   W    │  by Sat 12 Jun 2027               │  h1 display 40,
│ ╰────────╯                                   │  arch 88 × 110
│ Description, 3 lines … More                  │
│                                              │
│ 14,250 MAD  of 20,000 MAD                    │  numeral 32 + body
│ ████████████████████████████░░░░░░░░░   71%  │
│ 5,750 MAD to go                              │
│                                              │
│ Who put in what                              │  slot order, same
│ (S) Sara                 7,750 MAD    54%    │  type for both
│ (Y) Youssef              6,500 MAD    46%    │
│ Stats ▾                                      │
╰──────────────────────────────────────────────╯
   History 7               Journal 2
━━━━━━━━━━━━━━━━━━━━━━━━──────────────────────────  2 px majorelle
╭──────────────────────────────────────────────╮  History = ONE flat
│ November                         1,500 MAD   │  panel: group header
├──────────────────────────────────────────────┤  + subtotal (the
│ (S) Sara added 500 MAD           Sat 7 Nov   │  ShoppingItem
│     bonus month                              │  pattern)
├──────────────────────────────────────────────┤
│ (Y) Youssef added 1,000 MAD      Sun 1 Nov   │  rows ≥ 56 px
├──────────────────────────────────────────────┤
│ October                          5,750 MAD   │
│ …                                            │
╰──────────────────────────────────────────────╯
                     ╭──────────────────────────╮
                     │ + Add to this goal       │  floating primary
                     ╰──────────────────────────╯
```

```
MOBILE 390 · Detail · New sofa (done): only the summary card changes
╭──────────────────────────────────────────────╮
│ ╭────────╮                                   │
│ │   N    │  New sofa                         │
│ ╰────────╯  [✓ Done]                         │  badge under the h1
│ 6,000 MAD  of 6,000 MAD                      │
│ ████████████████████████████████████████████ │  zellige
│ ✓ Reached Fri 30 Oct · Youssef               │  zellige-ink check
│ [Add more]                                   │  ghost
│ Who put in what …                            │
╰──────────────────────────────────────────────╯
                     ╭──────────────────────────╮
                     │ Write a note             │
                     ╰──────────────────────────╯
```

```
MOBILE 390 · Goals list
Goals                                     title-lg 28
3 open · 1 done · 20,250 MAD saved together
╭──────────────────────────────────────────────╮
│ ╭────╮ Wedding fund                          │  Home's GoalCard,
│ │ W  │ 14,250 MAD of 20,000 MAD              │  unchanged
│ ╰────╯ ██████████████████████░░░░░░░         │  (64 × 80 arch)
│ (S) Sara added 500 · 2 days ago              │
│                               by Sat 12 Jun  │
╰──────────────────────────────────────────────╯
╭──────────────────────────────────────────────╮
│ ╭────╮ Paint the guest room                  │
│ │ P  │ 60% complete                          │  same anatomy: the
│ ╰────╯ ██████████████████░░░░░░░░░░░         │  bold figure leads
│ (Y) Youssef moved it to 60% · yesterday      │  in both kinds
╰──────────────────────────────────────────────╯
╭──────────────────────────────────────────────╮
│ ╭────╮ Honeymoon · 0 MAD of 30,000 MAD       │
│ ╰────╯ No contributions yet                  │
╰──────────────────────────────────────────────╯
Done · 1
┌──────────────────────────────────────────────┐  flat row: surface,
│ ╭N╮ New sofa                       [✓ Done]  │  line, radius-md,
│     6,000 MAD · reached Fri 30 Oct · Youssef │  no shadow, ≥ 64 px
└──────────────────────────────────────────────┘
```
- **320 × 568** (504 px above the nav): you see the h1, the summary line (two lines), all of Wedding fund and Paint the guest room, and the top of Honeymoon. Each card is 136 px, or 160 px when the title wraps.

```
MOBILE 390 · Journal tab (only the area under the tabs changes)
[Write a note]
╭──────────────────────────────────────────────╮  each note = its own
│ (S) Sara · Sat 7 Nov                  Edit   │  card: raised, line,
│ [example text]                               │  lg, NO shadow
╰──────────────────────────────────────────────╯
╭──────────────────────────────────────────────╮
│ (Y) Youssef · Sun 1 Nov                      │  no Edit on the
│ [example text]                               │  partner's note
│ ╭──────────────────────────────────────────╮ │
│ │          Example photo, 4:3 arch         │ │  card content width
│ ╰──────────────────────────────────────────╯ │
│ [example text] … Read more                   │
╰──────────────────────────────────────────────╯
```
- **History next to the journal:** History is one container with many lines, and the journal is many containers. The difference reads at a glance in both tabs, and side by side on wide screens.

```
DESKTOP 1440 · Detail (from 64 rem)
‹ Goals
╭──────────────────────────────────────────────────────────────────────────╮
│ ╭──────────╮ Wedding fund                   [Edit] [+ Add to this goal]  │
│ │    W     │ by Sat 12 Jun 2027 · Description, 2 lines … More            │
│ ╰──────────╯                                                             │
│ 14,250 MAD of 20,000 MAD             71%│ Who put in what                │
│ ████████████████████████░░░░░░░░░░      │ (S) Sara      7,750 MAD   54%  │
│ 5,750 MAD to go                         │ (Y) Youssef   6,500 MAD   46%  │
│ 7 contributions · average 2,036 MAD · largest 4,500 MAD · this month …   │
╰──────────────────────────────────────────────────────────────────────────╯
History · 7                       Journal · 2                [Write a note]
╭─────────────────────────────╮   ╭────────────────────────────────────────╮
│ November          1,500 MAD │   │ (S) Sara · Sat 7 Nov             Edit  │
│ (S) Sara added 500 Sat 7 Nov│   │ [example text]                         │
│ (Y) Youssef added 1,000 …   │   ╰────────────────────────────────────────╯
╰─────────────────────────────╯   ╭ (Y) Youssef · Sun 1 Nov ... photo 4:3 ─╮
```

### Create and edit
- **Fields** are the system's (`zamane.css .field`).
- **Kind** is a `fieldset` of two native radio rows inside one bordered group (`radius-md`, `line-strong`). Each row is 56 px: radio, label, and the helper on a second line.
- **Cover** (inside "Add details") shows the 64 × 80 arch with the title's initial, which updates as you type, and a secondary sm "Add a cover photo" beside it. It's the card you're making, at card size.
- **Delete goal** is a danger secondary, last and set apart, as in the IA.

### Tokens added (layout only, no colour)
- `--arch-detail-w: 88px`, `--arch-detail-h: 110px` (64 / 80 below 22.5 rem);
- `--vt-morph: var(--dur-sheet)`.

### Risks
- **Sameness.** Home's critic noted three identical blue initial arches (W, P, H). A keeps them. Real covers fix this; disabled uploads don't.
- **Least distinctive.** Cover the logo and a careful savings app could look like this. The arch, the serif and the sand carry the brand.
- **View Transitions:**
  - progressive enhancement only;
  - the shared names must be unique per goal, or two cards morph at once;
  - focus timing as above.
- **Build cost:** the lowest of the three. There are no new components, only a done-row variant that every direction needs.

---

## B · Doorway

### Preview
```
B · DOORWAY
Each goal is a door you're saving to walk through.
‹ Goals                                            [ Edit ]
             ╭──────────────────────────────────╮
      ╭──────╯                                  ╰──────╮
  ╭───╯                                                ╰───╮
  │               cover photo in the arch, 3:2             │
  │          no photo: 2:1, the initial at 96 px           │
  ╰────────────────────────────────────────────────────────╯
Wedding fund
by Sat 12 Jun 2027
14,250 MAD
of 20,000 MAD · 5,750 MAD to go
████████████████████████████████████░░░░░░░░░░░░░░░   71%
Who put in what
(S)                             (Y)
Sara                            Youssef
7,750 MAD · 54%                 6,500 MAD · 46%
      History 7                       Journal 2
──────────◆─────────────────────────────────────────────────
DONE   a zellige surround closes around the doorway
LIST   open goals as 2-up doorway tiles, figures aligned
NOTES  no cards; photos as full-width 4:5 arches
```

### Concept
Every goal is a doorway you're saving to walk through. The cover fills a riad arch across the top of the goal. When the goal is reached, the doorway gets its zellige surround, the way a *maâlem* tiles a finished door. It pushes the system's one signature shape as far as it goes while keeping it for imagery only.

### Style family
**Editorial / magazine** (styles.md, family D).
- **Taken:** image-led hierarchy, a serif display over a quiet sans, generous space, and text set straight on the page with no containers.
- **Left behind:** multi-column body text, pull quotes and drop caps.

### Type
- **h1:** `display` 40/44, full width at every size, so "Wedding fund" (≈ 283 px) fits on one line at 390 px. At 320 px it may balance onto two. It uses `overflow-wrap: anywhere`.
- **Saved figure:** `numeral` 32/36 on its own line. "of 20,000 MAD · 5,750 MAD to go" is body in `ink-muted`.
- **Share cells:**
  - name: `body-strong`;
  - amount: `title` 18/24 · 600, tabular;
  - percent: `caption`.
- **Doorway initial** (no photo): Young Serif 96 px, decorative, `aria-hidden`. List tiles use 40 px.
- **Create form:** the Title field itself is set in `title-lg` 28/34 Young Serif. What you type is how the doorway will read.

### Colour
| Role | Token | Light | Dark |
|---|---|---|---|
| page (dominant) | `surface` | oklch(0.966 0.013 82.4) | oklch(0.199 0.015 261.6) |
| imagery fallback | `majorelle-soft` | oklch(0.928 0.020 257.5) | oklch(0.288 0.051 259.0) |
| initial | `majorelle-ink` | oklch(0.358 0.091 254.6) | oklch(0.852 0.055 258.7) |
| text / muted | `ink` / `ink-muted` | oklch(0.254 0.028 269.2) / oklch(0.486 0.023 269.9) | oklch(0.941 0.017 84.6) / oklch(0.747 0.018 267.7) |
| action | `majorelle` | oklch(0.423 0.111 255.1) | oklch(0.763 0.088 257.7) |
| done surround | `zellige` | oklch(0.520 0.094 168.6) | oklch(0.764 0.111 166.7) |

- **Proportions:** about 55% sand, 30% imagery (photos or majorelle-soft doorways), 10% raised (list tiles), and majorelle at or below 5%. Zellige appears only around done doorways and on done bars. Saffron is only in the toast.
- **Dark mode:** a bare doorway becomes a deep blue niche with a pale initial (9.07:1). The surround brightens (8.99:1 on sand).

### Shape and space
- **The arch dominates the page.**
  - Detail doorway: full content width, `aspect-ratio: 3/2` with a photo and capped at 15 rem; `2/1` without one, so an empty doorway costs less height.
  - List tiles: 5:4 arches.
  - Journal photos: 4:5 arches, capped at 28 rem.
- **The done surround:** `box-shadow: 0 0 0 3px var(--surface), 0 0 0 7px var(--zellige)` on the detail doorway, and 2 + 2 px on list arches.
  - Box-shadow follows the elliptical radius in every engine. Outline-with-radius would fail on iOS before 16.4.
  - In forced colours, box-shadow is dropped, so the surround becomes `outline: 3px solid CanvasText`.
- **Containers:**
  - list tiles are `radius-lg` with `shadow-card`;
  - done rows are flat `radius-md`;
  - notes and History rows are uncontained on sand, separated by hairlines.
- **Grid:**
  - **The list:** 2-up tiles with a 12 px gap below 48 rem, 3-up from 48 rem and 4-up from 64 rem. The tile rows use `subgrid`, so the arch, title, figure, bar and attribution share their rows across a grid row.
  - **The detail from 64 rem:** a two-column masthead, doorway (5) | facts (7).

### Imagery and iconography
- **Covers lead the page.** Journal photos are as wide as the text column.
- **No photo** shows the big initial; there's no pattern fill and no illustration.
- **Example placeholders** are sunken arches labelled "Example photo".
- **Icons** are the same set as A. The selected tab is marked with the nav's own 8 px majorelle diamond on the tab bar's hairline, the same mark that shows the current destination in the bottom nav.

### Motion personality
- **The one orchestrated moment is completion:**
  1. The bar fills (400 ms) and turns zellige.
  2. The surround closes in: its spread animates from 12 px out to its 3 + 4 px rest over 320 ms, ease-out.
  3. At the same time, Home's saffron "Goal reached." toast rises at the floating primary.
- **Never moves:** photos. There's no Ken Burns, no parallax, no zoom on scroll and no collapsing header. The doorway never changes size on scroll.
- **Reduced motion:** the surround appears without travelling.

### Signature element: "The doorway, tiled when done"
- Open goals have a bare doorway; done goals have a doorway in a zellige surround. It's the same rule at both sizes: 4 px on the detail, 2 px on the list's done rows.
- **It encodes state, so it's never alone.** The Done badge and "Reached Fri 30 Oct · Youssef" carry the meaning in text. [WCAG 1.4.1]

### Key screen sketches

```
MOBILE 390 · Detail · Wedding fund · History tab
‹ Goals                                   [Edit]
              ╭────────────────────────╮
       ╭──────╯                        ╰──────╮      full-width arch,
   ╭───╯                                      ╰───╮  3:2, ≤ 15 rem
   │                                              │  (2:1 with no
   │              cover photo                     │   photo: the 96 px
   │                                              │   initial)
   ╰──────────────────────────────────────────────╯
Wedding fund                                         display 40
by Sat 12 Jun 2027
Description, 3 lines … More

14,250 MAD                                           numeral 32
of 20,000 MAD · 5,750 MAD to go
███████████████████████████████░░░░░░░░░░   71%

Who put in what
(S)                       (Y)                        two equal cells,
Sara                      Youssef                    avatar lg 48,
7,750 MAD                 6,500 MAD                  title 18 figures
54%                       46%
Stats ▾
      History 7                 Journal 2
────────◆──────────────────────────────────────      nav's diamond
November                            1,500 MAD        rows on sand,
(S) Sara added 500 MAD              Sat 7 Nov        hairlines between
    bonus month
───────────────────────────────────────────────
(Y) Youssef added 1,000 MAD         Sun 1 Nov
                     ╭──────────────────────────╮
                     │ + Add to this goal       │
                     ╰──────────────────────────╯
```
- **320 × 568** (504 px above the nav): the arch is 288 × 192, and the number sits at about y = 400, still above the fold. The share needs a scroll. At 390 × 844 installed, everything down to the share is visible.

```
MOBILE 390 · Detail · New sofa (done): only the doorway and the title block change
   ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓    the zellige surround
   ┃ ╭──────────────────────────────────────────╮ ┃    (3 px sand gap +
   ┃ │                  N                       │ ┃    4 px zellige)
   ┃ ╰──────────────────────────────────────────╯ ┃    follows the arch
   ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛    (drawn square here)
New sofa  [✓ Done]
✓ Reached Fri 30 Oct · Youssef
6,000 MAD
of 6,000 MAD
████████████████████████████████████████████████    zellige
[Add more]
```

```
MOBILE 390 · Goals list
Goals
3 open · 1 done · 20,250 MAD saved together
╭─────────────────────╮ ╭─────────────────────╮
│    ╭──────────╮     │ │    ╭──────────╮     │  5:4 arch,
│ ╭──╯          ╰──╮  │ │ ╭──╯          ╰──╮  │  40 px initial
│ │       W        │  │ │ │       P        │  │
│ ╰────────────────╯  │ │ ╰────────────────╯  │
│ Wedding fund        │ │ Paint the guest     │  subgrid: the title
│                     │ │ room                │  row takes the
│ 14,250 MAD          │ │ 60%                 │  taller one, so the
│ of 20,000 MAD       │ │ complete            │  figures share a
│ ██████████░░░░░     │ │ █████████░░░░░░     │  baseline and the
│ (S) Sara added 500  │ │ (Y) Youssef moved   │  bars a line
│ 2 days ago          │ │ it to 60% ·         │
│ by Sat 12 Jun       │ │ yesterday           │
╰─────────────────────╯ ╰─────────────────────╯
╭─────────────────────╮
│ … Honeymoon         │
Done · 1
┌─────────────────────────────────────────────┐
│ ┏N┓ New sofa                       [✓ Done] │  done row: flat, the
│     6,000 MAD · reached Fri 30 Oct · Youssef│  arch in a 2 px
└─────────────────────────────────────────────┘  surround
```
- **320 px:** each tile is 138 px wide with 114 px of content, and the arch is 114 × 91. You see the first row of two tiles and the top of Honeymoon. That's about the same goals per screen as A (≈ 147 px of height per goal), but with larger imagery.
- **Money and percent side by side:** "14,250 MAD" and "60%" sit on one baseline in the same grid row.

```
MOBILE 390 · Journal tab
[Write a note]
(S) Sara                     Sat 7 Nov    Edit       no containers
[example text]
───────────────────────────────────────────────      hairline + 32 px
(Y) Youssef                  Sun 1 Nov
[example text]
        ╭──────────────────────────────╮
   ╭────╯                              ╰────╮        full text width,
   │                                        │        4:5, ≤ 28 rem
   │           Example photo                │        (358 × 448 at 390)
   │                                        │
   ╰────────────────────────────────────────╯
[example text] … Read more
```
- **History next to the journal:** both are uncontained on the sand. History is a run of one-line rows; the journal is set like an album page, with photos as wide as the text. Side by side on wide screens they read like a two-column spread, held apart by the photos' size.

```
DESKTOP 1440 · Detail (from 64 rem)
‹ Goals
      ╭────────╮      Wedding fund                    [Edit] [+ Add to this goal]
  ╭───╯        ╰───╮  by Sat 12 Jun 2027 · Description, 2 lines … More
  │                │  14,250 MAD of 20,000 MAD · 5,750 MAD to go
  │  cover, 4:5    │  ██████████████████████████████░░░░░░░░░░░░   71%
  │  (5 columns)   │  (S) Sara 7,750 MAD · 54%      (Y) Youssef 6,500 MAD · 46%
  ╰────────────────╯  7 contributions · average 2,036 MAD · largest 4,500 MAD · …
History · 7                         Journal · 2                    [Write a note]
November                1,500 MAD   (S) Sara · Sat 7 Nov                    Edit
(S) Sara added 500      Sat 7 Nov   [example text]
(Y) Youssef added 1,000 Sun 1 Nov   ─────────────────────────────────────────────
October                 5,750 MAD   (Y) Youssef · Sun 1 Nov  ╭── photo 4:5 ──╮
```

### Create and edit
- **Title:** set in Young Serif 28/34 inside the field. The field keeps the system's border and focus ring; only the face changes.
  - Young Serif has no Arabic glyphs, so Arabic titles fall back to the system face. The same is true of every display title in the system.
- **Kind:** two equal radio cells side by side (`grid 1fr 1fr`), each with a radio, a label and a one-line helper. There are no icon tiles.
- **Cover** (inside "Add details"): a full-width 3:2 doorway preview showing the title's initial as you type, with "Add a cover photo" (secondary) under it. In edit, a done goal's preview shows its surround.

### Tokens added (no colour)
- `--doorway-ratio: 3 / 2`, `--doorway-ratio-bare: 2 / 1`, `--doorway-max: 15rem`;
- `--arch-initial-xl: 96px`;
- `--surround: 4px`, `--surround-gap: 3px`, `--surround-sm: 2px`;
- `--dur-surround: 320ms`.

The surround uses `zellige` and `surface`, checked above.

### Risks
- **Covers may be rare.** Uploads are optional and can be off (`uploadsEnabled: false`). Then B's main move is a pale arch with a big letter on every goal, which amplifies the W, P, H sameness Home's critic noted. The 2:1 bare ratio limits the cost but doesn't remove it.
- **Vertical cost.** At 320 × 568 the share is below the fold. It's the latest of the three to answer "who put in what".
- **Home continuity.** IA D1 relies on the list reading as Home's list continued. The order is kept, but B's tiles aren't Home's GoalCards.
- **Narrow tiles at 320 px** (114 px of content): long titles wrap to three lines and attribution wraps to two. Subgrid keeps rows aligned (Safari 16+, Chrome 117+, Firefox 71+).
- **Image weight.** Use Cloudinary `f_auto,q_auto` with `w_` per srcset step, `loading="lazy"` below the fold, and an `aspect-ratio` reserved on every arch so nothing shifts.
- **Build cost:** moderate. It needs a tile variant of GoalCard, the subgrid list, the surround and its animation, and the doorway's two ratios.

---

## C · Two hands

### Preview
```
C · TWO HANDS
A shared notebook: each of you writes on your own side.
‹ Goals                                            [ Edit ]
Wedding fund                                       ╭─────╮
by Sat 12 Jun 2027                                 │  W  │
                                                   ╰─────╯
14,250 MAD  of 20,000 MAD
████████████████████████████████████░░░░░░░░░░░░░░░   71%
5,750 MAD to go
(S) Sara                     │                Youssef (Y)
7,750 MAD · 54%              │            6,500 MAD · 46%
   History 7                      Journal 2
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━─────────────────────────────
                   November · 1,500 MAD
(S) 500 MAD              Sat 7 Nov
    Sara · bonus month       │
                         Sun 1 Nov           1,000 MAD (Y)
                             │                  Youssef
                   October · 5,750 MAD
(S) 750 MAD             Wed 28 Oct
DONE   the spine turns zellige; a saffron diamond marks
       the day the goal was reached
LIST   one ruled sheet: every open goal on screen at 320
NOTES  ruled, one shared voice; photos at two-thirds width
```

### Concept
A goal is a notebook the two of you keep, like a *daret* booklet. Each of you writes on your own side of a spine, and the spine is time (*zaman*). "Who put in what" stops being a statistic and becomes the shape of the page: the two totals head the two sides, and every contribution sits under the person who made it.

### Style family
**Minimal / Swiss structure** (styles.md, family A) dressed in the system's warmth.
- **Taken:** one strict axis, alignment that carries meaning, hairline rules, and figures aligned in columns.
- **Left behind:** grotesque type, all-caps and cold neutrality. The serif, the avatars, first names and the sand keep it a home, not an office.

### Type
- **h1:** `display` 40/44 at the start of the title row, with the 64 × 80 cover arch at the row's end. Below 22.5 rem it's `title-lg` 28/34 (shared fix 4); 212 px holds "Wedding fund" on one line at 28 px.
- **Saved figure:** `numeral` 32/36, with "of 20,000 MAD" in body `ink-muted`.
- **Side heads:**
  - name: `body-strong`;
  - amount: `title` 18/24 · 600, tabular;
  - percent: `caption`.
- **History rows:**
  - amount: `body-strong`;
  - "Sara · bonus month": `caption` (the first name sits beside every avatar, as the system requires);
  - date: `caption` in `ink-muted`, centred on the spine.
- **Month heads:** `label` 13/18 · 600 on a sand pill over the spine.
- **The reached node's label:** `label` 13/18 · 600 in `saffron-ink`.

### Colour
| Role | Token | Light | Dark |
|---|---|---|---|
| page (dominant) | `surface` | oklch(0.966 0.013 82.4) | oklch(0.199 0.015 261.6) |
| list sheet | `surface-raised` | oklch(0.994 0.007 88.6) | oklch(0.243 0.019 262.1) |
| text / muted | `ink` / `ink-muted` | oklch(0.254 0.028 269.2) / oklch(0.486 0.023 269.9) | oklch(0.941 0.017 84.6) / oklch(0.747 0.018 267.7) |
| action | `majorelle` | oklch(0.423 0.111 255.1) | oklch(0.763 0.088 257.7) |
| done spine | `zellige` | oklch(0.520 0.094 168.6) | oklch(0.764 0.111 166.7) |
| reached node | `saffron` with a `saffron-ink` edge and label | oklch(0.766 0.145 79.8) / oklch(0.471 0.099 76.3) | oklch(0.823 0.139 81.6) / oklch(0.866 0.110 83.9) |

- **Proportions:** about 75% sand, 20% raised (the list sheet only), and majorelle at or below 5%.
  - Zellige appears only on the done spine, done bars and badges.
  - Saffron appears once per done goal: the node at the day it was reached, plus the toast.
- **Partner colours stay in avatar rings.** No figure is ever tinted. Terracotta figures would read as debits, and terracotta text on sand is 4.48:1.
- **Dark mode:** the open spine (`line`, 1.41) stays deliberately faint. The done spine is 8.99:1 and the node edge 12.01:1.

### Shape and space
- **The spine:** 1 px `line` from the share heads down through the History rows, pausing at the tab bar. When the goal is done it becomes 2 px `zellige`.
- **History row grid:** `grid-template-columns: 1fr var(--spine-date) 1fr`, with a 72 px date column. At 320 px each side is 108 px: a 24 px avatar, 8 px, and "12,500 MAD" in body-strong (≈ 76 px). Amounts don't wrap; past 100,000 the avatar moves above the amount.
- **Container fallback:** when the History container is under 17.5 em (bigger text or a narrow pane), rows collapse to one start-aligned column (avatar, sentence, date) and the spine hides. Nothing ever overflows. [WCAG 1.4.10, 1.4.4]
- **Feeds on the detail sit directly on the sand,** with no container, because a container's padding would cost 32 px of the 288 at 320.
- **The list** is one raised sheet (`radius-lg`, `line`, `shadow-card`) ruled into lines.
- **Radius:** `radius-lg` for the sheet, pills for dates, month heads and badges, and `radius-sm` for bars.

### Imagery and iconography
- **Covers are small.** On the detail, a 64 × 80 arch at the end of the title row: the GoalCard's own size, so you recognise it from Home. In the list, 32 × 40 arches with a 24 px initial. Photos are always decorative there.
- **Journal photos:** 4:5 arches at two-thirds of the text width (192 × 240 at 320 px). Two consecutive photos sit 2-up. The block order never changes.
- **Icons** are the same set as A. The node is a CSS rotated square: the ز dot from the logo, drawn in code. The logo files aren't touched.

### Motion personality
- **The one orchestrated moment is completion:**
  1. The bar fills (400 ms).
  2. The spine's zellige draws downward from the share heads with `scaleY` (400 ms, ease-out).
  3. The saffron node scales in at its row (180 ms, `--dur-mark`, the same rotate-and-scale as the nav's mark).
- **A contribution lands:** the new row enters from its own side, 8 px from the outer edge plus a fade (160 ms). The sign of the travel flips under `:dir(rtl)`.
- **Never moves:** the spine, the side heads and the dates. Rows never reshuffle.
- **Reduced motion:** opacity only.

### Signature element: "The spine"
Two sides, one axis:
- Sara is always on the start side and Youssef always on the end side, in slot order and at equal width. Each side is headed by that partner's total and filled with their contributions, with the dates down the middle.
- When the goal is done, the spine turns zellige, and a saffron diamond on it marks "Goal reached · Fri 30 Oct", the moment and the time.
- **Semantics are unchanged.** Each row is still one `<button>` named "Sara added 500 MAD, bonus month, Sat 7 Nov" (ia §6.4). The side cells are `aria-hidden` layout. The node is a static text row, not a button.

### Key screen sketches

```
MOBILE 390 · Detail · Wedding fund · History tab
‹ Goals                                   [Edit]
Wedding fund                         ╭──────╮      display 40 at start;
by Sat 12 Jun 2027                   │      │      the 64 × 80 cover at
Description, 2 lines … More          │  W   │      the end
                                     ╰──────╯
14,250 MAD  of 20,000 MAD
███████████████████████████████░░░░░░░░░░   71%
5,750 MAD to go

Who put in what                                    h2, label 13
(S) Sara               │          Youssef (Y)      the share heads the
7,750 MAD              │            6,500 MAD      two sides
54%                    │                  46%
Stats ▾
   History 7               Journal 2
━━━━━━━━━━━━━━━━━━━━━━━━──────────────────────────
               November · 1,500 MAD                month head on the
(S) 500 MAD          Sat 7 Nov                     spine
    Sara · bonus month   │                         each row = one
                     Sun 1 Nov        1,000 MAD (Y) button, ≥ 56 px,
                         │              Youssef    full width
               October · 5,750 MAD
(S) 750 MAD         Wed 28 Oct
    Sara                 │
                    Thu 15 Oct        3,000 MAD (Y)
                         │              Youssef
(S) 2,000 MAD       Thu 1 Oct
    Sara       ╭──────────────────────────╮
               │ + Add to this goal       │        floating primary
               ╰──────────────────────────╯
```
- **320 px:** the date column is 72 px and each side 108 px.
- **The floating primary** passes over the end side while you scroll, which is Youssef's side. Page padding keeps the last row clear, as on Home.

```
MOBILE 390 · Detail · New sofa (done): what changes
New sofa  [✓ Done]                   ╭──────╮
✓ Reached Fri 30 Oct · Youssef       │  N   │
                                     ╰──────╯
6,000 MAD  of 6,000 MAD
████████████████████████████████████████████████  zellige
[Add more]
(S) Sara               ┃          Youssef (Y)      the spine is now
2,500 MAD              ┃            3,500 MAD      2 px zellige
42%                    ┃                  58%
   History 3               Journal 0
━━━━━━━━━━━━━━━━━━━━━━━━──────────────────────────
              ◆ Goal reached · Fri 30 Oct          saffron node with a
                     Fri 30 Oct       1,000 MAD (Y) saffron-ink edge and
                         ┃              Youssef    label: a static row,
(S) 2,500 MAD       Tue 15 Sep                     not a button
    Sara                 ┃
                    Sat 15 Aug        2,500 MAD (Y)
```
- **Percent goals** use the same layout. A row shows "60%" on Youssef's side with "Youssef · moved it to" under it. The heads read "1 update" and "2 updates", and the month head reads "November · 40% → 60%".
- **Solo** (the partner hasn't joined): the end head reads "Your partner hasn't joined yet." and that side stays open. The page shows there's a place waiting.
- **No entries:** both heads show "No contributions yet" under the names, and the History empty line spans the width.

```
MOBILE 390 · Goals list (one ruled sheet)
Goals
3 open · 1 done · 20,250 MAD saved together
╭──────────────────────────────────────────────╮  Open is a visually
│ ╭─╮ Wedding fund                 14,250 MAD  │  hidden h2; figures
│ ╰─╯ by Sat 12 Jun             of 20,000 MAD  │  in one end column;
│ ███████████████████████████████░░░░░░░░░░░░  │  bars share one
│ (S) Sara added 500 · 2 days ago              │  start and width,
├──────────────────────────────────────────────┤  so money and
│ ╭─╮ Paint the guest room                60%  │  percent compare
│ ╰─╯                                complete  │  down the sheet
│ ██████████████████████████░░░░░░░░░░░░░░░░░  │
│ (Y) Youssef moved it to 60% · yesterday      │
├──────────────────────────────────────────────┤
│ ╭─╮ Honeymoon                         0 MAD  │
│ ╰─╯                           of 30,000 MAD  │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│ No contributions yet                         │
├──────────────────────────────────────────────┤
│ Done · 1                                     │  visible heading line
├──────────────────────────────────────────────┤
│ ╭─╮ New sofa                      6,000 MAD  │  done line: no bar;
│ ╰─╯ ✓ Done · reached Fri 30 Oct · Youssef    │  zellige-ink check
╰──────────────────────────────────────────────╯
```
- **320 × 568:** each line is about 110 px, or 132 px when the title wraps ("Paint the guest room" does at 320). "Open" is a visually hidden h2, so you see the h1, the summary and **all three open goals**, with the end of Honeymoon passing under the floating "New goal". That's the densest list of the three.
- Each line is a stretched link at least 48 px tall, with its focus ring inset by 2 px so the sheet's rounded corners don't clip it.
- This is the goal-line row variant that Home's direction C proposed "for the Goals list later".

```
MOBILE 390 · Journal tab (no spine: the journal is written together)
[Write a note]
(S) Sara · Sat 7 Nov                      Edit      byline at start,
[example text]                                      always
───────────────────────────────────────────────    hairline between notes
(Y) Youssef · Sun 1 Nov
[example text]
╭──────────────────────────────╮                    4:5 arch at 2/3 width
│                              │                    (two photos in a row
│        Example photo         │                    sit 2-up)
│                              │
╰──────────────────────────────╯
[example text] … Read more
```
- **History next to the journal:**
  - Money has two hands, so History has two sides.
  - The journal is one shared voice, so notes run full width with the author in the byline, not on a side. Notes aren't messages, so there are no bubbles and no side alignment.
  - The contrast between the two tabs is the concept, not decoration.

```
DESKTOP 1440 · Detail (from 64 rem)
‹ Goals
Wedding fund                    ╭────╮              [Edit] [+ Add to this goal]
by Sat 12 Jun 2027              │ W  │
Description, 2 lines … More     ╰────╯
14,250 MAD of 20,000 MAD   ███████████████████████░░░░░░░░  71% · 5,750 MAD to go
7 contributions · average 2,036 MAD · largest 4,500 MAD · this month 1,500 MAD
────────────────────────────────────────────────────────────────────────────────
(S) Sara        │       Youssef (Y)   Journal · 2                  [Write a note]
7,750 MAD · 54% │   6,500 MAD · 46%   (S) Sara · Sat 7 Nov                   Edit
History · 7     │                     [example text]
     November · 1,500 MAD             ───────────────────────────────────────────
500 MAD     Sat 7 Nov                 (Y) Youssef · Sun 1 Nov
            Sun 1 Nov     1,000 MAD   [example text]  ╭─ photo, 2/3 width ─╮
```
- **Wide layout:** the share heads the History column (5 of 12), so the spine runs unbroken into its rows. Progress takes the full-width line above. The DOM order stays identity, number, share, History, Journal, matching ia §1's priority.

### Create and edit
- **Fields:**
  - Phones: stacked, with the system's fields.
  - From 30 rem: the form is one ruled sheet, with labels in a start column (8 rem) and fields in the rest, one ruled line per field.
- **Kind:** native radio rows.
- **Cover:** the 64 × 80 arch with the live initial and "Add a cover photo".
- **Edit's three-way merge** marks "Changed by Youssef" with Youssef's sm avatar beside the caption. Who changed what, always.

### Tokens added
- `--spine-w: 1px`, `--spine-done-w: 2px`, `--spine-date: 4.5rem`;
- `--node: 10px`;
- aliases only:
  - `--spine: var(--line)` (1.28 / 1.41, decorative);
  - `--spine-done: var(--zellige)` (4.74 / 8.99);
  - `--node-fill: var(--saffron)`;
  - `--node-edge: var(--saffron-ink)` (6.26 / 12.01 on sand).

All of these are checked above. No colour values are new.

### Risks
- **"Never a bank"** (the system's own words). Two columns of money can read as debit and credit. Mitigations:
  - no tinted figures;
  - an avatar and first name on every row;
  - centred dates;
  - no running balance;
  - no double rules;
  - the done state joins the sides rather than closing an account.
- **Scoreboard.** Two side totals invite comparison. This is held back by slot order (never by size), equal widths, no highlight for whoever is "ahead", and percentages in caption size. **This needs the user's eye.** A five-second test with the couple ("what is this page telling you?") would settle it.
- **320 px is tight** (108 px sides). Notes clamp to one line in the row (the full note is in the entry sheet). The container fallback covers bigger text.
- **Floating primary over the end side.** It covers Youssef's figures more often than Sara's while scrolling, and the reverse in RTL. Padding keeps the last row clear.
- **Covers lose impact** at 64 × 80 and 32 × 40. C chooses the hands over the imagery.
- **Home continuity.** Same as B: the order is kept, but the card shape changes.
- **Build cost:** moderate. It needs the row grid, the container fallback, a spine that continues from the heads into the list across the tab bar, the node row, and the goal-line variant.

---

## Tells audit

Every direction was run through anti-generic.md's self-review: *Cover the logo. Could this belong to ten other products?*
- **A:** partly. A careful savings app with cards could look like this; the arch, the serif and the sand are what save it.
- **B:** no. The full-width doorway and the zellige surround belong to this subject only.
- **C:** no. A page split between two named people around a time spine is this couple's notebook.

| Tell (kit list, plus three specific to Zamane) | A | B | C | Verdict |
|---|---|---|---|---|
| Overused font as the brand voice | – | – | – | Young Serif and Figtree (system) |
| Purple or blue gradient, glow, aurora | – | – | – | none |
| Cream background with a terracotta accent | **present** | **present** | **present** | **Required by the brief:** the system's sand and partner B's terracotta. Terracotta is attribution in avatar rings only, never the accent; the action colour is majorelle. |
| Glassmorphism | – | – | – | solid surfaces; the tab bar isn't translucent |
| Identical rounded cards, shadow on everything | **present** | reduced | – | **A, mitigated:** shadow only on GoalCards and the summary; notes and History are flat; radius depends on role. B has tiles only; C has one sheet. |
| Side-tab accent border | – | – | – | Home C's "fresh ink" rule isn't reused. C's spine is central and encodes sides. |
| Icon in a rounded square, repeated | – | – | – | Kind is radio rows or cells with no icon tiles |
| Emoji or generic glyphs as icons | – | – | – | Lucide. The diamond is the logo's ز dot drawn in CSS (B's tab mark, C's node). |
| Stock imagery, 3D shapes | – | – | – | the couple's own photos; placeholders labelled "Example photo" |
| Centred hero with an eyebrow | – | – | – | none. **C** centres dates on the spine: structure, not a hero. |
| Alternating identical blocks | – | – | **present** | **C, justified:** sides alternate because authors alternate. It's data (who), not page rhythm. |
| All-caps kickers on every section | – | – | – | sentence-case `label` 13 |
| Middle-dot meta strings | **present** | **present** | **present** | **Required by the system:** its voice separates data with "·" ("Sara added 500 · bonus month"). Facts, not slogans. |
| Trailing arrows on links | – | – | – | "‹ Goals" is an up-link; no "→" anywhere |
| 01 / 02 / 03 on non-sequences | – | – | – | Reorder positions (composer) are a real sequence |
| Borders and badges that encode nothing | – | – | – | Each one encodes something: A's borders group objects, B's surround means done, C's spine separates the partners, and the counts are counts |
| Bento grid | – | – | – | B's 2-up tiles are uniform, not bento |
| *Zamane: Moroccan kitsch (star patterns, lanterns, mosaic textures, faux-Arabic type)* | – | – | – | none. Zellige is a colour, and in B a plain surround. |
| *Zamane: gamification (leaderboard, streaks, confetti)* | – | – | **risk** | **C, mitigated:** see C's risks ("Scoreboard"). No direction has streaks or confetti. |
| *Zamane: parallax or collapsing photo header* | – | **risk** | – | **B, avoided:** the doorway never moves on scroll |
| Skeleton shimmer | – | – | – | static blocks (Home) |

**Count:**
- **A:** 3 tells present, all justified or mitigated.
- **B:** 2 present plus 1 avoided risk.
- **C:** 3 present plus 1 risk, all justified or mitigated.

None of them was replaced. Every remaining tell is either required by the system or carries data.

---

## Recommendation

**C · Two hands.** It's the only direction whose layout is built around the question this area exists to answer.
1. **"What happened lately, and who put in what?"** (the brief's second job on the detail) becomes the page's structure:
   - The two totals head the two sides, and the rows that make them up sit directly beneath, at zero taps. That's the design system's "Numbers are earned, not typed" and IA D3's "the rows that make up the number are right below it", taken literally.
   - It's also "Ours, not mine" and "Who did what, always": equal width, slot order, and a name on every row.
2. **"Pick the right goal in one glance and one tap"** (the list's job):
   - At 320 × 568, C shows all three open goals. A and B show about two.
   - Figures sit in one end column, so a money goal and a percent goal compare down a single line of numbers.
3. **It holds up with uploads off.** Nothing in C depends on photos. B's main move turns into a row of pale letters, and A repeats Home's W, P, H sameness.
4. **Every colour does exactly its documented job:**
   - zellige means done (the spine);
   - saffron marks a completed-goal moment and a time (the node, dated);
   - partner colours are attribution only.

**What to hold C to:**
- the container fallback below 17.5 em, tested at 320 px and at 200% text;
- no tinted figures, ever;
- the solo state's copy for the open side (Writer);
- a five-second "scoreboard?" check with the couple before the build is locked;
- History rows staying single buttons with full-sentence names (ia §6.4) whatever the visual grid does.

**Fallbacks:**
- **A · Card, opened** if the user puts continuity with Home first and wants the least risk. It's also the cheapest to build.
- **B · Doorway** only if covers and journal photos will be central to how Sara and Youssef use Goals, and uploads will be on.

Please don't graft C's spine onto A's cards: the spine needs the full width that A's padding takes away.

---

## Assumptions
- The prototypes use hash routes inside one file (ia §8), so A's morph can use same-document View Transitions.
- Covers are optional, so many goals will show the initial. B is judged with that in mind.
- `line` (1.28 / 1.41) is acceptable for C's open-goal spine because the sides are also carried by alignment, avatars and names. If the user wants the spine more visible, `line-strong` (3.28 / 3.90) is the checked alternative.
- Dates and example figures are ia.md §8's. The dates were checked against the 2026 calendar: Sat 7 Nov, Sun 1 Nov, Wed 28 Oct, Thu 15 Oct, Thu 1 Oct, Tue 1 Sep, Sat 1 Aug, Fri 30 Oct, Tue 15 Sep and Sat 15 Aug.

## For other roles
- **Writer:**
  - C needs "Goal reached · {date}" for the node row and the solo side's line.
  - Every direction needs the "Example photo" placeholder label and the tab counts' accessible names ("History, 7 entries").
- **Front-end:**
  - A: View Transition names must be unique per goal, and focus moves on `updateCallbackDone`.
  - B: the surround is box-shadow (not outline), with a forced-colours outline.
  - C: the side cells are `aria-hidden` and the row's name is the full sentence; the container query is in em.
- **Design system (via build notes):**
  - whichever direction wins adds one GoalCard variant: `row` for C, `tile` for B, `done-row` for A;
  - the tokens listed under each direction.
