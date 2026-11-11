# Copy: Zamane Trips (list, trip detail, forms, sheets, confirmations, states)

**Format.** `id` | string | notes. `{braces}` are values the app fills in. Counts use ICU plural syntax inside one whole-sentence key. Dates, times and amounts arrive pre-formatted from `Intl` (`{date}` = "Tue 24 Nov", `{time}` = "17:30", `{amount}` = "9,200", `{range}` = "Sat 21 – Wed 25 Nov"). Nothing is assembled from fragments.
**Reuse.** Rows marked **(Home)** or **(Goals)** are those files' settled strings, used verbatim, with their ids. Where Goals' wording fits but its id says `goal`, the string is repeated here under a Trips id so the key can be translated per noun.
**Overrides applied.** `decision.md` U5: **no "Directions" anywhere**, no maps-provider link, no text about a maps app. A location is plain text. The only links are the pasted `url`, shown as its host.
**Names.** `{name}` is a partner's first name. `{title}` is a plan item, place, checklist item or trip title as typed. `{trip}` is the trip title. `{group}` comes from the `prep.group.name` select.
**Namespaces** avoid Goals' (`entry.*`, `note.*`, `form.*` are taken): `trips.*` list, `trip.*` detail, `plan.*`, `planSheet.*`, `planForm.*`, `place.*`, `placeSheet.*`, `placeForm.*`, `schedule.*`, `prep.*`, `itemSheet.*`, `budget.*`, `tripForm.*`, `tripToast.*`, `tripLive.*`, `tripConfirm.*`, `tripMerge.*`, `tripCommon.*`.

---

## Voice

