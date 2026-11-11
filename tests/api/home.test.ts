import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { goals, shoppingItems, trips } from "../../src/worker/db/schema.ts";
import { Client, createSpace, db, person } from "./helpers.ts";

async function couple() {
  const sara = await person("Sara");
  const { id: spaceId, r } = await createSpace(sara.c);
  const youssef = await person("Youssef");
  await youssef.c.request("/api/spaces/join", { body: { code: r.json.space.inviteCode } });
  const saraId: string = (await sara.c.me()).json.user.id;
  return { sara, youssef, spaceId, saraId };
}

async function addGoal(spaceId: string, by: string, g: { kind: "money" | "general"; title: string; target?: number }) {
  const id = crypto.randomUUID();
  await db()
    .insert(goals)
    .values({ id, spaceId, kind: g.kind, title: g.title, targetAmount: g.target ?? null, createdBy: by });
  return id;
}

describe("GET /api/home", () => {
  it("shows the invite code while alone, then the pair", async () => {
    const sara = await person("Sara");
    const { r } = await createSpace(sara.c);
    const solo = await sara.c.request("/api/home");
    expect(solo.status).toBe(200);
    expect(solo.json).toMatchObject({ currency: "EUR", total: 0, goals: [], trips: [], shoppingLeft: 0 });
    expect(solo.json.inviteCode).toBe(r.json.space.inviteCode);
    expect(solo.json.members).toEqual([expect.objectContaining({ displayName: "Sara", slot: "a" })]);
    await (await person("Youssef")).c.request("/api/spaces/join", { body: { code: r.json.space.inviteCode } });
    const pair = await sara.c.request("/api/home");
    expect(pair.json.inviteCode).toBeNull();
    expect(pair.json.members.map((m: { slot: string }) => m.slot)).toEqual(["a", "b"]);
  });

  it("totals money entries, reads the latest percent, lists trips and shopping left", async () => {
    const { sara, youssef, spaceId, saraId } = await couple();
    const wedding = await addGoal(spaceId, saraId, { kind: "money", title: "Wedding fund", target: 2_000_000 });
    const room = await addGoal(spaceId, saraId, { kind: "general", title: "Paint the guest room" });
    await sara.c.request(`/api/goals/${wedding}/entries`, { body: { id: crypto.randomUUID(), amount: 1_000_000 } });
    await youssef.c.request(`/api/goals/${wedding}/entries`, {
      body: { id: crypto.randomUUID(), amount: 425_000, note: "Bonus" },
    });
    await youssef.c.request(`/api/goals/${room}/entries`, { body: { id: crypto.randomUUID(), percent: 30 } });
    await youssef.c.request(`/api/goals/${room}/entries`, { body: { id: crypto.randomUUID(), percent: 60 } });
    await db().insert(trips).values({
      id: crypto.randomUUID(),
      spaceId,
      title: "Chefchaouen",
      startDate: "2099-11-21",
      endDate: "2099-11-25",
      createdBy: saraId,
    });
    await db().insert(trips).values({
      id: crypto.randomUUID(),
      spaceId,
      title: "Over",
      startDate: "2000-01-01",
      endDate: "2000-01-02",
      createdBy: saraId,
    });
    await db()
      .insert(shoppingItems)
      .values([
        { id: crypto.randomUUID(), spaceId, name: "Mint", createdBy: saraId },
        { id: crypto.randomUUID(), spaceId, name: "Milk", createdBy: saraId, boughtAt: new Date(), boughtBy: saraId },
      ]);
    const h = (await sara.c.request("/api/home")).json;
    expect(h.total).toBe(1_425_000);
    const w = h.goals.find((g: { id: string }) => g.id === wedding);
    expect(w).toMatchObject({ kind: "money", progress: 1_425_000, target: 2_000_000, completedAt: null });
    expect(w.last).toMatchObject({ amount: 425_000, note: "Bonus" });
    expect(h.goals.find((g: { id: string }) => g.id === room)).toMatchObject({
      kind: "general",
      progress: 60,
      target: null,
    });
    expect(h.trips.map((t: { title: string }) => t.title)).toEqual(["Chefchaouen"]);
    expect(h.trips[0]).toMatchObject({ startDate: "2099-11-21", endDate: "2099-11-25" });
    expect(h.shoppingLeft).toBe(1);
  });

  it("needs a space", async () => {
    const { c } = await person();
    expect((await c.request("/api/home")).status).toBe(403);
    expect((await new Client().request("/api/home")).status).toBe(401);
  });
});

