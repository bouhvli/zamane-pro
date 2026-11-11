# Build notes: Zamane nav bar

**Prototype:** `.ux-forge/nav-bar/nav-bar.html`. Open it in a browser. The hash routes `#/home`, `#/goals`, `#/trips`, `#/shopping` and `#/profile` switch screens. `?focus=<screen>` puts keyboard focus on a nav item for screenshots.
**Screenshots:** `.ux-forge/nav-bar/screenshots/{home,small,focus,profile}/`

## Direction in one line
**"The ز dot":** a calm, solid bar in the sand-and-hairline language of the design system. The one mark of "you are here" is the diamond dot from the logo's ز, sitting on the bar's hairline above (on phones) or below (wider screens) the current destination.

## Anatomy

| | Phones (< 48 rem) | ≥ 48 rem (iPad portrait and up) |
|---|---|---|
| Position | `position: fixed` bottom, above `safe-area-inset-bottom` | inside the sticky 60 px top bar, after the logo |
| Ground | `surface`, 1 px `line` hairline on top | `surface`, 1 px `line` hairline below |
| Items | 5 equal grid columns, icon over label, 64 px tall | icon beside label, 44 px tall, centred in the 60 px bar. Profile is pushed to the far end. |
| Icon | 24 px Lucide, 1.75 stroke | 20 px Lucide ("20px in rows") |
| Label | `label` style 13/18 · 600 (12/16 below 360 px so "Shopping" never truncates) | `label` style 13/18 · 600 |
| Logo | not shown (each screen carries its own title) | `assets/zamane-logo(-dark).svg` at 36 px tall, links to Home |

Destinations: **Home** (`house`) · **Goals** (`goal`) · **Trips** (`map`) · **Shopping** (`shopping-basket`) · **Profile** (your initial on your partner tint).

## States

| State | Treatment | Why |
|---|---|---|
| Rest | `ink-muted` icon and label (5.8:1 light, 8.1:1 dark) | secondary, per the design system |
| Hover (pointer only) | `ink` | the design system's own nav hover |
| Pressed | icon or avatar scales to 0.92 for 120 ms (only if reduced motion is off) | instant feedback [Norman, INP] |
| Current | `majorelle` icon and label (7.6:1 / 8.5:1), icon stroke 2.25, **the ز dot** (an 8 px square turned 45°, in `majorelle`) on the hairline; `aria-current="page"` | Majorelle and grey have almost the same lightness (1.3:1 light, 1.06:1 dark), so colour alone fails [WCAG 1.4.1]. The dot's shape and the heavier stroke are the non-colour cues, and the dot is 7.6:1 against the bar [1.4.11]. |
| Focus | 2 px `majorelle` outline. On phones it's inset 2 px inside the 64 px column; in the top bar it sits 2 px outside the 44 px item. | DS focus ring [2.4.7], with no overlap onto neighbours |
| Forced colours | dot becomes `Highlight`; the current label is underlined | stays visible in Windows high-contrast mode |
| Tap the current tab | scrolls back to top (smooth unless reduced motion) | iOS and Android convention [Jakob] |
| After navigation | focus moves to the new screen's `h1` (`tabindex="-1"`), and `document.title` updates | screen readers announce the change |

## Accessibility checks
- One `<nav aria-label="Main">` in the `<header>`, a list of `<a href>` links, `aria-current="page"` on the current one. It is not an ARIA tablist: these are page destinations, not tabs.
- Skip link to `#main`. The nav comes first in DOM order on every layout. On phones it's visually at the bottom, so keyboard users meet it first, and the skip link jumps past it.
- Targets: 64–78 × 64 px on phones, ≥ 70 × 44 px in the top bar [2.5.8].
- Focus can't hide behind the bar: `scroll-padding-bottom` is the bar plus safe area plus 16 px on phones, and `scroll-padding-top` is 76 px above that [2.4.11].
- Contrast was checked with `contrast.mjs` in both themes (numbers above). The avatar initial `majorelle-ink` on `majorelle-soft` is 8.9:1 light and 9.1:1 dark.

## Deviations from the design system (proposed additions)
1. **New tokens:** `--nav-bar-h` 64px, `--top-bar-h` 60px, `--nav-icon` 24px, `--nav-icon-inline` 20px, `--nav-link-inline-h` 44px, `--nav-mark` 8px, `--dur-press` 120ms (the existing button value), `--dur-mark` 180ms, `--ease-out`.
2. **PartnerAvatar inside the nav:** its ring is drawn in `currentColor` (1.75 px, or 2.25 px when current) instead of the partner colour. Otherwise Sara's majorelle ring made Profile look selected all the time. The partner tint stays in the fill and initial.
3. **The ز dot** becomes the system's "current location" marker. It's kept to the nav, so it never competes with the Home countdown's saffron moment, and it's majorelle, not saffron, because saffron is 2.1:1 on light grounds.

## Porting to the React app (after Phase 1)
- `src/client/components/AppNav.tsx`: the same markup, with `<Link to="/goals">` from TanStack Router. Confirm the active `<Link>` emits `aria-current="page"` (TanStack Router documents this). The CSS keys off that attribute and needs no JS state.
- Move "focus the `h1` on route change" into a small router-level hook.
- Load the logo via `src/client/assets/brand/` per ARCHITECTURE.md.

## Seen and not seen
- Seen: 320, 375, 390, 768 and 1440 px, light and dark, with Home, Shopping and Profile as the current tab, and the focus state at 390, 768 and 1440 px.
- Not seen: real safe-area insets (notch and home indicator; desktop Chrome doesn't emulate them), iOS Safari rendering, forced-colours mode, hover.

## For other components (outside this job)
- **TripCountdown at 320 px:** "Chefchaouen" (title-lg, 28 px serif) overflows the card, and "20,250 MAD" wraps in the total card. Both are design-system components, not the nav.
