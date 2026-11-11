# Directions: Zamane auth and space setup (the front door)

**By:** Art Director · **For:** the Director (department mode), then the user's pick · Tue 10 Nov 2026 (prototype "today": Mon 9 Nov 2026)

**Read:**
- `auth/brief.md`, `auth/decision.md`, `auth/research.md` (all), and `auth/ia.md`. I read A1 to A8, §1, §2, F6 to F8, §5 (every wireframe), §6.10, §6.11 and §9 closely.
- `Zamane Design System.html` (tokens, type, the arch rule, voice, icons).
- `assets/zamane-logo-sheet.png` (viewed) and every SVG in `assets/` (inspected for viewBox and fills only; nothing was changed).
- `goals/zamane.css` (the shared layer), `home/decision.md`, `goals/decision.md` and `goals/directions.md` (its shared ground and contrast table).
- Screenshots: Home `state-first-run`, `state-joined-empty` and `populated` (390 and 1440); Goals `detail-populated` and `form-create`.
- Kit: `protocol.md`, `reference/anti-generic.md` (all of it), `styles.md`, `fonts.md`, and the colour section of `tokens.md`. I ran `scripts/contrast.mjs` for every ratio below.

**Scope.** These are three ways to dress the IA's skeleton (§5) inside the settled system. All three keep:
- the palette, Young Serif and Figtree, the type roles, radii, shadows and components;
- Lucide icons at a 1.75 stroke;
- the shared field, notice, error and button patterns.

No direction adds a colour token, a font, a screen, a field or a step. The directions differ in five places:
1. how the logo is used;
2. whether the arch appears;
3. what the two setup cards look like;
4. the composition at 48 rem and up;
5. the moment Sara's space is created and Youssef joins.

---

## Shared ground

### The subject's world
1. **The riad's street wall.** From the derb, a riad shows a plain lime-washed wall and one heavy door. All the beauty is inside, around the courtyard. The door is the only thing the street gets. *(The reason none of these directions looks like a landing page. A treats auth as the wall.)*
2. **The riad door, with its two leaves and its small door.** A big double door opens both leaves for guests and occasions. A small wicket door (*khoukha*) cut into one leaf is used for daily comings and goings. Above the leaves, an arched transom closes the opening. *(B: the door, the transom over two equal leaves, and the small door on side screens.)*
3. **The name by the door.** House names and numbers are painted or tiled on the wall beside the door, and shop signs set Arabic and Latin together. Zamane's lockup already does this: زمان in majorelle with a saffron *nuqta*, then "Zamane" in Young Serif. *(A: the sign at full size.)*
4. **Two first names, side by side.** Wedding and engagement cards, and the brief's own space name "Sara & Youssef", set the couple's two names with equal weight. In the app this is the AvatarPair beside "Hi, you two": majorelle for the one who started, terracotta for the one who joined. *(C: the two seats.)*
5. **The tile on the home screen.** People reach these screens by tapping a majorelle tile with the sand mark (`zamane-app-icon.svg`), or a link in WhatsApp. *(It sets the Launch screen in every direction.)*

### Fixed in every direction
- **Structure, content and behaviour come from `ia.md` and don't change:**
  - A1 to A8 and the §5 skeletons;
  - §6 focus, errors, announcements and autocomplete;
  - decision.md's Q1 to Q4 (switch path F9, the invite link `#/join`, Sign in as the landing screen, the preselected currency).
  - The copy is working copy; the Writer owns it.
- **No bottom nav and no app top bar** on any screen here. The primary is inline: a full-width button under the last field (A8), never a dock or a floating button. When the keyboard is up, `scroll-padding-bottom` comes from `visualViewport`.
- **Type** (one `css2` link, verified HTTP 200: `https://fonts.googleapis.com/css2?family=Figtree:wght@400;600&family=Young+Serif&display=swap`):

  | Role | Face | Size / line |
  |---|---|---|
  | h1 | Young Serif 400, `title-lg` | 28/34 |
  | Body and gloss | Figtree 400 | 15/22 |
  | Labels and buttons | Figtree 600 | 13/18 |
  | Helper and A7 line | Figtree 400, `ink-muted` | 12/16 |
  | Input text | Figtree | 16/24 (no iOS zoom) |
  | Invite code field | Home's `.code`: Figtree 600, tabular, `.04em` | 32/36, or 28/34 under 22.5 rem |

  - **Why `title-lg` and not `display` for the h1:** the brief says the mark leads these screens, and the design system keeps `display` 40 for Home and detail headers. A 40 px "Sign in" would outrank the logo. Home's own greeting was dropped to 28 for the same reason.
  - **Blend-check:** passes. Young Serif and Figtree have distinct roles (serif display, sans text). Both have generous x-heights and both are warm and rounded. Figtree 400/600 reads well at 16 px. That's 2 families and 3 styles. They are the system's faces and aren't open to change.
- **The code field** is set exactly like Home's invite card: the same face, size and tracking, `dir="ltr"`, 64 px tall. What Sara shows is what Youssef types (IA 5.7: "large, tabular, letter-spaced").
- **Colour meanings.** Every direction rules the same way:
  - **Saffron appears only as the nuqta inside the logo.** Creating a space is a beginning, not a completion. Nothing on these screens is "time" in the system's sense: the reset link's hour is plain text.
  - **Zellige: none.** Nothing here is "done" as the system means it. "Password changed" is a plain h1 and text, not a zellige badge.
  - **Danger:**
    - form errors (a 2 px field border plus `.err` text);
    - the error summary (`.notice-danger`);
    - F9's "Join and delete my space".
  - **Partner colours:** inside avatars only. Only C uses avatars.
- **Errors, offline and rate limits:**
  - **Errors:** the shared `.notice-danger` summary, with focus rules from `form.js`.
  - **Offline:** `.notice` on sunken, with Lucide `wifi-off`.
  - **Rate limits:** the time goes in the text, with no countdown widget.
  - **Pending:** the button label changes ("Signing in…"). There are no spinners.
- **Logo files are used as they are**, never edited, recoloured or split. The light and dark files swap with the theme through two `<img>`s toggled by `[data-theme]` and `prefers-color-scheme`, because `<picture media>` can't follow the manual theme toggle. The `alt` is "Zamane" (§6.10).
- **Logical properties everywhere.** The sketches are left-to-right. In right-to-left everything mirrors except the logo image and the code.
- **Breakpoints:** phones below 48 rem; a centred column from 48 rem; an optional brand pane from 64 rem (IA §0). The setup cards go side by side from 40 rem.

