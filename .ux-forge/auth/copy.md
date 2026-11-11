# Copy: Zamane auth and space setup

**Format.** `id` | string | notes. `{braces}` are values the app fills in. Counts use **ICU plural syntax** inside one whole-sentence key, so French (0 is singular) and Arabic (zero/one/two/few/many/other) are added by translators without code changes. No string is assembled from fragments. Links and bold inside a sentence use **rich-text tags** in the same key (`<link>…</link>`, `<b>…</b>`), so word order can change per language. Dates, times and names arrive pre-formatted.
**Ids.** `auth.*` (sign in, create account, forgot, reset, launch, invite link), `setup.*` (choice, start, join, switch), `email.reset.*` (the email), `common.*` and `a11y.*` shared. Home ids (`home.*`) appear only where this area changes them (section "Changes to Home").
**Inherited and binding.** Voice and glossary from `home/copy.md` and `goals/copy.md`. Home's settled strings are reused by reference, not reworded: `home.offline.notice`, `home.offline.announce`, `home.online.announce.plain`.
**Accessible names.** Every `.label` string **contains the visible text of its control, in the same order** (WCAG 2.5.3). Where a name is longer than the visible text, the visible text comes first. Pending buttons change visible text and accessible name together.
**Enumeration.** Sign in, Forgot and Reset never reveal whether an email has an account. The one accepted exception is Create account's "That email already has an account" (decision A6). Join never reveals why a code failed.

---

## Voice

Warm, plain, specific. Calm when something is wrong. No exclamation marks, no emoji, no "Oops", no blame ("You entered…"), no apology theatre.

| Adjective | This | Not that |
|---|---|---|
| Warm | "Your shared place for goals, trips and shopping." | "Welcome to the all-in-one collaboration platform." |
| Plain | "That email and password don't match." | "Authentication failed: invalid credentials." |
| Specific | "Codes don't use 0, O, 1, I or L. Check the code again." | "Invalid input." |

**Tone by moment**

| Moment | How it sounds | Example |
|---|---|---|
| Sign in (returning) | Short. Get out of the way. | "Sign in" |
| Create account, setup (first minute) | Friendly, one idea at a time, say who each path is for. | "I'm first. I'll invite my partner with a code." |
| Errors | What is true, what is kept, what to do next. | "Couldn't reach Zamane. Check your connection and try again." |
| Reset and recovery | Reassuring and exact: what happens, how long it lasts. | "It works once, for 1 hour." |
| Wrong credentials | Neutral. Never say which half was wrong. | "That email and password don't match." |
| Destructive (switch spaces) | Slower and exact. Names the thing, states the consequence, says it can't be undone because that is true. Safe button first. | "The space you started will be deleted, with 1 goal. This can't be undone." |
| Success | One calm line, past tense. | "Password changed." |

Format rules (binding): sentence case, verbs on buttons, first names, "you two" when speaking to the couple.

---

## Glossary

Home's and Goals' glossaries apply. Additions:

| Term | Meaning | Never call it |
|---|---|---|
| space | the shared place for the two of you ("Your shared place for goals, trips and shopping") | workspace, account, group, household, room |
| invite code | the 8-character code, `K7QM-4XPA` | key, token, PIN, passcode, join code. On the field label it is "Invite code"; in running text "code" alone is fine. |
| invite link | the link that carries the code (`/join#code=…`) | magic link, referral link |
| partner | the other person, by first name where known; "your partner" before they have joined | spouse, user, member, other half |
| account | the sign-in: first name, email, password | profile (Profile is a different screen), registration |
| Sign in / Sign out | start and end a session | log in, login, log out, sign on |
| Create account | make an account | sign up, register |
| Start our space / Join with a code | the two setup paths | create workspace, new space, accept invite |
| reset link | the link in the password-reset email | token, recovery link, magic link |
| password | what you type to sign in | passcode, passphrase |
| email | the address | e-mail, mail |
| first name | what you give at sign-up; partner sees it | display name, username, full name |
| switch (spaces) | join your partner's space and delete your own solo one | merge, move, transfer |

Pronoun rule: "you two" for the couple, "you" for the person, first name for the other, "your partner" only when they haven't joined.

---

## Document titles (unique per screen and state; `Page – Site`)

