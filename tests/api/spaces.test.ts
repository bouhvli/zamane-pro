import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { formatInviteCode } from "../../src/shared/invite-code.ts";
import { goals, spaces } from "../../src/worker/db/schema.ts";
import { getMySpace } from "../../src/worker/services/spaces.ts";
import { Client, createSpace, db, person } from "./helpers.ts";
import app from "../../src/worker/index.ts";

const ctx = {};

describe("creating a space", () => {
  it("creates it with the creator in slot a and an invite code", async () => {
    const { c, name } = await person("Sara");
    const { id, r } = await createSpace(c);
    expect(r.status).toBe(201);
    expect(r.json.space).toMatchObject({
      id,
      name: "Our space",
      currency: "EUR",
      timezone: "Europe/Brussels",
      slot: "a",
    });
    expect(r.json.space.inviteCode).toMatch(/^[2-9A-HJKMNP-Z]{8}$/);
    expect(r.json.space.members).toEqual([expect.objectContaining({ displayName: name, slot: "a" })]);
    const me = await c.me();
    expect(me.json.space).toMatchObject({ id, slot: "a", memberCount: 1 });
  });

  it("is idempotent on the client's id, and refuses a second space", async () => {
    const { c } = await person();
    const { id } = await createSpace(c);
    const replay = await c.request("/api/spaces", {
      body: { id, name: "Our space", currency: "EUR", timezone: "Europe/Brussels" },
    });
    expect(replay.status).toBe(200);
    const second = await createSpace(c);
    expect(second.r.status).toBe(409);
    expect(second.r.json.error.code).toBe("already_in_space");
  });

  it("validates name, currency and time zone", async () => {
    const { c } = await person();
    const r = await c.request("/api/spaces", {
      body: { id: crypto.randomUUID(), name: " ", currency: "eur", timezone: "Mars/Olympus" },
    });
    expect(r.status).toBe(400);
    expect(r.json.error.fields).toEqual({
      name: "Give your space a name.",
      currency: "Choose a currency.",
      timezone: "Choose a time zone.",
    });
  });

  it("needs a session", async () => {
    const r = await new Client().request("/api/spaces", {
      body: { id: crypto.randomUUID(), name: "x", currency: "EUR", timezone: "UTC" },
    });
    expect(r.status).toBe(401);
  });
});

describe("joining", () => {
  it("joins as slot b with a normalised code and learns the partner's name", async () => {
    const sara = await person("Sara");
    const { r } = await createSpace(sara.c);
    const code: string = r.json.space.inviteCode;
    const youssef = await person("Youssef");
    const j = await youssef.c.request("/api/spaces/join", {
      body: { code: ` ${formatInviteCode(code).toLowerCase()} ` },
    });
    expect(j.status).toBe(200);
    expect(j.json).toEqual({ space: { id: r.json.space.id, name: "Our space" }, partnerName: "Sara" });
    expect((await youssef.c.me()).json.space).toMatchObject({ slot: "b", memberCount: 2 });
    // A retry by the same person is a replay, not an error.
    expect((await youssef.c.request("/api/spaces/join", { body: { code } })).status).toBe(200);
  });

  it("lets exactly one of 10 parallel joins win", async () => {
    const sara = await person("Sara");
    const { r } = await createSpace(sara.c);
    const code: string = r.json.space.inviteCode;
    const people = await Promise.all(Array.from({ length: 10 }, (_, i) => person(`P${i}`)));
    const results = await Promise.all(people.map((p) => p.c.request("/api/spaces/join", { body: { code } })));
    const statuses = results.map((x) => x.status).sort();
    expect(statuses.filter((s) => s === 200)).toHaveLength(1);
    expect(statuses.filter((s) => s === 404)).toHaveLength(9);
    for (const x of results.filter((x) => x.status === 404)) expect(x.json.error.code).toBe("invite_invalid");
    expect((await sara.c.me()).json.space.memberCount).toBe(2);
  });

  it("answers a full space and an unknown code the same way", async () => {
    const sara = await person("Sara");
    const { r } = await createSpace(sara.c);
    const code: string = r.json.space.inviteCode;
    await (await person("Youssef")).c.request("/api/spaces/join", { body: { code } });
    const third = await person("Third");
    const full = await third.c.request("/api/spaces/join", { body: { code } });
    const unknown = await third.c.request("/api/spaces/join", { body: { code: "ZZZZ-ZZZZ" } });
    expect(full.status).toBe(404);
    expect(unknown.status).toBe(404);
    expect(full.json).toEqual(unknown.json);
    expect(full.json.error.code).toBe("invite_invalid");
  });

  it("refuses malformed codes with the shape message", async () => {
    const { c } = await person();
    const r = await c.request("/api/spaces/join", { body: { code: "K7QM-4XP0" } });
    expect(r.status).toBe(400);
    expect(r.json.error.fields.code).toBe("Codes don't use 0, O, 1, I or L. Check the code again.");
  });

  it("refuses someone already in another space with already_in_space", async () => {
    const a = await person();
    const { r } = await createSpace(a.c);
    const b = await person();
    await createSpace(b.c);
    const j = await b.c.request("/api/spaces/join", { body: { code: r.json.space.inviteCode } });
    expect(j.status).toBe(409);
    expect(j.json.error.code).toBe("already_in_space");
  });

  it("rate-limits joining to 5 a minute per person", async () => {
    const { c } = await person();
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++)
      statuses.push((await c.request("/api/spaces/join", { body: { code: "ZZZZ-ZZZZ" } })).status);
    expect(statuses.slice(0, 5)).toEqual([404, 404, 404, 404, 404]);
    expect(statuses[5]).toBe(429);
  });
});

