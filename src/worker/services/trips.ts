/**
 * Trips, their plan, places and checklist (§4, §5). Every function takes spaceId first and every statement filters
 * on it: another space's id behaves exactly like a missing one. Reads build their rows as JSON (dates stay
 * YYYY-MM-DD, times HH:MM, money safe integers); derived values (status, days, budget) are the device's (§4.3).
 */
import { sql, type SQL } from "drizzle-orm";
import { toSafeMinor } from "../../shared/money.ts";
import type { ImageAsset } from "../../shared/schemas/goals.ts";
import type {
  ChecklistItemView,
  CreateItemInput,
  CreatePlaceInput,
  CreatePlanEntryInput,
  CreateTripInput,
  PlaceView,
  PlanEntryView,
  ScheduleInput,
  TripResponse,
  TripsResponse,
  TripView,
  UpdateItemInput,
  UpdatePlaceInput,
  UpdatePlanEntryInput,
  UpdateTripInput,
} from "../../shared/schemas/trips.ts";
import { TRIP_MSG } from "../../shared/schemas/trips.ts";
import { db, withTx, type DbContext } from "../db/client.ts";
import { ApiError, notFound } from "../errors.ts";
import { assertOwnAsset } from "./cloudinary.ts";
import { checklistSeedRows } from "./checklist-seed.ts";

type Row = Record<string, unknown>;
const iso = (v: unknown) => (v == null ? null : new Date(String(v)).toISOString());
const money = (v: unknown) => (v == null ? null : toSafeMinor(v as number));
const str = (v: unknown) => (v == null ? "" : String(v));
const nul = (s: string | null | undefined) => (s && s.trim() ? s.trim() : null);

// ---------- row shapes ----------

function tripJson(where: SQL, order: SQL = sql``): SQL {
  return sql`
    select json_build_object(
      'id', t.id, 'title', t.title, 'destination', coalesce(t.destination, ''),
      'startDate', t.start_date, 'endDate', t.end_date, 'budget', t.budget, 'notes', coalesce(t.notes, ''),
      'cover', t.cover, 'createdBy', t.created_by, 'createdAt', t.created_at, 'updatedAt', t.updated_at
    ) as v from trips t where ${where} ${order}`;
}
function toTrip(r: Row): TripView {
  return {
    id: str(r.id),
    title: str(r.title),
    destination: str(r.destination),
    startDate: (r.startDate as string | null) ?? null,
    endDate: (r.endDate as string | null) ?? null,
    budget: money(r.budget),
    notes: str(r.notes),
    cover: (r.cover as ImageAsset | null) ?? null,
    createdBy: str(r.createdBy),
    createdAt: iso(r.createdAt)!,
    updatedAt: iso(r.updatedAt)!,
  };
}

function entryJson(where: SQL): SQL {
  return sql`
    select json_build_object(
      'id', e.id, 'tripId', e.trip_id, 'type', e.type, 'title', e.title, 'date', e.date,
      'start', to_char(e.start_time, 'HH24:MI'), 'end', to_char(e.end_time, 'HH24:MI'),
      'location', coalesce(e.location, ''), 'cost', e.cost, 'url', coalesce(e.url, ''), 'notes', coalesce(e.notes, ''),
      'doneAt', e.done_at, 'doneBy', e.done_by, 'placeId', e.place_id,
      'createdBy', e.created_by, 'createdAt', e.created_at, 'updatedAt', e.updated_at
    ) as v from trip_plan_entries e where ${where} order by e.created_at, e.id`;
}
function toEntry(r: Row): PlanEntryView {
  return {
    id: str(r.id),
    tripId: str(r.tripId),
    type: r.type as PlanEntryView["type"],
    title: str(r.title),
    date: (r.date as string | null) ?? null,
    start: (r.start as string | null) ?? null,
    end: (r.end as string | null) ?? null,
    location: str(r.location),
    cost: money(r.cost),
    url: str(r.url),
    notes: str(r.notes),
    doneAt: iso(r.doneAt),
    doneBy: (r.doneBy as string | null) ?? null,
    placeId: (r.placeId as string | null) ?? null,
    createdBy: str(r.createdBy),
    createdAt: iso(r.createdAt)!,
    updatedAt: iso(r.updatedAt)!,
  };
}

