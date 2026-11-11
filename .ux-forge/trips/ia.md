# Structure & skeleton: Zamane Trips (list, trip detail, create/edit, in-trip add and edit)

**By:** Information Architect · **For:** Director, Writer, Art Director, front-end engineers · Wed 11 Nov 2026
**Read:** `brief.md` (binding). From `ARCHITECTURE.md`: §4 (trips, trip_plan_entries, trip_places, trip_checklist_items, §4.1 constraints, §4.3 derived values incl. trip budget and `trip-days`, §4.4 seed), §5 (trip endpoints, write semantics, 409), §7 (realtime notices with `parentId`), §8 (trip cover, disabled mode), §9 (offline mutation map) and §14 (D9, D10, D11, D12, D24). The design system (principles, TripCountdown, Progress `mode="budget"`, ideas vs commitments, icons). From `.ux-forge/goals/`: `ia.md`, `decision.md`, `build-notes.md`, `copy.md` (offline wording). From `.ux-forge/home/`: `ia.md` and `home.html` (TripCountdown, `trip-now`). From `.ux-forge/nav-bar/`: `brief.md`. There is no `research.md`.
**Not read:** the kit (`protocol.md`, `principles.md`, `accessibility.md`, `styles.md`) is outside the folders this session can read. As in Goals, laws are cited by name and WCAG by success criterion.
**Copy:** every string below is working copy. The Writer owns the final wording. Home's and Goals' glossaries apply ("you two", partner, "waiting to sync", "Back online").
**Same document shape as Goals' `ia.md`,** so engineers find things in the same places: §0 decisions, §1 inventory, §2 navigation, §3 flows, §4 state matrix, §5 wireframes, §6 interaction specs, §7 open questions, §8 builder states and example data. Decisions D1–D15 here are local to this file; architecture decisions are written "ARCH D11".

**Breakpoints are Home's and Goals', plus one tier for the detail:**
- **phone** < 48 rem: bottom nav, floating primary, tabs;
- **tablet** 48–64 rem: top bar, primary in the masthead, tabs, one column;
- **wide** 64–80 rem: masthead line, **two columns** (D4);
- **wide-plus** ≥ 80 rem: **three columns** (D4). Only the trip detail uses this tier.

---

## 0. Structural decisions

### D1 · The example "today" and the Lisbon conflict: Lisbon is a `trip-now` scenario, not the default
**The conflict:** the prototype's today is Mon 9 Nov 2026. The design system dates the Lisbon weekend Sat 7 – Tue 10 Nov, so on that day it is *happening now*. Home's settled default shows Chefchaouen as the next trip, "12 days to go". If Lisbon were in the default data, Home (which shows the current trip before the next one) would have to change.

**Decision: option (a), keep Lisbon as a `trip-now` scenario.**
- **Default data** (`?state=populated`): Chefchaouen (coming up, 12 days), Weekend in Fes (no dates, example data), Essaouira (past). This matches Home's default exactly, and the list leads with Chefchaouen.
- **`?state=trip-now`** adds the Lisbon weekend with the design system's dates, unchanged: Day 3 of 4. The list then leads with Lisbon, and Chefchaouen becomes the second card.
- **`#/trips/lisbon`** always renders Lisbon, whatever the state, so every detail state can be shown for the during-trip case (for example `?state=offline#/trips/lisbon`). The footnote says "Scenario: during the Lisbon weekend".
- **Recommended follow-up on Home (one line in `home.html`, not blocking):** Home's `trip-now` state currently redates Chefchaouen to Sun 8 – Thu 12 Nov ("Day 2 of 5"). Point it at Lisbon instead ("Day 3 of 4", Sat 7 – Tue 10 Nov, linking to `#/trips/lisbon`). The two prototypes then tell the same story, and no design-system date is changed. See §7, user question U3.

**Why not the other options:**
- **(b) Redating Lisbon** changes design-system example data, which the brief says to use as given. Lisbon exists in the system precisely to show "Happening now" on 9 Nov.
- **(c) Changing Home's default** reopens a settled, screenshotted state, and the design system's own Home mock shows Chefchaouen on 9 Nov.
- **(a) satisfies all four constraints:** Home's default is unchanged; the design system's dates are unchanged; the during-trip design (the most important new design in this area) is shown with design-system data; and the prototypes agree once Home's `trip-now` is pointed at Lisbon.

### D2 · List: four sections in time order, and only the lead trip gets the saffron countdown
**Decision:**
- **Sections, in this order. Empty sections are omitted:**
  1. **Happening now:** started, not ended. Sorted by start date.
  2. **Coming up:** soonest start first.
  3. **No dates yet:** newest first.
  4. **Past:** most recently ended first. Compact rows.
- **The lead trip** (the first trip in "Happening now", or else the first in "Coming up") is drawn as a **TripCountdown**, with the saffron count block. It's the only saffron block on the screen [DS: "One saffron moment"]. Every other upcoming trip shows its countdown as text ("in 45 days"). Past rows use the sunken count, as the design system's past state does.
- **No summary line under the h1, and no filter, sort or search** in v1.
- **Live changes update a card in place.** A card never moves while the list is on screen. A partner's new trip is inserted in its date position, with scroll anchoring. If a partner changes a trip's dates so it belongs in another section, it moves the next time the route is entered (Goals D1).

**Why:**
- **The lead trip is the answer to "when do we leave?"** The brief's success action is "the current or next trip leads". The status comes from the calendar, never from a setting [DS TripCountdown], so ordering by status and date needs no controls. [Hick]
- **One saffron block.** Several saffron count blocks would compete and break the design system's rule. Text countdowns keep the information.
- **It matches Home.** The lead card is the same object as Home's "Next trip" block (Home's `nextTrip` is the current trip, or else the next one), so the tap from Home lands on the same thing. [Jakob (internal consistency)]
- **No summary line.** Goals repeats Home's total because Home's number links to the list. Home's countdown links to the *trip*, not the list, so there is no number to confirm here.

### D3 · Detail: a summary above three tabs (Plan · Places · Prep). Budget is not a tab.
**Decision:**
- **The summary always shows first.** It holds:
  - the identity: doorway arch, h1 title, destination, dates, and notes clamped to 2 lines with More;
  - the status: the saffron countdown before the trip, "Day X of N · Happening now" during it, "N days ago" after it, and "No dates yet" with **Add dates** for an unscheduled trip;
  - **"What's left"** (before the trip and when unscheduled): one line of up to two links, for example "9 to prep · 1 must-do not in the plan". Each link opens its tab;
  - **the budget line**: Progress in `mode="budget"` plus the figure. It is a disclosure toggle that opens the breakdown (D10). It's closed by default on phones and the choice is remembered on the device, as Goals' Stats is.
- **Below 64 rem, three tabs:** **Plan · Places · Prep**, kept in `?view=plan|places|prep`. Selecting a tab replaces the history entry instead of pushing one. **Plan is the default for every status.**
- **No counts in the tab labels.** The numbers that matter sit in "What's left", and from 64 rem in each column's h2.

