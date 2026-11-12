# Directions: Profile and Settings with a stronger zellige identity

Rendered and checked in Edge (light + dark) via `motif-test.html` in this folder: it holds the shared motif CSS and a mock of each direction's couple card + code. Open it to see all three side by side. Tokens are the design-system ones from `../shopping/zamane.css` (nothing new except the `--zl-*` motif variables below).

## The subject's world (collected before choosing)

1. **Zellige workshop**: the *maalem* draws the geometry with a compass first (circles, 8-fold rays), then cuts glazed terracotta squares into small pieces (khatam stars, crosses, kites) and sets them face-down in plaster. The grout is the thin line between pieces.
2. **A set tile**: a single square of glaze with a bevelled edge, separated from its neighbours by a plaster gap.
3. **A tile-seller's sample board**: pieces in a limited glaze palette (here: majorelle, terracotta, saffron, zellige-green) pinned side by side.
4. **Medina signage and tickets**: enamelled number plates, a hammam / ferry slip with notches and a perforation.
5. **The brand's own geometry**: the logo is hand-lettered in two glazes (majorelle + saffron); the nav marker is a 45-degree rotated square. A rotated square over an upright square *is* the khatam, so the motif below is built from the brand's own diamond, not imported.

## The motif (shared by all three directions)

**Geometry.** Khatam = an upright square and the same square turned 45 degrees: a 16-vertex 8-point star {8/2}. In a 48-unit module the star has outer radius 24 (tips touch the module edge, so tips meet tip-to-tip along both axes) and inner radius 18.37. When tiled on a square grid the gaps between stars are 4-point crosses: the classic **star-and-cross tessellation** appears without drawing a second shape. Two glazes (star, cross) plus a grout line.

**Symbol (single star, `currentColor`, for ornaments and bullets).** Put once near the top of the app shell; use with `<svg class="star" aria-hidden="true"><use href="#zl-star"/></svg>`.

```html
<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
  <symbol id="zl-star" viewBox="0 0 48 48">
    <path d="M48 24L40.97 31.03 40.97 40.97 31.03 40.97 24 48 16.97 40.97 7.03 40.97 7.03 31.03 0 24 7.03 16.97 7.03 7.03 16.97 7.03 24 0 31.03 7.03 40.97 7.03 40.97 16.97Z"/>
  </symbol>
</svg>
```
```css
.star{width:1em;height:1em;fill:currentColor;flex:none}   /* size with font-size */
```

**Tiling field (CSS mask, themes for free, dark mode needs no second asset).** Two masks (star fill, star grout line) painted in token colours. `.zl` is the engine; each direction only sets four variables.

```css
:root{
 --zl-star-fill:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'%3E%3Cpath d='M48 24L40.97 31.03 40.97 40.97 31.03 40.97 24 48 16.97 40.97 7.03 40.97 7.03 31.03 0 24 7.03 16.97 7.03 7.03 16.97 7.03 24 0 31.03 7.03 40.97 7.03 40.97 16.97Z'/%3E%3C/svg%3E");
 --zl-star-line:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'%3E%3Cpath fill='none' stroke='black' stroke-width='1.5' d='M48 24L40.97 31.03 40.97 40.97 31.03 40.97 24 48 16.97 40.97 7.03 40.97 7.03 31.03 0 24 7.03 16.97 7.03 7.03 16.97 7.03 24 0 31.03 7.03 40.97 7.03 40.97 16.97Z'/%3E%3C/svg%3E");
}
.zl{--zl-u:48px;--zl-gap:var(--surface-sunken);--zl-glaze:var(--majorelle-soft);--zl-grout:var(--line);
  position:relative;isolation:isolate;background:var(--zl-gap)}          /* gap colour = the cross-shaped pieces */
.zl::before,.zl::after{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;
  -webkit-mask-size:var(--zl-u) var(--zl-u);mask-size:var(--zl-u) var(--zl-u);
  -webkit-mask-position:center;mask-position:center}
.zl::before{background:var(--zl-glaze);-webkit-mask-image:var(--zl-star-fill);mask-image:var(--zl-star-fill)}
.zl::after{background:var(--zl-grout);-webkit-mask-image:var(--zl-star-line);mask-image:var(--zl-star-line)}
@media (forced-colors:active){.zl::before,.zl::after{display:none}}      /* pattern disappears, layout holds */
```
Always `aria-hidden="true"` on the `.zl` element and never put text inside it directly (see contrast rules). `--zl-glaze` accepts a gradient, so one row can switch glaze mid-way (used in A and B). No animation anywhere; reduced motion needs no handling.

