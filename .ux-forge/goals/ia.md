# Structure & skeleton: Zamane Goals (list, goal detail, create/edit)

**By:** Information Architect · **For:** Director, Writer, Art Director, front-end engineers · Mon 9 Nov 2026
**Read:** `brief.md`. From `ARCHITECTURE.md`: §1, §4 (goals, goal_entries, goal_notes, goal_note_blocks, §4.3 derived values), §5 (goal endpoints, write semantics, 409), §8 (images, disabled mode) and §9 (offline). The design system. From `.ux-forge/home/`: `ia.md`, `decision.md`, `build-notes.md`, `copy.md`, `home.html` and `reviews/accessibility.md`. From `.ux-forge/nav-bar/`: `brief.md` and `build-notes.md`. There is no `research.md`.
**Not read:** the kit (`protocol.md`, `principles.md`, `accessibility.md`, `styles.md`) is outside the folders this session can read. Laws are cited by name and WCAG by success criterion.
**Copy:** the strings below are working copy. The Writer owns the final wording, and Home's `copy.md` glossary applies: goal, contribution, partner, "you two".

**Breakpoints are the same as Home's:**
- **phone** < 48 rem: bottom nav, floating primary;
- **tablet** 48–64 rem: top bar, primary in the masthead, one column;
- **wide** ≥ 64 rem: masthead line, columns.

---

## 0. Structural decisions

### D1 · List: order and grouping
**Decision:**
- **Two sections, Open then Done.**
  - **Open:** closest to done first. This is Home's rule: progress ÷ target, and percent ÷ 100 for percent goals. Ties go to the most recent activity.
  - **Done:** compact rows, the most recently reached first.
- **No filter, sort or search control in v1.**
- **Live changes update a card in place and never move it while the list is on screen.** The order is recomputed when the route is entered or the app returns to the foreground.

**Why:**
- **Continuity with Home.** Home's "See all" and "Saved together" both land here. The first three open cards are then exactly Home's three "Closest to done", so the list reads as Home's list continued. [Jakob (internal consistency), serial position]
- **A stable order.** Closeness changes only when money lands, so the order is stable enough to learn. "Recent activity first" would reshuffle on every contribution. [spatial memory]
- **Open goals first.** They are what you act on [goal-gradient]. Done goals stay visible as the couple's record, but lighter. [Von Restorff]
- **No reorder under the thumb.** A card that moves under a thumb causes a mis-tap. [Fitts; the spirit of WCAG 3.2.2]
- **New goals don't shift the list.** They start at 0%, so they land at the end of Open, and a partner's new goal shifts nothing above it.
- **No controls.** A couple has a handful of goals, and controls would cost more than they save. [Hick, Miller] Revisit at about 20 goals.

### D2 · Should the list repeat Home's total? Yes, once, demoted
**Decision:** one summary line under the h1: "3 open · 1 done · 20,250 MAD saved together".
- It's set in body or caption weight, never the 32 px numeral, and it's not a link.
- It counts queued offline entries, as Home does.

**Why:**
- **It confirms the number you tapped.** Home's total is a link to this screen, so the destination must confirm that number [information scent], and the cards below are its breakdown. [DS: "Numbers are earned, not typed"]
- **One emphasis per screen.** The numeral stays Home's; the hero here is the list. [Von Restorff; DS "Total saved leads" is a Home rule]

### D3 · Detail: a fixed summary, then two feeds. History and Journal are tabs below 64 rem and side-by-side columns from 64 rem. Stats is not a tab.
**Decision:**
- **The summary always shows first:** the goal's identity, its progress and "Who put in what" (each partner's share).
- **Below 64 rem, two tabs.** History · Journal. History is selected by default, and the tab is kept in `?view=history|journal`. Switching tabs replaces the history entry instead of pushing one.
- **From 64 rem, columns.** Both feeds sit side by side, each with its own h2, and the tabs go away.
- **Stats:**
  - below 64 rem, a disclosure under the share, closed by default and remembered on the device;
  - from 64 rem, an always-visible summary line.