describe("the switch (D33)", () => {
  it("deletes the solo space and joins, in one go", async () => {
    const sara = await person("Sara");
    const target = await createSpace(sara.c);
    const youssef = await person("Youssef");
    const solo = await createSpace(youssef.c, "Mine by mistake");
    await db()
      .insert(goals)
      .values({
        id: crypto.randomUUID(),
        spaceId: solo.id,
        kind: "general",
        title: "Old goal",
        createdBy: (await youssef.c.me()).json.user.id,
      });
    const summary = await youssef.c.request("/api/spaces/mine/summary");
    expect(summary.json).toEqual({ goals: 1, trips: 0, items: 0 });

    const bad = await youssef.c.request("/api/spaces/join", { body: { code: "ZZZZ-ZZZZ", replaceSolo: true } });
    expect(bad.json.error.code).toBe("invite_invalid");
    expect(await db().select().from(spaces).where(eq(spaces.id, solo.id))).toHaveLength(1); // nothing deleted

    const ok = await youssef.c.request("/api/spaces/join", {
      body: { code: target.r.json.space.inviteCode, replaceSolo: true },
    });
    expect(ok.status).toBe(200);
    expect(ok.json.partnerName).toBe("Sara");
    expect(await db().select().from(spaces).where(eq(spaces.id, solo.id))).toHaveLength(0);
    expect((await youssef.c.me()).json.space).toMatchObject({ id: target.id, slot: "b" });
  });

  it("refuses once a partner has joined the solo space", async () => {
    const youssef = await person("Youssef");
    const solo = await createSpace(youssef.c);
    await (await person("Amal")).c.request("/api/spaces/join", { body: { code: solo.r.json.space.inviteCode } });
    const sara = await person("Sara");
    const target = await createSpace(sara.c);
    const r = await youssef.c.request("/api/spaces/join", {
      body: { code: target.r.json.space.inviteCode, replaceSolo: true },
    });
    expect(r.status).toBe(409);
    expect(r.json.error).toMatchObject({ code: "partner_joined", message: "Amal already joined your space." });
  });
});

describe("rotating the code, and the space boundary", () => {
  it("rotates: the old code stops working, the new one joins", async () => {
    const sara = await person("Sara");
    const { r } = await createSpace(sara.c);
    const old: string = r.json.space.inviteCode;
    const rot = await sara.c.request("/api/spaces/mine/invite-code", { body: {} });
    expect(rot.status).toBe(200);
    expect(rot.json.inviteCode).not.toBe(old);
    const y = await person("Youssef");
    expect((await y.c.request("/api/spaces/join", { body: { code: old } })).status).toBe(404);
    expect((await y.c.request("/api/spaces/join", { body: { code: rot.json.inviteCode } })).status).toBe(200);
    expect((await sara.c.request("/api/spaces/mine")).json.space.inviteCodeRotatedAt).toBeTruthy();
  });

  it("reads only the caller's space; another space's id is a 404", async () => {
    const a = await person("Sara");
    const sa = await createSpace(a.c);
    const b = await person("Nora");
    const sb = await createSpace(b.c);
    const mineA = await a.c.request("/api/spaces/mine");
    expect(mineA.json.space.id).toBe(sa.id);
    expect(mineA.json.space.members.map((m: { displayName: string }) => m.displayName)).toEqual(["Sara"]);
    const userA = (await a.c.me()).json.user.id;
    await expect(getMySpace(ctx, sb.id, userA)).rejects.toMatchObject({ status: 404, code: "not_found" });
  });

  it("answers 403 no_space without a space, and 501 for leaving (D19)", async () => {
    const { c } = await person();
    expect((await c.request("/api/spaces/mine")).json.error.code).toBe("no_space");
    await createSpace(c);
    const leave = await c.request("/api/spaces/mine/leave", { body: {} });
    expect(leave.status).toBe(501);
    expect(leave.json.error.code).toBe("not_implemented");
  });

  it("rejects cross-origin and non-JSON writes", async () => {
    const { c } = await person();
    const res = await app.fetch(
      new Request("http://localhost:3000/api/spaces", {
        method: "POST",
        headers: { Origin: "https://evil.example", "Content-Type": "application/json", Cookie: c.cookieHeader() },
        body: "{}",
      }),
    );
    expect(res.status).toBe(403);
    const form = await app.fetch(
      new Request("http://localhost:3000/api/spaces", {
        method: "POST",
        headers: { Origin: "http://localhost:3000", "Content-Type": "text/plain", Cookie: c.cookieHeader() },
        body: "{}",
      }),
    );
    expect(form.status).toBe(415);
  });
});