**Contrast rule for text over the motif** (all via `contrast.mjs`): text never sits on a saturated glaze. It sits on a plate (`surface-raised` / `surface-sunken`) or directly on a `*-soft` token field.

| Pair | Light | Dark |
|---|---|---|
| ink on majorelle-soft | 12.84 | 11.99 |
| ink on terracotta-soft | 12.50 | 12.22 |
| ink on zellige-soft | 13.17 | 11.49 |
| ink on saffron-soft | 13.66 | 11.16 |
| ink-muted on majorelle-soft | 5.16 | 6.33 |
| ink-muted on terracotta-soft | 5.03 | 6.45 |
| ink on surface-raised (plates, tiles) | 15.61 | 13.76 |
| ink-muted on surface-raised | 6.27 | 7.27 |
| ink on surface-sunken (slip, stub) | 12.81 | 16.05 |
| ink-muted on surface-sunken | 5.15 | 8.48 |
| ink on line (code well in B) | 11.25 | 10.86 |
| majorelle-ink on majorelle-soft | 8.88 | 9.07 |
| terracotta-ink on terracotta-soft | 6.12 | 8.16 |
| line-strong on surface-raised (ghost button border, plate edge; UI >= 3) | 3.57 | 3.51 |
| on-majorelle on majorelle (Copy code) | 8.39 | 8.23 |

Findings that changed the design: terracotta as *text* on the page fails in light (4.48:1 on surface), so partner B's name and tags use `terracotta-ink`, never `terracotta`; terracotta is only a fill (avatar, frieze, circle stroke). `line-strong` on `surface-sunken` is 2.93:1 (light) / 4.10 (dark), so the slip/stub frame is **decorative only** and the digits carry the information. Saffron on raised is 2.10:1: saffron appears only as a decorative ornament (never text, never the sole signifier). Zellige green and saffron here are glazes, not status; zellige appears at most as a `zellige-soft` strip.

---

## Direction A: Grounded. "Khatam stamp"

**Concept.** The couple card is a stamped tile: a single frieze of stars (Sara's glaze to the left, Youssef's to the right, one saffron star where they meet) over a chamfer-cut card, and the invite code is a slip in a double grout frame. Everything below it is calm, un-carded forms separated by a grout rule with a star in the middle.

**Style family.** Editorial/crafted-minimal from `styles.md`: take the quiet type-led layout and generous space; leave any texture or full-bleed pattern. Identity lives in three small objects (frieze, slip, rule).

**Type.** Young Serif (display: h1, couple name, section h2 at 22/28), Figtree 400/600 (text, labels). Existing system scale (28/34 title-lg, 22/28 section, 15/22 body, 13 label, 12 caption), so ratio stays the system's roughly 1.25. Code: system mono stack `ui-monospace, "Cascadia Mono", Consolas, monospace`, 30/36, weight 600, `letter-spacing:.14em`, tabular. Blend check: serif only for headings, sans for everything else; no third face. Link: `https://fonts.googleapis.com/css2?family=Figtree:wght@400;600&family=Young+Serif&display=swap` (the app already loads both).

**Color.** All existing tokens. Dominant: `surface` (sand) page, `surface-raised` card. Accents by proportion: majorelle (primary action, star rule), terracotta (partner B only: avatar + right half of the frieze), saffron (the single meeting star and the two slip ornaments), `surface-sunken` (slip). Dark: the same token names swap to the dark values (frieze becomes `#8fb4ea` / `#e98f6c` / `#f2bb4e`, readable and calm on `#1b2029`). Ratios in the shared table; digits ink on sunken 12.81 / 16.05.

