# Copy: Zamane Home and quick-add sheet

Format: `id` | string. Placeholders in `{braces}` are filled by the app; never build a sentence from fragments. Plural ids end in `.one` / `.other` (Arabic and French need more; see notes at the end).

## Voice

Warm, plain, specific.

| Adjective | This | Not that |
|---|---|---|
| Warm | "Hi, you two" | "Welcome back, valued user" |
| Plain | "Add contribution" | "Submit" |
| Specific | "Sara added 500 · bonus month" | "A contribution was recorded" |

Tone by moment:
- **Daily glance:** short, quiet. Numbers do the talking.
- **Success:** one calm line. "Goal reached." No exclamation marks, no emoji.
- **Offline or error:** say what is true, what still works, what to do. No apology theatre.
- **Destructive (Undo):** reversible, so no confirmation dialog. Say what was removed.

Format rules (design system, binding): sentence case; amounts "14,250 MAD" (currency after, no decimals unless typed); dates "Fri 14 Mar"; time 24-hour; first names; "you two".

## Glossary

| Term | Meaning | Never call it |
|---|---|---|
| goal | a savings target (money or general %) | fund, pot, objective |
| contribution | one amount added to a goal | deposit, payment, transaction |
| Saved together | total across both partners | balance, net worth |
| partner | the other person, by first name where known | spouse, user, member |
| space | the shared place for the two of you (used only in invite text) | workspace, account, group |
| invite code | the 8-character code, e.g. K7QM-4XPA | key, token, PIN |
| trip | planned travel | event, holiday |
| shopping | the shared to-buy list | groceries, cart |

## Screens

### Document titles (unique per state)
| id | String |
|---|---|
| `home.title.default` | Home – Zamane |
| `home.title.firstRun` | Invite your partner – Zamane |
| `home.title.offline` | Home (offline) – Zamane |
| `home.title.error` | Can't load Home – Zamane |
| `home.title.loading` | Loading – Zamane |
| `sheet.title.doc` | Add to a goal – Zamane |  (use only if the sheet becomes a route; otherwise title stays Home)

Note: the title is announced on route change; the sheet does not change it when it is a dialog.

### Header (all populated-style states)
| id | String | Notes |
|---|---|---|
| `home.date` | {date} | Format "Mon 9 Nov". **Changed from DS mock "Monday 9 Nov"**: DS Voice rule is the short weekday ("Fri 14 Mar"); also saves width in French/Dutch. |
| `home.greeting.both` | Hi, you two | DS, kept |
| `home.greeting.solo` | Hi, {firstName} | first-run |
| `home.avatarPair.label` | {nameA} and {nameB} | accessible name of the decorative pair |
| `home.avatarPair.solo.label` | {firstName}. Your partner hasn't joined yet. | first-run |

### State: populated
| id | String |
|---|---|
| `home.saved.label` | Saved together |
| `home.saved.amount` | {amount} MAD | amount pre-formatted, "20,250" |
| `home.saved.counts.open.one` | {count} open |
| `home.saved.counts.open.other` | {count} open |
| `home.saved.counts.done` | {count} done |
| `home.saved.counts.joined` | {openLabel} · {doneLabel} | **Avoid.** Fragment join; use the full-sentence id below |
| `home.saved.counts` | {openCount} open · {doneCount} done | use this single string; the numbers are not pluralised ("open"/"done" are adjectives) |
| `home.saved.link.label` | Saved together: {amount} MAD. Open goals. | accessible name of the stretched link to Goals |
| `home.add.primary` | Add to a goal | DS, kept; only primary button |
| `home.trip.kicker.upcoming` | Next trip | DS |
| `home.trip.kicker.tomorrow` | Tomorrow | DS code |
| `home.trip.days.one` | day to go | DS |
| `home.trip.days.other` | days to go | DS |
| `home.trip.title` | {destination} | |
| `home.trip.dates` | {start} to {end} | e.g. "Sat 21 Nov to Wed 25 Nov" |
| `home.trip.countdown.label.one` | {destination}: {count} day to go, starts {start} | accessible name for the countdown block; the big numeral is `aria-hidden` |
| `home.trip.countdown.label.other` | {destination}: {count} days to go, starts {start} | |
| `home.closest.heading` | Closest to done | DS |
| `home.closest.seeAll` | See all | DS |
| `home.closest.seeAll.label` | See all goals | accessible name (the visible "See all" alone is ambiguous out of context) |
| `home.goal.progress.money` | {saved} MAD of {target} MAD | DS pattern "14,250 MAD of 20,000 MAD" |
| `home.goal.progress.percent` | {percent}% | general goal |
| `home.goal.progress.label.money` | {goalTitle}: {saved} MAD of {target} MAD, {percent}% | `aria-label` on the progressbar; also `aria-valuenow/min/max` |
| `home.goal.progress.label.percent` | {goalTitle}: {percent}% done | |
| `home.goal.attribution` | {firstName} added {amount} · {note} | DS, with note |
| `home.goal.attribution.noNote` | {firstName} added {amount} · {when} | when = "today", "yesterday", "Fri 14 Mar" |
| `home.goal.attribution.percent` | {firstName} moved it to {percent}% · {when} | general goal |
| `home.goal.attribution.none` | No contributions yet | a goal with zero entries |
| `home.goal.attribution.pending` | {firstName} added {amount} · waiting to sync | the entry is queued (see offline) |
| `home.shopping.heading` | Shopping | DS |
| `home.shopping.left.one` | {count} left to buy | DS |
| `home.shopping.left.other` | {count} left to buy | DS |
| `home.shopping.none` | Nothing left to buy | `shoppingLeft` = 0 |
| `home.shopping.link.label.one` | Shopping: {count} item left to buy | |
| `home.shopping.link.label.other` | Shopping: {count} items left to buy | |

