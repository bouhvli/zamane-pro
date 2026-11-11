import { describe, expect, it } from "vitest";
import { stringToSign } from "../../src/shared/cloudinary.ts";
import { createSpace, person } from "./helpers.ts";

async function couple() {
  const sara = await person("Sara");
  const { id: spaceId, r } = await createSpace(sara.c);
  const youssef = await person("Youssef");
  await youssef.c.request("/api/spaces/join", { body: { code: r.json.space.inviteCode } });
  return { sara, youssef, spaceId };
}

const cover = (spaceId: string, id = crypto.randomUUID()) => ({
  publicId: `zamane/${spaceId}/goal-cover/${id}`,
  version: 1731150000,
  width: 1600,
  height: 1200,
  format: "jpg",
});

async function sha256Hex(s: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

describe("goals", () => {
  it("creates idempotently, lists, reads and keeps other spaces out", async () => {
    const { sara, youssef } = await couple();
    const id = crypto.randomUUID();
    const body = { id, kind: "money", title: "  Wedding fund ", target: 2_000_000, description: "For June." };
    const a = await sara.c.request("/api/goals", { body });
    expect(a.status).toBe(201);
    expect(a.json.goal).toMatchObject({ id, title: "Wedding fund", target: 2_000_000, progress: 0, entryCount: 0 });
    expect((await sara.c.request("/api/goals", { body })).status).toBe(200);

    const list = await youssef.c.request("/api/goals");
    expect(list.status).toBe(200);
    expect(list.json.currency).toBe("EUR");
    expect(list.json.goals.map((g: { id: string }) => g.id)).toEqual([id]);
    expect(list.json.members).toHaveLength(2);

    const stranger = await person("Nadia");
    await createSpace(stranger.c);
    expect((await stranger.c.request(`/api/goals/${id}`)).status).toBe(404);
    expect((await stranger.c.request(`/api/goals/${id}/entries`)).status).toBe(404);
    expect(
      (
        await stranger.c.request(`/api/goals/${id}`, {
          method: "PATCH",
          body: { title: "x", updatedAt: a.json.goal.updatedAt },
        })
      ).status,
    ).toBe(404);
    await stranger.c.request(`/api/goals/${id}`, { method: "DELETE" });
    expect((await sara.c.request(`/api/goals/${id}`)).status).toBe(200);
  });

  it("validates with the design's messages", async () => {
    const { sara, spaceId } = await couple();
    const r = await sara.c.request("/api/goals", { body: { id: crypto.randomUUID(), kind: "money", title: "" } });
    expect(r.status).toBe(400);
    expect(r.json.error.fields).toMatchObject({ title: "Enter a title for the goal." });
    const long = await sara.c.request("/api/goals", {
      body: { id: crypto.randomUUID(), kind: "general", title: "x".repeat(81) },
    });
    expect(long.json.error.fields.title).toBe("Use 80 characters or fewer for the title.");
    const noTarget = await sara.c.request("/api/goals", {
      body: { id: crypto.randomUUID(), kind: "money", title: "Car" },
    });
    expect(noTarget.json.error.fields.target).toBe("Enter a target amount, for example 20000.");
    const foreign = await sara.c.request("/api/goals", {
      body: { id: crypto.randomUUID(), kind: "general", title: "Room", cover: cover(crypto.randomUUID()) },
    });
    expect(foreign.status).toBe(400);
    const own = await sara.c.request("/api/goals", {
      body: { id: crypto.randomUUID(), kind: "general", title: "Room", cover: cover(spaceId) },
    });
    expect(own.status).toBe(201);
    expect(own.json.goal.cover.publicId).toContain(spaceId);
  });

  it("patches with optimistic concurrency and recomputes completion", async () => {
    const { sara, youssef } = await couple();
    const id = crypto.randomUUID();
    const g = (await sara.c.request("/api/goals", { body: { id, kind: "money", title: "Car", target: 100_000 } })).json
      .goal;
    await sara.c.request(`/api/goals/${id}/entries`, { body: { id: crypto.randomUUID(), amount: 60_000 } });
    const fresh = (await sara.c.request(`/api/goals/${id}`)).json.goal;

    const lowered = await youssef.c.request(`/api/goals/${id}`, {
      method: "PATCH",
      body: { target: 50_000, updatedAt: fresh.updatedAt },
    });
    expect(lowered.status).toBe(200);
    expect(lowered.json).toMatchObject({ completed: true, reopened: false });
    expect(lowered.json.goal.completedAt).not.toBeNull();

    const stale = await sara.c.request(`/api/goals/${id}`, {
      method: "PATCH",
      body: { title: "New car", updatedAt: g.updatedAt },
    });
    expect(stale.status).toBe(409);
    expect(stale.json.error.code).toBe("conflict");
    expect(stale.json.current).toMatchObject({ target: 50_000, title: "Car" });

    const raised = await sara.c.request(`/api/goals/${id}`, {
      method: "PATCH",
      body: { target: 200_000, title: "New car", updatedAt: stale.json.current.updatedAt },
    });
    expect(raised.json).toMatchObject({ reopened: true });
    expect(raised.json.goal).toMatchObject({ title: "New car", completedAt: null });

    const cleared = await sara.c.request(`/api/goals/${id}`, {
      method: "PATCH",
      body: { target: null, updatedAt: raised.json.goal.updatedAt },
    });
    expect(cleared.status).toBe(400);
  });

  it("lists entries newest first, computes stats, and deletes with everything under it", async () => {
    const { sara, youssef } = await couple();
    const id = crypto.randomUUID();
    await sara.c.request("/api/goals", { body: { id, kind: "money", title: "Trip", target: 1_000_000 } });
    await sara.c.request(`/api/goals/${id}/entries`, { body: { id: crypto.randomUUID(), amount: 30_000 } });
    await youssef.c.request(`/api/goals/${id}/entries`, {
      body: { id: crypto.randomUUID(), amount: 10_000, note: "Tips" },
    });
    const entries = await sara.c.request(`/api/goals/${id}/entries`);
    expect(entries.json.entries.map((e: { amount: number }) => e.amount)).toEqual([10_000, 30_000]);
    const stats = await sara.c.request(`/api/goals/${id}/stats`);
    expect(stats.json).toMatchObject({ count: 2, total: 40_000, average: 20_000, largest: 30_000, thisMonth: 40_000 });
    expect(stats.json.shares.map((s: { pct: number }) => s.pct)).toEqual([75, 25]);
    expect(stats.json.last.note).toBe("Tips");

    const room = crypto.randomUUID();
    await sara.c.request("/api/goals", { body: { id: room, kind: "general", title: "Room" } });
    await sara.c.request(`/api/goals/${room}/entries`, { body: { id: crypto.randomUUID(), percent: 40 } });
    const gs = await sara.c.request(`/api/goals/${room}/stats`);
    expect(gs.json).toMatchObject({ count: 1, monthFrom: 0, monthTo: 40 });

    expect((await youssef.c.request(`/api/goals/${id}`, { method: "DELETE" })).status).toBe(204);
    expect((await sara.c.request(`/api/goals/${id}`)).status).toBe(404);
    expect((await sara.c.request(`/api/goals/${id}`, { method: "DELETE" })).status).toBe(204);
  });
});

describe("journal notes", () => {
  it("creates whole notes, lets only the author edit, and checks for conflicts", async () => {
    const { sara, youssef, spaceId } = await couple();
    const goalId = crypto.randomUUID();
    await sara.c.request("/api/goals", { body: { id: goalId, kind: "general", title: "Garden" } });
    const noteId = crypto.randomUUID();
    const photo = { ...cover(spaceId), publicId: `zamane/${spaceId}/note-image/${crypto.randomUUID()}` };
    const body = {
      id: noteId,
      blocks: [
        { type: "text", text: "Planted the olive tree." },
        { type: "image", image: photo, alt: "The tree" },
      ],
    };
    const made = await sara.c.request(`/api/goals/${goalId}/notes`, { body });
    expect(made.status).toBe(201);
    expect(made.json.note.blocks).toEqual(body.blocks);
    expect((await sara.c.request(`/api/goals/${goalId}/notes`, { body })).status).toBe(200);

    const list = await youssef.c.request(`/api/goals/${goalId}/notes`);
    expect(list.json.notes).toHaveLength(1);
    expect((await youssef.c.request(`/api/goals/${goalId}`)).json.goal.noteCount).toBe(1);

    const put = (c: typeof sara.c, updatedAt: string, blocks = [{ type: "text", text: "Watered it." }]) =>
      c.request(`/api/goals/${goalId}/notes/${noteId}`, { method: "PUT", body: { blocks, updatedAt } });
    expect((await put(youssef.c, made.json.note.updatedAt)).status).toBe(403);
    const edited = await put(sara.c, made.json.note.updatedAt);
    expect(edited.status).toBe(200);
    expect(edited.json.note.blocks).toEqual([{ type: "text", text: "Watered it." }]);
    const stale = await put(sara.c, made.json.note.updatedAt);
    expect(stale.status).toBe(409);
    expect(stale.json.current.blocks[0].text).toBe("Watered it.");

    const empty = await sara.c.request(`/api/goals/${goalId}/notes`, { body: { id: crypto.randomUUID(), blocks: [] } });
    expect(empty.status).toBe(400);
    const foreign = await sara.c.request(`/api/goals/${goalId}/notes`, {
      body: { id: crypto.randomUUID(), blocks: [{ type: "image", image: cover(crypto.randomUUID()), alt: "" }] },
    });
    expect(foreign.status).toBe(400);

    expect((await youssef.c.request(`/api/goals/${goalId}/notes/${noteId}`, { method: "DELETE" })).status).toBe(403);
    expect((await sara.c.request(`/api/goals/${goalId}/notes/${noteId}`, { method: "DELETE" })).status).toBe(204);
    expect((await sara.c.request(`/api/goals/${goalId}/notes/${noteId}`, { method: "DELETE" })).status).toBe(204);
  });
});

describe("POST /api/uploads/sign", () => {
  it("signs a public id inside the space's folder with SHA-256", async () => {
    const { sara, spaceId } = await couple();
    const r = await sara.c.request("/api/uploads/sign", { body: { purpose: "goal-cover" } });
    expect(r.status).toBe(200);
    expect(r.json.publicId.startsWith(`zamane/${spaceId}/goal-cover/`)).toBe(true);
    expect(r.json).toMatchObject({
      cloudName: "zamane-test",
      signatureAlgorithm: "sha256",
      allowedFormats: "jpg,png,webp",
    });
    const expected = await sha256Hex(
      stringToSign({
        allowed_formats: r.json.allowedFormats,
        overwrite: "false",
        public_id: r.json.publicId,
        timestamp: r.json.timestamp,
      }) + "test-cloudinary-secret",
    );
    expect(r.json.signature).toBe(expected);
    expect((await sara.c.request("/api/uploads/sign", { body: { purpose: "avatar" } })).status).toBe(400);
  });

  it("needs a space", async () => {
    const lone = await person("Lone");
    expect((await lone.c.request("/api/uploads/sign", { body: { purpose: "note-image" } })).status).toBe(403);
  });
});