| id | String |
|---|---|
| `auth.title.signIn` | Sign in – Zamane |
| `auth.title.createAccount` | Create your account – Zamane |
| `auth.title.forgot` | Reset your password – Zamane |
| `auth.title.forgot.sent` | Check your email – Zamane |
| `auth.title.reset` | Set a new password – Zamane |
| `auth.title.reset.invalid` | Link doesn't work – Zamane |
| `auth.title.reset.success` | Password changed – Zamane |
| `setup.title.choose` | Set up your space – Zamane |
| `setup.title.start` | Start our space – Zamane |
| `setup.title.join` | Join with a code – Zamane |
| `setup.title.switch` | Join your partner's space – Zamane |
| `auth.title.launch.loading` | Loading – Zamane |
| `auth.title.launch.offline` | You're offline – Zamane |
| `auth.title.launch.error` | Zamane didn't open – Zamane |
| `auth.title.invite` | Opening your invite – Zamane |

---

## Shared strings

| id | String | Notes |
|---|---|---|
| `common.tryAgain` | Try again | (Goals) |
| `common.tryingAgain` | Trying again | pending |
| `common.cancel` | Cancel | |
| `common.show` | Show | visible label on the password toggle |
| `common.hide` | Hide | |
| `auth.form.errorCount` | {count, plural, one {# field needs your attention.} other {# fields need your attention.}} | `#form-alert`, shown only at 2 or more. Shared with Goals if it has no equivalent. |
| `auth.field.email.label` | Email | |
| `auth.field.password.label` | Password | |
| `auth.field.newPassword.label` | New password | |
| `auth.field.firstName.label` | First name | |
| `auth.field.password.rule` | At least 10 characters. | helper, shown up front on new-password fields |
| `auth.field.password.capsLock` | Caps Lock is on | helper line while on; not announced per key |
| `auth.example` | Example data. The names, email addresses and code on this screen are made up. | footnote, prototype only (Goals' `example.*` pattern); remove in production |
| `auth.brand.alt` | Zamane | brand lockup `alt` |

### Shared field errors

| id | String | When |
|---|---|---|
| `auth.error.email.empty` | Enter your email address. | |
| `auth.error.email.format` | Check your email address. It should look like name@example.com. | |
| `auth.error.password.empty` | Enter your password. | Sign in |
| `auth.error.newPassword.empty` | Choose a password with at least 10 characters. | Create account, Reset |
| `auth.error.password.short` | Use at least 10 characters. | |
| `auth.error.password.long` | Use 128 characters or fewer. | never `maxlength`; shown instead |
| `auth.error.firstName.empty` | Enter your first name. | |
| `auth.error.firstName.long` | Use 120 characters or fewer. | |

### Shared failure alerts (`#form-alert`, `role="alert"`)

| id | String | Notes |
|---|---|---|
| `auth.alert.rateLimited` | Too many tries. Wait a minute, then try again. | the primary is `aria-disabled` while waiting; no countdown |
| `auth.alert.rateLimited.over` | You can try again now. | polite status when the wait ends |
| `auth.alert.network` | Couldn't reach Zamane. Check your connection and try again. | input kept |
| `auth.alert.server` | Something went wrong on our side. Try again in a moment. | input kept; never pretends the action happened |
| `auth.status.backOnline` | Back online. | generic; screens use their own variant below |

---

## Screens

### 1. Sign in (`#/sign-in`)

| id | String | Notes |
|---|---|---|
| `auth.signIn.heading` | Sign in | h1 |
| `auth.signIn.email.label` | Email | |
| `auth.signIn.password.label` | Password | |
| `auth.signIn.password.toggle.show` | Show | visible |
| `auth.signIn.password.toggle.show.label` | Show password | contains "Show" |
| `auth.signIn.password.toggle.hide` | Hide | visible |
| `auth.signIn.password.toggle.hide.label` | Hide password | contains "Hide" |
| `auth.signIn.forgot` | Forgot password? | link-btn |
| `auth.signIn.submit` | Sign in | primary |
| `auth.signIn.submitting` | Signing in… | `aria-disabled` |
| `auth.signIn.newHere` | New to Zamane? <link>Create an account</link> | at 48 rem and up; on phones the link is a secondary button, same text |
| `auth.signIn.create.button` | Create an account | phone secondary button |

**States**

| State | id | String |
|---|---|---|
| `invalid` | field errors | see Shared field errors; count alert via `auth.form.errorCount` |
| `wrong` | `auth.signIn.alert.wrong` | That email and password don't match. Check them and try again, or <link>reset your password</link>. |
| `rate-limited` | `auth.alert.rateLimited` | Too many tries. Wait a minute, then try again. |
| `offline` | `auth.signIn.offline` | You're offline. Signing in needs a connection. |
| back online | `auth.signIn.online.announce` | Back online. You can sign in now. |
| `network-error` | `auth.alert.network` | |
| `server-error` | `auth.alert.server` | |
| `signed-out` | `auth.signIn.notice.signedOut` | You're signed out. (polite status; no email prefilled) |
| `session-ended` | `auth.signIn.notice.sessionEnded` | You've been signed out. Sign in again to carry on. |
| `reset-done` | `auth.signIn.notice.resetDone` | Password changed. Sign in with your new password. |
| `prefilled` | none | the email is filled; focus on Password |
| `guard-member`, `guard-no-space` | `auth.guard.redirect` | Taking you there… (prototype status only; production redirects silently) |

### 2. Create account (`#/create-account`)

| id | String | Notes |
|---|---|---|
| `auth.create.heading` | Create your account | h1 |
| `auth.create.firstName.label` | First name | |
| `auth.create.firstName.helper` | As your partner will see it. | |
| `auth.create.email.label` | Email | |
| `auth.create.password.label` | Password | |
| `auth.create.password.rule` | At least 10 characters. | persistent helper |
| `auth.create.submit` | Create account | primary |
| `auth.create.submitting` | Creating your account… | |
| `auth.create.hasCode.off` | Have a code from your partner? | the A5 toggle, idle |
| `auth.create.hasCode.on` | You'll enter your partner's code next. <undo>Undo</undo> | pressed. The whole text is the button's visible label, so the name matches. |
| `auth.create.hasAccount` | Have an account? <link>Sign in</link> | |
| `auth.create.privacy` | We use your name and email to run your account. <link>Read how we handle your data</link> | no checkbox, nothing pre-ticked. Privacy page needs an owner. |
| `auth.create.withCode` | Create your account, then you'll join with code {code}. | `with-code` notice above the first field; `{code}` is `dir="ltr"` |

**States**

| State | id | String |
|---|---|---|
| `invalid` | field errors | name, email, password errors; count alert |
| `email-taken` | `auth.create.error.emailTaken` | That email already has an account. <signin>Sign in instead</signin> or <reset>reset your password</reset>. (inline under Email; both links carry the email; reveals nothing else) |
| `rate-limited` | `auth.alert.rateLimited` | |
| `offline` | `auth.create.offline` | You're offline. Creating an account needs a connection. |
| back online | `auth.create.online.announce` | Back online. You can create your account now. |
| `network-error` / `server-error` | `auth.alert.network` / `auth.alert.server` | |
| `has-code` | `auth.create.hasCode.on` | |
| `with-code` | `auth.create.withCode` | |

### 3. Forgot password (`#/forgot-password`)

| id | String | Notes |
|---|---|---|
| `auth.forgot.back` | Back to sign in | link; visible text equals name |
| `auth.forgot.heading` | Reset your password | h1 |
| `auth.forgot.intro` | We'll email you a link to set a new one. | |
| `auth.forgot.email.label` | Email | |
| `auth.forgot.submit` | Send reset link | primary |
| `auth.forgot.submitting` | Sending… | |

**States**

| State | id | String |
|---|---|---|
| `invalid` | `auth.error.email.empty` / `auth.error.email.format` | inline; nothing sent |
| `rate-limited` | `auth.alert.rateLimited` | on the form or on Send again |
| `offline` | `auth.forgot.offline` | You're offline. Sending a link needs a connection. |
| back online | `auth.forgot.online.announce` | Back online. You can send the link now. |
| `network-error` / `server-error` | `auth.alert.network` / `auth.alert.server` | a `5xx` never says the email was sent |

**Check your email** (same route, `sent` step)

| id | String | Notes |
|---|---|---|
| `auth.sent.heading` | Check your email | h1 |
| `auth.sent.body` | If there's a Zamane account for <b>{email}</b>, we've sent a link to reset your password. It works once, for 1 hour. | the conditional carries the honesty; same text whether or not an account exists. `{email}` is `dir="ltr"`, wraps, never truncated. |
| `auth.sent.nothing` | Nothing yet? Check your spam folder, or send it again. | |
| `auth.sent.resend` | Send again | secondary |
| `auth.sent.resending` | Sending… | |
| `auth.sent.resent` | Sent again. | polite status, also shown beside the button (`resent`) |
| `auth.sent.differentEmail` | Use a different email | link-btn; back to the form, email kept and selected |
| `auth.sent.back` | Back to sign in | link |

Never promise that an older link stops working.

### 4. Reset password (`#/reset-password`)

**Valid**

| id | String | Notes |
|---|---|---|
| `auth.reset.heading` | Set a new password | h1 |
| `auth.reset.signedInNotice` | You're signed in as {firstName} here. Setting a new password signs you out here too. | `signed-in` state |
| `auth.reset.password.label` | New password | |
| `auth.reset.password.rule` | At least 10 characters. | |
| `auth.reset.signOutNote` | This signs you out on your other devices. | stated before pressing |
| `auth.reset.submit` | Set new password | primary |
| `auth.reset.submitting` | Saving… | |

**States**

| State | id | String |
|---|---|---|
| `invalid` | `auth.error.newPassword.empty` / `auth.error.password.short` / `auth.error.password.long` | focus on the field; token not spent |
| `rate-limited` | `auth.alert.rateLimited` | token kept |
| `offline` | `auth.reset.offline` | You're offline. Saving a new password needs a connection. |
| back online | `auth.reset.online.announce` | Back online. You can save your password now. |
| `network-error` / `server-error` | `auth.alert.network` / `auth.alert.server` | token kept, so Try again works |

**Link doesn't work** (`expired`, `used`, `expired-on-submit`, no token: one view)

| id | String | Notes |
|---|---|---|
| `auth.resetInvalid.heading` | This link doesn't work any more | h1 |
| `auth.resetInvalid.body` | Reset links work once, for 1 hour. Ask for a new one. | covers expired and used |
| `auth.resetInvalid.primary` | Send a new link | → Forgot, email empty and focused |
| `auth.resetInvalid.back` | Back to sign in | link |
| `auth.resetInvalid.announce` | This link doesn't work any more. | polite, only when the view replaces a form the person was typing in (`expired-on-submit`) |

**Password changed** (`success`)

| id | String | Notes |
|---|---|---|
| `auth.resetDone.heading` | Password changed | h1 |
| `auth.resetDone.body` | Sign in to Zamane with your new password. | never "you're in" |
| `auth.resetDone.primary` | Sign in | → Sign in (`reset-done`) |
| `auth.resetDone.others` | You've been signed out on your other devices. | |
| `auth.resetDone.homeScreen` | Use Zamane from your home screen? Open it there and sign in. | the Safari and installed-app seam |

### 5. Set up your space: the choice (`#/setup`)

| id | String | Notes |
|---|---|---|
| `setup.account.signedInAs` | Signed in as {firstName} | account line, text (long names wrap) |
| `setup.account.signOut` | Sign out | link-btn; name equals visible text |
| `setup.choose.heading` | Set up your space | h1 |
| `setup.choose.gloss` | Your shared place for goals, trips and shopping. One of you starts it; the other joins with a code. | |
| `setup.choose.start.title` | Start our space | card link text; the link's accessible name |
| `setup.choose.start.body` | I'm first. I'll invite my partner with a code. Only one of you starts. | `aria-describedby` |
| `setup.choose.join.title` | Join with a code | |
| `setup.choose.join.body` | My partner already started. I have their code. | |
| `setup.choose.signedUpAs` | Signed up as <b>{email}</b>. Not right? <signout>Sign out</signout> and create your account again. | A7; `{email}` is `dir="ltr"`, wraps |
| `setup.choose.offline` | You're offline. Setting up needs a connection. | slim notice; cards still navigate |
| `setup.choose.online.announce` | Back online. | |

Neither card is pre-selected, and neither has a primary style.

### 6. Start our space (`#/setup/start`)

| id | String | Notes |
|---|---|---|
| `setup.back` | Back | visible text of the Back link (Start and Join) |
| `setup.back.label` | Back to set up your space | contains "Back" |
| `setup.start.heading` | Start our space | h1 |
| `setup.start.name.label` | Space name | |
| `setup.start.name.default` | Our space | prefill. "Ours, not mine": it is the same word for both partners, so nobody joins "Sara's space". Replaces the working copy "Sara's space". Editable. |
| `setup.start.name.helper` | Only you two see this. | |
| `setup.start.currency.legend` | Currency | fieldset legend |
| `setup.start.currency.option` | {name} ({code}) | e.g. "Moroccan dirham (MAD)"; name from `Intl.DisplayNames` |
| `setup.start.currency.other` | Another currency… | radio |
| `setup.start.currency.select.label` | Choose a currency | the revealed `<select>` |
| `setup.start.currency.helper` | You can't change this later. | `aria-describedby` on the group |
| `setup.start.timezone.label` | Time zone | |
| `setup.start.timezone.value` | {city} (from this phone) | e.g. "Casablanca (from this phone)" |
| `setup.start.timezone.change` | Change | disclosure button; visible text |
| `setup.start.timezone.change.label` | Change time zone | contains "Change"; `aria-expanded` carries open or closed |
| `setup.start.timezone.select.label` | Choose a time zone | the revealed `<select>` |
| `setup.start.submit` | Start our space | primary |
| `setup.start.submitting` | Starting… | |
| `setup.start.wrongPath` | Only one of you starts. Partner already has a code? <link>Join with their code</link> | under the primary; the link replaces to Join; typed values are kept |

**States**

| State | id | String |
|---|---|---|
| `invalid` | `setup.error.name.empty` | Give your space a name. |
| `invalid` | `setup.error.name.long` | Use 120 characters or fewer. |
| `invalid` | `setup.error.currency.empty` | Choose a currency. (only for "Another currency…" with nothing picked) |
| `invalid` | `setup.error.timezone.empty` | Choose a time zone. (only if the browser gave none) |
| `already-in-space` | `setup.notice.alreadyIn` | You're already in a space. (on Home, after the re-check) |
| `offline` | `setup.start.offline` | You're offline. Starting a space needs a connection. |
| back online | `setup.start.online.announce` | Back online. You can start your space now. |
| `network-error` | `setup.start.alert.network` | Couldn't reach Zamane. Try again. Nothing is created twice. |
| `server-error` | `auth.alert.server` | |

### 7. Join with a code (`#/setup/join`)

| id | String | Notes |
|---|---|---|
| `setup.join.heading` | Join with a code | h1 |
| `setup.join.intro` | Enter the code your partner shared. It looks like {example}. | `{example}` = `K7QM-4XPA`, `dir="ltr"`, example data |
| `setup.join.code.label` | Invite code | |
| `setup.join.code.helper` | You can paste the whole message. | |
| `setup.join.submit` | Join space | primary |
| `setup.join.submitting` | Joining… | |
| `setup.join.startInstead` | No code yet? <link>Start our space</link> | cross-link |
| `setup.join.signedUpAs` | Signed up as <b>{email}</b>. Not right? <signout>Sign out</signout> and create your account again. | shown when arrived straight from sign-up; same as the choice screen |

**States**

| State | id | String |
|---|---|---|
| `invalid` (length) | `setup.join.error.length` | Codes have 8 letters and numbers, like {example}. |
| `invalid-letters` | `setup.join.error.letters` | Codes don't use 0, O, 1, I or L. Check the code again. |
| `invite-invalid` | `setup.join.error.invalid` | That code didn't work. Check it with your partner, or ask them to share a new one. (one message for every cause; no hint at full, rotated or unknown) |
| `rate-limited` | `auth.alert.rateLimited` | |
| `already-in-space` | `setup.notice.alreadyIn` | You're already in a space. (Home notice) |
| `offline` | `setup.join.offline` | You're offline. Joining needs a connection. |
| back online | `setup.join.online.announce` | Back online. You can join now. |
| `network-error` | `setup.join.alert.network` | Couldn't reach Zamane. Your code is kept. Try again. |
| `server-error` | `auth.alert.server` | |
| `prefilled` | none | code filled from the invite link; focus on Join space |
| `restored` | none | input restored after a reload; no message |

### 8. Switch: join your partner's space (`#/setup/join?state=switch`, F9)

| id | String | Notes |
|---|---|---|
| `setup.switch.heading` | Join your partner's space | h1 (replaces "Join with a code") |
| `setup.switch.intro` | Enter the code your partner shared. It looks like {example}. | same as Join |
| `setup.switch.submit` | Join space | opens the confirmation |
| `setup.switch.dialog.title` | Join with this code? | `alertdialog` name |
| `setup.switch.dialog.body.withContent` | The space you started will be deleted, with {summary}. This can't be undone. | `{summary}` is built with `Intl.ListFormat` from the non-zero `setup.switch.count.*` strings, in the order goals, trips, shopping items |
| `setup.switch.dialog.body.empty` | The space you started will be deleted. This can't be undone. | when it holds nothing |
| `setup.switch.count.goals` | {count, plural, one {# goal} other {# goals}} | |
| `setup.switch.count.trips` | {count, plural, one {# trip} other {# trips}} | |
| `setup.switch.count.items` | {count, plural, one {# shopping item} other {# shopping items}} | |
| `setup.switch.dialog.keep` | Keep my space | safe, first, focused; Esc does this |
| `setup.switch.dialog.confirm` | Join and delete my space | danger |
| `setup.switch.dialog.confirming` | Joining… | |
| `setup.switch.partnerJoined` | {partnerName} already joined your space. | when the server answers `409` (the link on Home then disappears) |
| `setup.switch.error.invalid` | That code didn't work. Check it with your partner, or ask them to share a new one. Your space wasn't deleted. | `invite_invalid`; nothing was deleted |

Example of `{summary}`: "1 goal, 2 trips and 5 shopping items".

### 9. Invite link (`/join#code=…`, F10)

The page is a resolver. It shows only a status, and never an error: a malformed fragment is ignored.

| id | String | Notes |
|---|---|---|
| `auth.invite.status` | Opening your invite | visually hidden status inside the splash |
| `setup.notice.alreadyWithPartner` | You're already in a space with {partnerName}. | Home notice for a person with a full space; the code is dropped |

State mapping: `signed-out` goes to Create account with `auth.create.withCode`; `no-space` goes to Join prefilled; `member` goes to Home, with the notice above for a full space, or with F9's link (`home.firstRun.switch`) for a solo space.

### 10. Launch (`#/launch`)

| State | id | String | Notes |
|---|---|---|---|
| `loading` | `auth.launch.loading` | Loading Zamane | status line, shown after 1 s; before that only the mark. Region `aria-label` is the same. |
| `signed-out`, `no-space`, `member` | `auth.launch.loading` | Loading Zamane | transitional; the app redirects |
| `cached-offline` | `home.offline.notice` | (Home) | reused verbatim on Home |
| `offline` | `auth.launch.offline.heading` | You're offline | h1 |
| `offline` | `auth.launch.offline.body` | Zamane needs a connection to open on this phone for the first time. | |
| `offline` | `auth.launch.offline.retry` | Try again | primary |
| `offline` | `auth.launch.offline.retrying` | Trying again | |
| back online | `auth.launch.online.announce` | Back online. Opening Zamane. | polite, once |
| `error` | `auth.launch.error.heading` | Zamane didn't open | h1 |
| `error` | `auth.launch.error.body` | Something went wrong on our side. Try again in a moment. | |
| `error` | `auth.launch.error.retry` | Try again | primary |

---

## System messages (summary by failure)

| Situation | String id | Where |
|---|---|---|
| Wrong email or password | `auth.signIn.alert.wrong` | alert; Password focused and selected; includes a Reset link |
| Email already registered | `auth.create.error.emailTaken` | inline under Email, with two links |
| Reset requested for any email | `auth.sent.body` | the same text always |
| Reset link dead (arrival, submit, no token) | `auth.resetInvalid.*` | one view |
| Code not accepted | `setup.join.error.invalid` | inline on the field; value kept and selected |
| Code wrong shape | `setup.join.error.length`, `setup.join.error.letters` | inline; nothing sent |
| Too many tries (any form) | `auth.alert.rateLimited` | alert; primary `aria-disabled` |
| Offline (any form) | the screen's `*.offline` | notice above the form; primary `aria-disabled` and described by it; typed values kept |
| No connection reached while online | `auth.alert.network` (Start and Join have their own) | alert; input kept |
| Server error | `auth.alert.server` | alert; input kept |
| Session revoked mid-session | `auth.signIn.notice.sessionEnded` | on Sign in |
| Signed out by choice | `auth.signIn.notice.signedOut` | polite status on Sign in |
| Sign out while offline | `auth.signOut.offline` | beside the control, announced on press |
| Already in a space | `setup.notice.alreadyIn` | notice on Home |
| Solo switch, partner joined meanwhile | `setup.switch.partnerJoined` | notice |

| id | String |
|---|---|
| `auth.signOut.offline` | Signing out needs a connection. |
| `auth.signOut.done.announce` | You're signed out. |

Confirmations: only one exists, the switch (section 8). Sign out, Set new password and the "Have a code?" toggle have none, by design (IA 6.5). The consequence of Set new password is stated before the press and again after.

---

## Accessibility strings

| id | String | Where |
|---|---|---|
| `a11y.skip` | Skip to main content | skip link (Home's) |
| `auth.brand.alt` | Zamane | `alt` on the lockup in the header |
| `auth.splash.brand.alt` | (empty) | on the splash the mark is decorative: the region is named by `auth.launch.loading` |
| `auth.launch.region.label` | Loading Zamane | splash region, `aria-busy="true"` |
| `auth.signIn.password.toggle.show.label` | Show password | contains the visible "Show"; `aria-pressed`, `aria-controls` the input |
| `auth.signIn.password.toggle.hide.label` | Hide password | contains the visible "Hide" |
| `auth.create.password.toggle.show.label` | Show password | same on Create account |
| `auth.create.password.toggle.hide.label` | Hide password | |
| `auth.reset.password.toggle.show.label` | Show password | same on Reset |
| `auth.reset.password.toggle.hide.label` | Hide password | |
| `setup.back.label` | Back to set up your space | Start and Join; visible "Back" |
| `setup.account.signOut.label` | Sign out | header and A7 line; same as visible |
| `setup.choose.start.title` | Start our space | the card link's name is its title; its description is `aria-describedby` |
| `setup.choose.join.title` | Join with a code | |
| `setup.start.timezone.change.label` | Change time zone | visible "Change"; `aria-expanded` |
| `auth.create.hasCode.off` | Have a code from your partner? | the toggle's name equals its visible text |
| `auth.create.hasCode.on` | You'll enter your partner's code next. Undo | name equals the visible text, in order (no tags) |
| `setup.switch.dialog.title` | Join with this code? | `aria-labelledby` of the dialog; the body is `aria-describedby` |
| `a11y.code.spelled` | Invite code: {codeSpelledOut} | invite code in the dialog or notices, spelled "K 7 Q M, 4 X P A"; the visible code stays `K7QM-4XPA` |
| `a11y.email.dir` | (none) | emails and codes carry `dir="ltr"`; no string |
| `a11y.error.prefix` | (none) | errors are announced by `aria-describedby` and `role="alert"`; the icon is `aria-hidden`; no "Error:" prefix is added to the text |
| `a11y.field.required` | required | via the `required` attribute; no visible asterisk on these screens (every field is required) |

**Live announcements (polite, `#live`) and alerts**

| id | String | When |
|---|---|---|
| `auth.form.errorCount` | {count, plural, one {# field needs your attention.} other {# fields need your attention.}} | alert, 2 or more errors |
| `auth.alert.rateLimited.over` | You can try again now. | the wait ends |
| `auth.signIn.online.announce` | Back online. You can sign in now. | once |
| `auth.create.online.announce` | Back online. You can create your account now. | once |
| `auth.forgot.online.announce` | Back online. You can send the link now. | once |
| `auth.reset.online.announce` | Back online. You can save your password now. | once |
| `setup.start.online.announce` | Back online. You can start your space now. | once |
| `setup.join.online.announce` | Back online. You can join now. | once |
| `auth.launch.online.announce` | Back online. Opening Zamane. | once |
| `auth.sent.resent` | Sent again. | after Send again |
| `auth.signOut.done.announce` | You're signed out. | after sign-out, on Sign in |
| `auth.resetInvalid.announce` | This link doesn't work any more. | dead token on submit |
| `setup.notice.alreadyIn` | You're already in a space. | on Home |
| pressing an `aria-disabled` primary | the control's own reason string | announced once on press |

Nothing is announced on load except the route's title. The hand-offs on Home (`home.handoff.*`) are below.

---

## Password-reset email

Sent by Resend from `Zamane <no-reply@…>` [sender domain: owner to confirm]. The email goes out only when an account exists, so addressing the person by first name does not leak anything on screen. `{resetUrl}` is Better Auth's own callback link. `{firstName}` falls back to nothing: "Hi," if absent.

| id | String |
|---|---|
| `email.reset.subject` | Reset your Zamane password |
| `email.reset.preheader` | The link works once and expires in 1 hour. |

### Plain text

```
Hi {firstName},

Someone asked to reset the password for your Zamane account. Use this link to choose a new one:

{resetUrl}

The link works once and expires in 1 hour. Setting a new password signs you out on all your devices.

Didn't ask for this? Ignore this email. Your password stays the same.

You're getting this because this address is used for a Zamane account.
Zamane
```

### HTML body text (the strings, in order)

| id | String | Notes |
|---|---|---|
| `email.reset.logo.alt` | Zamane | logo `alt`; no text in images |
| `email.reset.greeting` | Hi {firstName}, | |
| `email.reset.intro` | Someone asked to reset the password for your Zamane account. Use the button to choose a new one. | |
| `email.reset.button` | Reset your password | the button; its link is `{resetUrl}` |
| `email.reset.expiry` | The link works once and expires in 1 hour. Setting a new password signs you out on all your devices. | |
| `email.reset.fallback` | Button not working? Copy this link into your browser: | followed by `{resetUrl}` as plain, selectable text |
| `email.reset.ignore` | Didn't ask for this? Ignore this email. Your password stays the same. | |
| `email.reset.footer` | You're getting this because this address is used for a Zamane account. | |

Rules kept: no "unlock", no urgency beyond the true 1-hour expiry, no claim about older links, no mention of other people's accounts. The button label is visible text, so the link's accessible name matches it.

---

## Changes to Home (hand-off and the invite link)

Replaces or adds to `home/copy.md`. Everything else in Home stands.

| id | String | Notes |
|---|---|---|
| `home.firstRun.share.title` | Join me on Zamane | Web Share `title` |
| `home.firstRun.share.message` | Join me on Zamane: {url}<br>Or use this code: {code} | **replaces** the old "Join me on Zamane. Use this code: {code}". Pass this as the share `text` only, not also as `url`, or apps repeat the link. Two lines (newline, not HTML). |
| `home.firstRun.invite.body` | Send them the link or the code so they can join your space. It works once. | **replaces** "Share this code so they can join your space. It works once." |
| `home.firstRun.switch` | Got a code from your partner? <link>Join their space instead</link> | F9 link under the code; only while `memberCount = 1`; visible text equals the link's name |
| `home.firstRun.switch.hidden` | (none) | when the partner joins the link disappears; `setup.switch.partnerJoined` explains it if it was just used |
| `home.handoff.created` | Your space is ready. Share the code with your partner. | polite, after Start; **kept as Home's settled string** |
| `home.handoff.joined` | You joined {partnerName}'s space. | polite, after Join |
| `home.handoff.partnerJoined` | {partnerName} joined. | polite, on Sara's phone when the partner joins (needs the realtime notice) |
| `setup.notice.alreadyIn` | You're already in a space. | notice on Home after a `409` |
| `setup.notice.alreadyWithPartner` | You're already in a space with {partnerName}. | notice on Home after an invite link |

The URL in the message is `https://<app>/join#code={code}`, with the code in its canonical `XXXX-XXXX` form. The code stays in the text on its own line so someone whose chat app strips the link can still type it. **Copy** keeps copying the code only (`home.firstRun.copy.label`, unchanged).

---

## i18n notes

- **Plurals:** `auth.form.errorCount` and the three `setup.switch.count.*` keys are ICU. Arabic needs `zero/one/two/few/many/other`; French treats 0 as singular. The "1 goal, 2 trips and 5 shopping items" list is localised with `Intl.ListFormat` ("and", "et", "en", "و").
- **Rich text:** `<link>`, `<b>`, `<undo>`, `<signin>`, `<reset>`, `<signout>` tags let a translator move the linked words. Links use the same text as any plain button for the same action, so the accessible name still matches (2.5.3) after translation: translators must keep the tag around the words that are the visible label.
- **Expansion:** buttons wrap, never truncate. Longest risks: "Have a code from your partner?" (30), "Join and delete my space" (24), "Use Zamane from your home screen? Open it there and sign in." (62). Allow 40%.
- **Idioms to translate by meaning:** "Hi, you two", "Not right?", "carry on" (in `auth.signIn.notice.sessionEnded`; use a plain equivalent), "Our space" (a shared-ownership word, not a literal "workspace").
- **LTR islands:** emails, the invite code, URLs and passwords stay `dir="ltr"` in RTL.
- **No concatenation:** `{summary}` is the only composed value and comes from `Intl.ListFormat`. Names, cities, currency names and codes are inserted into whole-sentence keys.
- **Text in images:** none.

---

## Open items

1. **Space-name default.** I chose "Our space", not "Sara's space" (IA's working copy), so neither partner joins the other's. The prototype's example data (`Sara's space`) should change.
2. **A5 toggle semantics.** The IA gives the toggle both `aria-pressed` and a label that changes. Do one or the other: a changing label without `aria-pressed` (what I've written for), or a fixed label with `aria-pressed`. Both together get announced twice and break 2.5.3 for the pressed state.
3. **Privacy page.** `auth.create.privacy` links to a page nobody owns yet. Wording assumes it explains name and email use, not consent.
4. **Sender and domain** for the reset email, and the dev-prototype footnote `auth.example`.
5. **"It works once"** in `home.firstRun.invite.body` stays valid per IA §9 (code stops once the space is full). If codes can be reused before then, cut the sentence.
6. **Retry-After wording.** "Wait a minute" is fixed copy. If the API ever returns a longer wait, change to a plural-minute key.
7. **Look-alike letters.** `setup.join.error.letters` names 0, O, 1, I and L. The architecture alphabet also leaves out nothing else, so this is complete; re-check if it changes.
8. **`USER_ALREADY_EXISTS` code** and the single expired/used view are still [VERIFY] with the architect (IA F2, F4).
