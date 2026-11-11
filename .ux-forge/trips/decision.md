# Decision: Trips area

> The visual direction is recorded below once the user picks it.

## IA questions settled by the user (Wed 11 Nov 2026)
These override `ia.md` wherever the two differ.

### U1 · Three tabs; the budget sits in the summary
The tabs are **Plan · Places · Prep**. The budget is a disclosure in the summary on phones, and open in the band on wide screens. This is `ia.md` D3, as written.

### U2 · During the trip, the floating primary is "Add a place"
The place form works offline, queued. This is `ia.md` D5, as written:
- an undated trip also gets **Add a place**;
- a past trip has **no primary**.

### U3 · Home is NOT changed
- `home.html` stays as it is, and its `trip-now` keeps the redated Chefchaouen.
- The Trips prototype still uses Lisbon for the during-trip case (`?state=trip-now` and `#/trips/lisbon`), as in D1.
- Known inconsistency, accepted: Home's `trip-now` state and the Trips `trip-now` state show different trips. No other state differs.

### U4 · Wide layout as written
- Tabs below 64 rem.
- Two columns from 64 to 80 rem: Plan | Places + Prep.
- Three columns from 80 rem, with the detail about 80 rem wide.
- In-trip forms are centred modal dialogs.

This is `ia.md` D4 and D11. The user didn't object.

### U5 · No Directions link in v1 — **overrides `ia.md`**
- A location is shown as **plain text**.
- A link appears only when the user pasted a URL; it is the entry's or place's own `url` field.
- **Remove** from flows F5, F8 and F9, from the wireframes and from the copy:
  - every "Directions" control;
  - any maps-provider link;
  - any text about the maps app.
- **Nothing is sent to a third-party maps service.**

### Reversible details (a)–(g)
`ia.md` §7, as decided by the Architect. The user didn't object.

## Questions for the architecture (A1–A12)
These are open; see `ia.md` §7. The prototype builds the bracketed defaults.

## Visual direction (user, Wed 11 Nov 2026)
**Chosen: B · Saffron light** (`directions.md`), with **C's ink-and-pencil budget bar** grafted on. Both were the Art Director's recommendation.

- **The light moves.** There is one saffron block per screen, and it is always "when":
  - **List:** the band under the lead trip's arch.
  - **Detail, before the trip:** a full-width 64 px band under the meta.
  - **Detail, during the trip:** saffron-ink *text*, "Day 3 of 4 · Happening now", under the h1. The block becomes the 56 px **Now cell** on the row that's happening.
  - **Between entries:** none.
  - **Past trips:** a sunken band.
- **The user's yes to B overrides `ia.md` D6's wording.** During the trip, the summary shows the status as text, not as TripCountdown's block.
- **Budget bar (from C):**
  - The track spans max(planned, budget) and is 12 px tall.
  - A **solid terracotta** segment shows plan costs.
  - A **dashed terracotta-outlined** segment shows unscheduled-place estimates; when non-zero, it is at least 12 px wide.
  - A 2 × 20 px `ink` budget mark sits at the budget.
  - **When over budget, both segments are danger** on `danger-soft`. Danger is never drawn next to terracotta.
  - `aria-valuetext` names both the plan costs and the idea estimates.
- **Prep tally:** one 8 px zellige tile per ticked item, `aria-hidden`, at most 12. The text "2 of 5" carries the meaning.
- **The one motion:** when the Now entry is ticked, the light leaves the row (240 ms). With reduced motion, the change is instant.
- **Doorway:** Goals' doorway, untouched, before and after the trip.
  - **During the trip it shrinks** to a 32 × 40 arch at the end of the h1 row from 22.5 rem, and is hidden below that width (the fold hold).
- **Holds** (from directions.md):
  - **One saffron block per state:** no saffron badges or text on a screen that has a band.
  - **The fold:** at 320 × 568, during the trip, the Now row's tick, cell and first title line are at y ≤ 432 and its bottom at y ≤ 504. Screenshot both themes to confirm.
- **Copy:** use `copy.md`, which supersedes the wireframe wording in `ia.md` and `directions.md`. For example, it uses "9 prep items left", "Plan item" and "Ended 64 days ago". There is no Directions link anywhere (U5).
