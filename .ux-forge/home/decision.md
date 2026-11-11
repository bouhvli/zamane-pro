# Decision: Home

**Chosen:** **B · Within reach** (`directions.md`). The user picked it from the three previews on 2026-11-09, on the Art Director's recommendation.

## Change requested by the user (2026-11-09): a floating primary instead of the full-width dock
- **On phones** the primary is a **floating button at the bottom-right** (`inset-inline-end`, so it sits on the left in right-to-left languages):
  - 56 px tall, `radius-lg`, `shadow-pop`, 16 px above the nav hairline and 16 px from the edge;
  - it keeps its label with a plus icon ("Add to a goal") rather than a bare "+", so the action stays explicit;
  - in other states it reads Share code, Copy code, Create a goal or New goal.
- **Right, not left:** the end edge is the platform convention for a floating action and where most thumbs rest. Switching sides is the single `inset-inline-end` declaration on `.dock`.
- **≥ 48 rem:** unchanged. The primary stays in the masthead line, because a floating button in the far corner of a wide screen is far from the content.
- **Loading** shows no primary. In the **error** state, "Try again" sits inline under the message.
- **Short-viewport rule:** dropped. A floating button covers far less than the bar did.
- **Trade-off:** the button floats over content, so it can cover the end of a row (at 320 px it covers "See all" until you scroll). Page padding keeps the last item scrollable clear of it.

## What B is held to
- **Short viewports:** under `(max-height: 30rem)`, phones show the dock inline under the total, not fixed.
- **Scroll padding:** `scroll-padding-bottom` and `body` padding include the dock, the nav and the safe area. [WCAG 2.4.11]
- **The dock holds the state's one primary:** Add to a goal, Create a goal, New goal, Share code (or Copy code without Web Share), or Try again.
- **Dock–tab gap:** a thumb test on real phones is still owed (open item).

## Shared fixes adopted (from `directions.md`)
1. Focus rings inside toasts use `currentColor`. The design system's majorelle ring is 1.9:1 on the ink toast.
2. The toast sits on the dock's top edge on phones, and 24 px from the bottom on wide screens.
3. TripCountdown below 22.5 rem: the count cell is 80 px, the body padding 12 px, and the title gets `overflow-wrap: anywhere`. This must be checked at 320 px.
4. Sheet backdrop: ink at 40% (light theme), black at 60% (dark theme).
5. The greeting is `title-lg` 28 px, not display 40 px, so the 32 px total leads.

## IA questions settled
- **joined-empty:** the total shows `0 MAD` with one line of copy and no button. The goals block is omitted until a goal exists. Trip and Shopping each keep one secondary action. The dock holds **Create a goal**.
- **all-done:** the dock holds **New goal**, and the goals block has no button of its own: a Done badge, the text and "See all".
- **No Web Share:** Copy is hidden and the dock button reads **Copy code**.

## Copy decisions (from `copy.md`'s open items)
- Invite body: **"It works once." is dropped**. A code works until the partner joins, and is rotatable (ARCHITECTURE.md §4.1).
- **Percent goals set a new total** (the latest entry is the current value, ARCHITECTURE.md §4.3). So the button is "Update progress" with the helper "Enter the new total, not the amount to add."
- Superseded ids are ignored. `home.offline.notice` uses the "latest data on this phone" version.
- **Counts line:** the design system's "3 goals open · 1 done" is kept rather than copy.md's "3 open · 1 done". "goals" tells you what's open; plurals are handled in code. With zero open it reads "4 goals done".
- Date: "Mon 9 Nov" (copy.md, following the design system's own date rule).

## Example data (prototype only, labelled on screen)
The design system gives Wedding fund (14,250 of 20,000 MAD, Sara), New sofa (done), 20,250 MAD, Chefchaouen 21–25 Nov and 7 left to buy. The other two open goals are **placeholders**, as the Art Director noted, because 14,250 + 6,000 already makes 20,250:
- "Paint the guest room": general, 60%, Youssef
- "Honeymoon": money, 0 of 30,000 MAD, no contributions
