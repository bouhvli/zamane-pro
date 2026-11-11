# Build notes: Zamane Goals (direction B · Doorway)

## Files
- **Prototype:** `goals.html` is one shell with a hash router. Open it in a browser.
  - **Routes:**
    - `#/goals` (list)
    - `#/goals/:id` (detail; `?view=history|journal` and `?note=new|<id>` in the hash)
    - `#/goals/new`
    - `#/goals/:id/edit`
  - **Goal ids:** `wedding`, `guest-room`, `honeymoon`, `sofa`.
- **Shared layer** (Director):
  - `shared.js`, whose API summary is at the top of the file: data, derived values, writes with 409 and 404, formatting, `Z.doorway`, `Z.bar`, toast, the quick-add sheet, the confirmation dialog, routing and fixtures;
  - `zamane.css`, with the design-system tokens and the Doorway additions;
  - `goals.html`.
- **Views:**
  - `list.js` and `list.css` (Director);
  - `detail.js` and `detail.css`, notes in `build-notes/detail.md`;
  - `composer.js` and `composer.css`, notes in `build-notes/composer.md`;
  - `form.js` and `form.css`, notes in `build-notes/form.md`.
- **Screenshots:** `screenshots/<view>-<state>/` and `screenshots/composer-*`.

## States
Add one query parameter before the hash: `goals.html?state=<s>#/goals/<id>`. An `&` breaks the kit's screenshot command on Windows.
- **Global** (they persist across routes):
  - `offline` and any `*-offline`;
  - `uploads-off`;
  - `solo`;
  - `empty`;
  - `all-done`.
- **List:**
  - `populated` · `empty` · `all-done` · `loading` · `offline` · `stale` · `error` · `uploads-off`;
  - `live`: Youssef adds 200 to Wedding fund.
- **Detail, form and composer:** see each view's notes.

## Tokens added (proposed for the design system)
- **Doorway:** `--doorway-ratio` 3/2, `--doorway-ratio-bare` 2/1, `--doorway-max` 15rem.
- **Arch initials:** `--arch-initial-xl` 96px, `--arch-initial-tile` 40px.
- **Surround:** `--surround` 4px, `--surround-gap` 3px, `--surround-sm` 2px, `--dur-surround` 320ms.
- **No new colours.** The surround uses `zellige` with a `surface` gap.

## Shared-layer changes made after the engineers' requests
- `elsewhere()` now unmounts the previous view (detail 1).
- `Z.announce` targets the topmost open dialog: `showModal` is wrapped to keep a stack (detail 3, composer 4).
- `Z.setOffline(off, {silent, message})` (detail 2 and 4).
- Browser `online` and `offline` events call `Z.setOffline` (form).
- Disabled style for `.btn-danger` (detail 5, composer 3, form).
- The amount-input style is scoped to `#sheet`, not every `.sheet` (composer 2).
- `Z.placeSheet` skips `.composer` and `[data-no-place]` (composer 1).
- `Z.doorway` shows no character for an empty title (form).

## Not done (recorded; low priority)
- `Z.prevPath`: the form keeps its own route stack.
- Moving the form's layout tokens into `zamane.css`.
- Shared latency and failure simulation.
- `Z.composer.clearDrafts()` on logout: there is no logout in this prototype.
- Sizes from IA §6.5 for the confirmation and the sheet: they follow Home's sheet.

## Open copy issues (for the Writer)
These labels fail WCAG 2.5.3 (Label in Name). The builders used the visible text as each name and kept copy's text as a description:
- More / Less on the description;
- "Try uploading photo {n} again";
- "Discard the restored draft";
- "Use their version of {field}".

The composer's 409 also says "your other device", because notes are author-only.

## Known gaps
- Not checked on real devices: keyboard behaviour on iOS and Android, safe areas, screen-reader output, 200% OS font size.
- No simulation of 429 or 503 for uploads.
- A photo still uploading when the page reloads is lost from the draft.