Inherited from Home, the design system and Goals: **warm, plain, specific.** Sentence case, verbs first, plural "you", first names. No exclamation marks, no emoji in the interface (people's own notes may have them).

| Adjective | This | Not that |
|---|---|---|
| Warm | "Nothing planned yet. Add the first thing with Add to the plan." | "Your itinerary is empty. Start planning your dream trip!" |
| Plain | "Spanish Mosque goes back to your ideas." | "The associated place will be unscheduled." |
| Specific | "Youssef put Spanish Mosque on Tue 24 Nov." | "A place was updated." |

**Tone by moment.**
- **Planning (before the trip, often on desktop):** unhurried, complete sentences are fine. Helpers say what a field is for.
- **During the trip (phone, one hand, weak signal):** the shortest possible. Times, titles and places do the talking. "Now", "Next", "Nothing else planned today". Errors say what still works.
- **After the trip:** quiet. No prompts, no primary.
- **Success:** one calm past-tense line naming the thing. "Added Pastéis de Belém to Places".
- **Offline or error:** what is true, what still works, what to do, what is kept. No apology, no "Oops", no blame.
- **Destructive:** slower and exact. The title names the thing; the body states the consequence; "You can't undo this." only when true (every delete here). Safe button first and focused.
- **Partner news:** a fact, name first, no cheering.

**Honesty.** No confirmshaming, no urgency ("Only 12 days left!"), no invented figures. A budget figure is "Planned", never "Spent": the app doesn't know what you paid. "Visited" means the plan item was ticked, nothing more. Example numbers are labelled.

---

## Glossary

Home's and Goals' glossaries apply (partner, space, "you two", waiting to sync, Back online, delete, draft).

| Term | Meaning | Never call it |
|---|---|---|
| trip | one journey, with a plan, places and prep | holiday, itinerary, vacation |
| plan | the day-by-day list inside a trip (tab "Plan") | itinerary, schedule (noun), agenda |
| plan item | one thing in the plan (a flight, a dinner) | **entry** (data-model word; never on screen), event, activity (activity is a *type*) |
| place | an idea: somewhere you might go, not yet a commitment (tab "Places") | spot, POI, pin, wishlist, favourite |
| idea | a place that isn't in the plan yet (group heading "Ideas") | suggestion |
| must-do | a place you marked as not to be missed | priority, favourite, starred |
| schedule | the verb that turns a place into a plan item. **Only verb used; never a noun or a status.** | book, assign, pin |
| in the plan | status of a place that has a plan item | scheduled, planned |
| visited | a place whose plan item is ticked | done, checked off |
| prep | the checklist tab: what to pack, bring and book. Four groups: Packing, Documents, Bookings, To-do | checklist (as a tab name; "checklist item" is fine in counts), tasks |
| item | one line in Prep | task, to-do (To-do is a group name) |
| done / packed | a ticked plan item or Prep line. "Packed" only in Packing. | complete, finished |
| budget | the optional total the two of you want to spend | limit, cap, target (target is Goals) |
| planned | the figure that adds up the plan's costs and the estimates of ideas | spent, total cost, expenses |
| estimate | a rough cost on a place ("Estimated cost") | price, guess |
| cover photo | the optional picture of a trip, in the arch | banner, header |
| Now / Next | the plan item happening now / the next timed one today | Current, Upcoming |
| Any time | a plan item with no time | All day, untimed |
| No dates yet | a **trip** with no dates | Undated, TBD |
| No date yet | a **plan item** with no date. (Different on purpose: one is the trip, one is the item. Don't unify.) | Unscheduled |
| Outside the trip dates | plan items dated before the first or after the last day | Orphaned, Overflow |
| Earlier days | the folded past days of a running trip | History |

Pronoun rule as Goals: "you two" to the couple, first name for the partner, "your other device" for the same person.

---

## Label decisions (the IA's working copy)

| IA proposal | Decision | Reason |
|---|---|---|
| **Prep** (tab and h2) | **Confirm.** Add a one-line intro under the Prep h2: "What to pack, bring and book." | It is the nav brief's and the design system's word, short (fits the 96 px tab at 200% text), and it matches the "Prep" link in What's left. "Checklist" is clearer to a stranger but 9 letters and generic, and Goals-style "History/Journal" labels set the precedent for one plain noun. Cost of "Prep": it is clipped English. The intro line removes the doubt, and translators should use "Préparatifs" (FR) or the equivalent by meaning, not a calque. |
| **"9 to prep · 1 must-do not in the plan"** (What's left) | **Replace** with two whole-sentence links: "9 prep items left" and "1 must-do not in the plan yet". | "to prep" reads as an instruction and can't take a plural; "prep items left" says what is counted and mirrors the tab name. "yet" says it is a gap, not a fault. The region's name is "What's left" (visually hidden h2). When both counts are 0 the line says "Nothing left to sort out." instead of vanishing, so a finished trip is a visible state. |
| **Add details** (disclosure) | **Replace with "Optional details"** (Goals' decision, same reason). | Consistency with Goals; says what is behind it. |
| **plan entry** (IA's noun in counts and dialogs) | **Replace with "plan item".** | "Entry" is the data-model word (Goals' glossary bans it on screen). "Item" is already used for Prep, but the pairs "plan item" / "checklist item" are never ambiguous because the full phrase is always used in counts and confirmations. |
| "{n} days ago" for a past trip | **Replace with "Ended {n} days ago".** | "64 days ago" next to a date range doesn't say whether it started or ended then. |
| "Name" field on a checklist item | **Use "Title"**, as everywhere. | One word per concept. |
| "Delete trip" etc. confirm buttons | Trip: "Keep trip" / "Delete trip" (as Goals). Items, places, plan items: "Keep it" / "Delete". | The title names the thing; Goals' pattern. |
| Past-trip "Add a place" etc. | Unchanged: no primary. | Decision D5. |
| Plan entry heading | "Add to the plan" (new) / "Edit plan item". | Matches the primary and the document title. |
| Toast "Added to Tue 24 Nov" | **Replace** with "Added {title} to Tue 24 Nov". | Home's pattern names the thing ("Added 500 MAD to Wedding fund"). |

---

## Example data labels

Footnote at the end of the page content, caption style. Remove in production.

| id | String |
|---|---|
| `example.trips.list` | Example data. The trips, dates and the 9,200 / 8,000 MAD budget are the design system's. Everything else is made up. |
| `example.trips.detail` | Example data. The trips, dates and the 9,200 / 8,000 MAD budget are the design system's. The plan, places, checklist and people's actions are made up. |
| `example.trips.form` | Example data. The values in this form are made up. |
| `example.trips.scenario.lisbon` | Scenario: during the Lisbon weekend, Mon 9 Nov at 13:20. |
| `example.trips.scenario.lisbonLast` | Scenario: the last day of the Lisbon weekend, Tue 10 Nov at 19:00. |
| `example.trips.scenario.lisbonLate` | Scenario: the evening of the Lisbon weekend, Mon 9 Nov at 21:00. |
| `example.trips.cover` | Example photo |

`example.trips.scenario.*` goes under the main footnote. The other example-only values (Weekend in Fes, "Marrakech with Mum", "Café with a view", "Breakfast on the roof") are covered by the same footnote.

---

## Screens

### Document titles (`Page – Site`, unique per state)

| id | String |
|---|---|
| `trips.title.list` | Trips – Zamane |
| `trips.title.list.empty` | No trips yet – Zamane |
| `trips.title.list.offline` | Trips (offline) – Zamane |
| `trips.title.list.error` | Can't load Trips – Zamane |
| `trips.title.loading` | Loading – Zamane |
| `trip.title.detail` | {trip} – Zamane |
| `trip.title.offline` | {trip} (offline) – Zamane |
| `trip.title.error` | Can't load trip – Zamane |
| `trip.title.notFound` | Trip not found – Zamane |
| `trip.title.deleted` | {trip} was deleted – Zamane |
| `planForm.title.new` | Add to the plan: {trip} – Zamane |
| `planForm.title.edit` | Edit {title}: {trip} – Zamane |
| `placeForm.title.new` | New place: {trip} – Zamane |
| `placeForm.title.edit` | Edit {title}: {trip} – Zamane |
| `schedule.title` | Schedule {title}: {trip} – Zamane |
| `tripForm.title.create` | New trip – Zamane |
| `tripForm.title.edit` | Edit {trip} – Zamane |
| `tripForm.title.notFound` | Trip not found – Zamane |

Sheets and confirmations are dialogs and don't change the title.

---

### 1. Trips list (`/trips`)

#### Header, primary, sections
| id | String | Notes |
|---|---|---|
| `trips.list.heading` | Trips | h1. No summary line (IA D2). |
| `trips.list.primary` | Plan a trip | floating on phones, masthead from 48 rem |
| `trips.list.primary.first` | Plan your first trip | empty state only |
| `trips.section.now` | Happening now | h2 |
| `trips.section.upcoming` | Coming up | h2 |
| `trips.section.undated` | No dates yet | h2 |
| `trips.section.past` | Past | h2 |

#### Cards (the whole card is one link; name comes from its visible content, in this DOM order: kicker, title, destination, dates, count. Do not override with `aria-label`.)
| id | String | Notes |
|---|---|---|
| `trips.card.lead.kicker.upcoming` | Next trip | (Home: `home.trip.kicker.upcoming`) lead card |
| `trips.card.lead.kicker.tomorrow` | Tomorrow | (Home) replaces the count block text when 1 day to go |
| `trips.card.lead.kicker.now` | Happening now | (Home: `home.trip.kicker.now`) |
| `trips.card.lead.count` | {count, plural, one {day to go} other {days to go}} | (Home: `home.trip.days.*`) beside the big numeral. The numeral is not `aria-hidden`: read in order it says "12 days to go". |
| `trips.card.lead.now` | Day {day} of {total} | (Home: `home.trip.now.summary`) |
| `trips.card.lead.now.last` | Day {day} of {total} · Last day | the last day |
| `trips.card.status.upcoming` | {count, plural, one {in # day} other {in # days}} | text countdown on non-lead upcoming cards |
| `trips.card.status.tomorrow` | Tomorrow | when 1 day to go |
| `trips.card.status.now` | Day {day} of {total} · Happening now | a second trip running at the same time |
| `trips.card.status.undated` | No dates yet | |
| `trips.card.status.past` | {count, plural, =1 {Ended yesterday} one {Ended # day ago} other {Ended # days ago}} | sunken, past rows |
| `trips.card.dates` | {range} | from `Intl`, year only when not the current year: "Sat 21 – Wed 25 Nov", "Fri 18 – Mon 21 Dec 2026"-style only for other years |
| `trips.card.dates.sr` | {start} to {end} | visually hidden twin; the visible range is `aria-hidden` so the screen reader hears "to", not a dash |
| `trips.card.cover.initial` | (the title's first letter) | `aria-hidden`, decorative |

#### Empty, only past
| id | String | Notes |
|---|---|---|
| `trips.list.empty.heading` | No trips yet. Plan your first one. | (design system string) |
| `trips.list.empty.body` | A trip holds your plan, the places you'd like to see and what to pack. Only the title is needed to start. | one sentence of why/what; the action is the primary |
| `trips.list.onlyPast.heading` | Nothing coming up. | |
| `trips.list.onlyPast.body` | Plan your next trip, or look back at the past ones below. | |

#### Loading, error, stale, offline
| id | String | Notes |
|---|---|---|
| `trips.list.loading.announce` | Loading trips | `role="status"`, hidden; skeletons `aria-hidden` |
| `trips.list.loading.busy` | Loading | (Home) |
| `trips.list.error.heading` | Trips didn't load | |
| `trips.list.error.body` | Check your connection and try again. | (Home) |
| `trips.list.error.retry` | Try again | (Home) |
| `trips.list.error.retrying` | Trying again | (Home) |
| `trips.list.error.announce` | Trips didn't load. Try again. | `role="alert"` |
| `trips.list.stale.notice` | Couldn't refresh. Showing the latest data on this phone. | (Goals: `goals.list.stale.notice`) |
| `trips.list.stale.retry` | Try again | |
| `trips.offline.notice` | You're offline. Showing the latest data on this phone. Ticking things off and adding places still work and sync when you're back online. | first sentence is Home's, verbatim. Second sentence is the Trips replacement for "Adding to goals…" (IA D13). |
| `trips.offline.announce` | You're offline. Ticking things off and adding places still work. | polite, once on change (adapts Home's `home.offline.announce`) |
| `trips.online.announce` | Back online. Syncing your changes. | (Home); plain: "Back online." (`home.online.announce.plain`) |
| `trips.online.synced` | {count, plural, one {# change synced} other {# changes synced}} | toast after the queue drains (Home's pattern, with "change" because ticks and places are both queued) |
| `trips.online.syncFailed` | {count, plural, one {Couldn't sync # change. We'll try again.} other {Couldn't sync # changes. We'll try again.}} | only if retries are real |

Plan a trip while offline: the form opens as a draft; the reason is on the form.

#### Live updates on the list (polite, no toast)
| id | String | Notes |
|---|---|---|
| `tripLive.list.created` | {name} created {trip}. | card inserted in date position |
| `tripLive.list.changed` | {name} changed {trip}. | in place; card moves section next visit |
| `tripLive.list.deleted` | {name} deleted {trip}. | card removed; focus to the next card if it had focus |

#### After deleting a trip (arrive from Edit)
| id | String | Notes |
|---|---|---|
| `tripToast.deleted` | {trip} deleted | toast, no Undo. Focus on the h1. |

---

### 2. Trip detail (`/trips/:id`)

#### Top bar and identity
| id | String | Notes |
|---|---|---|
| `trip.back` | Trips | visible text of the up-link ("‹ Trips"); chevron mirrors in RTL |
| `trip.back.label` | Back to Trips | accessible name; contains "Trips" (WCAG 2.5.3) |
| `trip.edit` | Edit | |
| `trip.edit.label` | Edit {trip} | contains "Edit" |
| `trip.heading` | {trip} | h1 |
| `trip.notes.more` | More | disclosure on notes clamped to 2 lines |
| `trip.notes.less` | Less | |
| `trip.notes.more.label` | More notes | **fixes the 2.5.3 issue**: the name contains the visible word "More". `aria-expanded` carries the state. |
| `trip.notes.less.label` | Less notes | contains "Less" |
| `trip.cover.alt` | (empty) | decorative; the title is beside it |

#### Status (in the summary)
| id | String | Notes |
|---|---|---|
| `trip.status.upcoming` | {count, plural, one {# day to go} other {# days to go}} | saffron countdown (Home). The block's numeral and words read as this sentence. |
| `trip.status.tomorrow` | Tomorrow | |
| `trip.status.now` | Day {day} of {total} · Happening now | compact summary during the trip |
| `trip.status.now.last` | Day {day} of {total} · Last day | |
| `trip.status.undated` | No dates yet | |
| `trip.status.undated.action` | Add dates | link to Edit (`?focus=dates`). Name: `trip.status.undated.action.label`. |
| `trip.status.undated.action.label` | Add dates to {trip} | contains "Add dates" |
| `trip.status.past` | {count, plural, =1 {Ended yesterday} one {Ended # day ago} other {Ended # days ago}} | sunken |

#### What's left (region `aria-label` = `trip.left.label`; hidden before and after the trip when not wanted: hidden during and after the trip)
| id | String | Notes |
|---|---|---|
| `trip.left.label` | What's left | visually hidden h2 |
| `trip.left.prep` | {count, plural, one {# prep item left} other {# prep items left}} | link: opens Prep (selects the tab on phones, scrolls and focuses the h2 on wide). Omitted when 0. |
| `trip.left.mustDo` | {count, plural, one {# must-do not in the plan yet} other {# must-dos not in the plan yet}} | link: opens Places. Omitted when 0. |
| `trip.left.allSet` | Nothing left to sort out. | plain text, when both are 0 |

The "·" between the two links is decorative and `aria-hidden`; render two separate elements.

#### Tabs (below 64 rem) and column headings (from 64 rem)
| id | String | Notes |
|---|---|---|
| `trip.tabs.label` | Plan, places and prep | tablist name |
| `trip.tabs.plan` | Plan | visible tab text = accessible name; no counts |
| `trip.tabs.places` | Places | |
| `trip.tabs.prep` | Prep | |
| `trip.panel.plan.heading` | Plan | h2: visible from 64 rem, hidden in the tab panel |
| `trip.panel.places.heading` | Places | |
| `trip.panel.prep.heading` | Prep | |
| `trip.panel.places.count` | {count, plural, one {# idea} other {# ideas}} | caption beside the h2 from 64 rem: ideas not in the plan |
| `trip.panel.prep.count` | {done} of {total} done | caption beside the h2 from 64 rem |
| `trip.panel.prep.intro` | What to pack, bring and book. | one line under Prep's h2 |
| `trip.panel.places.intro` | Ideas for the trip. Schedule one to put it in the plan. | one line under Places' h2; says the difference once |

#### Primary actions (by status, IA D5)
| id | String | Notes |
|---|---|---|
| `trip.primary.upcoming` | Add to the plan | coming up |
| `trip.primary.place` | Add a place | happening now, and no dates |
| (none) | | past trip: no primary |

A panel's own add is hidden while the primary has the same label: Plan's "Add to the plan" (`plan.add`) and Places' "Add a place" (`places.add`).

#### Budget (summary line; a disclosure on phones, always open in the band from 64 rem)
| id | String | Notes |
|---|---|---|
| `budget.heading` | Budget | h2 wrapping the disclosure button |
| `budget.line.withBudget` | Planned {planned} MAD of {budget} MAD | the button's visible text (its name; the h2 supplies "Budget") |
| `budget.line.noBudget` | Planned {planned} MAD | no bar |
| `budget.line.empty` | Nothing costed yet | |
| `budget.over` | Over by {over} MAD | danger **text**, not colour alone |
| `budget.left` | {left} MAD left | neutral ink; also for the 90%+ case (no special colour) |
| `budget.set` | Set a budget | ghost link to Edit (`?focus=budget`); name `budget.set.label` |
| `budget.set.label` | Set a budget for {trip} | contains the visible text |
| `budget.valuetext.withBudget` | {planned} MAD planned of {budget} MAD | `aria-valuetext` |
| `budget.valuetext.over` | {planned} MAD planned of {budget} MAD, over by {over} MAD | |
| `budget.progress.label` | Budget | progressbar's accessible name |
| `budget.explain` | Planned adds up the costs in the plan and the estimates for ideas that aren't in the plan yet. | caption at the top of the breakdown; says what the number is |
| `budget.breakdown.type` | {type} · {amount} MAD | one row per type with its icon; `{type}` from `tripCommon.type.name`; zero totals hidden |
| `budget.breakdown.ideas` | Ideas not in the plan yet · {count, plural, one {# place} other {# places}} · ~{amount} MAD | dashed row, like a place |
| `budget.breakdown.ideas.sr` | Ideas not in the plan yet: {count, plural, one {# place} other {# places}}, about {amount} MAD | the visible "~" is `aria-hidden` |
| `budget.breakdown.noCost` | {count, plural, one {No cost yet on # plan item} other {No cost yet on # plan items}} | shown when any plan item has no cost; says the figure is incomplete |
| `budget.breakdown.change` | Change budget | link to Edit (`?focus=budget`); name `budget.breakdown.change.label` |
| `budget.breakdown.change.label` | Change budget for {trip} | |
| `budget.queued` | Waiting to sync | caption on the Ideas line when a queued place is counted (Home's badge) |
| `budget.error` | The budget didn't load. | in the line |
| `budget.retry` | Try again | |

#### Plan panel
| id | String | Notes |
|---|---|---|
| `plan.add` | Add to the plan | secondary button; hidden while the primary has this label |
| `plan.jump.label` | Jump to a day | native select; trips longer than 7 days |
| `plan.jump.go` | Go | button beside the select (a select that moves focus on change would break WCAG 3.2.2). Name `plan.jump.go.label`. |
| `plan.jump.go.label` | Go to day | contains "Go" |
| `plan.jump.option` | {date} · Day {n} | |
| `plan.day.heading` | {date} · Day {n} | h3 |
| `plan.day.heading.today` | Today · {date} · Day {n} | |
| `plan.day.heading.undatedTrip` | {date} | h3 date headings in a trip with no dates (no "Day n") |
| `plan.day.add` | Add | per-day button, 44 px |
| `plan.day.add.label` | Add to {date} | contains "Add" |
| `plan.day.anyTime` | Any time | caption over untimed items |
| `plan.day.empty` | Nothing planned | sunken well |
| `plan.day.empty.today` | Nothing planned today | |
| `plan.day.nothingLeft` | Nothing else planned today | caption under Today's heading when nothing timed is left |
| `plan.earlier.toggle` | Earlier days | disclosure, closed |
| `plan.earlier.summary` | {range} · {done} of {total} done | e.g. "Sat 7 – Sun 8 Nov · 4 of 4 done" |
| `plan.outside.heading` | Outside the trip dates | h3, only when it has items |
| `plan.outside.intro` | Planned for dates that aren't in the trip. Edit one to move it into the trip. | one line |
| `plan.outside.before` | Before the trip | caption |
| `plan.outside.after` | After the trip | caption |
| `plan.noDate.heading` | No date yet | h3 |
| `plan.empty.dated` | (every day shows its own well) | no extra string |
| `plan.empty.undated` | Nothing planned yet. Add the first thing with Add to the plan. | undated trip with no items; if the primary is "Add a place" this keeps its own button. Rename with the label. |
| `plan.empty.past` | Nothing was planned for this trip. | past trip |

#### Plan row (two sibling targets: the tick, and the row button; never nested)
| id | String | Notes |
|---|---|---|
| `plan.row.tick.label` | {title} done | checkbox name. No visible label to contain. |
| `plan.row.now` | Now | visible text label on the `saffron-soft` row (also read: it is text) |
| `plan.row.next` | Next | |
| `plan.row.time` | {start}–{end} | "17:30–19:00" |
| `plan.row.time.sr` | {start} to {end} | hidden twin; the visible dash is `aria-hidden` |
| `plan.row.time.single` | {time} | start only |
| `plan.row.cost` | {amount} MAD | not shown when no cost |
| `plan.row.fromPlace` | From Places: {placeTitle} | link to the place's card; name is the same text |
| `plan.row.addedBy` | Added by {name} | the avatar's accessible name; no visible text |
| `plan.row.done` | Done by {name} · {when} | `{when}` is a time today ("12:05") or a date ("Sun 8 Nov") |
| `plan.row.queued` | Waiting to sync | cloud-off icon and text (Home) |
| `plan.row.type.sr` | {type} | visually hidden type word before the title (icon is `aria-hidden`); from `tripCommon.type.name` |

The row button's accessible name is its visible content (type word, title, time, location, cost, status). Don't set `aria-label`: every visible word must be in the name (2.5.3).

#### Load states for the panels
| id | String | Notes |
|---|---|---|
| `plan.error` | The plan didn't load. | in place |
| `plan.retry` | Try again | |
| `places.error` | Places didn't load. | |
| `prep.error` | Prep didn't load. | |
| `trip.panel.notCached` | This isn't on this phone yet. It loads when you're back online. | offline, never opened (same as Goals) |
| `trip.panel.loading` | Loading | hidden, `role="status"` per panel: Loading plan / `plan.loading.announce` etc. |
| `plan.loading.announce` | Loading the plan | |
| `places.loading.announce` | Loading places | |
| `prep.loading.announce` | Loading prep | |

#### Places panel
| id | String | Notes |
|---|---|---|
| `places.add` | Add a place | secondary button; hidden while the primary has this label |
| `places.group.ideas` | Ideas | h3 |
| `places.group.inPlan` | In the plan | h3 |
| `places.group.visited` | Visited | h3 |
| `places.empty` | No places yet. Add the ideas you don't want to forget. | with Add a place when it isn't the primary |
| `places.allPlanned` | Every idea is in the plan. | under Ideas when it is empty but others aren't |
| `place.card.mustDo` | Must-do | text badge |
| `place.card.estimate` | ~{amount} MAD | `aria-hidden`; the sr twin below |
| `place.card.estimate.sr` | About {amount} MAD | visually hidden |
| `place.card.area` | {area} | |
| `place.card.idea.sr` | Idea | visually hidden, ends the card's name (ideas vs commitments in words) |
| `place.card.addedBy` | Added by {name} | avatar name |
| `place.card.schedule` | Schedule | |
| `place.card.schedule.label` | Schedule {title} | contains "Schedule" |
| `place.card.inPlan` | In the plan · {when} | link; `{when}` = "Tue 24 Nov, 17:30" (or "Tue 24 Nov" with no time, "no date yet" case: `place.card.inPlan.undated`) |
| `place.card.inPlan.undated` | In the plan · no date yet | |
| `place.card.visited` | Visited · {date} · {name} | zellige; text carries the meaning |
| `place.card.queued` | Waiting to sync | |
| `place.card.queued.reason` | This place hasn't synced yet. | reason beside disabled Schedule, Edit, Delete |

#### Prep panel
| id | String | Notes |
|---|---|---|
| `prep.group.name` | {group, select, packing {Packing} documents {Documents} bookings {Bookings} todo {To-do} other {Other}} | |
| `prep.group.heading` | {group, select, packing {Packing} documents {Documents} bookings {Bookings} todo {To-do} other {Other}} · {done} of {total} | h3. One key so translators reorder it. |
| `prep.group.empty` | Nothing here. | with the group's Add |
| `prep.add` | Add to {group} | button; becomes the inline field. Names: "Add to Packing", etc. |
| `prep.add.field.label` | Add an item to {group} | the field's accessible name; contains the placeholder |
| `prep.add.placeholder` | Add an item | placeholder, not a label |
| `prep.add.submit` | Add | button inside the field row (44 px) |
| `prep.add.submit.label` | Add to {group} | contains "Add" |
| `prep.add.close` | Close | |
| `prep.add.close.label` | Close, {group} | contains "Close" |
| `prep.add.helper` | Press Enter to add it and keep going. | optional helper under the field the first time; omit if clutter |
| `prep.row.tick.packing` | {title} packed | checkbox name, Packing |
| `prep.row.tick.other` | {title} done | other groups |
| `prep.row.done.packing` | Packed by {name} · {when} | `{when}` = "Sun 8 Nov" or a time |
| `prep.row.done.other` | Done by {name} · {when} | |
| `prep.row.addedBy` | Added by {name} | not shown on seeded items |
| `prep.row.queued` | Waiting to sync | |
| `prep.reorder` | Reorder | button, per group |
| `prep.reorder.label` | Reorder {group} | contains "Reorder" |
| `prep.reorder.done` | Done | the same button while reordering. The name changes with the text, so there's no `aria-pressed`. |
| `prep.reorder.done.label` | Done reordering {group} | contains "Done" |
| `prep.reorder.up` | Move up | visible on wide screens; icon-only on phones |
| `prep.reorder.up.label` | Move up, {title} | contains the visible words |
| `prep.reorder.down` | Move down | |
| `prep.reorder.down.label` | Move down, {title} | |
| `prep.reorder.first` | First in {group} | reason on the `aria-disabled` Move up |
| `prep.reorder.last` | Last in {group} | reason on Move down |
| `prep.reorder.on.announce` | Reordering {group}. Use Move up and Move down. | polite |
| `prep.reorder.off.announce` | Done reordering. | polite |
| `prep.reorder.moved.announce` | {title} moved to {position} of {total}. | polite |
| `prep.added.announce` | Added {title} to {group}. | polite; my own add; no toast |

#### Offline reasons (beside the control; announced once on press; the control stays focusable with `aria-disabled`)
| id | String |
|---|---|
| `tripOffline.reason.checklistAdd` | Adding to the checklist needs a connection. |
| `tripOffline.reason.reorder` | Reordering needs a connection. |
| `tripOffline.reason.delete` | Deleting needs a connection. |
| `tripOffline.reason.schedule` | Scheduling needs a connection. |
| `tripOffline.reason.cover` | Photos need a connection. |
| `tripOffline.reason.save` | You're offline. You can save your changes when you're back online. What you've changed stays here. |
| `tripOffline.reason.cancelQueued` | (none: Remove on a queued place works offline) |

The detail's second notice line (under `trips.offline.notice`):

| id | String | Notes |
|---|---|---|
| `trip.offline.notice.more` | Adding to the plan or the checklist, editing and deleting need a connection. | **[VERIFY A9]** If the checklist add is queued, remove "or the checklist". |
| `trip.offline.announce` | You're offline. Ticking things off and adding places still work. | same as the list |

#### Loading, error, not found, deleted
| id | String | Notes |
|---|---|---|
| `trip.loading.announce` | Loading trip | `role="status"` |
| `trip.error.heading` | This trip didn't load | no primary |
| `trip.error.body` | Check your connection and try again. | (Home) |
| `trip.error.retry` | Try again | |
| `trip.error.announce` | This trip didn't load. Try again. | `role="alert"` |
| `trip.notFound.heading` | This trip isn't here any more | |
| `trip.notFound.body` | It may have been deleted. | |
| `trip.notFound.action` | Back to Trips | |
| `trip.deleted.heading` | {name} deleted {trip}. | partner deleted it while you're on it; swaps in place |
| `trip.deleted.body` | Its plan, places and checklist are gone too. | |
| `trip.deleted.action` | Back to Trips | takes focus |

---

### 3. Plan item sheet (read-only; dialog over the detail)

| id | String | Notes |
|---|---|---|
| `planSheet.heading` | {title} | h2, focus lands here; dialog named by it |
| `planSheet.close.label` | Close | ✕ |
| `planSheet.when.label` | When | term |
| `planSheet.when.value` | {date}, {time} | "Tue 24 Nov, 17:30"; year only when not the current year |
| `planSheet.when.range` | {date}, {start}–{end} | "Tue 24 Nov, 17:30–19:00" |
| `planSheet.when.range.sr` | {date}, {start} to {end} | |
| `planSheet.when.anyTime` | {date} · Any time | |
| `planSheet.when.noDate` | No date yet | |
| `planSheet.when.overnight` | Ends the next day | caption when end is before start |
| `planSheet.where.label` | Where | term; plain text, no link |
| `planSheet.cost.label` | Cost | term |
| `planSheet.cost.value` | {amount} MAD | |
| `planSheet.cost.none` | No cost yet | |
| `planSheet.link.label` | Link | term |
| `planSheet.link.text` | {host} | visible text is the host ("booking.com") |
| `planSheet.link.name` | {host} (opens in a new tab) | accessible name; contains the visible host |
| `planSheet.link.fallback` | Open link | when the host can't be read; name "Open link (opens in a new tab)" |
| `planSheet.notes.label` | Notes | term; full, never clamped |
| `planSheet.fromPlace` | From Places: {placeTitle} | link to the place |
| `planSheet.addedBy` | Added by {name} · {date} | |
| `planSheet.doneBy` | Done by {name} · {date} at {time} | "Done by Sara · Tue 24 Nov at 18:52". 24-hour. |
| `planSheet.queued` | Waiting to sync | |
| `planSheet.edit` | Edit | secondary |
| `planSheet.edit.label` | Edit {title} | contains "Edit" |
| `planSheet.delete` | Delete | danger, secondary weight |
| `planSheet.delete.label` | Delete {title} | contains "Delete" |
| `planSheet.deleted.byPartner` | {name} deleted this plan item. | body swaps; **Close** takes focus |
| `planSheet.deleted.close` | Close | |

### 3a. Place sheet

| id | String | Notes |
|---|---|---|
| `placeSheet.heading` | {title} | h2 |
| `placeSheet.area.label` | Area | term |
| `placeSheet.estimate.label` | Estimated cost | term |
| `placeSheet.estimate.value` | About {amount} MAD | plain "about", in the sheet there is room |
| `placeSheet.estimate.none` | No estimate | |
| `placeSheet.mustDo` | Must-do | badge |
| `placeSheet.link.*` | (as `planSheet.link.*`) | |
| `placeSheet.notes.label` | Notes | |
| `placeSheet.addedBy` | Added by {name} · {date} | |
| `placeSheet.status.idea` | Idea. Not in the plan yet. | |
| `placeSheet.status.inPlan` | In the plan · {when} | with link `placeSheet.showInPlan` |
| `placeSheet.showInPlan` | Show in the plan | link; focus goes to the plan item's row |
| `placeSheet.status.visited` | Visited · {date} · {name} | |
| `placeSheet.schedule` | Schedule | ideas only; name `Schedule {title}` (`place.card.schedule.label`) |
| `placeSheet.edit` | Edit | name `Edit {title}` |
| `placeSheet.delete` | Delete | name `Delete {title}` |
| `placeSheet.editNote` | Changes here don't change its plan item. | shown when the place is in the plan |
| `placeSheet.queued` | Waiting to sync | |
| `placeSheet.remove` | Remove | queued place only; works offline; name `Remove {title}` |
| `placeSheet.deleted.byPartner` | {name} deleted this place. | **Close** takes focus |

### 3b. Prep item sheet

| id | String | Notes |
|---|---|---|
| `itemSheet.heading` | Edit item | h2 |
| `itemSheet.title.label` | Title | |
| `itemSheet.group.legend` | Group | radio group: Packing, Documents, Bookings, To-do (`prep.group.name`) |
| `itemSheet.group.helper` | Moving it puts it at the end of the new group. | |
| `itemSheet.save` | Save | primary |
| `itemSheet.save.pending` | Saving… | |
| `itemSheet.delete` | Delete | danger; name `Delete {title}` |
| `itemSheet.addedBy` | Added by {name} · {date} | not shown for seeded items |
| `itemSheet.doneBy` | Done by {name} · {date} at {time} | |
| `itemSheet.error.title` | Enter a title for the item. | |
| `itemSheet.deleted.byPartner` | {name} deleted this item. | **Close** takes focus |
| `itemSheet.failed` | Couldn't save the item. Try again. | |
| `itemSheet.saved` | Changes saved | toast |

---

### 4. Plan item form (dialog, `?entry=new|<id>`)

#### Chrome
| id | String | Notes |
|---|---|---|
| `planForm.heading.new` | Add to the plan | h2 |
| `planForm.heading.edit` | Edit plan item | |
| `planForm.subtitle` | {trip} | |
| `planForm.close.label` | Close | ✕; the dirty guard applies |
| `planForm.submit.new` | Add to the plan | primary |
| `planForm.submit.edit` | Save changes | |
| `planForm.submit.pending` | Adding… | `aria-disabled`; edit: "Saving…" (`common.saving`) |
| `planForm.submit.offline` | You're offline. You can add this when you're back online. What you've typed stays here. | reason beside the `aria-disabled` primary |
| `planForm.submit.offline.edit` | (= `tripOffline.reason.save`) | |
| `planForm.online.announce` | Back online. You can add this now. | polite; edit: "Back online. You can save your changes now." |
| `planForm.failed` | Couldn't add this. Try again. | alert at the top; fields kept; retry is safe |
| `planForm.failed.edit` | Couldn't save the changes. Try again. | |
| `planForm.saved` | Changes saved | toast |
| `planForm.fromPlace.info` | From Places: {placeTitle} | info line in edit mode |
| `planForm.delete` | Delete | danger, last in edit; name `Delete {title}`; offline: `tripOffline.reason.delete` |

#### Fields
| id | String | Notes |
|---|---|---|
| `planForm.title.label` | Title | required; focused on open |
| `planForm.title.helper` | For example, Dinner on the square | |
| `planForm.type.legend` | Type | radio group or select; preset to Other |
| `planForm.day.label` | Day | select |
| `planForm.day.option` | {date} · Day {n} · {count, plural, =0 {nothing planned} other {# planned}} | |
| `planForm.day.option.none` | No date yet | |
| `planForm.day.option.another` | Another date… | reveals a date input |
| `planForm.day.option.outsideNew` | {date} · outside the new dates | when the partner changes the trip dates while open |
| `planForm.date.label` | Date | the revealed input |
| `planForm.date.outside` | This is outside the trip dates. | helper, allowed |
| `planForm.time.legend` | Time | fieldset for the two inputs |
| `planForm.time.helper` | Optional. Leave it empty if it can happen any time. | |
| `planForm.start.label` | Start time | |
| `planForm.end.label` | End time | |
| `planForm.end.overnight` | Ends the next day. | helper when end is before start |
| `planForm.details.toggle` | Optional details | disclosure; closed on new, open on edit |
| `planForm.location.label` | Location | |
| `planForm.location.helper` | Optional. An address or a name you'd recognise. | shown as plain text later |
| `planForm.cost.label` | Cost | suffix "MAD" |
| `planForm.cost.label.full` | Cost in MAD | accessible name; contains "Cost" |
| `planForm.cost.helper` | Optional. For example 350 or 350,50 | |
| `planForm.url.label` | Link | |
| `planForm.url.helper` | Optional. A booking or a page about it. | |
| `planForm.notes.label` | Notes | |
| `planForm.notes.helper` | Optional. | |
| `planForm.notes.counter` | {count} of {max} | only near the cap |

#### Errors (under the field, `aria-invalid`, `aria-describedby`; focus on the first; input kept; validate on blur only after typing; clear as soon as valid)
| id | String |
|---|---|
| `planForm.error.title.empty` | Enter a title, for example Dinner on the square. |
| `planForm.error.title.tooLong` | Use {max} characters or fewer for the title. **[VERIFY max; default 80]** |
| `planForm.error.date.empty` | Choose a date, or pick another day. |
| `planForm.error.date.invalid` | Enter a valid date. |
| `planForm.error.end.noStart` | Add a start time first. |
| `planForm.error.cost.format` | Use numbers only, for example 350 or 350,50. |
| `planForm.error.cost.tooLarge` | That amount is too large. Enter {max} MAD or less. **[VERIFY cap]** |
| `planForm.error.url.format` | Use a web address starting with https:// |
| `planForm.error.url.tooLong` | Use {max} characters or fewer for the link. **[VERIFY; default 2,000]** |
| `planForm.error.location.tooLong` | Use {max} characters or fewer for the location. **[VERIFY; default 120]** |
| `planForm.error.notes.tooLong` | Use {max} characters or fewer for the notes. **[VERIFY; default 4,000]** |

#### Draft, discard, trip changed
| id | String | Notes |
|---|---|---|
| `tripCommon.draft.restored` | Draft restored. | |
| `tripCommon.draft.discard` | Discard draft | name = the visible text (replaces Goals' "Discard the restored draft", which failed 2.5.3) |
| `planForm.discard.title` | Discard this plan item? | only when dirty |
| `planForm.discard.body` | What you've typed will be lost. | |
| `planForm.discard.keep` | Keep editing | safe, focused |
| `planForm.discard.confirm` | Discard | |
| `planForm.discardEdit.title` | Discard your changes? | |
| `planForm.discardEdit.body` | Your changes to {title} won't be saved. | |
| `planForm.tripDeleted` | {name} deleted {trip}. This can't be saved. | banner; submit hidden |
| `planForm.tripDeleted.copy` | Copy text | |
| `planForm.tripDeleted.close` | Close | |
| `planForm.itemDeleted` | This plan item was deleted. Your changes weren't saved. | edit 404; with Copy text and Close |

---

### 5. Place form (dialog, `?place=new|<id>`)

| id | String | Notes |
|---|---|---|
| `placeForm.heading.new` | New place | h2 |
| `placeForm.heading.edit` | Edit place | |
| `placeForm.submit.new` | Add place | primary |
| `placeForm.submit.edit` | Save changes | |
| `placeForm.submit.pending` | Adding… | |
| `placeForm.offline.new` | You're offline. This place will be added when you're back online. | helper beside the **enabled** Add place (it queues); polite, not a block |
| `placeForm.submit.offline.edit` | (= `tripOffline.reason.save`) | |
| `placeForm.online.announce.edit` | Back online. You can save your changes now. | |
| `placeForm.failed` | Couldn't add the place. Try again. | alert; fields kept |
| `placeForm.failed.edit` | Couldn't save the changes. Try again. | |
| `placeForm.title.label` | Title | required, focused |
| `placeForm.title.helper` | For example, Pena Palace | |
| `placeForm.type.legend` | Type | preset to Other **[VERIFY: the IA suggests Sight might be a better default for places]** |
| `placeForm.mustDo.label` | Must-do | checkbox |
| `placeForm.mustDo.helper` | Something you don't want to miss. | |
| `placeForm.details.toggle` | Optional details | |
| `placeForm.area.label` | Area | |
| `placeForm.area.helper` | Optional. A neighbourhood or town, for example old medina. | |
| `placeForm.estimate.label` | Estimated cost | suffix MAD |
| `placeForm.estimate.label.full` | Estimated cost in MAD | |
| `placeForm.estimate.helper` | Optional. A rough guess is fine. It counts toward the budget until the place is in the plan. | |
| `placeForm.url.*`, `placeForm.notes.*` | (as `planForm.url.*`, `planForm.notes.*`) | |
| `placeForm.editNote` | Changes here don't change its plan item. | edit of a place that's in the plan |
| `placeForm.error.title.empty` | Enter a title, for example Pena Palace. | |
| `placeForm.error.estimate.format` | Use numbers only, for example 150 or 150,50. | |
| `placeForm.error.area.tooLong` | Use {max} characters or fewer for the area. **[VERIFY; default 80]** | |
| `placeForm.discard.title` | Discard this place? | |
| `placeForm.discard.body` | What you've typed will be lost. | |
| `placeForm.placeDeleted` | This place was deleted. Your changes weren't saved. | edit 404; with Copy text and Close |

Other title, discard, merge and banner strings are the plan form's with "place" for "plan item".

---

### 6. Schedule a place (dialog, `?schedule=<placeId>`)

| id | String | Notes |
|---|---|---|
| `schedule.heading` | Schedule this place | h2 |
| `schedule.summary` | {title} · {type} · ~{amount} MAD | what's being scheduled. Sr twin: `schedule.summary.sr`. |
| `schedule.summary.sr` | {title}, {type}, about {amount} MAD | |
| `schedule.day.label` | Day | select |
| `schedule.day.placeholder` | Choose a day | the empty option |
| `schedule.day.option` | (= `planForm.day.option`, `.none`) | |
| `schedule.time.legend` | Time | optional start and end (`planForm.start.label`, `.end.label`) |
| `schedule.note` | The cost is copied from the estimate. You can change it in the plan. | |
| `schedule.submit` | Add to the plan | before a day is chosen |
| `schedule.submit.day` | Add to {date} | after a day is chosen. Contains no hidden label. |
| `schedule.submit.pending` | Adding… | |
| `schedule.error.day` | Choose a day, or No date yet. | |
| `schedule.failed` | Couldn't schedule this. Try again. | |
| `schedule.offline` | Scheduling needs a connection. | reason beside the `aria-disabled` primary; the choice is kept |
| `schedule.online.announce` | Back online. You can schedule this now. | |
| `schedule.queuedPlace` | This place hasn't synced yet. | reason on Schedule (see `place.card.queued.reason`) |
| `schedule.taken` | {actor, select, partner {{name} already put this on {date}.} other {This place is already in the plan on {date}.}} | **409.** Body swaps; focus to **Show in the plan**. `{actor}`: `partner` or `other` (me on another device, or unknown). |
| `schedule.taken.undated` | {actor, select, partner {{name} already put this in the plan, with no date yet.} other {This place is already in the plan, with no date yet.}} | |
| `schedule.taken.show` | Show in the plan | |
| `schedule.taken.close` | Close | |
| `schedule.placeDeleted` | {name} deleted this place. | |
| `schedule.placeDeleted.close` | Close | |
| `schedule.discard.*` | (as `placeForm.discard.*`: "Discard this?" is not needed unless a day was chosen; use "Discard your choice?" with body "Nothing has been added yet." — **optional**; skip if the dialog closes without confirming, as it's one choice) | |

Rescheduling is not offered: "To move it, edit its plan item." is a caption under "In the plan" in the place sheet:

| id | String |
|---|---|
| `placeSheet.reschedule.hint` | To move it to another day, edit its plan item. |

---

### 7. Create and edit trip

#### Chrome
| id | String | Notes |
|---|---|---|
| `tripForm.create.heading` | New trip | h1 |
| `tripForm.edit.heading` | Edit trip | h1 |
| `tripForm.cancel` | Cancel | task header on phones (✕ icon plus the word) |
| `tripForm.create.submit` | Create trip | |
| `tripForm.create.submit.pending` | Creating… | |
| `tripForm.create.submit.waitingCover` | Creating after the photo… | |
| `tripForm.create.submit.offline` | You're offline. You can create the trip when you're back online. What you've typed stays here. | |
| `tripForm.create.online.announce` | Back online. You can create the trip now. | |
| `tripForm.create.created.announce` | Trip created. | polite, on arriving at the detail |
| `tripForm.create.failed` | Couldn't create the trip. Try again. | alert at the top |
| `tripForm.edit.submit` | Save changes | |
| `tripForm.edit.submit.pending` | Saving… | |
| `tripForm.edit.submit.offline` | You're offline. You can save your changes when you're back online. What you've changed stays here. | |
| `tripForm.edit.online.announce` | Back online. You can save your changes now. | |
| `tripForm.edit.failed` | Couldn't save the changes. Try again. | |
| `tripToast.saved` | Changes saved | toast on the detail |

#### Fields
| id | String | Notes |
|---|---|---|
| `tripForm.title.label` | Title | required, focused on create |
| `tripForm.title.helper` | For example, Weekend in Fes | |
| `tripForm.details.toggle` | Optional details | closed on create, open on edit |
| `tripForm.destination.label` | Destination | |
| `tripForm.destination.helper` | Optional. A city, a region or a country. | |
| `tripForm.dates.legend` | Dates | fieldset |
| `tripForm.dates.helper` | Optional. Add both days, or leave both empty. | |
| `tripForm.first.label` | First day | |
| `tripForm.last.label` | Last day | |
| `tripForm.dates.long` | That's {count, plural, one {# day} other {# days}}. | helper above 31 days **[VERIFY A11: UI-only threshold, default 31]** |
| `tripForm.dates.passed` | These dates have passed. | helper, allowed (record a trip already taken) |
| `tripForm.budget.label` | Budget | suffix MAD |
| `tripForm.budget.label.full` | Budget in MAD | |
| `tripForm.budget.helper` | Optional. What you two want to spend in total. | |
| `tripForm.notes.label` | Notes | |
| `tripForm.notes.helper` | Optional. Anything you both should know. | |
| `tripForm.cover.label` | Cover photo | hidden when uploads are off |
| `tripForm.cover.helper` | Shown on the trip's card. Without one, the first letter of the title is used. | |
| `tripForm.cover.add` | Add a cover photo | |
| `tripForm.cover.replace` | Replace | name `Replace cover photo` |
| `tripForm.cover.remove` | Remove | name `Remove cover photo` |
| `tripForm.cover.replace.label` | Replace cover photo | |
| `tripForm.cover.remove.label` | Remove cover photo | |
| `tripForm.cover.uploading` | Uploading photo… | |
| `tripForm.cover.uploading.announce` | Uploading photo. | |
| `tripForm.cover.uploaded.announce` | Photo added. | |
| `tripForm.cover.failed` | The photo didn't upload. Try again or remove it. | alert at the field; Create blocked |
| `tripForm.cover.retry` | Try again | name `Try again: cover photo` (contains the visible text) |
| `tripForm.cover.offline` | Photos need a connection. | |
| `tripForm.cover.unsupported` | {fileName} isn't a supported photo. Use a JPEG, PNG or WebP file. | **[VERIFY formats]** |
| `tripForm.cover.tooLarge` | {fileName} is over 10 MB. Choose a smaller photo. | **[VERIFY 10 MB]** |
| `tripForm.cover.rateLimited` | Too many photos at once. Try again in a minute. | |
| `tripForm.cover.off` | Photos are turned off for now. | |
| `tripForm.cover.restoreNote` | The cover changes when you save. Cancel keeps the current one. | edit only |

#### Errors
| id | String |
|---|---|
| `tripForm.error.title.empty` | Enter a title for the trip. |
| `tripForm.error.title.tooLong` | Use {max} characters or fewer for the title. **[VERIFY; default 80]** |
| `tripForm.error.destination.tooLong` | Use {max} characters or fewer for the destination. **[VERIFY; default 80]** |
| `tripForm.error.first.missing` | Add the first day too, or clear the last day. |
| `tripForm.error.last.missing` | Add the last day too, or clear the first day. |
| `tripForm.error.date.invalid` | Enter a valid date. |
| `tripForm.error.last.beforeFirst` | Choose a last day on or after {first}. |
| `tripForm.error.budget.format` | Use numbers only, for example 8000 or 8000,50. |
| `tripForm.error.budget.zero` | Enter a budget greater than 0, or leave it empty. **[VERIFY whether 0 is allowed]** |
| `tripForm.error.budget.tooLarge` | That amount is too large. Enter {max} MAD or less. **[VERIFY cap]** |
| `tripForm.error.notes.tooLong` | Use {max} characters or fewer for the notes. **[VERIFY; default 4,000]** |

#### Date-change preview (edit, under Dates, polite)
| id | String |
|---|---|
| `tripForm.preview.outside` | {count, plural, one {# plan item will fall outside the new dates. It stays in the plan, under Outside the trip dates.} other {# plan items will fall outside the new dates. They stay in the plan, under Outside the trip dates.}} |
| `tripForm.preview.cleared` | The trip will have no dates. Dated plan items keep their dates. |
| `tripForm.preview.nowStatus` | The trip will be happening now. |
| `tripForm.preview.pastStatus` | The trip will be in the past. |

#### Draft, discard
| id | String | Notes |
|---|---|---|
| `tripForm.discard.title` | Discard this trip? | only with input |
| `tripForm.discard.body` | What you've typed will be lost. | |
| `tripForm.discard.keep` | Keep editing | safe, focused |
| `tripForm.discard.confirm` | Discard | |
| `tripForm.discardEdit.title` | Discard your changes? | |
| `tripForm.discardEdit.body` | Your changes to {trip} won't be saved. | |

(`tripCommon.draft.restored`, `tripCommon.draft.discard` as above.)

#### Partner changed it, or a 409 (Goals' three-way merge)
`{actor}` is `partner` (a first name), `self` (same person, another device) or `other` (unknown).

| id | String | Notes |
|---|---|---|
| `tripMerge.notice.trip` | {actor, select, partner {{name} changed this trip while you were editing. Check the marked fields, then save again.} self {This trip changed on your other device while you were editing. Check the marked fields, then save again.} other {This trip changed on another phone while you were editing. Check the marked fields, then save again.}} | `role="status"`; after a 409 focus goes here |
| `tripMerge.notice.entry` | the same, with "plan item" for "trip" | |
| `tripMerge.notice.place` | the same, with "place" | |
| `tripMerge.notice.item` | the same, with "item" | |
| `tripMerge.changedBy` | {actor, select, partner {Changed by {name}} self {Changed on your other device} other {Changed on another phone}} | caption under a field |
| `tripMerge.conflict` | {actor, select, partner {{name} changed this to "{value}".} self {Your other device changed this to "{value}".} other {Another phone changed this to "{value}".}} | |
| `tripMerge.conflict.dates` | {actor, select, partner {{name} changed the dates to {range}.} self {Your other device changed the dates to {range}.} other {Another phone changed the dates to {range}.}} | dates are one field |
| `tripMerge.conflict.cover` | {actor, select, partner {{name} changed the cover photo.} self {Your other device changed the cover photo.} other {Another phone changed the cover photo.}} | |
| `tripMerge.useTheirs` | Use theirs | button |
| `tripMerge.useTheirs.label` | Use theirs: {fieldLabel} | **fixes 2.5.3**: name starts with the visible text |
| `tripMerge.emptyValue` | (empty) | |
| `tripMerge.resolved.announce` | Their version is in the field. | polite |

#### Trip deleted while editing (404)
| id | String |
|---|---|
| `tripForm.notFound.heading` | This trip was deleted. Your changes weren't saved. |
| `tripForm.notFound.action` | Back to Trips |

#### Delete trip
| id | String | Notes |
|---|---|---|
| `tripForm.delete` | Delete trip | danger, last, set apart |
| `tripForm.delete.offline` | Deleting needs a connection. | |
| `tripConfirm.trip.title` | Delete {trip}? | |
| `tripConfirm.trip.body` | This deletes its {plan, plural, one {# plan item} other {# plan items}}, {places, plural, one {# place} other {# places}} and {items, plural, one {# checklist item} other {# checklist items}}, for both of you. You can't undo this. | separate plural arguments per noun. **[VERIFY A12]** counts come from the cached detail. |
| `tripConfirm.trip.cover` | The cover photo is deleted too. | extra paragraph when there is a cover |
| `tripConfirm.trip.keep` | Keep trip | safe, focused |
| `tripConfirm.trip.delete` | Delete trip | |
| `tripConfirm.trip.deleting` | Deleting… | |
| `tripForm.delete.failed` | Couldn't delete the trip. Try again. | alert; stays in Edit |

---

## System messages

### Confirmations (alertdialog; focus on the safe button; Esc keeps)
| Situation | Title | Body (each line is its own key) | Buttons |
|---|---|---|---|
| Delete a plan item | `tripConfirm.plan.title` "Delete {title}?" | `tripConfirm.plan.body` "It's removed from the plan for both of you." · from a place: `tripConfirm.plan.body.fromPlace` "{placeTitle} goes back to your ideas." · from a place and done: `tripConfirm.plan.body.fromPlace.done` "{placeTitle} goes back to your ideas and is no longer visited." · last line `tripConfirm.final` "You can't undo this." | `common.keepIt` "Keep it" · `common.delete` "Delete" |
| Delete a place | `tripConfirm.place.title` "Delete {title}?" | `tripConfirm.place.body` "It's removed from Places for both of you." · in the plan: `tripConfirm.place.body.inPlan` "Its plan item on {date} stays." · no date: `tripConfirm.place.body.inPlan.undated` "Its plan item stays, with no date yet." · `tripConfirm.final` | Keep it · Delete |
| Delete a Prep item | `tripConfirm.item.title` "Delete {title} from {group}?" | `tripConfirm.item.body` "It's removed for both of you." · `tripConfirm.final` | Keep it · Delete |
| Remove a queued place | `tripConfirm.queued.title` "Remove {title}?" | `tripConfirm.queued.body` "It hasn't synced, so {name} never saw it." (`{name}` is the partner; if there's no partner: "It hasn't synced yet.") | `common.keepIt` · `tripConfirm.queued.remove` "Remove" |
| Delete a trip | (above) | (above) | Keep trip · Delete trip |
| Discard a form | per form (above) | | Keep editing · Discard |

`tripConfirm.deleting` is "Deleting…" (`aria-disabled` while the call runs).

### Toasts (10 s per Goals decision 1; pauses on hover and focus; each is also its own polite announcement)
| id | String | Notes |
|---|---|---|
| `tripToast.entry.added` | Added {title} to {date} | Undo |
| `tripToast.entry.added.undated` | Added {title} to the plan, with no date yet | Undo |
| `tripToast.entry.undone` | Removed {title} from the plan | after Undo; polite |
| `tripToast.entry.undoFailed` | Couldn't undo. {title} is still in the plan. | row stays |
| `tripToast.entry.changed` | Changes saved | (`tripToast.saved`) |
| `tripToast.entry.deleted` | Deleted {title} from the plan | no Undo |
| `tripToast.scheduled` | {title} is on {date} | Undo |
| `tripToast.scheduled.undated` | {title} is in the plan, with no date yet | Undo |
| `tripToast.scheduled.undone` | {title} is back in your ideas | after Undo |
| `tripToast.scheduled.undoFailed` | Couldn't undo. {title} is still in the plan. | |
| `tripToast.place.added` | Added {title} to Places | Undo. This is also the confirmation when the primary "Add a place" was used from the Plan tab. |
| `tripToast.place.queued` | Added {title} to Places. Will sync when you're back online. | Undo cancels the queued add. **Do not say "saved".** (Home's pattern) |
| `tripToast.place.undone` | Removed {title} from Places | |
| `tripToast.place.undoFailed` | Couldn't undo. Delete {title} from Places. | the add already synced and delete failed (Home's pattern) |
| `tripToast.place.deleted` | Deleted {title} from Places | no Undo |
| `tripToast.item.deleted` | Deleted {title} from {group} | no Undo |
| `tripToast.deleteFailed` | Couldn't delete this. Try again. | focus returns to the row (Goals) |
| `tripToast.undo` | Undo | (Home: `toast.undo`) visible text |
| `tripToast.undo.label.entry` | Undo: remove {title} from the plan | **contains "Undo"** |
| `tripToast.undo.label.scheduled` | Undo: take {title} out of the plan | |
| `tripToast.undo.label.place` | Undo: remove {title} from Places | |
| `tripToast.dismiss.label` | Dismiss | (Home) |
| `tripToast.syncRejected.place` | Couldn't add {title}. {trip} was deleted. | queued add rejected (title named so it can be added elsewhere) |
| `tripToast.syncRejected.tick` | Couldn't tick {title}. It was deleted. | queued tick rejected, the item is gone |
| `tripToast.syncRejected.trip` | Couldn't sync your changes to {trip}. It was deleted. | one toast for a deleted trip (not one per item) |

No toast for ticks and unticks (the checkbox is the feedback), for the inline Prep add (announced, see below), for partner changes (announced), or for time passing.

### Empty, loading, error (summary)
| Situation | Strings |
|---|---|
| List empty / only past | `trips.list.empty.*` · `trips.list.onlyPast.*` |
| Plan empty | each day's `plan.day.empty` · `plan.empty.undated` · `plan.empty.past` |
| Places empty | `places.empty` · `places.allPlanned` |
| Prep group empty | `prep.group.empty` |
| Loading | `*.loading.announce`; skeletons `aria-hidden` |
| List fails (no cache) | `trips.list.error.*` |
| List refresh fails | `trips.list.stale.notice` |
| Trip fails | `trip.error.*` |
| One section fails | `plan.error`, `places.error`, `prep.error`, `budget.error` |
| Trip 404 | `trip.notFound.*` |
| Partner deleted the trip | `trip.deleted.*`, `planForm.tripDeleted`, `tripForm.notFound.*` |
| Not on this phone | `trip.panel.notCached` |
| Offline | `trips.offline.notice` + `trip.offline.notice.more`; reasons `tripOffline.reason.*` |
| Network or server error on save | `planForm.failed*`, `placeForm.failed*`, `schedule.failed`, `tripForm.create.failed`, `tripForm.edit.failed`, `tripForm.delete.failed`, `itemSheet.failed`, `tripToast.deleteFailed` |
| Concurrent edit | `tripMerge.*`, `schedule.taken*` |
| Item gone while editing (404) | `planForm.itemDeleted`, `placeForm.placeDeleted`, `*.deleted.byPartner` |

Pressing any `aria-disabled` control does nothing except show and announce its reason. Reasons are never "disabled" or "unavailable" alone.

### Shared generic strings
| id | String |
|---|---|
| `common.tryAgain` | Try again |
| `common.close` | Close |
| `common.cancel` | Cancel |
| `common.undo` | Undo |
| `common.dismiss` | Dismiss |
| `common.keepIt` | Keep it |
| `common.delete` | Delete |
| `common.saving` | Saving… |
| `common.copyText` | Copy text |
| `common.copied` | Text copied |
| `common.copyFailed` | Couldn't copy. Select the text and copy it by hand. |
| `common.backToTrips` | Back to Trips |
| `common.dateTime` | {date}, {time} |
| `common.timeRange.sr` | {start} to {end} |

### Type names (`tripCommon.type.name`; plan items and places share one enum **[VERIFY A10]**)
`{type, select, flight {Flight} transport {Transport} stay {Stay} food {Food} sight {Sight} activity {Activity} other {Other}}`

---

## Live announcements (polite; one per partner act; mirrored into an open dialog; never on load, for my own acts, or for time passing)

| id | String | Partner act |
|---|---|---|
| `tripLive.entry.added` | {name} added {title} to {date}. | adds a plan item |
| `tripLive.entry.added.undated` | {name} added {title} to the plan, with no date yet. | |
| `tripLive.entry.changed` | {name} changed {title}. | edits it (also when it moved day or time) |
| `tripLive.entry.removed` | {name} removed {title} from the plan. | deletes it; open sheet swaps to deleted |
| `tripLive.entry.ticked` | {name} ticked {title}. | ticks a plan item |
| `tripLive.entry.unticked` | {name} unticked {title}. | |
| `tripLive.place.added` | {name} added a place: {title}. | |
| `tripLive.place.changed` | {name} changed {title}. | |
| `tripLive.place.removed` | {name} deleted the place {title}. | |
| `tripLive.place.scheduled` | {name} put {title} on {date}. | |
| `tripLive.place.scheduled.undated` | {name} put {title} in the plan, with no date yet. | |
| `tripLive.item.packed` | {name} packed {title}. | ticks in Packing |
| `tripLive.item.ticked` | {name} ticked {title}. | ticks in other groups (same string as plan; reused) |
| `tripLive.item.unticked` | {name} unticked {title}. | |
| `tripLive.item.added` | {name} added {title} to {group}. | |
| `tripLive.item.changed` | {name} changed {title}. | |
| `tripLive.item.removed` | {name} deleted {title} from {group}. | |
| `tripLive.prep.reordered` | {name} changed the order of {group}. | |
| `tripLive.trip.dates` | {name} changed the dates to {range}. | day list rebuilds; entries may move to Outside |
| `tripLive.trip.datesCleared` | {name} removed the dates. | |
| `tripLive.trip.renamed` | {name} renamed the trip to {trip}. | |
| `tripLive.trip.budget` | {name} changed the budget to {amount} MAD. | |
| `tripLive.trip.budgetRemoved` | {name} removed the budget. | |
| `tripLive.trip.cover` | {name} changed the cover photo. | |
| `tripLive.trip.edited` | {name} edited this trip. | fallback for any other trip edit |
| `tripLive.trip.deleted` | {name} deleted {trip}. | the swap's heading is the announcement |

Dialog mirror name: `a11y.live.dialog.name` "Updates" (Goals).

---

## Accessibility strings

| id | String | Where |
|---|---|---|
| `a11y.trips.list.region` | Trips | `<main>` landmark if the h1 isn't enough |
| `a11y.trip.summary.region` | Summary | landmark or group around the identity, status and budget |
| `a11y.trip.left.heading` | What's left | hidden h2 |
| `a11y.trip.tabs` | Plan, places and prep | tablist (`trip.tabs.label`) |
| `a11y.trip.panel.plan` | Plan | `aria-labelledby` the tab |
| `a11y.trip.panel.places` | Places | |
| `a11y.trip.panel.prep` | Prep | |
| `a11y.plan.tick` | {title} done | checkbox (`plan.row.tick.label`); the attribution is `aria-describedby` |
| `a11y.prep.tick` | {title} packed / {title} done | (`prep.row.tick.*`) |
| `a11y.plan.row.now` | Now | text inside the row name, not just the fill (WCAG 1.4.1) |
| `a11y.plan.row.next` | Next | |
| `a11y.place.idea` | Idea | ends the card's name; "In the plan, {when}" is the link text for scheduled ones |
| `a11y.place.mustDo` | Must-do | text badge |
| `a11y.avatar.addedBy` | Added by {name} | the avatar's name; initials `aria-hidden` |
| `a11y.avatar.doneBy` | Done by {name} | |
| `a11y.type.icon` | (empty) | the icon is `aria-hidden`; the type word is in `plan.row.type.sr` |
| `a11y.progress.budget` | Budget | progressbar name; `aria-valuetext` is `budget.valuetext.*` |
| `a11y.budget.disclosure` | (the visible line) | `aria-expanded` carries open or closed; no separate label |
| `a11y.cover.alt` | (empty) | decorative; the title is beside it |
| `a11y.cover.initial` | (empty) | `aria-hidden` |
| `a11y.pending.icon` | Waiting to sync | cloud-off icon (Home) |
| `a11y.offline.icon` | Offline | (Home) |
| `a11y.icon.close` | Close | ✕ |
| `a11y.icon.back` | (empty) | chevron decorative; link name is `trip.back.label` |
| `a11y.link.newTab` | (opens in a new tab) | suffix for `url` links; included in `planSheet.link.name` |
| `a11y.dialog.planForm` | Add to the plan: {trip} / Edit plan item: {trip} | dialog name |
| `a11y.dialog.placeForm` | New place: {trip} / Edit place: {trip} | |
| `a11y.dialog.schedule` | Schedule {title}: {trip} | |
| `a11y.dialog.sheet` | {title} | sheets are named by the item's title |
| `a11y.dialog.confirm` | (the question) | `aria-labelledby`; the consequence is `aria-describedby` |
| `a11y.live.region.name` | Updates | (Home) |
| `a11y.live.online` | (Home: `home.online.announce`) | |
| `a11y.live.offline` | `trip.offline.announce` | |
| `a11y.live.tripCreated` | Trip created. | |
| `a11y.live.changesSaved` | Changes saved | toast text is the announcement |
| `a11y.live.disabledReason` | (the control's own reason) | announced once on press |
| `a11y.live.undoNext` | Undo is the next button. | (Home) after a toast with Undo |
| `a11y.live.prepAdded` | Added {title} to {group}. | (`prep.added.announce`) |
| `a11y.live.prepMoved` | {title} moved to {position} of {total}. | |
| `a11y.live.formOnline` | Back online. You can add this now. / … create the trip now. / … save your changes now. | |
| `a11y.field.required` | required | via the `required` attribute; the asterisk is `aria-hidden` |
| `a11y.status.noChange` | (nothing) | status changes with time (midnight, Now/Next) are never announced |

Amounts, times and dates inside RTL text are wrapped `dir="ltr"`.

---

## Label-in-name audit (WCAG 2.5.3)

Every control with visible text, and the accessible name that contains it. Build with the visible text as the name and add context **after** it.

| Visible | Accessible name | Fixes |
|---|---|---|
| Trips (up-link) | Back to Trips | |
| Edit | Edit {trip} / Edit {title} | |
| More / Less (notes) | More notes / Less notes | open issue "More / Less" |
| Add dates | Add dates to {trip} | |
| Set a budget | Set a budget for {trip} | |
| Change budget | Change budget for {trip} | |
| Add (per day) | Add to {date} | |
| Add (Prep inline) | Add to {group} | |
| Close (Prep inline) | Close, {group} | |
| Schedule | Schedule {title} | |
| In the plan · Tue 24 Nov, 17:30 | (same as visible; do not override) | |
| Reorder / Done | Reorder {group} / Done reordering {group} | |
| Move up / Move down | Move up, {title} / Move down, {title} | |
| Go | Go to day | |
| Use theirs | Use theirs: {fieldLabel} | open issue "Use their version of {field}" |
| Discard draft | (same; no override) | open issue "Discard the restored draft" |
| Try again (cover) | Try again: cover photo | open issue "Try uploading photo {n} again" |
| Replace / Remove (cover) | Replace cover photo / Remove cover photo | |
| Undo | Undo: remove {title} from the plan | |
| Delete / Remove in sheets | Delete {title} / Remove {title} | |
| Plan row, place card, trip card | content-derived; no `aria-label` | |

---

## i18n notes (French and Dutch for length; Arabic and RTL)

- **Keys, not sentences.** Every sentence is one key. Plural nouns are ICU. Where two or three nouns are counted in one sentence (`tripConfirm.trip.body`, `tripForm.preview.outside`) each has its own plural argument.
- **Separators.** "·" and "–" between values are decorative and are rendered between separate elements; where a single key contains several values (`budget.breakdown.ideas`, `plan.earlier.summary`, `prep.group.heading`) translators may reorder it.
- **Group names** are a `select` (`prep.group.name`), so "Add to {group}" and "Delete {title} from {group}" can be rewritten for the language's grammar.
- **Possessives and gendered verbs.** "{name} added", "Its plan item on {date} stays": whole-key translation; neutral forms in French and Arabic.
- **Dual and "you two".** "for both of you", "you two": translate by meaning.
- **"Prep"** is clipped English: translate by meaning ("Préparatifs" or "À préparer").
- **"Schedule"** is the only verb for place to plan; translators must not use a noun/status for "In the plan" and a different verb elsewhere.
- **"No dates yet" (trip) and "No date yet" (plan item)** are different keys on purpose.
- **Dates and times.** From `Intl`; the year is added only when it isn't the current year. Times are 24-hour in every locale **[VERIFY the native time inputs follow the OS locale and may show 12-hour: IA §7 (g)]**. "{date}, {time}" and "{date} at {time}" are single keys because the joining word varies.
- **Money.** `{amount} MAD`: same open item as Goals (Arabic formatter). `~` before an estimate is `aria-hidden`; the screen-reader twin says "about".
- **RTL.** Mirror "‹", the date-range dash direction, and the floating button's side. Amounts, times, dates and "MAD" stay LTR. Reorder up/down are vertical and don't mirror.
- **Expansion.** Budget 30 to 40% on buttons and tab labels. Risks: "Add a place" and "Add to the plan" in the 56 px floating button (wrap or grow, never truncate), the 3-tab bar at 320 px (96 px each; "Places", "Plan", "Prep" fit; French "Préparatifs" is the longest and still fits at 13 px), the offline reasons (about 110 characters, below the control), `trip.left.mustDo` ("1 must-do not in the plan yet", wraps to two lines at 320 px), and `planForm.day.option` in a native select (truncates inside the control; the full text is in the option list).
- **No text in images.** The arch's initial is rendered text, `aria-hidden`.

---

## Open items

1. **Confirmed: "Prep"**, with the intro line `trip.panel.prep.intro`. **Replaced: the "What's left" line** (wording above). If the user prefers "Checklist", the changes are `trip.tabs.prep`, `trip.panel.prep.heading`, `trip.left.prep` ("{count} checklist items left") and the glossary.
2. **"Plan item" instead of "plan entry"** everywhere on screen. Engineers' variable names stay.
3. **No Directions.** Nothing in this file mentions maps. A location is text; a link is the pasted URL, shown as its host.
4. **Past trips say "Ended n days ago"**, not "n days ago". Differs from the design system's sunken count text; a one-key change if the Art Director objects.
5. **Past-trip budget uses "Planned".** The app has no actual spending, so it can't say "Spent".
6. **Values to verify with the architecture** (Goals' defaults in brackets): trip, destination, plan item, place and area titles (80), location (120), URL (2,000), notes (4,000), cost and budget caps, zero budget allowed, cover formats and 10 MB, the 31-day long-trip helper, Now lasting 60 minutes with no end time (A7), place default type (Other vs Sight), one type enum (A10), delete-trip counts at confirm time (A12), and A9 (queued checklist add changes `trip.offline.notice.more` and removes `tripOffline.reason.checklistAdd`).
7. **Toast duration** is 10 s (Goals decision 1). Home's `copy.md` still says 6 s and should be corrected.
8. **Year rule** applies to every date here, including "In the plan · {when}", sheets and headings. The full year does not appear in `planSheet.doneBy`'s "{date} at {time}" unless it isn't the current year.
9. **Schedule dialog discard** is left optional (one choice, nothing typed): the Director decides whether to confirm.
10. **Home's first-run string** "No trips yet. Plan your first one." is reused as the list's empty heading; if Home changes it, change `trips.list.empty.heading` with it.
11. **Home's `trip-now` and Trips' `trip-now` show different trips** (decision U3). No copy change; the scenario footnote names Lisbon.
