import { queryOptions, useMutation, useQuery, type QueryClient } from "@tanstack/react-query";
import type { ChecklistGroup, TripItemType } from "../../shared/enums.ts";
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
import { api } from "./api.ts";
import { day } from "./goals.ts";

/**
 * Trips data (§5, .ux-forge/trips): the list, and one trip with its plan, places and checklist (D59). Derived values
 * (status, days, budget, now / next) are `src/shared/trip-plan.ts`. Three writes work offline and replay in order
 * (§9): ticking a plan item, ticking a checklist item, adding a place. They patch the caches optimistically and mark
 * the row `pending` until the server answers. Every other write needs a connection; its screen says so.
 */
export const tripsKey = ["trips"] as const;
export const tripKey = (id: string) => ["trips", id] as const;

/** Rows as the client holds them: the server's, plus a mark while the write waits to sync. */
export type EntryItem = PlanEntryView & { pending?: boolean };
export type PlaceItem = PlaceView & { pending?: boolean };
export type ChecklistItem = ChecklistItemView & { pending?: boolean };
export type TripsData = TripsResponse;
export interface TripData {
  trip: TripView;
  entries: EntryItem[];
  places: PlaceItem[];
  items: ChecklistItem[];
}

export const tripsQuery = queryOptions({
  queryKey: tripsKey,
  queryFn: () => api<TripsResponse>("/api/trips"),
  staleTime: 15_000,
});
export const tripQuery = (id: string) =>
  queryOptions({
    queryKey: tripKey(id),
    queryFn: () => api<TripResponse>(`/api/trips/${id}`) as Promise<TripData>,
    staleTime: 15_000,
  });

/** The list's query, for pages that only need its members, currency or image settings. */
export function useTripsData() {
  return useQuery(tripsQuery);
}

// ---------- the offline-capable writes (§9) ----------

export const setEntryDoneKey = ["plan", "setDone"] as const;
export const setItemDoneKey = ["checklist", "setDone"] as const;
export const addPlaceKey = ["places", "add"] as const;
/** One queue for the three: they run one at a time, in order, even across a reload. */
const scope = { id: "tripWrites" };

/** JSON-only, so a paused mutation survives a reload in IndexedDB. */
export interface SetDoneVars {
  tripId: string;
  id: string;
  done: boolean;
  actorId: string;
  at: string;
}
export interface AddPlaceVars {
  tripId: string;
  id: string;
  type: TripItemType;
  title: string;
  area?: string;
  notes?: string;
  url?: string;
  estimate?: number | null;
  mustDo?: boolean;
  actorId: string;
  at: string;
}

type Ctx = { before?: TripData };

/** Applies `fn` to a cached trip; returns what was there, for a rollback. */
export function patchTrip(qc: QueryClient, tripId: string, fn: (d: TripData) => TripData): TripData | undefined {
  const before = qc.getQueryData<TripData>(tripKey(tripId));
  if (before) qc.setQueryData<TripData>(tripKey(tripId), fn(before));
  return before;
}
const restore = (qc: QueryClient, tripId: string, ctx: Ctx | undefined) => {
  if (ctx?.before) qc.setQueryData(tripKey(tripId), ctx.before);
};

/** After any write to a trip: the list, the trip, and Home are fetched again. */
export function invalidateTrip(qc: QueryClient, tripId?: string) {
  void qc.invalidateQueries({ queryKey: tripsKey, exact: true });
  if (tripId) void qc.invalidateQueries({ queryKey: tripKey(tripId) });
  void qc.invalidateQueries({ queryKey: ["home"] });
}