describe("goal entries", () => {
  it("adds, completes when the target is crossed, and un-completes on undo", async () => {
    const { sara, youssef, spaceId, saraId } = await couple();
    const goal = await addGoal(spaceId, saraId, { kind: "money", title: "Sofa", target: 600_000 });
    const first = await sara.c.request(`/api/goals/${goal}/entries`, {
      body: { id: crypto.randomUUID(), amount: 400_000 },
    });
    expect(first.status).toBe(201);
    expect(first.json).toMatchObject({ goal: { progress: 400_000, completedAt: null }, completed: false });
    const entryId = crypto.randomUUID();
    const second = await youssef.c.request(`/api/goals/${goal}/entries`, { body: { id: entryId, amount: 200_000 } });
    expect(second.json.completed).toBe(true);
    expect(second.json.goal.completedAt).toBeTruthy();
    const [row] = await db().select().from(goals).where(eq(goals.id, goal));
    expect(row!.completedBy).toBe((await youssef.c.me()).json.user.id);

    // Replaying the same create is a no-op answered with 200 (the offline queue relies on it).
    const replay = await youssef.c.request(`/api/goals/${goal}/entries`, { body: { id: entryId, amount: 200_000 } });
    expect(replay.status).toBe(200);
    expect(replay.json).toMatchObject({ goal: { progress: 600_000 }, completed: false });

    expect((await youssef.c.request(`/api/goals/${goal}/entries/${entryId}`, { method: "DELETE" })).status).toBe(204);
    const [after] = await db().select().from(goals).where(eq(goals.id, goal));
    expect(after!.completedAt).toBeNull();
    expect(after!.completedBy).toBeNull();
    // Deleting again is still 204 (D17).
    expect((await youssef.c.request(`/api/goals/${goal}/entries/${entryId}`, { method: "DELETE" })).status).toBe(204);
  });

  it("sets a general goal's progress with the latest percent, and undo restores the previous one", async () => {
    const { sara, spaceId, saraId } = await couple();
    const goal = await addGoal(spaceId, saraId, { kind: "general", title: "Learn Spanish" });
    await sara.c.request(`/api/goals/${goal}/entries`, { body: { id: crypto.randomUUID(), percent: 60 } });
    const id = crypto.randomUUID();
    const done = await sara.c.request(`/api/goals/${goal}/entries`, { body: { id, percent: 100 } });
    expect(done.json).toMatchObject({ goal: { progress: 100 }, completed: true });
    await sara.c.request(`/api/goals/${goal}/entries/${id}`, { method: "DELETE" });
    const h = (await sara.c.request("/api/home")).json;
    expect(h.goals.find((g: { id: string }) => g.id === goal)).toMatchObject({ progress: 60, completedAt: null });
  });

  it("serialises two partners adding at once: the goal completes exactly once", async () => {
    const { sara, youssef, spaceId, saraId } = await couple();
    const goal = await addGoal(spaceId, saraId, { kind: "money", title: "Rings", target: 100_000 });
    const [a, b] = await Promise.all([
      sara.c.request(`/api/goals/${goal}/entries`, { body: { id: crypto.randomUUID(), amount: 60_000 } }),
      youssef.c.request(`/api/goals/${goal}/entries`, { body: { id: crypto.randomUUID(), amount: 60_000 } }),
    ]);
    expect([a.json.completed, b.json.completed].filter(Boolean)).toHaveLength(1);
  });

  it("refuses the wrong field for the goal's kind, and another space's goal is a 404", async () => {
    const { sara, spaceId, saraId } = await couple();
    const goal = await addGoal(spaceId, saraId, { kind: "money", title: "Car", target: 1_000_000 });
    const wrong = await sara.c.request(`/api/goals/${goal}/entries`, {
      body: { id: crypto.randomUUID(), percent: 40 },
    });
    expect(wrong.status).toBe(400);
    expect(wrong.json.error.fields.amount).toBeTruthy();
    const both = await sara.c.request(`/api/goals/${goal}/entries`, {
      body: { id: crypto.randomUUID(), amount: 1, percent: 1 },
    });
    expect(both.status).toBe(400);

    const other = await couple();
    const foreign = await other.sara.c.request(`/api/goals/${goal}/entries`, {
      body: { id: crypto.randomUUID(), amount: 5_000 },
    });
    expect(foreign.status).toBe(404);
    expect(
      (await other.sara.c.request(`/api/goals/${goal}/entries/${crypto.randomUUID()}`, { method: "DELETE" })).status,
    ).toBe(204);
    const h = (await sara.c.request("/api/home")).json;
    expect(h.total).toBe(0); // nothing landed in Sara's space from the other couple
  });
});