**Shape and space.** 10px **chamfered** corners on the couple card and the slip (45-degree cuts, via clip-path), 1px grout edge `line-strong`; buttons and fields keep the system's 12px radius. Forms are un-carded sections on the page, 32px apart, with a grout rule between them. 8-px rhythm, single column to 48rem, then a 2-column grid: sticky section list (left, 220px) + content (right, max 560px).

**Imagery and icons.** No imagery. Icons: existing Icon.tsx set (outline, 1.75 stroke), only on buttons (copy, refresh). No icon-in-circle rows.

**Motion.** None required. Optional single moment: when the partner joins, the right half of the frieze changes from grout-grey to terracotta (200ms colour fade, `prefers-reduced-motion` = instant). Nothing else moves.

**Signature element.** The **two-glaze frieze**: a row of 24px khatam stars along the top of the couple card, left half majorelle, right half terracotta, one saffron star at the seam. In solo, the right half is grout-grey (`--line`) stars: the empty tiles are the partner not yet set.

```css
.chamf{--c:10px;padding:1px;background:var(--line-strong);
  clip-path:polygon(var(--c) 0,calc(100% - var(--c)) 0,100% var(--c),100% calc(100% - var(--c)),calc(100% - var(--c)) 100%,var(--c) 100%,0 calc(100% - var(--c)),0 var(--c))}
.chamf>.in{background:var(--surface-raised);--c2:calc(var(--c) - .41px);
  clip-path:polygon(var(--c2) 0,calc(100% - var(--c2)) 0,100% var(--c2),100% calc(100% - var(--c2)),calc(100% - var(--c2)) 100%,var(--c2) 100%,0 calc(100% - var(--c2)),0 var(--c2))}
@media (forced-colors:active){.chamf{clip-path:none;padding:0;border:1px solid CanvasText}.chamf>.in{clip-path:none}}
.frieze{--zl-u:24px;height:24px;--zl-gap:var(--surface-raised);--zl-grout:transparent;
  --zl-glaze:linear-gradient(90deg,var(--majorelle) 0 calc(50% - 12px),var(--saffron) 0 calc(50% + 12px),var(--terracotta) 0)}
.frieze.solo{--zl-glaze:linear-gradient(90deg,var(--majorelle) 0 calc(50% - 12px),var(--saffron) 0 calc(50% + 12px),var(--line) 0)}
.slip{display:flex;align-items:center;justify-content:center;gap:12px;padding:14px 12px;background:var(--surface-sunken);
  border:1px solid var(--line-strong);outline:1px solid var(--line-strong);outline-offset:-5px}   /* double grout frame */
.slip .star{color:var(--saffron);font-size:14px}
.slip .code{margin:0;font:600 30px/36px ui-monospace,"Cascadia Mono",Consolas,monospace;letter-spacing:.14em;font-variant-numeric:tabular-nums}
.rule{display:flex;align-items:center;gap:10px;margin-block:24px 16px}               /* between sections */
.rule::before,.rule::after{content:"";flex:1;height:1px;background:var(--line)}
.rule .star{font-size:12px;color:var(--majorelle)}
```
```html
<div class="chamf"><div class="in">
  <div class="zl frieze" aria-hidden="true"></div>
  <!-- name, members row, slip, buttons -->
  <div class="slip"><svg class="star" aria-hidden="true"><use href="#zl-star"/></svg>
    <p class="code" dir="ltr" data-testid="invite-code">K7QM-4XZP</p>
  <svg class="star" aria-hidden="true"><use href="#zl-star"/></svg></div>
</div></div>
<div class="rule" aria-hidden="true"><svg class="star"><use href="#zl-star"/></svg></div>
```

