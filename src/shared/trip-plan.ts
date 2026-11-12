/**
 * Derived trip values (§4.3), computed on the device from the server's raw rows: status, sections, the day list,
 * now / next, budget, prep counts. Ported from .ux-forge/trips shared.js, with the same rules (ia D2, §7 f, D11).
 * Dates are YYYY-MM-DD strings and times HH:MM; nothing here shifts a date through a time zone.
 */
import { CHECKLIST_GROUPS, type ChecklistGroup, type TripItemType } from "./enums.ts";
import type { ChecklistItemView, PlaceView, PlanEntryView, TripView } from "./schemas/trips.ts";

const DAY = 86_400_000;

function dayNumber(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d) / DAY;
}
/** b − a in whole days. */
export function dayDiff(a: string, b: string): number {
  return dayNumber(b) - dayNumber(a);
}
export function addDays(iso: string, n: number): string {
  return new Date((dayNumber(iso) + n) * DAY).toISOString().slice(0, 10);
}
export function mins(hm: string | null): number | null {
  if (!hm) return null;
  const [h, m] = hm.split(":").map(Number) as [number, number];
  return h * 60 + m;
}

// ---------- status and sections ----------

export type Status =
  | { kind: "upcoming"; days: number }
  | { kind: "now"; day: number; total: number; last: boolean }
  | { kind: "past"; ago: number }
  | { kind: "undated" };
export type StatusKind = Status["kind"];

type Dated = Pick<TripView, "startDate" | "endDate">;

export function status(t: Dated, today: string): Status {
  if (!t.startDate) return { kind: "undated" };
  const end = t.endDate ?? t.startDate;
  if (today < t.startDate) return { kind: "upcoming", days: dayDiff(today, t.startDate) };
  if (today > end) return { kind: "past", ago: dayDiff(end, today) };
  const day = dayDiff(t.startDate, today) + 1;
  const total = dayDiff(t.startDate, end) + 1;
  return { kind: "now", day, total, last: day === total };
}

/** "Day 3 of 4 · Happening now" · "12 days to go" · "Tomorrow" · "No dates yet" · "Ended 64 days ago". */
export function statusText(t: Dated, today: string): string {
  const s = status(t, today);
  if (s.kind === "undated") return "No dates yet";
  if (s.kind === "upcoming") return s.days === 1 ? "Tomorrow" : `${s.days} days to go`;
  if (s.kind === "past") return s.ago === 1 ? "Ended yesterday" : `Ended ${s.ago} days ago`;
  return `Day ${s.day} of ${s.total} · ${s.last ? "Last day" : "Happening now"}`;
}

export const SECTION_ORDER = ["now", "upcoming", "undated", "past"] as const;
export type SectionKey = (typeof SECTION_ORDER)[number];

/** The list's sections in time order (ia D2); empty ones are left out. */
export function sections<T extends TripView>(trips: T[], today: string): { key: SectionKey; trips: T[] }[] {
  const by: Record<SectionKey, T[]> = { now: [], upcoming: [], undated: [], past: [] };
  for (const t of trips) by[status(t, today).kind].push(t);
  by.now.sort((a, b) => (a.startDate! < b.startDate! ? -1 : 1));
  by.upcoming.sort((a, b) => (a.startDate! < b.startDate! ? -1 : 1));
  by.undated.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  by.past.sort((a, b) => (a.endDate! > b.endDate! ? -1 : 1));
  return SECTION_ORDER.filter((k) => by[k].length).map((key) => ({ key, trips: by[key] }));
}

/** The first trip happening now, else the first upcoming. */
export function leadTrip<T extends TripView>(trips: T[], today: string): T | null {
  const s = sections(trips, today).find((x) => x.key === "now" || x.key === "upcoming");
  return s?.trips[0] ?? null;
}

// ---------- the day list ----------

type EntryTimes = Pick<PlanEntryView, "start" | "createdAt">;
/** "Any time" first, then by start, then by when it was added. */
export function byTime(a: EntryTimes, b: EntryTimes): number {
  if (!a.start && b.start) return -1;
  if (a.start && !b.start) return 1;
  if (a.start !== b.start) return a.start! < b.start! ? -1 : 1;
  return a.createdAt.localeCompare(b.createdAt);
}

export interface DayGroup {
  date: string;
  /** 1-based; null on an undated trip. */
  n: number | null;
  isToday: boolean;
  entries: PlanEntryView[];
}
export interface DayList {
  days: DayGroup[];
  /** Dated outside the trip's range. */
  outside: PlanEntryView[];
  unscheduled: PlanEntryView[];
}

/**
 * The days run from the start to the end inclusive, empty days kept. An undated trip's days are the distinct
 * dates of its dated entries. Entries outside the range and without a date are listed apart.
 */
