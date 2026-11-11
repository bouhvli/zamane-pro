# IA: Zamane Home (lean, by the Director)

## 1. Content, in priority order

| # | Block | Data (from `GET /api/home`) | Job | Tap goes to |
|---|---|---|---|---|
| 0 | **Header**: date caption, greeting (`h1`), AvatarPair | device date; members | "This is ours" | nothing (decorative pair, labelled) |
| 1 | **Saved together**: total, open and done counts | `totalSaved`, `openCount`, `doneCount` | the headline number [DS: "Total saved leads"] | Goals |
| 2 | **Add to a goal** (the only primary button) | `quickAddGoals` | the success action | opens the quick-add sheet |
| 3 | **Next trip**: TripCountdown (upcoming, happening now) | `nextTrip {id,title,destination,start,end}`, status computed on the device | "when do we leave?" | that trip |
| 4 | **Closest to done**: ≤ 3 GoalCards, sorted by ratio, open goals only | `closestGoals[]` with progress and the last entry (who, what, when) | motivation and attribution | the goal; "See all" goes to Goals |
| 5 | **Shopping**: items left | `shoppingLeft` | "is there shopping to do?" | Shopping |

**Hard rule:** block 2 is visible without scrolling at 375 × 667 (the smallest common phone) and above, in every populated state. [Krug 5 s; Fitts] The design system mock puts the button last, where it falls under the nav on small phones. The Art Director may place it anywhere that meets this rule.

## 2. Layout skeleton

### Phone (< 48 rem): one column, with the bottom nav from nav-bar
```
┌──────────────────────────────┐
│ Monday 9 Nov             (S)(Y)│  header
│ Hi, you two                  │
├──────────────────────────────┤
│ Saved together               │  1
│ 20,250 MAD     3 open · 1 done│
│ [ Add to a goal ]            │  2 (placement open: in the card or below it)
├──────────────────────────────┤
│ ▌12▐ Next trip               │  3 saffron block
│ ▌days▐ Chefchaouen           │
├──────────────────────────────┤
│ Closest to done      See all │  4
│ [GoalCard] [GoalCard] [Goal…]│
├──────────────────────────────┤
│ Shopping        7 left to buy│  5
└──────────────────────────────┘
 [Home][Goals][Trips][Shop][Me]   nav
```

### ≥ 48 rem: top bar from nav-bar; composition open to the Art Director
- ≥ 64 rem should use the width (for example, two columns: status on one side, goals on the other). No stretched 1 080 px single column.

## 3. State matrix (each must exist in the prototype; `?state=<key>`)

| Key | When | What changes |
|---|---|---|
| `populated` | both partners in, data exists | everything as above (default) |
| `first-run` | the space was just created and the partner hasn't joined yet | The greeting uses my first name. An **invite card** with the code (`K7QM-4XPA`) has **Share code** as the primary action (Web Share, falling back to copy) and **Copy** as secondary. Below it come three start points (goal, trip, shopping) as secondary actions. No totals, no countdown. "Add to a goal" is hidden because there's no goal yet. |
| `joined-empty` | both are in but nothing has been created yet | "Hi, you two". Empty versions of blocks 1, 3, 4 and 5, each with one secondary action. The primary becomes **Create a goal**. |
| `trip-now` | today falls between the trip's start and end dates | The countdown shows "Day 2 of 5" and the kicker "Happening now". |
| `no-trip` | no upcoming or current trip | Block 3 becomes a light empty prompt: "No trips yet. Plan your first one." |
| `all-done` | no open goals, at least one done | Block 4 says the goals are all reached and offers a secondary **New goal**. "Add to a goal" hides; the primary becomes **New goal**. |
| `loading` | first load with no persisted cache | Skeletons keep the real layout's shape (no layout shift). There's no shimmer when reduced motion is on. |
| `offline` | `navigator.onLine === false` or the socket is down long enough | A slim notice under the header says offline, showing last saved data, and that adding to goals still works and syncs later. Nothing else is disabled on Home. |
| `error` | load failed and there's no cache | A single message with **Try again**. The nav still works. |

**Live update** (any state): when the partner adds to a goal, the card's attribution line becomes "Youssef added 200 · just now", the total updates, and the progress bar animates (DS: "animate only when a new contribution lands"). No toast for the partner's actions.

## 4. Quick-add sheet

- **Opening:** from "Add to a goal". It's a bottom sheet on phones (`<dialog>`, radius-lg top corners) and a centred dialog on wide screens.
- **Step A: pick a goal.**
  - A list of open goals, closest first, each with its title and "14,250 of 20,000 MAD" (or "60%").
  - With exactly one open goal, it's pre-picked and the sheet skips to step B.
  - The list is radio-like: one choice, which moves on to step B.
- **Step B: amount.**
  - **Money goal:** the amount field is focused immediately (`inputmode="decimal"`, the currency shown as a suffix). It accepts "500", "500,50" and "1 200", parsed by `money.ts`. Under it, "Add a note" is folded and opens a one-line note.
  - **General goal:** a percent field, 0–100, focused, with −10 and +10 step buttons. There's no drag-only slider. [WCAG 2.5.7]
  - The primary is **Add contribution** (in the sheet the primary is the sheet's own action). There's also a "Change goal" link back to step A.
- **States:**

| State | What happens |
|---|---|
| `idle` | as above |
| `invalid` | empty, zero or unparseable input: an inline error under the field, focus stays, and the input is preserved [Postel] |
| `saving` | instant optimistic close (an offline mutation; never block on the network) |
| `success` | A toast says "Added 500 MAD to Wedding fund" with **Undo** for 6 s; Undo deletes the entry. The card updates and its bar animates. |
| `queued` | offline: the same toast plus "Will sync when you're back online"; the entry shows as waiting on the card |
| `completed` | The entry crosses the target: the toast becomes the saffron "Goal reached" moment, and the card turns zellige "Done" and leaves "Closest to done" on the next render. Only one saffron moment shows at a time; the countdown is unaffected. |

- **Keyboard:** Esc closes; focus returns to "Add to a goal". Enter submits. Focus is trapped while open (native `<dialog>`).

## 5. Interaction notes
- **Whole cards are links** (a stretched link on the title); there are no nested interactive elements except the "See all" link.
- **Targets** are ≥ 44 × 44 px; card rows are ≥ 48 px.
- **The total uses `aria-live="polite"`** only for changes made by the partner (realtime), not on load. That way screen-reader users hear "Saved together 20,450 MAD" when Youssef adds.
- **Pull-to-refresh:** none. TanStack Query refetches on focus and realtime pushes changes.