function placeJson(where: SQL): SQL {
  return sql`
    select json_build_object(
      'id', p.id, 'tripId', p.trip_id, 'type', p.type, 'title', p.title, 'area', coalesce(p.area, ''),
      'notes', coalesce(p.notes, ''), 'url', coalesce(p.url, ''), 'estimate', p.estimated_cost, 'mustDo', p.must_do,
      'createdBy', p.created_by, 'createdAt', p.created_at, 'updatedAt', p.updated_at
    ) as v from trip_places p where ${where} order by p.created_at, p.id`;
}
function toPlace(r: Row): PlaceView {
  return {
    id: str(r.id),
    tripId: str(r.tripId),
    type: r.type as PlaceView["type"],
    title: str(r.title),
    area: str(r.area),
    notes: str(r.notes),
    url: str(r.url),
    estimate: money(r.estimate),
    mustDo: Boolean(r.mustDo),
    createdBy: str(r.createdBy),
    createdAt: iso(r.createdAt)!,
    updatedAt: iso(r.updatedAt)!,
  };
}

function itemJson(where: SQL): SQL {
  return sql`
    select json_build_object(
      'id', i.id, 'tripId', i.trip_id, 'group', i."group", 'title', i.title, 'position', i.position,
      'doneAt', i.done_at, 'doneBy', i.done_by, 'seeded', i.seeded,
      'createdBy', i.created_by, 'createdAt', i.created_at, 'updatedAt', i.updated_at
    ) as v from trip_checklist_items i where ${where} order by i."group", i.position, i.created_at, i.id`;
}
function toItem(r: Row): ChecklistItemView {
  return {
    id: str(r.id),
    tripId: str(r.tripId),
    group: r.group as ChecklistItemView["group"],
    title: str(r.title),
    position: Number(r.position),
    doneAt: iso(r.doneAt),
    doneBy: (r.doneBy as string | null) ?? null,
    seeded: Boolean(r.seeded),
    createdBy: str(r.createdBy),
    createdAt: iso(r.createdAt)!,
    updatedAt: iso(r.updatedAt)!,
  };
}

async function many<T>(c: DbContext, q: SQL, map: (r: Row) => T): Promise<T[]> {
  const r = await db(c).execute<{ v: Row }>(q);
  return r.rows.map((x) => map(x.v));
}
async function one<T>(c: DbContext, q: SQL, map: (r: Row) => T): Promise<T | null> {
  return (await many(c, q, map))[0] ?? null;
}

// ---------- reads ----------

export async function listTrips(c: DbContext, spaceId: string): Promise<Omit<TripsResponse, "images">> {
  const d = db(c);
  const [trips, meta] = await Promise.all([
    many(c, tripJson(sql`t.space_id = ${spaceId}`, sql`order by t.start_date nulls last, t.created_at`), toTrip),
    d.execute<{ currency: string; members: TripsResponse["members"] }>(sql`
      select s.currency,
        (select json_agg(json_build_object('userId', m.user_id, 'displayName', u.display_name, 'slot', m.slot) order by m.slot)
         from space_members m join "user" u on u.id = m.user_id where m.space_id = s.id) as members
      from spaces s where s.id = ${spaceId}`),
  ]);
  return {
    currency: String(meta.rows[0]?.currency ?? "").trim(),
    trips,
    members: meta.rows[0]?.members ?? [],
  };
}

export function getTrip(c: DbContext, spaceId: string, tripId: string): Promise<TripView | null> {
  return one(c, tripJson(sql`t.id = ${tripId} and t.space_id = ${spaceId}`), toTrip);
}

