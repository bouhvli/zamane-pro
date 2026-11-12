# Zamane — Architecture

Zamane is a private, mobile-first PWA for exactly two people. This document describes the plumbing: runtime, data, API, auth, realtime, uploads, offline and environments. It is the contract the code follows; when the code changes shape, this file changes in the same commit.

> Status: **Phases 1–3 built** (scaffold, database, auth and spaces, the auth screens), plus **the nav bar, Home, Goals, Trips, Shopping and Profile** (the goals, notes and trips APIs, photo uploads pulled forward from Phase 6), 2026-11-12. **Hosting moved to Vercel (Hobby)** the same day (D56–D58). Realtime and deploys are still plan. Versions were checked on 2026-11-09; deviations are logged from D33.

---

## 1. Context

```mermaid
flowchart LR
  subgraph Phones["Two phones — installed PWA"]
    A["Sara<br/>React SPA + service worker<br/>IndexedDB query cache"]
    B["Youssef<br/>React SPA + service worker<br/>IndexedDB query cache"]
  end
  subgraph V["Vercel — one project (Hobby), region fra1"]
    SA["Static files<br/>index.html, JS, icons"]
    F["Function (Node.js, Hono)<br/>/api/*"]
  end
  NEON[("Neon Postgres (eu-central-1)<br/>production · dev · pr-N branches<br/>+ rate-limit counters")]
  CLD["Cloudinary<br/>upload API + image CDN"]
  RS["Resend<br/>password-reset email"]

  A & B -- "GET / and assets" --> SA
  A & B -- "fetch /api/* (session cookie)" --> F
  F -- "SQL (HTTP or WebSocket)" --> NEON
  F -- "sign uploads · destroy assets" --> CLD
  A & B -- "signed direct upload · image delivery" --> CLD
  F -- "send email" --> RS
```

- **One origin.** The SPA and the API are one Vercel project (D56). Static files are served from the client build; only `/api/*` runs the function (one Node.js function for the whole Hono app, in `fra1` next to Neon), and unknown paths fall back to `index.html`. There is no CORS setup and no third-party cookie. The routes are in `.vercel/output/config.json`, written by `scripts/build-vercel.ts` (Build Output API).
- **Live updates between the phones are not built** (Phase 5). The Durable Object design in §7 was Cloudflare-only; its replacement is decided at Phase 5 (D56).
- **Postgres is the only source of truth.** Live updates, when built, carry change notices, never data.
- **Image bytes never touch the server.** Phones upload straight to Cloudinary with a short-lived signature from the API.

## 2. Repository layout

The layout from the brief, with one package and one `tsconfig` per runtime:

```
src/client/      React SPA: routes/, lib/{api,query,realtime,upload}.ts, assets/brand/, sw.ts
src/worker/      the server (Hono app; the folder keeps its first name): index.ts, vercel.ts (the
                 function entry), env.ts, auth.ts, background.ts, db/{schema,client}.ts,
                 middleware/, routes/, services/
src/shared/      Zod schemas, enums, money, cloudinary URL builder, trip-day logic
drizzle/         generated SQL migrations (committed)
scripts/         icons, seed, db guard, orphan finder, secret grep, build-vercel, preview
assets/          logo sources — read-only
public/          generated icons (output of `pnpm icons`, committed)
tests/           unit/, api/, e2e/
```

- `tsconfig.json` references `tsconfig.client.json` (DOM libs), `tsconfig.worker.json` (the server, Node types) and `tsconfig.node.json` (Vite config and scripts). `src/shared` is included by both runtimes and must not import from either.
- Route handlers are thin. They validate, call one service or repository function with `spaceId` from context, and broadcast. Rules (completion, stats, budget, trip status, invite codes, category normalisation) are plain functions in `src/worker/services/` or `src/shared/`, with unit tests.

## 3. Request lifecycle

```mermaid
sequenceDiagram
  autonumber
  participant C as Phone (TanStack Query)
  participant W as Function (Hono)
  participant BA as Better Auth
  participant DB as Neon
  participant R as Live updates (Phase 5)
  C->>W: POST /api/shopping {id, name} + cookie
  W->>W: requestId → errorHandler → secureHeaders
  W->>BA: getSession(headers)
  BA->>DB: session + user (skipped while the signed cookie cache is fresh)
  W->>DB: membership → spaceId, slot, currency, timezone
  W->>W: zValidator(json)
  W->>DB: INSERT … ON CONFLICT (id) DO NOTHING RETURNING *
  DB-->>W: row (committed)
  W-->>C: 201 { item }
  W-)R: broadcast(notice) after commit (Phase 5, D56)
  R-)C: notice to the other phone
```

**Middleware order** (outermost first): `requestId` → `errorHandler` (`app.onError` + `notFound`) → `secureHeaders` → `rateLimit` (selected routes) → `session` → `requireSpace` (space-scoped routes only).

- `session` resolves the Better Auth session once and sets `c.var.user`. No session means `401 { error: { code: "unauthenticated" } }`.
- `requireSpace` runs one query (`space_members ⋈ spaces` by `user_id`) and sets `c.var.space = { spaceId, userId, slot, currency, timezone }`. A user without a space gets `403 no_space`. Only `/api/me`, `/api/spaces` (create and join) and the auth routes work without a space.
- **Every repository function takes `spaceId` as its first argument** and every statement filters on it. Ids are never trusted on their own: a row id from another space behaves exactly like a missing id (`404 not_found`).
- **Errors** always have the shape `{ error: { code, message, fields? } }`. Zod failures map to `400 validation_failed` with `fields` keyed by path. Unexpected errors map to `500 internal` and are logged with the request id, never with env values or SQL parameters.

## 4. Data model

### Conventions

| Concern | Rule |
|---|---|
| Primary keys | UUID v7 generated in the app (`uuid` package), column type `uuid`. Creates accept a client-generated id. |
| Instants | `timestamptz`. `updated_at` uses **millisecond precision** (`timestamptz(3)`) so the `updatedAt` a client echoes back compares equal. |
| Calendar days, clock times | `date` and `time` (no time zone). |
| Money | `bigint` minor units, read into JS as `number` (safe-integer checked). The currency is an ISO 4217 code on the space. |
| Enums | `text` + `CHECK` built from `as const` arrays in `src/shared/enums.ts`, so the DB, the Zod schemas and the TS types share one list. Adding a value is a one-line migration. |
| Space ownership | Every space-owned table has `space_id` (FK `ON DELETE CASCADE`), `created_by`, `created_at`, `updated_at`, and an index on `space_id`. |
| Parent integrity | Child rows reference their parent with a **composite FK** `(parent_id, space_id) → parent(id, space_id)`, so a child can never point at another space's parent, even if a handler has a bug. |
| Derived values | Never stored. Computed in SQL or services (§4.3). The only stored "result" is `goals.completed_at/by`, which records *when* a goal crossed its target and is recomputed in the same transaction as every write that can change it. |

### ERD

```mermaid
erDiagram
  user ||--o{ session : has
  user ||--o{ account : has
  user ||--o| space_members : "member of (max 1)"
  spaces ||--|{ space_members : "1-2 members, slots a and b"
  spaces ||--o{ goals : owns
  goals ||--o{ goal_entries : "entries"
  goals ||--o{ goal_notes : "journal"
  goal_notes ||--|{ goal_note_blocks : "ordered blocks"
  spaces ||--o{ trips : owns
  trips ||--o{ trip_plan_entries : "plan"
  trips ||--o{ trip_places : "places"
  trips ||--o{ trip_checklist_items : "checklist"
  trip_places |o--o| trip_plan_entries : "scheduled as"
  spaces ||--o{ shopping_items : owns

  user {
    uuid id PK
    text display_name "Better Auth name field, renamed"
    text email UK
    bool email_verified
    timestamptz created_at
    timestamptz updated_at
  }
  spaces {
    uuid id PK
    text name
    char currency "ISO 4217"
    text timezone "IANA, from creator's browser"
    text invite_code UK "8 chars, no 0 O 1 I L"
    timestamptz invite_code_rotated_at
    uuid created_by FK
  }
  space_members {
    uuid space_id PK,FK
    uuid user_id PK,FK "UNIQUE: one space per user"
    char slot "a or b; UNIQUE(space_id, slot)"
    timestamptz joined_at
  }
  goals {
    uuid id PK
    uuid space_id FK
    text kind "money or general"
    text title
    text description
    bigint target_amount "required iff money"
    date target_date
    jsonb cover "publicId, version, width, height, format"
    timestamptz completed_at
    uuid completed_by FK
  }
  goal_entries {
    uuid id PK
    uuid goal_id FK
    bigint amount "money goals, > 0"
    smallint percent "general goals, 0-100"
    text note
    uuid created_by FK
  }
  goal_notes {
    uuid id PK
    uuid goal_id FK
    uuid created_by FK
  }
  goal_note_blocks {
    uuid id PK
    uuid note_id FK
    int position "UNIQUE(note_id, position)"
    text kind "text or image"
    text text
    jsonb image
  }
  trips {
    uuid id PK
    text title
    text destination
    date start_date
    date end_date "CHECK end >= start"
    bigint budget
    text notes
    jsonb cover
  }
  trip_plan_entries {
    uuid id PK
    uuid trip_id FK
    text type "flight transport stay food sight activity other"
    text title
    date date
    time start_time
    time end_time
    text location
    bigint cost
    text url
    text notes
    timestamptz done_at
    uuid done_by FK
    uuid place_id FK,UK "nullable; a place is scheduled at most once"
  }
  trip_places {
    uuid id PK
    uuid trip_id FK
    text type
    text title
    text area
    text notes
    text url
    bigint estimated_cost
    bool must_do
  }
  trip_checklist_items {
    uuid id PK
    uuid trip_id FK
    text group "packing documents bookings todo"
    text title
    int position
    timestamptz done_at
    uuid done_by FK
  }
  shopping_items {
    uuid id PK
    text name
    int quantity "default 1, > 0"
    text category "as typed, trimmed"
    text category_key "normalised, for grouping"
    text unit "piece, l, g or kg"
    text notes
    timestamptz bought_at
    uuid bought_by FK
  }
```