**Why Budget is not a tab (a divergence from the brief's four "parts"):**
- **It's Goals D3's Stats case.** The budget is derived numbers, not a feed: "planned" is computed from plan costs and place estimates (ARCH §4.3). Goals folded Stats under the summary for the same reason.
- **The number must sit next to what produces it.** In the summary, the budget is visible from every tab. When a partner adds a costed entry, the bar changes where you can see it. [DS: "Numbers are earned"]
- **It's what Goals' IA anticipated:** "Trips will need the same tabs-to-columns pattern for plan, places and prep." Three tabs, not four.
- **Three tabs fit at 320 px.** That's 96 px each, so the labels stay at 13/18 without truncating, with room for 200% text in two lines.
- **Plan is the default for every status.** One default is learnable [Jakob, spatial memory]. During the trip the Plan tab opens on Today (D6), and an unscheduled trip's Places are one tap away, and also reached from the floating primary (D5).

**Why "What's left":** it answers the brief's first job, "When do we leave, and what's left to sort out?", in the same glance as the countdown. Each item is a link that opens its source [information scent]. It's hidden during and after the trip, when it's no longer the question.

**Labels:** "Prep" is the nav brief's word ("plan, places, prep") and the design system's ("group headers in Shopping and Prep"). The panel's h2 is "Prep"; its groups are the checklist. The Writer confirms.

### D4 · Wide screens: tabs become columns. Plan sits beside Places, ideas beside commitments.
**Decision:**
- **48–64 rem:** the phone layout (tabs) with the top bar. The primary ends the summary block instead of floating, as in Goals.
- **64–80 rem, two columns.**
  - Above them, a band: the identity and status on the left, the budget (bar, figure and breakdown, always open) on the right.
  - **Left column (7/12): Plan.**
  - **Right column (5/12): Places, then Prep below it.** Each has its own h2 and its own add.
- **≥ 80 rem, three columns:** Plan (5/12) · Places (4/12) · Prep (3/12).
  - The detail's content width grows to about **80 rem (1,280 px)**, wider than Home's 1,080 px wrap. Each column then stays at or above the 288 px a 320 px phone gives a panel.
  - The list keeps Home's 1,080 px wrap.
- **The tablist is removed from 64 rem.** `?view=` is kept in the URL but doesn't change the layout. The "What's left" links scroll to the matching column and move focus to its h2.
- **DOM order is the same at every width:** summary (identity, status, what's left, budget) → tablist (phones only) → Plan → Places → Prep. Grid placement never reorders the content [WCAG 1.3.2, 2.4.3].

**Why:**
- **Plan next to Places is the core planning view.** The design system draws an idea and a commitment side by side, and the desktop job "Put this on Tuesday" means reading the ideas while looking at the days. **Schedule** on a place updates the Plan column next to it, so the effect is visible without a tab switch. [Norman: visible feedback]
- **Prep sits under Places at 64–80 rem.** It matters near departure, not in every planning session. Below Places it's one scroll away, and "What's left" links straight to it. Three columns at 1,024 px would make each about 300 px, so the third column waits for 80 rem.
- **Budget in the band, open.** The width is there. Goals' Stats became an always-visible line at 64 rem for the same reason (Home critic F6: don't waste width).
- **No reordering by CSS.** The budget is part of the summary in the DOM on phones too, so moving it into the band changes nothing for keyboard or screen-reader order.

### D5 · The primary action depends on the trip's status
| Status (from `trip-days`) | Floating primary (phones) / masthead primary (≥ 48 rem) | What happens | The job it serves |
|---|---|---|---|
| **Coming up** | **Add to the plan** | The plan entry form, with no day chosen ("No date yet"). Per-day **Add** buttons pre-fill the day. | "Put this on Tuesday": planning, usually online, often on desktop |
| **Happening now** | **Add a place** | The place form (it works offline, queued) | Capture what you spot on the go ("that café, tomorrow"). The job "What's next, tick it off" is served by the Plan tab opening on Today (D6), not by a button. |
| **No dates yet** | **Add a place** | The place form | An undated trip is still an idea: collect places. **Add dates** sits in the header where the dates would go. |
| **Past** | **none** | — | Looking back. Every add stays one tap away inside its panel. |
| loading · error · not-found · deleted | none | — | As in Home and Goals |

**Rules:**
- **One primary per view** [DS Button]. Each panel also has its own secondary add:
  - Plan: "Add to the plan", plus a per-day **Add** ("Add to Tue 24 Nov");
  - Places: "Add a place";
  - Prep: one **Add** per group.
- **The panel's add is hidden while the primary has the same label** (Goals D4: Journal hid "Write a note" while the primary was that button). No view ever shows two buttons with the same name.
- **The primary doesn't change with the tab.** One label per status is learnable. "Add a place" during a trip, seen from the Plan tab, saves into Places, and the toast says so.

**Why "Add a place" during the trip, not "Add to today":**
- **The connection.** During the trip the usage is "phone, one hand, weak connection". `['places','add']` is queued offline (ARCH §9); a plan entry is not. A floating primary that's `aria-disabled` most of the time on a trip would be a dead end in the most prominent place.
- **Ideas versus commitments.** What you capture on the move is usually an idea. Committing it to a day (Schedule) is a second, deliberate step.
- **"Add to Mon 9 Nov"** stays one tap away in Today's day heading (D6), for a booking made on the spot.
- **The brief's hunch,** "what's next and tick done during it", is kept as the screen's **primary job**. It's carried by content position (Today first, with Now and Next marked), not by a second majorelle button. A tick is a checkbox everywhere in Zamane (ShoppingItem), so it isn't styled as a primary button. [Jakob, DS "Primary once per view"]
- **This is reversible.** If the user prefers "Add to today", only the label and form target change (§7, U2).

**Why no primary after the trip:** there's nothing the trip is "for" any more, and an invented primary ("Plan a trip") belongs to the list. The design system's past countdown already "falls back to sunken": quiet is the right register. [Hick]

**Why not shift the primary to Prep near departure:** a label that changes with the number of days left can't be learned, and "What's left" already brings Prep forward.

### D6 · During the trip: Plan opens on Today, with Now and Next marked in the day list
**Decision:**
- **Summary, compact:** the h1, the meta line, and the status as TripCountdown's "now" state (Day 3 of 4 · Happening now), plus the budget line. "What's left" is hidden.
  - **The doorway shrinks during the trip.** The Art Director chooses the form, for example a thumbnail arch beside the title.
  - **Hold:** at **320 × 568**, on the Plan tab, **Today's Now row, including its tick, is above the fold.**
- **Plan panel during the trip:**
  1. **"Earlier days"**: a disclosure, closed, naming the range and a done count: "Sat 7 – Sun 8 Nov · 4 of 4 done".
  2. **Today**, as "Today · Mon 9 Nov · Day 3". The entry happening now carries a **Now** label on a `saffron-soft` row (the design system's "happening now trip rows"). The next undone timed entry carries a **Next** label.
  3. **Tomorrow and later days**, as before the trip.
  4. "Outside the trip dates" and "No date yet", as usual.
- **Today's rows** with a location get a **Directions** link (44 px). It opens the system maps app with the location text (U5). Before and after the trip, Directions lives only in the entry sheet.
- **Now and Next are recomputed every minute** and on return to the foreground, with no animation and no announcement. Ticking the Now entry clears its Now label; the Next label stays where it is.
- **Rules (owned by `trip-days`; §7 A7):**
  - **Now:** today, not done, `start ≤ time < end`. With no end time, the entry counts as now for 60 minutes after its start.
  - **Next:** the earliest undone entry today whose start is after the current time.
  - **Untimed entries** ("Any time") are listed first under the day heading and are never Now or Next.
  - **Nothing timed left today:** Today's heading gets the caption "Nothing else planned today". Tomorrow's first entry is labelled **Next** only on the last evening (no Now, and nothing else today).

**Why:**
- **"What's next today?" at zero taps.** Opening the trip lands on the Plan tab (D3) with the past folded away, so today is the first thing in the panel. The day order stays chronological. Today isn't pulled out of sequence, so the list still reads as the trip. [Krug: don't make me think; serial position]
- **No separate "Now and next" card above the tabs.** It would repeat Today's rows and their ticks, giving two checkboxes for the same entry on one screen, which is noise for screen-reader users and confusing for everyone. The compact summary plus the fold hold get the same result.
- **Directions only where they're needed.** Directions on every row before the trip would be clutter; on Today's rows it answers "Where is it?" in one tap. [Hick]

### D7 · Plan: the day list, kept whole
**Decision:**
- **Days run from the start date to the end date inclusive.** Each has an h3 ("Sat 21 Nov · Day 1") and an **Add** button (accessible name "Add to Sat 21 Nov").
- **Order within a day:**
  1. untimed entries first, under the caption "Any time";
  2. then timed entries by start time;
  3. ties by creation order.
- **An empty day stays** as a sunken well: "Nothing planned", with the day's Add (design system: `surface-sunken` "empty plan days").
  - **Runs of 3 or more empty days** are still kept one per day, but each is a single 48 px line, so a long trip doesn't turn into a wall of wells.
- **After the days, two groups, each shown only when it has entries:**
  - **"Outside the trip dates":** entries with a date outside the range, each with its full date and the caption "Before the trip" or "After the trip". Ordered by date.
  - **"No date yet":** undated entries, in creation order.
- **An undated trip:** there is no day list. Dated entries are grouped by their date under h3 date headings, with no empty days, followed by "No date yet". The label "Outside the trip dates" isn't used when the trip has no dates (§7 A7).
- **Trips longer than 7 days** get a **"Jump to a day"** native `<select>` at the top of the panel.
- **A row has two targets side by side, never nested:**
  1. **the tick:** a checkbox, 44 px, labelled "{title} done";
  2. **the row:** a button that opens the entry sheet. It shows the type icon, title, time range, location, cost, the attribution, and "From Places" when the entry was scheduled from a place.
- **Attribution in rows:**
  - not done: the adder's small avatar, named "Added by Youssef";
  - done: "Done by Sara · 12:05" (or "· Sun 8 Nov" when it wasn't today), and the row is zellige-ticked.

**Why:**
- **Empty days are information.** "Mon 23 is free" is a planning fact, and the empty day is where "Put this on Monday" starts. [Tesler: the day is pre-filled]
- **Untimed first** follows calendars' all-day convention [Jakob], and a stay (the riad) naturally sits at the top of its day.
- **Outside and No date at the end.** They're exceptions. "Outside" usually means the dates changed, so it is flagged rather than mixed into the days. That's the architecture's grouping (ARCH §4.3).
- **The tick sits beside the row, not inside it,** so there are no nested interactive elements, and one-handed ticking hits a large, predictable target at the start of the row. [Fitts]

### D8 · Places: ideas, drawn and grouped as ideas
**Decision:**
- **Each place is a card with a dashed outline**, never a solid one [DS]. It has:
  - **the main target:** a button over the type icon, title, area, "~150 MAD", the **Must-do** badge and "Added by Youssef". It opens the place sheet;
  - **a sibling secondary button:**
    - **Schedule** while the place isn't in the plan;
    - once it's in the plan, **"In the plan · Tue 24 Nov, 17:30"**. This is a link: on phones it opens the Plan tab, and on wide screens it scrolls the Plan column. In both cases focus goes to the entry's row.
- **Three groups:**
  1. **Ideas:** places not in the plan. Must-dos first, then creation order.
  2. **In the plan:** scheduled and not visited, ordered by plan date and time.
  3. **Visited:** the linked plan entry is done (ARCH §4.3). Zellige "Visited · Sun 8 Nov · Youssef".
- **Ordering is stable, as in Goals D1.** A newly added place joins the end of its subgroup. A place that's scheduled or visited while on screen updates in place and moves group the next time the view is entered.
- **The ideas/commitments distinction in words:**
  - the plan entry says **"From Places: Spanish Mosque"**;
  - the place says **"In the plan"**;
  - "Schedule" is the only verb that turns one into the other;
  - deleting either one names what happens to the other (D14).

**Why:**
- **Ideas first.** "Which ideas haven't we planned?" is the planning question. Scheduled ideas are already handled, so they move down, and Visited is the record. [Goals D1: what you act on first]
- **Must-do first.** That's what the flag is for: the couple marked these as not to be missed.
- **Schedule on the card.** "Put this on Tuesday" is one tap from the idea. The card's main target and Schedule are siblings, so there are no nested buttons (the stretched target ends before the Schedule button).

### D9 · Prep: the checklist stays in place; adding is inline per group; reordering is a mode
**Decision:**
- **Four groups in a fixed order,** each with its icon and an h3 with a count: Packing (`luggage`) · Documents (`file-text`) · Bookings (`calendar-check`) · To-do (`list-checks`). For example: "Packing · 0 of 5".
- **Rows:** a tick (checkbox) beside a row button that opens the item sheet (edit title or group, delete).
  - **Ticked:** zellige check, plus "Packed by Sara · Sun 8 Nov" in Packing, or "Done by Youssef · Fri 6 Nov" in the other groups. The text isn't struck through (U-d).
  - **Not ticked:** "Added by Sara", except for **seeded** items, which show no attribution line (§7 A5).
- **Ticked items stay where they are.** There's no reordering on tick.
- **Adding:** each group ends with **"Add to Packing"**. It turns into an inline field with **Add** and **Close**.
  - **Enter** adds the item at the end of the group, clears the field and keeps focus, so a packing list can be typed in one go.
  - **Esc**, **Close**, or leaving an empty field closes it, and focus returns to "Add to Packing".
- **Reordering:** a **Reorder** toggle (`aria-pressed`) per group, as in the Goals composer. Rows show **Move up** and **Move down** (44 px). There's no drag. Moving to another group is done in the item sheet, which appends the item to the new group.
- **When every item in a group is ticked:** the h3 count reads "5 of 5". The group doesn't collapse.

**Why:**
- **Items don't jump when ticked.** A line that moves under the thumb causes mis-taps, and position is how people remember a packing list. [Fitts, spatial memory] Shopping moves bought items because the shop is the context; a checklist isn't.
- **Inline add is the list-making convention** (Reminders, Todoist) [Jakob]. The group is pre-filled by where you are [Tesler], and Enter-to-continue makes "add ten things" ten Enters.
- **Reorder mode.** The brief asks for ordering by `position` within a group. Explicit buttons give single-pointer targets with no drag [WCAG 2.5.7].

### D10 · Budget: commitments by type, ideas on their own line
**Decision:**
- **The budget line** (the summary on phones, the band on wide screens) uses Progress in `mode="budget"`, terracotta:
  - **with a budget:** "Planned 9,200 MAD of 8,000 MAD", with "Over by 1,200 MAD" in danger past the budget, and "800 MAD left" in neutral ink otherwise. A **near** state has no special colour; the design system defines only over;
  - **without a budget:** "Planned 440 MAD", no bar, and **Set a budget** (ghost), which opens Edit trip focused on Budget;
  - **nothing costed:** "Nothing costed yet", plus Set a budget.
- **The breakdown** (opened from the budget line on phones, always shown on wide screens):
  1. **Plan costs by type,** largest first, each with its type icon. Types that total 0 are hidden.
  2. **"Ideas not in the plan yet · 3 places · ~250 MAD"**, drawn dashed like a place.
  3. **"No cost yet: 2 plan entries"**, when any plan entry has no cost.
  4. **"Change budget"**: a link to Edit trip, focused on the budget field.

**Why:**
- **Numbers are earned.** The total opens the rows that make it [DS]. The ARCH D11 formula is shown honestly: ideas count, but as estimates.
- **Ideas versus commitments.** Folding estimates into the types would make a "maybe" look like a booking, so they get their own dashed line. This needs the API to return them split (§7 A2), or the client to compute them from the cached plan and places.
- **"No cost yet"** tells the couple the planned figure is incomplete, rather than letting it look exact. [Norman: the system's state made visible]

### D11 · In-trip forms are dialogs backed by the URL; read-only sheets are not
**Decision:**
| Surface | Kind | URL (pushed) |
|---|---|---|
| Plan entry form (new or edit) | dialog: full screen on phones, centred about 36 rem from 48 rem | `?entry=new` (optional `&date=YYYY-MM-DD`) or `?entry=<entryId>` |
| Place form (new or edit) | same | `?place=new` or `?place=<placeId>` |
| Schedule a place | same, shorter | `?schedule=<placeId>` |
| Entry sheet, place sheet, item sheet | Home's bottom sheet; a centred 28 rem dialog from 48 rem | none (Goals' entry sheet) |
| Checklist add | inline in the group (D9) | none |
| Create trip, Edit trip | task pages (Goals D7): no bottom nav on phones | `/trips/new`, `/trips/:id/edit` |

**Why:**
- **Goals' composer precedent.** In-goal content (notes) uses a URL-backed dialog. The detail stays underneath with Trips current; Back closes the form behind the discard guard; a reload restores it.
- **Trips themselves are top-level entities,** like goals, so create and edit stay task pages.
- **Wide screens:** a centred dialog keeps the plan's context visible around it (dimmed). It's the cheapest v1 that keeps focus management solid. A side panel that leaves the plan live is a later option (§7 U4).
- **Sheets for reading.** On a trip you tap a row to read the address, booking link or notes, not to edit it. Edit is one more tap, so accidental edits are avoided.

### D12 · Create and edit trip
**Decision:**
- **Create** (`/trips/new`, a task page):
  1. **Title**: focused, required.
  2. **"Add details"** disclosure, closed:
     - Destination;
     - **Dates**, a fieldset with "First day" and "Last day" (native date inputs; both or neither; last ≥ first);
     - Budget (money, with the currency as a suffix);
     - Notes;
     - Cover photo (only when uploads are enabled).
  3. **Create trip**.
- **Edit** (`/trips/:id/edit`): every field unfolded. **Delete trip** comes last, set apart.
  - **Date-change preview** under Dates, before saving: "2 plan entries will fall outside the new dates. They stay in the plan, under Outside the trip dates."
  - **Clearing both dates:** "The trip will have no dates. Dated plan entries keep their dates."
- **Arriving from "Add dates" or "Set a budget"**, Edit opens with focus in that field (`?focus=dates|budget`).
- **The checklist is seeded** in the same atomic write as the create (ARCH §5). Nothing about the seed is asked in the form.

**Why:**
- **The brief and the design system are binding.** Only the title is required, and the rest is folded [quick capture; ARCH D12].
- **Edit is unfolded:** the fold exists to speed up creating (Goals D7).
- **The date preview:** changing dates silently moves entries into "outside". Saying so before saving prevents a surprise [Norman: feedforward]. There is no bulk "move entries with the trip" in v1 (§7 A8).

### D13 · Offline: ticks and places work; everything else drafts and waits
**Works offline (ARCH §9), with the optimistic row plus "waiting to sync":**
- **ticking and unticking** plan entries (`['plan','setDone']`) and checklist items (`['checklist','setDone']`);
- **adding a place** (`['places','add']`).

**Everything else needs a connection.** The notice states it once, and every affected control says why next to itself (Goals D8):
- **The forms** (plan entry, place edit, schedule, create trip, edit trip) **open and keep a draft.** Their submit is `aria-disabled` with its reason, and becomes active again when the connection returns, which is announced.
  - **The place form in "new" mode is the exception:** it submits, and the place is queued.
- **The checklist's inline add** opens, but **Add** is `aria-disabled`: "Adding to the checklist needs a connection." The typed text stays (§7 A9 asks for this to be queued too).
- **Reorder, every delete, Schedule, and cover upload** are `aria-disabled`, with their reasons.
  - **The exception:** **Remove** on a queued, unsynced place cancels the queued add.
- **The notice:** Home's first sentence verbatim, "You're offline. Showing the latest data on this phone." Its second sentence is about goals, so it's replaced with "Ticking things off and adding places still work and sync when you're back online." The detail adds: "Adding to the plan, editing and deleting need a connection." The Writer owns this (Goals kept Home's notice verbatim because it was about goals).

**Why:**
- **The mutation map is the architecture's.** The UI must not promise more.
- **No dead ends.** You can still write the entry now and send it later, and nothing is typed twice. [Postel; WCAG 3.3.7]

### D14 · Destructive actions: confirm deletes; Undo only for my own just-made adds
- **Confirmed** (an alertdialog stating the consequence, with focus on the safe button):
  - deleting a plan entry, a place, a checklist item or a trip;
  - discarding a dirty form.
  - [DS: "danger … always confirmed"; Goals D5: no undelete in the API, shared data, "who did what" would be falsified by a re-create]
- **The consequence is named:**
  - **a plan entry from Places:** "Spanish Mosque goes back to your ideas.";
  - **a place that's in the plan:** "Its plan entry on Tue 24 Nov stays.";
  - **a done entry from Places:** "Spanish Mosque will no longer be visited.";
  - **a trip:** its counts.
- **Undo in the toast (10 s, Home's rules)** after my own:
  - add of a plan entry;
  - add of a place, including a queued one (Undo cancels it);
  - schedule (Undo deletes the created entry, so the place returns to Ideas).
  - These reverse my own act seconds after making it, which is Home's settled pattern.
- **No toast and no Undo for ticks.** A tick is undone by unticking, as on ShoppingItem. The checkbox state is its own feedback.
- **No toast for the inline checklist add.** The new line appears where you're looking, and "Added Sunscreen to Packing." is announced.

### D15 · Status changes over time, on the device
- **Status, the day list, and Now/Next come from `trip-days`** on the device's local date and time (ARCH §4.3). They're recomputed on route entry, on return to the foreground, every minute while the detail is open (for Now and Next), and at local midnight.
- **A change of status applies in place.** The countdown number, the primary's label, the Today grouping and "What's left" all update. Focus stays where it is, and nothing is announced: the change wasn't anyone's act.
- **Times are wall-clock times at the destination.** The phone's clock follows the local time zone when travelling, so Now and Next are right on the trip. A partner at home in another time zone sees the times as written (§7 A7).

---

## 1. Screen inventory

| Screen or view | Route | Primary job | Primary action | Entry points |
|---|---|---|---|---|
| **Trips list** | `/trips` | Pick the right trip at a glance | **Plan a trip** ("Plan your first trip" when there are none) | Trips tab; "‹ Trips" on the detail; after deleting a trip |
| **Trip detail** | `/trips/:id` (`?view=plan\|places\|prep`) | Before: plan the days and sort out what's left. During: see what's next and tick it off. After: look back. | By status (D5): **Add to the plan** / **Add a place** / none | List card; Home's TripCountdown; after create; back from edit |
| Entry sheet | dialog over the detail | Read one plan entry in full: where, link, notes, who | none (**Edit** is secondary, **Delete** is danger secondary) | Tap a plan row |
| Place sheet | dialog over the detail | Read one idea in full | none (**Schedule** or **Show in the plan**, **Edit**, **Delete**) | Tap a place card |
| Item sheet | dialog over the detail | Rename or move a checklist item, or delete it | **Save** | Tap a checklist row |
| **Plan entry form** | `/trips/:id?entry=new\|<id>` (dialog) | Add a commitment, or change one | **Add to the plan** / **Save changes** | The primary (coming up); per-day Add; Plan "Add to the plan"; Edit in the entry sheet |
| **Place form** | `/trips/:id?place=new\|<id>` (dialog) | Drop an idea in seconds, or change one | **Add place** / **Save changes** | The primary (happening now, no dates); Places "Add a place"; Edit in the place sheet |
| **Schedule a place** | `/trips/:id?schedule=<placeId>` (dialog) | Put an idea on a day | **Add to {day}** ("Add to the plan" before a day is chosen) | Schedule on a place card or in the place sheet |
| Confirm | `alertdialog` | Confirm a destructive act | the destructive verb | Every delete; discarding a dirty form |
| **Create trip** | `/trips/new` | Start a trip with only a title, in seconds | **Create trip** | List primary; Home "Plan a trip" (first-run, no-trip) |
| **Edit trip** | `/trips/:id/edit` (`?focus=dates\|budget`) | Change a trip's details; delete it | **Save changes** | Detail **Edit**; **Add dates**; **Set a budget** / **Change budget** |

**Merged:**
- The **budget** is part of the detail's summary, not a screen or a tab (D3).
- The **checklist add** is inline, not a form (D9).
- Create and edit are one form component on two routes, as in Goals.
- The plan entry form serves both new and edit.

**Split:**
- **Reading an entry or place** (sheet) is separate from **editing** it (form dialog), so on a trip a tap reads and never edits by accident.
- **Schedule** is its own small dialog, not a mode of the plan entry form. It asks only for the day and time, and everything else is copied from the place (ARCH D11).

### Content priority (what the eye must hit, in order)
**Trips list:**
1. h1 "Trips".
2. The lead trip (TripCountdown): the count → title → destination and dates.
3. The other trips in their sections. Inside a card: title → status or count → destination and dates.
4. The primary (Plan a trip).
5. Past (compact, lighter).

**Trip detail, coming up:**
1. Identity: the doorway and h1. "Am I in the right trip?"
2. When: the saffron countdown, "12 days to go".
3. What's left: "9 to prep · 1 must-do not in the plan".
4. The primary (Add to the plan).
5. The budget line: "Over by 1,200 MAD".
6. The Plan panel (days in order).
7. Secondary chrome: "‹ Trips", "Edit", notes.

**Trip detail, happening now:**
1. Today's **Now** row and its tick.
2. **Next**, its time, and Directions.
3. The rest of today, then tomorrow.
4. Identity and "Day 3 of 4" (compact).
5. The primary (Add a place).
6. The budget line.

**Trip detail, no dates:** identity → "No dates yet · Add dates" → what's left → the primary (Add a place) → Plan ("No date yet") → Places.

**Trip detail, past:** identity → "64 days ago" (sunken) → the budget line (final figure) → Plan (the record, with ticks).

**Plan entry form:** Title → Type → Day → Time → Add to the plan → Add details (Location, Cost, Link, Notes).

**Place form:** Title → Type → Must-do → Add place → Add details (Area, Estimated cost, Link, Notes).

**Schedule:** what's being scheduled (the place's title, type and estimate) → Day → Time → Add to {day}.

**Create trip:** Title → Create trip → Add details.

**Edit trip:** the fields with their current values → Save changes → Delete trip (last, set apart).

---

## 2. Navigation model

| Route | Phone chrome | ≥ 48 rem | Document title (Writer) |
|---|---|---|---|
| `/trips` | bottom nav, Trips current | top bar | Trips – Zamane |
| `/trips/:id` | bottom nav, Trips current | top bar | {Trip title} – Zamane |
| `/trips/:id?entry=…` | covered by the full-screen dialog | top bar under the dialog | Add to the plan: {trip} – Zamane / Edit {entry}: {trip} – Zamane |
| `/trips/:id?place=…` | same | same | New place: {trip} – Zamane / Edit {place}: {trip} – Zamane |
| `/trips/:id?schedule=…` | same | same | Schedule {place}: {trip} – Zamane |
| `/trips/new` | **task header, no bottom nav** | top bar | New trip – Zamane |
| `/trips/:id/edit` | **task header, no bottom nav** | top bar | Edit {trip} – Zamane |

- **Current location:**
  - The Trips tab carries `aria-current="page"` on every `/trips/*` route (a prefix match, as in Goals).
  - Inside the detail, the selected tab carries `aria-selected`.
- **Up versus back:**
  - "‹ Trips" always goes to `/trips`. Its accessible name contains "Trips" [WCAG 2.5.3].
  - Browser and OS Back follow history.
  - ✕ Cancel on a task page goes back one entry when that entry is in the app; otherwise it goes to the parent.
- **After a write:**
  - **Create** replaces `/trips/new` with `/trips/:id`.
  - **Saving an edit** pops back to the detail.
  - **Deleting a trip** goes back two entries when the stack is list → detail → edit; otherwise it replaces with `/trips`.
  - **Saving a form dialog** pops its search parameter.
- **Tabs:** `?view=` is replaced rather than pushed, so Back leaves the page. Tapping the Trips tab on the detail goes to the list; on the list, it scrolls to the top (nav-bar convention).
- **Links between parts of the detail:**
  - "In the plan · Tue 24 Nov" on a place;
  - "From Places: Spanish Mosque" on an entry;
  - the "What's left" links.
  - **On phones** these select the target tab (replace) and move focus to the target row, or to the panel's h2. **On wide screens** they scroll the target into view and focus it. They never push history.
- **Counts:** still five top-level destinations. The detail adds three tabs [Miller].
- **Help:** none added, so WCAG 3.2.6 doesn't apply (as in Goals).
- **Home links to keep working:** `#/trips`, `#/trips/chefchaouen` and `#/trips/new`, plus `#/trips/lisbon` if Home's `trip-now` is realigned (D1).

---

## 3. Flows

### F1 · Open a trip (list → detail → back)
1. The Trips tab opens `/trips`. Focus goes to the h1. The cached list shows at once and refetches in the background.
2. Tapping a card opens `/trips/:id`. The summary renders at once from the list cache, while the panels and budget fill skeleton rows without layout shift. Focus goes to the h1.
3. The panel is Plan (D3). During the trip it opens with Earlier days folded and Today first (D6).
4. "‹ Trips" or Back returns to the list at the same scroll position, with focus on the card just opened.

**Unhappy paths:**
- **First load with no cache:** card skeletons. A deep link to a detail shows a skeleton summary.
- **The list fails with no cache:** "Trips didn't load." and **Try again**, inline. The nav still works.
- **A refresh fails but a cache exists:** cached data, plus "Couldn't refresh. Showing the latest data on this phone." with **Try again** (Goals' string).
- **Offline:** cached data and the offline notice (D13). A trip never opened on this phone shows its summary from the list cache, and each panel says "This isn't on this phone yet. It loads when you're back online."
- **Gone** (a stale link, or deleted by the partner): "This trip isn't here any more." and **Back to Trips**.
- **The partner deletes the trip while I'm on it:** see F13.
- **Two trips happening at once** (overlapping dates): both are under "Happening now", sorted by start. The first is the lead.

### F2 · Add to the plan (before the trip)
1. Tap **Add to the plan** (the primary). Or tap a day's **Add**, which pre-fills that day (`&date=`). The form dialog opens, pushing `?entry=new`.
2. **Title** is focused. Type is preset to **Other**. Day reads "No date yet" (or the day you came from). Time is empty. **Add details** is folded.
3. Type the title, pick a type, a day (the select lists "Sat 21 Nov · Day 1 · 3 planned" … then "No date yet" and "Another date…"), and optionally a time.
4. **Add to the plan**: a POST with the client id.
   - The dialog closes (popping `?entry=`), and the row appears in its day in time order.
   - The budget line updates (no animation).
   - Toast: "Added to Tue 24 Nov" (or "Added to the plan · No date yet") with **Undo**.
   - Focus goes to the new row's button. If the row is off screen, it's scrolled into view first.

**Unhappy paths:**
- **No title:** an error under Title, which takes focus. The input is kept.
- **Validation on blur,** on fields the person has typed in:
  - an end time without a start: "Add a start time first.";
  - an unparseable cost;
  - a URL that isn't `http(s)`: "Use a web address starting with https://".
- **An end time before the start time:** allowed, with the helper "Ends the next day." (an overnight train). [Tesler]
- **"Another date…"** reveals a date input. A date outside the trip is allowed, with the helper "This is outside the trip dates."
- **Offline:** the form opens and keeps a draft. **Add to the plan** is `aria-disabled`: "You're offline. You can add this when you're back online. What you've typed stays here." When the connection returns, it enables and that's announced.
- **Server or network error:** an alert at the top: "Couldn't add this. Try again." Fields are kept. Retrying is safe (same client id).
- **A double tap:** ignored while pending.
- **Close, Back or Esc with input:** "Discard this?" with **Keep editing** (focused) and **Discard**. Without input, it closes at once.
- **Reload or the app is killed:** the draft returns with "Draft restored." and **Discard draft**.
- **The partner changes the trip dates while the form is open:** the Day options refresh. If my chosen day left the range, it stays selected, labelled "{day} · outside the new dates".
- **The trip is deleted while I'm in the form:** a banner: "Youssef deleted Chefchaouen. This can't be saved." with **Copy text** and **Close**.
- **Undo:** deletes the entry (idempotent). The toast becomes "Removed from the plan". If Undo fails: "Couldn't undo. The entry is still in the plan." and the row stays.

### F3 · Schedule a place ("Put this on Tuesday")
1. On a place card in Ideas (or in the place sheet), tap **Schedule**. This pushes `?schedule=<placeId>`.
2. The dialog shows:
   - **what's being scheduled:** "Ras El Maa viewpoint · Sight · ~0 MAD";
   - **Day:** "Choose a day"; during the trip, the default is today;
   - **Time:** start and end, optional;
   - **the note** "The cost is copied from the estimate. You can change it in the plan." (ARCH D11).
3. Choose a day. The primary's label becomes **Add to Tue 24 Nov**.
4. Submit: `POST …/places/:placeId/schedule`.
   - The dialog closes.
   - **The place card updates in place.** Schedule becomes "In the plan · Tue 24 Nov, 17:30"; the card moves to "In the plan" on the next visit (D8).
   - **The new entry appears in its day** (visible beside the card on wide screens).
   - **The budget** doesn't change: the estimate moves from the Ideas line to the plan (ARCH D11).
   - **Toast:** "Ras El Maa viewpoint is on Tue 24 Nov" with **Undo**.
   - **Focus** goes to the card's "In the plan" link.

**Unhappy paths:**
- **Submitting with no day chosen:** "Choose a day, or No date yet." under Day, which takes focus.
- **Offline:** the dialog opens. The primary is `aria-disabled`: "Scheduling needs a connection." The choice is kept.
- **The partner scheduled it first** (unique `place_id`, a 409; §7 A1): the dialog body swaps to "Youssef already put this on Mon 23 Nov." with **Show in the plan** and **Close**, and focus goes to Show in the plan.
- **The place is deleted while the dialog is open:** "Youssef deleted this place." and **Close**.
- **A place added offline and not yet synced:** Schedule is `aria-disabled`: "This place hasn't synced yet."
- **Undo:** deletes the created entry, which unschedules the place. The card returns to Schedule.
- **Rescheduling:** a place is scheduled at most once. To move it, use "In the plan" → the entry's sheet → **Edit**, and change the day there. The place follows, because the link is kept.

### F4 · Drop an idea (add a place)
1. **Add a place** (the primary during the trip or with no dates; in the Places panel otherwise) pushes `?place=new`.
2. **Title** is focused. Type is **Other**. **Must-do** is an unchecked checkbox. "Add details" (area, estimated cost, link, notes) is folded.
3. **Add place**: a POST with the client id, through the offline mutation.
   - The dialog closes.
   - The card is appended to the end of its Ideas subgroup.
   - The budget's Ideas line updates.
   - Toast: "Added Pastéis de Belém to Places" with **Undo**.
   - Focus goes to the card, or returns to the primary if the Places panel isn't the one showing on a phone.

**Unhappy paths:**
- **No title:** an inline error. The input is kept.
- **Offline:**
  - it's queued;
  - the card shows cloud-off and "waiting to sync";
  - the toast adds "Will sync when you're back online.";
  - Undo cancels the queued add.
  - Until it syncs, the card's **Schedule**, **Edit** and **Delete** are `aria-disabled` ("This place hasn't synced yet."), and its sheet offers **Remove**, which cancels the queued add after confirming: "Remove Pastéis de Belém? It hasn't synced, so Youssef never saw it."
- **Rejected on sync** (the trip was deleted meanwhile, a 404): the toast reads "Couldn't add Pastéis de Belém. Lisbon weekend was deleted." The title is named so it can be added again elsewhere. The card is removed.
- **Server error while online:** the form stays open with "Couldn't add the place. Try again."

### F5 · During the trip: what's next, tick it off, where is it
1. Open the trip, from Home's "Happening now" countdown or the list's lead card. The Plan panel shows Earlier days (folded), then **Today**, with the **Now** row first in view (D6).
2. **Tick** the Now entry's checkbox.
   - It turns zellige at once (optimistic), with "Done by Sara · 13:24".
   - The Now label clears.
   - If the entry came from a place, that place shows "Visited" in Places.
   - Focus stays on the checkbox.
3. **Where is it?** Tap **Directions** on the Next row (or open the row's sheet for the full address and link). The maps app opens in a new context.
4. **Next** stays labelled until its start time passes, then becomes **Now** (minute recompute, D15).

**Unhappy paths:**
- **Offline:**
  - the tick is queued;
  - the row shows a small cloud-off and "waiting to sync";
  - unticking before the sync just replaces the queued value (set-state, ARCH D9).
- **The queued tick is rejected** (the entry was deleted meanwhile): the row is removed, and the toast reads "Couldn't tick Tram 28. It was deleted."
- **The partner ticks the same entry:** the row updates to "Done by Youssef · 13:22". "Youssef ticked Lunch at Time Out Market." is announced. If both tick, the last write wins, and the attribution shows whoever's write landed last.
- **The partner unticks what I ticked:** it unticks in place, and "Youssef unticked Lunch…" is announced.
- **Nothing timed left today:** "Nothing else planned today." under Today's heading. On the last evening, tomorrow's first entry is labelled **Next**.
- **Untimed entries only today:** they're listed under "Any time", and no Now or Next is shown.
- **A day with no entries during the trip:** Today's well reads "Nothing planned today", with **Add to Mon 9 Nov**.
- **The trip ends while the page is open:** at local midnight the status becomes Past. Today's grouping and Now/Next go away, and the primary goes away. Focus stays (on the body if its element went away, with the h1 as fallback).
- **No location on the entry:** no Directions link.

### F6 · Prep: tick, add, edit, reorder
1. **Tick** a line: zellige at once, with "Packed by Sara · Mon 9 Nov". It works offline (queued).
2. **Add:** "Add to Packing" turns into a field. Type "Sunscreen" and press Enter: the line appears at the end of Packing, the field clears and keeps focus, and "Added Sunscreen to Packing." is announced. Esc closes the field.
3. **Edit:** tap a line's text. The item sheet opens with Title and Group (a four-option radio group). **Save** sends a PATCH with `updatedAt`. A changed group moves the item to the end of the new group.
4. **Reorder:** the group's **Reorder** toggle shows Move up and Move down per row. Each move sends one request (§7 A4) and announces "Sunscreen moved to 2 of 6." **Done** ends the mode, with focus on the moved row.

**Unhappy paths:**
- **Offline:**
  - ticking works;
  - the inline field opens, but **Add** is `aria-disabled`: "Adding to the checklist needs a connection.", and the text stays;
  - Reorder, Save and Delete are `aria-disabled`, with their reasons.
- **Empty title on Enter:** nothing is added, and the field stays. On Save in the sheet: "Add a name."
- **Delete** (in the item sheet): confirmed, "Delete Sunscreen from Packing?" (D14). Focus goes to the next line, or the previous line, or the group's Add.
- **The partner reorders or adds while I reorder:** the list re-renders in the server's order. My focused row keeps focus (keyed by id), and "Youssef changed the order of Packing." is announced.
- **A 409 on Save:** Goals §6.7, for two fields (title, group).
- **Seeded items:** they behave like any other item, with no attribution line (§7 A5).
- **A group with no items** (after deletes): "Nothing here." plus its Add.

### F7 · Budget: see the breakdown, set a budget
1. **Phones:** tap the budget line (a disclosure). The breakdown opens under it (D10): by type, the Ideas line, the No-cost line, and Change budget. Its open state is remembered on the device. **Wide:** the breakdown is always shown in the band.
2. **Set a budget** or **Change budget** opens Edit trip with focus in Budget (`?focus=budget`). Saving returns to the detail, and the bar updates.

**Unhappy paths:**
- **No budget:** no bar, "Planned 440 MAD", and **Set a budget**.
- **Over budget:**
  - danger "Over by 1,200 MAD", in text as well as colour [WCAG 1.4.1];
  - the bar is full, with the danger fill;
  - the progressbar's `aria-valuetext` is "9,200 MAD planned of 8,000 MAD, over by 1,200 MAD".
- **The budget fails to load** (if it comes from `GET …/budget`): "The budget didn't load." with **Try again**, inside the line. The rest of the page is unaffected.
- **A partner's costed entry lands:** the figure updates without animation. Only goal contributions animate [DS].
- **A queued place estimate:** it's included in the Ideas line, with "waiting to sync".

### F8 · Read, edit or delete a plan entry
1. **Tap a row.** The entry sheet shows:
   - the type icon and title;
   - the full day and time ("Tue 24 Nov, 17:30–19:00");
   - the location with **Directions**;
   - the cost;
   - the link (it opens in a new context, with its host shown: "booking.com");
   - the notes, in full;
   - "From Places: Spanish Mosque" (a link to the place);
   - "Added by Youssef · Sun 1 Nov" and, when done, "Done by Sara · Tue 24 Nov, 18:52".
   - Its actions: **Edit** and **Delete** (danger, secondary weight).
2. **Edit** closes the sheet and opens the form with `?entry=<id>` (all fields unfolded). Focus goes to the form's heading. **Save changes** sends a PATCH with `updatedAt`, closes the dialog, updates the row (moving it if its day or time changed), shows the toast "Changes saved", and returns focus to the row's button.
3. **Delete:** confirmation, "Delete Hike to the Spanish Mosque?", plus:
   - from a place: "Spanish Mosque goes back to your ideas.";
   - if done: "Spanish Mosque will no longer be visited.".
   - After deleting, the row is removed, the budget updates, the toast reads "Deleted from the plan" with no Undo, and focus goes to the next row, else the previous row, else the day's Add.

**Unhappy paths:**
- **A 409 on save:** Goals §6.7 merge, across title, type, date, start, end, location, cost, url and notes. If only `done` or `updatedAt` differ, it retries once silently (§7 A3).
- **A 404 on save:** "This entry was deleted. Your changes weren't saved." with **Copy text** and **Close**.
- **The partner deletes it while the sheet is open:** "Youssef deleted this entry." and **Close**.
- **Offline:** Edit opens a draft, and Save is `aria-disabled`. Delete is `aria-disabled`: "Deleting needs a connection."

### F9 · Read, edit or delete a place
1. **Tap a card.** The place sheet shows: type and title, area, "~150 MAD", Must-do, notes, link, "Added by Youssef", and the status ("In the plan · Tue 24 Nov, 17:30 · Show in the plan", or "Visited · Sun 8 Nov · Youssef"). Its actions: **Schedule** (ideas only), **Edit**, **Delete**.
2. **Edit:** the place form with `?place=<id>`, all fields unfolded, including the Must-do checkbox. Editing a scheduled place doesn't change its plan entry; the sheet says "Changes here don't change the plan entry."
3. **Delete:** "Delete Spanish Mosque?", plus "Its plan entry on Tue 24 Nov stays." when it's in the plan. After deleting: the card is removed, the plan entry loses "From Places", the budget's Ideas line updates if it was an idea, and the toast reads "Place deleted".

**Unhappy paths:** as in F8: 409 merge, 404, partner delete, offline. Plus queued places (F4).

### F10 · Create a trip
1. **Plan a trip** (the list primary, or Home's "Plan a trip") pushes `/trips/new`. On phones the bottom nav goes away. Focus is in **Title**.
2. Type "Chefchaouen". Optionally open **Add details**: destination, dates, budget, notes, cover.
3. **Create trip**: a POST with the client id. The server seeds the checklist atomically.
   - `/trips/:id` replaces the form, with focus on the h1.
   - "Trip created." is announced.
   - The Plan panel shows the dated days, empty, or for an undated trip: "Nothing planned yet. Add the first thing with Add to the plan."
   - Prep shows the seeded checklist.

**Unhappy paths:**
- **No title:** an error under Title, which takes focus.
- **Only one date:** an error on the empty one: "Add the last day too, or clear the first day." (or the reverse). Focus goes to it.
- **The last day is before the first:** on blur of either field, "The last day is before the first day." Neither value is changed.
- **A trip longer than 31 days:** allowed, with the helper "That's 45 days." [Tesler: catch typos without blocking]
- **Dates in the past:** allowed (to record a trip already taken), with the helper "These dates have passed."
- **Budget:** parsed by `money.ts`. If unparseable: "Enter an amount, like 8 000."
- **Cover:** while it's uploading, Create waits ("Creating after the photo…"). If the upload failed: the error is at the cover field, and Create is blocked until **Try again** or **Remove**. **Uploads disabled:** no cover control, and the initial is used.
- **Offline:** the form works. **Create trip** is `aria-disabled`: "You're offline. You can create the trip when you're back online. What you've typed stays here." The cover control is `aria-disabled`: "Photos need a connection."
- **Server or network error:** an alert at the top. Fields are kept, and retrying is safe.
- **Cancel or Back with input:** "Discard this trip?"
- **Reload:** "Draft restored."

### F11 · Edit a trip
1. **Edit** pushes `/trips/:id/edit`. Every field shows, and focus is on the h1, or on the field named by `?focus=`.
2. **Changing the dates** shows the preview under Dates (D12), for example "2 plan entries will fall outside the new dates…", or, when the change makes the trip current: "The trip will be happening now."
3. **Save changes**: a PATCH with `updatedAt`. It pops to the detail with focus on **Edit**, and the toast reads "Changes saved".

**Unhappy paths:**
- **The partner changes the trip while I edit** (a realtime notice) **or a 409 on save:** the three-way merge (Goals §6.7). Fields: title, destination, **dates (one field: both days together)**, budget, notes, cover. One notice: "Youssef changed this trip while you were editing." If only non-editable values differ, it retries once silently.
- **A 404:** "This trip was deleted. Your changes weren't saved." with **Back to Trips**.
- **Offline:** editing is allowed. Save and Delete trip are `aria-disabled`, with their reasons.
- **Replacing or removing the cover:** applies on Save, and the server destroys the old asset. Cancel reverts it.
- **Cancel with changes:** "Discard your changes?"

### F12 · Delete a trip
1. **Delete trip** comes last in Edit, set apart. The confirmation reads:
   - "Delete Chefchaouen?"
   - "This deletes its 9 plan entries, 4 places and 13 checklist items, for both of you. You can't undo this."
   - **Keep trip** (focused) · **Delete trip**.
2. After the DELETE: the app goes to `/trips` (per §2), with focus on the h1, and the toast reads "Chefchaouen deleted". Home's countdown moves to the next trip, or to "No trips yet".

**Unhappy paths:** offline means it's disabled. An error keeps you in Edit with "Couldn't delete the trip. Try again."

### F13 · The partner works on the same trip at the same time
Realtime notices carry `parentId` = the trip id (ARCH D10), so only this trip's keys refetch. Everything applies in place, with **no toast** and **one polite announcement** (mirrored into an open dialog), as on Home and in Goals.

| Partner act | What I see | Announced |
|---|---|---|
| Adds a plan entry | inserted in its day in time order, with scroll anchoring (content above the viewport doesn't push mine) | "Youssef added Cooking class to Tue 24 Nov." |
| Edits an entry | the row updates; if its day or time changed, it moves, and focus follows it if it had focus | "Youssef changed Cooking class." |
| Ticks or unticks | the row updates, with attribution | "Youssef ticked Riad in the medina." |
| Deletes an entry | the row is removed; if it had focus, focus goes to the next row; an open entry sheet swaps to "deleted" | "Youssef removed Hammam from the plan." |
| Adds a place | appended to the end of its Ideas subgroup | "Youssef added a place: Goat cheese tasting." |
| Schedules a place | the card shows "In the plan" in place; the entry appears in its day; an open Schedule dialog for that place swaps to the 409 message (F3) | "Youssef put Spanish Mosque on Tue 24 Nov." |
| Ticks, adds or reorders Prep | in place; the order changes are applied, with focus kept by id | "Youssef packed Phone chargers." |
| Changes the trip (title, dates, budget, cover) | the summary updates; changed dates rebuild the day list (entries may move to Outside); the status and primary may change in place; Edit, if open, runs the merge | "Youssef changed the dates to Sun 22 – Thu 26 Nov." |
| **Deletes the trip** | the page swaps in place to "Youssef deleted Chefchaouen." and **Back to Trips**, which takes focus. Open sheets close. Open forms keep their text, behind a banner with **Copy text** and **Close**. Queued offline ticks and places for this trip are dropped on replay, with one toast. | the swap's heading |

Two partners editing the **same field at the same moment**: the second save gets a 409, and the merge shows both versions (Goals §6.7). Two partners **ticking the same line**: the last write wins (set-state; no 409).

### F14 · Offline and back online
1. **The connection drops:**
   - the slim offline notice appears under the summary (D13), and "You're offline. Ticking things off and adding places still work." is announced once;
   - controls that need the connection become `aria-disabled` and show their reasons when pressed;
   - **the floating primary stays enabled.** It opens the form as a draft ("Add to the plan") or saves to the queue ("Add a place").
2. **While offline:** ticks and new places show cloud-off and "waiting to sync".
3. **The connection returns:**
   - "Back online." is announced;
   - the queue replays in order;
   - rows lose their cloud-off;
   - disabled submits become active, and those in an open form are announced;
   - the notice goes away.

**Unhappy paths:**
- **Replay rejections:** one toast per failed item, naming it: "Couldn't add Pastéis de Belém. Lisbon weekend was deleted." / "Couldn't tick Tram 28. It was deleted."
- **Cached for 7 days** (ARCH §9): a trip never opened on this phone has no panels offline (F1).
- **Uploads are never queued:** the cover control is disabled offline.

### F15 · Back to Home
- The Home tab works from the list and the detail. On the form routes on phones, Cancel comes first.
- Home's countdown reflects my changes at once (shared query cache; realtime invalidates `['home']`). Creating the first trip moves Home from no-trip to the countdown. Deleting the only upcoming trip moves it back.
- From a detail opened from Home, Back returns to Home with focus on the countdown link.

---

## 4. State matrix

Every value that isn't the design system's is **example data and is labelled on screen**, as in Home and Goals.

### 4.1 Trips list

| State | When | What shows | Primary |
|---|---|---|---|
| `populated` | default (D1) | Coming up: the Chefchaouen TripCountdown (saffron, "12 days to go"). No dates yet: Weekend in Fes. Past: Essaouira ("64 days ago", sunken). | Plan a trip |
| `trip-now` | the Lisbon scenario | Happening now: the Lisbon TripCountdown ("Day 3 of 4"), the only saffron block. Coming up: Chefchaouen, "in 12 days" as text. Then No dates yet and Past. | Plan a trip |
| `empty` (first-run) | no trips | "No trips yet. Plan your first one." (the design system's string). No sections. | **Plan your first trip** |
| `only-past` | no now, upcoming or undated trips | "Nothing coming up." plus one sentence, then Past | Plan a trip |
| `loading` | first load, no cache | one TripCountdown-shaped skeleton and two card skeletons; `aria-busy`; "Loading trips" status | none |
| `error` | load failed, no cache | "Trips didn't load." and **Try again**, inline | none |
| `stale` | refetch failed, cache shown | "Couldn't refresh. Showing the latest data on this phone." with Try again | Plan a trip |
| `offline` | no network | the slim notice (D13) | Plan a trip (opens the form as a draft) |
| `uploads-disabled` | `uploadsEnabled: false` | every arch shows the title's initial | — |
| `partner-live` | a partner creates, edits or deletes a trip | inserted in date position, updated in place, or removed (focus to the next card); polite announcement | — |
| `status-change` | midnight passes | counts and kickers update in place; cards change section on the next route entry | — |
| `deleted-by-me` | after F12 | the toast "{trip} deleted"; focus on the h1 | Plan a trip |

### 4.2 Trip detail (page)

| State | When | Summary | Panels | Primary |
|---|---|---|---|---|
| `upcoming` | default for Chefchaouen | doorway; h1; meta; notes; saffron countdown "12 days to go"; what's left; budget line | Plan, with days in order | Add to the plan |
| `tomorrow` | 1 day to go | the countdown kicker reads "Tomorrow" (design system) | as upcoming | Add to the plan |
| `now` | Lisbon (D1) | compact; "Day 3 of 4 · Happening now"; budget line; no what's left | Plan: Earlier days folded, then Today with Now and Next, and Directions on Today's rows | **Add a place** |
| `now-last-day` | the last day | "Day 4 of 4 · Last day" | Today; then Outside and No date if present | Add a place |
| `undated` | Weekend in Fes | "No dates yet" and **Add dates**; what's left; "Planned 440 MAD" and Set a budget | Plan: "No date yet" only (D7) | **Add a place** |
| `past` | Essaouira | sunken "64 days ago"; budget line (final) | Plan: all days, ticks shown | none |
| `no-budget` | `budget` is null | "Planned {sum}" and **Set a budget**; no bar | — | by status |
| `over-budget` | planned > budget | danger "Over by 1,200 MAD" | breakdown | by status |
| `near-budget` | planned ≥ 90% of budget, not over | "400 MAD left", neutral (no special colour) | — | by status |
| `empty-trip` | just created | identity; countdown; "What's left" counts only seeded Prep | Plan: empty day wells, or "Nothing planned yet"; Places: empty; Prep: seeded | by status |
| `budget-open` | the disclosure is open (phones) | the breakdown under the line | — | — |
| `loading` | deep link, no cache | skeleton summary | skeleton rows | none |
| `partial` | arriving from the list | identity and status real (list cache) | skeleton rows until loaded | by status |
| `section-error` | one query failed | the rest works | "The plan didn't load." / "Places didn't load." / "Prep didn't load." / "The budget didn't load.", each with **Try again** | by status |
| `error` | the trip failed, no cache | "This trip didn't load." and **Try again** | — | none |
| `not-found` | 404 | "This trip isn't here any more." and **Back to Trips** | — | none |
| `offline` | no network | cached; the notice (D13) | cached; controls that need the connection `aria-disabled`, with reasons | by status (draft or queued) |
| `not-cached` | offline, never opened | from the list cache | "This isn't on this phone yet. It loads when you're back online." | none |
| `uploads-disabled` | `uploadsEnabled: false` | the doorway shows the initial | — | — |
| `solo` | the partner hasn't joined | unchanged; attribution shows only me | — | — |
| `my-add` / `my-schedule` | F2, F3, F4 | the budget updates | the row or card appears | toast with Undo |
| `queued` | offline tick or place | — | cloud-off and "waiting to sync" on the row or card | — |
| `sync-rejected` | replay fails | rolled back | removed | toast naming the item |
| `partner-*` | F13 | in place | in place | the label may change with the status, keeping focus |
| `partner-deleted-trip` | realtime | swaps to "Youssef deleted Chefchaouen." and **Back to Trips** | — | none |

### 4.3 Plan panel

| State | What shows |
|---|---|
| `days` | day h3s with Add; untimed entries first ("Any time"), then by time; rows with tick, icon, title, time, location, cost and attribution |
| `empty-day` | a sunken well: "Nothing planned", plus the day's Add |
| `outside` | the "Outside the trip dates" group, with full dates and "Before the trip" / "After the trip" |
| `no-date` | the "No date yet" group |
| `undated-trip` | dated entries under date headings (no empty days), then No date yet |
| `nothing` | no entries at all: dated trip → every day is an empty well; undated trip → "Nothing planned yet. Add the first thing with Add to the plan." |
| `now` | Earlier days folded ("Sat 7 – Sun 8 Nov · 4 of 4 done"); Today with Now (`saffron-soft`) and Next labels; Directions on Today's rows |
| `long-trip` | more than 7 days: a "Jump to a day" select at the top |
| `done-row` | zellige tick; "Done by Sara · 12:05" |
| `from-place` | "From Places: Spanish Mosque" on the row |
| `queued-tick` | the tick, plus cloud-off and "waiting to sync" |
| `long-content` | the title wraps (`overflow-wrap: anywhere`); location truncated to 1 line (full in the sheet); notes not shown in the row |

### 4.4 Places panel

| State | What shows |
|---|---|
| `populated` | Ideas (must-dos first) · In the plan · Visited; dashed cards |
| `empty` | "No places yet. Add the ideas you don't want to forget." + Add a place (when it isn't the primary) |
| `all-planned` | Ideas is empty: "Every idea is in the plan." Then the other groups. |
| `must-do` | a "Must-do" badge (text, not only an icon) [WCAG 1.4.1] |
| `scheduled` | the card's secondary becomes "In the plan · Tue 24 Nov, 17:30" |
| `visited` | zellige "Visited · Sun 8 Nov · Youssef" |
| `queued` | cloud-off and "waiting to sync"; Schedule, Edit and Delete `aria-disabled`; Remove in the sheet |
| `offline` | Schedule `aria-disabled`: "Scheduling needs a connection." |

### 4.5 Prep panel

| State | What shows |
|---|---|
| `seeded` | four groups with the seed; no attribution on seeded lines; "0 of 11" |
| `populated` | ticks with "Packed by …" / "Done by …"; added lines with "Added by …" |
| `adding` | the inline field at the end of the group, focused; Add and Close |
| `group-done` | "5 of 5"; the group stays open |
| `all-done` | each group done; "What's left" (summary) drops its Prep item |
| `reorder` | in that group, rows with Move up and Move down; the toggle reads **Done** |
| `offline` | ticks work; Add, Reorder, Save and Delete `aria-disabled`, with reasons |
| `empty-group` | "Nothing here." plus Add |

### 4.6 Sheets (entry, place, item)

| State | What shows |
|---|---|
| `default` | the full content (F8, F9, F6); actions |
| `offline` | Edit opens a draft; Delete `aria-disabled`: "Deleting needs a connection." |
| `queued` (place) | "Waiting to sync"; **Remove** (works offline) |
| `confirm` | the confirmation on top, with the consequence (D14); focus on the safe button |
| `deleting` / `failed` | optimistic close; on failure the row or card returns and the toast reads "Couldn't delete this. Try again." |
| `deleted-by-partner` | "Youssef deleted this {entry/place/item}." and **Close** |

### 4.7 Plan entry form

| State | What shows |
|---|---|
| `new` | Title focused; Type = Other; Day = "No date yet" or the day you came from; Time empty; Add details closed; **Add to the plan** |
| `details-open` | Location, Cost (MAD suffix), Link, Notes (a counter near 4,000) |
| `another-date` | a date input under Day; "This is outside the trip dates." when it is |
| `overnight` | end < start: "Ends the next day." |
| `invalid` | an inline error under each field; focus on the first invalid field; input kept |
| `offline` | the form works; submit `aria-disabled`, with its reason; enabled and announced on reconnect |
| `saving` / `save-failed` | "Adding…" / an alert at the top, fields kept |
| `draft-restored` | "Draft restored." and **Discard draft** |
| `edit` | every field unfolded; "From Places: Spanish Mosque" as info; **Save changes**; **Delete** at the end |
| `partner-changed` / `conflict` | the Goals §6.7 notice and per-field marks |
| `trip-dates-changed` | the Day options refresh; a selected day that left the range is labelled |
| `trip-deleted` | a banner with **Copy text** and **Close**; submit hidden |
| `discard-confirm` | "Discard this?" |

### 4.8 Place form

The same as 4.7, except:
- the fields are Title, Type, **Must-do**, then Add details (Area, Estimated cost, Link, Notes);
- **`offline` in new mode submits and queues** (D13);
- in edit, a scheduled place shows "Changes here don't change the plan entry.".

### 4.9 Schedule dialog

| State | What shows |
|---|---|
| `default` | the place summary; Day "Choose a day" (today during the trip); Time; the cost note; **Add to the plan** |
| `day-chosen` | the primary reads **Add to Tue 24 Nov** |
| `invalid` | "Choose a day, or No date yet." |
| `offline` | primary `aria-disabled`: "Scheduling needs a connection." |
| `already-scheduled` | "Youssef already put this on Mon 23 Nov." **Show in the plan** · **Close** |
| `place-deleted` | "Youssef deleted this place." **Close** |
| `saving` / `failed` | "Adding…" / "Couldn't schedule this. Try again." |

### 4.10 Create trip

| State | What shows |
|---|---|
| `idle` | Title (focused); Add details (closed); **Create trip** |
| `details-open` | Destination · Dates (First day, Last day) · Budget · Notes · Cover |
| `invalid` | missing title; one date only; last before first; unparseable budget |
| `long-trip` / `past-dates` | helpers only, not errors |
| `cover-uploading` / `cover-failed` | progress in the arch / an error with **Try again** and **Remove** |
| `uploads-disabled` | no cover control |
| `offline` | the form works; Create `aria-disabled`, with its reason |
| `saving` / `save-failed` / `draft-restored` / `discard-confirm` | as in Goals |

### 4.11 Edit trip

| State | What shows |
|---|---|
| `loaded` | all fields unfolded; Save changes; Delete trip last |
| `focus-dates` / `focus-budget` | arriving from Add dates or Set a budget: focus in that field |
| `date-preview` | the consequence under Dates (D12) |
| `partner-changed` / `conflict` / `conflict-silent` | Goals §6.7, with the dates as one field |
| `not-found` | "This trip was deleted. Your changes weren't saved." |
| `offline` | Save and Delete `aria-disabled` |
| `delete-confirm` / `deleting` / `delete-failed` | F12 |

---

## 5. Wireframes

Grayscale regions and priority only. The Art Director owns the styling and the Trips direction (in the family of Goals B · Doorway).
- **Key:** ╭╮ the arch (imagery only). ▌▐ the saffron count block. ┆ a dashed outline (an idea). ┃ a solid entry (a commitment). ☐/☑ a tick. ◆ the current tab. (S)/(Y) PartnerAvatars. [x] a button. Type icons are shown as words in angle brackets: ‹bus›, ‹bed›, ‹fork›, ‹sight›, ‹ticket›, ‹plane›, ‹dot›.

### 5.1 Trips list

```
MOBILE 390 · Trips list · populated (today Mon 9 Nov)
┌────────────────────────────────────┐
│ H1 Trips                           │ 1
│                                    │
│ H2 Coming up                       │
│ ┌────────────────────────────────┐ │ 2 lead = TripCountdown, the one
│ │▌ 12  ▐ Next trip         ╭──╮  │ │   saffron block; whole card is
│ │▌ days▐ H3 Chefchaouen    │ph│  │ │   one link (arch placement: AD)
│ │▌to go▐ Rif mountains ·   ╰──╯  │ │
│ │        Sat 21 – Wed 25 Nov     │ │
│ └────────────────────────────────┘ │
│ H2 No dates yet                    │ 3
│ ┌────────────────────────────────┐ │
│ │ ╭W╮ H3 Weekend in Fes          │ │
│ │     Fes · No dates yet         │ │
│ └────────────────────────────────┘ │
│ H2 Past                            │ 5 compact, lighter
│ ┌────────────────────────────────┐ │
│ │ ╭E╮ Essaouira · Atlantic coast │ │   sunken count as text
│ │     Wed 2 – Sun 6 Sep ·        │ │
│ │     64 days ago                │ │
│ └────────────────────────────────┘ │
│                ┌─────────────────┐ │
│                │ + Plan a trip   │ │ 4 floating primary
│                └─────────────────┘ │
├────────────────────────────────────┤
│ Home  Goals  Trips◆  Shopping  (S) │
└────────────────────────────────────┘
TRIP-NOW: "H2 Happening now" first, holding the Lisbon TripCountdown
          (▌3 of 4 days▐ Happening now · Lisbon weekend · Portugal ·
          Sat 7 – Tue 10 Nov). Chefchaouen then reads "in 12 days" as text,
          with no saffron block.
EMPTY:    H1 Trips → "No trips yet. Plan your first one." → primary
          "Plan your first trip".
LOADING:  one countdown-shaped skeleton + 2 card skeletons, no primary.
```

```
DESKTOP 1440 · Trips list · populated (Home's 1,080 px wrap)
┌ Zamane  Home  Goals  Trips◆  Shopping ───────────────────────── (S) Profile ┐
│ H1 Trips                                                     [+ Plan a trip] │ masthead
│ ──────────────────────────────────────────────────────────────────────────── │
│ H2 Coming up                                                                 │
│ ┌▌ 12 days to go ▐ Next trip · H3 Chefchaouen ───────────────────── ╭────╮ ┐ │ lead spans
│ │                 Rif mountains · Sat 21 – Wed 25 Nov              │ ph │ │ │ the width
│ └────────────────────────────────────────────────────────────────── ╰────╯ ┘ │
│ H2 No dates yet                         H2 Past                              │ two columns
│ ┌ ╭W╮ Weekend in Fes ───────────────┐   ┌ ╭E╮ Essaouira · Atlantic coast ──┐ │ below
│ │     Fes · No dates yet            │   │     Wed 2 – Sun 6 Sep · 64 days  │ │
│ └───────────────────────────────────┘   └──────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
48–64 rem: one column; the primary sits under the h1.
```

### 5.2 Trip detail, coming up (Chefchaouen)

```
MOBILE 390 · Trip detail · Plan tab
┌────────────────────────────────────┐
│ ‹ Trips                     [Edit] │ up-link · secondary
│ ╭────────────────────────────────╮ │
│ │         example photo          │ │ 1 doorway (AD: ratio, cap)
│ ╰────────────────────────────────╯ │
│ H1 Chefchaouen                     │ 1 identity
│ Rif mountains · Sat 21 – Wed 25 Nov│
│ The riad has no heating. Pack …More│   notes, 2 lines
│ ┌▌ 12  ▐ Next trip ──────────────┐ │ 2 the one saffron block
│ │▌days ▐ 4 nights                │ │
│ └────────────────────────────────┘ │
│ [9 to prep] · [1 must-do not in    │ 3 what's left: links → tab
│ the plan]                          │
│ [Planned vs budget             ▾ ] │ 5 disclosure (closed)
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │   terracotta → danger
│ 9,200 of 8,000 MAD · Over by 1,200 │
│ ┌ Plan ◆ ──┬ Places ───┬ Prep ────┐│ 6 tabs, ?view= (replace)
│ H3 Sat 21 Nov · Day 1      [+ Add] │   Add = "Add to Sat 21 Nov"
│ Any time                           │
│ ┃☐ ‹bed› Riad in the medina 4,400  │   tick | row button (siblings)
│ ┃        Check-in from 14:00   (S) │   (S) = added by Sara
│ ┃☐ ‹bus› Bus to Chefchaouen   160  │
│ ┃        08:00–12:15 · CTM, Fes (Y)│
│ ┃☐ ‹fork› Dinner on the square 350 │
│ ┃        20:00 · Outa el Hammam (S)│
│ H3 Sun 22 Nov · Day 2      [+ Add] │
│ ┃☐ ‹ticket› Akchour waterfalls 1,200│
│ H3 Mon 23 Nov · Day 3      [+ Add] │
│ ░ Nothing planned ░░░░░░░░░░░░░░░░ │   sunken well
│ H3 Tue 24 Nov · Day 4      [+ Add] │
│ ┃☐ ‹ticket› Cooking class   1,400  │
│ ┃☐ ‹sight› Hike to the Spanish     │
│ ┃   Mosque · 17:30–19:00 · 0 MAD   │
│ ┃   From Places                    │
│ H3 Wed 25 Nov · Day 5      [+ Add] │
│ ┃☐ ‹bus› Bus back to Fes      160  │
│ H3 Outside the trip dates          │
│ ┃☐ ‹bus› Train to Fes         380  │
│ ┃   Fri 20 Nov · Before the trip   │
│ H3 No date yet                     │
│ ┃☐ ‹ticket› Hammam and massage 900 │
│             ┌────────────────────┐ │
│             │ + Add to the plan  │ │ 4 floating primary (D5)
│             └────────────────────┘ │
├────────────────────────────────────┤
│ Home  Goals  Trips◆  Shopping  (S) │
└────────────────────────────────────┘
BUDGET OPEN (under the line, pushes the tabs down):
  ‹bed› Stay 4,400 · ‹ticket› Activity 3,500 · ‹bus› Transport 700 ·
  ‹fork› Food 350 ┆ Ideas not in the plan yet · 3 places · ~250 MAD ┆
  [Change budget]
HOLDS: the tablist is above the fold at 375 × 667; the countdown at 320 × 568.
```

```
MOBILE 390 · Trip detail · Places tab (only the area under the tabs changes)
│ ┌ Plan ──┬ Places ◆ ┬ Prep ────┐  │
│ H2 Places (visually hidden)  [Add a place] │ secondary; hidden when the
│ H3 Ideas · 3                       │   primary is "Add a place"
│ ┆‹sight› Ras El Maa viewpoint     ┆ │ dashed card
│ ┆ old medina · ~0 MAD  [Must-do]  ┆ │   main target → place sheet
│ ┆ (S) Added by Sara  [Schedule]   ┆ │   sibling button
│ ┆‹fork› Goat cheese tasting       ┆ │
│ ┆ Outa el Hammam · ~150 MAD       ┆ │
│ ┆ (Y) Added by Youssef [Schedule] ┆ │
│ ┆‹sight› Kasbah museum            ┆ │
│ ┆ Outa el Hammam · ~100 MAD       ┆ │
│ ┆ (S) Added by Sara  [Schedule]   ┆ │
│ H3 In the plan · 1                 │
│ ┆‹sight› Spanish Mosque           ┆ │
│ ┆ east hill · ~0 MAD              ┆ │
│ ┆ [In the plan · Tue 24 Nov, 17:30]┆ │ link → Plan row
EMPTY: "No places yet. Add the ideas you don't want to forget." [Add a place]
```

```
MOBILE 390 · Trip detail · Prep tab
│ ┌ Plan ──┬ Places ──┬ Prep ◆ ───┐  │
│ H3 ‹luggage› Packing · 0 of 5 [Reorder] │
│ ☐ Walking shoes                    │ seeded: no attribution line
│ ☐ Phone chargers                   │
│ ☐ Toiletries                       │
│ ☐ Medicines                        │
│ ☐ Warm layers for the evenings     │
│   (S) Added by Sara                │
│ [+ Add to Packing]                 │ → inline field (D9)
│ H3 ‹file-text› Documents · 2 of 3  │
│ ☑ ID cards or passports            │ zellige
│   (S) Done by Sara · Sun 8 Nov     │
│ ☑ Travel insurance                 │
│   (Y) Done by Youssef · Fri 6 Nov  │
│ ☐ Booking confirmations            │
│ [+ Add to Documents]               │
│ H3 ‹calendar-check› Bookings · 2 of 3 │
│ ☑ Accommodation  (Y) Done · Thu 5 Nov│
│ ☐ Transport                        │
│ ☑ Cooking class  (S) Done · Sat 7 Nov│
│ H3 ‹list-checks› To-do · 0 of 2    │
│ ☐ Ask someone to water the plants  │
│ ☐ Withdraw some cash               │
ADDING:  [ Sunscreen|                ] [Add] [Close]   Enter adds, keeps focus
REORDER: ☐ Walking shoes      [↑][↓]   ↑ aria-disabled on the first row
```

```
DESKTOP 1440 · Trip detail · Chefchaouen (≥ 80 rem: three columns; content ≈ 80 rem)
┌ Zamane  Home  Goals  Trips◆  Shopping ───────────────────────────── (S) Profile ┐
│ ‹ Trips                                                                          │
│ ╭──────╮ H1 Chefchaouen                            [Edit]  [+ Add to the plan]   │ masthead
│ │ ph   │ Rif mountains · Sat 21 – Wed 25 Nov · The riad has no heating… More    │
│ ╰──────╯ ┌▌12 days to go▐ Next trip┐  [9 to prep] · [1 must-do not in the plan] │
│ ──────────────────────────────────────────────────────────────────────────────── │
│ Planned vs budget  9,200 of 8,000 MAD · Over by 1,200 MAD  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │ band: budget,
│ Stay 4,400 · Activity 3,500 · Transport 700 · Food 350  ┆Ideas ~250 (3)┆ [Change]│ breakdown open
│ ──────────────────────────────────────────────────────────────────────────────── │
│ H2 Plan                       │ H2 Places        [Add a place] │ H2 Prep · 4 of 13│ 5 | 4 | 3
│ H3 Sat 21 Nov · Day 1  [+ Add]│ H3 Ideas · 3                   │ Packing 0/5      │
│ Any time                      │ ┆ Ras El Maa viewpoint       ┆ │ ☐ Walking shoes  │
│ ┃☐ Riad in the medina   4,400 │ ┆ old medina · ~0 · Must-do  ┆ │ ☐ Phone chargers │
│ ┃☐ Bus to Chefchaouen     160 │ ┆ (S)           [Schedule]   ┆ │ ☐ Toiletries     │
│ ┃☐ Dinner on the square   350 │ ┆ Goat cheese tasting        ┆ │ …  [+ Add]       │
│ H3 Sun 22 Nov · Day 2  [+ Add]│ ┆ ~150 · (Y)    [Schedule]   ┆ │ Documents 2/3    │
│ ┃☐ Akchour waterfalls   1,200 │ ┆ Kasbah museum · ~100 [Sch.]┆ │ ☑ ID cards (S)   │
│ H3 Mon 23 Nov · Day 3  [+ Add]│ H3 In the plan · 1             │ …                │
│ ░ Nothing planned ░░░░░░░░░░░ │ ┆ Spanish Mosque             ┆ │ Bookings 2/3     │
│ H3 Tue 24 Nov · Day 4  [+ Add]│ ┆ [In the plan · Tue 24 Nov] ┆ │ To-do 0/2        │
│ ┃☐ Cooking class        1,400 │                                │                  │
│ ┃☐ Hike to the Spanish Mosque │                                │                  │
│ …                             │                                │                  │
└──────────────────────────────────────────────────────────────────────────────────┘
64–80 rem: Plan (7/12) | Places, then Prep below it (5/12); the same band.
48–64 rem: the phone layout (tabs, budget disclosure), top bar, primary ending the
summary block instead of floating.
The Plan column's "Add to the plan" is hidden: the masthead primary has that label (D5).
```

### 5.3 Trip detail, happening now (Lisbon, 13:20)

```
MOBILE 390 · Trip detail · Plan tab · during the trip (also holds at 320 × 568)
┌────────────────────────────────────┐
│ ‹ Trips                     [Edit] │
│ ┌▌ 3  ▐ Happening now ─────── ╭L╮┐ │ compact summary; the doorway
│ │▌of 4▐ H1 Lisbon weekend      ╰─╯│ │   shrinks (D6, AD)
│ │▌days▐ Portugal · Sat 7 – Tue 10 │ │
│ └────────────────────────────────┘ │
│ [Planned vs budget             ▾ ] │
│ 5,600 of 6,000 MAD · 400 MAD left  │ near: neutral ink
│ ┌ Plan ◆ ──┬ Places ───┬ Prep ────┐│
│ [▸ Earlier days · Sat 7 – Sun 8 Nov│ fold, closed
│    · 4 of 4 done]                  │
│ H3 Today · Mon 9 Nov · Day 3 [+Add]│
│ ┃☑ ‹sight› LX Factory              │ zellige
│ ┃   10:00–12:00 · (S) Done · 12:05 │
│ ┃▒ NOW ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ │ saffron-soft row (DS)
│ ┃☐ ‹fork› Lunch at Time Out    250 │ 1 above the fold at 320 × 568
│ ┃   Market · 12:45–14:00           │
│ ┃   Cais do Sodré   [Directions]   │
│ ┃ NEXT                             │ text label
│ ┃☐ ‹bus› Tram 28                30 │ 2
│ ┃   15:00–16:00 · Martim Moniz     │
│ ┃                  [Directions]    │
│ ┃☐ ‹ticket› Fado dinner        450 │
│ ┃   20:30–22:30 · Alfama [Directions]│
│ H3 Tomorrow · Tue 10 Nov · Day 4   │
│ ┃☐ ‹plane› Flight home             │ no cost (included outbound)
│ ┃   18:40–21:45 · Lisbon airport   │
│              ┌───────────────────┐ │
│              │ + Add a place     │ │ D5: works offline
│              └───────────────────┘ │
├────────────────────────────────────┤
│ Home  Goals  Trips◆  Shopping  (S) │
└────────────────────────────────────┘
OFFLINE: the slim notice under the summary; ticks queue ("waiting to sync").
NOTHING LEFT TODAY: "Nothing else planned today." under Today's h3.
```

```
DESKTOP 1440 · during the trip: only the changes from 5.2
│ ┌▌Day 3 of 4▐ Happening now┐ H1 Lisbon weekend   [Edit]   [+ Add a place]  │
│ (no What's left)                                                            │
│ H2 Plan: Earlier days fold → Today (Now / Next, Directions) → Tomorrow       │
│ H2 Places: "Add a place" hidden (the masthead has it)                       │
```

### 5.4 Trip detail, no dates (Weekend in Fes) and past (Essaouira)

```
MOBILE 390 · no dates: only the summary and Plan change
│ H1 Weekend in Fes                  │
│ Fes · No dates yet    [Add dates]  │ ghost → Edit, ?focus=dates
│ [1 must-do not in the plan]        │ (Prep 11 left is first: "11 to prep")
│ Planned 440 MAD    [Set a budget]  │ no bar
│ ┌ Plan ◆ ──┬ Places ───┬ Prep ────┐│
│ H3 No date yet                     │
│ ┃☐ ‹bus› Train from Casablanca 380 │
│             ┌───────────────────┐  │
│             │ + Add a place     │  │
│             └───────────────────┘  │

MOBILE 390 · past: only the changes
│ ┌▌ 64 ▐ Past trip (sunken) ─────┐ │ DS past state
│ Planned 4,650 of 5,000 MAD · 350 MAD left │
│ Plan: every day, ticks shown; no fold; no Directions │
│ (no floating primary)              │
```

### 5.5 Sheets and confirmation

```
MOBILE 390 · Entry sheet (Home's bottom sheet; a centred 28 rem dialog from 48 rem)
├────────────────────────────────────┤
│ H2 ‹sight› Hike to the Spanish  [✕]│ focus: heading
│    Mosque                          │
│ Tue 24 Nov, 17:30–19:00            │
│ East hill            [Directions]  │
│ 0 MAD                              │
│ Link: maps.app.goo.gl ↗            │ host shown; opens a new context
│ Notes, in full …                   │
│ From Places: [Spanish Mosque]      │ → place sheet (replaces this one)
│ (Y) Added by Youssef · Sun 1 Nov   │
│ [Edit]           [Delete]          │ Delete = danger, secondary weight
└────────────────────────────────────┘

PLACE SHEET: ‹sight› Ras El Maa viewpoint · old medina · ~0 MAD · [Must-do]
             notes · link · (S) Added by Sara
             [Schedule]  [Edit]  [Delete]
ITEM SHEET:  H2 Edit item · Title [Walking shoes] ·
             Group (●Packing ○Documents ○Bookings ○To-do) · [Save] · [Delete]

CONFIRM (alertdialog, small and centred at every size)
        ┌──────────────────────────────┐
        │ Delete Spanish Mosque?       │
        │ Its plan entry on Tue 24 Nov │
        │ stays.                       │ consequence (D14)
        │ [Keep it]       [Delete]     │ focus: Keep it
        └──────────────────────────────┘
```

### 5.6 Plan entry form, place form, schedule

```
MOBILE 390 · Plan entry form · new (full-screen dialog, ?entry=new&date=2026-11-24)
┌────────────────────────────────────┐
│ [✕]  H2 Add to the plan            │ subtitle: Chefchaouen
│ Title                              │ 1
│ [ |                            ]   │ focused, required
│ Type                               │ 2 radio group, 7 chips
│ (‹plane›Flight)(‹bus›Transport)    │   wraps; default Other
│ (‹bed›Stay)(‹fork›Food)(‹sight›Sight)│
│ (‹ticket›Activity)(●‹dot›Other)    │
│ Day                                │ 3 native select
│ [ Tue 24 Nov · Day 4 · 2 planned ▾]│   + No date yet, Another date…
│ Time                               │ 4 optional
│ [start --:--]  –  [end --:--]      │
│ [+ Add details]                    │ Location · Cost · Link · Notes
├────────────────────────────────────┤ the bar rides the keyboard
│                  [Add to the plan] │
└────────────────────────────────────┘
EDIT: ?entry=<id>; heading "Edit entry"; all unfolded; "From Places: …" info;
      [Save changes]; [Delete] at the end, set apart.
PLACE FORM: Title · Type (default Other) · ☐ Must-do · [+ Add details]
            (Area · Estimated cost · Link · Notes) · [Add place]
```

```
MOBILE 390 · Schedule a place (?schedule=ras-el-maa)
┌────────────────────────────────────┐
│ [✕]  H2 Schedule                   │
│ ┆‹sight› Ras El Maa viewpoint     ┆ │ what's being scheduled (dashed)
│ ┆ Sight · ~0 MAD                  ┆ │
│ Day                                │
│ [ Choose a day                 ▾ ] │ today, during the trip
│ Time (optional)                    │
│ [start]  –  [end]                  │
│ The cost is copied from the        │
│ estimate. You can change it in the │
│ plan.                              │
├────────────────────────────────────┤
│               [Add to Tue 24 Nov]  │ label follows the day
└────────────────────────────────────┘
ALREADY SCHEDULED: "Youssef already put this on Mon 23 Nov."
                   [Show in the plan] [Close]
```

```
DESKTOP 1440 · Plan entry form (centred dialog ≈ 36 rem, ≤ 90 dvh; footer fixed)
            ┌──────────────────────────────────────────────┐
            │ H2 Add to the plan · Chefchaouen        [✕]  │
            │ Title [                                   ]  │
            │ Type  (Flight)(Transport)(Stay)(Food)…       │
            │ Day [Tue 24 Nov · Day 4 ▾]  Time [  ]–[  ]   │
            │ [+ Add details]                              │
            │ ──────────────────────────────────────────── │
            │                    [Cancel] [Add to the plan]│
            └──────────────────────────────────────────────┘
```

### 5.7 Create and edit trip

```
MOBILE 390 · Create trip (task page: no bottom nav)
┌────────────────────────────────────┐
│ [✕ Cancel]  H1 New trip            │
│ Title                              │ 1
│ [ |                            ]   │ focused, required
│ [+ Add details]                    │ 3 Destination · Dates ·
│                                    │   Budget · Notes · Cover
│               ┌──────────────────┐ │
│               │ Create trip      │ │ 2 floating; in the DOM
│               └──────────────────┘ │   after the last field
└────────────────────────────────────┘
DETAILS OPEN:
  Destination [                         ]
  Dates (fieldset)  First day [dd/mm/yyyy]  Last day [dd/mm/yyyy]
                    Both or neither.
  Budget [                         ] MAD
  Notes  [ multi-line              ]
  ╭initial╮ [Add a cover photo]   (hidden when uploads are off)
```

```
MOBILE 390 · Edit trip · date change preview (only the changes)
│ [✕ Cancel]  H1 Edit trip           │
│ Dates   First day [22/11/2026]     │
│         Last day  [26/11/2026]     │
│ ┌ preview (role=status) ─────────┐ │
│ │ 1 plan entry will fall outside │ │
│ │ the new dates. It stays in the │ │
│ │ plan, under Outside the trip   │ │
│ │ dates.                         │ │
│ └────────────────────────────────┘ │
│ … Budget · Notes · Cover           │
│ ────────────────────────────────── │
│ [Delete trip]                      │ danger, last, set apart
│               [Save changes]       │
```
(Moving Chefchaouen to 22–26 Nov leaves Sat 21's three entries outside, plus the existing Fri 20 entry. The real preview counts the entries that *newly* fall outside, here 3. The figure above is illustrative; the builder computes it.)

```
DESKTOP 1440 · Create trip (one centred column ≈ 36 rem; the top bar stays)
│                  ‹ Trips                                                    │
│                  H1 New trip                                                │
│                  Title  [                                   ]               │
│                  [+ Add details]                                            │
│                  [Create trip]   [Cancel]                                   │
```

---

## 6. Interaction specs

### 6.1 Reused (don't rebuild)
- **From Home:**
  - the floating primary (56 px, `--fab-zone`, in the DOM right after the summary block);
  - the toast (10 s, paused on hover and focus, Esc, Undo is the next Tab stop);
  - the bottom sheet;
  - the slim notice;
  - skeletons;
  - forced-colours rules;
  - focus restoration keyed by `data-key="<tripId|entryId|placeId|itemId>"`.
- **From Goals (`shared.js`):**
  - `Z.doorway`, `Z.bar` (add a `budget` mode with danger "Over by…"), the confirmation dialog, `Z.announce` (it targets the topmost dialog), `Z.setOffline`, routing and drafts;
  - the composer's dialog chassis, for the three form dialogs;
  - the Reorder-mode rows;
  - the three-way merge (Goals §6.7).
- **From the design system:** TripCountdown (all three states), Progress (`mode="budget"`), PartnerAvatar, Button, and the ShoppingItem checkbox for every tick.

### 6.2 Targets
- **At least 44 × 44 px** everywhere (the system's rule).
- **Plan rows and checklist rows:** at least 56 px tall. The tick is a 44 px square at the start, with 8 px or more before the row button.
- **Place cards:** the Schedule or "In the plan" button is at least 44 px tall, and the main target stops before it.
- **Day Add buttons:** 44 px, with a visible "Add" label, never an icon alone.
- **Directions:** 44 px.
- **Tabs:** at least 44 px tall, each a third of the width on phones.
- **Move up and Move down:** 44 px, with 8 px between them.

### 6.3 Focus on route change and on close

| Arrival | Focus goes to | Announced |
|---|---|---|
| `/trips`, forward | the h1 | `document.title` |
| `/trips`, Back from a detail | that trip's card, with scroll restored | — |
| `/trips`, after deleting a trip | the h1 | the toast |
| `/trips/:id`, forward | the h1 | title |
| `/trips/:id`, after create | the h1 | "Trip created." |
| `/trips/:id`, after an edit save or cancel | **Edit** | the toast "Changes saved" (on save) |
| `/trips/new` | **Title** | title |
| `/trips/:id/edit` | the h1, or the `?focus=` field | title |
| a form dialog opens (new) | Title | dialog name |
| a form dialog opens (edit) | the dialog heading | dialog name |
| after adding an entry | the new row's button (scrolled into view) | the toast |
| after scheduling | the place card's "In the plan" link | the toast |
| after adding a place | the new card, when the Places panel shows; otherwise the primary | the toast |
| "What's left" or "In the plan" links | the target panel's h2, or the target row | — |
| a sheet or dialog closes | its invoker; after a delete, the next row, else the previous row, else the group's or day's Add | — |
| the inline checklist field closes | its "Add to {group}" button | — |

### 6.4 Keyboard model

| Widget | Keys |
|---|---|
| List cards | One Tab stop per card (a stretched link); Enter opens it. |
| Detail tabs (< 64 rem) | ARIA tabs with automatic activation. ←/→ move (mirrored in RTL); Home/End; one Tab stop for the tablist. Selecting writes `?view=` (replace). If the tablist has scrolled away, it's scrolled back to the top on selection. |
| Budget line, notes "More", "Earlier days", "Add details" | Disclosure buttons with `aria-expanded`; Enter or Space; focus stays on the toggle. |
| Plan rows | Two Tab stops: the **tick** (a native checkbox, or `role="checkbox"`; Space toggles) and the **row** (`<button>`, Enter or Space opens the sheet). The row's name reads, for example, "Hike to the Spanish Mosque, Tue 24 Nov 17:30 to 19:00, east hill, 0 MAD, from Places". A **Directions** link is a third stop on Today's rows. No arrow-key navigation between rows. |
| Day Add | A button named "Add to Tue 24 Nov". |
| "Jump to a day" | A native select; on change, focus moves to that day's h3. |
| Place cards | Two Tab stops: the main button (opens the sheet) and Schedule, or the "In the plan" link. |
| Checklist rows | The tick, then the row button (opens the item sheet). |
| Inline checklist add | Enter adds and keeps focus; Esc closes and focus returns to "Add to {group}"; Shift+Tab leaves the field without closing it. |
| Reorder mode | A toggle with `aria-pressed`. Move up and Move down are `aria-disabled` at the ends, so they stay focusable. After a move, focus stays on the same button of the moved row; if that button is now disabled, focus goes to the other one. The new position is announced. |
| Type and Group pickers | Native radio groups: one Tab stop, arrows change the selection. |
| Day select, date and time inputs | Native controls. Times are shown 24-hour where the platform allows; native time inputs follow the OS locale (§7 U-g). |
| Form dialogs | Tab order: ✕ → fields → Add details → submit. **Ctrl/⌘ + Enter submits** (`aria-keyshortcuts`). Esc closes, behind the discard guard when dirty. |
| Sheets | Native modal `<dialog>`: Tab is trapped, Esc closes, focus returns to the invoker. |
| Confirm | `role="alertdialog"`, labelled by its question and described by its consequence. Focus starts on the safe button. Esc cancels. No backdrop dismissal. |
| Toast | As on Home. |

### 6.5 Dialogs and sheets

| Dialog | Phone | ≥ 48 rem | URL | Dismissal |
|---|---|---|---|---|
| Entry, place and item sheets | bottom sheet | centred, 28 rem | none | ✕, Esc, backdrop (press and release outside) |
| Plan entry form, place form | full screen; the footer rides the keyboard (visualViewport) | centred, ≈ 36 rem, ≤ 90 dvh | `?entry=` / `?place=` (pushed) | ✕, Esc and Back, all guarded when dirty; no backdrop dismissal |
| Schedule | full screen | centred, ≈ 32 rem | `?schedule=` (pushed) | ✕, Esc, Back (guarded only once a day is chosen) |
| Confirm | small, centred | small, centred | none | Keep or Esc only |

- **Stacking:** only the confirmation stacks, on a sheet or a form. Going from a sheet to Edit closes the sheet and opens the form; they don't stack.
- **Live regions:** each dialog has its own polite and alert regions. Partner announcements are mirrored into the open dialog (Goals §6.5).
- **Android Back** closes the URL-backed dialogs. Sheets should push a history state too (Goals' shared recommendation).

### 6.6 Drag alternatives [WCAG 2.5.7, 2.5.1]
**There is no dragging anywhere in this area:**
- **no drag from Places to a day.** Desktop users may expect it; **Schedule** is the single path, and it shows the day's load in the Day select;
- **no drag to reorder** checklist items (Reorder mode) or plan entries (order comes from times);
- **no swipe** to tick, delete or switch tabs;
- **no pull-to-refresh.**

If drag-to-schedule is ever added on desktop, Schedule stays, and a drop opens the same dialog pre-filled. A drop never commits on its own.

### 6.7 Concurrency
- **Editable records:** the Goals §6.7 three-way merge applies unchanged to the trip (title, destination, **dates as one field**, budget, notes, cover), plan entries (title, type, date, start, end, location, cost, url, notes), places (title, type, area, notes, url, estimated cost, must-do) and checklist items (title, group).
- **Ticks** are set-state, with no `updatedAt` check: the last write wins (ARCH D9). Whether a tick bumps `updated_at` decides whether an open edit gets a 409; the client retries silently when nothing editable differs (§7 A3).
- **Scheduling** is arbitrated by `UNIQUE(place_id)`. The loser gets the "already scheduled" state (F3, §7 A1).
- **Checklist order:** see §7 A4. Until there's an atomic order endpoint, a move that collides with the partner's move refetches and re-renders the server's order, keeping focus by id.
- **Naming who changed it:** the partner's first name; "on your other device" when it was me; "on another phone" when unknown (Goals).

### 6.8 Feedback: what responds, and where

| Action | Immediate | Then |
|---|---|---|
| Tick a plan entry or checklist item | the checkbox state, zellige, attribution (optimistic) | nothing else; offline adds "waiting to sync" |
| Add a plan entry | the dialog closes and the row appears in its day | toast with Undo; focus on the row |
| Schedule a place | the dialog closes; the card shows "In the plan"; the entry appears | toast with Undo |
| Add a place | the dialog closes and the card appears | toast with Undo (with "Will sync…" offline) |
| Add a checklist item | the line appears; the field clears and keeps focus | "Added {item} to {group}." (polite) |
| Delete (confirmed) | the row or card is removed; figures update | toast, no Undo; focus to the next element |
| Save an edit | the dialog or page closes and the values update | toast "Changes saved" |
| Create or delete a trip | navigation | "Trip created." / toast "{trip} deleted" |
| Cover upload | progress inside the arch | done or failed at the field |
| A press on any `aria-disabled` control | nothing changes | its reason inline next to it, announced once |
| A partner change | in place, no toast, no animation | one polite announcement (F13) |
| Time passing (Now and Next, status) | in place | none |

### 6.9 Destructive actions: undo or confirm

| Action | Mechanism | Why |
|---|---|---|
| Undo my just-added entry, place or schedule | **Undo** in the toast | my own act, seconds old (Home) |
| Untick | the checkbox itself | set-state, symmetrical, attributed |
| Delete a plan entry | **Confirm**, naming the place that goes back to ideas or loses "visited" | DS rule; no undelete; shared |
| Delete a place | **Confirm**, naming the plan entry that stays | same |
| Delete a checklist item | **Confirm** (short) | DS rule; reversible with the user (U-c) |
| Remove a queued place | **Confirm**, "It hasn't synced…" | one rule for every delete |
| Delete a trip | **Confirm**, with counts, "for both of you" | cascades to everything |
| Discard a dirty form | **Confirm**, only when dirty | protects typed input [WCAG 3.3.7] |
| Replace or remove a cover in Edit | none; applies on Save, Cancel reverts | not committed until Save |

### 6.10 What the system does for the user [Tesler]
- **Status, days, Now and Next, Earlier days, and "visited"** are all computed, never set (`trip-days`, ARCH §4.3).
- **Days are pre-filled** from where you tapped: a day's Add, an empty day's well, today during the trip.
- **The Day select shows each day's load** ("2 planned"), so you can choose without looking back.
- **Scheduling copies** title, type, link, area → location and estimate → cost (ARCH D11). The budget doesn't double-count.
- **The Prep group** is pre-filled by the Add you used. Enter keeps the field open for the next item.
- **Overnight times** are understood ("Ends the next day").
- **Dates:** the last-day picker opens at the first day's month (`min` = first day). Long trips and past dates get helpers, not errors.
- **Money parsing** (`money.ts`); the currency comes from the space.
- **The checklist is seeded on create** (ARCH D24).
- **Drafts** survive navigation and a reload. Retries are idempotent (client ids).
- **Directions** are built from the location text (U5), so the couple never types a maps link.

### 6.11 Screen-reader semantics
**Trips list:**
- h1 "Trips";
- an h2 per section;
- an h3 per trip title;
- the lead card's count is part of the link's name: "Chefchaouen, Rif mountains, Sat 21 to Wed 25 Nov, 12 days to go".

**Trip detail:**
- h1 is the trip title;
- the status sits in the summary as text ("12 days to go", "Day 3 of 4, happening now");
- the budget disclosure button sits inside an h2 "Budget";
- Plan, Places and Prep are h2s: visible from 64 rem, visually hidden inside the tab panels below it;
- day groups and place groups are h3s; each checklist group is an h3 with its count;
- "Now" and "Next" are text inside the row's name, not only a fill [WCAG 1.4.1].

**Progress (budget):** `role="progressbar"` with `aria-valuetext`, for example "9,200 MAD planned of 8,000 MAD, over by 1,200 MAD".

**Ticks:** the checkbox name is "{title} done" (Packing: "{title} packed"). The attribution is linked with `aria-describedby`.

**Ideas vs commitments in words:** the place card's name ends with "idea" or "in the plan, Tue 24 Nov". An entry from a place says "from Places". The dashed and solid styling are never the only signal.

**Images:** the cover is decorative (`alt=""`); the title is beside it.

**Amounts and times** are marked `dir="ltr"` inside RTL text.

**One polite page region,** mirrored into dialogs. Nothing is announced on load or for time passing.

### 6.12 Motion
- **Budget bars don't animate:** they change by edits, not contributions [DS].
- **Ticks** get the checkbox's own short state change; under reduced motion it's instant.
- **No animation** on tab switches or on Now and Next moving.
- **The Earlier days fold** opens without a height animation under reduced motion.
- **Sheets, dialogs and toasts** follow Home's motion, including its reduced-motion path.

---

## 7. Open questions

### For the user: these change structure (each has a default, which the prototype builds)
1. **U1 · Budget is not a tab** (D3). There are three tabs (Plan · Places · Prep), and the budget sits in the summary: a disclosure on phones, open in the band on wide screens. The brief lists four parts. [Default: three tabs, following Goals' Stats decision and Goals' own note "plan, places and prep".]
2. **U2 · The primary during the trip is "Add a place"** (it works offline), not "Add to today" (D5). An undated trip also gets "Add a place", and a past trip gets no floating primary. [Default: as written. Switching to "Add to today" changes only the label and the form it opens.]
3. **U3 · The Lisbon choice** (D1): Lisbon is a `trip-now` scenario, Home's default is unchanged, and **Home's `trip-now` state is pointed at Lisbon** (one line in `home.html`). Is changing Home's trip-now state OK? [Default: yes. If not, the Trips prototype still uses Lisbon, and Home's trip-now keeps its redated Chefchaouen.]
4. **U4 · Wide layout** (D4): two columns at 64–80 rem (Plan | Places + Prep), three at ≥ 80 rem, with the detail wider than Home's 1,080 px wrap. The in-trip forms are centred modal dialogs, not side panels. [Default: as written.]
5. **U5 · Directions:** a link built from the location text, opening the platform's maps app. Which provider? Google Maps universal links open the app on both platforms; Apple Maps links work best on iOS. The location text goes to the provider only when the link is tapped. [Default: a Google Maps search URL; no link when there's no location.]

### For the user: reversible details I've decided (say if you disagree)
- **(a)** No counts in the tab labels; "What's left" carries the two counts that matter.
- **(b)** Plan is the default tab for every status, including undated trips.
- **(c)** Deleting a checklist item is confirmed (DS rule), even though it's low-stakes. The alternative is an Undo toast that re-creates the item with the same id, losing its original "Added by".
- **(d)** Ticked checklist lines stay in place and aren't struck through. Ticked plan entries stay in place too.
- **(e)** Places' default type is **Other**, as for plan entries. Sight might be a better default for places.
- **(f)** An entry with a start and no end counts as "Now" for 60 minutes.
- **(g)** Native time inputs follow the OS locale, so an en-US phone may show 12-hour times despite the DS's 24-hour rule. The alternative is a text field with an `HH:MM` mask.

### For the architect (none blocks the prototypes; defaults in brackets)
1. **A1 · Scheduling an already-scheduled place.** What does `POST …/places/:placeId/schedule` return when `place_id` is already used: `409 already_scheduled` with the existing entry in the body? [Default: a 409 with the entry, so the UI can name the day and who did it.]
2. **A2 · Budget response shape.** Return the plan costs by type, the ideas total (and the ideas count), and the count of entries with no cost, separately: `{ planned, budget, overBudget, planByType, ideas: { total, count }, uncostedCount }`. The client could compute these from cache, but derived values belong to the service. [Default: the client computes them in the prototype.]
3. **A3 · Do ticks bump `updated_at`?** If they do, a partner's tick gives my open edit form a 409. The client retries silently when nothing editable differs. Please confirm the 409 body is the full row (as asked in Goals Q5).
4. **A4 · Checklist reordering.** A move means swapping two `position`s, which is two PATCHes and conflict-prone. Proposal: `PUT …/checklist/order { group, ids[] }`, atomic, last write wins. [Default: two PATCHes in the prototype.]
5. **A5 · Seeded checklist items** have `created_by` = the trip's creator, so "Added by Sara" would be false on 11 automatic lines. Add `seeded boolean` (or a `source`) so the UI can omit the attribution. [Default: treat items created in the same write as the trip as seeded.]
6. **A6 · The trips list payload.** For "What's left" on the lead card, and to avoid fetching every trip's plan: per trip, `prepLeft`, `mustDoUnplanned`, and `planned`/`budget`. [Default: the list cards don't show "What's left" in v1; the detail does.]
7. **A7 · `trip-days` rules to confirm:**
   - the group label for dated entries in an undated trip (not "outside");
   - Now when there's no end time (60 minutes?);
   - Next across midnight;
   - times are wall-clock times at the destination (no time zone stored).
8. **A8 · Changing trip dates** leaves entries where they are, and they may move into "outside". Is a later "shift entries with the trip" bulk endpoint wanted? [Default: no; the preview warns.]
9. **A9 · Offline checklist add.** `['checklist','add']` isn't in the offline map, but list-making on the move is a real case (packing on the train). Adding it is the same pattern as `places add`. [Default: not queued; the field keeps the text and says why.]
10. **A10 · Do `trip_places.type` and `trip_plan_entries.type` share one enum?** Scheduling copies the type, and the budget groups by it. [Default: one enum: flight, transport, stay, food, sight, activity, other.]
11. **A11 · Trip length.** There's no cap, so a 400-day typo renders 400 empty days. [Default: no server cap; a UI helper above 31 days.]
12. **A12 · Delete-trip counts** in the confirmation come from the cached detail. Confirm that `DELETE /api/trips/:id` cascades to all three child tables and destroys the cover (ARCH §8 says it does).

---

## 8. For the builders: prototype states and example data

**One query parameter per URL**, before the hash (Goals' Windows screenshot rule). The trip goes in the hash route, the state in `?state=`. **Today is fixed at Mon 9 Nov 2026**, and **the time at 13:20** (only Lisbon uses it).

### Routes
- `trips.html#/trips`
- `#/trips/:id`, with `?view=plan|places|prep` in the hash
- `#/trips/:id?entry=new|<id>` · `?place=new|<id>` · `?schedule=<placeId>`
- `#/trips/new`
- `#/trips/:id/edit`
- **Trip ids:** `chefchaouen`, `lisbon`, `fes`, `essaouira`. **`#/trips/lisbon` always includes Lisbon** (D1).

### States
- **Global** (they persist across routes):
  - `offline`
  - `uploads-off`
  - `solo`
  - `trip-now` (Lisbon in the list)
  - `empty`
- **List:**
  - `populated`
  - `trip-now`
  - `empty`
  - `only-past`
  - `loading`
  - `error`
  - `stale`
  - `offline`
  - `uploads-off`
  - `live` (Youssef creates "Marrakech with Mum", example data, with no dates, after 0.3 s)
- **Detail** (any trip id):
  - **Panels:** `populated`, `places`, `prep`, `budget-open`
  - **Loading and failure:** `loading`, `partial`, `section-error`, `error`, `not-found`
  - **Offline and uploads:** `offline`, `not-cached`, `uploads-off`
  - **Sheets and confirmation:** `entry-sheet`, `place-sheet`, `item-sheet`, `confirm-delete-entry`, `confirm-delete-place`
  - **Prep:** `adding-item`, `reorder`
  - **Toasts:** `toast-added`, `toast-scheduled`, `toast-place-queued`
  - **Queued and rejected:** `tick-queued`, `sync-rejected`
  - **Live:** `live-tick` (Youssef packs "Phone chargers"), `live-place` (Youssef adds "Café with a view", example data), `live-entry` (Youssef adds "Breakfast on the roof", Sun 22 Nov, 09:00), `live-dates` (Youssef moves Chefchaouen to 22–26 Nov), `live-deleted`
  - **Dialogs:** `entry-form`, `entry-form-details`, `entry-form-invalid`, `entry-form-offline`, `entry-form-conflict`, `place-form`, `place-form-offline`, `schedule`, `schedule-taken`
  - **Lisbon only:** `now-last-day` (pretends today is Tue 10 Nov, 19:00), `now-nothing-left` (21:00 on Mon 9 Nov)
- **Form** (`#/trips/new` or `#/trips/chefchaouen/edit`):
  - `invalid`
  - `one-date`
  - `details`
  - `cover-uploading`
  - `cover-failed`
  - `offline`
  - `uploads-off`
  - `date-preview`
  - `partner-changed`
  - `conflict`
  - `not-found`
  - `delete-confirm`
  - `focus-budget`

### Example data
**From the design system:**
- Chefchaouen (Rif mountains, 21–25 Nov, 12 days to go);
- Lisbon weekend (Portugal, 7–10 Nov);
- Essaouira (Atlantic coast, 2–6 Sep, past);
- the place "Ras El Maa viewpoint" (sight · old medina · ~0 MAD · must-do);
- the entry "Hike to the Spanish Mosque" (Tue 24 Nov, 17:30–19:00);
- the budget 9,200 planned against 8,000 MAD.

**Everything else is example data, labelled on screen.** The figures add up.

#### Chefchaouen (coming up) · Sat 21 – Wed 25 Nov 2026
- **Trip:** created by Sara. Budget 8,000 MAD. Example cover (a sunken arch labelled "Example photo"). Notes: "The riad has no heating. Pack warm layers." (example).
- **Plan entries (9):**

| Day | Entry | Type | Time | Location | Cost (MAD) | Added by | Notes |
|---|---|---|---|---|---|---|---|
| Fri 20 Nov (**outside the dates**) | Train to Fes | transport | 15:10–19:20 | Casa Voyageurs | 380 | Youssef | |
| Sat 21 · Day 1 | Riad in the medina | stay | any time | — | 4,400 | Sara | "Check-in from 14:00. 4 nights." |
| Sat 21 · Day 1 | Bus to Chefchaouen | transport | 08:00–12:15 | CTM station, Fes | 160 | Youssef | |
| Sat 21 · Day 1 | Dinner on the square | food | 20:00 | Outa el Hammam | 350 | Sara | |
| Sun 22 · Day 2 | Akchour waterfalls | activity | 08:30–17:00 | Akchour | 1,200 | Youssef | |
| Mon 23 · Day 3 | **empty day** | | | | | | |
| Tue 24 · Day 4 | Cooking class | activity | 10:00–13:00 | — | 1,400 | Sara | |
| Tue 24 · Day 4 | **Hike to the Spanish Mosque** | sight | 17:30–19:00 | east hill | 0 | Youssef | from the place Spanish Mosque |
| Wed 25 · Day 5 | Bus back to Fes | transport | 15:00–19:15 | — | 160 | Youssef | |
| **No date** | Hammam and massage | activity | — | — | 900 | Sara | |

  - **Plan total:** 8,950 MAD (transport 700, stay 4,400, food 350, activity 3,500, sight 0). None are done.
- **Places (4):**
  - **Ras El Maa viewpoint:** sight · old medina · ~0 · **must-do** · idea · Sara.
  - **Spanish Mosque:** sight · east hill · ~0 · **scheduled** (Tue 24 Nov, 17:30) · Youssef.
  - **Goat cheese tasting:** food · Outa el Hammam · ~150 · idea · Youssef.
  - **Kasbah museum:** sight · Outa el Hammam · ~100 · idea · Sara.
  - **Ideas total:** ~250 MAD (3 places).
- **Budget:** 8,950 + 250 = **9,200 of 8,000 MAD · over by 1,200** (the design system's figures).
- **Prep (13; 4 done, 9 left):**
  - **Packing 0/5:** Walking shoes\*, Phone chargers\*, Toiletries\*, Medicines\*, Warm layers for the evenings (Sara).
  - **Documents 2/3:** ID cards or passports\* (✓ Sara, Sun 8 Nov), Travel insurance\* (✓ Youssef, Fri 6 Nov), Booking confirmations\*.
  - **Bookings 2/3:** Accommodation\* (✓ Youssef, Thu 5 Nov), Transport\*, Cooking class (added by Youssef; ✓ Sara, Sat 7 Nov).
  - **To-do 0/2:** Ask someone to water the plants\*, Withdraw some cash\*.
  - \* = the example seed (11 items). The real seed list lives in `checklist-seed.ts` (ARCH D24).
- **What's left:** "9 to prep · 1 must-do not in the plan".

#### Lisbon weekend (happening now; `trip-now`, or always at `#/trips/lisbon`) · Sat 7 – Tue 10 Nov 2026 · Day 3 of 4
- **Trip:** created by Youssef. Budget 6,000 MAD. No cover (initial L).
- **Plan entries (9; "now" is 13:20):**

| Day | Entry | Type | Time | Location | Cost (MAD) | Status |
|---|---|---|---|---|---|---|
| Sat 7 | Flight to Lisbon | flight | 07:05–08:10 | Casablanca → Lisbon | 2,800 | ✓ Sara, 08:20 (note: "Return included") |
| Sat 7 | Apartment in Alfama | stay | any time | — | 1,800 | ✓ Youssef, 12:30 |
| Sun 8 | Belém Tower | sight | 10:00–11:30 | Belém | 100 | ✓ Youssef, 11:40 (from a place, so the place is **visited**) |
| Sun 8 | Pastéis de Belém | food | 11:45–12:15 | — | 60 | ✓ Sara, 12:10 |
| Mon 9 · today | LX Factory | sight | 10:00–12:00 | Alcântara | no cost | ✓ Sara, 12:05 |
| Mon 9 · today | Lunch at Time Out Market | food | 12:45–14:00 | Cais do Sodré | 250 | **Now** |
| Mon 9 · today | Tram 28 | transport | 15:00–16:00 | Martim Moniz | 30 | **Next** |
| Mon 9 · today | Fado dinner | activity | 20:30–22:30 | Alfama | 450 | |
| Tue 10 | Flight home | flight | 18:40–21:45 | Lisbon airport | no cost | |

  - **Plan total:** 5,490 MAD. 2 entries have no cost.
- **Places (3):**
  - **Belém Tower:** sight · Belém · ~100 · scheduled and **visited** (Sun 8 Nov · Youssef).
  - **Pena Palace:** sight · Sintra · ~110 · **must-do** · idea.
  - **Miradouro da Senhora do Monte:** sight · Graça · ~0 · idea.
- **Budget:** 5,490 + 110 = **5,600 of 6,000 MAD · 400 left** (the near case, 93%).
- **Prep:** the 11 seeded items, 10 done, by both partners on Fri 6 Nov. "Withdraw some cash" is left.

#### Weekend in Fes (no dates)
- **Trip:** destination Fes. Created by Youssef. No budget.
- **Plan:** "Train from Casablanca" (transport, no date, 380, Sara).
- **Places:**
  - **Chouara tannery:** sight · Fes el-Bali · ~20 · must-do · Youssef.
  - **Bou Inania madrasa:** sight · Talaa Kebira · ~40 · Sara.
- **Budget:** planned **440 MAD**, no budget.
- **Prep:** the seed, 0 of 11.
- **What's left:** "11 to prep · 1 must-do not in the plan".

#### Essaouira (past) · Wed 2 – Sun 6 Sep 2026 · 64 days ago
- **Trip:** budget 5,000 MAD.
- **Plan (all done, by both partners):**
  - Bus to Essaouira, Wed 2 Sep, 300 (return);
  - Riad, Wed 2 Sep, any time, 2,800;
  - Grilled fish at the port, Thu 3 Sep, 19:30, 250;
  - Sunset on the Skala, Thu 3 Sep, 18:00, 0 (from the place "Skala de la Ville", so visited);
  - Surf lesson, Fri 4 Sep, 10:00–12:00, 600;
  - Day at Sidi Kaouki, Sat 5 Sep, 400;
  - Bus home, Sun 6 Sep, 300.
- **Budget:** planned **4,650 of 5,000 MAD · 350 left**.
- **Prep:** the seed, 11 of 11.

**Home links:** `#/trips/chefchaouen`, `#/trips/new` and `#/trips` keep working, and `#/trips/lisbon` is added for Home's realigned `trip-now` (D1, U3).

**Footnote on every screen:** "Prototype. Example data; the trips, dates and the 9,200 / 8,000 MAD budget are the design system's, everything else is example data." Under Lisbon, it adds: "Scenario: during the Lisbon weekend, Mon 9 Nov at 13:20."