/** The trip with its plan, places and checklist (D59): one round trip, one cache entry on the phone. */
export async function getTripFull(c: DbContext, spaceId: string, tripId: string): Promise<TripResponse | null> {
  const [trip, entries, places, items] = await Promise.all([
    getTrip(c, spaceId, tripId),
    many(c, entryJson(sql`e.trip_id = ${tripId} and e.space_id = ${spaceId}`), toEntry),
    many(c, placeJson(sql`p.trip_id = ${tripId} and p.space_id = ${spaceId}`), toPlace),
    many(c, itemJson(sql`i.trip_id = ${tripId} and i.space_id = ${spaceId}`), toItem),
  ]);
  return trip ? { trip, entries, places, items } : null;
}

async function tripExists(c: DbContext, spaceId: string, tripId: string): Promise<boolean> {
  const r = await db(c).execute(sql`select 1 from trips where id = ${tripId} and space_id = ${spaceId}`);
  return r.rows.length > 0;
}
async function requireTrip(c: DbContext, spaceId: string, tripId: string) {
  if (!(await tripExists(c, spaceId, tripId))) throw notFound();
}

const idConflict = () => new ApiError(409, "id_conflict", "That id is already used.");
const asOf = (v: string) => sql`${new Date(v).toISOString()}::timestamptz`;

// ---------- trips ----------

/** POST /api/trips: idempotent on the client's id; the seeded checklist is written by the same statement (§5). */
export async function createTrip(
  c: DbContext,
  spaceId: string,
  userId: string,
  input: CreateTripInput,
): Promise<{ status: 200 | 201; trip: TripView }> {
  assertOwnAsset(spaceId, input.cover);
  const start = input.startDate ?? null;
  const end = start ? (input.endDate ?? start) : null;
  const seed = sql.join(
    checklistSeedRows().map((s) => sql`(${s.group}, ${s.title}, ${s.position}::int)`),
    sql`, `,
  );
  const r = await db(c).execute<{ id: string }>(sql`
    with t as (
      insert into trips (id, space_id, title, destination, start_date, end_date, budget, notes, cover, created_by)
      values (${input.id}, ${spaceId}, ${input.title.trim()}, ${nul(input.destination)}, ${start}::date, ${end}::date,
              ${input.budget ?? null}, ${nul(input.notes)}, ${input.cover ? JSON.stringify(input.cover) : null}::jsonb,
              ${userId})
      on conflict (id) do nothing returning id, space_id)
    insert into trip_checklist_items (id, space_id, trip_id, "group", title, position, seeded, created_by)
    select gen_random_uuid(), t.space_id, t.id, s.g, s.title, s.pos, true, ${userId}
    from t cross join (values ${seed}) as s(g, title, pos)
    returning id`);
  const trip = await getTrip(c, spaceId, input.id);
  if (!trip) throw idConflict();
  return { status: r.rows.length ? 201 : 200, trip };
}

export type TripUpdate =
  | { kind: "ok"; trip: TripView; oldCover: string | null }
  | { kind: "conflict"; current: TripView }
  | { kind: "not_found" };

/** PATCH with optimistic concurrency (§5): the update itself compares updated_at, so a stale edit changes nothing. */
export async function updateTrip(
  c: DbContext,
  spaceId: string,
  tripId: string,
  input: UpdateTripInput,
): Promise<TripUpdate> {
  assertOwnAsset(spaceId, input.cover);
  const cur = await getTrip(c, spaceId, tripId);
  if (!cur) return { kind: "not_found" };
  if (new Date(cur.updatedAt).getTime() !== new Date(input.updatedAt).getTime())
    return { kind: "conflict", current: cur };

  // Both dates or neither (D12); the end defaults to the start.
  const dates = input.startDate !== undefined || input.endDate !== undefined;
  let start = cur.startDate;
  let end = cur.endDate;
  if (dates) {
    start = input.startDate !== undefined ? input.startDate : cur.startDate;
    end = input.endDate !== undefined ? input.endDate : cur.endDate;
    if (!start) end = null;
    else if (!end) end = start;
    if (start && end && end < start)
      throw new ApiError(400, "validation_failed", "Check the highlighted fields.", { endDate: TRIP_MSG.dates });
  }

  const set: SQL[] = [sql`updated_at = now()`];
  if (input.title !== undefined) set.push(sql`title = ${input.title.trim()}`);
  if (input.destination !== undefined) set.push(sql`destination = ${nul(input.destination)}`);
  if (dates) set.push(sql`start_date = ${start}::date`, sql`end_date = ${end}::date`);
  if (input.budget !== undefined) set.push(sql`budget = ${input.budget}`);
  if (input.notes !== undefined) set.push(sql`notes = ${nul(input.notes)}`);
  if (input.cover !== undefined) set.push(sql`cover = ${input.cover ? JSON.stringify(input.cover) : null}::jsonb`);
  const r = await db(c).execute(sql`
    update trips set ${sql.join(set, sql`, `)}
    where id = ${tripId} and space_id = ${spaceId} and updated_at = ${asOf(input.updatedAt)} returning id`);
  const trip = await getTrip(c, spaceId, tripId);
  if (!trip) return { kind: "not_found" };
  if (!r.rows.length) return { kind: "conflict", current: trip };
  const oldCover =
    input.cover !== undefined && cur.cover && cur.cover.publicId !== input.cover?.publicId ? cur.cover.publicId : null;
  return { kind: "ok", trip, oldCover };
}

