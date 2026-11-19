# Brief: Profile → settings section redesign

**Mode:** solo (user, Thu 19 Nov 2026: "[solo] redesign the settings section"). Built directly in the React app
(standing preference for Profile), no HTML prototype, no review rounds.

**Scope:** the five settings cards under the couple card on `/profile` (You, Appearance, Security, Your data,
About and sign out). The couple card (members, space name, invite code, currency/time zone) keeps its design.
Nothing new on the server.

**Users:** Sara and Youssef, each on their own phone, rarely here. Success: find the setting in seconds
(sign out, theme, logo, password, email, export), see current values without opening anything.

**Problems in the build before this one** (screenshots/before/):
- 2×2 card grid at ≥48rem: cards stretch to the tallest neighbour; "You" is ~70% empty, "About" is orphaned.
- 390 px: ~2,700 px of five equal cards; every action is "grey sentence, then outlined button" ×7, so
  nothing scans and current values (email, version) are buried in sentences.
- Theme tiles all read as "blue star pattern": Light vs Dark is not obvious. "Same as this phone" is wrong on a
  laptop and wraps on phones.
- Leave and Delete sit at Export's weight, under a hairline.

**Decision (user-picked, AskUserQuestion): "Index + rows".**
- ≥48rem: a sticky "Settings" index on the left (current section marked with the khatam star), one column of
  sections on the right. Page max width 56rem so the column reads well and aligns with the couple card.
- Phone: the same sections stacked, no index.
- Each section: serif h2 with a small star, then one grouped list (hairline grout between rows). A row = title +
  current value or one-line note, with a compact action at the end; forms open inside their row.
- Regrouped: **You** = first name + email (identity); **Security** = password + other devices.
- **Your data**: export row, then a separate "Leave or delete" list with a danger edge.
- **About**: version (with the zellige update button) and Privacy; **Sign out** stands alone at the end.
- Theme tiles become mini screens in each theme's own colours (zellige band + a card), so Light and Dark differ
  at a glance. "Same as this phone" → "Automatic".

**Kept:** every e2e hook and accessible name (`#sign-out`, `#pf-display-name`, `#pf-pw`, `#pf-current`,
`#pf-new`, `#pf-pw-done`, `#signout-reason`, `#pf-email-*`, `#pf-dev-*`, `#pf-export`, `#pf-leave`,
`#pf-delete`, "Export my data", "Change email", "Leave space", "Delete my account", "Sign out other devices").
Short visible labels carry the rest of the name in visually hidden text (WCAG 2.5.3, the visible text comes first).

**Re-shoot:** `node .ux-forge/settings/shoot-app.mjs .ux-forge/settings/screenshots/after [paired|solo|offline]`
with `pnpm dev` running on :5000 (the API is mocked; nothing reaches the database).
