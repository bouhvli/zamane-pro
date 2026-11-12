import { describe, expect, it } from "vitest";
import { createSpace, person } from "./helpers.ts";

async function couple() {
  const sara = await person("Sara");
  const { r } = await createSpace(sara.c);
  const youssef = await person("Youssef");
  await youssef.c.request("/api/spaces/join", { body: { code: r.json.space.inviteCode } });
  return { sara, youssef };
}

const uuid = () => crypto.randomUUID();
type C = Awaited<ReturnType<typeof couple>>["sara"]["c"];
const add = (c: C, body: Record<string, unknown>) => c.request("/api/shopping", { body: { id: uuid(), ...body } });

describe("shopping", () => {
  it("adds with the name alone, idempotently, lists and keeps other spaces out", async () => {
    const { sara, youssef } = await couple();
    const id = uuid();
    const a = await sara.c.request("/api/shopping", { body: { id, name: "  Milk " } });
    expect(a.status).toBe(201);
    expect(a.json.item).toMatchObject({ id, name: "Milk", quantity: 1, category: null, unit: "piece", notes: "" });
    expect(a.json.item.boughtAt).toBeNull();
    expect((await sara.c.request("/api/shopping", { body: { id, name: "Milk" } })).status).toBe(200);

    const list = await youssef.c.request("/api/shopping");
    expect(list.json.currency).toBe("EUR");
    expect(list.json.items.map((i: { id: string }) => i.id)).toEqual([id]);
    expect(list.json.members).toHaveLength(2);

    const stranger = await person("Nadia");
    await createSpace(stranger.c);
    expect((await stranger.c.request("/api/shopping")).json.items).toEqual([]);
    expect((await stranger.c.request("/api/shopping", { body: { id, name: "Mine" } })).status).toBe(409);
    expect(
      (await stranger.c.request(`/api/shopping/${id}/bought`, { method: "PUT", body: { bought: true } })).status,
    ).toBe(404);
    await stranger.c.request(`/api/shopping/${id}`, { method: "DELETE" });
    expect((await sara.c.request("/api/shopping")).json.items).toHaveLength(1);
  });

  it("validates with the design's messages", async () => {
    const { sara } = await couple();
    const empty = await add(sara.c, { name: "  " });
    expect(empty.status).toBe(400);
    expect(empty.json.error.fields.name).toBe("Add a name.");
    expect((await add(sara.c, { name: "Eggs", quantity: 0 })).json.error.fields.quantity).toBe(
      "Use a whole number from 1.",
    );
    expect((await add(sara.c, { name: "Eggs", quantity: 10000 })).json.error.fields.quantity).toBe(
      "Use a number up to 9999.",
    );
    expect((await add(sara.c, { name: "Eggs", unit: "box" })).status).toBe(400);
    expect((await add(sara.c, { name: "x".repeat(121) })).status).toBe(400);
  });

  it("files categories under one spelling per key and suggests the latest", async () => {
    const { sara } = await couple();
    await add(sara.c, { name: "Tomatoes", category: "Fruit & Veg" });
    const b = await add(sara.c, { name: "Mint", category: "fruit &veg" });
    expect(b.json.item.category).toBe("Fruit & Veg");
    const c = await add(sara.c, { name: "Soap", category: "  " });
    expect(c.json.item.category).toBeNull();
    await add(sara.c, { name: "Rice", category: "Pantry" });
    const cats = await sara.c.request("/api/shopping/categories");
    expect(cats.json.categories).toEqual(["Fruit & Veg", "Pantry"]);
  });

  it("edits with updatedAt, answers 409 with the current row, and re-spells a lone category", async () => {
    const { sara, youssef } = await couple();
    const { json } = await add(sara.c, { name: "Olive oil", quantity: 2, unit: "l", category: "pantry" });
    const item = json.item;
    const ok = await youssef.c.request(`/api/shopping/${item.id}`, {
      method: "PATCH",
      body: { updatedAt: item.updatedAt, notes: "Extra virgin", category: "Pantry" },
    });
    expect(ok.status).toBe(200);
    expect(ok.json.item).toMatchObject({ notes: "Extra virgin", category: "Pantry", quantity: 2, unit: "l" });

    const stale = await sara.c.request(`/api/shopping/${item.id}`, {
      method: "PATCH",
      body: { updatedAt: item.updatedAt, name: "Oil" },
    });
    expect(stale.status).toBe(409);
    expect(stale.json.error.code).toBe("conflict");
    expect(stale.json.current.name).toBe("Olive oil");

    const clear = await sara.c.request(`/api/shopping/${item.id}`, {
      method: "PATCH",
      body: { updatedAt: ok.json.item.updatedAt, unit: "kg", notes: "" },
    });
    expect(clear.json.item).toMatchObject({ unit: "kg", notes: "" });
    expect(
      (await sara.c.request(`/api/shopping/${uuid()}`, { method: "PATCH", body: { updatedAt: item.updatedAt } }))
        .status,
    ).toBe(404);
  });

  it("ticks set state, keep the first buyer and don't bump updatedAt", async () => {
    const { sara, youssef } = await couple();
    const { json } = await add(sara.c, { name: "Milk" });
    const id = json.item.id;
    const t1 = await sara.c.request(`/api/shopping/${id}/bought`, { method: "PUT", body: { bought: true } });
    expect(t1.json.item.boughtAt).not.toBeNull();
    expect(t1.json.item.updatedAt).toBe(json.item.updatedAt);
    const members = (await sara.c.request("/api/shopping")).json.members as { userId: string; slot: string }[];
    const saraId = members.find((m) => m.slot === "a")!.userId;
    expect(t1.json.item.boughtBy).toBe(saraId);

    // a replay by the partner leaves the first buyer and time
    const t2 = await youssef.c.request(`/api/shopping/${id}/bought`, { method: "PUT", body: { bought: true } });
    expect(t2.json.item.boughtBy).toBe(saraId);
    expect(t2.json.item.boughtAt).toBe(t1.json.item.boughtAt);

    const un = await youssef.c.request(`/api/shopping/${id}/bought`, { method: "PUT", body: { bought: false } });
    expect(un.json.item).toMatchObject({ boughtAt: null, boughtBy: null });
    expect(
      (await sara.c.request(`/api/shopping/${uuid()}/bought`, { method: "PUT", body: { bought: true } })).status,
    ).toBe(404);
  });

  it("deletes idempotently, clears bought, and restores rows with their attribution", async () => {
    const { sara, youssef } = await couple();
    const a = (await add(sara.c, { name: "Milk", category: "Dairy", unit: "l" })).json.item;
    const b = (await add(youssef.c, { name: "Bread" })).json.item;
    const keep = (await add(sara.c, { name: "Mint" })).json.item;
    await sara.c.request(`/api/shopping/${a.id}/bought`, { method: "PUT", body: { bought: true } });
    await youssef.c.request(`/api/shopping/${b.id}/bought`, { method: "PUT", body: { bought: true } });

    const cleared = await sara.c.request("/api/shopping/clear-bought", { method: "POST", body: {} });
    expect(cleared.status).toBe(200);
    expect(cleared.json.items.map((i: { id: string }) => i.id).sort()).toEqual([a.id, b.id].sort());
    expect((await sara.c.request("/api/shopping")).json.items.map((i: { id: string }) => i.id)).toEqual([keep.id]);
    // nothing left to clear
    expect((await sara.c.request("/api/shopping/clear-bought", { method: "POST", body: {} })).json.items).toEqual([]);

    const back = await sara.c.request("/api/shopping/restore", { body: { items: cleared.json.items } });
    expect(back.status).toBe(200);
    expect(back.json.items).toHaveLength(2);
    const again = await sara.c.request("/api/shopping/restore", { body: { items: cleared.json.items } });
    expect(again.json.items).toHaveLength(2);
    const list = (await sara.c.request("/api/shopping")).json.items as Record<string, unknown>[];
    expect(list).toHaveLength(3);
    const milk = list.find((i) => i.id === a.id)!;
    expect(milk).toMatchObject({ name: "Milk", category: "Dairy", unit: "l", createdBy: a.createdBy });
    expect(milk.boughtBy).toBe(cleared.json.items.find((i: { id: string }) => i.id === a.id).boughtBy);
    expect(milk.boughtAt).toBe(cleared.json.items.find((i: { id: string }) => i.id === a.id).boughtAt);

    expect((await sara.c.request(`/api/shopping/${keep.id}`, { method: "DELETE" })).status).toBe(204);
    expect((await sara.c.request(`/api/shopping/${keep.id}`, { method: "DELETE" })).status).toBe(204);

    // a stranger's id as the adder is refused
    const outsider = await person("Nadia");
    const bad = await sara.c.request("/api/shopping/restore", {
      body: { items: [{ ...a, id: uuid(), createdBy: uuid(), boughtAt: null, boughtBy: null }] },
    });
    expect(bad.status).toBe(400);
    void outsider;
  });
});