/** DELETE: cascades to the plan, places and checklist. Returns the cover to destroy after commit; null if missing. */
export async function deleteTrip(c: DbContext, spaceId: string, tripId: string): Promise<string[] | null> {
  const r = await db(c).execute<{ cover: string | null }>(sql`
    delete from trips where id = ${tripId} and space_id = ${spaceId} returning cover->>'publicId' as cover`);
  if (!r.rows.length) return null;
  return r.rows[0]!.cover ? [r.rows[0]!.cover] : [];
}

// ---------- plan entries ----------

export async function createEntry(
  c: DbContext,
  spaceId: string,
  userId: string,
  tripId: string,
  input: CreatePlanEntryInput,
): Promise<{ status: 200 | 201; entry: PlanEntryView }> {
  await requireTrip(c, spaceId, tripId);
  const start = input.start ?? null;
  const r = await db(c).execute<{ id: string }>(sql`
    insert into trip_plan_entries (id, space_id, trip_id, type, title, date, start_time, end_time, location, cost, url, notes, created_by)
    values (${input.id}, ${spaceId}, ${tripId}, ${input.type}, ${input.title.trim()}, ${input.date ?? null}::date,
            ${start}::time, ${start ? (input.end ?? null) : null}::time, ${nul(input.location)}, ${input.cost ?? null},
            ${nul(input.url)}, ${nul(input.notes)}, ${userId})
    on conflict (id) do nothing returning id`);
  const entry = await one(
    c,
    entryJson(sql`e.id = ${input.id} and e.space_id = ${spaceId} and e.trip_id = ${tripId}`),
    toEntry,
  );
  if (!entry) throw idConflict();
  return { status: r.rows.length ? 201 : 200, entry };
}

export type EntryUpdate =
  { kind: "ok"; entry: PlanEntryView } | { kind: "conflict"; current: PlanEntryView } | { kind: "not_found" };

export function getEntry(c: DbContext, spaceId: string, tripId: string, entryId: string) {
  return one(c, entryJson(sql`e.id = ${entryId} and e.space_id = ${spaceId} and e.trip_id = ${tripId}`), toEntry);
}

export async function updateEntry(
  c: DbContext,
  spaceId: string,
  tripId: string,
  entryId: string,
  input: UpdatePlanEntryInput,
): Promise<EntryUpdate> {
  const cur = await getEntry(c, spaceId, tripId, entryId);
  if (!cur) return { kind: "not_found" };
  if (new Date(cur.updatedAt).getTime() !== new Date(input.updatedAt).getTime())
    return { kind: "conflict", current: cur };
  const start = input.start !== undefined ? input.start : cur.start;
  const end = start ? (input.end !== undefined ? input.end : cur.end) : null;
  const set: SQL[] = [sql`updated_at = now()`];
  if (input.type !== undefined) set.push(sql`type = ${input.type}`);
  if (input.title !== undefined) set.push(sql`title = ${input.title.trim()}`);
  if (input.date !== undefined) set.push(sql`date = ${input.date}::date`);
  if (input.start !== undefined || input.end !== undefined)
    set.push(sql`start_time = ${start}::time`, sql`end_time = ${end}::time`);
  if (input.location !== undefined) set.push(sql`location = ${nul(input.location)}`);
  if (input.cost !== undefined) set.push(sql`cost = ${input.cost}`);
  if (input.url !== undefined) set.push(sql`url = ${nul(input.url)}`);
  if (input.notes !== undefined) set.push(sql`notes = ${nul(input.notes)}`);
  const r = await db(c).execute(sql`
    update trip_plan_entries set ${sql.join(set, sql`, `)}
    where id = ${entryId} and trip_id = ${tripId} and space_id = ${spaceId} and updated_at = ${asOf(input.updatedAt)} returning id`);
  const entry = await getEntry(c, spaceId, tripId, entryId);
  if (!entry) return { kind: "not_found" };
  if (!r.rows.length) return { kind: "conflict", current: entry };
  return { kind: "ok", entry };
}