Relative time `{when}`: `just now`, `{minutes} min ago` (plural-aware), `today at {time}`, `yesterday`, then "Fri 14 Mar".

### State: first-run (partner hasn't joined)
| id | String |
|---|---|
| `home.firstRun.invite.heading` | Invite your partner |
| `home.firstRun.invite.body` | Share this code so they can join your space. It works once. |
| `home.firstRun.invite.code.label` | Invite code |
| `home.firstRun.invite.code.a11y` | Invite code: {codeSpelledOut} | spell out each character, e.g. "K 7 Q M, 4 X P A"; visual code stays `K7QM-4XPA` |
| `home.firstRun.share` | Share code | primary |
| `home.firstRun.copy` | Copy | secondary |
| `home.firstRun.copy.label` | Copy invite code | accessible name |
| `home.firstRun.copied` | Code copied | toast + live region |
| `home.firstRun.copyFailed` | Couldn't copy. Select the code and copy it by hand. | |
| `home.firstRun.share.message` | Join me on Zamane. Use this code: {code} | text passed to Web Share |
| `home.firstRun.waiting` | Waiting for {partnerLabel} to join. | partnerLabel = "your partner" (no name yet) |
| `home.firstRun.start.heading` | Start now, together later | |
| `home.firstRun.start.goal` | Create a goal |
| `home.firstRun.start.trip` | Plan a trip |
| `home.firstRun.start.shopping` | Start a shopping list |

Honesty check: "It works once" assumes single-use codes. **[VERIFY against ARCHITECTURE.md §1]**; delete that sentence if codes can be reused or expire.
No totals, no countdown, no "Add to a goal" here, as per IA.

### State: joined-empty
| id | String |
|---|---|
| `home.empty.saved.amount` | 0 MAD |
| `home.empty.saved.body` | Nothing saved yet. Create a goal to start counting. |
| `home.empty.primary` | Create a goal | the only primary |
| `home.empty.trip.body` | No trips yet. Plan your first one. | DS canon |
| `home.empty.trip.action` | Plan a trip |
| `home.empty.closest.body` | Goals you're closest to finishing will show here. |
| `home.empty.closest.action` | Create a goal | secondary; same label as the primary is fine, but render only one on screen if both are visible (use "Create a goal" primary and omit this) |
| `home.empty.shopping.body` | Nothing on the list yet. |
| `home.empty.shopping.action` | Add an item |

### State: trip-now
| id | String |
|---|---|
| `home.trip.kicker.now` | Happening now | DS |
| `home.trip.now.big` | Day {day} | |
| `home.trip.now.of` | of {total} | |
| `home.trip.now.summary` | Day {day} of {total} | combined visible form; use this one string rather than assembling |
| `home.trip.now.label` | {destination}: day {day} of {total}, happening now | countdown accessible name |

### State: no-trip
| id | String |
|---|---|
| `home.noTrip.body` | No trips yet. Plan your first one. | DS canon. **Wrong if trips existed and all have ended**; use the next id for that |
| `home.noTrip.past.body` | No trip coming up. Plan the next one. | when past trips exist |
| `home.noTrip.action` | Plan a trip |
| `home.trip.past.label` | {destination} ended {count} days ago | only if a past trip is shown; plural ids `.one` ("1 day ago") / `.other` |