**Couple card layout.** Frieze, then space name (Young Serif 22), members side by side (avatar, name, "partner A/B" caption in `terracotta-ink` for B), then slip, then Copy code (primary) + New code (ghost). Solo: the slip becomes the hero (36/44 digits, full width, "Send this code to your partner" above it), the second member slot reads "Waiting for your partner" with an outline-only (grout) avatar.

**Invite code treatment.** One slip, double grout frame, saffron stars flanking, digits ink on sunken. The `<p data-testid="invite-code">` keeps its plain text `K7QM-4XZP`.

**Section/card edges.** Couple card and slip: chamfered, grout hairline. Other sections: no card; a grout rule with a star between sections; h2 in Young Serif.

**Key screen sketch (390px, populated).**
```
 Profile
 ★★★★★★★◆▲▲▲▲▲▲▲      <- frieze: A glaze | saffron | B glaze
/ Sara & Youssef        \
| (S) Sara    (Y) Youssef|
| ╔═══════════════════╗ |
| ║ ✦  K7QM-4XZP   ✦ ║ |
| ╚═══════════════════╝ |
| [Copy code] [New code]|
\_______________________/
 ───────────── ✦ ─────────────
 You  / name field / [Save]
 ───────────── ✦ ─────────────
 Appearance · Security · About
```

**Risks.** Clip-path drops `box-shadow` (use `filter: drop-shadow` on the wrapper if needed; skip it, grout edge is enough). Forced colors: handled (border fallback). Build cost: low (one wrapper, one mask class, one symbol). Brand fit: safest.

**Preview block.**
```
A · KHATAM STAMP      Young Serif + Figtree
majorelle oklch(0.42 0.11 255)  terracotta oklch(0.55 0.13 40)  saffron oklch(0.78 0.14 82)
sand oklch(0.96 0.015 85)  ink oklch(0.24 0.03 265)
signature: two-glaze star frieze (A | saffron | B); empty grout stars when solo
 ★★★★★◆▲▲▲▲▲       Sara & Youssef
┌─────────────┐   ╔═══════════╗
│ (S)   (Y)   │   ║ ✦ K7QM-4XZP ✦ ║   ── ✦ ──  calm, un-carded forms
└─────────────┘   ╚═══════════╝
```

---

## Direction B: Bold. "Set tiles"

**Concept.** The couple card opens on a field of real star-and-cross tessellation in two glazes, one for each partner, meeting down the middle; the invite code is two physical set tiles with grout between them. This is the most literal answer to "tile, grout, glaze".

**Style family.** Crafted / material-skeuo-lite from `styles.md`: take bevel, plate and tile objects; leave textures, gradients and shadows beyond one inset highlight. The forms below stay flat.

**Type.** Same faces as A. Couple name Young Serif 28/34 (title-lg) on the card; section h2 22/28. Code: mono 600, 32/38, `.12em`. The grout bars under headings use no type. Blend: unchanged, serif for display only.

**Color.** Tokens only. Field: `majorelle-soft` stars on `surface-raised` crosses (left half), `terracotta-soft` right half (partner B glaze only). Saffron: the diamond between the code tiles. `zellige-soft` appears only as the 8px heading strip (decorative glaze, never a status). Code well: `line`; tiles: `surface-raised` with an inset highlight and a `surface-sunken` bottom bevel. Dark: all `*-soft` darken (`#1b2b44`, `#3e2219`, `#15332a`), field reads as inlaid glaze on `#1b2029`; the tile highlight is dropped (use `inset 0 1px 0 rgba(255,255,255,.06)`). Text ratios: names on plates ink/raised 15.61 / 13.76; digits on tile the same; plate edge `line-strong` 3.57 / 3.51 (UI pass).

**Shape and space.** Couple card: radius 12, `overflow:hidden`, field 104px tall; names sit on **plates** (raised, 1px `line-strong`, radius 6, 3px raised outline that cuts the field like a mortar gap) overlapping the field's lower edge; the code tiles are radius 3 (a tile, not a button). **Form cards stay plain** (radius 12, 1px `line`, no pattern) with a single 8px zellige-soft khatam strip under each h2, so identity on forms is the heading only. 48rem+: full-width couple card, then a 2x2 card grid (You, Appearance, Security, About and sign out), no sticky list.