/** Ticks set state (D9): replayed with the same body they leave the same row, and they don't touch updated_at. */
export async function setEntryDone(
  c: DbContext,
  spaceId: string,
  userId: string,
  tripId: string,
  entryId: string,
  done: boolean,
): Promise<PlanEntryView | null> {
  await db(c).execute(sql`
    update trip_plan_entries set
      done_at = case when ${done} then coalesce(done_at, now()) else null end,
      done_by = case when ${done} then coalesce(done_by, ${userId}::uuid) else null end
    where id = ${entryId} and trip_id = ${tripId} and space_id = ${spaceId}`);
  return getEntry(c, spaceId, tripId, entryId);
}

export async function deleteEntry(c: DbContext, spaceId: string, tripId: string, entryId: string): Promise<void> {
  await db(c).execute(
    sql`delete from trip_plan_entries where id = ${entryId} and trip_id = ${tripId} and space_id = ${spaceId}`,
  );
}

// ---------- places ----------

export async function createPlace(
  c: DbContext,
  spaceId: string,
  userId: string,
  tripId: string,
  input: CreatePlaceInput,
): Promise<{ status: 200 | 201; place: PlaceView }> {
  await requireTrip(c, spaceId, tripId);
  const r = await db(c).execute<{ id: string }>(sql`
    insert into trip_places (id, space_id, trip_id, type, title, area, notes, url, estimated_cost, must_do, created_by)
    values (${input.id}, ${spaceId}, ${tripId}, ${input.type}, ${input.title.trim()}, ${nul(input.area)},
            ${nul(input.notes)}, ${nul(input.url)}, ${input.estimate ?? null}, ${input.mustDo ?? false}, ${userId})
    on conflict (id) do nothing returning id`);
  const place = await getPlace(c, spaceId, tripId, input.id);
  if (!place) throw idConflict();
  return { status: r.rows.length ? 201 : 200, place };
}

export function getPlace(c: DbContext, spaceId: string, tripId: string, placeId: string) {
  return one(c, placeJson(sql`p.id = ${placeId} and p.space_id = ${spaceId} and p.trip_id = ${tripId}`), toPlace);
}

export type PlaceUpdate =
  { kind: "ok"; place: PlaceView } | { kind: "conflict"; current: PlaceView } | { kind: "not_found" };

export async function updatePlace(
  c: DbContext,
  spaceId: string,
  tripId: string,
  placeId: string,
  input: UpdatePlaceInput,
): Promise<PlaceUpdate> {
  const cur = await getPlace(c, spaceId, tripId, placeId);
  if (!cur) return { kind: "not_found" };
  if (new Date(cur.updatedAt).getTime() !== new Date(input.updatedAt).getTime())
    return { kind: "conflict", current: cur };
  const set: SQL[] = [sql`updated_at = now()`];
  if (input.type !== undefined) set.push(sql`type = ${input.type}`);
  if (input.title !== undefined) set.push(sql`title = ${input.title.trim()}`);
  if (input.area !== undefined) set.push(sql`area = ${nul(input.area)}`);
  if (input.notes !== undefined) set.push(sql`notes = ${nul(input.notes)}`);
  if (input.url !== undefined) set.push(sql`url = ${nul(input.url)}`);
  if (input.estimate !== undefined) set.push(sql`estimated_cost = ${input.estimate}`);
  if (input.mustDo !== undefined) set.push(sql`must_do = ${input.mustDo}`);
  const r = await db(c).execute(sql`
    update trip_places set ${sql.join(set, sql`, `)}
    where id = ${placeId} and trip_id = ${tripId} and space_id = ${spaceId} and updated_at = ${asOf(input.updatedAt)} returning id`);
  const place = await getPlace(c, spaceId, tripId, placeId);
  if (!place) return { kind: "not_found" };
  if (!r.rows.length) return { kind: "conflict", current: place };
  return { kind: "ok", place };
}