### The arch on auth: does it count as imagery?
The rule is "Imagery only, never buttons or cards." Here is my honest ruling. An arch counts as imagery when **all four** of these hold:
1. **It holds a picture and nothing else.** A photo, a goal's initial or the brand mark all count. Goals already treats an initial in a majorelle-soft arch as the "no photo" cover, so the logo in an arch is the same kind of thing.
2. **No text that a person must read sits inside it.**
3. **It can't be focused or clicked.**
4. **It frames no control.** It isn't the outline of a form, a card, a button or the code field.

By that rule:
- **Allowed:** an arch holding the logo, or an arch-shaped opening that shows the next screen (a picture of Home) for 400 ms while nothing can be clicked.
- **Not allowed:** an arch outlining the sign-in form, an arched choice card, an arched button, and an empty decorative arch outline. The empty outline is ornament dressed up as imagery, because it shows nothing.
- **A uses no arch.** There is no picture on these screens, so there's nothing to frame.
- **B uses the arch as the door** holding the logo, and as the opening into Home. It's the closest any direction comes to the rule, as noted in B's Risks.
- **C uses no arch.** The avatars are its imagery.

### Contrast: every pair the directions use (`contrast.mjs`, both themes)
Token values are verbatim from the design system. The `oklch()` values listed under each direction are conversions, not new colours.

| Pair | Light | Dark | Need | Used for | Dirs |
|---|---|---|---|---|---|
| `ink` on `surface` | 14.35 | 15.27 | 4.5 | h1, body, labels, input text | A B C |
| `ink` on `surface-raised` | 15.61 | 13.76 | 4.5 | choice cards; A's card from 48 rem | A B C |
| `ink-muted` on `surface` | 5.77 | 8.07 | 4.5 | helper text, gloss, the A7 line | A B C |
| `ink-muted` on `surface-raised` | 6.27 | 7.27 | 4.5 | card descriptions | A B C |
| `ink` on `surface-sunken` | 12.81 | 16.05 | 4.5 | offline and rate-limit notices; C's neutral seat initial | A B C |
| `ink-muted` on `surface-sunken` | 5.15 | 8.48 | 4.5 | secondary text inside notices | A B C |
| `on-majorelle` on `majorelle` | 8.39 | 8.23 | 4.5 | the primary button | A B C |
| `majorelle` on `surface` | 7.59 | 8.53 | 4.5 | links, Show/Hide, focus ring; C's partner-A seat ring | A B C |
| `majorelle` on `surface-raised` | 8.25 | 7.69 | 4.5 | links and focus ring inside cards | A B C |
| `majorelle-ink` on `majorelle-soft` | 8.88 | 9.07 | 4.5 | A5 toggle pressed; C's partner-A seat | A B C |
| `line-strong` on `surface` | 3.28 | 3.90 | 3 | field borders, choice-card borders; C's dashed seat | A B C |
| `line-strong` on `surface-raised` | 3.57 | 3.51 | 3 | field borders inside A's card; C's dashed seat in a card | A B C |
| `danger` on `surface` | 5.95 | 7.92 | 4.5 | inline `.err`, invalid border | A B C |
| `danger` on `surface-raised` | 6.47 | 7.13 | 4.5 | errors inside A's card | A |
| `danger-ink` on `danger-soft` | 7.34 | 9.09 | 4.5 | error summary | A B C |
| `ink` on `majorelle-soft` | 12.84 | 11.99 | – | B: the wordmark inside the door (logo, for reference) | B |
| `majorelle` (mark) on `majorelle-soft` | 6.79 | 6.70 | – | B: the Arabic mark inside the door (logo, for reference) | B |
| `majorelle-soft` door on `surface` | 1.12 | 1.27 | – | B's door edge. Decorative, like Goals' bare arch; the mark carries it | B |
| `terracotta-ink` on `terracotta-soft` | 6.12 | 8.16 | 4.5 | C: the partner-B seat initial | C |
| `terracotta` ring on `surface` | **4.48** | 7.43 | 3 | C: the partner-B ring in the header. Passes 3:1; terracotta is never text | C |
| `terracotta` ring on `surface-raised` | 4.87 | 6.70 | 3 | C: the partner-B ring in a card | C |
| `line-strong` ring on `surface-sunken` disc | **2.93** | 4.10 | – | C: the neutral seat's inner edge. Decorative; its outer edge is 3.28 / 3.90 against the page, and the initial carries it | C |
| `line` on `surface` | 1.28 | 1.41 | – | hairlines. Decorative only, never a control boundary | A B C |

**Rejected after checking:** B's first idea was a deep `#1d4e89` door in both themes, to match the app icon:
- the door against the night surface was 2.16:1;
- the dark logo's Arabic mark inside it was 3.95:1;
- it made a second solid-blue shape that competes with the one majorelle primary.

B uses `majorelle-soft` instead (above). Every text pair passes 4.5:1 and every UI pair passes 3:1 in both themes.

---

## A · Name on the wall

### Preview
```
A · NAME ON THE WALL  the house's sign, big; nothing else
Young Serif 28 h1 · Figtree 15/13/12 · system palette
sand oklch(0.966 0.013 82.4) · ink oklch(0.254 0.028 269.2)
majorelle oklch(0.423 0.111 255.1) (primary + links only)
Signature: the bilingual lockup at 64 px, start-aligned
[mark | Zamane]                          (64 px lockup)
Set up your space
Your shared place… one starts, one joins.
╭ [house-plus] Start our space        › ╮
╰   I'm first. I'll invite my partner…   ╯
╭ [key-round]  Join with a code       › ╮
╰   My partner already started…          ╯
```

### Concept
The riad's street wall. These screens are the plain wall with the house's name painted large beside the door, and the IA's skeleton in the house's own components. The beauty is kept for inside.

### Style family
- **Taken from Minimal and Swiss** (styles.md, Family A): single column, start alignment, type and space doing the work.
- **Left out:** its neutral greys and grid-for-show. The surface is the system's sand.
- **Taken from Card-based, at 48 rem and up only:** the IA's raised form card.

### Type
- Fixed type as above.
- The only size the direction adds is the lockup: **64 px tall on signed-out phone screens and 80 px from 48 rem.** At 64 px that's 222 px wide, which fits 288 px of content at 320. It is the largest the mark appears anywhere in the app, so it leads on its own [content priority, IA §1].
- **On setup screens** (signed in) it drops to 40 px in a header row beside "Sara · Sign out". At 320 px, 222 + 110 px won't fit, and once you're signed in the name is a header, not a sign.

### Colour
| Name | Light | Dark | Role | Share of screen |
|---|---|---|---|---|
| sand (`surface`) | oklch(0.966 0.013 82.4) | oklch(0.199 0.015 261.6) | background | about 85% |
| raised | oklch(0.994 0.007 88.6) | oklch(0.243 0.019 262.1) | choice cards; the form card from 48 rem | about 8% |
| ink | oklch(0.254 0.028 269.2) | oklch(0.941 0.017 84.6) | text | – |
| ink-muted | oklch(0.486 0.023 269.9) | oklch(0.747 0.018 267.7) | helper, gloss, A7 | – |
| majorelle | oklch(0.423 0.111 255.1) | oklch(0.763 0.088 257.7) | the one primary, links, focus | about 3% |
| line-strong | oklch(0.621 0.025 78.1) | oklch(0.560 0.029 261.1) | field and card borders | – |