**Imagery and icons.** None; existing outline icons on buttons only.

**Motion.** One moment: Copy code presses the tiles in (`translateY(1px)` + remove the bottom bevel, 120ms = `--dur-press`), then returns. Reduced motion: no transform, the label changes to "Copied" as today. The field never moves.

**Signature element.** The **two-tile invite code**: `K7QM` and `4XZP` are two bevelled tiles set in a grout-coloured well with a saffron diamond between them, because `formatInviteCode` is already two groups of four. The hyphen stays in the text for copy/paste and tests but is visually the diamond.

```css
.pf-field{--zl-u:40px;--zl-gap:var(--surface-raised);--zl-glaze:var(--majorelle-soft);height:104px}  /* + class zl */
.pf-field .half{position:absolute;inset:0 0 0 50%;z-index:-1;background:var(--terracotta-soft);
  -webkit-mask:var(--zl-star-fill) center/40px 40px;mask:var(--zl-star-fill) center/40px 40px}
.pf-field .half.solo{background:var(--line)}          /* partner not joined: unglazed */
.plate{background:var(--surface-raised);border:1px solid var(--line-strong);border-radius:var(--radius-sm);
  padding:6px 12px 6px 6px;outline:3px solid var(--surface-raised);margin-top:20px}
.tiles{display:flex;justify-content:center;align-items:center;gap:8px;margin:0;padding:8px;background:var(--line);border-radius:var(--radius-sm);
  font:600 32px/38px ui-monospace,"Cascadia Mono",Consolas,monospace;letter-spacing:.12em;font-variant-numeric:tabular-nums}
.tiles .g{background:var(--surface-raised);color:var(--ink);padding:10px 8px 10px 14px;border-radius:3px;
  box-shadow:inset 0 1px 0 #fff8,inset 0 -2px 0 var(--surface-sunken),inset 0 0 0 1px var(--line-strong)}
.tiles .dia{width:8px;height:8px;background:var(--saffron);transform:rotate(45deg);flex:none}
.tiles .sep{position:absolute;width:1px;height:1px;overflow:hidden}          /* the hyphen, kept for copy + a11y */
.hbar{--zl-u:16px;--zl-gap:transparent;--zl-glaze:var(--zellige-soft);--zl-grout:var(--line);height:8px;margin-top:6px}
@media (max-width:22.4375rem){.tiles{font-size:26px;line-height:32px}}        /* 320px: tiles shrink, never wrap */
@media (forced-colors:active){.tiles{background:Canvas;border:1px solid CanvasText}.tiles .g{border:1px solid CanvasText;box-shadow:none}.plate{border-color:CanvasText}}
```
```html
<div class="card">
  <div class="zl pf-field" aria-hidden="true"><span class="half"></span></div>
  <div class="plates"><div class="plate">…Sara…</div><div class="plate">…Youssef…</div></div>
  <div class="body">
    <h2>Sara &amp; Youssef</h2>
    <p class="tiles" dir="ltr" data-testid="invite-code"><span class="g">K7QM</span><span class="dia" aria-hidden="true"></span><span class="sep">-</span><span class="g">4XZP</span></p>
    …buttons…
  </div>
</div>
<h2>You</h2><div class="zl hbar" aria-hidden="true"></div>
```

**Couple card layout.** Field (104px) on top, two name plates straddling its bottom edge (A left, B right, mirrored), then name, tiles, buttons. Solo: right half is unglazed grout-grey, the B plate becomes a dashed "Waiting for your partner" plate, and the tiles scale up (40/46) to be the hero with "Send this code to your partner" above.

**Invite code treatment.** Two set tiles in a grout well, saffron diamond between; the visible hyphen is replaced by the diamond, the text remains.

**Section/card edges.** Couple card: 12 radius with the field clipped inside. Form cards: plain hairline `line`, radius 12. Headings: serif + 8px strip of zellige-soft stars.

