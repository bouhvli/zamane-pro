# Build notes: Zamane Trips (direction B · Saffron light, with C's budget bar)

## Files
**Prototype:** `trips.html` is one shell with a hash router. Open it in a browser.
- **Routes:**
  - `#/trips`
  - `#/trips/:id`, with `?view=plan|places|prep`, `?entry=new|<id>[&date=]`, `?place=new|<id>` and `?schedule=<placeId>` in the hash
  - `#/trips/new`
  - `#/trips/:id/edit`, with `?focus=dates|budget`
- **Trip ids:** `chefchaouen` (coming up), `lisbon` (happening now, always reachable), `fes` (no dates), `essaouira` (past).

**Shared layer (Director):**
- `shared.js`: its API summary is at the top of the file. It holds the data, trip-days, budget, writes, the light band, the budget bar, the tally, toast, confirm and routing.
- `zamane.css`: the Goals base plus the Trips tokens and components at the end.

**Views:**
- `list.js` and `list.css` (Director).
- `detail.js` and `detail.css`: see `build-notes/detail.md`.
- `dialogs.js` and `dialogs.css`: see `build-notes/dialogs.md`.
- `form.js` and `form.css`: see `build-notes/form.md`.

**Screenshots:** `screenshots/<view>-<state>/`.

## States
- **One query parameter, before the hash:** `trips.html?state=<s>#/trips/<id>`.
- **Use a `file:///` URL with the kit's `shoot.mjs`.** A relative path gets URL-encoded, so the `?`/`#` become part of the file name and every capture fails.
- **Global states:** `offline`, `uploads-off`, `solo`, `empty`, `only-past`, `trip-now`, `now-last-day`, `now-nothing-left`.
- **List states:** `populated`, `trip-now`, `empty`, `only-past`, `loading`, `error`, `stale`, `offline`, `uploads-off`, `live`.
- **Detail, dialog and form states:** see each view's notes. Each has a table of fixture URLs.

## Tokens added (proposed for the design system)
- **Light:**
  - `--light-band-h` 4rem
  - `--now-cell` 3.5rem
  - `--dur-light` 240ms
  - aliases `--light`, `--on-light`, `--light-soft`
- **Arch thumb:** `--arch-thumb-w` 2rem and `--arch-thumb-h` 2.5rem.
- **Prep tally:** `--tally` 8px and `--tally-gap` 2px.
- **Budget bar:**
  - `--bbar-h` 12px
  - `--budget-mark-w` 2px and `--budget-mark-h` 20px
  - `--bbar-pencil-min` 12px
  - aliases `--budget-fill`, `--budget-track`, `--budget-mark`
- **No new colours.** Over budget, the whole bar uses danger and never sits next to terracotta.

## Integration fixes by the Director
- `detail.js`: the Prep group count ("0 of 5") no longer breaks across lines in the narrow ≥ 80 rem column.
- `list.css`: on phones, the past-trip pill moves under the text so the dates don't truncate.

## Review round (one, at the user's request, Wed 11 Nov 2026)
**Reviews:**
- **Critic:** REVISE, 3.9 / 5, with 1 blocker and 3 majors (`reviews/critique.md`).
- **Accessibility:** FIX REQUIRED, with 1 major and 6 minors (`reviews/accessibility.md`).

**Director click-through:** 38 cross-file flow checks pass, with no console errors. The script is in the session scratchpad, not the repo.

**Fixed in this round:**
- **Blocker, offline during the trip:** phones show a one-line notice, "Offline. Ticks and new places sync later.", and the tab gaps go to 0.
  - The Now row's tick and first line are back above y 504 at 320 × 568.
  - This is a new string; the Writer should confirm it.
- **Major, today's rows on phones during the trip:** done rows collapse to one line.
- **Major, the evening caption:** it names the next item, for example "Next: Flight home, tomorrow 18:40", and opens its sheet.
- **Major, wide screens:**
  - the doorway column is 15 rem;
  - the budget breakdown sits on one row, and "Planned adds up…" moves behind a "What counts" disclosure (new string);
  - during the trip, identity sits on the left and the budget on the right, so the Now row is on the first screen at 1024 × 768.
- **Major, no budget means no progress bar** (`Z.budgetBar`). The summary shows "Planned 440 MAD" and Set a budget.
- **Major (a11y), keyboard Undo:** a keyboard-driven Undo toast no longer times out. It stays until Undo, Esc, the next toast or a route change, and its announcement says where Undo is.
- **Minor fixes:**
  - a no-break space before MAD;
  - a zero estimate reads "Free";
  - the trip thumb sits before the title;
  - a sheet hides while a confirmation sits over it;
  - a lone list tile spans the row;
  - the top bar aligns with the 80 rem detail;
  - focus moves to the column h2 when a resize hides the tabs;
  - the dead `.on-light .tick` rule is removed;
  - in forced colours, the pencil segment of the budget bar is distinct.

**Not fixed (accepted):**
- **44 px targets for Edit and toast Undo:** they already have invisible hit areas that extend them to 44 px (`.btn-sm::before`, `.toast-undo::before`); the audit measured only the visible box.
- **Read sheets don't push history,** so Android Back leaves the trip while a sheet is open. This isn't a WCAG failure.
- **Critic polish not done:**
  - Essaouira's "0 ideas" wording;
  - example hints under filled titles in the edit forms;
  - the conflict notice in the plan item form at 390.
- **Not re-reviewed after the fixes.** Only the Director checked them, with screenshots and the flow script.

## Still open
- **The failed-request states are wired but unreachable** without a shared `Z.latency` / `Z.failNext()`.
- **The shared-layer requests** are listed in each view's notes. None blocks anything:
  - `Z.prevPath`;
  - a history helper for the read sheets;
  - moving the form layout tokens.
- **Writer follow-ups:**
  - the error-summary string ("N fields need your attention.");
  - the "Start time:" / "End time:" merge-mark prefix;
  - correcting Home's `copy.md` toast duration from 6 s to 10 s.
- **Architecture questions A1–A12** are open: see `ia.md` §7.
- **Not checked on real devices:**
  - iOS and Android keyboards;
  - native date and time inputs (12-hour times on en-US phones, ia §7 g);
  - safe areas;
  - screen readers;
  - 200% OS text.