export function applyEntryDone(d: TripData, v: SetDoneVars, pending: boolean): TripData {
  return {
    ...d,
    entries: d.entries.map((e) =>
      e.id === v.id
        ? { ...e, doneAt: v.done ? (e.doneAt ?? v.at) : null, doneBy: v.done ? (e.doneBy ?? v.actorId) : null, pending }
        : e,
    ),
  };
}
export function applyItemDone(d: TripData, v: SetDoneVars, pending: boolean): TripData {
  return {
    ...d,
    items: d.items.map((i) =>
      i.id === v.id
        ? { ...i, doneAt: v.done ? (i.doneAt ?? v.at) : null, doneBy: v.done ? (i.doneBy ?? v.actorId) : null, pending }
        : i,
    ),
  };
}
export function placeFromVars(v: AddPlaceVars, pending: boolean): PlaceItem {
  return {
    id: v.id,
    tripId: v.tripId,
    type: v.type,
    title: v.title,
    area: v.area ?? "",
    notes: v.notes ?? "",
    url: v.url ?? "",
    estimate: v.estimate ?? null,
    mustDo: v.mustDo ?? false,
    createdBy: v.actorId,
    createdAt: v.at,
    updatedAt: v.at,
    pending,
  };
}

/**
 * Registered before the persisted cache is restored (main.tsx), so a paused mutation rehydrated from IndexedDB finds
 * its mutationFn and replays in order once the phone is back online.
 */
export function registerTripMutations(qc: QueryClient) {
  qc.setMutationDefaults(setEntryDoneKey, {
    scope,
    mutationFn: (v: SetDoneVars) =>
      api(`/api/trips/${v.tripId}/plan/${v.id}/done`, { method: "PUT", body: { done: v.done } }),
    onMutate: async (v: SetDoneVars): Promise<Ctx> => {
      await qc.cancelQueries({ queryKey: tripKey(v.tripId) });
      return { before: patchTrip(qc, v.tripId, (d) => applyEntryDone(d, v, !navigator.onLine)) };
    },
    onError: (_e: unknown, v: SetDoneVars, ctx: Ctx | undefined) => restore(qc, v.tripId, ctx),
    onSettled: (_d: unknown, _e: unknown, v: SetDoneVars) => invalidateTrip(qc, v.tripId),
  });
  qc.setMutationDefaults(setItemDoneKey, {
    scope,
    mutationFn: (v: SetDoneVars) =>
      api(`/api/trips/${v.tripId}/checklist/${v.id}/done`, { method: "PUT", body: { done: v.done } }),
    onMutate: async (v: SetDoneVars): Promise<Ctx> => {
      await qc.cancelQueries({ queryKey: tripKey(v.tripId) });
      return { before: patchTrip(qc, v.tripId, (d) => applyItemDone(d, v, !navigator.onLine)) };
    },
    onError: (_e: unknown, v: SetDoneVars, ctx: Ctx | undefined) => restore(qc, v.tripId, ctx),
    onSettled: (_d: unknown, _e: unknown, v: SetDoneVars) => invalidateTrip(qc, v.tripId),
  });
  qc.setMutationDefaults(addPlaceKey, {
    scope,
    mutationFn: (v: AddPlaceVars) =>
      api(`/api/trips/${v.tripId}/places`, {
        body: {
          id: v.id,
          type: v.type,
          title: v.title,
          ...(v.area ? { area: v.area } : {}),
          ...(v.notes ? { notes: v.notes } : {}),
          ...(v.url ? { url: v.url } : {}),
          ...(v.estimate != null ? { estimate: v.estimate } : {}),
          ...(v.mustDo ? { mustDo: true } : {}),
        },
      }),
    onMutate: async (v: AddPlaceVars): Promise<Ctx> => {
      await qc.cancelQueries({ queryKey: tripKey(v.tripId) });
      return {
        before: patchTrip(qc, v.tripId, (d) =>
          d.places.some((p) => p.id === v.id)
            ? d
            : { ...d, places: [...d.places, placeFromVars(v, !navigator.onLine)] },
        ),
      };
    },
    onError: (_e: unknown, v: AddPlaceVars, ctx: Ctx | undefined) => restore(qc, v.tripId, ctx),
    onSettled: (_d: unknown, _e: unknown, v: AddPlaceVars) => invalidateTrip(qc, v.tripId),
  });
}

/**
 * The three offline-capable writes as functions. `mutate` queues when offline (the row shows `pending`), and
 * resolves when the server has answered; the caches are patched at once either way.
 */
