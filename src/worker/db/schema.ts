/**
 * The whole data model (§4), hand-owned. Better Auth's tables (user, session, account, verification) live here too,
 * with uuid ids (UUID v7 from the app) and `name` mapped to `display_name` (D7).
 *
 * Conventions:
 * - every space-owned table has space_id (cascade), created_by, created_at and updated_at (ms precision, D16);
 * - children reference parents with composite FKs (parent_id, space_id) (D18);
 * - enums are text + CHECK built from the arrays in src/shared/enums.ts;
 * - text caps are mirrored by CHECK (char_length(...) <= n).
 */
import { sql, type SQL } from "drizzle-orm";
import {
  boolean,
  char,
  check,
  customType,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  smallint,
  text,
  time,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { CAPS, CHECKLIST_GROUPS, GOAL_KINDS, NOTE_BLOCK_KINDS, SLOTS, TRIP_ITEM_TYPES } from "../../shared/enums.ts";
import { toSafeMinor } from "../../shared/money.ts";

// ---------- helpers ----------

/** bigint minor units, read into a safe JS number (§4). */
const money = customType<{ data: number; driverData: string | number }>({
  dataType: () => "bigint",
  fromDriver: (v) => toSafeMinor(v),
  toDriver: (v) => v,
});

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true, precision: 3 }).notNull().defaultNow();

function inList(col: AnyPgColumn, values: readonly string[]): SQL {
  return sql`${col} in (${sql.raw(values.map((v) => `'${v}'`).join(", "))})`;
}
function maxLen(col: AnyPgColumn, n: number): SQL {
  return sql`char_length(${col}) <= ${sql.raw(String(n))}`;
}
function httpUrl(col: AnyPgColumn): SQL {
  return sql`${col} ~* '^https?://' and char_length(${col}) <= ${sql.raw(String(CAPS.url))}`;
}

/** Image asset stored on goals, trips and note blocks (§8). */
export interface ImageAsset {
  publicId: string;
  version: number;
  width: number;
  height: number;
  format: string;
}

// ---------- Better Auth ----------