export function days(t: Dated, entries: PlanEntryView[], today: string): DayList {
  const unscheduled = entries.filter((e) => !e.date).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const dated = entries.filter((e) => e.date);
  const group = (iso: string, n: number | null): DayGroup => ({
    date: iso,
    n,
    isToday: iso === today,
    entries: dated.filter((e) => e.date === iso).sort(byTime),
  });
  if (!t.startDate) {
    const seen = [...new Set(dated.map((e) => e.date!))].sort();
    return { days: seen.map((iso) => group(iso, null)), outside: [], unscheduled };
  }
  const end = t.endDate ?? t.startDate;
  const n = dayDiff(t.startDate, end) + 1;
  const list: DayGroup[] = [];
  for (let i = 0; i < n; i++) list.push(group(addDays(t.startDate, i), i + 1));
  const outside = dated
    .filter((e) => e.date! < t.startDate! || e.date! > end)
    .sort((a, b) => (a.date! < b.date! ? -1 : a.date! > b.date! ? 1 : byTime(a, b)));
  return { days: list, outside, unscheduled };
}

/** Today's entry in progress and the one after it (not done; no end time counts as an hour, ia §7 f). */
export function nowNext(
  t: Dated,
  entries: PlanEntryView[],
  today: string,
  nowHM: string,
): { now: PlanEntryView | null; next: PlanEntryView | null } {
  if (status(t, today).kind !== "now") return { now: null, next: null };
  const m = mins(nowHM)!;
  const list = entries.filter((e) => e.date === today && e.start && !e.doneAt).sort(byTime);
  let now: PlanEntryView | null = null;
  let next: PlanEntryView | null = null;
  for (const e of list) {
    const s = mins(e.start)!;
    const en = e.end ? mins(e.end)! : s + 60;
    if (!now && s <= m && m < en) now = e;
  }
  for (const e of list) if (!next && e !== now && mins(e.start)! > m) next = e;
  return { now, next };
}

// ---------- places and budget (D11) ----------

/** The plan entry scheduled from a place, or null. */
export function entryOf(p: Pick<PlaceView, "id">, entries: PlanEntryView[]): PlanEntryView | null {
  return entries.find((e) => e.placeId === p.id) ?? null;
}
export function visited(p: Pick<PlaceView, "id">, entries: PlanEntryView[]): boolean {
  return !!entryOf(p, entries)?.doneAt;
}

export interface Budget {
  plan: number;
  ideas: number;
  ideasCount: number;
  planned: number;
  budget: number | null;
  over: number;
  left: number;
  ratio: number | null;
  uncosted: number;
  byType: { type: TripItemType; amount: number }[];
}

/** Planned = Σ plan cost + Σ estimates of places not yet in the plan (once each, D11). */
export function budget(t: Pick<TripView, "budget">, entries: PlanEntryView[], places: PlaceView[]): Budget {
  const ideas = places.filter((p) => !entryOf(p, entries));
  const plan = entries.reduce((s, e) => s + (e.cost ?? 0), 0);
  const ideaSum = ideas.reduce((s, p) => s + (p.estimate ?? 0), 0);
  const types = new Map<TripItemType, number>();
  for (const e of entries) if (e.cost) types.set(e.type, (types.get(e.type) ?? 0) + e.cost);
  const planned = plan + ideaSum;
  const b = t.budget ?? null;
  return {
    plan,
    ideas: ideaSum,
    ideasCount: ideas.length,
    planned,
    budget: b,
    over: b != null && planned > b ? planned - b : 0,
    left: b != null && planned <= b ? b - planned : 0,
    ratio: b ? planned / b : null,
    uncosted: entries.filter((e) => e.cost == null).length,
    byType: [...types].map(([type, amount]) => ({ type, amount })).sort((a, b2) => b2.amount - a.amount),
  };
}

// ---------- the checklist ----------

export function itemsOf(items: ChecklistItemView[], group?: ChecklistGroup): ChecklistItemView[] {
  return items
    .filter((i) => !group || i.group === group)
    .sort(
      (a, b) =>
        CHECKLIST_GROUPS.indexOf(a.group) - CHECKLIST_GROUPS.indexOf(b.group) ||
        a.position - b.position ||
        a.createdAt.localeCompare(b.createdAt),
    );
}
export interface PrepGroup {
  group: ChecklistGroup;
  items: ChecklistItemView[];
  done: number;
  total: number;
}
export function prep(items: ChecklistItemView[]): PrepGroup[] {
  return CHECKLIST_GROUPS.map((group) => {
    const its = itemsOf(items, group);
    return { group, items: its, total: its.length, done: its.filter((i) => i.doneAt).length };
  });
}
export function prepCounts(items: ChecklistItemView[]): { done: number; total: number } {
  return { total: items.length, done: items.filter((i) => i.doneAt).length };
}
/** What's left to do: prep items not ticked, and must-do places not in the plan. */
export function left(
  items: ChecklistItemView[],
  places: PlaceView[],
  entries: PlanEntryView[],
): { prep: number; mustDo: number } {
  const pc = prepCounts(items);
  return { prep: pc.total - pc.done, mustDo: places.filter((p) => p.mustDo && !entryOf(p, entries)).length };
}
