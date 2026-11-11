# Brief: Zamane Trips area (list, trip detail, create/edit, and the add forms inside a trip)

**Mode:** department-lite, as for Goals (user's choice, Wed 11 Nov 2026).
- Steps: Architect → (Writer ∥ Art Director) → user picks a direction → Director builds the shared layer and the list ∥ front-end engineers build the detail sections and forms.
- **No Researcher:** ARCHITECTURE.md and the design system already fix the features.
- **No Design Systems role:** the tokens exist. Small additions are recorded in the build notes, as Goals did.
- **No Critic or Accessibility passes.** The user stops design runs at the build unless they ask for reviews. Builders still self-check with screenshots, and WCAG 2.2 AA remains the floor.

## Request
Design the Trips area of the Zamane PWA ("Trips: plan, places, prep" in the nav brief). Deliver a working standalone HTML prototype, linked into one flow like `goals.html`:

1. **Trips list** (the Trips tab): every trip in the space. Each has a status computed on the device: happening now, upcoming, unscheduled (no dates) or past.
2. **Trip detail:** one trip's header (title, destination, dates, status or countdown, optional cover in the arch, optional notes) and four parts:
   - **Plan:** the day list from start to end date inclusive, with empty days kept. Plan entries are typed (flight, transport, stay, food, sight, activity, other) and have an optional time range, location, cost, URL and notes. A **done** tick records who ticked it and when. Two extra groups hold entries outside the trip dates and unscheduled entries. While the trip runs, it shows "now / next".
   - **Places:** ideas, not commitments. Each has a type, area, notes, URL, estimated cost and a **must-do** flag. A place can be **scheduled** into the plan at most once, which pre-fills the entry's cost from the estimate. It is "visited" once its plan entry is done.
   - **Checklist (prep):** four groups (packing, documents, bookings, to-do). Items are ordered, ticked with who and when, and seeded on create.
   - **Budget:** planned = Σ plan costs + Σ estimates of unscheduled places, grouped by type, against an optional budget, with an over-budget state.
3. **Create and edit trip:** only the title is required. Destination, dates (both or neither, end ≥ start), budget, notes and cover are optional and folded away. Edit holds **delete trip**.
4. **Add and edit inside a trip:** plan entry, place, checklist item, and "schedule this place" (choose a day and time).

## Users and success actions
The same couple as Home and Goals: Sara (partner A, majorelle) and Youssef (partner B, terracotta), each on their own phone.
- **Before the trip** the usage is mostly planning. It often happens on desktop, and the two partners often work at the same time.
  - Jobs: "When do we leave, and what's left to sort out?", "Drop an idea in Places", "Put this on Tuesday".
- **During the trip** the usage is phone, one hand, often a weak connection.
  - Jobs: "What's next today?", "Tick it off", "Where is it?"
- **Success actions:**
  - **List:** pick the right trip in one glance and one tap. The current or next trip leads.
  - **Detail:** the screen's primary action depends on the trip's status. Recommend it in the IA. My hunch is **Add to the plan** before the trip and **what's next and tick done** during it. Capture is always seconds away.
  - **Create:** a trip with only a title in seconds. [design system: quick capture]

## Platform and stack
- **Platform:** a mobile-first PWA, 320 px and up, light and dark, safe areas. Desktop is a first-class planning surface.
  - Below 64 rem, the detail uses **tabs**.
  - On wide screens it uses **columns**, as Goals' IA anticipated: "Trips will need the same tabs-to-columns pattern for plan, places and prep."
- **Offline and sync:**
  - **Offline:** follow ARCHITECTURE.md §9. Check which trip writes it queues (the plan and checklist `setDone` and `places add` appear in the mutation map). Everything else needs a connection, and the UI says so.
  - **Realtime:** the partner's changes appear without a refresh.
  - **Conflicts:** edits use `updatedAt`. When the partner changed something first, the API returns 409.
- **Data rules from ARCHITECTURE.md §4:**
  - trip status, the day list and now/next are computed on the client by `trip-days`;
  - the budget formula (D11);
  - a place is scheduled at most once;
  - deleting a place keeps its plan entry;
  - deleting the plan entry unschedules the place.
- **Uploads:**
  - The trip cover goes straight to Cloudinary and is shown in the arch.
  - With `uploadsEnabled: false`, the upload controls are hidden and the title's initial is used.
- **Target stack:** React 19 + TanStack Router/Query (not scaffolded yet). The prototypes are plain HTML, CSS and a little JS.

## Brand constraints (binding)
- **Design system:** `Zamane Design System.html`.
  - **Tokens and components:** TripCountdown, Progress (`mode="budget"`: danger with "Over by…"), PartnerAvatar and Button.
  - **Icons** (Lucide 1.75):
    - plan types: plane, train-front, bed-double, utensils, landmark, ticket, circle-dot;
    - checklist groups: luggage, file-text, calendar-check, list-checks.
  - **Ideas look lighter than commitments:** a Place has a **dashed outline**, a plan entry is a **solid card**, and the two are never styled alike.
  - **Saffron is for time and celebration:** the countdown block and `saffron-soft` "happening now" rows.
  - **Zellige means done:** a ticked plan entry and a packed checklist line.
  - **Terracotta** is used for trip budget bars.
  - **The arch is for imagery only.**
  - **Who did what, always:** attribution on ticks and adds.
  - **Numbers are earned:** the budget total opens its breakdown.
- **Established patterns, reused:**
  - nav bar: `.ux-forge/nav-bar/`;
  - Home: `.ux-forge/home/`, including the floating primary on phones, the masthead primary on wide screens, the toast with Undo (10 s), live updates without a toast, and the TripCountdown use;
  - Goals: `.ux-forge/goals/`, direction **B · Doorway** (`decision.md`):
    - the cover is a doorway;
    - the shared-layer API is in `shared.js`;
    - form routes hide the bottom nav;
    - the tabs follow `?view=`;
    - the year is shown only when a date isn't in the current year;
    - the offline notice wording.
- **The Trips direction is new but must sit in the same family** as Goals B. The Art Director proposes directions within the system, not a rebrand.
- **Logo files** in `assets/` are read-only.

## Example data (prototype only, labelled on screen)
- **Prototype "today":** fixed at **Mon 9 Nov 2026**, as in Goals and Home.
- **From the design system:**
  - Chefchaouen (Rif mountains, 21–25 Nov, 12 days to go);
  - Lisbon weekend (Portugal, 7–10 Nov);
  - Essaouira (Atlantic coast, 2–6 Sep, past);
  - the place "Ras El Maa viewpoint" (sight, old medina, ~0 MAD, must-do);
  - the plan entry "Hike to the Spanish Mosque" (Tue 24 Nov, 17:30–19:00);
  - the budget example: 9,200 planned against 8,000 MAD.
- **Conflict to resolve (Architect):** on 9 Nov, Lisbon is *happening now*, yet Home's default state shows Chefchaouen as the next trip. Pick one:
  - keep Lisbon as a `trip-now` state rather than the default;
  - or redate it;
  - or accept that Home's default changes.

  Record the choice.
- **The seed's shape** (ARCHITECTURE.md §5): a trip with plan entries across three days, one empty day, one entry outside the range, places (one scheduled, one must-do) and a seeded checklist.
- Anything else new is example data, labelled as such. Nothing invented is presented as real.

## Assumptions
- **Currency:** the space's currency is MAD, as in the other prototypes.
- **One trip at a time:** no multi-currency budgets and no shared-trip export or share links in v1.
- **Maps:** a location is text plus an optional URL. There is no embedded map.
- **Ordering:** checklist items reorder within their group, using `position`.
- **No undated end:** a trip with dates always has both dates (D12).