export const user = pgTable(
  "user",
  {
    id: uuid("id").primaryKey(),
    displayName: text("display_name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [check("user_display_name_len", maxLen(t.displayName, CAPS.name))],
);

export const session = pgTable(
  "session",
  {
    id: uuid("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_id_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: uuid("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("account_user_id_idx").on(t.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: uuid("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

// ---------- spaces ----------

export const spaces = pgTable(
  "spaces",
  {
    id: uuid("id").primaryKey(),
    name: text("name").notNull(),
    currency: char("currency", { length: 3 }).notNull(),
    timezone: text("timezone").notNull(),
    inviteCode: text("invite_code").notNull().unique(),
    inviteCodeRotatedAt: timestamp("invite_code_rotated_at", { withTimezone: true }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => user.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("spaces_name_len", sql`char_length(${t.name}) between 1 and ${sql.raw(String(CAPS.name))}`),
    check("spaces_currency_iso", sql`${t.currency} ~ '^[A-Z]{3}$'`),
    check("spaces_invite_code_format", sql`${t.inviteCode} ~ '^[2-9A-HJKMNP-Z]{8}$'`),
  ],
);

export const spaceMembers = pgTable(
  "space_members",
  {
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    slot: char("slot", { length: 1 }).notNull().$type<(typeof SLOTS)[number]>(),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.spaceId, t.userId] }),
    unique("space_members_user_unique").on(t.userId),
    unique("space_members_space_slot_unique").on(t.spaceId, t.slot),
    check("space_members_slot", inList(t.slot, SLOTS)),
  ],
);

// ---------- goals ----------

export const goals = pgTable(
  "goals",
  {
    id: uuid("id").primaryKey(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    kind: text("kind").notNull().$type<(typeof GOAL_KINDS)[number]>(),
    title: text("title").notNull(),
    description: text("description"),
    targetAmount: money("target_amount"),
    targetDate: date("target_date"),
    cover: jsonb("cover").$type<ImageAsset>(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    completedBy: uuid("completed_by").references(() => user.id),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => user.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("goals_id_space_unique").on(t.id, t.spaceId),
    index("goals_space_id_idx").on(t.spaceId),
    check("goals_kind", inList(t.kind, GOAL_KINDS)),
    check("goals_title_len", sql`char_length(${t.title}) between 1 and ${sql.raw(String(CAPS.title))}`),
    check("goals_description_len", maxLen(t.description, CAPS.notes)),
    check(
      "goals_target_by_kind",
      sql`(${t.kind} = 'money' and ${t.targetAmount} > 0) or (${t.kind} = 'general' and ${t.targetAmount} is null)`,
    ),
    check("goals_completed_pair", sql`(${t.completedAt} is null) = (${t.completedBy} is null)`),
  ],
);

export const goalEntries = pgTable(
  "goal_entries",
  {
    id: uuid("id").primaryKey(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    goalId: uuid("goal_id").notNull(),
    amount: money("amount"),
    percent: smallint("percent"),
    note: text("note"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => user.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    foreignKey({
      name: "goal_entries_goal_fk",
      columns: [t.goalId, t.spaceId],
      foreignColumns: [goals.id, goals.spaceId],
    }).onDelete("cascade"),
    index("goal_entries_space_id_idx").on(t.spaceId),
    index("goal_entries_goal_created_idx").on(t.goalId, t.createdAt),
    check("goal_entries_one_value", sql`(${t.amount} is null) <> (${t.percent} is null)`),
    check("goal_entries_amount_positive", sql`${t.amount} is null or ${t.amount} > 0`),
    check("goal_entries_percent_range", sql`${t.percent} is null or ${t.percent} between 0 and 100`),
    check("goal_entries_note_len", maxLen(t.note, CAPS.notes)),
  ],
);

export const goalNotes = pgTable(
  "goal_notes",
  {
    id: uuid("id").primaryKey(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    goalId: uuid("goal_id").notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => user.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("goal_notes_id_space_unique").on(t.id, t.spaceId),
    foreignKey({
      name: "goal_notes_goal_fk",
      columns: [t.goalId, t.spaceId],
      foreignColumns: [goals.id, goals.spaceId],
    }).onDelete("cascade"),
    index("goal_notes_space_id_idx").on(t.spaceId),
    index("goal_notes_goal_id_idx").on(t.goalId),
  ],
);

export const goalNoteBlocks = pgTable(
  "goal_note_blocks",
  {
    id: uuid("id").primaryKey(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    noteId: uuid("note_id").notNull(),
    position: integer("position").notNull(),
    kind: text("kind").notNull().$type<(typeof NOTE_BLOCK_KINDS)[number]>(),
    text: text("text"),
    image: jsonb("image").$type<ImageAsset>(),
    /** The photo's description, read aloud (image blocks only). */
    alt: text("alt"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => user.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    foreignKey({
      name: "goal_note_blocks_note_fk",
      columns: [t.noteId, t.spaceId],
      foreignColumns: [goalNotes.id, goalNotes.spaceId],
    }).onDelete("cascade"),
    uniqueIndex("goal_note_blocks_note_position_unique").on(t.noteId, t.position),
    index("goal_note_blocks_space_id_idx").on(t.spaceId),
    check("goal_note_blocks_kind", inList(t.kind, NOTE_BLOCK_KINDS)),
    check(
      "goal_note_blocks_shape",
      sql`(${t.kind} = 'text' and ${t.text} is not null and ${t.image} is null) or (${t.kind} = 'image' and ${t.image} is not null)`,
    ),
    check("goal_note_blocks_text_len", maxLen(t.text, CAPS.noteText)),
    check("goal_note_blocks_alt_len", maxLen(t.alt, CAPS.alt)),
  ],
);

// ---------- trips ----------

export const trips = pgTable(
  "trips",
  {
    id: uuid("id").primaryKey(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    destination: text("destination"),
    startDate: date("start_date"),
    endDate: date("end_date"),
    budget: money("budget"),
    notes: text("notes"),
    cover: jsonb("cover").$type<ImageAsset>(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => user.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("trips_id_space_unique").on(t.id, t.spaceId),
    index("trips_space_id_idx").on(t.spaceId),
    check("trips_title_len", sql`char_length(${t.title}) between 1 and ${sql.raw(String(CAPS.title))}`),
    check("trips_destination_len", maxLen(t.destination, CAPS.name)),
    check("trips_notes_len", maxLen(t.notes, CAPS.notes)),
    check("trips_budget_nonneg", sql`${t.budget} is null or ${t.budget} >= 0`),
    check(
      "trips_dates",
      sql`(${t.startDate} is null and ${t.endDate} is null) or (${t.startDate} is not null and ${t.endDate} is not null and ${t.endDate} >= ${t.startDate})`,
    ),
  ],
);

export const tripPlaces = pgTable(
  "trip_places",
  {
    id: uuid("id").primaryKey(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    tripId: uuid("trip_id").notNull(),
    type: text("type").notNull().$type<(typeof TRIP_ITEM_TYPES)[number]>(),
    title: text("title").notNull(),
    area: text("area"),
    notes: text("notes"),
    url: text("url"),
    estimatedCost: money("estimated_cost"),
    mustDo: boolean("must_do").notNull().default(false),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => user.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("trip_places_id_space_unique").on(t.id, t.spaceId),
    foreignKey({
      name: "trip_places_trip_fk",
      columns: [t.tripId, t.spaceId],
      foreignColumns: [trips.id, trips.spaceId],
    }).onDelete("cascade"),
    index("trip_places_space_id_idx").on(t.spaceId),
    index("trip_places_trip_id_idx").on(t.tripId),
    check("trip_places_type", inList(t.type, TRIP_ITEM_TYPES)),
    check("trip_places_title_len", sql`char_length(${t.title}) between 1 and ${sql.raw(String(CAPS.title))}`),
    check("trip_places_area_len", maxLen(t.area, CAPS.name)),
    check("trip_places_notes_len", maxLen(t.notes, CAPS.notes)),
    check("trip_places_url", sql`${t.url} is null or (${httpUrl(t.url)})`),
    check("trip_places_cost_nonneg", sql`${t.estimatedCost} is null or ${t.estimatedCost} >= 0`),
  ],
);

export const tripPlanEntries = pgTable(
  "trip_plan_entries",
  {
    id: uuid("id").primaryKey(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    tripId: uuid("trip_id").notNull(),
    type: text("type").notNull().$type<(typeof TRIP_ITEM_TYPES)[number]>(),
    title: text("title").notNull(),
    date: date("date"),
    startTime: time("start_time"),
    endTime: time("end_time"),
    location: text("location"),
    cost: money("cost"),
    url: text("url"),
    notes: text("notes"),
    doneAt: timestamp("done_at", { withTimezone: true }),
    doneBy: uuid("done_by").references(() => user.id),
    // A place is scheduled at most once; deleting the place keeps the entry (§4.1).
    placeId: uuid("place_id")
      .unique()
      .references(() => tripPlaces.id, { onDelete: "set null" }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => user.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    foreignKey({
      name: "trip_plan_entries_trip_fk",
      columns: [t.tripId, t.spaceId],
      foreignColumns: [trips.id, trips.spaceId],
    }).onDelete("cascade"),
    index("trip_plan_entries_space_id_idx").on(t.spaceId),
    index("trip_plan_entries_trip_date_idx").on(t.tripId, t.date, t.startTime),
    check("trip_plan_entries_type", inList(t.type, TRIP_ITEM_TYPES)),
    check("trip_plan_entries_title_len", sql`char_length(${t.title}) between 1 and ${sql.raw(String(CAPS.title))}`),
    check("trip_plan_entries_location_len", maxLen(t.location, CAPS.name)),
    check("trip_plan_entries_notes_len", maxLen(t.notes, CAPS.notes)),
    check("trip_plan_entries_url", sql`${t.url} is null or (${httpUrl(t.url)})`),
    check("trip_plan_entries_cost_nonneg", sql`${t.cost} is null or ${t.cost} >= 0`),
    check("trip_plan_entries_done_pair", sql`(${t.doneAt} is null) = (${t.doneBy} is null)`),
  ],
);

export const tripChecklistItems = pgTable(
  "trip_checklist_items",
  {
    id: uuid("id").primaryKey(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    tripId: uuid("trip_id").notNull(),
    group: text("group").notNull().$type<(typeof CHECKLIST_GROUPS)[number]>(),
    title: text("title").notNull(),
    position: integer("position").notNull(),
    doneAt: timestamp("done_at", { withTimezone: true }),
    doneBy: uuid("done_by").references(() => user.id),
    // Suggested when the trip was created (D24): the screens show no "Added by" for these (D59).
    seeded: boolean("seeded").notNull().default(false),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => user.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    foreignKey({
      name: "trip_checklist_items_trip_fk",
      columns: [t.tripId, t.spaceId],
      foreignColumns: [trips.id, trips.spaceId],
    }).onDelete("cascade"),
    index("trip_checklist_items_space_id_idx").on(t.spaceId),
    index("trip_checklist_items_trip_group_pos_idx").on(t.tripId, t.group, t.position),
    check("trip_checklist_items_group", inList(t.group, CHECKLIST_GROUPS)),
    check("trip_checklist_items_title_len", sql`char_length(${t.title}) between 1 and ${sql.raw(String(CAPS.title))}`),
    check("trip_checklist_items_done_pair", sql`(${t.doneAt} is null) = (${t.doneBy} is null)`),
  ],
);

// ---------- shopping ----------

export const shoppingItems = pgTable(
  "shopping_items",
  {
    id: uuid("id").primaryKey(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    quantity: integer("quantity").notNull().default(1),
    category: text("category"),
    categoryKey: text("category_key"),
    unit: text("unit").notNull().default("piece"),
    notes: text("notes"),
    boughtAt: timestamp("bought_at", { withTimezone: true }),
    boughtBy: uuid("bought_by").references(() => user.id),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => user.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("shopping_items_space_id_idx").on(t.spaceId),
    index("shopping_items_space_bought_idx").on(t.spaceId, t.boughtAt),
    index("shopping_items_space_category_idx").on(t.spaceId, t.categoryKey),
    check("shopping_items_name_len", sql`char_length(${t.name}) between 1 and ${sql.raw(String(CAPS.name))}`),
    check("shopping_items_quantity_positive", sql`${t.quantity} > 0`),
    check("shopping_items_category_len", maxLen(t.category, CAPS.name)),
    check("shopping_items_notes_len", maxLen(t.notes, CAPS.notes)),
    check("shopping_items_unit", sql`${t.unit} in ('piece', 'l', 'g', 'kg')`),
    check("shopping_items_bought_pair", sql`(${t.boughtAt} is null) = (${t.boughtBy} is null)`),
  ],
);

/**
 * Request counters for the rate limits (D57): one row per hashed key per minute. Not space data: no space_id,
 * no personal data (keys are SHA-256 of "limiter:purpose:value"). Rows older than an hour are swept.
 */
export const rateLimits = pgTable(
  "rate_limits",
  {
    key: text("key").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    count: integer("count").notNull().default(1),
  },
  (t) => [
    primaryKey({ name: "rate_limits_pk", columns: [t.key, t.windowStart] }),
    index("rate_limits_window_idx").on(t.windowStart),
  ],
);