### State: all-done
| id | String |
|---|---|
| `home.allDone.heading` | All goals reached |
| `home.allDone.body.one` | You finished {count} goal together. |
| `home.allDone.body.other` | You finished {count} goals together. |
| `home.allDone.action` | New goal | primary; also the only action (no duplicate secondary button where the primary already shows) |
| `home.allDone.seeAll` | See all | link to Goals |

IA asks for a secondary **New goal** in block 4 and the primary also **New goal**. Show one button only; two identical buttons on the same screen is noise. Flag for the Director.

### State: loading
| id | String |
|---|---|
| `home.loading.announce` | Loading Home | `role="status"`, visually hidden; skeletons are `aria-hidden` |
| `home.loading.busy.label` | Loading | `aria-busy` region label |

No visible text in skeletons.

### State: offline
| id | String |
|---|---|
| `home.offline.notice` | You're offline. Showing what was last saved. Adding to goals still works and syncs when you're back online. |
| `home.offline.lastSynced` | Last updated {when} | optional second line |
| `home.offline.announce` | You're offline. Adding to goals still works. | polite live region, once on change |
| `home.online.announce` | Back online. Syncing your changes. | polite; only if there were queued entries, else "Back online." (`home.online.announce.plain`) |
| `home.online.synced.one` | {count} contribution synced | toast after the queue drains |
| `home.online.synced.other` | {count} contributions synced | |
| `home.online.syncFailed` | Couldn't sync {count} contributions. We'll try again. | plural ids `.one` / `.other`; only if retries are real |

Notice says "last saved" meaning data last downloaded, not "saved" money; keep it as "last updated" if testing shows confusion. **Changed wording to avoid "saved" ambiguity** in the final string below, use this version:

`home.offline.notice` = You're offline. Showing the latest data on this phone. Adding to goals still works and syncs when you're back online.

### State: error
| id | String |
|---|---|
| `home.error.heading` | Home didn't load |
| `home.error.body` | Check your connection and try again. |
| `home.error.retry` | Try again |
| `home.error.retrying` | Trying again | button label while pending |
| `home.error.announce` | Home didn't load. Try again. | `role="alert"` |

### Live partner update
| id | String |
|---|---|
| `home.live.attribution.money` | {partnerName} added {amount} · just now | e.g. "Youssef added 200 · just now" |
| `home.live.attribution.note` | {partnerName} added {amount} · {note} | after "just now" ages out, when a note exists |
| `home.live.announce.total` | {partnerName} added {amount} MAD. Saved together: {total} MAD. | polite live region on the total; never on load or on my own entries |
| `home.live.announce.percent` | {partnerName} moved {goalTitle} to {percent}%. | general goal |
| `home.live.announce.completed` | {partnerName} reached {goalTitle}. | partner finishes a goal; no toast, per IA |
| `home.live.removed.announce` | {partnerName} removed a contribution from {goalTitle}. Saved together: {total} MAD. | partner used Undo or deleted; the honest counterpart |

## System messages: quick-add sheet

### Sheet chrome
| id | String |
|---|---|
| `sheet.heading` | Add to a goal |
| `sheet.close.label` | Close |
| `sheet.dialog.label` | Add to a goal |

### Step A: pick a goal
| id | String |
|---|---|
| `sheet.pick.prompt` | Which goal? |
| `sheet.pick.group.label` | Open goals |
| `sheet.pick.option.money` | {goalTitle}, {saved} MAD of {target} MAD | accessible name; visible form is two lines (title, then progress) |
| `sheet.pick.option.percent` | {goalTitle}, {percent}% |
| `sheet.pick.empty` | No open goals to add to. | defensive; Home hides the button in this case |

### Step B: amount, money goal
| id | String |
|---|---|
| `sheet.amount.label` | Amount |
| `sheet.amount.suffix` | MAD | visual; field label also gets the currency via `sheet.amount.label.full` |
| `sheet.amount.label.full` | Amount in MAD |
| `sheet.amount.helper` | For example 500 or 1 200 |
| `sheet.amount.preview` | {goalTitle} will be at {newSaved} MAD of {target} MAD | optional live preview |
| `sheet.note.toggle` | Add a note |
| `sheet.note.label` | Note |
| `sheet.note.helper` | Optional. For example, bonus month |
| `sheet.submit` | Add contribution | DS canon |
| `sheet.changeGoal` | Change goal |
| `sheet.step.context` | Adding to {goalTitle} | read as the sheet subtitle |