**Why:**
- **The two feeds are unbounded and unlike each other.** History can be hundreds of one-line rows; the journal is tall photo notes. In one scroll, either the journal sits under the whole history, or both get truncated behind "Show all" buttons. [Krug]
- **The history sits directly under the number.** History is the default, so the rows that make up the number are right below it at zero taps. [DS principle]
- **Live progress stays visible.** Progress and the share sit above the tabs, so a partner's contribution shows whichever tab is open.
- **Stats aren't a feed.** They're numbers derived from history. As a tab they would hide "who put in what", the brief's second question. So the share is promoted out of stats and always visible. The remaining figures (count, average, largest, this month, last activity) are curiosity, so they fold. [Hick; one big number per view]
- **Two tabs fit.** Two tabs, not three, keep room for counts in the labels at 320 px.
- **Wide screens have room for both feeds.** Hiding one would waste the width (the principle behind Home's critic finding F6). Trips will need the same tabs-to-columns pattern for plan, places and prep.
- **Label proposal:** "History", not "Entries". It's kind-neutral (money contributions and percent updates) and matches the design system's "See history" button. The Writer confirms.

### D4 · Detail: the primary action
**Decision:**
- **The floating primary** reads "Add to this goal" for money goals and "Update progress" for percent goals (on wide screens it sits in the masthead). It opens **Home's quick-add sheet at step B**, with this goal pre-picked and no "Change goal" link. There is no second add flow.
- **On a done goal**, the primary becomes **"Write a note"**. Adding stays one tap away as a ghost button in the progress block: "Add more" (money) or "Update progress" (percent).
- **Loading, error and not-found** states have no primary, as on Home.

**Why:**
- **Home's precedent.** Home stops offering "Add to a goal" once goals are reached (all-done shows "New goal").
- **The peak-end rule.** After "Goal reached." the natural next act is to record it (a photo of the new sofa), and focus lands on that button.
- **One primary per view.** [DS Button; Hick]
- **Nothing is blocked.** The data model allows adding past the target and lowering a percent, so neither is taken away.

### D5 · Deleting an entry: tap the row, then confirm. No swipe in v1.
**Decision:**
1. Tapping a history row opens the **entry sheet**: who, amount or percent, the full date and time, and the full note.
2. "Delete contribution" opens a **confirmation** that states the consequence: the new progress, and "will no longer be done" when the delete un-completes the goal.

There is no Undo toast for this delete. The just-added toast keeps its Undo, unchanged from Home.

**Why confirm, not undo:**
- **The design system is binding:** "Danger … always confirmed". Its danger swatch names "delete a contribution".
- **The API has no undelete.** Re-creating an entry would get a new `created_at`, and a re-completion would rewrite `completed_at/by`. That would falsify "who did what, always".
- **The data is shared.** You may be deleting your partner's contribution, and the goal can become not-done.
- **A confirmation isn't timed.** [WCAG 2.2.1]
- **Undo of your own add, seconds after making it, is a different act.** That's Home's settled pattern.

**Why no swipe:**
- **Deleting is rare.** Swipe-to-delete is invisible, and it collides with the iOS edge-swipe back and Android's back gesture.
- **One path for everyone.** The row tap is a single path for touch, mouse, keyboard and switch users. With no drag there's nothing to provide an alternative for. [WCAG 2.5.7, 2.5.1]
- **If swipe is ever added**, it may only reveal the same Delete button. It never deletes on a full swipe, and the tap path stays.

### D6 · Journal note composer
**Decision:**
- **Where it opens:** a **dialog backed by the URL** (`?note=new` or `?note=<noteId>`, pushed). It's full screen on phones and a centred dialog of about 40 rem from 48 rem.
- **Writing:** it opens with **one text block, focused**.
- **Adding photos:**
  - **"Add photo"** inserts at the caret, so a text block is split there.
  - Every photo is followed by a text block, empty if there's nothing after it.
  - Empty text blocks are dropped when the note is saved.
- **Reordering** is an explicit **Reorder mode**. Blocks collapse into compact rows with **Move up**, **Move down** and **Remove** buttons. There is no drag.
- **Undo versus confirm:**
  - Removing a block from an unsaved draft uses an **inline Undo** in place of the block, with no timer and no confirmation, because nothing is shared yet.
  - **Deleting a saved note is confirmed.**
  - Backspace never removes a photo.
- **Authorship:** a note can be edited or deleted only by its author. The partner's notes show no Edit.
- **With uploads disabled:** there's no "Add photo" and no "Reorder". The composer is a single text block.

**Why:**
- **The URL and Back.** With the URL, Back closes the composer behind the discard guard, a reload restores it, and the detail stays underneath, with Goals still current in the nav.
- **Quick capture.** The text field is focused when the composer opens. [DS principle]
- **Insert at the caret.** That's how every editor works. [Jakob]
- **Reorder mode:**
  - it keeps writing mode calm, with no per-paragraph CMS toolbars;
  - it shrinks long paragraphs, so a photo can move past them in one tap per step;
  - it gives 44 px single-pointer targets. [WCAG 2.5.7, 2.5.8]
- **Authorship.** There's no `edited_by` column, so a partner's edit would still show the author's name. Author-only editing keeps attribution true. [DS "Who did what, always"] It's reversible if the user wants shared editing.

### D7 · The create form, the edit form, and phone chrome
**Decision:**
- **Create** is one page, in this order:
  1. **Title**: focused, required.
  2. **Kind**: a two-option radio group (Money · Percent). It defaults to Money and is always visible, never folded. Its helper says it can't be changed later.
  3. **Target**: money only, required. When the kind is switched away and back, the value is kept.
  4. **"Add details"** disclosure: target date, description, and cover photo (only when uploads are enabled).
  5. **"Create goal"**.
- **Edit** has the same fields, **all unfolded**. The kind shows as read-only text. **Delete goal** is last, set apart.
- **On phones, the two form routes are task pages without the bottom nav.** They have a task header (✕ Cancel and the title). The primary floats at the bottom-right and rides the on-screen keyboard.
- **From 48 rem**, the top bar stays, and the primary ends the form, followed by Cancel.

**Why:**
- **Title first and focused.** That's the design system's quick-capture rule: people think of the name before the kind. [DS]
- **The kind is visible.** It can't be changed after creation, so it must be seen and not folded.
- **Money is the default.** Three of the four example goals are money, and a money goal shows the Target field, so someone who wanted a percent goal sees it at once. [Tesler]
- **No starting amount or percent.** "Numbers are earned": the first contribution is added on the detail page, and the empty history invites it.
- **Edit is unfolded.** The fold exists to speed up creating, not changing.
- **No bottom nav on form routes:**
  - with `interactive-widget=resizes-content`, a fixed nav rides on top of the keyboard and takes 64 px of the remaining space;
  - a task page also prevents leaving by accident with unsaved input;
  - this is how iOS and Android present modal tasks. [Jakob]
- **Primary placement:**
  - On phones, the floating bottom-right primary is the user's own choice (`home/decision.md`).
  - On wide screens, forms end with their submit [Jakob]. The masthead rule is for view screens.

### D8 · Offline on these screens: you can draft, and submitting waits
**Decision:**
- **Reading** works from the cache.
- **Adding to a goal works** (queued), exactly as on Home.
- **Create, edit and the composer open and keep a draft.** Their submit is `aria-disabled` and says why, and it becomes active again when the connection returns, which is announced.
- **Deletes are disabled offline**, with the reason shown. The one exception is removing an unsynced queued entry, which simply cancels it.
- **Photo upload controls are disabled offline**, with the reason shown.

**Why:**
- **ARCHITECTURE §9.** Only `['goalEntries','add']` works offline, and other controls are "disabled and say why".
- **No dead ends.** Letting someone write the goal or note now and send it later fits the quick-capture rule, and nothing is typed twice. [Postel; WCAG 3.3.7]
- **Drafts survive.** They outlast navigation and a reload on this device, and are cleared on save, discard or logout.

---

## 1. Screen inventory

| Screen or view | Route | Primary job | Primary action | Entry points |
|---|---|---|---|---|
| **Goals list** | `/goals` | See how every goal is doing and open the right one | **New goal** ("Create a goal" when there are none) | Goals tab; Home "Saved together" and "See all"; "‹ Goals" on the detail; after deleting a goal |
| **Goal detail** | `/goals/:id` (`?view=`) | See this goal's progress and who did what, and add to it | **Add to this goal** / **Update progress**; on a done goal, **Write a note** | List card; Home goal card; after create; back from edit |
| Quick-add sheet (Home's, reused) | dialog over the detail | Add an amount or set a percent | Add contribution / Update progress | The detail's primary; "Add more" on done goals |
| **Entry sheet** | dialog over the detail | See one contribution in full, and delete it | none (Delete is a danger secondary) | Tap a history row |
| **Confirm** | `alertdialog` | Confirm a destructive act | the destructive verb | Delete entry, delete note, delete goal, discard draft |
| **Note composer** | `/goals/:id?note=new\|<noteId>` (dialog) | Write a note with text and photos in order | **Save note** | Journal "Write a note"; the done-goal primary; Edit on my own note |
| Photo viewer | dialog | See a journal photo uncropped (the arch crops it) | none | Tap a journal photo |
| **Create goal** | `/goals/new` | Start a goal in seconds | **Create goal** | List primary; Home "Create a goal" or "New goal" (first-run, joined-empty, all-done) |
| **Edit goal** | `/goals/:id/edit` | Change a goal's details; delete it | **Save changes** | Detail "Edit" |

**Merged:**
- Stats live inside the detail, not on a screen of their own.
- Create and edit are one form component on two routes.

**Split:**
- An entry's details and its delete action moved out of the row into the entry sheet, so rows stay one tap each with no nested buttons.

### Content priority (what the eye must hit, in order)
**Goals list:**
1. h1 "Goals" and the summary line.
2. Open goal cards. Inside a card: title → amount or percent with the bar → who and when → "by" date.
3. The primary (New goal).
4. The Done section (lighter rows).

**Goal detail:**
1. Identity: the cover arch and the h1 title. "Am I in the right goal?"
2. The number: "14,250 MAD of 20,000 MAD", the bar, "5,750 MAD to go".
3. The primary (Add to this goal).
4. Who put in what (both partners, equal weight, in slot order, never ranked).
5. The feeds: History (latest first, grouped by month), or Journal.
6. Stats (folded on phones).
7. Secondary chrome: "‹ Goals", "Edit".

**Create goal:** Title → Kind → Target (money) → Create goal → Add details.

**Edit goal:** the fields with their current values → Save changes → Delete goal (last, set apart).

**Note composer:** the text block → Save note → Add photo → Reorder (only once there are two or more blocks, at least one of them a photo).

---

## 2. Navigation model

| Route | Phone chrome | ≥ 48 rem | Document title (Writer) |
|---|---|---|---|
| `/goals` | bottom nav, Goals current | top bar | Goals – Zamane |
| `/goals/:id` | bottom nav, Goals current | top bar | {Goal title} – Zamane |
| `/goals/:id?note=…` | covered by the full-screen dialog | top bar under the dialog | New note: {title} – Zamane / Edit note: {title} – Zamane |
| `/goals/new` | **task header, no bottom nav** (D7) | top bar | New goal – Zamane |
| `/goals/:id/edit` | **task header, no bottom nav** | top bar | Edit {title} – Zamane |

- **Current location.**
  - The Goals tab carries `aria-current="page"` on every `/goals/*` route (a prefix match: TanStack `activeOptions: { exact: false }`).
  - Inside the detail, the selected tab carries `aria-selected`.
  - Nothing else marks "current".
- **Up versus back:**
  - "‹ Goals" on the detail always goes to `/goals`. Its accessible name contains the visible "Goals" (for example, "Back to all goals"). [WCAG 2.5.3]
  - Browser and OS Back follow history.
  - ✕ Cancel on a task page goes back one entry when that entry is in the app. Otherwise it goes to the parent: the detail for edit, the list for create.
- **After a write:**
  - **Create** replaces `/goals/new` with `/goals/:id`, so Back goes to wherever create was opened from.
  - **Saving an edit** pops back to the detail.
  - **Deleting a goal** goes back two entries when the stack is list → detail → edit; otherwise it replaces with `/goals`.
  - **Saving a note** pops `?note=`.
- **Tabs:**
  - Tapping the Goals tab on the detail goes to the list. Tapping it on the list scrolls to the top (nav-bar convention).
  - The detail's tabs are not navigation: they're `?view=`, replaced rather than pushed, so Back leaves the page.
- **Counts.** There are still five top-level destinations. The detail adds two tabs. [Miller]
- **Help.** These screens add no help mechanism, so WCAG 3.2.6 doesn't apply. If help is added, it lives in Profile for every screen.
- **Home links to keep working:** `#/goals`, `#/goals/:id` (`wedding`, `guest-room`, `honeymoon`) and `#/goals/new`.

---

## 3. Flows

### F1 · Open a goal (list → detail → back)
1. The Goals tab (or Home's "See all" or "Saved together") opens `/goals`.
   - Focus goes to the h1.
   - The cached list shows at once and refetches in the background.
2. Tapping a card opens `/goals/:id`. The header and progress render at once from the list cache, while history, stats and journal fill their skeleton rows without moving the layout.
3. Focus goes to the h1 (the goal's title).
4. "‹ Goals" or Back returns to the list at the same scroll position, with focus on the card just opened.

**Unhappy paths:**
- **First load with no cache:** card skeletons on the list. A deep link to a detail shows a skeleton header.
- **The list fails with no cache:** "Goals didn't load" and **Try again**, inline. The nav still works.
- **A refresh fails but a cache exists (online):** the cached list, plus a slim notice "Couldn't refresh. Showing the latest data on this phone." with **Try again**.
- **Offline:** cached data and the slim offline notice. If a goal was never opened on this phone, its header shows from the list cache, and the feeds say: "This isn't on this phone yet. It loads when you're back online."
- **The goal is gone** (a stale link, or deleted by the partner): "This goal isn't here any more." and **Back to Goals**. The list drops the card.
- **The partner deletes the goal while I'm on it:** the page swaps in place to "Youssef deleted Wedding fund." with **Back to Goals**. Open dialogs on it close; the composer keeps its text (F5).

### F2 · Add to this goal (detail)
1. Tap the primary. The quick-add sheet opens at step B for this goal, without "Change goal".
2. The amount field is focused (money), or the percent field with −10 and +10 (percent). "Add a note" is folded. All Home rules apply.
3. **Add contribution** (or **Update progress**) closes the sheet at once (optimistic).
4. Then the page updates:
   - the bar animates;
   - a new row appears at the top of History ("just now");
   - the History count goes up by one;
   - the share and stats update.
5. A toast reads "Added 500 MAD to Wedding fund" with **Undo**.
   - It follows Home's toast rules: 10 s, paused on hover and focus, Esc dismisses, and "Undo is the next button." is announced.
   - Focus returns to the primary.

**Unhappy paths:**
- **Invalid input:** Home's inline errors. The input is kept.
- **Offline:**
  - the add is queued;
  - the row shows cloud-off and "waiting to sync";
  - the toast adds "Will sync when you're back online.";
  - Undo cancels the queued add.
- **The add crosses the target:**
  - the saffron "Goal reached." toast appears, with Undo;
  - the bar turns zellige and the Done badge shows;
  - the primary becomes **Write a note** (D4), and focus lands on it.
- **Undo after a completion:** the goal is open again, the primary returns to "Add to this goal", and the toast reads "Removed …".
- **The queued add is rejected on sync** (the goal was deleted meanwhile, 404): the toast reads "Couldn't add 500 MAD. Wedding fund was deleted." The amount is named so it can be re-added elsewhere. The row is removed.
- **The partner adds at the same moment:** both land, because the server serialises them. The partner's row arrives through realtime, with no toast.
- **A done goal:** the ghost **Add more** (or **Update progress**) opens the same sheet.
  - Past the target, the progress reads "6,500 MAD of 6,000 MAD · 500 MAD over", in neutral ink, not danger (danger means over budget).
- **A percent goal lowered from 100:** it's no longer done. An ordinary toast appears, with Undo.

### F3 · See who put in what
1. "Who put in what" is always visible under the progress. Sara comes first and Youssef second (slot order, never sorted by amount), each with an amount and a percentage.
2. **Stats ▾** opens: contributions (count), average, largest, this month, last activity. On wide screens it's an always-visible line.

**Unhappy paths:**
- **No entries:** the share and stats are replaced by "No contributions yet".
- **The partner hasn't joined:** one row, plus "Your partner hasn't joined yet."
- **A percent goal:**
  - the share counts updates per partner;
  - stats show updates (count), the change this month in points ("40% → 60%") and the last activity;
  - average and largest are hidden.
- **Stats fail to load:** "Stats didn't load." and **Try again**, inside the fold. The rest of the page is unaffected.

### F4 · Delete an entry
1. Tap a history row. The entry sheet opens: an avatar, "Sara added 500 MAD", "Sat 7 Nov 2026 at 14:32", and the full note.
2. **Delete contribution** (danger, secondary weight) opens the confirmation on top:
   - "Delete Sara's 500 MAD?"
   - "Wedding fund goes back to 13,750 MAD of 20,000 MAD."
   - Focus is on **Keep it**.
3. **Delete**:
   - both dialogs close and the row is removed;
   - progress, share and stats update without the fill animation (the design system animates only new contributions);
   - a toast reads "Deleted Sara's 500 MAD from Wedding fund", with no Undo.
4. Focus moves to the next row, or the previous row if this was the last, or the History heading if the list is now empty.

**Unhappy paths:**
- **The delete un-completes the goal:** the confirmation adds "Wedding fund will no longer be done." Afterwards, zellige turns back to majorelle, the Done badge goes, and the primary goes back to adding.
- **A percent entry:** the consequence states the new current value. If the entry isn't the latest one, it says "Progress stays at 60%."
- **Offline:** Delete is `aria-disabled`, with the helper "Deleting needs a connection."
- **A queued, unsynced entry:**
  - the button reads **Remove** and works offline, by cancelling the queued add;
  - the same confirmation appears, with "It hasn't synced, so Youssef never saw it."
- **A network or server error:** the row returns in place, the toast reads "Couldn't delete this. Try again.", and focus goes to the row.
- **The partner already deleted it:** the API answers `204`, and the success path runs.
- **The partner deletes it while the sheet is open:** the sheet body swaps to "Youssef deleted this contribution." with **Close**, which takes focus.
- **Keep it, or Esc:** the confirmation closes and focus returns to "Delete contribution".

### F5 · Write a journal note
1. In Journal (the tab or the column), **Write a note** (or the done-goal primary) opens the composer and pushes `?note=new`. One empty text block is focused.
2. Type. **Add photo** opens the system picker, with multiple selection. For each photo:
   - it's downscaled on the device;
   - it's uploaded with a signature, showing progress;
   - it's inserted at the caret, with a text block after it, which takes focus.
3. **Save note** sends a POST with the client id and the ordered blocks. Then:
   - the composer closes (the `?note=` entry is popped);
   - the note appears at the top of the journal, and its count goes up by one;
   - focus goes to the new note's heading;
   - "Note saved." is announced.

**Unhappy paths:**
- **Empty** (no text and no photo): Save is `aria-disabled`. Activating it announces "Write something or add a photo first."
- **Saving while photos upload:** the button reads "Saving after photos (1 of 2)" and saves when they finish. Close still works.
- **An upload fails:**
  - the block shows "Didn't upload.", with **Try again** and **Remove**;
  - Save is blocked with "1 photo didn't upload";
  - focus goes to that block's Try again.
- **A file is too large** (over 10 MB after downscaling) **or in an unsupported format:** the photo isn't inserted, and a message appears in the tool bar, naming the file.
- **Signing is rate-limited (429):** "Too many photos at once. Try again in a minute."
- **Uploads are disabled:** a single text block, no tools.
  - An existing image block (in edit) shows a "Photo unavailable" placeholder that can be removed (open question Q4).
- **Uploads are turned off mid-session (`503 uploads_disabled`):** pending blocks fail with "Photos are turned off for now.", and Add photo hides.
- **Offline:**
  - the composer opens;
  - Add photo is `aria-disabled`: "Photos need a connection.";
  - Save is `aria-disabled`: "You're offline. Your note stays here. Save it when you're back online.";
  - when the connection returns, Save enables and that is announced.
- **Close, Back or Esc with content:** a confirmation, "Discard this note?", with **Discard** and **Keep writing**. If the note is empty, it closes at once.
- **A reload, or the app was killed:** the draft (text and the uploaded photo references) comes back with "Draft restored." and **Discard draft**.
- **Saving fails:** the composer stays open with "Couldn't save the note. Try again." Everything is kept, and retrying is safe because the client id is the same.
- **Limits:**
  - A counter appears in the last 10% of a text block's 10,000-character cap.
  - The note-level cap is open question Q2.
  - At 10 photos, Add photo is `aria-disabled`: "Up to 10 photos in a note." (Q3)
- **The goal is deleted while I'm writing:** a banner reads "Youssef deleted Wedding fund. This note can't be saved.", with **Copy text** and **Close**.

### F6 · Reorder blocks (no drag)
1. With two or more blocks, at least one of them a photo, the tool bar shows **Reorder** (a toggle with `aria-pressed`).
2. In Reorder mode, each block becomes a row: its position, then "Text: first words…" or the photo's thumbnail, then **Move up**, **Move down** and **Remove**.
3. A move shifts the row one place. Focus stays on the same button of the moved row; if that button is now disabled at an end, focus goes to the other move button. "Photo moved to 2 of 4." is announced.
4. **Done** (the same toggle) returns to writing mode, with focus on the block that was moved.

**Unhappy paths:**
- **Remove:** a "Removed · Undo" row takes its place until the note is saved.
- **At the ends:** the unavailable move button is `aria-disabled`, so it stays focusable and is read as unavailable.

### F7 · Edit or delete my journal note
1. **Edit** on my own note opens the composer and pushes `?note=<id>`. Focus goes to the composer heading.
2. **Save changes** sends a PUT with `updatedAt`. The note updates in the feed, focus returns to its **Edit** button, and "Note saved." is announced.
3. **Delete note** sits in the composer, at the end of the note, in danger style. It opens the confirmation "Delete this note? Its 2 photos are deleted too." After the DELETE:
   - the composer closes and the note is removed;
   - focus goes to the next note, or to Write a note;
   - a toast reads "Note deleted".

**Unhappy paths:**
- **409** (I edited it on my other device):
  - "This note changed on your other device.";
  - **Keep mine** saves over it, with the new `updatedAt`;
  - **Load the latest** opens the discard confirmation first;
  - a disclosure, "See the latest version", shows it.
- **404:** "This note was deleted on your other device.", with **Copy text** and **Close**.
- **Offline:** edit as a draft, with Save waiting. Delete note is disabled.
- **The partner's notes** have no Edit.

### F8 · Create a goal
1. **New goal** (or Home's "Create a goal" or "New goal") pushes `/goals/new`. On phones, the bottom nav goes away. Focus is in **Title**.
2. Type the title. The kind is already **Money**.
3. Type the target, then **Create goal**:
   - a POST is sent with the client id;
   - `/goals/:id` replaces the form, with focus on the h1;
   - "Goal created." is announced;
   - the empty History invites the first contribution.
   - **Percent:** choose Percent and the Target hides. **Add details** opens the date, description and cover.

**Unhappy paths:**
- **Submitting without a title:** an error under Title, which takes focus. Nothing else nags.
- **A money goal with no target, 0, or something unparseable:** an error under Target, which takes focus. Parsing is `money.ts` ("20 000", "20,000", "20000,50").
- **Validation on blur:** only on fields the person has typed in. Errors clear as soon as the value is valid. The input is never cleared.
- **Kind switched Money → Percent → Money:** the target is kept.
- **A cover is uploading:** Create waits ("Creating after the photo…").
- **The cover upload failed:**
  - the error shows at the cover field, which takes focus;
  - Create is blocked until **Try again** or **Remove**.
- **Uploads are disabled:** there's no cover control.
- **Offline:**
  - the form works;
  - Create is `aria-disabled`, with "You're offline. You can create the goal when you're back online. What you've typed stays here.";
  - when the connection returns, Create enables and that is announced.
- **A server or network error:** an alert at the top, "Couldn't create the goal. Try again." The fields are kept, and retrying is safe (the same client id; a replay answers `200`).
- **A double tap:** the second press is ignored (`aria-disabled` while pending).
- **Cancel or Back with input:** "Discard this goal?", with **Discard** and **Keep editing**. Without input, it leaves at once.
- **A target date in the past:** allowed, with the helper "This date has passed."

### F9 · Edit a goal
1. **Edit** on the detail pushes `/goals/:id/edit`.
   - Every field shows.
   - The kind is read-only: "Money goal. The kind can't be changed."
   - Focus is on the h1.
2. **Save changes**:
   - a PATCH is sent with `updatedAt`;
   - the page pops back to the detail, with focus on **Edit**;
   - a toast reads "Changes saved".

**Unhappy paths:**
- **A target change that crosses completion:** a preview under Target before saving, for example "Wedding fund will be marked done: 14,250 MAD is already saved." or "New sofa will no longer be done." After saving, the toast reads "Changes saved. New sofa is open again." This toast isn't saffron: that moment is for a contribution landing.
- **The partner changes the goal while I edit** (a realtime notice): refetch and run the three-way merge (§6.7). An inline notice names it once.
- **A 409 on save:** the same merge, using the row in the 409 body.
  - If **no editable field differs** (for example, only completion changed), it retries once, silently, with the new `updatedAt`.
  - Otherwise the merge shows, focus goes to the notice, and the person saves again.
- **A 404 on save:** "This goal was deleted. Your changes weren't saved.", with **Back to Goals**.
- **Offline:** editing is allowed. Save is `aria-disabled`, with its reason. Delete goal is `aria-disabled`: "Deleting needs a connection."
- **Replacing or removing the cover:** it takes effect on Save, and the server destroys the old asset. Cancel reverts it.
- **Cancel with changes:** "Discard your changes?"

### F10 · Delete a goal
1. **Delete goal** is the last item in Edit, set apart. It opens a confirmation:
   - "Delete Wedding fund?"
   - "This deletes its 7 contributions (14,250 MAD), 2 notes and 1 photo, for both of you. You can't undo this."
   - **Keep goal** · **Delete goal**, with focus on Keep goal.
2. After the DELETE:
   - the app goes to `/goals` (per §2), with focus on the h1;
   - a toast reads "Wedding fund deleted";
   - Home's total and counts change.

**Unhappy paths:**
- **Offline:** Delete goal is disabled.
- **An error:** stay in Edit, with "Couldn't delete the goal. Try again."
- **The partner is on that goal:** they see the deleted states from F1, F5 and F9.

### F11 · Back to Home
- The Home tab works from the list and the detail. On the form routes on phones, Cancel comes first.
- Home is current on arrival: the query cache is shared, and realtime invalidates `['home']`.
- From a detail opened from Home, Back returns to Home with focus on that goal card (Home's restore rules).
- Creating the first goal moves Home from joined-empty to populated. Deleting the last open goal moves it to all-done.

---

## 4. State matrix

Every new value (entries, notes, stats, dates beyond the design system's) is **example data and is labelled on screen**, as Home's footnote is.

### 4.1 Goals list

| State | When | What shows | Primary |
|---|---|---|---|
| `populated` | 1 or more open goals | summary line, Open cards, Done rows | New goal |
| `empty` (first-run included) | no goals | a prompt: "No goals yet." and one sentence. No summary line. | **Create a goal** |
| `all-done` | 0 open, 1 or more done | "All goals reached" prompt with a Done badge, then the Done rows; summary "4 goals done · … saved together" | New goal |
| `loading` | first load, no cache | a skeleton summary and three card skeletons at Home's 136 px; `aria-busy`; "Loading goals" status | none |
| `error` | load failed, no cache | "Goals didn't load." and **Try again**, inline (`aria-disabled` while pending; focus to the h1 on success) | none (Try again is inline) |
| `stale` | refetch failed, cache shown | slim notice "Couldn't refresh. Showing the latest data on this phone." with **Try again** | New goal |
| `offline` | no network, or the socket has been down long enough | Home's slim notice, adapted: "You're offline. Showing the latest data on this phone. Adding to goals still works." | New goal (opens the form as a draft, D8) |
| `pending` | my queued entries | the card shows cloud-off and "waiting to sync"; the summary includes queued amounts | — |
| `uploads-disabled` | `uploadsEnabled: false` | every cover falls back to the title's initial in the arch | — |
| `done` / `undone` (live) | a goal crosses, on another device or by the partner | the card turns zellige with Done, in place; it moves to Done the next time the route is entered (the reverse works the same way) | — |
| `partner-live` | a partner add, edit, create or delete | a card updates in place; a new goal is appended at the end of Open; a deleted goal's card is removed (if it had focus, focus goes to the next card); a polite announcement | — |
| `deleted-by-me` | arriving after F10 | the toast "Wedding fund deleted"; focus on the h1 | New goal |

### 4.2 Goal detail (page)

| State | When | Summary (identity, progress, share) | History / Journal | Primary |
|---|---|---|---|---|
| `populated` | money goal with entries | full | History by month; Journal notes | Add to this goal |
| `percent` | a general goal | "60%", the bar, "Youssef moved it to 60% · yesterday"; the share counts updates | rows read "Youssef moved it to 60%" | Update progress |
| `no-entries` (first-run of a goal) | 0 entries | "0 MAD of 30,000 MAD", an empty bar; share and stats replaced by "No contributions yet" | History: "No contributions yet. Add the first one with Add to this goal." (no second button) | Add to this goal |
| `solo` | the partner hasn't joined | the share has one row and "Your partner hasn't joined yet." | normal | as usual |
| `done` | completed | Done badge; zellige bar; "Reached Fri 30 Oct · Youssef" (`completed_at/by`); ghost **Add more** / **Update progress** | normal; Journal hides its own "Write a note" while the primary is that button | **Write a note** |
| `over-target` | money saved above the target | "6,500 MAD of 6,000 MAD · 500 MAD over" (neutral) | normal | Write a note |
| `date-passed` | the target date is past and the goal isn't done | "Target date was Sat 3 Oct", in neutral ink (not danger) | normal | as usual |
| `loading` | deep link, no cache | skeleton header, bar and share | skeleton rows | none |
| `partial` | arriving from the list | identity and progress real (from the list cache) | skeleton rows until loaded | as usual |
| `section-error` | one query failed | the rest of the page works | "History didn't load." / "The journal didn't load." / "Stats didn't load.", each with **Try again**, in place | as usual |
| `error` | the goal failed, no cache | "This goal didn't load." and **Try again**, inline | — | none |
| `not-found` | 404 | "This goal isn't here any more." and **Back to Goals** | — | none |
| `offline` | no network | cached; slim notice: "You're offline. Adding to this goal still works. Editing, deleting and the journal need a connection." | cached rows; uncached photos show "Photo not available offline" | Add to this goal (queued) |
| `uploads-disabled` | `uploadsEnabled: false` | cover shows the initial | journal notes are text only; existing photos show placeholders (Q4) | as usual |
| `my-add` | F2 | the bar animates | a row at the top, "just now" | toast with Undo |
| `my-add-completes` | F2, crossing the target | Done | — | the saffron toast, then **Write a note** |
| `my-delete` (confirmed) | F4 | updates without animation; un-done when it applies | the row is removed; focus to the next row | toast, no Undo |
| `queued` | offline add | includes the queued amount | the row shows cloud-off and "waiting to sync"; its sheet offers **Remove** | — |
| `sync-rejected` | a queued add fails on replay | rolled back | row removed | toast naming the amount |
| `partner-add` | realtime | the bar animates; a polite announcement ("Youssef added 200 MAD to Wedding fund."); no toast | a row inserted at the top, with the scroll position kept; the tab count updates | unchanged |
| `partner-completes` | realtime | Done; "Youssef reached Wedding fund." announced; no toast | — | the label changes in place to Write a note, keeping focus if it was there |
| `partner-delete-entry` | realtime | updates without animation; "Youssef removed a contribution from Wedding fund." announced | row removed; if it had focus, focus to the next row; an open entry sheet shows "deleted" | — |
| `partner-edit` | realtime | the title, date, description and cover update in place; "Youssef edited this goal." announced | — | — |
| `partner-note` | realtime | — | the note appears at the top (scroll kept); the count updates; "Youssef wrote a note." announced | — |
| `partner-deleted-goal` | realtime | the page swaps to "Youssef deleted Wedding fund." and **Back to Goals**, which takes focus | — | none |

### 4.3 Entry sheet

| State | What shows |
|---|---|
| `default` | avatar, "Sara added 500 MAD", full date and time, full note, **Delete contribution** |
| `queued` | "Waiting to sync" in place of the time; **Remove** (works offline) |
| `offline` | Delete is `aria-disabled`, with "Deleting needs a connection." |
| `confirm` | the confirmation on top, with the consequence (new progress; "no longer done" when it applies); focus on **Keep it** |
| `deleting` | the confirmation's Delete is `aria-disabled` with "Deleting…"; then both dialogs close (optimistic) |
| `failed` | the row returns; the toast "Couldn't delete this. Try again." |
| `deleted-by-partner` | "Youssef deleted this contribution." and **Close** |

### 4.4 Note composer

| State | What shows |
|---|---|
| `new` | one empty text block, focused (the placeholder is a prompt, not a label: the label is "Note"); tools; Save `aria-disabled` |
| `writing` | blocks in order; Save enabled |
| `photo-uploading` | the photo in the arch with progress and **Cancel**; Save reads "Saving after photos" if pressed |
| `photo-failed` | "Didn't upload.", **Try again** and **Remove**; Save is blocked with a count |
| `photo-removed` | a "Removed photo · Undo" row in place until saved |
| `reorder` | compact rows with Move up, Move down and Remove; the toggle reads **Done** |
| `uploads-disabled` | one text block; no Add photo or Reorder; existing photos are placeholders |
| `offline` | writing works; Add photo and Save are `aria-disabled`, with reasons |
| `draft-restored` | "Draft restored." and **Discard draft**, above the blocks |
| `saving` | Save is `aria-disabled` with "Saving…" |
| `save-failed` | an alert above the tools: "Couldn't save the note. Try again."; everything kept |
| `limit` | a counter near the text cap; "Up to 10 photos in a note." |
| `edit` | the author's existing blocks; "Save changes"; **Delete note** at the end |
| `conflict` (409) | "This note changed on your other device.", **Keep mine**, **Load the latest**, and "See the latest version" |
| `goal-deleted` | a banner with **Copy text** and **Close**; Save hidden |
| `discard-confirm` | "Discard this note?", **Keep writing** (focused) and **Discard** |

### 4.5 Create goal

| State | What shows |
|---|---|
| `idle` | Title (focused), Kind = Money, Target, Add details (closed), Create goal |
| `percent` | Target hidden; the Kind helper describes percent |
| `details-open` | Target date, Description (a counter near 4,000), Cover photo |
| `invalid` | an inline error under the field (`aria-invalid`, described by it); focus on the first invalid field; input kept |
| `cover-uploading` / `cover-failed` | progress in the arch / an error with **Try again** and **Remove**; Create waits or is blocked |
| `uploads-disabled` | no cover control |
| `offline` | the form works; Create is `aria-disabled` with its reason; enabled and announced on reconnect |
| `saving` | Create is `aria-disabled` with "Creating…" |
| `save-failed` | an alert at the top; fields kept |
| `draft-restored` | "Draft restored." and **Discard draft** |
| `discard-confirm` | "Discard this goal?" |

### 4.6 Edit goal

| State | What shows |
|---|---|
| `loaded` | every field, unfolded, with its current value; Kind read-only; Save changes; Delete goal last |
| `invalid` | as in create |
| `completion-preview` | under Target: "… will be marked done …" / "… will no longer be done." |
| `partner-changed` (live, before saving) | the notice "Youssef changed this goal while you were editing."; per-field marks (§6.7) |
| `conflict` (409) | the same as `partner-changed`, built from the 409 body; focus on the notice |
| `conflict-silent` | nothing shows (only non-editable fields differed); one automatic retry |
| `not-found` | "This goal was deleted. Your changes weren't saved." and **Back to Goals** |
| `offline` | editing allowed; Save and Delete goal are `aria-disabled`, with reasons |
| `uploads-disabled` | no cover control; an existing cover is not shown (the initial is used) |
| `saving` / `saved` | "Saving…" / pop to the detail and the toast "Changes saved" |
| `delete-confirm` / `deleting` / `delete-failed` | F10 |

---

## 5. Wireframes

Grayscale regions and priority only. The Art Director owns the styling.
- **Key:** ╭╮ is the arch (imagery only). (S) and (Y) are PartnerAvatars. ◆ marks the current tab.
- **Example data:** the design system's (Wedding fund, New sofa, 20,250) and Home's placeholders (Paint the guest room, Honeymoon). Entries, notes and stats are new example data.

### 5.1 Goals list

```
MOBILE 390 · Goals list · populated
┌────────────────────────────────────┐
│ H1 Goals                           │ 1 where am I
│ 3 open · 1 done ·                  │ 1 summary: body/caption weight,
│ 20,250 MAD saved together          │   not the 32 px numeral (D2)
│                                    │
│ ┌────────────────────────────────┐ │
│ │ ╭──╮ Wedding fund              │ │ 2 whole card = one link
│ │ │W │ 14,250 MAD of 20,000 MAD  │ │   (stretched title, as Home)
│ │ ╰──╯ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░      │ │
│ │ (S) Sara added 500 · 2 days ago│ │
│ │                  by Sat 12 Jun │ │
│ └────────────────────────────────┘ │
│ ┌────────────────────────────────┐ │
│ │ ╭──╮ Paint the guest room      │ │
│ │ │P │ 60% complete              │ │
│ │ ╰──╯ ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░      │ │
│ │ (Y) Youssef moved it to 60% ·  │ │
│ │     yesterday                  │ │
│ └────────────────────────────────┘ │
│ ┌────────────────────────────────┐ │
│ │ ╭──╮ Honeymoon                 │ │
│ │ │H │ 0 MAD of 30,000 MAD       │ │
│ │ ╰──╯ ░░░░░░░░░░░░░░░░░░░░      │ │
│ │ No contributions yet           │ │
│ └────────────────────────────────┘ │
│                                    │
│ H2 Done · 1                        │ 4 lighter, compact rows
│ ┌────────────────────────────────┐ │
│ │ ╭N╮ New sofa         [✓ Done]  │ │   also one link each
│ │     6,000 MAD · reached        │ │
│ │     Fri 30 Oct · Youssef       │ │
│ └────────────────────────────────┘ │
│                  ┌───────────────┐ │
│                  │ + New goal    │ │ 3 floating primary, 16 px
│                  └───────────────┘ │   above the nav hairline
├────────────────────────────────────┤
│ Home  Goals◆  Trips  Shopping  (S) │
└────────────────────────────────────┘
EMPTY:    H1 Goals → prompt "No goals yet." + one sentence; primary "Create a goal".
ALL-DONE: summary "4 goals done · 56,000 MAD saved together" → prompt
          "All goals reached" (Done badge) → Done rows; primary "New goal".
LOADING:  summary bar + 3 card skeletons (136 px), no primary.
OFFLINE:  slim notice under the summary line; everything else as populated.
```

```
DESKTOP 1440 · Goals list · populated (content in Home's 1080 px wrap)
┌ Zamane  Home  Goals◆  Trips  Shopping ──────────────────────── (S) Profile ┐
│ H1 Goals   3 open · 1 done · 20,250 MAD saved together       [+ New goal]  │ masthead
│ ────────────────────────────────────────────────────────────────────────── │ line
│ ┌ ╭W╮ Wedding fund ──────────────────┐ ┌ ╭P╮ Paint the guest room ─────────┐│
│ │     14,250 MAD of 20,000 MAD       │ │     60% complete                  ││ 2 columns
│ │     ▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░            │ │     ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░           ││ from 48 rem
│ │ (S) Sara added 500 · 2 days ago    │ │ (Y) Youssef moved it to 60% ·     ││
│ │                     by Sat 12 Jun  │ │     yesterday                     ││
│ └────────────────────────────────────┘ └───────────────────────────────────┘│
│ ┌ ╭H╮ Honeymoon ─────────────────────┐                                      │
│ │     0 MAD of 30,000 MAD            │                                      │
│ │ No contributions yet               │                                      │
│ └────────────────────────────────────┘                                      │
│ H2 Done · 1                                                                 │
│ ┌ ╭N╮ New sofa · 6,000 MAD · reached Fri 30 Oct · Youssef     [✓ Done] ┐    │
└─────────────────────────────────────────────────────────────────────────────┘
48–64 rem: the same grid; the summary and primary sit under the h1, the primary at the end.
```

### 5.2 Goal detail

```
MOBILE 390 · Goal detail · Wedding fund · History tab
┌────────────────────────────────────┐
│ ‹ Goals                     [Edit] │ up-link · secondary
│ ╭──────╮                           │
│ │      │ H1 Wedding fund           │ 1 identity: cover arch +
│ │  W   │ by Sat 12 Jun 2027        │   display title (DS)
│ ╰──────╯ Description, 3 lines … More│
│                                    │
│ 14,250 MAD of 20,000 MAD           │ 2 the number
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░     71%  │
│ 5,750 MAD to go                    │
│                                    │
│ H2 Who put in what                 │ 4 slot order, equal weight
│ (S) Sara          7,750 MAD   54%  │
│ (Y) Youssef       6,500 MAD   46%  │
│ [Stats ▾]                          │ 6 disclosure (closed)
│                                    │
│ ┌ History 7 ─────┬ Journal 2 ─────┐│ 5 tabs, ?view= (replace)
│ November · 1,500 MAD               │   H3 month group + total
│ (S) Sara added 500 MAD    Sat 7 Nov│   row = button → entry sheet
│     bonus month                    │
│ (Y) Youssef added 1,000   Sun 1 Nov│
│ October · 5,750 MAD                │
│ (S) Sara added 750       Wed 28 Oct│
│ (Y) Youssef added 3,000  Thu 15 Oct│
│ …                                  │
│ [Show older]                       │ 30 per page, no infinite scroll
│             ┌────────────────────┐ │
│             │ + Add to this goal │ │ 3 floating primary
│             └────────────────────┘ │
├────────────────────────────────────┤
│ Home  Goals◆  Trips  Shopping  (S) │
└────────────────────────────────────┘
STATS OPEN: Contributions 7 · Average 2,036 MAD · Largest 4,500 MAD ·
            This month 1,500 MAD · Last activity Sara, Sat 7 Nov
            (a two-column label/value list; values tabular)
```

```
MOBILE 390 · Goal detail · Journal tab (only the area under the tabs changes)
│ ┌ History 7 ─────┬ Journal 2 ─────┐│
│ [Write a note]                     │ secondary; hidden when the primary is it
│ ┌────────────────────────────────┐ │
│ │ (S) Sara · Sat 7 Nov    [Edit] │ │ H3 author · date; Edit only on mine
│ │ Text block …                   │ │
│ └────────────────────────────────┘ │
│ ┌────────────────────────────────┐ │
│ │ (Y) Youssef · Sun 1 Nov        │ │ no Edit on the partner's note
│ │ Text block …                   │ │
│ │ ╭────────────────────────────╮ │ │ photo in the arch;
│ │ │        example photo       │ │ │ tap → viewer (uncropped)
│ │ ╰────────────────────────────╯ │ │
│ │ Text block … [Read more]       │ │ long text clamped (~12 lines)
│ └────────────────────────────────┘ │
│ [Show older notes]                 │ 10 per page
EMPTY: "No notes yet. Write about this goal, or add a photo." + [Write a note]
       (uploads off: "No notes yet. Write the first one.")
```

```
MOBILE 390 · Goal detail · New sofa (done): only the changes
│ ‹ Goals                     [Edit] │
│ ╭N╮ H1 New sofa         [✓ Done]   │
│ 6,000 MAD of 6,000 MAD             │
│ ██████████████████████████  zellige│
│ Reached Fri 30 Oct · Youssef       │ completed_at / completed_by
│ [Add more]                         │ ghost: adding stays one tap away
│ …                                  │
│                  ┌───────────────┐ │
│                  │ Write a note  │ │ primary changes (D4)
│                  └───────────────┘ │
```

```
DESKTOP 1440 · Goal detail · Wedding fund (no tabs from 64 rem)
┌ Zamane  Home  Goals◆  Trips  Shopping ──────────────────────── (S) Profile ┐
│ ‹ Goals                                                                     │
│ ╭────╮ H1 Wedding fund                         [Edit]  [+ Add to this goal] │ masthead line
│ │ W  │ by Sat 12 Jun 2027                                                   │
│ ╰────╯ Description, 2 lines … More                                          │
│ ──────────────────────────────────────────────────────────────────────────  │
│ 14,250 MAD of 20,000 MAD             71% │ H2 Who put in what               │ band 7 | 5
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░           │ (S) Sara        7,750 MAD   54%  │
│ 5,750 MAD to go                          │ (Y) Youssef     6,500 MAD   46%  │
│ 7 contributions · average 2,036 MAD · largest 4,500 MAD ·                   │ stats line,
│ this month 1,500 MAD · last activity Sara, Sat 7 Nov                        │ always shown
│ ──────────────────────────────────────────────────────────────────────────  │
│ H2 History · 7                   │ H2 Journal · 2           [Write a note]  │ 5 | 7
│ November · 1,500 MAD             │ ┌ (S) Sara · Sat 7 Nov ───────── [Edit] ┐│
│ (S) Sara added 500    Sat 7 Nov  │ │ Text block …                          ││
│     bonus month                  │ └───────────────────────────────────────┘│
│ (Y) Youssef added 1,000  Sun 1 Nov│ ┌ (Y) Youssef · Sun 1 Nov ─────────────┐│
│ October · 5,750 MAD              │ │ Text block …                          ││
│ (S) Sara added 750   Wed 28 Oct  │ │ ╭────────── example photo ─────────╮  ││
│ …                                │ │ ╰──────────────────────────────────╯  ││
│ [Show older]                     │ └───────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
48–64 rem: the phone layout (tabs, stats fold), with the primary at the end of the
progress line instead of floating, and the top bar.
```

### 5.3 Entry sheet and confirmation

```
MOBILE 390 · Entry sheet (Home's bottom sheet; a centred 28 rem dialog from 48 rem)
├────────────────────────────────────┤
│ H2 Contribution               [✕]  │ focus: heading (tabindex −1)
│ (S) Sara added 500 MAD             │
│ Sat 7 Nov 2026 at 14:32            │
│ bonus month                        │ full note, never clamped
│                                    │
│ [Delete contribution]              │ danger, secondary weight
└────────────────────────────────────┘

CONFIRM (alertdialog, small and centred at every size, above the sheet)
        ┌──────────────────────────────┐
        │ Delete Sara's 500 MAD?       │
        │ Wedding fund goes back to    │
        │ 13,750 MAD of 20,000 MAD.    │ + "…will no longer be done." if so
        │ [Keep it]        [Delete]    │ focus: Keep it · Delete = danger
        └──────────────────────────────┘
```

### 5.4 Note composer

```
MOBILE 390 · Note composer · writing (full-screen dialog, ?note=new)
┌────────────────────────────────────┐
│ [✕]  H2 New note                   │ subtitle: Wedding fund
│                                    │
│ Note                               │ label (visible or vh, AD)
│ [Text block, focused, grows ……… ]  │ 1
│ ╭────────────────────────────╮[✕] │ photo + Remove (44 px)
│ │ uploading 62 %   [Cancel]  │    │ progress inside the arch
│ ╰────────────────────────────╯    │
│ [Add a description]                │ alt text (if Q1 is accepted)
│ [Text block: Keep writing …   ]    │ auto-added after every photo
│                                    │
├────────────────────────────────────┤ the bar rides the keyboard
│ [Add photo] [Reorder]  [Save note] │ tools at start · primary at end
└────────────────────────────────────┘

MOBILE 390 · Note composer · reorder mode (the "Reorder" toggle is pressed)
│ 1  Text  "We saw the riad in Fes…"  │
│                     [↑] [↓] [✕]    │ ↑ aria-disabled on the first row
│ 2  Photo ╭thumb╮                    │
│                     [↑] [↓] [✕]    │
│ 3  Text  "Deposit due in March."    │
│                     [↑] [↓] [✕]    │ ↓ aria-disabled on the last row
├────────────────────────────────────┤
│ [Done]                 [Save note] │
```

```
DESKTOP 1440 · Note composer (centred dialog ≈ 40 rem, ≤ 90 dvh; the body scrolls)
            ┌──────────────────────────────────────────────┐
            │ H2 New note · Wedding fund              [✕]  │
            │ [Text block …………………………………………………………… ]   │
            │ ╭──────────── example photo ──────────╮ [✕]  │
            │ ╰─────────────────────────────────────╯      │
            │ [Add a description]                          │
            │ [Text block: Keep writing …              ]   │
            │ ──────────────────────────────────────────── │
            │ [Add photo] [Reorder]           [Save note]  │ footer stays put
            └──────────────────────────────────────────────┘
```

### 5.5 Create and edit goal

```
MOBILE 390 · Create goal (task page: no bottom nav)
┌────────────────────────────────────┐
│ [✕ Cancel]  H1 New goal            │ task header
│                                    │
│ Title                              │ 1
│ [ |                            ]   │ focused; required
│                                    │
│ Kind                               │ 2 fieldset + legend
│ ( ● Money )  (   Percent )         │ radio group, default Money
│ Save toward an amount.             │ helper follows the choice
│ You can't change this later.       │
│                                    │
│ Target                             │ 3 money only; required
│ [                          ] MAD   │ inputmode=decimal
│                                    │
│ [+ Add details]                    │ 5 disclosure: target date,
│                                    │   description, cover photo
│               ┌──────────────────┐ │
│               │ Create goal      │ │ 4 floating primary; in DOM
│               └──────────────────┘ │   after the last field
└────────────────────────────────────┘
DETAILS OPEN: Target date [ dd/mm/yyyy ] · Description [ multi-line ] ·
              ╭initial╮ [Add a cover photo]  (hidden when uploads are off)
```

```
MOBILE 390 · Edit goal · after a partner change or a 409 (only the changes)
│ [✕ Cancel]  H1 Edit goal           │
│ ┌ notice (role=status) ──────────┐ │ focus here after a 409
│ │ Youssef changed this goal while│ │
│ │ you were editing. Check the    │ │
│ │ marked fields, then save again.│ │
│ └────────────────────────────────┘ │
│ Title                              │
│ [Wedding fund                  ]   │ yours, kept
│ Youssef changed this to "Our       │ both changed:
│ wedding". [Use theirs]             │ your choice per field
│ Kind: Money goal. Can't be changed.│ read-only text
│ Target                             │
│ [20 000                    ] MAD   │
│ Target date                        │
│ [12/06/2027]                       │ only they changed it:
│ Changed by Youssef                 │ theirs, marked
│ Description · Cover …              │ all unfolded in edit
│ ────────────────────────────────── │
│ [Delete goal]                      │ danger, last, set apart
│               ┌──────────────────┐ │
│               │ Save changes     │ │
│               └──────────────────┘ │
```

```
DESKTOP 1440 · Create goal (one centred column ≈ 36 rem; the top bar stays)
┌ Zamane  Home  Goals◆  Trips  Shopping ──────────────────────── (S) Profile ┐
│                  ‹ Goals                                                    │
│                  H1 New goal                                                │
│                  Title   [                                   ]              │
│                  Kind    ( ● Money )  (   Percent )                         │
│                  Target  [                         ] MAD                    │
│                  [+ Add details]                                            │
│                  [Create goal]   [Cancel]                                   │ submit ends
└─────────────────────────────────────────────────────────────────────────────┘ the form
Edit at ≥ 48 rem: the same column; [Save changes] [Cancel], then Delete goal under a hairline.
```

---

## 6. Interaction specs

### 6.1 Reused from Home (don't rebuild)
- **Floating primary:**
  - 56 px, 16 px from the edge and from the nav hairline, `inset-inline-end`;
  - in the DOM right after the summary block;
  - `--fab-zone` in the body padding and `scroll-padding-bottom`.
- **Quick-add sheet (step B only):**
  - parsing, errors, the stepper and the visualViewport lift;
  - backdrop dismissal only on press-and-release outside;
  - its own live and alert regions inside the dialog.
- **Toast:**
  - in the DOM right after the primary;
  - 10 s, paused on hover and focus, Esc dismisses;
  - the focus ring is `currentColor`;
  - saffron for "Goal reached.";
  - `scroll-padding-bottom` grows while it shows.
- **Slim offline notice, skeleton heights, forced-colours rules, and focus restoration after a re-render.** Restoration is scoped to the region and keyed by entity id. Use `data-key="<goalId|entryId|noteId>"`, not `href`: Home's round-2 bug came from shared `href`s.

### 6.2 Targets
- Every interactive target is **at least 44 × 44 px**. This is the system's rule, above the 24 px of WCAG 2.5.8.
- Specific sizes:
  - History rows and Done rows are at least 56 px tall.
  - GoalCards are links across their whole area.
  - The floating primary is 56 px.
  - Reorder buttons and photo ✕ are 44 px.
  - `btn-sm` is 32 px plus 6 px of padding, giving 44 px (as on Home).
- **Tabs** are at least 44 px tall and each takes half the width on phones.
- **Spacing:** 8 px or more between adjacent targets in a row (↑ ↓ ✕, Edit and Add in the masthead).

### 6.3 Focus on route change and on close

| Arrival | Focus goes to | Announced |
|---|---|---|
| `/goals`, forward | the h1 (`tabindex="-1"`) | `document.title` |
| `/goals`, Back from a detail | the card link of that goal, with scroll restored | — |
| `/goals`, after deleting a goal | the h1 | the toast |
| `/goals/:id`, forward | the h1 (the goal title) | title |
| `/goals/:id`, after create | the h1 | "Goal created." (polite) |
| `/goals/:id`, after edit save or cancel | the **Edit** button | the toast "Changes saved" (on save) |
| `/goals/new` | the **Title** field (quick capture) | title; the form is labelled by the h1 |
| `/goals/:id/edit` | the h1 (no keyboard pop-up on phones) | title |
| composer opens (new) | the first text block | dialog name |
| composer opens (edit) | the composer heading | dialog name |
| composer closes | the control that opened it; after saving a new note, that note's heading | "Note saved." |
| any sheet or dialog closes | the control that opened it (or the next logical element after a delete, F4) | — |

### 6.4 Keyboard model

| Widget | Keys |
|---|---|
| List cards | One Tab stop per card (a stretched link); Enter opens it. No arrow-key navigation. |
| Detail tabs (< 64 rem) | ARIA tabs with **automatic activation** (panels are prefetched). ←/→ move and select (mirrored in RTL); Home/End; one Tab stop for the tablist, then Tab moves into the panel. Selecting writes `?view=` (replace). If the tablist has scrolled above the viewport, it is scrolled to the top on selection (instantly under reduced motion). |
| Stats, description "More", "Read more", "Add details" | Disclosure buttons with `aria-expanded`; Enter or Space. Focus stays on the toggle. |
| History rows | `<button>`. Name: "Sara added 500 MAD, bonus month, Sat 7 Nov". Enter or Space opens the entry sheet. **Show older** loads 30 more, moves focus to the first new row and announces "30 more loaded." |
| Sheets (quick add, entry) | Native modal `<dialog>`: Tab is trapped, Esc closes, focus returns to the invoker, background scroll is locked. |
| Confirm | `role="alertdialog"`, labelled by its question and described by its consequence. Focus starts on the **safe** button. Esc means cancel. No backdrop dismissal. Enter activates the focused button only (no default-to-destructive). |
| Composer, writing | Tab order: ✕ → blocks in order (text area; on a photo, Remove, then Add a description) → Add photo → Reorder → Save. Enter makes a new line. **Ctrl/⌘ + Enter saves** (`aria-keyshortcuts`). Esc closes, behind the discard guard when dirty. Backspace at the start of a text block never removes the photo before it. |
| Composer, reorder mode | Each row: Move up, Move down, Remove (buttons, `aria-disabled` at the ends so they stay focusable). After a move, focus follows the moved row (F6). "Done" returns focus to the moved block. |
| Kind (create) | A native radio group: one Tab stop, arrows change the selection, and the helper is linked with `aria-describedby`. |
| Cover and photos | A visible button triggers a hidden `<input type=file accept="image/*">`. After a file is picked, focus stays on the next control ("Replace" or the photo's Remove). Upload start, finish and failure are announced; the percentage is not. |
| Toast | As on Home: Undo is the next Tab stop after the primary, and Esc dismisses it from anywhere when no dialog is open. |
| Photo viewer | A modal dialog: focus on Close, Esc closes, focus returns to the photo. |

### 6.5 Dialogs and sheets

| Dialog | Phone | ≥ 48 rem | URL | Dismissal |
|---|---|---|---|---|
| Quick-add (Home's) | bottom sheet | centred, 28 rem | none | ✕, Esc, backdrop (press and release outside) |
| Entry sheet | bottom sheet | centred, 28 rem | none | ✕, Esc, backdrop |
| Confirm | small, centred | small, centred | none | Keep or Esc only (no backdrop) |
| Note composer | full screen; tool bar on the keyboard (visualViewport, as Home's sheet) | centred, ≈ 40 rem, ≤ 90 dvh, footer fixed | `?note=` (push) | ✕, Esc and Back, all guarded when dirty; no backdrop dismissal (data loss) |
| Photo viewer | full screen | centred, ≤ 90 vw × 90 vh | none | ✕, Esc, backdrop |

- **Stacking:** only the confirmation stacks, on top of the entry sheet or the composer. Nothing else stacks.
- **Live regions:** every dialog carries its own polite and alert regions, because the page's region is inert under a modal (Home's known gap). Partner announcements are mirrored into whichever dialog is open.
- **Recommendation shared with Home:** let Android Back close any open sheet by pushing a history state on open. Today, Back with a sheet open leaves the page and drops a typed amount. The composer gets this through `?note=`.

### 6.6 Drag alternatives [WCAG 2.5.7, 2.5.1]
**There is no dragging anywhere in this area:**
- no swipe-to-delete;
- no drag-to-reorder;
- no slider (percent uses the field and ±10);
- no swipe between tabs;
- no pull-to-refresh (TanStack refetches and realtime cover it).

If a sheet ever gets a swipe-down handle, ✕, Esc and the backdrop remain the alternatives.

### 6.7 Concurrency: the three-way merge (goal edit)
**The three versions of each field:**
- **B (base):** the row when the form opened, or when it was last merged.
- **M (mine):** the form values.
- **T (theirs):** the latest row, from a realtime refetch or the 409 body.

**For each editable field** (title, description, target amount, target date, cover):

| B → M | B → T | Result |
|---|---|---|
| unchanged | changed | take T; caption "Changed by {name}" until the field is edited or the form is saved |
| changed | unchanged | keep M |
| changed | changed, same as M | nothing to do |
| changed | changed, different | keep M; inline "{name} changed this to "{T}"." and **Use theirs** |

**Then:**
- B becomes T, and `updatedAt` becomes `T.updatedAt`.
- The target-completion preview re-runs.

**Naming who changed it:**
- If the realtime notice's `actorId` is the partner, show their first name.
- If it is me, say "on your other device".
- If it's unknown (a 409 with the socket down), say "on another phone".

**On a 409 where no field needs marking** (only completion or `updatedAt` changed), retry once silently. A second 409 shows the notice.

**Journal notes:** a note is saved whole (D13), so there's no merge. See F7.

### 6.8 Feedback: what responds, and where [Norman; Doherty]

| Action | Immediate | Then |
|---|---|---|
| Add or Update progress | the sheet closes and the bar animates (optimistic) | toast with Undo, above the floating primary (phones) or 24 px from the bottom (wide) |
| Delete an entry (confirmed) | the row is removed and the figures update | toast, no Undo; focus to the next row |
| Save a note | the composer closes and the note appears at the top | focus on the note; "Note saved." |
| Create a goal | navigation to the new detail | "Goal created." |
| Save an edit | back to the detail with the new values | toast "Changes saved" |
| Delete a goal | navigation to the list | toast "{title} deleted" |
| Photo upload | progress inside the photo's arch | a done or failed state on the block |
| A press on any `aria-disabled` control | nothing changes | its reason is shown inline next to it, and announced once |
| A partner change | in place, with no toast; the bar animates only when a contribution lands | one polite announcement |

### 6.9 Destructive actions: undo or confirm

| Action | Mechanism | Why |
|---|---|---|
| Undo of the contribution I just added | **Undo** in the toast, no confirmation | reverses my own act within seconds; Home's precedent |
| Delete a contribution from History | **Confirm**, with the consequence | design system binding; no undelete; shared data; completion side effects (D5) |
| Remove a queued entry | **Confirm** (same flow) | one rule for every delete from History |
| Remove a block from a draft | **inline Undo**, no timer | not saved and not shared |
| Delete a note | **Confirm**, naming its photos | shared; its assets are destroyed |
| Delete a goal | **Confirm**, with counts and the amount | cascades to everything, for both of you |
| Discard a dirty draft (create, edit, composer) | **Confirm** only when dirty | protects typed input [WCAG 3.3.7, Postel] |
| Remove or replace a cover in Edit | none; applies on Save, and Cancel reverts | not committed until Save |

### 6.10 What the system does for the user [Tesler]
- **Create:**
  - the kind defaults to Money;
  - the currency comes from the space, shown as a suffix;
  - "20 000", "20,000" and "20000,50" all parse.
- **Quick add:** from the detail the goal is pre-picked, with no step A.
- **Derived values are computed, never typed:**
  - completion (there is **no "Mark as done" button**: you reach the target, or set 100%);
  - "to go";
  - month groups and "this month", in the space's time zone;
  - the share.
- **Composer:**
  - it opens on a focused text block;
  - a text block follows every photo;
  - empty text blocks are dropped on save;
  - photos are downscaled and stripped of EXIF and GPS on the device;
  - Save waits for uploads instead of refusing.
- **Drafts** are kept through navigation and a reload.
- **Retries are safe:** client ids make them idempotent, and a 409 that touches nothing editable retries silently.
- **The list order is computed** (D1). Nothing in this area needs a sort control.

### 6.11 Screen-reader semantics
- **Goals list headings:**
  - h1 "Goals";
  - h2 "Open" (visually hidden if the Art Director prefers) and h2 "Done";
  - h3 for each goal title.
- **Goal detail headings:**
  - h1 is the goal title;
  - visually hidden h2 "Progress";
  - h2 "Who put in what";
  - the Stats disclosure button sits inside an h2;
  - h2 "History" and h2 "Journal": visible from 64 rem, visually hidden inside the tab panels below it;
  - h3 for each month group;
  - each note is an `<article>` with an h3 "{name} · {date}".
- **Progress:** `role="progressbar"` with `aria-valuetext` ("14,250 MAD of 20,000 MAD"). The Done state has text, not only colour. [WCAG 1.4.1]
- **Tabs:** their names carry the count ("History, 7 entries"). Counts update silently; the polite announcement carries the news.
- **Images:**
  - **Covers** are decorative (`alt=""`): the title is beside them, as in Home's GoalCard.
  - **A journal photo's alt** is its description if one was given (Q1). Otherwise: "Photo in Sara's note, Sat 7 Nov".
- **Amounts** are marked `dir="ltr"` inside RTL text (Home's i18n notes).
- **One polite page region** carries partner news and online and offline changes (Home's `#live`), mirrored inside an open dialog. Announcements are never made on load or for my own actions, except the confirmations named above.

### 6.12 Motion
- The progress fill animates only when a contribution lands, mine or my partner's. A delete or an edit updates without motion. [DS]
- No animation on tab switches.
- Reorder moves are instant under reduced motion; otherwise they're a short slide (Art Director).
- Sheets and toasts follow Home's motion, including the reduced-motion path (opacity only).

---

## 7. Open questions

### For the architect (none blocks the prototypes; the defaults are in brackets)
1. **Q1 · Image alt text.** Allow an optional `alt` (about 250 characters) in the `goal_note_blocks.image` and `goals.cover` JSON. It's a Zod change only. [Default: the composer offers "Add a description"; without it, the generated alt above is used.]
2. **Q2 · Note size versus the 64 KB body cap.** Text blocks allow 10,000 characters each, with no limit on the number of blocks, and Arabic is 2 bytes per character in UTF-8, so a few full blocks exceed 64 KB. Either cap a note's total text (for example 20,000 characters, with a counter) or raise the cap for `PUT …/notes/:id`. [Default: a client cap of 20,000 characters per note.]
3. **Q3 · Photos per note.** There's no limit in the architecture. [Default: 10.]
4. **Q4 · Disabled mode with existing images.** With the keys empty, `/api/config` has no `cloudinaryCloudName`, so URLs can't be built for assets that already exist. Either keep returning the cloud name for delivery, or accept placeholders. [Default: a "Photo unavailable" placeholder that can be removed in edit.]
5. **Q5 · Does a completion recompute change `goals.updated_at`?** If it does, a partner's completing contribution makes my open edit form get a 409. The client retries silently when nothing editable differs (§6.7). Please confirm that the 409 body is the full current row.
6. **Q6 · Pagination** for `GET …/entries` and `GET …/notes`: a cursor, with page sizes of 30 and 10.
7. **Q7 · Stats for general (percent) goals:** count, per-member update counts, last activity, and this month's first and last percent. Define them in `services/stats`.
8. **Q8 · Author-only note editing:** a UI rule only, or enforced by the API (`403` on `PUT` and `DELETE` of someone else's note)? [Default: enforce it in the API too, so a second client can't bypass it.]

### For the user
None is blocking; each has a sensible default above. These three are reversible decisions worth a glance:
- **(a)** On phones, the create and edit form routes hide the bottom nav (D7).
- **(b)** On a done goal, the floating primary becomes "Write a note" (D4).
- **(c)** Journal notes are edited and deleted only by their author (D6).

---

## 8. For the builders: prototype states and example data

**One query parameter per URL.** Two (joined with `&`) break the kit's screenshot command on Windows (see Home's build notes). Put the goal in the hash route (`#/goals/wedding`) and the state in `?state=`.
- **List:** `populated` · `empty` · `all-done` · `loading` · `offline` · `stale` · `error` · `uploads-off` · `live` (Youssef adds 200 to Wedding fund after 0.3 s)
- **Detail** (`#/goals/wedding|guest-room|honeymoon|sofa`): `populated` · `journal` · `stats-open` · `loading` · `partial` · `offline` · `error` · `not-found` · `uploads-off` · `solo` · `entry-sheet` · `confirm-delete` · `toast-added` · `toast-completed` · `toast-queued` · `toast-deleted` · `live-add` · `live-note` · `live-goal-deleted` · `composer` · `composer-photos` · `composer-uploading` · `composer-failed` · `composer-reorder` · `composer-offline` · `composer-conflict`
- **Form** (`#/goals/new` or `#/goals/wedding/edit`): `invalid` · `percent` · `details` · `cover-uploading` · `cover-failed` · `offline` · `uploads-off` · `completion-preview` · `partner-changed` · `conflict` · `not-found` · `delete-confirm`

**Example data.** Everything new is example data, labelled on screen. The figures add up.
- **Wedding fund:** 20,000 MAD target, by Sat 12 Jun 2027 (the design system's deadline).
  - **Entries, newest first:**
    - Sara 500, "bonus month", Sat 7 Nov
    - Youssef 1,000, Sun 1 Nov
    - Sara 750, Wed 28 Oct
    - Youssef 3,000, Thu 15 Oct
    - Sara 2,000, Thu 1 Oct
    - Youssef 2,500, Tue 1 Sep
    - Sara 4,500, Sat 1 Aug
  - **Sums:** a total of 14,250. Sara 7,750 (54%), Youssef 6,500 (46%).
  - **Stats:** 7 contributions, average 2,036 MAD, largest 4,500 MAD, this month 1,500 MAD.
  - **Notes:**
    - Sara, Sat 7 Nov: one text block.
    - Youssef, Sun 1 Nov: text, then a photo, then text. The photo is an example placeholder in the arch, because there are no photos in `assets/`.
- **Paint the guest room** (Home's placeholder, percent): Youssef 60% (yesterday, Sun 8 Nov), Sara 40% (Sat 24 Oct), Youssef 20% (Sat 10 Oct). That's 3 updates (Sara 1, Youssef 2), and this month it went from 40% to 60%.
- **Honeymoon** (Home's placeholder): 0 of 30,000 MAD, with no entries and no notes. It's the empty case.
- **New sofa:** 6,000 MAD, done.
  - **Entries:** Youssef 1,000 on Fri 30 Oct (the design system's "added 1,000 · Oct 30"), Sara 2,500 on Tue 15 Sep, and Youssef 2,500 on Sat 15 Aug.
  - **Reached** Fri 30 Oct, by Youssef.
- **Saved together:** 14,250 + 6,000 = 20,250 MAD (the design system's figure).
