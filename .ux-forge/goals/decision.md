# Decision: Goals area

**Chosen:** **B · Doorway** (`directions.md`). The user picked it from the three previews on Tue 10 Nov 2026. The Art Director had recommended C · Two hands.

## What the user's choice means
- **The cover is the hero.** Every goal is a doorway (riad arch).
  - **Detail:**
    - the doorway is full content width;
    - it is 3:2 with a photo, capped at 15 rem;
    - it is 2:1 with no photo, showing the 96 px initial.
  - **List:** 5:4 arches in 2-up tiles.
  - **Journal:** photos are full text width, in 4:5 arches capped at 28 rem.
- **Done is tiled.** A zellige surround closes around the doorway: 3 px sand gap and 4 px zellige on the detail, 2 + 2 px on the list. It is never alone; the Done badge and "Reached {date} · {name}" carry the meaning in text. [WCAG 1.4.1]
- **One orchestrated moment: completion.**
  1. The bar fills and turns zellige.
  2. The surround closes in over 320 ms, ease-out.
  3. Home's saffron "Goal reached." toast rises at the primary.
  4. With reduced motion, the surround appears without travelling.
- **Text on the sand, no containers** for History rows and journal notes. Hairlines separate them. List tiles are the only raised cards; done rows are flat.

## B's risks, and what we hold the build to
1. **Covers may be rare** (uploads optional or off), which risks pale arches with a big letter everywhere, the W/P/H sameness Home's critic noted.
   - **Hold:**
     - the bare ratio is 2:1, so an empty doorway costs less height;
     - the initial is set large and confident (Young Serif 96 / 40 px), never a pale ghost;
     - the prototype shows **Wedding fund with an example cover** (a sunken arch labelled "Example photo"), so both ratios are visible. Every other goal uses the initial.
2. **Vertical cost on phones.** At 320 × 568 the share is below the fold.
   - **Hold:** the number (14,250 MAD) must be above the fold at 320 × 568, as the Art Director measured (y ≈ 400). The Critic checks this.
3. **Home continuity** (IA D1). The list keeps Home's order, but the tiles aren't Home's GoalCards.
   - **Hold:**
     - the tile keeps the GoalCard's content order (title → figure → bar → who and when → by-date);
     - it keeps the same progress bar and the same attribution line, so it reads as the same object, stood upright.
4. **Narrow tiles at 320 px** (114 px of content): titles can wrap to three lines.
   - **Hold:** subgrid rows, so figures and bars share a line across the pair, with `overflow-wrap: anywhere` on titles.
   - **Fallback:** below 20 rem (zoom, or 200% text), tiles go one-up.
5. **Image weight.** Every arch reserves its `aspect-ratio`. Photos use `loading="lazy"` below the fold and Cloudinary `f_auto,q_auto` with a `w_` srcset in the real build.

## IA questions settled by the user (Tue 10 Nov 2026)
- **(a)** On phones, the create and edit form routes **hide the bottom nav**. They are task pages with ✕ Cancel (D7).
- **(b)** On a done goal, the floating primary becomes **"Write a note"**. "Add more" (money) or "Update progress" (percent) stays a ghost button in the progress block (D4).
- **(c)** Journal notes are **edited and deleted only by their author** (D6). The API should enforce it too (IA Q8: 403).

## Copy decisions (from `copy.md`'s open items)
1. **Toast duration** is **10 s**, as built on Home. Home's `copy.md` still says 6 s and should be corrected to match.
2. **Year in dates.** The year is added when a date isn't in the current year, for example "by Sat 12 Jun 2027".
   - This is a shared rule with Home.
   - Home's trip dates (21–25 Nov) are this year, so nothing on Home changes.
   - Month headings in History follow the same rule: "November", but "December 2025".
3. **"60%" on percent tiles.** Plain "60%", as on Home. The tile's second figure line ("of 20,000 MAD" on money goals) stays empty for percent goals, and subgrid keeps the bars aligned.
4. **The detail's offline notice** is Home's notice verbatim, plus "Editing, deleting and saving notes need a connection." Accepted.
5. **Arabic money format:** open. Settle `{amount} MAD` against an Arabic-script formatter before translation.
6. **Values marked [VERIFY]:**
   - **Open item for the architecture.** It must confirm the maximum lengths, the amount cap, the photo formats, the 10 MB and 10-photo limits, and the note-level cap.
   - **Prototype defaults:**
     - title: 80 characters;
     - note on an entry: 120;
     - description: 500;
     - 10 photos per note;
     - 20,000 characters per note.
7. **Photo descriptions:** IA Q1 is accepted (an optional `alt`), so the description keys stay.
8. **Percent Undo label:** add the percent variant. It is a new key next to Home's `toast.undo.label`.
9. **Photo count on goal delete:** open item for the architecture. The prototype uses example counts.

## Example data (prototype only, labelled on screen)
`ia.md` §8, unchanged. "Today" is fixed at **Mon 9 Nov 2026** so relative times match Home ("2 days ago" is Sat 7 Nov). Wedding fund has an example cover. The other goals use the initial.
