# Brief: Zamane Goals area (list, goal detail, create/edit)

**Mode:** department-lite.
- Steps: Architect → (Writer ∥ Art Director) → user picks a direction → Director builds the shared layer and the list ∥ front-end engineers build the detail and form → (Critic ∥ Accessibility) → at most 2 fix rounds.
- No Researcher: the product brief already fixes the features.
- No Design Systems role: the tokens exist; small additions are recorded in the build notes.

## Request
Design the Goals area of the Zamane PWA as three connected screens, and deliver a working standalone HTML prototype of each, linked into a flow:

1. **Goals list** (the Goals tab): every goal in the space, open and done, money and percent.
2. **Goal detail:** one goal's progress, its **entries** (who added what and when, with an optional note; deletable), its **journal** (notes from both partners, each an ordered mix of text and photo blocks) and its **stats** (number of entries, total, average, largest, this month's total, most recent activity, each partner's share).
3. **Create and edit goal:**
   - **Create** asks for the kind (money or percent), a title (the only field required, except that a money goal also needs a target amount), and optionally a target date, a description and a cover photo.
   - **Edit** changes the same fields except the kind, which is fixed after creation, and holds **delete goal**.

## Users and success actions
The same couple as Home, Sara (partner A) and Youssef (partner B), each on their own phone.
- **List:** "How are all our goals doing, and which one do I open?" Success means picking the right goal in one glance and one tap.
- **Detail:**
  - "Add to this goal" is the primary action, through the floating button on phones, as on Home.
  - "What happened lately, and who put in what?"
  - "Write a note or add a photo to our journal."
- **Create:** "Start a goal in seconds." Name it, add a target if it's money, done. Everything else is optional and folded away. [design system principle: quick capture]

## Platform and stack
- Mobile-first PWA, 320 px and up, light and dark, safe areas.
- Offline: **adding an entry works offline** and syncs later; everything else on these screens needs a connection, and the UI says so (ARCHITECTURE.md §9). Realtime: the partner's changes appear without a refresh.
- **Uploads:** covers and journal photos go straight to Cloudinary, need a connection, and are shown in the design system's arch.
  - With uploads disabled (`uploadsEnabled: false`), every upload control is hidden: covers fall back to the title's initial, and journal notes are text-only.
- **Edits:** they use `updatedAt`. If the partner changed the goal first, the API returns **409** and the UI must handle it.
  - Deleting an entry recomputes completion: a goal can become not-done again.
- **Target stack:** React 19 + TanStack Router/Query (not scaffolded yet). The prototypes are plain HTML, CSS and a little JS.

## Brand constraints (binding)
- **Design system:** `Zamane Design System.html`: tokens, type, components (GoalCard, Progress, PartnerAvatar, Button), voice and icons.
  - "Numbers are earned, not typed": totals always come from history, and the history is one tap away.
  - The arch is for imagery only.
  - Saffron is for completed-goal moments and time.
  - Zellige means done.
  - Danger is for destructive actions, always confirmed.
- **Established patterns, reused:**
  - **Nav bar:** `.ux-forge/nav-bar/`.
  - **Home:** `.ux-forge/home/`, direction B, built in `home.html`, with these patterns:
    - the floating primary at the bottom-right on phones;
    - the masthead primary on wide screens;
    - the quick-add sheet and the toast with Undo;
    - live updates without a toast;
    - and its copy (`copy.md`, `decision.md`).
- **Logo files** in `assets/` are read-only.

## Example data
- **From the design system and Home:**
  - Wedding fund: 14,250 of 20,000 MAD, Sara added 500 · 2 days ago.
  - New sofa: done, 6,000 MAD.
  - Saved together: 20,250 MAD.
- **Placeholders already used on Home**, labelled as such:
  - Paint the guest room: percent, 60%, Youssef.
  - Honeymoon: 0 of 30,000 MAD.
- **Anything new** (entry history, journal notes, stats) is example data and must be labelled on screen. Nothing invented is presented as real.
