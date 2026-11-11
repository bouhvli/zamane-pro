# Copy: Zamane Goals (list, goal detail, create/edit goal)

**Format.** `id` | string | notes. `{braces}` are values the app fills in. Counts use **ICU plural syntax** inside one whole-sentence key (`{count, plural, one {...} other {...}}`), so French (0 is singular) and Arabic (zero/one/two/few/many/other) are added by translators without code changes. Strings never get assembled from fragments. Dates, times, amounts and percents arrive pre-formatted from `Intl` (`{date}` = "Sat 7 Nov", `{time}` = "14:32", `{amount}` = "14,250").
**Reuse.** Rows marked **(Home)** are Home's settled strings, used verbatim. Their ids stay Home's (`home.*`, `sheet.*`, `toast.*`); they are listed here by reference only so the builder knows where they appear. Home's superseded ids stay ignored (see `home/decision.md`).
**Names.** `{name}` is a partner's first name. `{goalTitle}` is the goal's title as typed.

---

## Voice

Inherited from Home and the design system: **warm, plain, specific.** Sentence case, verbs first, plural "you", first names. No exclamation marks, no emoji in the interface. People may use emoji in their own notes.

| Adjective | This | Not that |
|---|---|---|
| Warm | "No notes yet. Write about this goal, or add a photo." | "Your journal is empty. Start journaling today!" |
| Plain | "Wedding fund goes back to 13,750 MAD of 20,000 MAD." | "This action will adjust the current balance of the goal." |
| Specific | "Youssef deleted Wedding fund." | "A goal was removed." |

**Tone by moment.**
- **Daily glance (list, detail summary):** short, quiet. Numbers do the talking. No sentences where a figure will do.
- **Success:** one calm line, past tense, names the thing. "Changes saved". "Goal reached." is reserved for a contribution landing (saffron); an edit that happens to complete a goal says "Changes saved. {goalTitle} is done." in an ordinary toast.
- **Offline or error:** what is true, what still works, what to do. No apology, no "Oops", no blame ("You entered..."). Say what is kept: "Your note stays here."
- **Destructive (confirm):** slower and exact. The title names the thing; the body states the consequence in figures; "You can't undo this." only when it is true (everything on this page except removing a draft block and undoing your own just-added contribution). Neutral, never scary. The safe button is first and focused.
- **Draft and queued moments:** reassure that nothing is lost, and say when it will be sent.
- **Partner news:** a fact, with the name first. "Youssef added 200 MAD to Wedding fund." No cheering.

**Honesty.** No confirmshaming ("Keep it" is the safe choice, not "No, I want to keep losing"), no urgency, no streaks. Nothing invented is presented as real: every example figure is labelled (see "Example data labels").

---

## Glossary

Home's glossary applies (goal, contribution, Saved together, partner, space, trip, shopping). Additions for this area:

| Term | Meaning | Never call it |
|---|---|---|
| goal | a savings target, money or percent | fund, pot, objective (the title "Wedding fund" is the couple's own word, not ours) |
| contribution | one amount added to a **money** goal | entry, deposit, payment, transaction (**"entry" never appears on screen**; it is the data-model word) |
| update | one new percent total on a **percent** goal ("Youssef moved it to 60%") | contribution, increment, check-in |
| History | the list of contributions (or updates) on one goal | Entries, Log, Transactions, Activity |
| Journal | the notes and photos on one goal | Diary, Feed, Timeline, Memories |
| note | one journal post, text and photos in order | post, memory, comment, entry |
| photo | an image in a note | picture, image, attachment |
| cover photo | the optional picture of a goal, shown in the arch | banner, thumbnail, header image |
| target | the amount a money goal is saving toward | goal amount, objective, budget |
| target date | the optional date a goal should be done by | deadline, due date |
| progress | how far along a goal is (amount or percent) | status, completion |
| type | money or percent, fixed at creation | kind, mode, category |
| done | a goal that reached its target (zellige badge) | complete, finished, achieved, closed ("Reached {date}" is the date line) |
| open | a goal not yet done | active, in progress, pending |
| Who put in what | each partner's share of a **money** goal | leaderboard, ranking, contributors |
| Stats | the folded figures under the share | analytics, insights, metrics |
| draft | text kept on this phone until it is sent | autosave, unsaved changes (except in the discard dialogs) |
| waiting to sync | a contribution queued offline (Home's badge) | pending, queued, unsent (on screen) |
| delete | remove for both of you, permanently | remove (reserved for queued items and draft blocks, which are not shared) |
| Back online | the connection returned | reconnected, connection restored |

Pronoun rule: "you two" when speaking to the couple, "you" for the signed-in person, partner's first name for the other. "Your partner" only when they haven't joined.

---

## Label decisions (the IA's working copy)

| IA proposal | Decision | Reason |
|---|---|---|
| **History** | **Confirm.** | Kind-neutral (contributions and percent updates), matches the design system's "See history", and "entries" is not a word the couple uses. Count labels spell out what is counted (see `goal.tabs.history.label.*`). |
| **Who put in what** | **Confirm for money goals. Replace for percent goals** with "Who updated it". | It is plain and says the brief's question in the couple's words. But nobody "puts in" a percent, so percent goals need their own heading. Flag for translators: it is idiomatic; translate by meaning ("Qui a mis combien" fits French). |
| **Add to this goal** | **Confirm** (money). Percent keeps Home's "Update progress". Done-goal ghost stays "Add more". | "this" tells you the sheet is already pointed at this goal (Home's "Add to a goal" asks which one). Expansion is fine (about 20 characters, wraps in the floating button). |
| **Write a note** | **Confirm.** | A verb that says what happens, same in the list of tools, the empty state and the done-goal primary. "Add photo" lives inside the composer, so "note" is the right unit. |
| **Add details** | **Replace with "Optional details".** | "Add details" doesn't say what is behind it, and it reads as an action that adds something now. The fields are a date, a description and a photo; their common trait is that they are optional, which is what someone deciding whether to open it needs. It is a disclosure, so a noun phrase is correct and `aria-expanded` carries the state. |
| **Delete contribution** | **Confirm** (money). Percent entries: "Delete update". Queued entries: "Remove". | Glossary-consistent and names the object. The confirm dialog's button is just "Delete" because its title already names the thing. |
| IA "Kind" | **Replace with "Type".** | "Kind" is an engineer's field name; "Type" reads naturally. |
| IA "marked done" in the completion preview | **Replace** with "will be done". | There is no "Mark as done" in this product (6.10): completion is computed, so the copy shouldn't suggest a manual action. |
| IA's shorter offline notices | **Not used.** Home's notice is reused verbatim, with one extra line on the detail. | Constraint: settled copy is not reworded. |

---

## Example data labels

Shown once per screen, as a footnote at the end of the page content, in caption style. Remove in production.

| id | String |
|---|---|
| `example.list` | Example data. The goals and amounts on this screen are made up. |
| `example.detail` | Example data. The contributions, notes, photos and stats on this screen are made up. |
| `example.form` | Example data. The values in this form are made up. |

Where a screen is shown with Home's two placeholder goals ("Paint the guest room", "Honeymoon"), the same label covers them.

---

## Screens

### Document titles (unique per state; `Page – Site`)

| id | String |
|---|---|
| `goals.title.list` | Goals – Zamane |
| `goals.title.list.empty` | No goals yet – Zamane |
| `goals.title.list.allDone` | All goals reached – Zamane |
| `goals.title.list.offline` | Goals (offline) – Zamane |
| `goals.title.list.error` | Can't load Goals – Zamane |
| `goals.title.loading` | Loading – Zamane |
| `goal.title.detail` | {goalTitle} – Zamane |
| `goal.title.offline` | {goalTitle} (offline) – Zamane |
| `goal.title.error` | Can't load goal – Zamane |
| `goal.title.notFound` | Goal not found – Zamane |
| `goal.title.deleted` | {goalTitle} was deleted – Zamane |
| `note.title.new` | New note: {goalTitle} – Zamane |
| `note.title.edit` | Edit note: {goalTitle} – Zamane |
| `form.title.create` | New goal – Zamane |
| `form.title.edit` | Edit {goalTitle} – Zamane |
| `form.title.notFound` | Goal not found – Zamane |

The sheets and confirmations are dialogs and don't change the title.

---

### 1. Goals list (`/goals`)

#### Header and summary
| id | String | Notes |
|---|---|---|
| `goals.list.heading` | Goals | h1 |
| `goals.list.summary.mixed` | {open, plural, one {# goal open} other {# goals open}} · {done} done · {amount} MAD saved together | **Counts format is Home's settled one** ("3 goals open · 1 done"), not the IA's "3 open · 1 done". Caption weight, not a link. Includes queued amounts. |
| `goals.list.summary.allDone` | {done, plural, one {# goal done} other {# goals done}} · {amount} MAD saved together | zero open, per Home: "4 goals done" |
| `goals.list.summary.onlyOpen` | {open, plural, one {# goal open} other {# goals open}} · {amount} MAD saved together | zero done: don't show "0 done" |

Three keys instead of one because "0 done" is noise and "0 goals open" is wrong in the all-done state; the app picks the key, nothing is joined.

#### Primary
| id | String | Notes |
|---|---|---|
| `goals.list.primary` | New goal | (Home: `home.allDone.action`) populated, all-done, stale, offline |
| `goals.list.primary.empty` | Create a goal | (Home: `home.empty.primary`) empty state only |

#### Sections
| id | String | Notes |
|---|---|---|
| `goals.list.open.heading` | Open goals | h2; visually hidden if the Art Director prefers |
| `goals.list.done.heading` | Done · {count} | h2, visible. The count is a number, not pluralised ("Done" is an adjective) |

#### Open card (whole card is one link)
| id | String | Notes |
|---|---|---|
| `goals.card.title` | {goalTitle} | h3 |
| `goals.card.progress.money` | {saved} MAD of {target} MAD | (Home: `home.goal.progress.money`) |
| `goals.card.progress.percent` | {percent}% | (Home: `home.goal.progress.percent`). The IA wireframe shows "60% complete"; Home's plain "60%" is used for consistency. See open item 4. |
| `goals.card.progress.over` | {saved} MAD of {target} MAD · {over} MAD over | only on open cards when over target cannot happen (an over-target goal is done); kept here for the done row's detail line, see below |
| `goals.card.attribution` | (Home: `home.goal.attribution`, `.noNote`, `.percent`, `.none`, `.pending`) | "Sara added 500 · 2 days ago", "Youssef moved it to 60% · yesterday", "No contributions yet", "Youssef added 200 MAD · waiting to sync" |
| `goals.card.by` | by {date} | right-aligned, neutral ink. Date format "Sat 12 Jun". **The year is added when it isn't the current year** ("by Sat 12 Jun 2027"), because today is Nov 2026. See open item 3. |
| `goals.card.datePassed` | Target date was {date} | neutral ink, never danger (danger means over budget) |
| `goals.card.pending.badge` | Waiting to sync | (Home: `home.goal.pending.badge`) |
| `goals.card.label.money` | {goalTitle}: {saved} MAD of {target} MAD, {percent}% | (Home: `home.goal.progress.label.money`) accessible name of the card link |
| `goals.card.label.percent` | {goalTitle}: {percent}% done | (Home: `home.goal.progress.label.percent`) |
| `goals.card.pending.label` | {amount} MAD waiting to sync | (Home: `home.goal.pending.label`) |

#### Done row (compact, also one link)
| id | String | Notes |
|---|---|---|
| `goals.done.badge` | Done | (Home: `home.goal.done.badge`) zellige badge |
| `goals.done.row.money` | {target} MAD · reached {date} · {name} | "6,000 MAD · reached Fri 30 Oct · Youssef" |
| `goals.done.row.percent` | Reached {date} · {name} | |
| `goals.done.row.over` | {saved} MAD of {target} MAD · {over} MAD over · reached {date} · {name} | over-target done goals; neutral ink |
| `goals.done.label` | {goalTitle}: done | (Home: `home.goal.done.label`) accessible name; reached info is read after it |

#### Empty
| id | String | Notes |
|---|---|---|
| `goals.list.empty.heading` | No goals yet. | |
| `goals.list.empty.body` | A goal is something you save for together. Give it a name and, for money, a target. | One sentence of why/what; the one action is the primary "Create a goal". No summary line. |

#### All-done
| id | String | Notes |
|---|---|---|
| `goals.list.allDone.heading` | All goals reached | (Home: `home.allDone.heading`) with a Done badge |
| `goals.list.allDone.body` | (Home: `home.allDone.body.one` / `.other`) | "You finished 4 goals together." |

The primary "New goal" is the only button; no second one in the prompt (Home's rule).

#### Loading
| id | String | Notes |
|---|---|---|
| `goals.list.loading.announce` | Loading goals | `role="status"`, visually hidden; skeletons `aria-hidden` |
| `goals.list.loading.busy` | Loading | (Home: `home.loading.busy.label`) |

#### Error (no cache)
| id | String | Notes |
|---|---|---|
| `goals.list.error.heading` | Goals didn't load | follows Home's "Home didn't load" |
| `goals.list.error.body` | Check your connection and try again. | (Home: `home.error.body`) |
| `goals.list.error.retry` | Try again | (Home: `home.error.retry`) |
| `goals.list.error.retrying` | Trying again | (Home: `home.error.retrying`) |
| `goals.list.error.announce` | Goals didn't load. Try again. | `role="alert"` |

#### Stale (refresh failed, cache shown)
| id | String | Notes |
|---|---|---|
| `goals.list.stale.notice` | Couldn't refresh. Showing the latest data on this phone. | slim notice |
| `goals.list.stale.retry` | Try again | |

#### Offline
| id | String | Notes |
|---|---|---|
| `goals.list.offline.notice` | (Home: `home.offline.notice`) | "You're offline. Showing the latest data on this phone. Adding to goals still works and syncs when you're back online." Verbatim. The IA's shorter variant is not used. |
| `goals.list.offline.announce` | (Home: `home.offline.announce`) | |
| `goals.list.online.announce` | (Home: `home.online.announce` / `.plain`) | |
| `goals.list.online.synced` | (Home: `home.online.synced.one` / `.other`, `home.online.syncFailed`) | |

New goal while offline opens the form as a draft; the reason is on the form (below).

#### Uploads disabled
No string. Covers fall back to the title's initial (decorative, `aria-hidden`).

#### Live updates (partner or other device; polite announcements, no toast)
| id | String | Notes |
|---|---|---|
| `goals.live.added.total` | (Home: `home.live.announce.total`) | "Youssef added 200 MAD. Saved together: 14,450 MAD." Reused: the list shows the total, so the total is the news. |
| `goals.live.added.goal` | {name} added {amount} MAD to {goalTitle}. | when the list is the screen and the goal needs naming; use this one on the list, Home's on Home |
| `goals.live.percent` | (Home: `home.live.announce.percent`) | |
| `goals.live.completed` | (Home: `home.live.announce.completed`) | card turns zellige in place |
| `goals.live.reopened` | {goalTitle} is open again. | a delete or edit un-completed a goal |
| `goals.live.created` | {name} created {goalTitle}. | appended at the end of Open |
| `goals.live.deleted` | {name} deleted {goalTitle}. | card removed; if it had focus, focus goes to the next card |
| `goals.live.removed` | (Home: `home.live.removed.announce`) | |
| `goals.live.edited` | {name} edited {goalTitle}. | title, date or cover changed |

#### After deleting a goal (arrive from Edit)
| id | String | Notes |
|---|---|---|
| `goals.deleted.toast` | {goalTitle} deleted | toast, no Undo. Focus on the h1; the toast is announced. |

---

### 2. Goal detail (`/goals/:id`)

#### Top bar and identity
| id | String | Notes |
|---|---|---|
| `goal.back` | Goals | visible text of the up-link ("‹ Goals"); the chevron mirrors in RTL |
| `goal.back.label` | Back to all goals | accessible name; contains the visible word (WCAG 2.5.3) |
| `goal.edit` | Edit | |
| `goal.edit.label` | Edit {goalTitle} | accessible name; contains "Edit" |
| `goal.heading` | {goalTitle} | h1 |
| `goal.by` | by {date} | (same as `goals.card.by`; year when not current) |
| `goal.datePassed` | Target date was {date} | neutral ink |
| `goal.description.more` | More | disclosure on a clamped description |
| `goal.description.less` | Less | |
| `goal.description.more.label` | Show the full description | |
| `goal.description.less.label` | Show less of the description | |
| `goal.done.badge` | Done | (Home: `home.goal.done.badge`) |

#### Progress
| id | String | Notes |
|---|---|---|
| `goal.progress.heading` | Progress | h2, visually hidden |
| `goal.progress.money` | {saved} MAD of {target} MAD | (Home) |
| `goal.progress.percent` | {percent}% | (Home) the big figure on a percent goal |
| `goal.progress.percentValue` | {percent}% | the bar's end label on money goals (71%) |
| `goal.progress.toGo` | {remaining} MAD to go | money, open |
| `goal.progress.over` | {saved} MAD of {target} MAD · {over} MAD over | over-target; neutral ink, never danger |
| `goal.progress.reached` | Reached {date} · {name} | done; from `completed_at/by` |
| `goal.progress.latest.percent` | (Home: `home.goal.attribution.percent`) | "Youssef moved it to 60% · yesterday" |
| `goal.progress.valuetext.money` | {saved} MAD of {target} MAD | `aria-valuetext` |
| `goal.progress.valuetext.percent` | {percent}% | |
| `goal.progress.label` | {goalTitle}: {saved} MAD of {target} MAD, {percent}% | (Home: `home.goal.progress.label.money`); percent: `.label.percent` |

#### Primary and secondary actions
| id | String | Notes |
|---|---|---|
| `goal.primary.money` | Add to this goal | floating on phones, masthead on wide; opens Home's sheet at step B, no "Change goal" |
| `goal.primary.percent` | Update progress | (Home: `sheet.submit.percent`) |
| `goal.primary.done` | Write a note | primary on a done goal (confirmed IA default) |
| `goal.addMore` | Add more | ghost button in the progress block, money goal, done |
| `goal.addMore.label` | Add more to {goalTitle} | accessible name |
| `goal.updateProgress.ghost` | Update progress | ghost, percent goal, done |

The sheet itself is Home's, verbatim, with one difference in the heading context: the subtitle `sheet.step.context` ("Adding to {goalTitle}") is the only goal label; heading `sheet.heading` ("Add to a goal"). Percent: "Update progress", `sheet.percent.helper` "Enter the new total, not the amount to add." (settled). Errors: `sheet.error.*` (Home). Toasts: `toast.added.money`, `toast.added.percent`, `toast.undo`, `toast.undone`, `toast.undone.percent`, `toast.queued.*`, `toast.completed.*` (all Home).

#### Who put in what
| id | String | Notes |
|---|---|---|
| `goal.share.heading.money` | Who put in what | h2 |
| `goal.share.heading.percent` | Who updated it | h2, percent goals |
| `goal.share.row.money` | {amount} MAD · {share}% | right side of each row; the name sits on the left beside the avatar |
| `goal.share.row.percent` | {count, plural, one {# update} other {# updates}} | |
| `goal.share.row.label.money` | {name}: {amount} MAD, {share}% of the total | accessible name of the row |
| `goal.share.row.label.percent` | {name}: {count, plural, one {# update} other {# updates}} | |
| `goal.share.solo` | Your partner hasn't joined yet. | (Home's phrase) one row plus this line |
| `goal.share.none.money` | No contributions yet | (Home: `home.goal.attribution.none`) replaces share and stats |
| `goal.share.none.percent` | No updates yet | replaces share and stats on a percent goal |

Slot order, never by amount: "Sara" first, "Youssef" second.

#### Stats
| id | String | Notes |
|---|---|---|
| `goal.stats.toggle` | Stats | disclosure button inside an h2, phones; `aria-expanded` |
| `goal.stats.label.count` | Contributions | |
| `goal.stats.label.average` | Average | |
| `goal.stats.label.largest` | Largest | |
| `goal.stats.label.month` | This month | |
| `goal.stats.label.last` | Last activity | |
| `goal.stats.label.updates` | Updates | percent goals |
| `goal.stats.value.money` | {amount} MAD | |
| `goal.stats.value.last` | {name}, {date} | "Sara, Sat 7 Nov" |
| `goal.stats.value.monthPercent` | {from}% → {to}% | the arrow mirrors in RTL; no entries this month: "No updates this month" |
| `goal.stats.monthPercent.none` | No updates this month | |
| `goal.stats.line.money` | {count, plural, one {# contribution} other {# contributions}} · average {average} MAD · largest {largest} MAD · this month {month} MAD · last activity {name}, {date} | wide screens, always visible. One key, translators may reorder. |
| `goal.stats.line.percent` | {count, plural, one {# update} other {# updates}} · this month {from}% → {to}% · last activity {name}, {date} | |
| `goal.stats.error` | Stats didn't load. | inside the fold |
| `goal.stats.retry` | Try again | |

Average and largest are hidden on percent goals.

#### Tabs (below 64 rem) and feed headings (from 64 rem)
| id | String | Notes |
|---|---|---|
| `goal.tabs.label` | History and journal | accessible name of the tablist |
| `goal.tabs.history` | History | visible tab text; the count sits in a badge beside it |
| `goal.tabs.journal` | Journal | |
| `goal.tabs.history.label.money` | History, {count, plural, one {# contribution} other {# contributions}} | accessible name |
| `goal.tabs.history.label.percent` | History, {count, plural, one {# update} other {# updates}} | |
| `goal.tabs.journal.label` | Journal, {count, plural, one {# note} other {# notes}} | |
| `goal.feed.history.heading` | History | h2: visible from 64 rem, hidden in the tab panel |
| `goal.feed.journal.heading` | Journal | |

Counts update silently. A tab's count is a number only; the polite announcement carries the news.

#### History
| id | String | Notes |
|---|---|---|
| `goal.history.month` | {month} · {total} MAD | h3 per month group. Month name from `Intl`. |
| `goal.history.month.percent` | {month} | percent goals: no total |
| `goal.history.row.money` | {name} added {amount} MAD | row line 1; the note sits on line 2, the date ("Sat 7 Nov") at the end |
| `goal.history.row.percent` | {name} moved it to {percent}% | |
| `goal.history.row.label.note` | {name} added {amount} MAD, {note}, {date} | accessible name of the row button (settled in IA 6.4) |
| `goal.history.row.label` | {name} added {amount} MAD, {date} | no note |
| `goal.history.row.label.percent` | {name} moved it to {percent}%, {date} | |
| `goal.history.row.pending` | Waiting to sync | (Home: `home.goal.pending.badge`) cloud-off icon beside it |
| `goal.history.row.just` | just now | (Home relative time) |
| `goal.history.more` | Show older | button |
| `goal.history.more.label` | Show older contributions | accessible name |
| `goal.history.more.loaded` | {count} more loaded. | polite; focus goes to the first new row |
| `goal.history.empty.money` | No contributions yet. Add the first one with Add to this goal. | no second button. If the primary's label changes, change this string with it. |
| `goal.history.empty.percent` | No updates yet. Add the first one with Update progress. | |
| `goal.history.error` | History didn't load. | in place |
| `goal.history.retry` | Try again | |
| `goal.history.notCached` | This isn't on this phone yet. It loads when you're back online. | offline, never opened |

#### Journal
| id | String | Notes |
|---|---|---|
| `goal.journal.write` | Write a note | secondary button; **hidden** while the primary is "Write a note" (done goal) |
| `goal.journal.note.heading` | {name} · {date} | h3 of each note `<article>` |
| `goal.journal.note.edit` | Edit | author only; the partner's notes show none |
| `goal.journal.note.edit.label` | Edit your note from {date} | accessible name |
| `goal.journal.note.readMore` | Read more | clamped at about 12 lines |
| `goal.journal.note.readLess` | Show less | |
| `goal.journal.photo.open.label` | View photo | accessible name of the photo button; opens the viewer |
| `goal.journal.photo.alt.default` | Photo from a note by {name}, {date} | used when no description was given. **Replaces** the IA's "Photo in Sara's note, Sat 7 Nov": the possessive can't be translated into French or Arabic without a rewrite. |
| `goal.journal.photo.unavailable` | Photo unavailable | placeholder when uploads are off (Q4) |
| `goal.journal.photo.offline` | Photo not available offline | placeholder when not cached |
| `goal.journal.more` | Show older notes | |
| `goal.journal.more.loaded` | {count, plural, one {# more note loaded.} other {# more notes loaded.}} | |
| `goal.journal.empty` | No notes yet. Write about this goal, or add a photo. | with **Write a note** (not shown on a done goal, where the primary is the same button) |
| `goal.journal.empty.noUploads` | No notes yet. Write the first one. | uploads off |
| `goal.journal.error` | The journal didn't load. | in place |
| `goal.journal.retry` | Try again | |
| `goal.journal.offline.write` | You're offline. You can write a note now and save it when you're back online. | helper under "Write a note" while offline |
| `goal.photoViewer.label` | Photo | dialog name |
| `goal.photoViewer.close` | Close | |

#### Offline (detail)
| id | String | Notes |
|---|---|---|
| `goal.offline.notice` | (Home: `home.offline.notice`) | verbatim |
| `goal.offline.notice.more` | Editing, deleting and saving notes need a connection. | second line. **Replaces** the IA's sentence "...and the journal need a connection": reading cached notes and writing a draft both work offline, so "the journal" overstated it. |
| `goal.offline.announce` | You're offline. Adding to this goal still works. | polite, once on change (Home's string with "this goal") |

#### Loading, error, not found, deleted
| id | String | Notes |
|---|---|---|
| `goal.loading.announce` | Loading goal | `role="status"` |
| `goal.error.heading` | This goal didn't load | no primary |
| `goal.error.body` | Check your connection and try again. | (Home) |
| `goal.error.retry` | Try again | |
| `goal.error.announce` | This goal didn't load. Try again. | `role="alert"` |
| `goal.notFound.heading` | This goal isn't here any more | |
| `goal.notFound.body` | It may have been deleted. | |
| `goal.notFound.action` | Back to Goals | |
| `goal.deleted.heading` | {name} deleted {goalTitle}. | partner deleted it while you're on it; swaps in place |
| `goal.deleted.body` | Its contributions and notes are gone too. | |
| `goal.deleted.action` | Back to Goals | takes focus |

#### Toasts (detail only; each has a polite announcement)
| id | String | Notes |
|---|---|---|
| (Home) | `toast.added.money`, `toast.added.percent`, `toast.undo`, `toast.undone`, `toast.undone.percent`, `toast.undoFailed`, `toast.queued.money`, `toast.queued.percent`, `toast.completed.title/body/queued`, `toast.dismiss.label` | verbatim: "Added 500 MAD to Wedding fund", "Goal reached.", "Removed 500 MAD from Wedding fund" |
| `goal.toast.entryDeleted.money` | Deleted {name}'s {amount} MAD from {goalTitle} | no Undo (there is no undelete) |
| `goal.toast.entryDeleted.percent` | Deleted {name}'s update from {goalTitle} | |
| `goal.toast.entryDeleted.reopened` | Deleted {name}'s {amount} MAD from {goalTitle}. It's open again. | when the delete un-completes the goal |
| `goal.toast.entryDeleted.reopened.percent` | Deleted {name}'s update from {goalTitle}. It's open again. | |
| `goal.toast.entryRemoved.queued` | (Home: `toast.undone`) | removing a queued add: "Removed 500 MAD from Wedding fund" |
| `goal.toast.entryDeleteFailed` | Couldn't delete this. Try again. | focus returns to the row |
| `goal.toast.syncRejected.money` | Couldn't add {amount} MAD. {goalTitle} was deleted. | the amount is named so it can be added elsewhere |
| `goal.toast.syncRejected.percent` | Couldn't set {goalTitle} to {percent}%. It was deleted. | |
| `goal.toast.noteDeleted` | Note deleted | |
| `goal.toast.reopened.percent` | (Home: `toast.added.percent`) | percent lowered from 100: "Paint the guest room is now at 80%". An ordinary toast with Undo, not saffron. |

#### Live updates on the detail (polite; never on load or my own acts)
| id | String | Notes |
|---|---|---|
| `goal.live.added.money` | {name} added {amount} MAD to {goalTitle}. | no toast; bar animates; row inserted at top |
| `goal.live.added.percent` | (Home: `home.live.announce.percent`) | "Youssef moved Paint the guest room to 60%." |
| `goal.live.completed` | (Home: `home.live.announce.completed`) | "Youssef reached Wedding fund." The primary changes in place to "Write a note" and keeps focus if it had it. |
| `goal.live.entryRemoved` | {name} removed a contribution from {goalTitle}. | |
| `goal.live.entryRemoved.percent` | {name} removed an update from {goalTitle}. | |
| `goal.live.edited` | {name} edited this goal. | |
| `goal.live.note` | {name} wrote a note. | |
| `goal.live.noteDeleted` | {name} deleted a note. | |
| `goal.live.reopened` | {goalTitle} is open again. | |

---

### 3. Entry sheet (dialog over the detail)

| id | String | Notes |
|---|---|---|
| `entry.heading.money` | Contribution | h2; focus lands here |
| `entry.heading.percent` | Update | |
| `entry.close.label` | Close | |
| `entry.summary.money` | {name} added {amount} MAD | |
| `entry.summary.percent` | {name} moved it to {percent}% | |
| `entry.datetime` | {date} at {time} | "Sat 7 Nov 2026 at 14:32"; 24-hour; full year here |
| `entry.queued` | Waiting to sync | (Home) replaces the time |
| `entry.note` | {note} | full note, never clamped |
| `entry.delete.money` | Delete contribution | danger, secondary weight |
| `entry.delete.percent` | Delete update | |
| `entry.remove.queued` | Remove | works offline |
| `entry.delete.offline` | Deleting needs a connection. | helper beside the `aria-disabled` button; announced on press |
| `entry.deleted.byPartner` | {name} deleted this contribution. | body swaps; **Close** takes focus |
| `entry.deleted.byPartner.percent` | {name} deleted this update. | |
| `entry.deleted.close` | Close | |

#### Confirm: delete a contribution (`alertdialog`; focus on "Keep it"; Esc = keep)
| id | String | Notes |
|---|---|---|
| `entry.confirm.title.money` | Delete {name}'s {amount} MAD? | labels the dialog |
| `entry.confirm.title.percent` | Delete {name}'s update to {percent}%? | |
| `entry.confirm.body.money` | {goalTitle} goes back to {saved} MAD of {target} MAD. | describes the dialog |
| `entry.confirm.body.percent.latest` | {goalTitle} goes back to {percent}%. | the entry is the latest |
| `entry.confirm.body.percent.older` | Progress stays at {percent}%. | the entry isn't the latest |
| `entry.confirm.reopens` | {goalTitle} will no longer be done. | added when the delete un-completes the goal |
| `entry.confirm.final` | You can't undo this. | last line, always |
| `entry.confirm.keep` | Keep it | safe, focused, first |
| `entry.confirm.delete` | Delete | danger |
| `entry.confirm.deleting` | Deleting… | `aria-disabled` while the call runs |

#### Confirm: remove a queued entry
| id | String | Notes |
|---|---|---|
| `entry.confirmQueued.title` | Remove this {amount} MAD? | |
| `entry.confirmQueued.body` | It hasn't synced yet, so {name} hasn't seen it. | `{name}` is the partner |
| `entry.confirmQueued.keep` | Keep it | |
| `entry.confirmQueued.remove` | Remove | |

---

### 4. Note composer (dialog, `?note=new|<id>`)

#### Chrome
| id | String | Notes |
|---|---|---|
| `note.heading.new` | New note | h2 |
| `note.heading.edit` | Edit note | |
| `note.subtitle` | {goalTitle} | |
| `note.close.label` | Close note | ✕; the dirty-guard applies |
| `note.text.label` | Note | label (visible or visually hidden) of the first block |
| `note.text.placeholder.first` | What do you want to remember? | a prompt, not a label |
| `note.text.placeholder.next` | Keep writing | text block after a photo |
| `note.text.label.n` | Note text, part {n} | accessible name for the 2nd and later text blocks |
| `note.counter` | {count} of {max} | only in the last 10% of the cap |
| `note.counter.label` | {remaining, plural, one {# character left} other {# characters left}} | accessible name |
| `note.limit.total` | This note is too long. Shorten it by {count, plural, one {# character} other {# characters}}. | the note-level cap (open Q2; default 20,000). **[VERIFY with the cap]** |

#### Tools and save
| id | String | Notes |
|---|---|---|
| `note.addPhoto` | Add photo | |
| `note.addPhoto.offline` | Photos need a connection. | `aria-disabled` reason |
| `note.addPhoto.max` | Up to 10 photos in a note. | `aria-disabled` reason (Q3 default) |
| `note.addPhoto.off` | Photos are turned off for now. | after `503 uploads_disabled`; the button then hides |
| `note.reorder` | Reorder | toggle, `aria-pressed`; shown only with two or more blocks and one photo |
| `note.reorder.done` | Done | the toggle in Reorder mode |
| `note.save.new` | Save note | primary; `aria-keyshortcuts="Control+Enter Meta+Enter"` |
| `note.save.edit` | Save changes | |
| `note.save.saving` | Saving… | `aria-disabled` |
| `note.save.waitingPhotos` | Saving after photos ({done} of {total}) | pressed while uploading; saves when they finish; Close still works |
| `note.save.empty` | Write something or add a photo first. | announced on press of the disabled Save |
| `note.save.empty.noUploads` | Write something first. | uploads off |
| `note.save.blocked.photos` | {count, plural, one {# photo didn't upload} other {# photos didn't upload}} | Save blocked reason |
| `note.save.offline` | You're offline. Your note stays here. Save it when you're back online. | `aria-disabled` reason |
| `note.save.online.announce` | Back online. You can save your note now. | polite, when Save re-enables |
| `note.saved.announce` | Note saved. | polite; focus on the new note's heading |
| `note.save.failed` | Couldn't save the note. Try again. | alert above the tools; everything kept |

#### Draft
| id | String | Notes |
|---|---|---|
| `note.draft.restored` | Draft restored. | above the blocks |
| `note.draft.discard` | Discard draft | |
| `note.draft.discard.label` | Discard the restored draft | accessible name |

#### Photo blocks
| id | String | Notes |
|---|---|---|
| `note.photo.label` | Photo {n} | group name for a photo block |
| `note.photo.uploading` | Uploading… | visible; the percentage (62%) is shown but not announced |
| `note.photo.cancel` | Cancel | |
| `note.photo.cancel.label` | Cancel upload of photo {n} | |
| `note.photo.uploading.announce` | Uploading photo. | polite |
| `note.photo.uploaded.announce` | Photo added. | polite |
| `note.photo.failed` | Didn't upload. | |
| `note.photo.failed.announce` | A photo didn't upload. | alert; focus goes to that block's Try again |
| `note.photo.retry` | Try again | |
| `note.photo.retry.label` | Try uploading photo {n} again | |
| `note.photo.remove` | Remove | visible text on the block; 44 px |
| `note.photo.remove.label` | Remove photo {n} | |
| `note.photo.describe` | Add a description | opens the field (Q1) |
| `note.photo.describe.label` | Photo description | |
| `note.photo.describe.helper` | Optional. Read aloud to people who can't see the photo. | |
| `note.photo.tooLarge` | {fileName} is over 10 MB. Choose a smaller photo. | in the tool bar; the photo isn't inserted |
| `note.photo.unsupported` | {fileName} isn't a supported photo. Use a JPEG, PNG or WebP file. | **[VERIFY accepted formats]** |
| `note.photo.rateLimited` | Too many photos at once. Try again in a minute. | |
| `note.photo.unavailable` | Photo unavailable | existing photo, uploads off; removable in edit |
| `note.photo.disabledMidSession` | Photos are turned off for now. | on pending blocks after a `503` |
| `note.removed.photo` | Removed photo | inline row, no timer |
| `note.removed.text` | Removed text | |
| `note.removed.undo` | Undo | |
| `note.removed.undo.label` | Undo: restore the removed photo | text variant: "Undo: restore the removed text" |

#### Reorder mode
| id | String | Notes |
|---|---|---|
| `note.reorder.help` | Move blocks up or down to change the order. | one line under the heading |
| `note.reorder.on.announce` | Reorder mode. Use Move up and Move down. | polite |
| `note.reorder.off.announce` | Back to writing. | |
| `note.reorder.row.text` | Text: {firstWords} | the photo row shows the thumbnail (`alt=""`) and the word "Photo" |
| `note.reorder.row.photo` | Photo | |
| `note.reorder.position` | {position} | row number, visible |
| `note.reorder.up` | Move up | visible text on wide; icon-only on phones, accessible name below |
| `note.reorder.down` | Move down | |
| `note.reorder.up.label` | {type, select, photo {Move photo {position} up} other {Move text {position} up}} | |
| `note.reorder.down.label` | {type, select, photo {Move photo {position} down} other {Move text {position} down}} | |
| `note.reorder.remove.label` | {type, select, photo {Remove photo {position}} other {Remove text {position}}} | |
| `note.reorder.moved.announce` | {type, select, photo {Photo moved to {position} of {total}.} other {Text moved to {position} of {total}.}} | polite |
| `note.reorder.atStart` | First in the note | reason on the `aria-disabled` Move up |
| `note.reorder.atEnd` | Last in the note | reason on the `aria-disabled` Move down |

#### Discard
| id | String | Notes |
|---|---|---|
| `note.discard.title` | Discard this note? | |
| `note.discard.body` | What you wrote and any photos you added will be lost. | |
| `note.discard.keep` | Keep writing | safe, focused |
| `note.discard.confirm` | Discard | danger |
| `note.discardEdit.title` | Discard your changes? | editing a saved note |
| `note.discardEdit.body` | Your changes to this note won't be saved. | |
| `note.discardEdit.keep` | Keep editing | |
| `note.discardEdit.confirm` | Discard | |

#### Delete a saved note (edit only; author only)
| id | String | Notes |
|---|---|---|
| `note.delete` | Delete note | danger, last in the composer |
| `note.delete.offline` | Deleting needs a connection. | `aria-disabled` reason |
| `note.delete.confirm.title` | Delete this note? | |
| `note.delete.confirm.body` | {photos, plural, =0 {You can't undo this.} one {Its # photo is deleted too. You can't undo this.} other {Its # photos are deleted too. You can't undo this.}} | |
| `note.delete.confirm.keep` | Keep note | safe, focused |
| `note.delete.confirm.delete` | Delete note | |
| `note.delete.failed` | Couldn't delete the note. Try again. | |

#### Conflict (409) and not found (404) when editing
| id | String | Notes |
|---|---|---|
| `note.conflict.title` | This note changed on your other device. | alert; focus here |
| `note.conflict.body` | Keep yours to replace it, or load the latest version. | |
| `note.conflict.keep` | Keep mine | saves over it |
| `note.conflict.load` | Load the latest | opens the confirm below first |
| `note.conflict.see` | See the latest version | disclosure; shows the latest note read-only |
| `note.conflict.confirm.title` | Replace your edits with the latest version? | |
| `note.conflict.confirm.body` | Your unsaved changes to this note will be lost. | |
| `note.conflict.confirm.keep` | Keep my edits | safe, focused |
| `note.conflict.confirm.load` | Load the latest | |
| `note.missing.title` | This note was deleted on your other device. | |
| `note.missing.copy` | Copy text | |
| `note.missing.close` | Close | |
| `note.copy.done` | Text copied | polite |
| `note.copy.failed` | Couldn't copy. Select the text and copy it by hand. | (Home's wording pattern) |

#### Goal deleted while writing
| id | String | Notes |
|---|---|---|
| `note.goalDeleted` | {name} deleted {goalTitle}. This note can't be saved. | banner; Save is hidden |
| `note.goalDeleted.copy` | Copy text | |
| `note.goalDeleted.close` | Close | |

---

### 5. Create goal (`/goals/new`)

#### Chrome
| id | String | Notes |
|---|---|---|
| `form.create.heading` | New goal | h1; labels the form |
| `form.cancel` | Cancel | task header on phones (✕ icon plus the word); after the submit on wide screens |
| `form.create.submit` | Create goal | primary |
| `form.create.submit.pending` | Creating… | `aria-disabled` |
| `form.create.submit.waitingCover` | Creating after the photo… | cover still uploading |
| `form.create.submit.offline` | You're offline. You can create the goal when you're back online. What you've typed stays here. | reason beside the `aria-disabled` primary |
| `form.create.online.announce` | Back online. You can create the goal now. | polite |
| `form.create.created.announce` | Goal created. | polite, on arriving at the detail |
| `form.create.failed` | Couldn't create the goal. Try again. | alert at the top; fields kept |

#### Fields
| id | String | Notes |
|---|---|---|
| `form.title.label` | Title | required; focused on open |
| `form.title.helper` | For example, Wedding fund or New sofa | |
| `form.type.legend` | Type | fieldset legend |
| `form.type.money` | Money | |
| `form.type.percent` | Percent | |
| `form.type.money.helper` | Save toward an amount of money. | follows the choice |
| `form.type.percent.helper` | Track progress from 0 to 100%. | follows the choice |
| `form.type.fixed` | You can't change this later. | always shown with the helper |
| `form.target.label` | Target | required for money; suffix "MAD" |
| `form.target.label.full` | Target amount in MAD | accessible name (matches Home's `sheet.amount.label.full` pattern) |
| `form.target.helper` | For example 20000 or 20 000 | `inputmode="decimal"`; "20,000" also parses |
| `form.details.toggle` | Optional details | disclosure (replaces "Add details"); closed on create, open on edit |
| `form.date.label` | Target date | |
| `form.date.helper` | Optional. | |
| `form.date.passed` | This date has passed. | helper; allowed, not an error |
| `form.description.label` | Description | |
| `form.description.helper` | Optional. What is this goal for? | |
| `form.description.counter` | {count} of {max} | only near the cap (about 4,000) |
| `form.cover.label` | Cover photo | hidden when uploads are off |
| `form.cover.helper` | Shown on the goal's card. Without one, the first letter of the title is used. | |
| `form.cover.add` | Add a cover photo | |
| `form.cover.replace` | Replace | accessible name: "Replace cover photo" |
| `form.cover.remove` | Remove | accessible name: "Remove cover photo" |
| `form.cover.replace.label` | Replace cover photo | |
| `form.cover.remove.label` | Remove cover photo | |
| `form.cover.uploading` | Uploading photo… | |
| `form.cover.uploading.announce` | Uploading photo. | |
| `form.cover.uploaded.announce` | Photo added. | |
| `form.cover.failed` | The photo didn't upload. Try again or remove it. | alert at the field; focus here; Create blocked |
| `form.cover.retry` | Try again | |
| `form.cover.offline` | Photos need a connection. | `aria-disabled` reason |
| `form.cover.unsupported` | {fileName} isn't a supported photo. Use a JPEG, PNG or WebP file. | **[VERIFY]** |
| `form.cover.tooLarge` | {fileName} is over 10 MB. Choose a smaller photo. | |
| `form.cover.rateLimited` | Too many photos at once. Try again in a minute. | |
| `form.cover.off` | Photos are turned off for now. | after a mid-session `503`; the control hides |

#### Errors (under the field, `aria-invalid`, linked by `aria-describedby`, focus on the first; input kept; validate on blur only after typing; clear as soon as valid)
| id | String |
|---|---|
| `form.error.title.empty` | Enter a title for the goal. |
| `form.error.title.tooLong` | Use {max} characters or fewer for the title. **[VERIFY max]** |
| `form.error.target.empty` | Enter a target amount, for example 20000. |
| `form.error.target.zero` | Enter a target greater than 0. |
| `form.error.target.format` | Use numbers only, for example 20000 or 20000,50. |
| `form.error.target.tooLarge` | That amount is too large. Enter {max} MAD or less. **[VERIFY cap]** |
| `form.error.date.invalid` | Enter a valid date. |
| `form.error.description.tooLong` | Use {max} characters or fewer for the description. |

#### Draft and discard
| id | String | Notes |
|---|---|---|
| `form.draft.restored` | Draft restored. | |
| `form.draft.discard` | Discard draft | |
| `form.createDiscard.title` | Discard this goal? | only if there's input |
| `form.createDiscard.body` | What you've typed will be lost. | |
| `form.createDiscard.keep` | Keep editing | safe, focused |
| `form.createDiscard.confirm` | Discard | |

---

### 6. Edit goal (`/goals/:id/edit`)

#### Chrome
| id | String | Notes |
|---|---|---|
| `form.edit.heading` | Edit goal | h1 |
| `form.edit.submit` | Save changes | |
| `form.edit.submit.pending` | Saving… | |
| `form.edit.submit.offline` | You're offline. You can save your changes when you're back online. What you've changed stays here. | |
| `form.edit.online.announce` | Back online. You can save your changes now. | |
| `form.edit.failed` | Couldn't save the changes. Try again. | alert at the top |
| `form.edit.saved` | Changes saved | toast on the detail; also the polite announcement |
| `form.edit.saved.reopened` | Changes saved. {goalTitle} is open again. | ordinary toast, not saffron |
| `form.edit.saved.completed` | Changes saved. {goalTitle} is done. | ordinary toast, not saffron |
| `form.type.readonly.money` | Money goal. The type can't be changed. | replaces the radio group |
| `form.type.readonly.percent` | Percent goal. The type can't be changed. | |
| `form.editDiscard.title` | Discard your changes? | |
| `form.editDiscard.body` | Your changes to {goalTitle} won't be saved. | |
| `form.editDiscard.keep` | Keep editing | |
| `form.editDiscard.confirm` | Discard | |
| `form.cover.restoreNote` | The cover changes when you save. Cancel keeps the current one. | helper under Replace or Remove |

All field labels, helpers and errors are the create form's.

#### Completion preview (under Target, before saving; polite)
| id | String |
|---|---|
| `form.preview.willBeDone` | {goalTitle} will be done: {saved} MAD is already saved. |
| `form.preview.willReopen` | {goalTitle} will no longer be done. |

#### Partner changed it, or a 409 (merge, IA 6.7)
`{actor}` is `partner` (a first name), `self` (the same person on another device) or `other` (unknown, socket down).

| id | String | Notes |
|---|---|---|
| `form.merge.notice` | {actor, select, partner {{name} changed this goal while you were editing. Check the marked fields, then save again.} self {This goal changed on your other device while you were editing. Check the marked fields, then save again.} other {This goal changed on another phone while you were editing. Check the marked fields, then save again.}} | `role="status"`; after a 409 focus goes here |
| `form.merge.changedBy` | {actor, select, partner {Changed by {name}} self {Changed on your other device} other {Changed on another phone}} | caption under a field where only they changed it |
| `form.merge.conflict` | {actor, select, partner {{name} changed this to "{value}".} self {Your other device changed this to "{value}".} other {Another phone changed this to "{value}".}} | both changed, differently; yours is kept |
| `form.merge.conflict.cover` | {actor, select, partner {{name} changed the cover photo.} self {Your other device changed the cover photo.} other {Another phone changed the cover photo.}} | covers can't be quoted |
| `form.merge.useTheirs` | Use theirs | button; accessible name: "Use their version of {fieldLabel}" |
| `form.merge.useTheirs.label` | Use their version of {fieldLabel} | |
| `form.merge.emptyValue` | (empty) | when their value is blank, in the quote slot |
| `form.merge.resolved.announce` | Their version is in the field. | polite, after Use theirs |

The silent retry (nothing editable differs) shows nothing.

#### Goal deleted while editing (404)
| id | String | Notes |
|---|---|---|
| `form.notFound.heading` | This goal was deleted. Your changes weren't saved. | |
| `form.notFound.action` | Back to Goals | |

#### Delete goal
| id | String | Notes |
|---|---|---|
| `form.delete` | Delete goal | danger, last, set apart |
| `form.delete.offline` | Deleting needs a connection. | `aria-disabled` reason |
| `form.delete.confirm.title` | Delete {goalTitle}? | |
| `form.delete.confirm.body.money` | This deletes its {entries, plural, one {# contribution} other {# contributions}} ({amount} MAD), {notes, plural, one {# note} other {# notes}} and {photos, plural, one {# photo} other {# photos}}, for both of you. You can't undo this. | photos include the cover |
| `form.delete.confirm.body.percent` | This deletes its {entries, plural, one {# update} other {# updates}}, {notes, plural, one {# note} other {# notes}} and {photos, plural, one {# photo} other {# photos}}, for both of you. You can't undo this. | |
| `form.delete.confirm.body.empty` | This deletes the goal for both of you. You can't undo this. | no entries, notes or photos |
| `form.delete.confirm.keep` | Keep goal | safe, focused |
| `form.delete.confirm.delete` | Delete goal | |
| `form.delete.confirm.deleting` | Deleting… | |
| `form.delete.failed` | Couldn't delete the goal. Try again. | alert; stays in Edit |

---

## System messages (summary by failure)

| Situation | String id | Where |
|---|---|---|
| List load failed, no cache | `goals.list.error.*` | inline, replaces the list |
| Refresh failed, cache shown | `goals.list.stale.notice` | slim notice |
| Goal load failed | `goal.error.*` | inline |
| One section failed | `goal.history.error`, `goal.journal.error`, `goal.stats.error` (each with Try again) | in place |
| Goal 404 | `goal.notFound.*` | inline |
| Offline | Home's notice (+ `goal.offline.notice.more` on the detail) | slim notice |
| Not on this phone | `goal.history.notCached` | in the feed |
| Deleting offline | `entry.delete.offline`, `note.delete.offline`, `form.delete.offline` | beside the control; announced on press |
| Uploads offline | `note.addPhoto.offline`, `form.cover.offline` | beside the control |
| Uploads off (config) | no strings; controls absent. Journal empty uses `goal.journal.empty.noUploads`. | |
| Uploads off mid-session | `note.addPhoto.off`, `form.cover.off`, `note.photo.disabledMidSession` | |
| Network or server error on save | `note.save.failed`, `form.create.failed`, `form.edit.failed`, `goal.toast.entryDeleteFailed`, `form.delete.failed`, `note.delete.failed` | next to the action; input kept |
| Partner deleted the thing | `goal.deleted.*`, `entry.deleted.byPartner`, `note.goalDeleted`, `form.notFound.*` | in place |
| Concurrent edit | `note.conflict.*`, `form.merge.*` | |
| Queued add rejected | `goal.toast.syncRejected.*` | toast |

Pressing any `aria-disabled` control does nothing except show and announce its reason (6.8). Reasons are the strings above; they are never "disabled" or "unavailable" alone.

### Shared generic strings
| id | String |
|---|---|
| `common.tryAgain` | Try again |
| `common.tryingAgain` | Trying again |
| `common.close` | Close |
| `common.cancel` | Cancel |
| `common.undo` | Undo |
| `common.dismiss` | Dismiss |
| `common.backToGoals` | Back to Goals |

---

## Accessibility strings

Screen-reader-only (`sr-only`), `aria-label`, and live-region text. Strings already given with a `.label` or `.announce` suffix above belong here too; they are not repeated.

| id | String | Where |
|---|---|---|
| `a11y.goals.list.region` | Goals | `<main>` landmark if the h1 isn't enough |
| `a11y.goals.open.heading` | Open goals | h2, hidden |
| `a11y.goal.progress.heading` | Progress | h2, hidden |
| `a11y.goal.history.heading.panel` | History | h2 inside the tab panel below 64 rem, hidden |
| `a11y.goal.journal.heading.panel` | Journal | same |
| `a11y.goal.stats.heading` | Stats | the h2 wrapping the disclosure |
| `a11y.goal.note.article` | Note by {name}, {date} | `aria-label` on each `<article>` if the h3 isn't linked |
| `a11y.cover.alt` | (empty) | covers are decorative: the title is beside them. `alt=""` |
| `a11y.photo.alt.default` | Photo from a note by {name}, {date} | journal photo with no description |
| `a11y.photo.alt.described` | {description} | journal photo with a description |
| `a11y.photo.thumb` | (empty) | reorder thumbnails and viewer thumbnails, decorative next to the word "Photo" |
| `a11y.avatar` | {name} | standalone PartnerAvatar in rows; initials `aria-hidden` |
| `a11y.progress.done` | {goalTitle}: complete | (Home) |
| `a11y.progress.over` | {goalTitle}: {saved} MAD of {target} MAD, {over} MAD over | |
| `a11y.pending.icon` | Waiting to sync | cloud-off icon (Home) |
| `a11y.offline.icon` | Offline | (Home) |
| `a11y.icon.close` | Close | ✕ icons |
| `a11y.icon.back` | — | the chevron is decorative; the link has `goal.back.label` |
| `a11y.icon.moveUp` / `.moveDown` / `.remove` | see `note.reorder.*.label` | |
| `a11y.tab.panel.history` | History | `aria-labelledby` the tab |
| `a11y.stats.toggle.label` | Stats | `aria-expanded` carries open or closed |
| `a11y.reorder.toggle` | Reorder | `aria-pressed` carries on or off |
| `a11y.live.region.name` | Updates | (Home) page region, polite |
| `a11y.live.dialog.name` | Updates | each dialog's own region |
| `a11y.live.entryAdded.mine` | — | no announcement for my own acts, except the confirmations below |
| `a11y.live.goalCreated` | Goal created. | after create (`form.create.created.announce`) |
| `a11y.live.noteSaved` | Note saved. | |
| `a11y.live.changesSaved` | Changes saved | toast text is the announcement |
| `a11y.live.undoNext` | Undo is the next button. | (Home) after a toast with Undo |
| `a11y.live.moreLoaded` | {count} more loaded. | after Show older |
| `a11y.live.online` | (Home: `home.online.announce`) | |
| `a11y.live.offline` | (Home: `home.offline.announce`; detail: `goal.offline.announce`) | |
| `a11y.live.noteSaveOnline` | Back online. You can save your note now. | |
| `a11y.live.formOnline` | Back online. You can create the goal now. / You can save your changes now. | |
| `a11y.live.disabledReason` | (the control's own reason string) | announced once on press of an `aria-disabled` control |
| `a11y.dialog.entry` | Contribution | dialog name; percent: "Update" |
| `a11y.dialog.composer` | New note: {goalTitle} / Edit note: {goalTitle} | |
| `a11y.dialog.confirm` | (the question) | `aria-labelledby`; the consequence is `aria-describedby` |
| `a11y.field.required` | required | via the `required` attribute, not text; the visual asterisk is `aria-hidden` |

Amounts and percents inside RTL text are wrapped `dir="ltr"`.

---

## i18n notes (French, Arabic and RTL; Dutch and German for length)

- **Keys, not sentences.** Every sentence above is one key. Counts are ICU. Where two nouns are counted together (`form.delete.confirm.body.*`) the plural arguments are separate, so each language inflects each noun.
- **Pluralisation.** French treats 0 as singular. Arabic needs zero/one/two/few/many/other: the ICU strings will be extended at translation time; every plural key above already has the structure to receive them.
- **Possessives** ("Delete Sara's 500 MAD?", "{name}'s update") don't survive French or Arabic. The whole string is one key, so translators will rewrite to "Supprimer les 500 MAD de Sara ?" and so on. Don't build them in code.
- **Verb gender.** "Sara added", "Youssef deleted": French and Arabic verbs may agree with the name's gender, which is unknown. Translate to the neutral form ("500 MAD ajoutés par Sara"). That's why the structure is "{name} added {amount}" as one key.
- **Dual.** "you two" and "both of you" take the Arabic dual. Translate by meaning.
- **"Who put in what"** is idiomatic: translate by meaning, not word by word.
- **"Done" / "open"** are adjectives that agree with "goals" in French and Arabic (`{done} terminés`). `goals.list.summary.*` is one key per form for that reason.
- **RTL.** Mirror: the "‹" back chevron, the "→" in "40% → 60%", the stepper order, tab order and arrow-key direction (6.4), the floating button's side (`inset-inline-end`), the reorder up/down are vertical and don't mirror. Don't mirror the progress bar's fill direction beyond the system's own rule. Amounts, percents, "MAD", times and the invite-style tokens stay LTR (`dir="ltr"`); "·" separators are fine in both. Never put a sentence inside an `ltr` wrapper.
- **Dates.** "Sat 7 Nov" comes from `Intl.DateTimeFormat` with the locale's order; the year is added only when it differs from the current year. "{date} at {time}" is one key because the joining word and order vary. Times are 24-hour in every locale.
- **Currency.** "14,250 MAD" is `Intl.NumberFormat` with the space's currency; in Arabic the formatter may give "14٬250 د.م." and move the currency; the key keeps `{amount} MAD` as one unit only where the formatter's output has no currency, so pass the whole formatted money string for non-Latin locales. Open item 6.
- **Expansion.** Budget 30 to 40% on buttons and tab labels. Longest risks: "Saving after photos ({done} of {total})" (about 40 characters, wraps inside the composer bar), "Creating after the photo…", the offline reasons next to `aria-disabled` buttons (up to about 110 characters: they sit under the button, not inside it), "Add to this goal" in the 56 px floating button (wraps to two lines or the button grows; it doesn't truncate), and the tab labels (counts are in a badge, so a long word doesn't push the count off at 320 px; "Historique" and "Journal" fit two to a row).
- **No text in images.** The arch's initial is rendered text, `aria-hidden`.
- **Emoji.** None in the interface. People's notes may contain them; the composer neither adds nor strips them.

---

## Open items

1. **Home's toast duration.** Home's `copy.md` says 6 s; the IA and the build use 10 s (and WCAG 2.2.1 needs the pause on focus). Home's copy file should be corrected; nothing here depends on it.
2. **Home's "Add to a goal" versus "Add to this goal".** Intentional (this goal is already chosen). If Home's sheet gets the context line "Adding to {goalTitle}" in the detail, no change is needed.
3. **Year in dates.** Home's rule is "Mon 9 Nov". Dates in another year need the year or they mislead ("by Sat 12 Jun" is next year). This copy adds the year when it isn't the current one, on cards and the detail. Home's trip dates have the same risk. Please confirm as a shared rule.
4. **"60%" versus "60% complete"** on percent cards. Home's plain "60%" was used. If the Art Director finds a bare percent ambiguous beside a bar, "60% complete" is a one-key change on both screens.
5. **Offline notice on the detail** is Home's verbatim plus a second line, not the IA's adapted sentence. If the Director prefers one sentence, it needs a new string; Home's wasn't reworded.
6. **Money in Arabic.** `{amount} MAD` assumes a Latin-script formatter. Decide whether Arabic shows "MAD" or "د.م." and whether the currency moves; this affects every amount key and should be settled before translation.
7. **Values to verify with the architecture:** title and description maximum lengths, the amount cap, accepted photo formats (JPEG, PNG, WebP assumed), the 10 MB and 10 photo limits, and the note-level character cap (Q2 default 20,000). All marked **[VERIFY]**.
8. **Photo description (Q1).** `note.photo.describe*` assume Q1 is accepted. If not, remove the three keys; the generated alt is used.
9. **"Kind" to "Type".** The IA and the architecture say "kind". The copy uses "type" on screen only; code and routes keep their names.
10. **Delete goal photo count** includes the cover and journal photos; confirm with the architecture that the count is available at confirm time (otherwise use `form.delete.confirm.body.*` without the photo clause).
11. **The Undo toast's accessible name** for a percent goal (`toast.undo.label` is money-only in Home). Needs a percent variant: "Undo: set {goalTitle} back to {percent}%".