/** The plan entry made from the place stays (ON DELETE SET NULL, §4.1). */
export async function deletePlace(c: DbContext, spaceId: string, tripId: string, placeId: string): Promise<void> {
  await db(c).execute(
    sql`delete from trip_places where id = ${placeId} and trip_id = ${tripId} and space_id = ${spaceId}`,
  );
}

export type ScheduleResult =
  | { kind: "ok"; status: 200 | 201; entry: PlanEntryView }
  | { kind: "taken"; entry: PlanEntryView }
  | { kind: "not_found" };

/**
 * Schedules a place (D11): a plan entry copied from it, the cost pre-filled from the estimate, linked by place_id
 * (UNIQUE: a place is in the plan once). A replay with the same entry id answers that entry; another entry
 * already holding the place answers `taken` with it (ia A1).
 */
export async function schedulePlace(
  c: DbContext,
  spaceId: string,
  userId: string,
  tripId: string,
  placeId: string,
  input: ScheduleInput,
): Promise<ScheduleResult> {
  const start = input.start ?? null;
  const r = await db(c).execute<{ id: string }>(sql`
    insert into trip_plan_entries (id, space_id, trip_id, type, title, date, start_time, end_time, location, cost, url, notes, place_id, created_by)
    select ${input.id}, p.space_id, p.trip_id, p.type, p.title, ${input.date ?? null}::date, ${start}::time,
           ${start ? (input.end ?? null) : null}::time, p.area, p.estimated_cost, p.url, p.notes, p.id, ${userId}
    from trip_places p where p.id = ${placeId} and p.trip_id = ${tripId} and p.space_id = ${spaceId}
    on conflict do nothing returning id`);
  if (r.rows.length) {
    const entry = await getEntry(c, spaceId, tripId, input.id);
    return entry ? { kind: "ok", status: 201, entry } : { kind: "not_found" };
  }
  if (!(await getPlace(c, spaceId, tripId, placeId))) return { kind: "not_found" };
  const held = await one(c, entryJson(sql`e.place_id = ${placeId} and e.space_id = ${spaceId}`), toEntry);
  if (!held) throw idConflict();
  return held.id === input.id ? { kind: "ok", status: 200, entry: held } : { kind: "taken", entry: held };
}

// ---------- checklist ----------

export function getItem(c: DbContext, spaceId: string, tripId: string, itemId: string) {
  return one(c, itemJson(sql`i.id = ${itemId} and i.space_id = ${spaceId} and i.trip_id = ${tripId}`), toItem);
}

export async function createItem(
  c: DbContext,
  spaceId: string,
  userId: string,
  tripId: string,
  input: CreateItemInput,
): Promise<{ status: 200 | 201; item: ChecklistItemView }> {
  await requireTrip(c, spaceId, tripId);
  const r = await db(c).execute<{ id: string }>(sql`
    insert into trip_checklist_items (id, space_id, trip_id, "group", title, position, created_by)
    values (${input.id}, ${spaceId}, ${tripId}, ${input.group}, ${input.title.trim()},
            coalesce((select max(position) from trip_checklist_items
                      where trip_id = ${tripId} and space_id = ${spaceId} and "group" = ${input.group}), 0) + 1,
            ${userId})
    on conflict (id) do nothing returning id`);
  const item = await getItem(c, spaceId, tripId, input.id);
  if (!item) throw idConflict();
  return { status: r.rows.length ? 201 : 200, item };
}

