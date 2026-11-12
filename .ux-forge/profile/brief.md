# Brief: Zamane Profile and Settings (reorganise and redesign, with a stronger zellige identity)

**Mode:** studio (the user's request, Thu 12 Nov 2026): "organize redesign the profile and settings page and make sure it has more zellige identity". **No review rounds** (the user's standing preference). Deliverable: a standalone prototype in `.ux-forge/profile/`, then a port to the React app replacing the TEMP page `src/client/routes/_app/profile.tsx`.

## What the page must do (all exists today in the TEMP page; nothing new on the server)
- **You:** change your first name ("As your partner will see it.", max per `updateMeSchema`), saved with "Name saved."
- **Your space:** the space name, its two members (PartnerAvatar + name + "partner A/B"), the **invite code** (shown grouped with `formatInviteCode`, monospace/tabular, `dir=ltr`), **Copy code** and **New code** (rotates it, announces the new code). When the partner hasn't joined (solo) the invite is the main thing on the page. The members list refetches on open.
- **Appearance:** theme choice, "Same as this phone" / Light / Dark, "Saved on this device only."
- **Password:** current + new (at least 10 characters), "This signs you out on your other devices." Success notice: "Password changed. You've been signed out on your other devices."
- **Sign out:** "Signs you out on this device." Needs a connection when offline ("Signing out needs a connection.").
- **About:** a link to the privacy page (`/privacy`) and the app version. Nothing else is invented: no avatars upload, no language switch, no notifications, no account deletion (not in the product).
- Offline: reading works; the name save, password change, new code and sign out need a connection and say so.

## Users
Sara (partner A, majorelle) and Youssef (partner B, terracotta), each on their own phone. They visit this page rarely: to share the code, to fix a name, to switch to dark, to sign out. Success action: **find the thing in seconds**, and for a new space, **send the invite code to the partner**.

## What "reorganise" means
The TEMP page is one long stack of equal sections. Group it by what the person is doing, in this order: (1) the **couple card** (who is in this space: both members, the space name; in solo, the invite code is the hero), (2) **You** (name), (3) **Appearance**, (4) **Security** (password), (5) **About and sign out**. On 48rem+ use a two-column layout (a sticky in-page section list or a card grid), not a stretched single column. Task page? No: the nav stays (Profile is the fifth tab).

## What "more zellige identity" means (the Art Director's job inside the system)
Zellige is Moroccan glazed tilework: geometric tessellation, a limited glaze palette, small hand-cut pieces, grout lines. The system's colour **zellige** (green) means "done" on Goals/Trips/Shopping; do not use it as a status colour here. The identity must come from the **geometry and craft**, drawn in the existing tokens (majorelle, terracotta for partner B only, sand, ink, zellige as a glaze colour in decoration only): 
- A drawn **tile motif** (an eight-point star/khatam or interlaced star-and-cross tessellation as inline SVG or CSS, `aria-hidden`, scalable, light and dark, low contrast so text on it passes AA, no raster images) used with intent: the **couple card header** (two partner colours as two glazes meeting in the pattern), the **invite code presented as a set tile or slip with a grout frame**, section dividers or the card corners.
- Pieces and grout: cards with a hairline grout edge, small chamfered or star-notched corners instead of generic rounded rectangles, if they stay readable. Rhythm from a repeating module, not decoration noise.
- Restraint: identity on the couple card, the code and the headings, not wallpaper behind forms. Forms stay calm and fast. Reduced motion: no animation needed; static pattern. Forced colours: the pattern disappears and the layout still holds.
- The arch is for imagery only (not here). Young Serif for display headings, Figtree for text, sand surfaces, majorelle primary. No generic "settings list with chevrons" look, no icon-in-a-circle rows.
- Zellige and the brand: read `Zamane Design System.html`, `.ux-forge/shopping/zamane.css` and `.ux-forge/trips/zamane.css` for tokens and components; the logo mark files in `assets/`-level SVGs (`zamane-mark*.svg`) show the geometry the brand already uses, read them to keep the motif in the same family. Logo files are read-only.

## Platform and stack
Mobile-first PWA, 320 px and up, light and dark, safe areas, 44 px targets, WCAG 2.2 AA. Target stack React 19 + TanStack Router; Goals, Trips, Shopping are built. Prototype: plain HTML/CSS/JS, no modules, `file://` works, `profile.html` + `shared.js` (the `window.Z` layer, take it from `.ux-forge/shopping/shared.js`, strip what Profile does not need) + `profile.css` + `profile.js`. `?state=` fixtures: `populated` · `solo` (partner not joined; invite code is the hero) · `loading` · `error` (couldn't load your space) · `offline` · `saving` (name save pending) · `name-error` · `password-error` · `password-done` · `code-copied` · `code-rotating` · `dark` is the theme not a state.

## Constraints the port depends on (do not break)
- Keep these hooks: `data-testid="invite-code"` on the code, `#sign-out` on the sign-out button, `#pf-name` / `#pf-display-name` (name form and field), `#pf-pw`, `#pf-current`, `#pf-new`, `#pf-pw-done` (the success notice text must be exactly "Password changed. You've been signed out on your other devices."), `#signout-reason`.
- Existing strings stay unless the Writer-quality pass improves them; list every changed or new string in build-notes.md.
- Page title "Profile" and h1 "Profile" (focus lands on the h1 on arrival).

## Assumptions
- No server changes. The app version comes from `__APP_VERSION__`. The space's creation date is not shown (not in the API response).
- Prototype "today": Mon 9 Nov 2026; Sara (A) and Youssef (B); space name "Sara & Youssef" or the seed's name.