### Step B: general goal
| id | String |
|---|---|
| `sheet.percent.label` | Progress, from 0 to 100% |
| `sheet.percent.current` | Now at {percent}% |
| `sheet.percent.helper` | Enter the new total, not the amount to add. |
| `sheet.percent.minus.label` | Subtract 10 |
| `sheet.percent.plus.label` | Add 10 |
| `sheet.percent.minus` | −10 | visible; symbols, keep language-neutral |
| `sheet.percent.plus` | +10 |
| `sheet.submit.percent` | Update progress | **Differs from DS "Add contribution"**: a percent goal sets progress, not an amount; the verb must say what happens. If the Director wants one button, keep "Add contribution" and change the helper to "Enter how much to add." Decide before build; both are consistent with the data model only if the percent is an increment. **[VERIFY]** |

### Step B: invalid
| id | String |
|---|---|
| `sheet.error.amount.empty` | Enter an amount, for example 500. |
| `sheet.error.amount.zero` | Enter an amount greater than 0. |
| `sheet.error.amount.format` | Use numbers only, for example 500 or 500,50. |
| `sheet.error.amount.tooLarge` | That amount is too large. Enter {max} MAD or less. | only if a cap exists; **[VERIFY]** |
| `sheet.error.percent.empty` | Enter a number from 0 to 100. |
| `sheet.error.percent.range` | Enter a number from 0 to 100. |
| `sheet.error.percent.format` | Use whole numbers, for example 40. | if decimals not allowed **[VERIFY]** |
| `sheet.error.noGoal` | Pick a goal first. | defensive |
| `sheet.error.save` | Couldn't add this. Try again. | unexpected local failure; field input preserved |

Errors sit under the field, linked with `aria-describedby`, field gets `aria-invalid="true"`, and `role="alert"` on first appearance.

### Success (with Undo)
| id | String |
|---|---|
| `toast.added.money` | Added {amount} MAD to {goalTitle} | IA string, kept |
| `toast.added.percent` | {goalTitle} is now at {percent}% |
| `toast.undo` | Undo |
| `toast.undo.label` | Undo: remove {amount} MAD from {goalTitle} | accessible name |
| `toast.undone` | Removed {amount} MAD from {goalTitle} | after Undo; polite |
| `toast.undone.percent` | {goalTitle} is back to {percent}% |
| `toast.undoFailed` | Couldn't undo. Delete it from {goalTitle}. | e.g. the entry already synced and delete failed |
| `toast.dismiss.label` | Dismiss |

Toast stays 6 s per IA; Undo must stay focusable and the timer pauses on focus or hover (WCAG 2.2.1).

### Queued (offline)
| id | String |
|---|---|
| `toast.queued.money` | Added {amount} MAD to {goalTitle}. Will sync when you're back online. | IA string. **Do not say "saved"** |
| `toast.queued.percent` | {goalTitle} set to {percent}%. Will sync when you're back online. |
| `home.goal.pending.badge` | Waiting to sync | shown on the card (tag text) |
| `home.goal.pending.label` | {amount} MAD waiting to sync | accessible name for the queued indicator |
| `toast.queued.undo.note` | (Undo works for queued entries too; the entry is simply never sent.) | internal note, not shown |

Offline totals: the card and "Saved together" show the local total including queued entries. Say so with the badge, not with a changed total label.

### Goal completed
| id | String |
|---|---|
| `toast.completed.title` | Goal reached. | DS canon; the saffron moment |
| `toast.completed.body` | {goalTitle}: {target} MAD together. | money goal |
| `toast.completed.body.percent` | {goalTitle} is at 100%. |
| `toast.completed.queued` | Goal reached once this syncs. | **only when queued**; the goal is complete on this phone, not yet shared |
| `home.goal.done.badge` | Done | zellige badge, DS |
| `toast.completed.undo` | Undo | stays for 6 s |
| `home.goal.done.label` | {goalTitle}: done | |

## Accessibility strings