- **Dominance:** sand with one blue button. The logo's majorelle and saffron are the only other colour.
- **Dark mode:** the system's night courtyard, the `-dark` logo files, and nothing else changes. Ratios are in the shared table.

### Shape and space
- **Radii:**
  - `radius-md` 12 on fields and buttons;
  - `radius-lg` 20 on choice cards and the 48 rem form card;
  - no arch.
- **Borders:** `line-strong` 1 px on fields and choice cards (3.28 / 3.90).
- **Spacing:**
  - 16 px between fields;
  - 24 px between groups.
- **No divider rule** between "Sign in" and "New to Zamane?" (the IA sketch draws one). Instead there's a 32 px gap, because proximity already groups them [Gestalt; anti-generic: borders that encode nothing].
- **Columns:**
  - 24 rem for auth;
  - 36 rem for setup.
- **Density:** comfortable. The Sign in screen ends at about y = 550 at 375 × 667, so "Create an account" shows without scrolling (A1).

### Imagery and iconography
- **No pictures at all.** The lockup is the only image.
- **Lucide icons:**
  - `house-plus` for Start, `key-round` for Join, set bare at the card's start, 20 px, `ink-muted` (Home's prompt-row grammar, not an icon tile);
  - `chevron-right` at the end, which mirrors in RTL;
  - `wifi-off` and `circle-alert` in notices;
  - `chevron-left` for Back.

### Motion personality
- **Still.**
- **What moves:** only the shared route fade (160 ms opacity, none under reduced motion), the 0.98 press on buttons (120 ms) and the disclosure chevron (180 ms).
- **The one orchestrated moment is the hand-off, and it belongs to Home.** "Starting our space…" holds until the `201`, then the route fade lands on Home's `first-run`, where the invite card's `K7QM-4XPA` is Sara's payoff. Youssef's "Joining…" lands on "Hi, you two" and its AvatarPair.
- **What never moves:** the lockup, the fields, the cards, and the page on load.

### Signature element: "The name on the wall"
- **What:** the bilingual lockup set at 64 px, start-aligned, alone at the top of every signed-out screen. It's the same spot and size every time, so Sign in, Forgot and Check your email feel like one wall with different notices on it. On 48 rem screens it sits at 80 px on the column's start edge, above the card.
- **Logo use:**
  - `zamane-logo.svg` and `-dark.svg` on signed-out screens and setup;
  - the same lockup at 64 px, centred, on Launch.

### How the two setup cards read as equal
- **Same object:** two Home prompt rows (the first-run "Create a goal" family), so Sara meets the same object again on Home.
- **Same build:**
  - identical surface (`surface-raised`), border, radius and type;
  - an 18/24 600 title and a 15/22 `ink-muted` description;
  - one bare icon each, of the same size and colour.
- **Same height:** grid `grid-auto-rows: 1fr` keeps Start's extra "Only one of you starts." from making it taller.
- **No fill, no majorelle, nothing pre-selected** [IA A2; DSA].
- **Order:** Start, then Join (IA F6). Side by side from 40 rem.

### Key screen sketches
```
PHONE 375 · Sign in                      PHONE 375 · Set up your space
┌──────────────────────────────────┐     ┌──────────────────────────────────┐
│ [mark | Zamane]   ← 64 px, start │     │ [mark|Zamane] 40   Sara ‹Sign out›│
│                                  │     │                                  │
│ Sign in                          │     │ Set up your space                │
│ Email                            │     │ Your shared place for goals,     │
│ [sara@example.com             ]  │     │ trips and shopping. One of you   │
│ Password                         │     │ starts it; the other joins with  │
│ [••••••••••••          ][Show]   │     │ a code.                          │
│               ‹Forgot password?› │     │ ╭──────────────────────────────╮ │
│ [            Sign in           ] │←1°  │ │ [house-plus] Start our space ›│ │
│                                  │     │ │ I'm first. I'll invite my    │ │
│ New to Zamane?                   │     │ │ partner with a code.         │ │
│ [       Create an account      ] │     │ │ Only one of you starts.      │ │
│                                  │     │ ╰──────────────────────────────╯ │
│                                  │     │ ╭──────────────────────────────╮ │
│                                  │     │ │ [key-round] Join with a code ›│ │
│                                  │     │ │ My partner already started.  │ │
│                                  │     │ │ I have their code.           │ │
│                                  │     │ │                (equal height)│ │
│                                  │     │ ╰──────────────────────────────╯ │
│                                  │     │ Signed up as sara@example.com.   │
│                                  │     │ Not right? ‹Sign out› and create │
└──────────────────────────────────┘     └──────────────────────────────────┘

≥48rem · Sign in (1024)                          ≥48rem · Set up your space
┌──────────────────────────────────────────┐     ┌──────────────────────────────────────────────┐
│          [mark | Zamane]  80 px           │     │ [mark|Zamane]          Signed in as Sara ‹Sign out›│
│          ╭────────────────────────╮       │     │──────────────────────────────────────────────│
│          │ Sign in                │ raised│     │        Set up your space                     │
│          │ Email   [……………………]    │ r-lg  │     │        Your shared place for goals, trips…   │
│          │ Password[………… ][Show]  │ shadow│     │        ╭───────────────╮ ╭───────────────╮    │
│          │     ‹Forgot password?› │ -card │     │        │[house-plus]   │ │[key-round]    │    │
│          │ [       Sign in      ] │       │     │        │Start our space›│ │Join with a   ›│    │
│          ╰────────────────────────╯       │     │        │I'm first…     │ │code. My…      │    │
│          New to Zamane? ‹Create an account›│     │        ╰───────────────╯ ╰───────────────╯    │
└──────────────────────────────────────────┘     │        Signed up as sara@example.com…        │
                                                  └──────────────────────────────────────────────┘
At 48 rem the setup header is Home's top bar without its nav: the same height (60 px), lockup
position and hairline. When Sara lands on Home, only the nav appears; the sign stays put.
```
- **Join (phone):** the h1, the one-line instruction, then the 64 px code field in Home's `.code` style, then **Join space**. With the keyboard up at 320 × 568, the field, helper and button need about 180 px of the roughly 300 px left, so the primary stays visible (A8).
- **Launch:** the 64 px lockup centred on sand. "Loading Zamane" appears after 1 s.

### Tokens added
Layout only: `--lockup-hero: 64px`, `--lockup-hero-wide: 80px` and `--lockup-bar: 40px`. No colour.