Every space-owned table also carries `space_id`, `created_by`, `created_at` and `updated_at`. They're left out of the diagram above to keep it readable.

### 4.1 Constraints that carry product rules

- **Two members, never three.** `UNIQUE(space_id, slot)` with `slot ∈ {a, b}` makes a third member impossible, even under concurrent joins. `UNIQUE(user_id)` limits each user to one space. The creator takes slot `a`. Joining is one statement, `INSERT INTO space_members SELECT s.id, $user, 'b' FROM spaces s WHERE s.invite_code = $code ON CONFLICT DO NOTHING RETURNING space_id`, so the constraint does the arbitration. Zero rows returned means the code is unknown or the space is full, and both cases get the same `404 invite_invalid`, so a guess can't tell them apart.
- **Goal kind.** CHECK: `kind = 'money'` ⇒ `target_amount > 0`; `kind = 'general'` ⇒ `target_amount IS NULL`. `(completed_at IS NULL) = (completed_by IS NULL)`. Entries hold exactly one of `amount` or `percent`, and the service rejects an entry whose field doesn't match the goal's kind. `kind` can't be changed after creation.
- **Places are scheduled at most once.** `trip_plan_entries.place_id` is `UNIQUE`, `ON DELETE SET NULL`. Deleting a place keeps the plan entry. Deleting the plan entry "unschedules" the place.
- **Trip dates.** Both dates are null, or both are set with `end_date >= start_date` (see D12).
- **Note blocks.** `kind = 'text'` ⇒ `text` is set and `image` is null; `kind = 'image'` ⇒ `image` is set.
- **Text caps** live in the Zod schemas (titles 120, names 120, notes and descriptions 4 000, note text blocks 10 000, URLs 2 048 and `http(s)` only) and are mirrored by `CHECK (char_length(...) <= n)` on the same columns.

### 4.2 Indexes

`space_id` on every space-owned table, plus `goal_entries(goal_id, created_at)`, `goal_notes(goal_id)`, `goal_note_blocks(note_id, position)`, `trip_plan_entries(trip_id, date, start_time)`, `trip_places(trip_id)`, `trip_checklist_items(trip_id, "group", position)`, `shopping_items(space_id, bought_at)` and `shopping_items(space_id, category_key)`.

### 4.3 Derived values (queries and services, never stored)

| Value | Definition |
|---|---|
| Money goal progress | `sum(goal_entries.amount)` |
| General goal progress | `percent` of the latest entry (`ORDER BY created_at DESC, id DESC LIMIT 1`); 0 with no entries |
| Completion | Money: `progress >= target_amount`. General: `progress = 100`. Crossing up sets `completed_at = now()` and `completed_by = actor`. Dropping back below clears both. `services/completion.ts` decides this, called inside the same transaction as entry insert, entry delete and target change, with the goal row locked `FOR UPDATE` so two partners adding at once are serialised. |
| Home total saved | `sum(amount)` over all money-goal entries in the space, completed goals included |
| Goal stats | count, total, average, max, this-month total (month boundaries in `spaces.timezone`: `created_at AT TIME ZONE tz >= date_trunc('month', now() AT TIME ZONE tz)`), last activity, and a per-member breakdown joined to `space_members.slot` |
| Trip budget | `Σ plan.cost + Σ place.estimated_cost` over places with **no** linked plan entry, also grouped by `type`, plus `overBudget = budget IS NOT NULL AND planned > budget`. Scheduling a place pre-fills the new plan entry's `cost` from the place's estimate, so the estimate keeps counting exactly once (D11). |
| Place "visited" | `EXISTS (plan entry with place_id = place.id AND done_at IS NOT NULL)` |
| Trip status, "now / next", day list | Computed **on the client** from the device's local date and time by `src/shared/trip-days.ts`: upcoming (days until `start_date`), happening now, past, or unscheduled. The day list runs from `start_date` to `end_date` inclusive, with empty days kept. Entries dated outside the range go into an "outside trip dates" group, and undated entries into "unscheduled". The server returns raw `date` and `time` strings. |
| Shopping groups | Unbought items grouped by `category_key` (null = "Other"), each with an item count. Bought items form a separate "done" group. |
| Category suggestions | `SELECT DISTINCT ON (category_key) category … ORDER BY category_key, updated_at DESC`, the latest spelling for each key |

**Category normalisation** (`src/shared/category.ts`, used by both client and server): NFKD, strip diacritics, lower-case, remove all whitespace. So "Fruit & Veg", "fruit &veg" and "Frúit & veg" share one key. On write, if the key already exists in the space, the server stores the existing spelling, so groups don't split.

**Money** (`src/shared/money.ts`): an explicit ISO 4217 minor-unit table (2 by default; 0 for JPY, KRW, XOF, XAF, …; 3 for BHD, KWD, TND, …). Not `Intl`, whose CLDR digits differ from ISO for a few currencies and could change under us. `parseMoney("12,50", "EUR") → 1250`, `formatMoney(1250, "EUR", locale)` uses `Intl.NumberFormat` with the fraction digits fixed from the table. No floats on any path.

### 4.4 Seed

`pnpm db:seed` (guarded, see §10) creates Sara and Youssef with known dev passwords and a shared space (EUR, `Europe/Brussels`). It adds a money goal with entries from both, a completed money goal, a general goal at 60%, a trip with plan entries across three days (one empty day, one entry dated outside the range), places (one scheduled, one must-do) and a seeded checklist, plus a shopping list with categories and one bought item. Tests reuse the same fixture builders.

## 5. API

Hono under `/api`, with every input validated by `@hono/zod-validator` against schemas in `src/shared/schemas/`. Route modules are chained and mounted with `app.route()`, so `AppType` carries every route to `hono/client`.