export function useTripWrites() {
  const entryDone = useMutation<unknown, Error, SetDoneVars>({ mutationKey: setEntryDoneKey });
  const itemDone = useMutation<unknown, Error, SetDoneVars>({ mutationKey: setItemDoneKey });
  const place = useMutation<unknown, Error, AddPlaceVars>({ mutationKey: addPlaceKey });
  return {
    setEntryDone: (v: SetDoneVars) => entryDone.mutate(v),
    setItemDone: (v: SetDoneVars) => itemDone.mutate(v),
    addPlace: (v: AddPlaceVars) => place.mutate(v),
  };
}

// ---------- the online writes (the forms and sheets say so when offline) ----------

const body = (v: unknown) => v as Record<string, unknown>;
const base = (tripId: string) => `/api/trips/${tripId}`;

export const createTrip = (input: CreateTripInput) => api<{ trip: TripView }>("/api/trips", { body: body(input) });
export const updateTrip = (id: string, input: UpdateTripInput) =>
  api<{ trip: TripView }>(base(id), { method: "PATCH", body: body(input) });
export const deleteTrip = (id: string) => api<void>(base(id), { method: "DELETE" });

export const createEntry = (tripId: string, input: CreatePlanEntryInput) =>
  api<{ entry: PlanEntryView }>(`${base(tripId)}/plan`, { body: body(input) });
export const updateEntry = (tripId: string, id: string, input: UpdatePlanEntryInput) =>
  api<{ entry: PlanEntryView }>(`${base(tripId)}/plan/${id}`, { method: "PATCH", body: body(input) });
export const deleteEntry = (tripId: string, id: string) =>
  api<void>(`${base(tripId)}/plan/${id}`, { method: "DELETE" });

/** An online place add (the sheet's "Add place" when online); offline adds go through `useTripWrites`. */
export const createPlace = (tripId: string, input: CreatePlaceInput) =>
  api<{ place: PlaceView }>(`${base(tripId)}/places`, { body: body(input) });
export const updatePlace = (tripId: string, id: string, input: UpdatePlaceInput) =>
  api<{ place: PlaceView }>(`${base(tripId)}/places/${id}`, { method: "PATCH", body: body(input) });
export const deletePlace = (tripId: string, id: string) =>
  api<void>(`${base(tripId)}/places/${id}`, { method: "DELETE" });
/** 409 `conflict` with `entry` when the place is already in the plan (ia A1). */
export const schedulePlace = (tripId: string, placeId: string, input: ScheduleInput) =>
  api<{ entry: PlanEntryView }>(`${base(tripId)}/places/${placeId}/schedule`, { body: body(input) });

export const createItem = (tripId: string, input: CreateItemInput) =>
  api<{ item: ChecklistItemView }>(`${base(tripId)}/checklist`, { body: body(input) });
export const updateItem = (tripId: string, id: string, input: UpdateItemInput) =>
  api<{ item: ChecklistItemView }>(`${base(tripId)}/checklist/${id}`, { method: "PATCH", body: body(input) });
export const deleteItem = (tripId: string, id: string) =>
  api<void>(`${base(tripId)}/checklist/${id}`, { method: "DELETE" });
/** Answers the group's items in their new order. */
export const moveItem = (tripId: string, id: string, direction: "up" | "down") =>
  api<{ items: ChecklistItemView[] }>(`${base(tripId)}/checklist/${id}/move`, { body: { direction } });

// ---------- cache patches after a write, so the next screen shows it at once ----------

const upsert = <T extends { id: string }>(list: T[], row: T): T[] =>
  list.some((x) => x.id === row.id) ? list.map((x) => (x.id === row.id ? row : x)) : [...list, row];

/** Create and edit: into the list, and into the trip if it's cached. */
export function putTrip(qc: QueryClient, trip: TripView) {
  const l = qc.getQueryData<TripsData>(tripsKey);
  if (l) qc.setQueryData<TripsData>(tripsKey, { ...l, trips: upsert(l.trips, trip) });
  patchTrip(qc, trip.id, (d) => ({ ...d, trip }));
}
export function dropTrip(qc: QueryClient, id: string) {
  const l = qc.getQueryData<TripsData>(tripsKey);
  if (l) qc.setQueryData<TripsData>(tripsKey, { ...l, trips: l.trips.filter((t) => t.id !== id) });
  qc.removeQueries({ queryKey: tripKey(id) });
}
export const putEntry = (qc: QueryClient, tripId: string, entry: PlanEntryView) =>
  patchTrip(qc, tripId, (d) => ({ ...d, entries: upsert(d.entries, entry) }));
