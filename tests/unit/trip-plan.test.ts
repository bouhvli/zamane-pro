import { describe, expect, it } from "vitest";
import type { ChecklistItemView, PlaceView, PlanEntryView, TripView } from "../../src/shared/schemas/trips.ts";
import {
  budget,
  days,
  left,
  leadTrip,
  nowNext,
  prep,
  sections,
  status,
  statusText,
  visited,
} from "../../src/shared/trip-plan.ts";

const at = "2026-10-20T10:00:00.000Z";
const trip = (o: Partial<TripView> = {}): TripView => ({
  id: "t",
  title: "T",
  destination: "",
  startDate: "2026-11-21",
  endDate: "2026-11-25",
  budget: 8000,
  notes: "",
  cover: null,
  createdBy: "a",
  createdAt: at,
  updatedAt: at,
  ...o,
});
const entry = (o: Partial<PlanEntryView>): PlanEntryView => ({
  id: crypto.randomUUID(),
  tripId: "t",
  type: "other",
  title: "E",
  date: null,
  start: null,
  end: null,
  location: "",
  cost: null,
  url: "",
  notes: "",
  doneAt: null,
  doneBy: null,
  placeId: null,
  createdBy: "a",
  createdAt: at,
  updatedAt: at,
  ...o,
});
const place = (o: Partial<PlaceView>): PlaceView => ({
  id: crypto.randomUUID(),
  tripId: "t",
  type: "sight",
  title: "P",
  area: "",
  notes: "",
  url: "",
  estimate: null,
  mustDo: false,
  createdBy: "a",
  createdAt: at,
  updatedAt: at,
  ...o,
});

describe("status", () => {
  it("is upcoming, now, past or undated from the device's date", () => {
    expect(status(trip(), "2026-11-09")).toEqual({ kind: "upcoming", days: 12 });
    expect(status(trip(), "2026-11-21")).toEqual({ kind: "now", day: 1, total: 5, last: false });
    expect(status(trip(), "2026-11-25")).toMatchObject({ kind: "now", day: 5, last: true });
    expect(status(trip(), "2026-11-26")).toEqual({ kind: "past", ago: 1 });
    expect(status(trip({ startDate: null, endDate: null }), "2026-11-09").kind).toBe("undated");
  });
  it("words it", () => {
    expect(statusText(trip(), "2026-11-20")).toBe("Tomorrow");
    expect(statusText(trip(), "2026-11-09")).toBe("12 days to go");
    expect(statusText(trip(), "2026-11-23")).toBe("Day 3 of 5 · Happening now");
    expect(statusText(trip(), "2026-11-25")).toBe("Day 5 of 5 · Last day");
    expect(statusText(trip(), "2026-11-27")).toBe("Ended 2 days ago");
  });
});

describe("sections", () => {
  it("orders now, coming up, no dates, past and leaves out the empty ones", () => {
    const now = trip({ id: "now", startDate: "2026-11-07", endDate: "2026-11-10" });
    const soon = trip({ id: "soon" });
    const later = trip({ id: "later", startDate: "2026-12-20", endDate: "2026-12-22" });
    const none = trip({ id: "none", startDate: null, endDate: null });
    const past = trip({ id: "past", startDate: "2026-09-02", endDate: "2026-09-06" });
    const s = sections([past, none, later, soon, now], "2026-11-09");
    expect(s.map((x) => x.key)).toEqual(["now", "upcoming", "undated", "past"]);
    expect(s[1]!.trips.map((t) => t.id)).toEqual(["soon", "later"]);
    expect(leadTrip([past, none, later, soon, now], "2026-11-09")!.id).toBe("now");
    expect(leadTrip([past, none, later, soon], "2026-11-09")!.id).toBe("soon");
    expect(leadTrip([past, none], "2026-11-09")).toBeNull();
    expect(sections([past], "2026-11-09").map((x) => x.key)).toEqual(["past"]);
  });
});