### Risks
- **Brand fit:** the cover-the-logo test half-fails. Without the lockup, Sign in could belong to many calm apps. Young Serif and the sand carry some identity, but the screens are mostly the IA's skeleton.
- **A11y:** lowest risk. Every pair is from the shared table, and there's no motion to reduce.
- **Performance:** one SVG (25 KB, mostly C2PA metadata in `<metadata>`). The builders can strip that metadata in a copy for production; the source file stays untouched.
- **Build cost:** lowest. It reuses `zamane.css` as it is, plus three layout tokens.

---

## B · Doorway, opened

### Preview
```
B · DOORWAY, OPENED  the front door; Home opens through it
Young Serif 28 h1 · Figtree · system palette, no additions
sand oklch(0.966 0.013 82.4) · door majorelle-soft
oklch(0.928 0.020 257.5) · majorelle oklch(0.423 0.111 255.1)
Signature: an arch-shaped opening grows from the button
you pressed and Home appears inside it (400 ms)
              ╭──────────────╮   transom: the stacked logo
         ╭────╯ [stacked logo]╰────╮
         ╰─────────────────────────╯
         ╭───────────╮ ╭───────────╮
         │Start our ›│ │Join with ›│   two equal leaves
         ╰───────────╯ ╰───────────╯   of one door
```

### Concept
The riad's front door. Every screen before Home stands at the door:
- the big door on the ways in;
- the small door on the side errands;
- on Setup, a door of two equal leaves.

When you get in, the door opens and Home is inside.

### Style family
- **Taken from Editorial / Magazine** (one strong image per page, generous space).
- **Taken from Split-screen,** from 64 rem only (styles.md: "good for login").
- **Left out:** editorial's multi-column layouts, and the split-screen template's value-prop stack. The pane holds the door and one line, nothing to sell.

### Type
Fixed type as above. In the 64 rem pane, the one line under the door is Figtree 15/22 `ink-muted`: "Goals, trips and shopping, for you two." It's the Writer's call, and it names the app's real areas rather than offering a slogan. Nothing is set inside the door, by rule 2 of the arch ruling.

### Colour
| Name | Light | Dark | Role | Share of first screen |
|---|---|---|---|---|
| sand | oklch(0.966 0.013 82.4) | oklch(0.199 0.015 261.6) | background | about 70% |
| door (`majorelle-soft`) | oklch(0.928 0.020 257.5) | oklch(0.288 0.051 259.0) | the doorway's ground | about 15% |
| raised | oklch(0.994 0.007 88.6) | oklch(0.243 0.019 262.1) | the two leaves on Setup | about 12% on Setup |
| ink | oklch(0.254 0.028 269.2) | oklch(0.941 0.017 84.6) | text | – |
| ink-muted | oklch(0.486 0.023 269.9) | oklch(0.747 0.018 267.7) | helper, gloss, the pane line | – |
| majorelle | oklch(0.423 0.111 255.1) | oklch(0.763 0.088 257.7) | the one primary, links, focus | about 3% |

- **The door is the pale blue of a goal cover with no photo,** so it's the same object Goals uses, holding the house's name instead of a goal's initial. The primary stays the only solid majorelle shape [Von Restorff; DS "one primary per view"].
- **Dark mode:** the door becomes `majorelle-soft` dark, and the logo inside switches to `zamane-logo-stacked-dark.svg` (mark 6.70:1, wordmark 11.99:1 on the door). The door's edge against the page is decorative (1.12 / 1.27). Like Goals' arches, the picture inside carries it.

### Shape and space
- **The door uses the system's arch:** top corners 50% / 40%, bottom corners `radius-sm`. The door sizes:

  | Door | Size | Holds | Where |
  |---|---|---|---|
  | Big door | 8 × 10 rem (128 × 160 px, 4:5) | the stacked logo, 96 px wide | Sign in, Create account, Launch |
  | Small door (the *khoukha*) | 4 × 5 rem (64 × 80 px) | the mark only, 48 px wide | Forgot, Check your email, Reset, Link doesn't work, Password changed, Start, Join |
  | Transom | full column width; 5:2 on phones, capped at 10 rem tall | the stacked logo | Setup choice only, directly over the two leaves |

- **Leaves** (the choice cards):
  - `radius-lg`, `surface-raised`, 1 px `line-strong`;
  - an 8 px gap between them, like the seam of a double door;
  - their combined width equals the transom's width.
- **Placement:** the door is always centred in the column, with the content below it start-aligned.
- **The vertical budget at 375 × 667 for Sign in:**
  - safe area 20 + padding 24 + door 160 + 16;
  - h1 34 + 16;
  - two fields 78 + 16 + 78;
  - Forgot 44 + 8, Sign in 44 + 24;
  - "New to Zamane?" 30 + button 44.
  - Total: about 636 px. "Create an account" stays visible without scrolling (A1), and that's why the big door is no taller.

### Imagery and iconography
- **The door is the only picture.** It holds `zamane-logo-stacked.svg` or `-stacked-dark.svg`, or `zamane-mark.svg` or `-mark-dark.svg` in the small door. The logo sits low in the arch, as Goals' initials do (`padding-bottom: .16em` equivalent).
- **There are no icons on the leaves;** the transom is their image. A `chevron-right` sits at each leaf's bottom-end.
- **Notices** use the same icons as A.

### Motion personality
- **One deliberate move;** everything else is still.
- **The opening** (on every way into the house: Sign in to Home, Start to Home `first-run`, Join to Home "Hi, you two", and Launch to Home):
  1. On success, an arch-shaped opening appears at the pressed primary (on Launch, at the door itself).
  2. It grows to cover the viewport in **400 ms** (`--dur-fill`, `--ease-out`).
  3. Home is visible inside the opening as it grows. The auth page stays still behind it and is simply covered.
- **How:** a View Transition on the new root, with `clip-path` running from `inset(<button rect> round 50% 50% 6px 6px / 40% 40% 6px 6px)` to `inset(0 round 0)`. The origin is set as custom properties just before `startViewTransition`.
- **Reduced motion:** a 160 ms crossfade, with no shape.
- **Unsupported browsers** get the plain route.
- **What never moves:** the door itself (it never swings, scales, floats or animates on load), fields, leaves, and anything while a person is typing.

### Signature element: "The door opens where you knocked"
The arch-shaped opening that starts at the button you pressed and becomes Home.
- For Sara, the opening fills with her invite card and `K7QM-4XPA`.
- For Youssef, it fills with "Hi, you two" and both avatars.

It plays only when you actually get in, so it marks arrival, not decoration. It begins at the point of attention, not the screen's centre [Fitts: the eye is on the button].