export type ItemUpdate =
  { kind: "ok"; item: ChecklistItemView } | { kind: "conflict"; current: ChecklistItemView } | { kind: "not_found" };

/** Renames and moves between groups; a move puts the item at the end of the new group. */
export async function updateItem(
  c: DbContext,
  spaceId: string,
  tripId: string,
  itemId: string,
  input: UpdateItemInput,
): Promise<ItemUpdate> {
  const cur = await getItem(c, spaceId, tripId, itemId);
  if (!cur) return { kind: "not_found" };
  if (new Date(cur.updatedAt).getTime() !== new Date(input.updatedAt).getTime())
    return { kind: "conflict", current: cur };
  const set: SQL[] = [sql`updated_at = now()`];
  if (input.title !== undefined) set.push(sql`title = ${input.title.trim()}`);
  if (input.group !== undefined && input.group !== cur.group) {
    set.push(
      sql`"group" = ${input.group}`,
      sql`position = coalesce((select max(position) from trip_checklist_items
                               where trip_id = ${tripId} and space_id = ${spaceId} and "group" = ${input.group}), 0) + 1`,
    );
  }
  const r = await db(c).execute(sql`
    update trip_checklist_items set ${sql.join(set, sql`, `)}
    where id = ${itemId} and trip_id = ${tripId} and space_id = ${spaceId} and updated_at = ${asOf(input.updatedAt)} returning id`);
  const item = await getItem(c, spaceId, tripId, itemId);
  if (!item) return { kind: "not_found" };
  if (!r.rows.length) return { kind: "conflict", current: item };
  return { kind: "ok", item };
}

export async function setItemDone(
  c: DbContext,
  spaceId: string,
  userId: string,
  tripId: string,
  itemId: string,
  done: boolean,
): Promise<ChecklistItemView | null> {
  await db(c).execute(sql`
    update trip_checklist_items set
      done_at = case when ${done} then coalesce(done_at, now()) else null end,
      done_by = case when ${done} then coalesce(done_by, ${userId}::uuid) else null end
    where id = ${itemId} and trip_id = ${tripId} and space_id = ${spaceId}`);
  return getItem(c, spaceId, tripId, itemId);
}

export async function deleteItem(c: DbContext, spaceId: string, tripId: string, itemId: string): Promise<void> {
  await db(c).execute(
    sql`delete from trip_checklist_items where id = ${itemId} and trip_id = ${tripId} and space_id = ${spaceId}`,
  );
}

/**
 * Moves an item one place up or down inside its group: the group is read in order and renumbered 1..n in one
 * transaction, so equal positions can't stall a move. Answers the group's items in their new order.
 */
export async function moveItem(
  c: DbContext,
  spaceId: string,
  tripId: string,
  itemId: string,
  direction: "up" | "down",
): Promise<ChecklistItemView[] | null> {
  const moved = await withTx(c, async (tx) => {
    const cur = await tx.execute<{ group: string }>(sql`
      select "group" from trip_checklist_items where id = ${itemId} and trip_id = ${tripId} and space_id = ${spaceId}`);
    const group = cur.rows[0]?.group;
    if (!group) return null;
    const rows = await tx.execute<{ id: string }>(sql`
      select id from trip_checklist_items where trip_id = ${tripId} and space_id = ${spaceId} and "group" = ${group}
      order by position, created_at, id for update`);
    const ids = rows.rows.map((r) => r.id);
    const i = ids.indexOf(itemId);
    const j = direction === "up" ? i - 1 : i + 1;
    if (j >= 0 && j < ids.length) {
      [ids[i], ids[j]] = [ids[j]!, ids[i]!];
    }
    for (let n = 0; n < ids.length; n++) {
      await tx.execute(
        sql`update trip_checklist_items set position = ${n + 1} where id = ${ids[n]!} and space_id = ${spaceId}`,
      );
    }
    return group;
  });
  if (!moved) return null;
  return many(c, itemJson(sql`i.trip_id = ${tripId} and i.space_id = ${spaceId} and i."group" = ${moved}`), toItem);
}
