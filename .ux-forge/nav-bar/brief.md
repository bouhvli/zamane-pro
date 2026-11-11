# Brief: Zamane app nav bar

**Mode:** solo (one component). The Director does structure, build and review; no subagents.

## Request
Design the primary navigation for the Zamane PWA: the bar that moves a partner between the app's areas. The deliverable is a working, standalone HTML prototype built strictly on the existing design system, ready to port into the React app (TanStack Router) once Phase 1 has scaffolded it.

## Users and the one success action
- **Who:** two partners, each on their own phone, often one-handed, often in a hurry: at the shop, on a trip, on the sofa. Desktop is secondary (planning a trip, writing a journal note).
- **Success action:** reach any area in one tap from anywhere, always knowing where you are. [Krug: "where am I?"; Fitts: thumb zone]

## Destinations (IA, plane 3)
Five, in this order, taken from the design system's Home mock (`ph-tabs`) and ARCHITECTURE.md §1:
1. **Home**: totals, next trip, closest goals, quick add
2. **Goals**: money and general goals
3. **Trips**: plan, places, prep
4. **Shopping**: the shared list
5. **Profile**: you, the space and invite code, theme (the brief calls this area "Account"; the design system labels it "Profile", and the design system wins)

No sixth "add" button in the bar. Each screen owns its one primary action (design system: "Primary (majorelle) once per view"), and a global add would compete with it. [Hick; Von Restorff]

## Platform and stack
- Mobile-first installable PWA, 320 px and up, with safe-area insets (notch, home indicator).
- Target stack (not scaffolded yet): React 19 + TanStack Router, links rendered as `<Link>` with `aria-current="page"`. The prototype uses plain HTML, CSS and a little JS with hash routes so it stands alone.

## Brand constraints (from `Zamane Design System.html`, binding)
- Tokens: `surface`, `line`, `ink`, `ink-muted`, `majorelle`, `majorelle-soft`, `saffron`…, light and dark, and `data-theme` overrides.
- Type: Figtree for UI. Tabs use the **label** style (13/18, 600). Young Serif only at 24 px and up, never on controls.
- Icons: Lucide outline, 1.75 px stroke.
- The arch is for **imagery only**, never buttons or cards, so it is not used in the nav.
- Saffron is "time and celebration": one saffron moment per screen, and it is never text on light grounds (2.1:1).
- Focus: 2 px solid majorelle outline.
- Logo files in `assets/` are read-only and are referenced, not copied.

## Assumptions
- Labels follow the design system mock: Home, Goals, Trips, Shopping, Profile.
- Icons: `house`, `goal`, `map`, `shopping-basket`. For Profile, the signed-in partner's avatar with their partner-colour ring, because attribution ("who did what, always") is the system's core idea.
- Mobile (< 48 rem): a fixed bottom tab bar. ≥ 48 rem (iPad portrait and up): a sticky top bar with the logo on the left and Profile on the right, following iPadOS 18 and desktop web conventions. [Jakob]
- No badges in v1. Realtime changes already show up in the lists themselves, and a notification dot would need "last seen" tracking the architecture doesn't have.