### How the two setup cards read as equal
- **One door, two leaves.** The two cards are the leaves of one double door under a shared transom:
  - side by side from 22.5 rem;
  - the same width, height (grid `1fr 1fr`, rows `1fr`), surface, border and type;
  - no fill, no majorelle, nothing pre-selected.
- **The picture explains the choice:** a door with two leaves, one for each of you. Start is the inline-start leaf (the couple's story order, F6) and Join the inline-end leaf. Both mirror in RTL.
- **Below 22.5 rem (320 px)** the leaves stack under the transom, still the same width and height.
- **Text width** (it fits; see Risks):
  - at 360 px each leaf has about 136 px for text: "I'm first. I'll invite my partner with a code. Only one of you starts." in about 6 lines;
  - at 390 px, about 151 px.

### Key screen sketches
```
PHONE 375 · Sign in                      PHONE 390 · Set up your space
┌──────────────────────────────────┐     ┌──────────────────────────────────┐
│            ╭────────╮            │     │                   Sara ‹Sign out›│
│          ╭─╯        ╰─╮          │     │ Set up your space                │
│          │  [stacked  │ big door │     │ Your shared place for goals,     │
│          │    logo]   │ 8×10 rem │     │ trips and shopping. One of you   │
│          ╰────────────╯          │     │ starts it; the other joins.      │
│ Sign in                          │     │       ╭────────────────────╮     │
│ Email                            │     │  ╭────╯   [stacked logo]   ╰───╮ │
│ [sara@example.com             ]  │     │  ╰─────────────────────────────╯ │ transom 5:2
│ Password                         │     │  ╭─────────────╮ ╭─────────────╮ │
│ [••••••••••••          ][Show]   │     │  │Start our    │ │Join with a  │ │
│               ‹Forgot password?› │     │  │space        │ │code         │ │
│ [            Sign in           ] │←1°  │  │I'm first.   │ │My partner   │ │ leaves:
│                                  │     │  │I'll invite  │ │already      │ │ equal,
│ New to Zamane?                   │     │  │my partner   │ │started. I   │ │ 8 px seam
│ [       Create an account      ] │     │  │with a code. │ │have their   │ │
└──────────────────────────────────┘     │  │Only one of  │ │code.        │ │
                                         │  │you starts. ›│ │            ›│ │
                                         │  ╰─────────────╯ ╰─────────────╯ │
                                         │ Signed up as sara@example.com.   │
                                         │ Not right? ‹Sign out› and create │
                                         └──────────────────────────────────┘

PHONE 390 · Join (small door)            THE OPENING · Join space → Home (400 ms)
┌──────────────────────────────────┐     ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│ ‹ Back          Youssef ‹Sign out›│     │ Join with a code │ │ Join with ╭──╮   │ │Mon 9 Nov    (S)(Y)│
│              ╭──╮                │     │ [ K7QM-4XPA    ] │ │ [ K7Q╭────╯Hi╰─╮ │ │Hi, you two        │
│              │mk│ small door     │     │ [  Joining…    ] │ │ [ Jo│ you two │ │ │Saved together     │
│              ╰──╯ 4×5 rem        │     │                  │ │     ╰─────────╯ │ │0 MAD              │
│ Join with a code                 │     │   0 ms: pressed  │ │ 200 ms: the arch │ │ 400 ms: Home,    │
│ Enter the code your partner      │     │   then 200 OK    │ │ grows from the   │ │ door fully open  │
│ shared. It looks like K7QM-4XPA. │     └──────────────────┘ │ button           │ └──────────────────┘
│ Invite code                      │                          └──────────────────┘
│ [ K7QM-4XPA                    ] │ 64 px, Home's .code
│ You can paste the whole message. │
│ [          Join space          ] │←1°
│ No code yet? ‹Start our space›   │
└──────────────────────────────────┘

≥64rem · Sign in (1440): the brand pane          48–64rem: the phone layout in a centred 24 rem
┌───────────────────────────┬───────────────────────────┐    column; the big door sits above the h1.
│                           │                           │    Setup at 48 rem: transom over the
│        ╭──────────╮       │   Sign in                 │    side-by-side leaves in a 36 rem column.
│     ╭──╯          ╰──╮    │   Email   [……………………………]  │
│     │                │    │   Password[……………… ][Show] │
│     │ [stacked logo] │    │        ‹Forgot password?› │
│     │   18 × 22.5 rem│    │   [        Sign in      ] │
│     ╰────────────────╯    │   New to Zamane?          │
│  Goals, trips and         │   ‹Create an account›     │
│  shopping, for you two.   │                           │
└───────────────────────────┴───────────────────────────┘
  pane: sand, no fill change and no hairline between the halves; the form is 24 rem,
  vertically centred, on sand (no card).
```
- **Launch:** the big door, centred, with nothing else on screen. When `/api/me` resolves to Home, the opening grows from the door itself. Launch shows only without a cache (A3), so this is rare and never a delay: the opening starts when the data is ready.

### Tokens added
Layout and motion only:
- `--door-w: 8rem; --door-ratio: 4 / 5;`
- `--door-sm-w: 4rem;`
- `--transom-ratio: 5 / 2; --transom-max-h: 10rem;`
- `--door-pane-w: 18rem;`
- `--dur-open: var(--dur-fill);`

No colour.

### Risks
- **The arch rule.** The transom sits directly over the two cards, and the opening starts at a button, so this is the closest any direction comes to "never buttons or cards". The cards and button themselves are never arched.
  - **Transom:** if you read the rule strictly, add 16 px between the transom and the leaves so the door picture and the choices read as separate things.
  - **Opening:** start it from the viewport centre instead of the button.
- **A11y:**
  - **Reduced motion** is handled with the crossfade.
  - **Text zoom:** at 200% the leaves need about 270 px each. A container query stacks them when a leaf's inline size drops under 9 rem, whatever the viewport.
  - **Focus:** focus isn't moved during the opening; Home focuses its h1 as specified.
- **The keyboard during the opening.** On Join and Sign in the keyboard is up when Enter is pressed. As it hides, the visual viewport grows during the 400 ms, which can make the opening jump. The fix is to `blur()` the field on submit, before the transition.
- **Browser support** [VERIFY on real phones]:
  - Same-document View Transitions are in Chrome, Edge and Safari 18+, and Firefox only recently.
  - Cross-document transitions (auth.html to home.html) need Chrome 126+ or Safari 18.2+, and **don't run over `file://`**.
  - The prototype should simulate the opening inside `auth.html`, showing `home.html?state=…` in an `<iframe>` under the clip, then navigate. Without that, the prototype shows only the fade.
- **Vertical cost.** The big door costs 176 px on Sign in, the most common screen [research: the returning case]. It fits A1 at 375 × 667 with about 30 px to spare. At 320 × 568, "Create an account" needs a short scroll.
- **Brand fit:** strongest continuity with Goals (the user chose B · Doorway there). The door and a goal cover are deliberately the same object.
- **Build cost:** medium. It needs one clip-path View Transition, three door sizes and the iframe simulation.

---

## C · Two seats

### Preview
```
C · TWO SEATS  your seat fills as you go; your partner's waits
Young Serif 28 h1 · Figtree · system palette + AvatarPair
sand oklch(0.966 0.013 82.4) · majorelle-soft oklch(0.928
0.020 257.5) · terracotta-soft oklch(0.922 0.028 46.1)
Signature: the empty dashed seat beside yours; it becomes
Home's (S)(Y) the moment Youssef joins
[mark | Zamane]                Sara ‹Sign out›
Set up your space                        (S)
╭ (S)(◌)  Start our space               › ╮
╰         I'm first. I'll invite my partner ╯
╭ (●)(S)  Join with a code              › ╮
╰         My partner already started…     ╯
```

### Concept
Two first names, side by side. Before Home, the only picture is the pair of seats in your space:
- yours, which fills as soon as you type your name;
- your partner's, which waits, dashed, until they join.

### Style family
- **Taken from Minimal / single-column,** in the same structure as A.
- **Taken from the design system's own components** as the signature: PartnerAvatar and AvatarPair, plus the "ideas look lighter than commitments" grammar (a dashed outline means "not yet").
- **Left out:** any illustration, arch or pane.

### Type
- Fixed type as above.
- The lockup is 48 px tall on signed-out phone screens (167 px wide) and 56 px from 48 rem. It still heads every screen, but it's smaller than A's because the people lead on Setup.
- On setup screens it's 40 px in the header row.
- Seat initials are Figtree 600 (the PartnerAvatar's face): 15 px in 40 px seats and 13 px in 32 px seats. Arabic and other scripts take the first grapheme from `Intl.Segmenter`, set in the system fallback.

### Colour
| Name | Light | Dark | Role | Share |
|---|---|---|---|---|
| sand | oklch(0.966 0.013 82.4) | oklch(0.199 0.015 261.6) | background | about 85% |
| raised | oklch(0.994 0.007 88.6) | oklch(0.243 0.019 262.1) | choice cards | about 8% |
| ink / ink-muted | oklch(0.254 0.028 269.2) / oklch(0.486 0.023 269.9) | oklch(0.941 0.017 84.6) / oklch(0.747 0.018 267.7) | text | – |
| majorelle | oklch(0.423 0.111 255.1) | oklch(0.763 0.088 257.7) | primary, links, focus; **partner-A ring** | about 3% |
| majorelle-soft | oklch(0.928 0.020 257.5) | oklch(0.288 0.051 259.0) | partner-A seat ground | under 1% |
| terracotta / terracotta-soft | oklch(0.559 0.137 40.0) / oklch(0.922 0.028 46.1) | oklch(0.736 0.120 41.9) / oklch(0.286 0.046 38.6) | partner-B ring and ground, **in seats only** | under 1% |
| sunken + line-strong | oklch(0.928 0.023 82.1) + oklch(0.621 0.025 78.1) | oklch(0.172 0.012 260.6) + oklch(0.560 0.029 261.1) | the neutral seat (role not chosen yet); the dashed empty seat | – |

- **Partner colours appear only in seats,** which are avatars, and they mean exactly what Home means: majorelle is the one who started, terracotta the one who joined.
- **Before a role exists,** the person's seat is neutral: `ink` initial (12.81 / 16.05) on `surface-sunken` with a `line-strong` ring. So no partner colour is claimed before it's true.
- **Dark mode:** the system's seat tokens. Every ratio is in the shared table.

### Shape and space
- **Seats** are pills:
  - 40 px in headers and cards, 32 px beside the First name label;
  - overlapping by 8 px, as in Home's AvatarPair;
  - a 2 px ring.
- **The empty seat** has a 2 px *dashed* `line-strong` ring with no fill, no letter and no plus sign. It isn't interactive.
- **Choice cards:** `radius-lg`, `surface-raised`, 1 px `line-strong`. The pair sits at the card's start, with the title and description after it.
- **Header seats** sit at the end of the h1's row on phones (Home's "Hi, Sara (S)" masthead), and directly after the h1 from 48 rem (Home's wide masthead).
- **No arch.** Spacing and columns are as in A.

### Imagery and iconography
- **The seats are the only imagery.** They're `aria-hidden`, because the text says everything they show [WCAG 1.1.1, 1.4.1].
- **No icons on the cards;** the seats replace them. Lucide icons are used in notices and for Back, as in A.
- **Logo:** `zamane-logo.svg` or `-dark.svg` everywhere; Launch uses the 48 px lockup centred.

### Motion personality
- **Settling:** small moves, short distances, and only when something is true.
- **The orchestrated moment: "the seat fills."**
  1. **Youssef presses Join space** and the `200` returns the space and Sara's first name. (IA F8.4's announcement "You joined {partnerName}'s space." already needs that name.)
  2. **Sara's initial lands in the waiting partner-A seat:** a 160 ms fade and 0.9-to-1 scale of the "S", with no travel.
  3. **After a 240 ms hold,** the page replaces to Home.
  4. **On Home,** the pair, now (S)(Y), takes the same place in the masthead beside "Hi, you two." Where View Transitions exist, the pair carries over as a shared element (`view-transition-name: pair`) in 240 ms (`--dur-sheet`, `--ease-out`). It travels a short way, because both sit at the masthead's end.
- **For Sara:**
  1. "Starting our space…", then the `201`.
  2. Her seat is already majorelle, and the dashed seat stays dashed.
  3. Home `first-run` takes over. Her (S) carries to Home's single header avatar, and the dashed seat fades out in 160 ms.
  4. The waiting seat is the invite card's job from there.
- **Create account:** the seat's initial updates on `input` with no animation. Letters appearing as you type need none.
- **Reduced motion:** the initial appears with no scale, there's no hold, and the route fade runs as usual.
- **What never moves:** the dashed seat (no pulse, no "waiting" shimmer), the cards, fields and lockup.

### Signature element: "The seat that waits"
The pair of seats, made from Home's own avatars.
- **On Create account:** your initial appears beside "First name" as you type. "As your partner will see it." stops being an abstract promise.
- **On each setup card:** the pair shows where you'll sit:
  - **Start:** your seat first, with a dashed one waiting.
  - **Join:** someone's seat already filled in majorelle, with yours second in terracotta.
- **On Join's success:** the waiting seat receives Sara's initial, and the pair becomes Home's (S)(Y).

### How the two setup cards read as equal
- **Same object:** each card leads with the same object, a pair of two 40 px seats.
- **Mirrored content:**
  - **Start:** (S, majorelle)(dashed). You first, and room for your partner.
  - **Join:** (filled majorelle, no letter)(S, terracotta). Your partner is already there; you sit second.
  - The only difference is which seat is yours, which is the actual difference between the two choices.
- **A non-verbal cue for the top risk** [research risk 1, R1]. A joiner looking at "My partner already started" also sees a seat that's already taken.
- **Same build:** the same size, surface, border and type, with equal height via grid. No fill, no majorelle button, nothing pre-selected. Order: Start, then Join. Side by side from 40 rem.
- **The colour meaning** is the one Home uses everywhere afterwards, so the choice teaches the house's attribution once.
- **Colour is never the only cue.** The position (first or second seat) and the text carry it too [WCAG 1.4.1].

### Key screen sketches
```
PHONE 375 · Create account               PHONE 390 · Set up your space
┌──────────────────────────────────┐     ┌──────────────────────────────────┐
│ [mark | Zamane]  ← 48 px         │     │ [mark|Zamane] 40   Sara ‹Sign out›│
│                                  │     │ Set up your space            (S) │ neutral seat
│ Create your account              │     │ Your shared place for goals,     │
│ First name                 (S)   │ seat│ trips and shopping. One of you   │
│ [Sara                         ]  │ 32px│ starts it; the other joins with  │
│ As your partner will see it.     │     │ a code.                          │
│ Email                            │     │ ╭──────────────────────────────╮ │
│ [sara@example.com             ]  │     │ │ (S)(◌)  Start our space    › │ │ S: majorelle
│ Password                         │     │ │ I'm first. I'll invite my    │ │ ◌: dashed
│ [••••••••••            ][Show]   │     │ │ partner with a code.         │ │
│ At least 10 characters.          │     │ │ Only one of you starts.      │ │
│ [        Create account        ] │←1°  │ ╰──────────────────────────────╯ │
│ [Have a code from your partner?] │     │ ╭──────────────────────────────╮ │
│ Have an account? ‹Sign in›       │     │ │ (●)(S)  Join with a code   › │ │ ●: majorelle,
│ By creating an account… ‹Privacy›│     │ │ My partner already started.  │ │    no letter
└──────────────────────────────────┘     │ │ I have their code.           │ │ S: terracotta
 empty name: the seat is dashed, no      │ ╰──────────────────────────────╯ │
 letter; it never shows "?"              │ Signed up as sara@example.com.…  │
                                         └──────────────────────────────────┘

PHONE 390 · Join → success → Home (Youssef's phone)
┌──────────────────────────────┐ ┌──────────────────────────────┐ ┌──────────────────────────────┐
│ ‹ Back    Youssef ‹Sign out› │ │ ‹ Back    Youssef ‹Sign out› │ │ Mon 9 Nov                    │
│ Join with a code     (●)(Y)  │ │ Join with a code     (S)(Y)  │ │ Hi, you two          (S)(Y)  │
│ Enter the code your partner  │ │ Enter the code your partner  │ │ Saved together               │
│ shared. It looks like K7QM-… │ │ shared…                      │ │ 0 MAD                        │
│ Invite code                  │ │ Invite code                  │ │ Nothing saved yet. Create a  │
│ [ K7QM-4XPA                ] │ │ [ K7QM-4XPA                ] │ │ goal to start counting.      │
│ [        Joining…          ] │ │ [        Joining…          ] │ │ (Home's joined-empty state;  │
│ No code yet? ‹Start our…›    │ │                              │ │  Home owns the announcement) │
└──────────────────────────────┘ └──────────────────────────────┘ └──────────────────────────────┘
  pressed, waiting for the 200      +160 ms: "S" lands in the        +400 ms: replace to Home; the
                                    waiting seat; 240 ms hold        pair carries over (VT) or fades

≥48rem · Set up your space (1024)
┌──────────────────────────────────────────────────────────────────────┐
│ [mark|Zamane] 40                         Signed in as Sara ‹Sign out›│
│──────────────────────────────────────────────────────────────────────│
│            Set up your space (S)                                      │
│            Your shared place for goals, trips and shopping.           │
│            One of you starts it; the other joins with a code.         │
│            ╭───────────────────────────╮ ╭───────────────────────────╮│
│            │ (S)(◌)                    │ │ (●)(S)                    ││
│            │ Start our space         › │ │ Join with a code        › ││
│            │ I'm first. I'll invite my │ │ My partner already        ││
│            │ partner with a code.      │ │ started. I have their     ││
│            │ Only one of you starts.   │ │ code.                     ││
│            ╰───────────────────────────╯ ╰───────────────────────────╯│
│            Signed up as sara@example.com. Not right? ‹Sign out›…      │
└──────────────────────────────────────────────────────────────────────┘
 Sign in from 48 rem: A's layout without the card. The 56 px lockup and the 24 rem form sit
 on sand; there are no seats, because the person isn't known yet.
```
- **Start (phone):** "Start our space (S)(◌)" at the top, then the IA 5.6 fields.
- **The F9 switch** ("Join your partner's space"): the header shows the person's current majorelle seat. The confirmation is the shared danger alertdialog, and the seats don't change until it's confirmed.

### Tokens added
Layout only:
- `--seat: 40px; --seat-sm: 32px; --seat-overlap: 8px;`
- the dashed ring as `2px dashed var(--line-strong)`;
- `--lockup-hero: 48px; --lockup-hero-wide: 56px; --lockup-bar: 40px`.

No colour.

### Risks
- **The dashed outline gets a second meaning.** The system reserves it for "a trip Place, a maybe". An empty seat is also a "not yet", so the meaning holds, but the user should confirm the extension.
- **The Join card shows Sara in terracotta,** a colour she'll never have. It's a preview of a path she won't take. If testing shows people reading the colours as "me" rather than "where I'd sit", drop the colour from the person's own seat in the cards and keep it only on the filled partner seat. Position still carries it.
- **A11y:**
  - Seats are `aria-hidden`, so nothing new is announced.
  - The live initial is decorative; the field's own value is what screen readers get.
  - The terracotta ring on sand is 4.48. It passes 3:1 as a graphic and is never text.
- **Data:** the join success needs the partner's first name in the response, which F8.4 also needs. If the response lacks it, the seat fills with the neutral style and no letter, and Home does the reveal.
- **Browser support:** the cross-document shared element needs `view-transition-name` on Home's AvatarPair, which is a one-line addition to Home's CSS that Home's owner must accept. Over `file://` the prototype shows the in-place fill and the route fade, which carry the moment on their own.
- **Brand fit:** strong for "a private space for two" and "Hi, you two". Weaker on "the brand mark leads" than A or B, because the 48 px lockup is the smallest of the three.
- **Build cost:** low to medium. It reuses PartnerAvatar and AvatarPair, plus one dashed variant and a 160 ms fill.

---

## Tells audit
I asked of each direction: cover the logo, and could this belong to any of ten other products? Then I counted the tells.

**A · Name on the wall: 4 found, 2 replaced, 2 kept**
1. **Divider rule between the returning and new paths** (IA sketch): *replaced* with a 32 px gap. The rule encoded nothing that proximity doesn't.
2. **Centred login card with a soft shadow, from 48 rem:** *kept*. It is the IA's layout and the house's one raised-card style (GoalCard, tiles). There's one per screen, so it isn't "identical cards everywhere". It holds the 24 rem column on a wide sand field.
3. **Icon above or beside a title above grey text, repeated:** *kept, changed in form*. There are only two, the icons are bare (no rounded tile) and inline as in Home's prompt rows, and the two repeat because they're the two equal choices.
4. **Cover-the-logo test:** *half fails*. With the lockup covered, Sign in reads as "calm app on cream". That's the honest price of the lowest-risk option; the sand is the system's, not a fashion choice.

**B · Doorway, opened: 4 found, 2 replaced, 2 justified**
1. **Split-screen login with a brand pane** (the SaaS template): *justified* at 64 rem only. The pane holds one picture, the house's door, plus one concrete line naming the three areas. There's no carousel, no stock photo, no testimonial and no feature list.
2. **The tagline under the door could become a vague triad:** *replaced* with the app's three real areas ("Goals, trips and shopping, for you two."). That's a list of things that exist, not "Fast. Secure. Simple." The Writer owns it.
3. **Decorative shape as hero** (the arch for its own sake): *replaced*. The door always holds the logo, and there's no empty arch outline anywhere.
4. **A showy transition:** *justified*. It runs once per arrival, only on real success, from the point of attention, in 400 ms, with reduced-motion and no-support fallbacks.
- **Cover-the-logo test: passes.** The door, its two leaves and the opening are this product's.

**C · Two seats: 3 found, 1 replaced, 2 justified**
1. **The dashed circle placeholder** (the generic "add teammate" empty state): *replaced* by removing what makes it generic. There's no plus, no "Invite" text and no hover, and it isn't interactive. It's the system's "not yet" outline, not a call to action.
2. **Avatars as decoration:** *justified*. Each one shows something true:
   - your name as your partner will see it;
   - which seat each choice gives you;
   - the moment your partner arrives.
3. **Identical radii:** *justified*. The radii follow the system's roles: pills for seats, `radius-lg` for cards, `radius-md` for fields and buttons.
- **Cover-the-logo test: passes.** A two-seat choice and a seat that fills exist only because Zamane is for exactly two people.

**Shared:**
- **Fonts:** Young Serif and Figtree are the system's, not template fonts.
- **Palettes:** no purple gradient, glass, blob or neon. The cream-and-terracotta "tasteful AI" palette is the system's sand, and terracotta is held to partner B's avatars only.
- **Layout and copy:** no eyebrows or kickers, no trailing arrows on links (the chevrons mark whole-card links), no emoji. Copy is the IA's working copy, with no "seamless" or "unlock".

---

## Recommendation
**C · Two seats.** It works best for this brief, for reasons from `research.md`:

1. **It works on the top risk.** The research puts the joiner starting his own space as risk 1, "the single biggest wrong-path risk". C is the only direction where the two cards *show* the difference:
   - Join's card has a seat that's already taken;
   - Start's has an empty one waiting.

   Research's assumption test 1 (3 of 3 joiners pick Join) gets a picture of "my partner already started", not only the words. A and B make the cards equal; C makes them equal *and* self-explaining.
2. **It keeps the common case fastest.** Returning sign-in is the frequent job (job 4; A1: "password manager fills, one tap, through"). C's Sign in is as short as A's, with no door costing 176 px and no 400 ms opening on every sign-in.
3. **It answers the display-name point.** Research says to differentiate with "Your first name, with a hint that your partner will see it". C shows the initial your partner will see as you type it.
4. **It ends exactly where Home begins.** The pair becomes Home's existing (S)(Y) beside "Hi, you two" with no redesign of Home, and Sara's dashed seat hands over to the invite card's "Waiting for your partner to join."
5. **It's cheap.** It reuses PartnerAvatar and AvatarPair, adds no colour and no new shape, and its moment still works over `file://`.

**What C gives up:**
- **The brand leads less loudly than in A or B.** If the user wants the mark louder, C can take A's 64 px lockup on signed-out screens with no other change. It fits A1 at 375 × 667 (about y = 565).
- **B suits the user's taste.** The user picked B · Doorway for Goals, and B is the strongest continuation of that metaphor. If brand presence outweighs the wrong-path cue for them, choose **B**, with its strict-rule fallbacks: a 16 px gap under the transom, and the opening starting from the viewport centre.
- **A** is the safe floor. It's worth picking only if build time is the constraint.

---

## Assumptions
- **Invite link:** `research.md` lists invite links as out of scope, but `decision.md` (Q2) puts the invite link `/join#code=K7QM-4XPA` (prototype `#/join`) in v1. I followed decision.md. In every direction, the "with code" Create account adds the IA's notice; C also shows the Join pair (●)(◌) in it.
- **The join response** includes the partner's first name. IA F8.4's announcement already needs it. C degrades if it doesn't (Risks).
- **Logo SVGs carry about 15 to 25 KB of C2PA `<metadata>`.** Shipping copies without it is a build concern; the source files stay as they are.
- **Lucide names:** `house-plus`, `key-round`, `wifi-off`, `circle-alert`, `chevron-left` and `chevron-right` are current names [VERIFY against the pinned Lucide version].

## For other roles
- **Director:**
  - No direction adds a colour token.
  - The layout and motion tokens are listed per direction, for the system record.
  - The arch ruling (four tests) should go in the decision if B is chosen.
- **Writer:**
  - B's pane line;
  - C's First-name helper, which could become "This is how your partner will see you." next to the seat (the IA has "As your partner will see it.");
  - every direction: the Launch status line.
- **Home:**
  - (C) Optionally keep a dashed seat beside Sara's (S) on `first-run` until the partner joins, then fill it live with F8.4's realtime notice. That's Home's call.
  - (B and C) A one-line `view-transition-name` (root for B, `pair` for C) would let the cross-document moment land. Without it the moment still degrades well.
- **Builders:**
  - Swap the logo files with two `<img>`s per theme, not `<picture media>`.
  - View Transitions don't run over `file://`. Either serve the prototype from `localhost` or simulate in-page (B: an iframe under the clip).
  - Set the manifest's `background_color` to `#f8f3ea` so the OS splash matches Launch.
  - On submit, `blur()` the focused field before any transition (keyboard resize).
- **Architect / IA:**
  - On Start with the keyboard up in Space name, the primary sits about 260 px below the field. Enter submits implicitly, which is fine, but the A8 rule only covers the *last* field. Confirm that's the intent.