**Key screen sketch (390px, populated).**
```
┌──────────────────────────┐
│ ✚✦✚✦✚✦✚✦✚│▒✦▒✦▒✦▒✦▒✦▒ │  field: A glaze | B glaze
│  ┌────────┐  ┌─────────┐ │
│  │(S) Sara│  │Youssef(Y)│ │  plates overlap the field edge
│  └────────┘  └─────────┘ │
│  Sara & Youssef          │
│  ┌──────┐ ◆ ┌──────┐    │
│  │ K7QM │   │ 4XZP │    │  set tiles in grout
│  └──────┘   └──────┘    │
│  [Copy code] [New code]  │
└──────────────────────────┘
 You            ▪▫▪▫▪▫▪▫▪▫   <- 8px strip
 ┌──────────────────────┐
 │ name field   [Save]  │
 └──────────────────────┘
```

**Risks.** Highest identity but biggest chance of "theme park": limited by keeping the pattern to one 104px field, an 8px strip and the code. Field must stay `aria-hidden` with no text on it (plates carry the names). 320px: two 4-char tiles at 26px = about 250px, fits. Build cost: medium (plates, tiles, two masks; two testid-safe span structures). Mask uses `-webkit-` prefixes; all current browsers fine. Terracotta stays partner B only (right half, avatar).

**Preview block.**
```
B · SET TILES         Young Serif + Figtree
majorelle-soft oklch(0.93 0.025 255)  terracotta-soft oklch(0.91 0.03 50)
saffron oklch(0.78 0.14 82)  grout/line oklch(0.89 0.025 85)  ink oklch(0.24 0.03 265)
signature: invite code as two bevelled set tiles in a grout well, saffron diamond between
 ✚✦✚✦✚✦│▒✦▒✦▒✦▒     two glazes meet in tessellation
 (S) Sara   Youssef (Y)    <- plates
 ┌─K7QM─┐ ◆ ┌─4XZP─┐
```

---

## Direction C: Unexpected. "Compass and template"

**Concept.** Before there is a tile there is the maalem's drawing. The couple card is a drawing-board sheet: two overlapping circles (Sara in majorelle, Youssef in terracotta) whose shared lens holds a star, over faint 8-fold construction rays; the invite code is a notched ticket with a perforation. Zellige as geometry and craft, not as colour.

**Style family.** Technical / blueprint-editorial from `styles.md`: take hairline linework, ruler ticks and notched stubs; leave the cold blue paper, monospace everything and grids as wallpaper. Kept warm by sand surfaces and saffron.

**Type.** Young Serif for h2 and the couple name, Figtree for text and the member names. Code mono 600 30/36. Small ruler-tick under each heading (CSS only). Blend: the same two families; mono only for the code.

**Color.** Tokens only. Lines: majorelle (circle A), terracotta (circle B, partner B only), `line` (construction rays), `line-strong` (ticks, sheet edge), saffron-soft fill + saffron-ink stroke on the lens star (decorative). Surfaces: `surface-raised` sheet, `surface-sunken` stub. Dark: strokes swap to `#8fb4ea` / `#e98f6c`, rays `#2b323e`, stub `#0d1015` (ink 16.05:1). No glaze fills over text, so it is the safest direction for contrast.

**Shape and space.** **Square** sheet (radius 0, 1px `line-strong` edge) with a 10px ruler tick row along the top edge; the stub has diamond notches (9px) at mid-height on both sides; form sections are open (no cards) with a ruler-tick underline beneath the h2. Buttons/fields keep the system radius. 48rem+: sheet left (sticky, 360px) with the sections scrolling on the right: the couple's sheet stays in view while you edit.

**Imagery and icons.** One inline SVG drawing, no photo. Existing outline icons on buttons.

**Motion.** One moment: when the partner joins (or on first load of a joined space) the second circle draws itself in (`stroke-dasharray` 600ms ease-out, once). Reduced motion: static. Nothing else moves.