export const dropEntry = (qc: QueryClient, tripId: string, id: string) =>
  patchTrip(qc, tripId, (d) => ({ ...d, entries: d.entries.filter((e) => e.id !== id) }));
export const putPlace = (qc: QueryClient, tripId: string, place: PlaceView) =>
  patchTrip(qc, tripId, (d) => ({ ...d, places: upsert(d.places, place) }));
/** The plan entry made from the place stays, unlinked (§4.1). */
export const dropPlace = (qc: QueryClient, tripId: string, id: string) =>
  patchTrip(qc, tripId, (d) => ({
    ...d,
    places: d.places.filter((p) => p.id !== id),
    entries: d.entries.map((e) => (e.placeId === id ? { ...e, placeId: null } : e)),
  }));
export const putItem = (qc: QueryClient, tripId: string, item: ChecklistItemView) =>
  patchTrip(qc, tripId, (d) => ({ ...d, items: upsert(d.items, item) }));
export const dropItem = (qc: QueryClient, tripId: string, id: string) =>
  patchTrip(qc, tripId, (d) => ({ ...d, items: d.items.filter((i) => i.id !== id) }));
/** After a move: the group's items replace the cached ones. */
export const putGroup = (qc: QueryClient, tripId: string, group: ChecklistGroup, items: ChecklistItemView[]) =>
  patchTrip(qc, tripId, (d) => ({ ...d, items: [...d.items.filter((i) => i.group !== group), ...items] }));

// ---------- words (shared.js formatting) ----------

/** "Sat 21 – Wed 25 Nov": the year once at the end when it isn't this year (Z.range). */
export function range(start: string | null, end: string | null): string {
  if (!start) return "";
  const e = end ?? start;
  if (start === e) return day(start);
  const a = new Date(`${start}T12:00:00`);
  const b = new Date(`${e}T12:00:00`);
  const wd = (d: Date) => d.toLocaleDateString("en-GB", { weekday: "short" });
  const sameMonth = a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
  const left = `${wd(a)} ${a.getDate()}${sameMonth ? "" : ` ${a.toLocaleDateString("en-GB", { month: "short" })}`}${
    a.getFullYear() !== b.getFullYear() ? ` ${a.getFullYear()}` : ""
  }`;
  return `${left} – ${day(e)}`;
}
/** "Sat 21 Nov to Wed 25 Nov" for screen readers (Z.rangeSr). */
export function rangeSr(start: string | null, end: string | null): string {
  if (!start) return "";
  return !end || start === end ? day(start) : `${day(start)} to ${day(end)}`;
}
/** "08:00–12:15" · "20:00" · "" (Z.timeRange). */
export function timeRange(e: { start: string | null; end: string | null }): string {
  return !e.start ? "" : e.end ? `${e.start}–${e.end}` : e.start;
}
/** "08:00 to 12:15" (Z.timeRangeSr). */
export function timeRangeSr(e: { start: string | null; end: string | null }): string {
  return !e.start ? "" : e.end ? `${e.start} to ${e.end}` : e.start;
}
/** The device's clock, "HH:MM". */
export function nowHM(now = new Date()): string {
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

const TYPE_NAME: Record<TripItemType, string> = {
  flight: "Flight",
  transport: "Transport",
  stay: "Stay",
  food: "Food",
  sight: "Sight",
  activity: "Activity",
  other: "Other",
};
export const typeName = (t: TripItemType) => TYPE_NAME[t] ?? "Other";
const GROUP_NAME: Record<ChecklistGroup, string> = {
  packing: "Packing",
  documents: "Documents",
  bookings: "Bookings",
  todo: "To-do",
};
export const groupName = (g: ChecklistGroup) => GROUP_NAME[g] ?? "Other";