| id | String | Where |
|---|---|---|
| `a11y.skip` | Skip to main content | skip link |
| `a11y.avatar.sara` | Sara | each `PartnerAvatar` standalone, if shown outside the pair |
| `a11y.avatarPair` | {nameA} and {nameB} | `role="img"` on the pair; initials inside are `aria-hidden` |
| `a11y.progress.money` | {goalTitle}: {saved} MAD of {target} MAD | `role="progressbar"`, with value attributes |
| `a11y.progress.percent` | {goalTitle}: {percent}% | |
| `a11y.progress.done` | {goalTitle}: complete | |
| `a11y.countdown.upcoming.one` | {destination}: {count} day to go | countdown block; big numeral `aria-hidden` |
| `a11y.countdown.upcoming.other` | {destination}: {count} days to go | |
| `a11y.countdown.now` | {destination}: day {day} of {total}, happening now | |
| `a11y.live.region.name` | Updates | polite live region, visually hidden; messages from `home.live.*`, `home.online.*`, `home.firstRun.copied` |
| `a11y.live.sheet.opened` | Add to a goal. Pick a goal. | optional; native dialog announces its label already, so omit if redundant |
| `a11y.live.sheet.step.amount` | Adding to {goalTitle}. Enter an amount. | when focus moves to step B |
| `a11y.live.sheet.closed.focus` | — | focus returns to "Add to a goal"; no string |
| `a11y.icon.close` | Close | X icon |
| `a11y.icon.chevron` | — | decorative; `aria-hidden` |
| `a11y.icon.copy` | Copy invite code | |
| `a11y.icon.share` | Share invite code | |
| `a11y.offline.icon` | Offline | icon in the notice |
| `a11y.pending.icon` | Waiting to sync | |
| `a11y.stepper.group` | Adjust progress | group for −10 / +10 |

Images: Home has no meaningful images (arch is imagery only). If a trip image is added, `alt` = "{destination}" or empty if decorative next to the visible title. Rule: decorative alt is `""`.

## Changes to design-system strings
1. **"Monday 9 Nov" to "Mon 9 Nov"**: short weekday per the DS date rule.
2. **"No trips yet. Plan your first one."** kept but limited to when no trip has ever existed; second string for after trips end.
3. **"Add contribution"** kept for money; general goals get "Update progress" pending decision on whether percent is an increment (see `sheet.submit.percent`).
4. **"See all"** kept visually; the accessible name adds "goals".

## i18n notes (French, Dutch, Arabic)
- **Plurals:** every count has `.one` and `.other`. French treats 0 as singular ("0 jour à venir"): use ICU rules. Arabic needs `zero, one, two, few, many, other`: add when translated. Several ids (`home.shopping.left`, `home.trip.days`) are identical in both English forms by design but must still exist as separate keys.
- **"{count} day to go" / "days to go":** the trip numeral is large and the unit sits beside it as two elements; in French "jours restants" and Arabic ("أيام متبقية") also work, but in Arabic the unit agrees with the number grammar, so keep the `.one/.other` split.
- **`home.saved.counts`** ("3 open · 1 done"): in French "ouverts/terminés" agrees with gender and number of "objectifs"; may need `{openCount} ouverts` plural forms. Add plural variants at translation time.
- **Attribution** "Sara added 500 · bonus month": verb agrees with name gender in French/Arabic; `{partnerName}` gender is unknown. Prefer the neutral past ("500 ajoutés par Sara") in translation; the structure is flexible because the whole string is one key.
- **`home.trip.dates`** "{start} to {end}": fine; the word "to" may need "au" and date formats come from `Intl.DateTimeFormat`, never hand-built.
- **`home.firstRun.invite.code.a11y`** spoken spelling depends on language; the code uses Latin letters and digits in every locale; the code itself is LTR inside RTL text (wrap in `dir="ltr"`).
- **Amounts** "14,250 MAD": in Arabic UI show "14,250 MAD" or "14٬250 د.م." via `Intl.NumberFormat`; keep the currency after the number only in LTR; mark amounts `dir="ltr"` unless the locale formatter reverses them.
- **Percent** "{percent}%": French uses a space ("40 %"); use `Intl.NumberFormat` percent style.
- **Expansion:** allow ~40% on buttons: "Add contribution" (16) to "Ajouter une contribution" (24), "Share code" to "Partager le code". Buttons must wrap or grow, not truncate. Labels with `.label` suffixes are screen-reader only so expansion does not matter visually.
- **`home.offline.notice`** is long (about 110 characters). At 320 px it wraps to 3 lines in English and 4 in French; give it room.
- **"Hi, you two"** is idiomatic English; French "Salut, vous deux" works; Arabic needs the dual form ("أهلاً بكما"). Translate by meaning.
- **No concatenation anywhere:** `{when}` and `{note}` are computed values inserted into whole-sentence strings; the relative-time function must itself be localised.

## Open items for the Director
1. Is the invite code single-use or expiring? Affects `home.firstRun.invite.body`.
2. Percent goal: does the user enter the new total or an increment? Affects `sheet.submit.percent` and `sheet.percent.helper`.
3. Amount cap and decimals rule for `money.ts`: affects `sheet.error.amount.tooLarge`.
4. All-done state: one **New goal** button, not two.
5. Remove the duplicate / rejected ids marked "Avoid" (`home.saved.counts.joined`, `home.saved.counts.open.*`, `home.saved.counts.done`) before building; use `home.saved.counts`.
