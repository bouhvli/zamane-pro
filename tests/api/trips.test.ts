import { describe, expect, it } from "vitest";
import { createSpace, person } from "./helpers.ts";

async function couple() {
  const sara = await person("Sara");
  const { id: spaceId, r } = await createSpace(sara.c);
  const youssef = await person("Youssef");
  await youssef.c.request("/api/spaces/join", { body: { code: r.json.space.inviteCode } });
  return { sara, youssef, spaceId };
}

const uuid = () => crypto.randomUUID();

async function newTrip(c: Awaited<ReturnType<typeof couple>>["sara"]["c"], extra: Record<string, unknown> = {}) {
  const id = uuid();
  const r = await c.request("/api/trips", {
    body: { id, title: "Chefchaouen", startDate: "2026-11-21", endDate: "2026-11-25", budget: 800_000, ...extra },
  });
  return { id, r };
}

describe("trips", () => {
  it("creates idempotently with the seeded checklist, lists, reads and keeps other spaces out", async () => {
    const { sara, youssef } = await couple();
    const { id, r: a } = await newTrip(sara.c, { title: "  Chefchaouen ", destination: "Rif mountains" });
    expect(a.status).toBe(201);
    expect(a.json.trip).toMatchObject({
      id,
      title: "Chefchaouen",
      destination: "Rif mountains",
      startDate: "2026-11-21",
      endDate: "2026-11-25",
      budget: 800_000,
    });
    // a replay answers the same trip and doesn't seed twice
    const again = await sara.c.request("/api/trips", {
      body: { id, title: "Chefchaouen", startDate: "2026-11-21", endDate: "2026-11-25" },
    });
    expect(again.status).toBe(200);

    const full = await youssef.c.request(`/api/trips/${id}`);
    expect(full.status).toBe(200);
    expect(full.json.items).toHaveLength(11);
    expect(full.json.items.every((i: { seeded: boolean }) => i.seeded)).toBe(true);
    expect(full.json.items[0]).toMatchObject({ group: "bookings", title: "Accommodation", position: 1 });
    expect(full.json.entries).toEqual([]);

    const list = await youssef.c.request("/api/trips");
    expect(list.json.currency).toBe("EUR");
    expect(list.json.trips.map((t: { id: string }) => t.id)).toEqual([id]);
    expect(list.json.members).toHaveLength(2);

    const stranger = await person("Nadia");
    await createSpace(stranger.c);
    expect((await stranger.c.request(`/api/trips/${id}`)).status).toBe(404);
    expect((await stranger.c.request("/api/trips", { body: { id, title: "Mine" } })).status).toBe(409);
    expect(
      (
        await stranger.c.request(`/api/trips/${id}/plan`, {
          body: { id: uuid(), type: "food", title: "Dinner" },
        })
      ).status,
    ).toBe(404);
    await stranger.c.request(`/api/trips/${id}`, { method: "DELETE" });
    expect((await sara.c.request(`/api/trips/${id}`)).status).toBe(200);
  });

  it("needs only a title; dates come as a pair; messages are the design's", async () => {
    const { sara } = await couple();
    const bare = await sara.c.request("/api/trips", { body: { id: uuid(), title: "Weekend in Fes" } });
    expect(bare.status).toBe(201);
    expect(bare.json.trip).toMatchObject({
      startDate: null,
      endDate: null,
      budget: null,
      destination: "",
      cover: null,
    });
    const oneDay = await sara.c.request("/api/trips", {
      body: { id: uuid(), title: "Day out", startDate: "2026-12-01" },
    });
    expect(oneDay.json.trip.endDate).toBe("2026-12-01");

    const empty = await sara.c.request("/api/trips", { body: { id: uuid(), title: " " } });
    expect(empty.status).toBe(400);
    expect(empty.json.error.fields.title).toBe("Enter a title for the trip.");
    const long = await sara.c.request("/api/trips", { body: { id: uuid(), title: "x".repeat(81) } });
    expect(long.json.error.fields.title).toBe("Use 80 characters or fewer for the title.");
    const backwards = await sara.c.request("/api/trips", {
      body: { id: uuid(), title: "Back", startDate: "2026-12-05", endDate: "2026-12-01" },
    });
    expect(backwards.status).toBe(400);
    expect(backwards.json.error.fields.endDate).toBe("The end can't be before the start.");
    const cover = await sara.c.request("/api/trips", {
      body: {
        id: uuid(),
        title: "Elsewhere",
        cover: { publicId: "zamane/other-space/trip-cover/x", version: 1, width: 10, height: 10, format: "jpg" },
      },
    });
    expect(cover.status).toBe(400);
  });

  it("edits with the updatedAt check and deletes idempotently", async () => {
    const { sara, youssef } = await couple();
    const { id, r } = await newTrip(sara.c);
    const t0 = r.json.trip.updatedAt;
    const ok = await sara.c.request(`/api/trips/${id}`, {
      method: "PATCH",
      body: { title: "Chef", budget: null, startDate: null, endDate: null, updatedAt: t0 },
    });
    expect(ok.status).toBe(200);
    expect(ok.json.trip).toMatchObject({ title: "Chef", budget: null, startDate: null, endDate: null });
    const stale = await youssef.c.request(`/api/trips/${id}`, {
      method: "PATCH",
      body: { title: "Mine", updatedAt: t0 },
    });
    expect(stale.status).toBe(409);
    expect(stale.json.error.code).toBe("conflict");
    expect(stale.json.current.title).toBe("Chef");

    expect((await sara.c.request(`/api/trips/${id}`, { method: "DELETE" })).status).toBe(204);
    expect((await sara.c.request(`/api/trips/${id}`, { method: "DELETE" })).status).toBe(204);
    expect((await sara.c.request(`/api/trips/${id}`)).status).toBe(404);
  });

  it("plan entries: create, edit, tick (idempotent, no updatedAt bump), delete", async () => {
    const { sara, youssef } = await couple();
    const { id } = await newTrip(sara.c);
    const eid = uuid();
    const body = {
      id: eid,
      type: "transport",
      title: "Bus to Chefchaouen",
      date: "2026-11-21",
      start: "08:00",
      end: "12:15",
      location: "CTM station, Fes",
      cost: 16_000,
    };
    const a = await sara.c.request(`/api/trips/${id}/plan`, { body });
    expect(a.status).toBe(201);
    expect(a.json.entry).toMatchObject({
      start: "08:00",
      end: "12:15",
      cost: 16_000,
      location: "CTM station, Fes",
      doneAt: null,
    });
    expect((await sara.c.request(`/api/trips/${id}/plan`, { body })).status).toBe(200);

    const bad = await sara.c.request(`/api/trips/${id}/plan`, {
      body: { id: uuid(), type: "food", title: "Lunch", end: "13:00" },
    });
    expect(bad.json.error.fields.end).toBe("Add a start time first.");
    const noTitle = await sara.c.request(`/api/trips/${id}/plan`, { body: { id: uuid(), type: "food", title: "" } });
    expect(noTitle.json.error.fields.title).toBe("Enter a title, for example Dinner on the square.");
    const badUrl = await sara.c.request(`/api/trips/${id}/plan`, {
      body: { id: uuid(), type: "food", title: "x", url: "ftp://x" },
    });
    expect(badUrl.json.error.fields.url).toBe("Use a web address starting with https://");

    const t0 = a.json.entry.updatedAt;
    const tick = await youssef.c.request(`/api/trips/${id}/plan/${eid}/done`, { method: "PUT", body: { done: true } });
    expect(tick.status).toBe(200);
    expect(tick.json.entry.doneAt).not.toBeNull();
    expect(tick.json.entry.updatedAt).toBe(t0);
    const first = tick.json.entry.doneAt;
    const replay = await sara.c.request(`/api/trips/${id}/plan/${eid}/done`, { method: "PUT", body: { done: true } });
    expect(replay.json.entry.doneAt).toBe(first);
    expect(replay.json.entry.doneBy).toBe(tick.json.entry.doneBy);

    const edit = await sara.c.request(`/api/trips/${id}/plan/${eid}`, {
      method: "PATCH",
      body: { title: "Bus", start: null, updatedAt: t0 },
    });
    expect(edit.status).toBe(200);
    expect(edit.json.entry).toMatchObject({ title: "Bus", start: null, end: null });
    expect(
      (
        await youssef.c.request(`/api/trips/${id}/plan/${eid}`, {
          method: "PATCH",
          body: { title: "X", updatedAt: t0 },
        })
      ).status,
    ).toBe(409);

    const untick = await sara.c.request(`/api/trips/${id}/plan/${eid}/done`, { method: "PUT", body: { done: false } });
    expect(untick.json.entry).toMatchObject({ doneAt: null, doneBy: null });
    expect((await sara.c.request(`/api/trips/${id}/plan/${eid}`, { method: "DELETE" })).status).toBe(204);
    expect((await sara.c.request(`/api/trips/${id}/plan/${eid}`, { method: "DELETE" })).status).toBe(204);
    expect(
      (await sara.c.request(`/api/trips/${id}/plan/${uuid()}/done`, { method: "PUT", body: { done: true } })).status,
    ).toBe(404);
  });

  it("places: schedule once, keep the entry when the place goes", async () => {
    const { sara, youssef } = await couple();
    const { id } = await newTrip(sara.c);
    const pid = uuid();
    const p = await sara.c.request(`/api/trips/${id}/places`, {
      body: { id: pid, type: "sight", title: "Spanish Mosque", area: "east hill", estimate: 4_000, mustDo: true },
    });
    expect(p.status).toBe(201);
    expect(p.json.place).toMatchObject({ area: "east hill", estimate: 4_000, mustDo: true });
    expect(
      (await sara.c.request(`/api/trips/${id}/places`, { body: { id: pid, type: "sight", title: "Spanish Mosque" } }))
        .status,
    ).toBe(200);

    const eid = uuid();
    const s = await sara.c.request(`/api/trips/${id}/places/${pid}/schedule`, {
      body: { id: eid, date: "2026-11-24", start: "17:30", end: "19:00" },
    });
    expect(s.status).toBe(201);
    // D11: copied from the place, the cost from the estimate
    expect(s.json.entry).toMatchObject({
      placeId: pid,
      title: "Spanish Mosque",
      type: "sight",
      location: "east hill",
      cost: 4_000,
      start: "17:30",
    });
    // a replay is the same entry; another partner's entry is "taken"
    expect(
      (await sara.c.request(`/api/trips/${id}/places/${pid}/schedule`, { body: { id: eid, date: "2026-11-24" } }))
        .status,
    ).toBe(200);
    const taken = await youssef.c.request(`/api/trips/${id}/places/${pid}/schedule`, {
      body: { id: uuid(), date: "2026-11-23" },
    });
    expect(taken.status).toBe(409);
    expect(taken.json.error.code).toBe("conflict");
    expect(taken.json.entry.id).toBe(eid);
    expect((await sara.c.request(`/api/trips/${id}/places/${uuid()}/schedule`, { body: { id: uuid() } })).status).toBe(
      404,
    );

    // unscheduling = deleting the entry; the place stays and can be scheduled again
    await sara.c.request(`/api/trips/${id}/plan/${eid}`, { method: "DELETE" });
    expect((await sara.c.request(`/api/trips/${id}/places/${pid}/schedule`, { body: { id: uuid() } })).status).toBe(
      201,
    );
    // deleting the place keeps its entry, now unlinked
    await sara.c.request(`/api/trips/${id}/places/${pid}`, { method: "DELETE" });
    const full = await sara.c.request(`/api/trips/${id}`);
    expect(full.json.places).toEqual([]);
    expect(full.json.entries).toHaveLength(1);
    expect(full.json.entries[0].placeId).toBeNull();
  });

  it("checklist: add, rename, move between groups, order, tick, delete", async () => {
    const { sara } = await couple();
    const { id } = await newTrip(sara.c);
    const first = uuid();
    const a = await sara.c.request(`/api/trips/${id}/checklist`, {
      body: { id: first, group: "packing", title: "Warm layers" },
    });
    expect(a.status).toBe(201);
    expect(a.json.item).toMatchObject({ position: 5, seeded: false });
    expect(
      (
        await sara.c.request(`/api/trips/${id}/checklist`, {
          body: { id: first, group: "packing", title: "Warm layers" },
        })
      ).status,
    ).toBe(200);
    expect(
      (await sara.c.request(`/api/trips/${id}/checklist`, { body: { id: uuid(), group: "packing", title: "" } })).json
        .error.fields.title,
    ).toBe("Enter a title for the item.");

    // up: swaps with the item above
    const up = await sara.c.request(`/api/trips/${id}/checklist/${first}/move`, { body: { direction: "up" } });
    expect(up.status).toBe(200);
    expect(up.json.items.map((i: { title: string }) => i.title)).toEqual([
      "Walking shoes",
      "Phone chargers",
      "Toiletries",
      "Warm layers",
      "Medicines",
    ]);
    expect(up.json.items.map((i: { position: number }) => i.position)).toEqual([1, 2, 3, 4, 5]);
    const top = await sara.c.request(`/api/trips/${id}/checklist/${first}/move`, { body: { direction: "down" } });
    expect(top.json.items.at(-1).title).toBe("Warm layers");

    const t0 = a.json.item.updatedAt;
    const re = await sara.c.request(`/api/trips/${id}/checklist/${first}`, {
      method: "PATCH",
      body: {
        title: "Warm layers for the evenings",
        group: "todo",
        updatedAt: (await sara.c.request(`/api/trips/${id}`)).json.items.find((i: { id: string }) => i.id === first)
          .updatedAt,
      },
    });
    expect(re.status).toBe(200);
    expect(re.json.item).toMatchObject({ group: "todo", position: 3 });
    expect(t0).toBeTruthy();

    const done = await sara.c.request(`/api/trips/${id}/checklist/${first}/done`, {
      method: "PUT",
      body: { done: true },
    });
    expect(done.json.item.doneAt).not.toBeNull();
    expect((await sara.c.request(`/api/trips/${id}/checklist/${first}`, { method: "DELETE" })).status).toBe(204);
    expect(
      (await sara.c.request(`/api/trips/${id}/checklist/${first}/move`, { body: { direction: "up" } })).status,
    ).toBe(404);
  });

  it("deleting a trip removes its plan, places and checklist", async () => {
    const { sara } = await couple();
    const { id } = await newTrip(sara.c);
    await sara.c.request(`/api/trips/${id}/plan`, { body: { id: uuid(), type: "food", title: "Dinner" } });
    await sara.c.request(`/api/trips/${id}/places`, { body: { id: uuid(), type: "sight", title: "Mosque" } });
    expect((await sara.c.request(`/api/trips/${id}`, { method: "DELETE" })).status).toBe(204);
    expect(
      (await sara.c.request(`/api/trips/${id}/plan`, { body: { id: uuid(), type: "food", title: "Dinner" } })).status,
    ).toBe(404);
    expect((await sara.c.request("/api/trips")).json.trips).toEqual([]);
  });
});
