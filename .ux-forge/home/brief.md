# Brief: Zamane Home

**Mode:** studio. The Director writes the brief and IA, then builds. The Art Director and Writer work in parallel, then the Critic and Accessibility reviewers in parallel.

## Request
Design the Home screen of the Zamane PWA: the first thing either partner sees on opening the app. Deliver a working standalone HTML prototype covering every state in `ia.md`, plus the quick-add sheet. It's built on the existing design system and the nav bar from `.ux-forge/nav-bar/`, ready to port to React once the app is scaffolded.

## Primary users
Two partners in one shared space, each on their own phone. They open Home many times a week, for a few seconds at a time: "how are we doing?", "when do we leave?", "I just got paid, put 500 in the wedding fund". Desktop is occasional.

## The one success action
**Add to a goal in seconds.** Tap, pick the goal (or have it pre-picked), type the amount, done, with clear feedback and undo.

The second job is a 5-second glance that answers: how much have we saved, how close are our goals, when is the next trip, and is there shopping to do. [Krug]

## Platform and stack
- Mobile-first installable PWA, 320 px and up, safe areas. Offline reads from the persisted cache.
- **Adding a goal entry works offline**: it's queued and synced later (ARCHITECTURE.md §9).
- Realtime: the partner's changes appear without a refresh.
- Target stack: React 19 + TanStack Router/Query (not scaffolded yet). The prototype is plain HTML, CSS and a little JS.
- Data: one `GET /api/home` gives total saved, open and done counts, the closest goals (at most 3), the next trip's raw dates, shopping items left, and the goals available for quick add. Trip status is computed on the device.

## Brand constraints (binding)
- `Zamane Design System.html`: tokens, type scale, components (Button, PartnerAvatar, AvatarPair, Progress, GoalCard, TripCountdown), voice, icons (Lucide 1.75).
- Its Home rules:
  - Total saved leads, in `numeral`.
  - The countdown is the **only saffron block**.
  - Closest to done: three goals at most.
  - **"Add to a goal" is the only majorelle button.**
  - Attribution on every card.
  - The arch is for imagery only.
- Nav: `.ux-forge/nav-bar/nav-bar.html` with its build notes, reused as is.
- Logo files in `assets/` are read-only.

## Assumptions
- "Progress on open goals" (product brief) is shown as the open and done counts plus the closest-to-done cards. Mixing money and percent goals into one aggregate bar would be meaningless.
- The greeting is "Hi, you two" once both partners are in. Before the partner joins it's "Hi, Sara", and Home shows the invite.
- No push notifications, badges or activity feed in v1. Live updates appear in place, through the attribution lines.
- Example data comes from the design system's own Home mock and the seed couple (Sara and Youssef, MAD). Nothing is invented as "real".