describe("days", () => {
  it("keeps empty days and puts strays apart; any-time entries come first", () => {
    const es = [
      entry({ id: "a", date: "2026-11-21", start: "20:00" }),
      entry({ id: "b", date: "2026-11-21" }),
      entry({ id: "c", date: "2026-11-23", start: "10:00" }),
      entry({ id: "out", date: "2026-11-20" }),
      entry({ id: "none" }),
    ];
    const d = days(trip(), es, "2026-11-23");
    expect(d.days.map((x) => x.date)).toEqual(["2026-11-21", "2026-11-22", "2026-11-23", "2026-11-24", "2026-11-25"]);
    expect(d.days[0]!.entries.map((e) => e.id)).toEqual(["b", "a"]);
    expect(d.days[1]!.entries).toEqual([]);
    expect(d.days[2]).toMatchObject({ n: 3, isToday: true });
    expect(d.outside.map((e) => e.id)).toEqual(["out"]);
    expect(d.unscheduled.map((e) => e.id)).toEqual(["none"]);
  });
  it("an undated trip lists the dates it has", () => {
    const d = days(
      trip({ startDate: null, endDate: null }),
      [entry({ date: "2026-12-02" }), entry({ date: "2026-12-01" })],
      "2026-11-09",
    );
    expect(d.days.map((x) => [x.date, x.n])).toEqual([
      ["2026-12-01", null],
      ["2026-12-02", null],
    ]);
  });
});

describe("now and next", () => {
  const t = trip({ startDate: "2026-11-07", endDate: "2026-11-10" });
  const es = [
    entry({ id: "lunch", date: "2026-11-09", start: "12:45", end: "14:00" }),
    entry({ id: "tram", date: "2026-11-09", start: "15:00", end: "16:00" }),
    entry({ id: "fado", date: "2026-11-09", start: "20:30" }),
    entry({ id: "done", date: "2026-11-09", start: "13:00", end: "14:00", doneAt: at }),
  ];
  it("finds the entry in progress and the next one, skipping done ones", () => {
    const r = nowNext(t, es, "2026-11-09", "13:20");
    expect(r.now!.id).toBe("lunch");
    expect(r.next!.id).toBe("tram");
  });
  it("has no now between entries, and an entry without an end lasts an hour", () => {
    expect(nowNext(t, es, "2026-11-09", "14:30").now).toBeNull();
    expect(nowNext(t, es, "2026-11-09", "14:30").next!.id).toBe("tram");
    expect(nowNext(t, es, "2026-11-09", "21:00").now!.id).toBe("fado");
    expect(nowNext(t, es, "2026-11-09", "21:30")).toEqual({ now: null, next: null });
  });
  it("is empty when the trip is not happening", () => {
    expect(nowNext(trip(), es, "2026-11-09", "13:20")).toEqual({ now: null, next: null });
  });
});

describe("budget and places (D11)", () => {
  const p1 = place({ id: "p1", estimate: 150 });
  const p2 = place({ id: "p2", estimate: 100, mustDo: true });
  const es = [
    entry({ type: "stay", cost: 4400 }),
    entry({ type: "food", cost: 350 }),
    entry({ type: "sight", cost: 100, placeId: "p2", doneAt: at }),
    entry({ cost: null }),
  ];
  it("counts a scheduled place's cost once, through its entry", () => {
    const b = budget(trip(), es, [p1, p2]);
    expect(b).toMatchObject({ plan: 4850, ideas: 150, ideasCount: 1, planned: 5000, left: 3000, over: 0, uncosted: 1 });
    expect(b.ratio).toBeCloseTo(0.625);
    expect(b.byType.map((x) => x.type)).toEqual(["stay", "food", "sight"]);
  });
  it("reports over budget, and no ratio without a budget", () => {
    expect(budget(trip({ budget: 4000 }), es, [p1, p2])).toMatchObject({ over: 1000, left: 0 });
    expect(budget(trip({ budget: null }), es, [p1])).toMatchObject({ budget: null, ratio: null, over: 0 });
  });
  it("visited means the scheduled entry is done", () => {
    expect(visited(p2, es)).toBe(true);
    expect(visited(p1, es)).toBe(false);
  });
  it("left counts must-do places not in the plan and prep items not ticked", () => {
    const item = (group: ChecklistItemView["group"], position: number, done = false): ChecklistItemView => ({
      id: crypto.randomUUID(),
      tripId: "t",
      group,
      title: "i",
      position,
      doneAt: done ? at : null,
      doneBy: null,
      seeded: true,
      createdBy: "a",
      createdAt: at,
      updatedAt: at,
    });
    const items = [item("todo", 1), item("packing", 2, true), item("packing", 1)];
    expect(left(items, [p1, place({ mustDo: true }), p2], es)).toEqual({ prep: 2, mustDo: 1 });
    const g = prep(items);
    expect(g.map((x) => [x.group, x.done, x.total])).toEqual([
      ["packing", 1, 2],
      ["documents", 0, 0],
      ["bookings", 0, 0],
      ["todo", 0, 1],
    ]);
    expect(g[0]!.items.map((i) => i.position)).toEqual([1, 2]);
  });
});