| Group | Endpoints |
|---|---|
| Public | `GET /api/health` (DB round trip, never shows the URL) · `GET /api/config` → `{ uploadsEnabled, cloudinaryCloudName }` · `GET /api/password-reset/check?token=` → `{ valid }` (expired and used look the same; rate-limited, D37) |
| Auth | `/api/auth/*` → Better Auth handler, behind a gate (D38): only sign-up, sign-in, sign-out, get-session, request-password-reset, reset-password and change-password are reachable |
| Me | `GET /api/me` → `{ user: { id, displayName, email }, space: null | { id, name, currency, timezone, slot, memberCount } }` · `PATCH /api/me` (display name) |
| Spaces | `POST /api/spaces` (create; takes `{ id, name, currency, timezone }`; `409 already_in_space`) · `POST /api/spaces/join` `{ code, replaceSolo? }` → `{ space, partnerName }` (`404 invite_invalid`, `409 already_in_space`, `409 partner_joined`; a retry by a member of that space answers `200`, D37; `replaceSolo`, D33) · `GET /api/spaces/mine` (space, members with slot and display name, invite code) · `GET /api/spaces/mine/summary` → `{ goals, trips, items }` (the switch's confirmation) · `POST /api/spaces/mine/invite-code` (rotate) · `POST /api/spaces/mine/leave` → **stubbed `501`** for v1 (see D19) |
| Home | `GET /api/home` → `{ currency, total, goals: [{ id, kind, title, progress, target, completedAt, last }], trips: [{ id, title, destination, startDate, endDate }], shoppingLeft, members: [{ userId, displayName, slot }], inviteCode }` (D48). One SQL statement built from CTEs. The device picks "now / next" among the trips and orders the goals. **Built.** |
| Goals | `GET/POST /api/goals` (`GET` → `{ currency, images: { cloudName } | null, goals: [GoalView], members }`, D51) · `GET/PATCH/DELETE /api/goals/:id` (`PATCH` → `{ goal, completed, reopened }`; `409 { error, current }`) · `GET/POST /api/goals/:id/entries` (D48) · `DELETE /api/goals/:id/entries/:entryId` · `GET /api/goals/:id/stats` (month in the space's time zone) · `GET/POST /api/goals/:id/notes` · `PUT/DELETE /api/goals/:id/notes/:noteId` (saves the whole note: ordered blocks; author only, `403 forbidden`, D53). Types in `src/shared/schemas/goals.ts`. **Built.** |
| Trips | `GET/POST /api/trips` (`GET` → `{ currency, images, trips, members }`) · `GET /api/trips/:id` → `{ trip, entries, places, items }` (D59) · `PATCH/DELETE /api/trips/:id` · `POST …/plan` · `PATCH/DELETE …/plan/:entryId` · `PUT …/plan/:entryId/done` · `POST …/places` · `PATCH/DELETE …/places/:placeId` · `POST …/places/:placeId/schedule` (`409 conflict` with `entry` when the place is already in the plan) · `POST …/checklist` · `PATCH/DELETE …/checklist/:itemId` · `PUT …/checklist/:itemId/done` · `POST …/checklist/:itemId/move` `{ direction }`. Types in `src/shared/schemas/trips.ts`. **Built.** |
| Shopping | `GET/POST /api/shopping` · `PATCH/DELETE /api/shopping/:id` · `PUT /api/shopping/:id/bought` `{ bought: boolean }` · `POST /api/shopping/clear-bought` (answers the removed rows) · `POST /api/shopping/restore` (Undo of delete and clear bought, ids and attribution kept) · `GET /api/shopping/categories`. Built (D62–D65). |
| Uploads | `POST /api/uploads/sign` `{ purpose: "goal-cover" | "note-image" }` (D52). **Built.** |
| Realtime | `GET /api/realtime/connect` (WebSocket upgrade) |

**Write semantics**

- **Idempotent creates.** The body carries the client's UUID. `INSERT … ON CONFLICT (id) DO NOTHING RETURNING *`. When nothing comes back, the server re-reads the row *in the caller's space*: if it exists, it answers `200` with it (a replay); otherwise it's an id collision with another space and gets `409 id_conflict`.
- **Ticks set state; they don't toggle.** `PUT …/bought { bought: true }` and `PUT …/done { done: true }` can be replayed any number of times with the same result, which offline replay needs (D9).
- **Optimistic concurrency.** `PATCH` and `PUT` on editable records take `updatedAt`. `UPDATE … WHERE id = $1 AND space_id = $2 AND updated_at = $3 RETURNING *`. Zero rows means one more read: the row exists, so `409 conflict` with the current row in the body (the client shows it and lets the user re-apply); or it doesn't, so `404`. Set-state ticks and offline mutations skip the check, so the last write wins (documented per endpoint).
- **Idempotent deletes.** `DELETE` answers `204` whether or not the row existed in the caller's space. It reveals nothing about other spaces and is safe to retry.
- **Broadcast after commit.** Every mutation calls `broadcast(c, notice)` after its statement or transaction has committed. It runs in the background (`background()`, Vercel's `waitUntil`), so a broadcast failure never fails the request. (Phase 5.)
- **Rate limits** (counters in Neon, one-minute windows, keys hashed, D57; keyed per IP and per user or email): sign-in, sign-up and password reset (10/min), join by code (5/min per user and per IP), upload signing (30/min per user), realtime connect (20/min per user). A refusal is `429 { error: { code: "rate_limited" } }` with `Retry-After: 60` (D37).

**Transactions.** `src/worker/db/client.ts` exposes `db(c)`, a module-level Drizzle client on the Neon HTTP driver for single statements and non-interactive batches, and `withTx(c, fn)`, which creates a WebSocket `Pool` for this request, runs `db.transaction(fn)` and closes the pool in the background (`background(pool.end())`). Interactive transactions are used for: goal entry insert and delete, and target changes (completion recompute); note save (replacing blocks plus the optimistic check); and cover replacement (read the old asset, write the new one). Everything else is a single statement or an `atomic(c, [...])` call (trip create plus checklist seed; space create plus first member). On the HTTP driver, `atomic` maps to `db.batch`, which runs as one non-interactive transaction, so moving to Hyperdrive later (D2) changes only `db/client.ts`.

## 6. Auth

Self-hosted **Better Auth** inside the API function (D1), mounted with `app.all("/api/auth/*", c => auth.handler(c.req.raw))`. Sessions and accounts live in Postgres through the Drizzle adapter.

- **Instance**: `createAuth(config)` builds a Better Auth instance per request from the cached configuration. It uses the HTTP Drizzle client: the adapter's `transaction` option defaults to `false`, so the HTTP driver's lack of interactive transactions doesn't matter. A separate `auth.config.ts` with the same options feeds the schema CLI (`npx auth generate`) in Node. Its output is checked against `db/schema.ts`, which stays hand-owned.
- **Email + password** only. Sign-up takes email, password (min 10, max 128) and display name. The display name is Better Auth's `name` field, mapped to the `display_name` column (D7). `advanced.database.generateId` returns UUID v7, so auth ids are `uuid` columns like the rest of the schema.
- **Cookies and CSRF**: Better Auth issues httpOnly, `SameSite=Lax` cookies on our own origin, `Secure` whenever the base URL is https (every environment except local). Its CSRF defences stay on: an origin check against `APP_URL`, the auth base URL (D45) (no extra `trustedOrigins` needed on one origin) and Fetch-Metadata checks on sign-in. Every other state-changing `/api` call is same-origin JSON. A cross-site form post loses twice: `SameSite=Lax` withholds the cookie, and the JSON content-type check rejects the body.
- **Session cache**: `session.cookieCache` (5 min, signed) skips the session query on most requests. The cost is that a revoked session (password change or reset) can keep working on another device for up to 5 minutes, which is acceptable here. `advanced.ipAddress.ipAddressHeaders = ["x-real-ip"]` (set by Vercel, which overwrites any value a client sends).
- **Password reset**: `POST /api/auth/request-password-reset` gives the same response whether or not the email exists, and Better Auth runs a dummy lookup. The email is sent in the background (`waitUntil`), not awaited, so timing doesn't reveal it either. The token is single-use and expires after 1 hour (`resetPasswordTokenExpiresIn: 3600`). `revokeSessionsOnPasswordReset: true` is set explicitly (it's off by default). The link goes to `${APP_URL}/reset-password?token=…`.
- **Email**: `sendEmail({ to, subject, text, html })` in `src/worker/services/email.ts`. The Resend implementation calls the HTTP API with `fetch`, so there's no SDK. When `APP_ENV=development` and `RESEND_API_KEY` is empty, a dev logger prints the reset link to the server console instead. It never returns it in an HTTP response.
- **Rate limits**: Better Auth's own limiter is off. The app's limiter (Neon counters, D57) covers sign-in, sign-up, password reset and change-password, keyed by IP and email.
- **Password hashing**: scrypt (~50 ms of CPU per hash) is fine on Vercel's Node.js functions, which have no per-request CPU cap like Workers Free (D3, superseded by D56).

## 7. Realtime

> **Superseded design (D56).** What follows was written for Cloudflare Durable Objects and is kept for its client side and its notice format, which still apply. On Vercel, functions can hold WebSockets, but connections don't share an instance, so a notice from one phone needs a relay to reach the other: Postgres `LISTEN/NOTIFY` on Neon, a hosted pub/sub (for example Redis from the Vercel Marketplace) or polling. That choice is made at the start of Phase 5.

```mermaid
sequenceDiagram
  participant S as Sara's phone
  participant Y as Youssef's phone
  participant W as Worker
  participant R as SpaceRoom (name = spaceId)
  participant DB as Neon
  Y->>W: GET /api/realtime/connect (Upgrade: websocket, cookie)
  W->>W: Origin check, session, requireSpace, rate limit
  W->>R: stub.fetch(upgrade, x-zamane-user-id)
  R->>R: ctx.acceptWebSocket(server, [userId]) — hibernatable
  R-->>Y: 101 Switching Protocols
  S->>W: POST /api/shopping
  W->>DB: INSERT (commit)
  W-->>S: 201
  W-)R: stub.broadcast(notice) in waitUntil
  R-)Y: {"type":"created","entity":"shopping_item","id":"…","parentId":null,"spaceId":"…","actorId":"…","at":"…"}
  Y->>Y: invalidationMap → ['shopping'], ['home']
  Y->>W: refetch active queries
```

**Server.** `SpaceRoom` is a SQLite-backed Durable Object class (free-plan eligible, declared through `exports`, D27) using the WebSocket Hibernation API:

- `fetch()` accepts the upgrade with `ctx.acceptWebSocket(ws, [userId])`.
- `broadcast(notice)` is an RPC method that sends to `ctx.getWebSockets()`.
- `setWebSocketAutoResponse("ping" → "pong")` answers keep-alives without waking the object.

The Worker checks the `Origin` header before forwarding, which guards against cross-site WebSocket hijacking because the browser sends the cookie on the handshake. The socket is authorised once, at connect. Notices carry only `{ type, entity, id, parentId?, spaceId, actorId, at }`, so a stale socket can leak only "something changed". Logout closes it from the client.

**Client** (`src/client/lib/realtime.ts`):

- Connect after login.
- Reconnect with exponential backoff and jitter (1 s → 30 s).
- On every (re)connect and on `visibilitychange → visible`, invalidate active queries.
- While the socket is down, the default `refetchInterval` switches to 30 s (a slow poll); TanStack Query's `refetchOnWindowFocus` and `refetchOnReconnect` stay on.
- One `invalidationMap: Record<Entity, (n) => QueryKey[]>` turns a notice into keys. For example, `goal_entry` maps to the goal's detail, entries and stats keys, plus the goal list and `['home']`.
- **Own echoes**: each mutation records `entity:id` in a short-lived set (15 s). A notice whose `actorId` is me *and* whose `entity:id` is in that set is skipped, because the optimistic update already covers it. The same user's other device doesn't have the id in its set, so it still refreshes.

## 8. Images (Cloudinary)

```mermaid
sequenceDiagram
  participant P as Phone
  participant W as API function
  participant DB as Neon
  participant C as Cloudinary
  P->>P: downscale to ≤ 2048 px long edge, re-encode (drops EXIF and GPS)
  P->>W: POST /api/uploads/sign { purpose: "trip-cover" }
  W->>W: requireSpace, rate limit, uploads enabled?
  W-->>P: { cloudName, apiKey, timestamp, signature, publicId: "zamane/{spaceId}/trip-cover/{uuid}", allowedFormats, maxFileSize }
  P->>C: POST /v1_1/{cloud}/image/upload (XHR, progress events)
  C-->>P: { public_id, version, width, height, format, bytes }
  P->>W: PATCH /api/trips/:id { cover: {...}, updatedAt }
  W->>W: public_id starts with zamane/{spaceId}/ ?
  W->>DB: update cover, read the old one (same tx)
  W-)C: destroy(old public_id) in the background (waitUntil)
```

- **Signing** uses Web Crypto (SHA-256 over the sorted parameters plus the secret, `signature_algorithm=sha256`). The signature pins `public_id`, `timestamp`, `allowed_formats` (jpg, png, webp: the designs' types; the phone re-encodes to JPEG anyway, D52) and `overwrite=false`, so the phone can't choose its own path (D8). The server still checks the prefix on save. A signature is valid for Cloudinary's standard one-hour window.
- **Size**: the phone enforces `maxFileSize` (10 MB) after downscaling. Whether Cloudinary can enforce a per-upload byte cap from signed parameters is verified in Phase 6; if it can't, the save step checks `bytes` and rejects oversized uploads (deleting the asset).
- **Delivery**: `src/shared/cloudinary.ts` exports `imageUrl(asset, { w, h?, dpr })`, which builds `f_auto,q_auto,c_fill,g_auto,w_{w*dpr}` URLs pinned to `v{version}`. The arch-shaped crop is CSS.
- **Cleanup**: replacing or deleting a cover or image block destroys the old asset (signed `destroy`) in the background (`waitUntil`). Deleting a goal or trip destroys all its assets. `pnpm images:orphans` lists the assets under each `zamane/{spaceId}/` prefix with the Admin API, diffs them against the DB, and prints orphans (`--delete` removes them).
- **Disabled mode**: when all three Cloudinary keys are empty, `/api/uploads/sign` returns `503 uploads_disabled`, `/api/config` reports `uploadsEnabled: false` (and `GET /api/goals` answers `images: null`), and the client hides every upload control. Covers fall back to the title's initial in the arch, and journal notes accept text blocks only. Both modes are tested.
- Uploads need a connection. They are not queued offline in v1.

## 9. PWA, offline and sync

**Manifest**: name and short name "Zamane", `display: standalone`, `start_url: /`, `scope: /`, `theme_color: #1d4e89`, `background_color: #f8f3ea`. `index.html` also sets `<meta name="theme-color">` per colour scheme (light `#f8f3ea`, dark `#12161d`, from the design tokens). Icons are generated by `pnpm icons` from `assets/zamane-app-icon.svg`: `favicon.ico`, `favicon.svg`, `apple-touch-icon-180x180.png`, `pwa-192x192.png`, `pwa-512x512.png` and `maskable-icon-512x512.png`. For the maskable icon, the script measures the lettering's bounding box and pads with majorelle `#1d4e89` until the lettering sits inside the central 80% circle.

**Service worker** (`src/client/sw.ts`, `vite-plugin-pwa` in `injectManifest` mode):

- `precacheAndRoute(self.__WB_MANIFEST)` covers the app shell.
- A `NavigationRoute` falls back to `index.html`, with a denylist of `^/api/`.
- `res.cloudinary.com/{cloud}/image/*` uses `StaleWhileRevalidate` with `ExpirationPlugin` (200 entries, 30 days) and `CacheableResponsePlugin` (status 0 and 200).
- **`/api/*` is never cached by the service worker.** TanStack Query's persisted cache owns data.
- `registerType: "prompt"`: a waiting worker shows "New version available — Reload", which posts `SKIP_WAITING` and then reloads. There is no silent `skipWaiting`.

**Offline reads.** `persistQueryClient` uses `createAsyncStoragePersister` over `idb-keyval`, with `maxAge` 7 days and `buster = ${APP_VERSION}`; it is restored before the first render. Sign-in and sign-up clear the cache before loading the new session, so one user's data never reaches another (D41). Logout runs `queryClient.clear()`, removes the persisted client and closes the socket.

**Offline writes.** These work offline:

| Mutation key | Endpoint |
|---|---|
| `['shopping','add']` | `POST /api/shopping` |
| `['shopping','setBought']` | `PUT /api/shopping/:id/bought` |
| `['goalEntries','add']` | `POST /api/goals/:id/entries` |
| `['checklist','setDone']` | `PUT /api/trips/:id/checklist/:itemId/done` |
| `['plan','setDone']` | `PUT /api/trips/:id/plan/:entryId/done` |
| `['places','add']` | `POST /api/trips/:id/places` |

Each key has `queryClient.setMutationDefaults(key, { mutationFn, onMutate, onError, onSettled })`, defined in one module that loads before the persisted cache is restored, so paused mutations rehydrated from IndexedDB find their `mutationFn`. Variables are JSON-only and carry the client-generated id. `onMutate` writes the optimistic row, `onError` rolls back, and `onSettled` invalidates. After restore, `onSuccess: () => queryClient.resumePausedMutations()` replays the queue in order. Every other mutation needs a connection: an `useOnline()` hook disables those controls and says why.

## 10. Environments, configuration and secrets

### Keys

| Key | Where it lives | Notes |
|---|---|---|
| `DATABASE_URL` | `.env` · CI (Neon branch output) · Vercel env (Production) | **Direct (unpooled)** endpoint, `sslmode=require`. Used by the API (HTTP + WebSocket drivers) and by drizzle-kit. |
| `BETTER_AUTH_SECRET` | `.env` · GitHub secret · Vercel env | ≥ 32 random bytes (`openssl rand -base64 32`); a new one for production |
| `APP_URL` | `.env` · Vercel env | Public origin; `http://localhost:3000` locally |
| `RESEND_API_KEY` | `.env` · Vercel env | Empty locally → dev email logger. Required outside development. The sender isn't configured (D45) |
| `CLOUDINARY_CLOUD_NAME` | `.env` · Vercel env | All three Cloudinary keys or none |
| `CLOUDINARY_API_KEY` | `.env` · Vercel env | |
| `CLOUDINARY_API_SECRET` | `.env` · Vercel env (sensitive) | Server only |
| `APP_ENV` | Vercel env per environment | `development` (local default) · `preview` · `production` |
| `NEON_API_KEY`, `NEON_PROJECT_ID` | GitHub secret / variable; optionally `.env` | CI branch create and delete; also lets the local DB guard look up the branch name |

- **Nothing server-side has a `VITE_` prefix.** The client learns `uploadsEnabled` and `cloudinaryCloudName` from `GET /api/config` (and `images` from `GET /api/goals`, D51).
- **`src/worker/env.ts`** parses `process.env` with Zod once per instance, on first use, and throws an error that names missing or invalid keys, never their values. The Cloudinary keys are all-or-nothing: all empty means uploads are disabled, and a partial set is an error naming the missing key. A `-pooler` host in `DATABASE_URL` logs a warning.
- **`NODE_ENV` stays out of `.env`.** Vite reads `NODE_ENV` from `.env` files, and `NODE_ENV=development` there makes `vite build` emit a development bundle. The server's environment comes from `APP_ENV`.
- **Local `.env` → the API**: `pnpm dev` (Vite on :3000) reads `.env` into `process.env` and hands `/api/*` to the Hono app, loaded through Vite so server code reloads on save (D58). Values already in the environment win. Vite exposes only `VITE_*` keys to the client, and there are none.

### Production settings

All settings are environment variables of the Vercel project (Settings → Environment Variables), scoped to Production (and Preview when previews are used). Secrets never go into committed files. The API reads them at run time; the build doesn't need them.

### Branches and deployments

| | Neon | Vercel |
|---|---|---|
| Production | `production` (the project default) | the project's production deployment (`main`), region `fra1` |
| Local | `dev`, your `.env` | `pnpm dev` (Vite + the Hono app) on `:3000`; `pnpm build && pnpm preview` serves the built output the way Vercel routes it |
| Pull request | `pr-{number}`, created by CI, deleted on close | Vercel preview deployment (needs `APP_URL` per preview; not set up yet) |

- **Build** (`pnpm build`): `tsc -b`, `vite build` (→ `dist/client`), then `scripts/build-vercel.ts` writes `.vercel/output` (Build Output API v3): `static/`, one function `functions/api.func` (esbuild bundle of `src/worker/vercel.ts`, Node.js 22, `fra1`) and `config.json` (security headers and CSP, cache headers, `/api/*` → the function, then the SPA fallback). `vercel.json` sets the install and build commands; Vercel deploys `.vercel/output` as is.
- **Migrations** are generated with `drizzle-kit generate`, committed, and applied with `drizzle-kit migrate` before the deploy that needs them. Destructive changes follow expand → deploy → contract across two releases.
- **Guard** (`scripts/db-guard.ts`) runs before `db:seed`, `db:migrate` when pending migrations contain `DROP` / `TRUNCATE` / `ALTER … DROP`, and `db:studio` writes. It refuses unless `APP_ENV` (default `development` for local scripts) is `development` **and** the Neon branch behind `DATABASE_URL` is not `main`, not the project default and not protected. The branch is looked up through the Neon API from the endpoint id in the host. Without `NEON_API_KEY` it can't look the branch up, so it refuses and says so.

### Scripts

`dev` · `build` · `preview` · `deploy` · `icons` · `db:generate` · `db:migrate` · `db:seed` · `db:studio` · `test` · `test:e2e` · `lint` · `typecheck` · `images:orphans` · `check:secrets`

## 11. Testing and CI

- **Unit** (Vitest, Node): money, category normalisation, invite codes, completion, stats, budget, trip status and day list, the invalidation map, env validation (Cloudinary all-or-nothing).
- **API** (Vitest on Node, calling the Hono app's `fetch` directly, against a Neon branch, D58): auth flows; create and join (the concurrency test fires 10 parallel joins at one code, and exactly one succeeds); cross-space isolation (reads, writes and deletes against another space's ids return 404, 404 and 204-with-no-effect); idempotent create replay; 409 on stale `updatedAt`; completion and un-completion; budget with scheduled and unscheduled places; uploads in both modes.
- **E2E** (Playwright, against `vite dev` started with `E2E=1`, D40): the auth flow end to end (sign up, start, join, sign out, reset through the emailed link, sign in, the TEMP Profile, guards, the invite link). Later phases: two browser contexts, Sara and Youssef. Sara adds a shopping item and Youssef sees it within 2 s without a reload. A second spec covers offline: add an item offline, go online, and the item syncs.
- **CI** (GitHub Actions) on each pull request:
  1. install, lint, typecheck, unit tests;
  2. create Neon branch `pr-N` (schema-only from `main`, D31; `neondatabase/create-branch-action@v6`), then migrate and seed;
  3. API tests, build, then `check:secrets`, which fails if what browsers get (`.vercel/output/static`) contains the string `CLOUDINARY_API_SECRET` or `postgres://` / `postgresql://`, if any file in `.vercel/output` contains a secret value, or if the function contains the test-only route (D34);
  4. E2E against `pnpm preview` (the built output);
  5. a Vercel preview deployment (Git integration).

  On push to `main`: the same checks, then migrate `production`; Vercel's Git integration deploys. On PR close: `delete-branch-action@v3`.

## 12. Security checklist

- Same-origin httpOnly, Secure, `SameSite=Lax` session cookies, plus Better Auth's origin check.
- Membership is enforced in middleware **and** by every repository function's `spaceId` parameter **and** by composite FKs. Cross-space tests cover all three layers.
- Invite codes: 8 characters from `23456789ABCDEFGHJKMNPQRSTUVWXYZ` (31⁸ ≈ 8.5 × 10¹¹), shown as `XXXX-XXXX`, normalised on input (case, spaces, dashes). Guessing is rate-limited, codes are rotatable, and a full space rejects every code with the same error.
- Zod on every input, with length caps and `http(s)` URL validation. JSON bodies are capped at 64 KB.
- **CSP** (`.vercel/output/config.json` for every response, written by `scripts/build-vercel.ts`; Hono `secureHeaders` for `/api` as well): `default-src 'self'`, `script-src 'self'`, `style-src 'self' https://fonts.googleapis.com`, `font-src https://fonts.gstatic.com`, `img-src 'self' data: blob: https://res.cloudinary.com`, `connect-src 'self' https://api.cloudinary.com`, `worker-src 'self'`, `manifest-src 'self'`, `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`. Same-origin `wss:` is covered by `'self'` in current browsers; Phase 7 checks this on iOS Safari and Android Chrome.
- No secrets in the client bundle (`check:secrets` in CI). `.env`, `.env.*` (except `.env.example`) and `.dev.vars*` are git-ignored.
- Reset tokens are single-use and expire after 1 hour, and responses don't reveal whether an account exists.
- Logs never contain env values, cookies, passwords, tokens or SQL parameters.

## 13. Pinned versions (checked 2026-11-09)

Exact versions go in `package.json`, and pnpm writes the lockfile.

| Area | Packages |
|---|---|
| Build | `vite` 8.3.7 · `@vitejs/plugin-react` 6.3.0 · `typescript` **6.0.3** (D4) · `esbuild` 0.28.2 (the function bundle, D56) |
| Client | `react` / `react-dom` 19.3.1 · `@tanstack/react-router` 1.170.46 + `@tanstack/router-plugin` 1.169.0 · `@tanstack/react-query` (+ persist-client, async-storage-persister) 5.107.1 · `idb-keyval` 6.3.0 · `react-hook-form` 7.91.0 · `@hookform/resolvers` 7.0.5 |
| Shared | `zod` 4.6.7 · `date-fns` 4.4.0 + `@date-fns/tz` 1.5.0 · `uuid` 14.0.3 |
| Server | `hono` 4.13.17 (D29) · `@hono/node-server` 2.1.7 · `@vercel/functions` 3.11.1 · `@hono/zod-validator` 0.9.1 · `better-auth` 1.7.18 · `drizzle-orm` 0.45.4 · `drizzle-kit` 0.31.11 (D6) · `@neondatabase/serverless` 1.2.0 |
| PWA | `vite-plugin-pwa` 2.0.0 · `@vite-pwa/assets-generator` 2.0.0 · `workbox-*` 7.4.1 · `sharp` 0.35.5 |
| Quality | `vitest` **4.1.12** (D5) · `@playwright/test` 1.65.0 · `eslint` 10.14.0 · `typescript-eslint` 8.72.1 · `eslint-plugin-react-hooks` 7.1.1 · `prettier` 3.9.10 |

Runtime: Node 22 (you have 22.18; the function runs `nodejs22.x`), pnpm 10.

## 14. Follow-ups (open after Phases 1–3)

- **Needs your action:** a Vercel account and project (Hobby), linked to a GitHub repository or deployed with `vercel deploy --prebuilt`; its environment variables (§10); a domain verified in Resend for password-reset email (D45), since `*.vercel.app` can't be verified. A GitHub remote, with `NEON_API_KEY`, `BETTER_AUTH_SECRET` secrets and the `NEON_PROJECT_ID` variable, so CI can run. The Neon `production` branch needs migrations 0001 and 0002 before the first deploy. Local work uses the Neon `dev` branch (migrated and seeded on 2026-11-11); the default branch `production` holds the schema only.
- **Email verification** is not built: the auth designs have no "verify your email" or "check your inbox" screen for it, and nothing gates on `email_verified`.
- **Screens awaiting design:** none. Profile is built (D66), as are Shopping (D62–D65), Trips, Goals, Home and the nav bar. The privacy page linked from Create account is a TEMP placeholder. Trips is built (D59–D61); until Home is built, the invite code after Start shows on the TEMP Profile page instead of Home's first-run card (D44). The nav bar is built (D46).
- **Home, not yet built:** live partner updates (the prototype's `?live=1`) arrive with realtime in Phase 5. The prototype's Home has no entry point to the switch (D33), so `/setup/join?switch=true` is reachable by URL only; the auth hand-off notices aren't in the Home prototype and aren't built.
- **Transactional writes are slow locally:** an add to a goal takes about 1.5–2 s, because each interactive transaction opens a WebSocket `Pool` to Neon (D2). Measure p95 in Vercel's function logs after the first deploy; above ~150 ms, D2 says to revisit (Hyperdrive).
- **Goals, not yet built:** live partner updates and the prototype's live fixtures (Phase 5); without them the form's merge messages say "on another phone" instead of naming who changed it, and the composer's "<name> deleted <goal>" banner uses the partner's name. The client re-reads a goal or note on `409` instead of using the `current` in the body (`api()` keeps only the error). After deleting a goal the list replaces the page, so Back lands on the deleted goal's "isn't here any more" page. `pnpm images:orphans` is still a stub.
- **Undo right before a reload:** the persisted cache is written at most every 250 ms (D49), so an Undo pressed within that window before a reload or close can be lost; the add then stays.
- **D3 measured** (on Workers): scrypt costs ~49 ms per hash and ~50 ms per verify. Vercel's Node.js functions have no per-request CPU cap, so Hobby is enough (D56).
- **Vercel previews:** preview deployments need their own `APP_URL` (the same-origin and Better Auth origin checks use it) and a Neon branch; not set up.
- **Realtime (Phase 5)** needs a new design on Vercel (§7, D56).
- **Uploads cleanup on the switch:** deleting a solo space should also destroy its Cloudinary assets (Phase 6).

## 15. Decision log

| # | Decision | Why |
|---|---|---|
| D1 | **Self-hosted Better Auth (1.7.18) inside the Worker, not Neon Auth.** | Neon Auth is now "Managed Better Auth", and for this setup it loses on three counts. First, its auth server runs on a Neon domain. The SPA would call it cross-origin, with `SameSite=None` cookies on `*.neon.build` and 15-minute JWTs verified by our API, and Neon's own roadmap lists a "standalone frontend + backend" setup as *coming soon*. Second, password-reset emails always use Neon's templates, even with custom SMTP, and its reset SDK method is "not fully supported yet". Third, there are no custom hooks or options, and `additionalFields` isn't documented. Self-hosting gives same-origin `SameSite=Lax` httpOnly cookies, Resend with our own templates, and auth tables in our own Drizzle schema with real FKs, still branched by Neon. The price is D3 and keeping up with Better Auth security releases (a batch landed 2026-11-03, so pin ≥ 1.7.18). |
| D2 | **No Hyperdrive in v1.** Keep the Neon serverless driver: HTTP `neon()` for single statements and batches, and a per-request WebSocket `Pool` for interactive transactions. Revisit if transactional routes run above ~150 ms p95 in Workers Observability. | Neon's Workers guide now *recommends* Hyperdrive (with `pg` and the direct endpoint, updated 2026-10-09). It is free-plan eligible (100k queries a day) and makes interactive transactions cheap. For two users, the gain is about 50 ms on the few transactional writes. The costs are real: query caching must be switched off, or a partner's refetch can read a 60-second-old result; each per-PR preview needs its own Hyperdrive config, because configs are shared across previews otherwise; and the driver changes. The swap stays cheap: `db/client.ts` is the only file that knows the driver, and multi-statement writes go through one `atomic()` helper (a `batch` today, a `transaction` on `pg`). |
| D3 | *Superseded by D56.* **Workers Paid plan ($5/month) from the first deploy.** | Workers Free allows 10 ms of CPU per request. Better Auth hashes passwords with scrypt (N=16384, r=16). Since `@better-auth/utils` 0.4.1 it uses Workers' native `node:crypto` scrypt, which fixed the old "exceeded CPU time" failures, but that hash is still expected to cost more than 10 ms. Sign-up, sign-in and password changes would fail on Free. Paid allows 30 s by default. Phase 3 measures the real cost. Durable Objects (SQLite-backed), rate limiting and Hyperdrive work on both plans. |
| D4 | **TypeScript 6.0.3, not 7.0.2.** | `typescript-eslint` 8.72 supports `typescript >=4.8.4 <6.1.0`. TS 7 (the native compiler) can be added later as a fast `typecheck` once linting supports it. |
| D5 | *Superseded by D56.* **Vitest 4.1.12, not 5.1.** | `@cloudflare/vitest-pool-workers` 0.23 requires `vitest ^4.1.0`, and the API tests must run in workerd. |
| D6 | **Drizzle ORM 0.45.4 and drizzle-kit 0.31.11.** | They are the stable releases (1.0 is still a release candidate), and Better Auth's adapter supports `^0.45.2`. |
| D7 | **`display_name` is Better Auth's `name` field, mapped to the `display_name` column**, not a second column. | Better Auth already requires `name` at sign-up. Two columns would drift. |
| D8 | **The server picks the Cloudinary `public_id` and signs it**, instead of signing only a folder. | The phone can't write anywhere else, the prefix check becomes exact, and it behaves the same under Cloudinary's fixed and dynamic folder modes. |
| D9 | **Ticks are set-state endpoints (`PUT …/bought { bought }`), not toggles.** | Replaying a toggle after an offline period would flip it twice. |
| D10 | **Change notices gain an optional `parentId`** (goal or trip id). | It lets the client invalidate one goal's or trip's keys instead of every goal or trip. |
| D11 | **Scheduling a place creates a linked plan entry pre-filled from the place** (title, type, url, area → location, estimated cost → cost). | The link drives "visited" and the budget rule, and the estimate keeps counting exactly once, now through the plan entry. The place stays in the wishlist, marked as scheduled. |
| D12 | **Only the title is required for every entity, with one exception: money goals need `target_amount`.** Trip dates are optional (status "unscheduled"). | This follows the quick-capture rule. A money goal without a target has no progress or completion. |
| D13 | **A journal note is saved as a whole** (ordered blocks, integer positions rewritten on save), not edited block by block with fractional keys. | Notes are edited in one editor, not concurrently block by block. Replacing blocks in one transaction is simpler, and diffing old and new image blocks drives asset cleanup. |
| D14 | **Shopping `quantity` is an integer.** *(The `price` half is superseded by D63.)* | Whole numbers keep the steppers and the sums simple. |
| D15 | **Money minor units come from an explicit ISO 4217 table**, not `Intl`. | Stored integers must never change meaning if a browser's CLDR data changes. |
| D16 | **`updated_at` has millisecond precision.** | Postgres keeps microseconds and JS `Date` keeps milliseconds. Without this, every optimistic check would fail. |
| D17 | **`DELETE` answers `204` even when nothing was deleted.** | Idempotent retries, and it reveals nothing about other spaces' ids (reads and updates still return 404). |
| D18 | **Composite FKs `(parent_id, space_id)`.** | A second line of defence for "every row belongs to exactly one space". |
| D19 | **Leaving a space is stubbed (`501`).** | Leaving raises product questions the brief doesn't answer: who keeps the data, what happens to attribution, and whether the leaver can rejoin. Better decided together later. |
| D20 | *Superseded by D56.* **The Worker reads `.env` directly; there is no `predev` copy script.** | Both `vite dev` (Cloudflare plugin v1) and `wrangler dev` now load `.env` files as Worker bindings. Two catches. First, a `.dev.vars` file disables `.env` loading entirely, so there must be none. Second, `.env.local` is loaded too and overrides `.env`; yours holds a stale `VERCEL_OIDC_TOKEN`. `env.ts` ignores unknown keys, and Phase 1 tries `secrets.required` (added 2026-03) to limit loading to the declared keys. |
| D21 | **The dev server runs on port 3000** (`strictPort`). | Your `APP_URL` already says `localhost:3000`. |
| D22 | ~~**`BETTER_AUTH_URL` is optional and defaults to `APP_URL`.**~~ Superseded by D45: there is no `BETTER_AUTH_URL`. | Same origin, so one value. Override it only if auth ever moves. |
| D23 | **The theme choice (light, dark or system) is stored per device** (localStorage), not on the account. | Partners may want different themes, and the choice is needed before any network call. |
| D24 | **Seeded checklist suggestions are in English** in `src/worker/services/checklist-seed.ts`. | i18n isn't in scope. The list is one file to translate later. |
| D25 | *Superseded by D56.* **Per-PR previews use Cloudflare Worker Previews** (`wrangler preview`, released 2026-09-22), each with its own Durable Object namespace. **Fallback:** a throwaway Worker per PR (`zamane-pr-N`, deleted on close). | Classic version preview URLs are not generated for Workers that implement a Durable Object, so they can't serve this app. Worker Previews can, but whether they accept a Vite-plugin build output is undocumented. The first CI run settles it. Each preview gets its own `DATABASE_URL` (the PR's Neon branch) and auth URL. |
| D27 | *Superseded by D56.* **Durable Objects are declared with the new `exports` config** (`{ "SpaceRoom": { "type": "durable-object", "storage": "sqlite" } }`), not the legacy `migrations` list. | It's the current form (2026-06), it's what Worker Previews expect, and the project has no legacy migrations to keep. This is one-way once deployed, so Phase 5 checks it with the Vite plugin before the first deploy. |
| D28 | *Superseded by D56.* **Cloudflare Vite plugin v1 (1.68), not the v2 beta.** | v2 swaps `wrangler.jsonc` for `cloudflare.config.ts` and Wrangler deploys for `cf deploy`. That's worth adopting when stable, not during foundations. |
| D29 | **Hono 4.13, not the 5.0 RC.** | There's no migration guide yet. RPC type-check cost is kept down by chaining routes, one sub-app per area, and pre-compiling the Worker's types for the client if the IDE slows down (Hono's documented `hcWithType` pattern). |
| D30 | **vite-plugin-pwa is restricted to the client build** (its plugins wrapped with `applyToEnvironment: env => env.name === "client"`). | vite-plugin-pwa still doesn't support Vite's Environment API, so it can emit service-worker files into the Worker build too. If wrapping it isn't enough, the fallback is `workbox-build`'s `injectManifest` over `dist/client` as a post-build step. |
| D31 | **PR database branches are created schema-only from `main`**, then migrated and seeded with the demo data. | Real couples' data never reaches a preview, and migrations are tested against production's real schema history. If the Neon action doesn't expose schema-only, CI calls the Neon API directly. |
| D32 | **One `DATABASE_URL`, on the direct endpoint, for everything.** | Neon says migrations should not run through the pooler. Two users never pressure direct connections, and the HTTP driver works the same against either endpoint. Your `.env` currently has the **pooled** host (`-pooler`), so please switch it (below). `env.ts` warns when it sees `-pooler`. |
| D26 | *Superseded by D57.* **One rate limiter: the Workers Rate Limiting binding, applied in Hono middleware before the auth handler. Better Auth's built-in limiter is off.** | Better Auth's default `memory` store is a per-isolate `Map`, which means nothing on Workers. Its `database` store adds a write to every auth request and had a race advisory for Postgres (2026-09-30). The binding (GA 2025-09) is free, has no storage, and is simulated in local dev. Its counts are per location and approximate, which is fine for brute-force protection. |
| D34 | (Since D56 the output is `.vercel/output`: `static/` for the client, `functions/` for the server.) **`check:secrets` looks for the secret *literals* in the client bundle only, and for secret *values* everywhere in `dist/`.** It also fails if the Worker's `.js` contains the test-only route. | The Worker bundle legitimately names its own bindings (`CLOUDINARY_API_SECRET` in `env.ts`) and validates `postgres://` URLs, so the literal check can only mean the code browsers download. Checking real values (when present in the environment) covers what the literal check was for. `dist/zamane/.dev.vars`, written by the Cloudflare plugin for local `vite preview`, is skipped: it's outside the served assets and never uploaded by `wrangler deploy`. |
| D35 | *Superseded by D56.* **`@cloudflare/vitest-plugin` 1.7.0 instead of `@cloudflare/vitest-pool-workers` 0.23.0.** | 0.23.0 is deprecated ("renamed to `@cloudflare/vitest-plugin`; no future updates") and bundles Wrangler 4.124. The successor supports `vitest ^4.1.0`, so D5 holds. |
| D36 | *Superseded by D56.* **`compatibility_date` is `2026-11-10`, not the scaffold date.** | The workerd bundled with `@cloudflare/vite-plugin` 1.68.0 refuses `2026-11-11` ("the newest date supported by this server binary is 2026-11-10"). Bump it with the toolchain. |
| D39 | **`RESEND_API_KEY` is required outside development.** (Its first version also required `EMAIL_FROM`; superseded by D45.) | Locally the dev logger prints the reset link. In preview and production, a missing key fails at startup instead of silently not sending. |
| D42 | *Superseded by D56.* **`secrets.required` in `wrangler.jsonc` lists every `.env` key the Worker reads.** | Checked in Phase 1: with the list present, `vite dev` passes only those keys to the Worker, so stray `.env` / `.env.local` keys (`VERCEL_OIDC_TOKEN`, AWS keys) never reach it. This closes D20's open point. |
| D33 | **The switch: a scoped exception to D19.** Someone *alone* in a space they started can join their partner's instead: `POST /api/spaces/join { code, replaceSolo: true }`. One interactive transaction locks their space (`FOR UPDATE`), checks they're still alone (else `409 partner_joined` with the partner's name), checks the code before anything is deleted (else `404 invite_invalid`, nothing deleted), deletes the solo space (cascade) and joins as slot b. | The auth designs build it (`/setup/join?switch=true` and its confirmation). It touches none of D19's open questions: there's no partner, no shared attribution and nothing to rejoin. A partner joining the solo space at the same moment either commits first (→ `partner_joined`) or finds the space gone (FK violation → `invite_invalid`). Cloudinary cleanup of the deleted space's assets joins in Phase 6. Leaving a shared space stays `501`. |
| D37 | **API additions the auth screens need:** the `GET /api/me` body above; `partnerName` in the join response (it fills the waiting seat); `409 already_in_space` on create and join (the join statement alone would answer `invite_invalid`, which would be untrue); a join retry by someone already in that space answers `200`; `Retry-After: 60` and `rate_limited` on every 429 (the screens wait that long before re-enabling the button); `GET /api/password-reset/check` (the reset screen shows "Link doesn't work" on arrival); `GET /api/spaces/mine/summary`. Client-side, the invite link `/join#code=XXXX-XXXX` keeps the code on the device (session storage), strips it from the URL and routes to Create account, Join, or Home. | Each one is drawn by the designs in `.ux-forge/auth`. The fragment keeps the code out of server logs. |
| D38 | **A gate in front of Better Auth.** Only the endpoints the app uses are reachable (others `404`). Bodies are validated with the same Zod schemas as the forms, and emails are normalised, before the rate limiter and the handler. `change-password` always revokes the other sessions. Better Auth's error codes are translated into the app's `{ error: { code, message, fields? } }` (`invalid_credentials`, `email_taken`, `invalid_token`, `validation_failed`). | One error shape everywhere (§3), one validation rule set (the forms' messages come back from the server unchanged), a smaller attack surface, and the sign-up enumeration Better Auth allows is kept to one message with no hint of whose account it is. |
| D40 | **The auth E2E runs against `vite dev` with `E2E=1`, not `vite preview`.** | It reads the reset link from a test-only endpoint (`GET /api/test/last-reset-link`), which exists only when the Worker is built by a dev server with `E2E=1` *and* `APP_ENV=development`. A production build defines the flag as `false`, so the route's code is not bundled; `check:secrets` fails the build if it ever is, and an API test checks it answers 404 without the flag. |
| D41 | **The persisted query cache's buster is the app version only; sign-in and sign-up clear the cache instead of keying it by user id.** | The buster is read when the cache is restored, before anyone is known to be signed in. Clearing on every session start gives the same guarantee (no data crosses users) without a second restore. |
| D43 | **Routes follow the designs: `/sign-in`, `/create-account` (not `/sign-up`), `/forgot-password`, `/reset-password?token=`, `/setup`, `/setup/start`, `/setup/join` (and `?switch=true`), `/join#code=`, `/privacy` (TEMP).** The launch screen is `/` before the session is known: a static splash in `index.html` (first paint), then the right route, or "You're offline" / "Zamane didn't open" when there's no session to open from. | The designs name them; the splash in `index.html` is what makes "no flash of the wrong screen" true, since React replaces it in one synchronous commit once `/api/me` has answered. |
| D44 | **Until Home and Profile are designed and built, the app pages are placeholders (the route name only), and Profile is a TEMP page.** (Its first version also linked the placeholders to Profile; the nav bar replaced that link, D46.) The TEMP Profile shows the display name (editable), change password, the space name, both members with their slot, the invite code with Copy and New code, the theme (light, dark or system, D23) and Sign out. | Auth needs these controls now; their look waits for a design, and each TEMP file says so at its top. |
| D45 | **No `BETTER_AUTH_URL` and no `EMAIL_FROM`.** Auth's base URL is `APP_URL`. The sender is chosen by the app: `Zamane <onboarding@resend.dev>` in development, `Zamane <no-reply@{APP_URL host}>` elsewhere. | Your call (2026-11-11): two keys you don't need. One origin means one URL. Resend's shared test sender only delivers to the Resend account's own address, which is enough to try the email locally; preview and production need the app's domain verified in Resend. An E2E dev server keeps the reset link in its test outbox even with Resend configured, because test addresses can't receive mail. |
| D46 | **The nav bar is built from `.ux-forge/nav-bar/nav-bar.html`, in the `/_app` layout (`AppShell`).** Phones: a fixed bottom tab bar (Home, Goals, Trips, Shopping, Profile). From 48rem: a sticky top bar with the lockup linking Home, Profile at the far end. The current destination gets `aria-current="page"`, the heavier stroke and the ز dot; a sub-page (`/goals/new`) keeps its tab current. Profile's icon is the person's initial on their partner tint (slot a or b). Tapping the current tab scrolls to the top. Each page focuses its own h1 after an in-app navigation. | Ported as drawn; the bar matches the prototype at 390, 360 and 320 px and 1440 px, light and dark (tests/visual/report/nav). Titles keep the app's "{screen} – Zamane" form rather than the prototype's "·", so every screen titles alike. |
| D47 | **Amounts are shown the designs' way: grouped digits, decimals only when there are any, then the code ("20,250 MAD", "500.5 MAD"): `formatAmount` in `src/shared/money.ts`.** The digits still come from the ISO table (D15). | The Home, Goals and Trips prototypes all write amounts this way; `Intl`'s currency style ("MAD 20,250.00") doesn't match them. |
| D48 | **Home and goal entries are built ahead of the Goals phase:** `GET /api/home` (shape in §5), `POST /api/goals/:goalId/entries` (idempotent on the client's id; one interactive transaction with the goal locked `FOR UPDATE`; completion recomputed by `src/shared/completion.ts`; answers `{ entry, goal: { progress, completedAt }, completed }`), and `DELETE …/entries/:entryId` (204 always, completion recomputed). Trip status and the day maths are in `src/shared/trip-days.ts`, from the device's date. | Home's quick add and its Undo need them. Two partners adding at once complete the goal exactly once (API test). Realtime broadcasts are added in Phase 5. |
| D49 | **Every goal-entry write (an add, an Undo) runs in one mutation queue (`scope: goalEntries`), and the persisted cache is written every 250 ms (was 1 s).** Undo of an add that hasn't been sent yet (offline, or queued) removes it from the queue; otherwise it queues `['goalEntries','remove']` (DELETE) right behind the add. | An Undo pressed while the add is still in flight must wait for it; held only in page memory it was lost on reload (found by E2E). Queued, it is persisted and replayed like the add. |
| D50 | **The designs' limits apply inside the database caps:** goal title ≤ 80 characters, description ≤ 500 (counter from 450), a note ≤ 20 000 characters in all with ≤ 10 000 per text block (counter from 9 000), ≤ 10 photos per note, photo description (alt) ≤ 250, photos ≤ 10 MB. Messages are the designs' (`GOAL_LIMITS`, `GOAL_MSG` in `src/shared/schemas/goals.ts`). | The prototypes (form.js, composer.js) set them; the DB caps of §4.1 stay as the outer bound. |
| D51 | **`GET /api/goals` carries `images: { cloudName } | null`.** | The Goals screens build delivery URLs and hide upload controls from the same cached response, so they work offline from the persisted cache without a second request to `/api/config`. |
| D52 | **Uploads were built with Goals (pulled forward from Phase 6):** signing with SHA-256 (`signature_algorithm=sha256`, verified against the account), `public_id` = `zamane/{spaceId}/{goal-cover|note-image}/{uuidv7}`, `allowed_formats=jpg,png,webp`, `overwrite=false`; the phone downscales to ≤ 2048 px and re-encodes as JPEG (`src/client/lib/uploads.ts`), uploads by XHR with progress; the Worker checks the prefix on save and destroys replaced or deleted assets in `waitUntil`. | The Goals designs have cover photos and journal photos with progress, failure and retry states; building them later would have meant porting those screens twice. |
| D53 | **Journal notes:** `goal_note_blocks.alt` added (migration `0001_note_block_alt`, ≤ 250); only a note's author edits or deletes it (`403 forbidden`, a new error code); `PUT` replaces every block in one transaction with the optimistic check and destroys the photos that were dropped. Either partner can delete any contribution (detail.js: "Delete Youssef's 1,000 MAD?"). | The composer has a photo description field and author-only Edit; the entry sheet offers Delete on every row. |
| D54 | **Goals CSS is the prototypes' own, scoped to `html[data-route="goals"]`** (`goals.css` from zamane.css's additions and list.css; `goals-detail.css`, `goals-composer.css`, `goals-form.css`), generated by a scoping pass that keeps `:root` tokens and `@keyframes` global. Create and edit are task pages: AppShell sets `data-chrome="task"` there, which hides the bottom nav on phones (goals.html decision (a)). | Port, don't redesign: the rules stay byte-for-byte the prototype's, and other pages are untouched. |
| D55 | **Drafts on this phone:** the goal form (`zamane.goals.draft.new`, `…draft.edit.<id>`) and the note composer (`zamane.goals.noteDraft:<goalId>:<new|noteId>`) keep what was typed in `localStorage` through navigation and reload; sign-out clears both. Entry writes from a goal's page go through the same queue as Home's (D49) and patch the Goals caches optimistically. | The designs restore drafts ("Draft restored."); a shared phone must not show the last person's drafts. |
| D56 | **Hosting is Vercel (Hobby), not Cloudflare Workers.** One project: the client build as static files and the whole Hono app as one Node.js function (`src/worker/vercel.ts` via `@hono/node-server`), in `fra1` next to Neon (eu-central-1). `pnpm build` writes the Build Output API (`.vercel/output`) itself (`scripts/build-vercel.ts`: esbuild bundle, routes, headers, CSP). Settings come from `process.env`; background work uses `waitUntil` from `@vercel/functions` (`src/worker/background.ts`); the caller's IP is `x-real-ip`. Wrangler, the Cloudflare Vite plugin and the Workers test pool are removed. Supersedes D3, D5, D20, D25, D27, D28, D35, D36. | The owner's choice (2026-11-11): Vercel Hobby. Node.js functions have no per-request CPU cap, so scrypt needs no paid plan (D3). Writing the output ourselves keeps the SPA and the API in one deployment without adopting a framework, and `pnpm preview` serves exactly what deploys. Hobby is for personal, non-commercial use, which fits a two-person app; one region. The Durable Object realtime design (§7) no longer applies and is redone at Phase 5. |
| D57 | **Rate limits are counters in Neon** (`rate_limits`: SHA-256 of "limiter:purpose:value", one-minute window, `count`; migration `0002_rate_limits`). One upsert per check; rows older than an hour are swept now and then in the background. Same limits and keys as before (§5), same `429` with `Retry-After: 60`. Supersedes D26. | Vercel has no rate-limit binding on Hobby; the database already there needs no new account (the owner's choice over Redis). Hashed keys keep emails and IPs out of the table. |
| D58 | **Local dev and the API tests run on Node.** `pnpm dev` hands `/api/*` to the Hono app through a small Vite plugin (`.env` read into `process.env`); the API tests (Vitest, Node) call `app.fetch` directly with their settings in `vitest.config.ts`. A restored query cache is marked stale, so every screen refetches on mount (`src/client/lib/query.ts`). | The same runtime as production (Node), one port, no Wrangler. The stale-on-restore fix came from an E2E race: after a reload, a restored total could stay old for the staleTime. |
| D59 | **Trips API shape.** `GET /api/trips/:id` returns the whole trip (`trip`, `entries`, `places`, `items`) in one round trip, so the detail page has one cache entry that the three offline writes patch. There are no separate list endpoints for the plan, places or checklist, and no `GET …/budget`: budget, days, status and now / next are computed on the device from those rows (`src/shared/trip-plan.ts`, unit-tested). Checklist items gain `seeded` (migration `0003_trip_item_seeded`: the suggestions made with the trip show no "Added by", D24). Reordering is `POST …/checklist/:itemId/move`, which renumbers the group in one transaction. Scheduling takes the new entry's id; a replay answers that entry, another entry holding the place answers `409` with it. Ticks keep the first `done_at` / `done_by` and don't change `updated_at`. Limits are the designs' (`TRIP_LIMITS`: title 80, destination 80, location 120, area 80, link 2 000, notes 4 000, money ≤ 1 000 000 in whole units). | The prototype reads and writes exactly these rows (shared.js). One read keeps offline and optimistic patches simple; deriving on the device matches §4.3. |
| D60 | **Trips CSS is the prototypes' own, scoped to `html[data-route="trips"]`** (`trips.css`, `trips-detail.css`, `trips-dialogs.css`, `trips-form.css`), by the same scoping pass as D54. Create and edit are task pages (`data-chrome="task"`). Drafts live in `zamane.trips.draft.*` and `zamane.trips.draft:*` and are cleared on sign-out (D55). | Port, don't redesign. |
| D61 | **API tests set `__E2E__` and `__APP_VERSION__` as globals** (`tests/api/setup.ts`): Vitest 4 no longer applies a project's `define` to server code, so the suite failed to load. | The tests run again without touching the app. |
| D62 | **Shopping API shape** (`src/shared/schemas/shopping.ts`, `src/worker/services/shopping.ts`). `GET /api/shopping` answers `{ currency, items, members }`; grouping and counts are the device's (`src/shared/shopping-list.ts`). Creates are idempotent on the client id; ticks set state, keep the first buyer and don't bump `updated_at`; PATCH answers 409 with `current`. `clear-bought` returns the removed rows and `POST /restore` puts rows back with their ids, adders and buyers (Undo of delete and clear bought, up to 200 rows, members only). | Matches the design (ticks never conflict; Undo must be honest). |
| D63 | **Shopping items have a `unit` (piece, l, g, kg; default piece), not a price.** Migrations 0004 (drop `price`) and 0005 (add `unit`); quantity is 1 to 9999. No totals or subtotals. | The user's call after the first design: a shopping list counts things, it doesn't price them. Supersedes the price half of D14. |
| D64 | **Shopping rows show when an item was added (date and hour), not who.** The item sheet shows who added and bought it. The primary action is the floating Add item button (masthead on wide) that opens the item form; there is no docked quick-add field. | The user's call; reverses the docked field of the design's first round. |
| D65 | **Scoped Shopping CSS** (`html[data-route="shopping"]`, same one-off pass as D54 and D60); drafts under `zamane.shopping.draft` are cleared on sign-out; Shopping sheets are not task pages (the nav stays). | Same rules as Goals and Trips. |
| D66 | **Profile and Settings are redesigned and built straight in the app** (no HTML prototype, the user's call), direction B "Set tiles" from `.ux-forge/profile/directions.md`: a khatam star-and-cross tile field (CSS mask engine `.zl`) with both partner glazes meeting, name plates, the invite code as two set tiles in a grout well, hairline cards each with a zellige-soft star strip, a 2x2 grid from 48rem. Order: couple card, You (name autosaves on blur), Appearance (zellige tile swatches), Security (the password form opens on request), About and sign out; revised after the user's review (stronger glazes, plain invite slip, no star strips under titles, no partner A/B subtitle). CSS is scoped (`html[data-route="profile"]`, `pf-` prefix); zellige green appears here only as decoration. Behaviour and e2e hooks are unchanged. | The user asked for a reorganised page with more zellige identity; the TEMP page (D44) is replaced. |