**Signature element.** **The lens.** Two circles overlapping so their intersection is a vesica (the maths that builds the star), with the 8-point star centred in it, scaled so it fills the lens. Solo: Youssef's circle is dashed `line-strong` (not yet drawn), the lens star is outline-only.

```html
<svg class="lens" viewBox="0 0 240 120" aria-hidden="true">
  <g class="ray"><path d="M120 4V116M60 60H180M32 14 208 106M208 14 32 106"/></g>   <!-- 8-fold construction rays -->
  <circle class="ca" cx="92" cy="60" r="44"/><circle class="cb" cx="148" cy="60" r="44"/>
  <path class="eye" transform="translate(120 60) scale(1.3)"
        d="M14 0L9.9 4.1 9.9 9.9 4.1 9.9 0 14 -4.1 9.9 -9.9 9.9 -9.9 4.1 -14 0 -9.9 -4.1 -9.9 -9.9 -4.1 -9.9 0 -14 4.1 -9.9 9.9 -9.9 9.9 -4.1Z"/>
</svg>
```
```css
.lens{display:block;width:100%;height:auto;max-height:150px;margin-block:8px}
.lens *{vector-effect:non-scaling-stroke}
.ray{stroke:var(--line);stroke-width:1;fill:none}
.ca{stroke:var(--majorelle);stroke-width:2;fill:none}
.cb{stroke:var(--terracotta);stroke-width:2;fill:none}   .cb.solo{stroke:var(--line-strong);stroke-dasharray:5 4}
.eye{fill:var(--saffron-soft);stroke:var(--saffron-ink);stroke-width:1.5}
.board{position:relative;background:var(--surface-raised);border:1px solid var(--line-strong);padding:16px;overflow:hidden}
.board::before{content:"";position:absolute;inset:0 0 auto;height:10px;                /* ruler ticks on the top edge */
  background:repeating-linear-gradient(90deg,var(--line-strong) 0 1px,transparent 1px 8px);
  -webkit-mask:linear-gradient(#000 0 40%,transparent 40%);mask:linear-gradient(#000 0 40%,transparent 40%)}
.stub{--n:9px;background:var(--surface-sunken);padding:14px 16px 12px;text-align:center;
  clip-path:polygon(0 0,100% 0,100% calc(50% - var(--n)),calc(100% - var(--n)) 50%,100% calc(50% + var(--n)),100% 100%,0 100%,0 calc(50% + var(--n)),var(--n) 50%,0 calc(50% - var(--n)))}
.stub .code{margin:0;font:600 30px/36px ui-monospace,"Cascadia Mono",Consolas,monospace;letter-spacing:.14em;font-variant-numeric:tabular-nums}
.stub .perf{border:0;border-top:2px dotted var(--line-strong);margin:10px 0}            /* tear line above the buttons */
.hd2{display:grid;gap:4px}.hd2::after{content:"";height:5px;border-bottom:1px solid var(--line-strong);
  background:repeating-linear-gradient(90deg,var(--line-strong) 0 1px,transparent 1px 8px)}   /* heading ruler */
@media (forced-colors:active){.ca,.cb,.ray,.eye{stroke:CanvasText}.eye{fill:Canvas}.stub{clip-path:none;border:1px solid CanvasText}.board::before{display:none}}
```
Class named `.board` (not `.sheet`: `.sheet` is the app's bottom-sheet class; `.plate`, `.tiles`, `.stub` etc. should also be prefixed `pf-` in the port).

**Couple card layout.** Sheet: couple name, the lens drawing, A on the left and B on the right under their own circles, then the stub (code, perforation, buttons). Solo: dashed B circle, stub first ("Send this code to your partner").

**Invite code treatment.** A ticket stub: notched sides, sunken fill, digits ink 30/36 on 12.81 / 16.05; dotted perforation separates the code from Copy code / New code.

**Section/card edges.** Square sheet with ruler ticks; no cards for forms, heading ruler under each h2.

**Key screen sketch (390px, populated).**
```
┌|||||||||||||||||||||||||┐   ruler ticks
│ Sara & Youssef           │
│     ╱ ╲╱ ╲               │
│    ( A  ✦  B )           │  two circles, star in the lens, rays behind
│     ╲ ╱╲ ╱               │
│ (S) Sara     Youssef (Y) │
│◀ K7QM-4XZP              ▶│  notched stub
│ ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈ │
│ [Copy code] [New code]   │
│ You                      │
│ |||||||||||||||||||||||| │  heading ruler
└──────────────────────────┘
```

**Risks.** Least literally tile-like; reads as geometry, which may under-deliver "zellige identity" for someone expecting colour and grout. The lens is too abstract to read as a couple for some. Moderate build cost (one SVG, clip-path); a11y is the easiest (no text over pattern). Blueprint cliché risk if the lines get cold: keep sand surfaces.

**Preview block.**
```
C · COMPASS AND TEMPLATE   Young Serif + Figtree
majorelle oklch(0.42 0.11 255)  terracotta oklch(0.55 0.13 40)  saffron-soft oklch(0.95 0.05 85)
line oklch(0.89 0.025 85)  sunken oklch(0.93 0.025 85)
signature: two circles whose lens holds a star; ticket-stub invite code
 |||||||||||||||||||
   ( A ✦ B )         <- construction rays behind
 ◀ K7QM-4XZP ▶       <- notched stub, perforation below
 [Copy code] [New code]
```

---

## Tells audit

| Tell | A | B | C |
|---|---|---|---|
| Default rounded-card grid with shadow | Replaced: chamfer + grout hairline, no shadow | Form cards are standard rounded cards: **kept** on purpose, identity limited to couple card/code/headings (restraint rule) | Replaced: square sheet |
| Settings list with chevrons / icon circles | None | None | None |
| Gradient / glass | One hard-stop gradient inside the mask (a glaze split), not a visual gradient | None | None |
| Pattern as wallpaper | No | Field is 104px on one card, 8px strips; not behind forms | Rays are 1px at low contrast inside one sheet |
| Arabic/Moroccan cliché (arch, lamp, script) | None; no arch | None; no arch | None; circles only |
| Zellige green as status | Not used | `zellige-soft` as decoration in the 8px strip only | Not used |
| Terracotta not for partner B | Right half of frieze = B | Right glaze = B | Circle B = B |
| Saffron overuse | One star + ornaments | One diamond | Lens fill only |
| Stock font pairing | Serif display + sans text is the system; kept | same | same |
| Shadow soup | None | One inset tile bevel (necessary for a "set tile") | None |
| Raster images | None | None | None |

Remaining justified tells: B's rounded form cards (system consistency), and the serif+sans pairing (system rule).

## Recommendation

**B (Set tiles), built with A's restraint.** The brief's strongest asks are "set-tile invite code", "grout" and "two partner colours as two glazes meeting in the pattern". Only B delivers all three literally, and the code is already two groups of four (`formatInviteCode`), so two tiles is a natural fit, not a gimmick. Research of the product (the page is visited rarely, to share the code) says the code is the thing worth making memorable, and B makes it the most memorable object on the page. Keep the page calm the way A does: the pattern lives in one 104px field, the code and an 8px strip under headings, form cards stay plain, and the 2x2 grid at 48rem+ replaces a sticky list. A is the fallback if the field feels heavy in review: swap the field for A's frieze (same `.zl` engine, `--zl-u:24px`, 24px tall) and keep the tiles. C is the one to choose only if the user wants zellige as craft/geometry rather than colour and tile.

Port notes (the caller needs these): keep `data-testid="invite-code"` on the element whose `textContent` is `K7QM-4XZP` (B keeps the hyphen inside a visually-hidden `.sep`, so exact-text tests still pass); name classes with a `pf-` prefix (`.sheet` already exists); the 320px size is checked only by arithmetic, verify it in the prototype. Test mock: `C:/Users/HamzaBouhali/Documents/Zamane/.ux-forge/profile/motif-test.html` (the `oklch()` values in the preview blocks are approximations of the hex tokens for display only; the real tokens are the hex ones).
