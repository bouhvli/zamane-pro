/**
 * The Profile settings behind the API (D67-D71): rename, the invite code when linked, export, leaving a space,
 * deleting an account, changing the email, signing out other devices.
 */
import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { goals, shoppingItems, spaces, user as userTable } from "../../src/worker/db/schema.ts";
import { Client, PASSWORD, createSpace, db, person, sessionCount, uniqueEmail } from "./helpers.ts";

const uuid = () => crypto.randomUUID();

async function couple() {
  const sara = await person("Sara");
  const { id: spaceId, r } = await createSpace(sara.c, "Our home");
  const code: string = r.json.space.inviteCode;
  const youssef = await person("Youssef");
  const j = await youssef.c.request("/api/spaces/join", { body: { code } });
  expect(j.status).toBe(200);
  return { sara, youssef, spaceId, code };
}

async function userId(c: Client): Promise<string> {
  return (await c.me()).json.user.id;
}

/** A little of everything, written by `c`. */
async function fill(c: Client) {
  const goalId = uuid();
  await c.request("/api/goals", { body: { id: goalId, kind: "money", title: "Wedding fund", target: 100_000 } });
  await c.request(`/api/goals/${goalId}/entries`, { body: { id: uuid(), amount: 25_000, note: "First" } });
  await c.request(`/api/goals/${goalId}/notes`, {
    body: { id: uuid(), blocks: [{ type: "text", text: "We started." }] },
  });
  const tripId = uuid();
  await c.request("/api/trips", { body: { id: tripId, title: "Fes", startDate: "2026-12-01", endDate: "2026-12-03" } });
  await c.request(`/api/trips/${tripId}/plan`, {
    body: { id: uuid(), type: "food", title: "Dinner at the riad", date: "2026-12-01" },
  });
  await c.request(`/api/trips/${tripId}/places`, { body: { id: uuid(), type: "sight", title: "Bou Inania" } });
  await c.request(`/api/trips/${tripId}/checklist`, { body: { id: uuid(), group: "packing", title: "Adapter" } });
  const itemId = uuid();
  await c.request("/api/shopping", { body: { id: itemId, name: "Milk" } });
  await c.request(`/api/shopping/${itemId}/bought`, { method: "PUT", body: { bought: true } });
  return { goalId, tripId, itemId };
}

describe("renaming the space", () => {
  it("lets any member rename, validates like create, and leaves currency and time zone alone", async () => {
    const { sara, youssef } = await couple();
    const r = await youssef.c.request("/api/spaces/mine", { method: "PATCH", body: { name: "  Dar Zamane " } });
    expect(r.status).toBe(200);
    expect(r.json.space).toMatchObject({ name: "Dar Zamane", currency: "EUR", timezone: "Europe/Brussels" });
    expect((await sara.c.me()).json.space.name).toBe("Dar Zamane");

    const empty = await sara.c.request("/api/spaces/mine", { method: "PATCH", body: { name: "  " } });
    expect(empty.status).toBe(400);
    expect(empty.json.error.fields.name).toBe("Give your space a name.");
    const long = await sara.c.request("/api/spaces/mine", { method: "PATCH", body: { name: "x".repeat(121) } });
    expect(long.json.error.fields.name).toBe("Use 120 characters or fewer.");

    // Extra fields are ignored: the currency can't be changed this way.
    await sara.c.request("/api/spaces/mine", { method: "PATCH", body: { name: "Home", currency: "USD" } });
    expect((await sara.c.me()).json.space.currency).toBe("EUR");
  });

  it("needs a session and a space", async () => {
    expect((await new Client().request("/api/spaces/mine", { method: "PATCH", body: { name: "x" } })).status).toBe(401);
    const { c } = await person();
    const r = await c.request("/api/spaces/mine", { method: "PATCH", body: { name: "x" } });
    expect(r.status).toBe(403);
    expect(r.json.error.code).toBe("no_space");
  });
});

describe("the invite code when the space is linked", () => {
  it("is refused with 409 and not sent once the partner has joined", async () => {
    const sara = await person("Sara");
    const { r } = await createSpace(sara.c);
    expect(r.json.space.inviteCode).toBeTruthy();
    expect((await sara.c.request("/api/spaces/mine/invite-code", { body: {} })).status).toBe(200);
    const code = (await sara.c.request("/api/spaces/mine")).json.space.inviteCode;
    const youssef = await person("Youssef");
    await youssef.c.request("/api/spaces/join", { body: { code } });

    const refused = await sara.c.request("/api/spaces/mine/invite-code", { body: {} });
    expect(refused.status).toBe(409);
    expect(refused.json.error).toMatchObject({ code: "partner_joined", message: "Your partner has already joined." });
    expect((await youssef.c.request("/api/spaces/mine/invite-code", { body: {} })).status).toBe(409);
    expect((await sara.c.request("/api/spaces/mine")).json.space.inviteCode).toBeNull();
    expect((await sara.c.request("/api/home")).json.inviteCode).toBeNull();
  });
});

describe("export", () => {
  it("downloads the space's data as JSON, scoped, with names instead of ids", async () => {
    const { sara, youssef } = await couple();
    await fill(sara.c);
    const res = await youssef.c.request("/api/me/export");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toMatch(
      /^attachment; filename="zamane-export-\d{4}-\d{2}-\d{2}\.json"$/,
    );
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("content-type")).toMatch(/^application\/json/);
    const x = res.json;
    expect(x.user).toEqual({ displayName: "Youssef", email: expect.stringMatching(/^youssef-/) });
    expect(x.space).toMatchObject({ name: "Our home", currency: "EUR", timezone: "Europe/Brussels" });
    expect(x.space.members.map((m: { displayName: string }) => m.displayName).sort()).toEqual(["Sara", "Youssef"]);
    expect(x.goals).toHaveLength(1);
    expect(x.goals[0]).toMatchObject({ title: "Wedding fund", targetAmount: 100_000, createdBy: "Sara" });
    expect(x.goals[0].entries[0]).toMatchObject({ amount: 25_000, note: "First", createdBy: "Sara" });
    expect(x.goals[0].notes[0].blocks).toEqual([
      { kind: "text", text: "We started.", photo: null, photoDescription: null },
    ]);
    expect(x.trips).toHaveLength(1);
    expect(x.trips[0].plan[0]).toMatchObject({ title: "Dinner at the riad", type: "food" });
    expect(x.trips[0].places[0].title).toBe("Bou Inania");
    expect(x.trips[0].checklist.map((i: { title: string }) => i.title)).toContain("Adapter");
    expect(x.shopping[0]).toMatchObject({ name: "Milk", addedBy: "Sara", boughtBy: "Sara" });
    expect(JSON.stringify(x)).not.toContain(await userId(sara.c)); // people are names, never ids
  });

  it("never includes another space's data", async () => {
    const { sara } = await couple();
    await fill(sara.c);
    const nadia = await person("Nadia");
    await createSpace(nadia.c, "Nadia's place");
    const x = (await nadia.c.request("/api/me/export")).json;
    expect(x.goals).toEqual([]);
    expect(x.trips).toEqual([]);
    expect(x.shopping).toEqual([]);
    expect(x.space.members).toEqual([{ displayName: "Nadia" }]);
  });

  it("needs a session and a space", async () => {
    expect((await new Client().request("/api/me/export")).status).toBe(401);
    const { c } = await person();
    expect((await c.request("/api/me/export")).status).toBe(403);
  });
});

describe("leaving the space", () => {
  it("removes only the leaver: the partner keeps the space and the data, the code is rotated", async () => {
    const { sara, youssef, spaceId, code } = await couple();
    const { goalId, itemId } = await fill(youssef.c);
    const youssefId = await userId(youssef.c);

    const left = await youssef.c.request("/api/spaces/mine/leave", { body: {} });
    expect(left.status).toBe(200);
    expect(left.json).toEqual({ left: true, deleted: false });

    // The leaver has no space, still has an account.
    const me = await youssef.c.me();
    expect(me.status).toBe(200);
    expect(me.json.space).toBeNull();
    expect((await youssef.c.request("/api/goals")).json.error.code).toBe("no_space");

    // The partner keeps everything, and attribution still points at the leaver's (kept) user row.
    const mine = await sara.c.request("/api/spaces/mine");
    expect(mine.json.space.id).toBe(spaceId);
    expect(mine.json.space.members).toHaveLength(1);
    expect(mine.json.space.inviteCode).toMatch(/^[2-9A-HJKMNP-Z]{8}$/);
    expect(mine.json.space.inviteCode).not.toBe(code);
    const list = await sara.c.request("/api/goals");
    expect(list.json.goals).toHaveLength(1);
    expect(list.json.goals[0].createdBy).toBe(youssefId);
    expect(list.json.members).toHaveLength(1);
    const [g] = await db().select().from(goals).where(eq(goals.id, goalId));
    expect(g?.createdBy).toBe(youssefId);
    const [it] = await db().select().from(shoppingItems).where(eq(shoppingItems.id, itemId));
    expect(it?.boughtBy).toBe(youssefId);
    expect((await sara.c.request("/api/me/export")).json.goals[0].createdBy).toBe("Former partner");

    // The old code is dead; the new one fills the freed seat. The leaver can create or join again.
    const stale = await youssef.c.request("/api/spaces/join", { body: { code } });
    expect(stale.status).toBe(404);
    const nora = await person("Nora");
    const joined = await nora.c.request("/api/spaces/join", { body: { code: mine.json.space.inviteCode } });
    expect(joined.status).toBe(200);
    expect(joined.json.partnerName).toBe("Sara");
    const again = await createSpace(youssef.c, "Fresh start");
    expect(again.r.status).toBe(201);
  });

  it("lets the leaver join another space with a code", async () => {
    const { youssef } = await couple();
    await youssef.c.request("/api/spaces/mine/leave", { body: {} });
    const other = await person("Amal");
    const { r } = await createSpace(other.c);
    const j = await youssef.c.request("/api/spaces/join", { body: { code: r.json.space.inviteCode } });
    expect(j.status).toBe(200);
    expect((await youssef.c.me()).json.space).toMatchObject({ slot: "b", memberCount: 2 });
  });

  it("deletes the space and its data when the last member leaves", async () => {
    const sara = await person("Sara");
    const { id: spaceId } = await createSpace(sara.c);
    await fill(sara.c);
    const left = await sara.c.request("/api/spaces/mine/leave", { body: {} });
    expect(left.json).toEqual({ left: true, deleted: true });
    expect(await db().select().from(spaces).where(eq(spaces.id, spaceId))).toEqual([]);
    expect(await db().select().from(goals).where(eq(goals.spaceId, spaceId))).toEqual([]);
    expect(await db().select().from(shoppingItems).where(eq(shoppingItems.spaceId, spaceId))).toEqual([]);
    expect((await sara.c.me()).json.space).toBeNull();
  });

  it("answers a second call with 200 { left: false } and needs a session", async () => {
    const sara = await person("Sara");
    await createSpace(sara.c);
    await sara.c.request("/api/spaces/mine/leave", { body: {} });
    const again = await sara.c.request("/api/spaces/mine/leave", { body: {} });
    expect(again.status).toBe(200);
    expect(again.json).toEqual({ left: false, deleted: false });
    expect((await new Client().request("/api/spaces/mine/leave", { body: {} })).status).toBe(401);
  });

  it("serialises two partners leaving at once: the space goes with the second", async () => {
    const { sara, youssef, spaceId } = await couple();
    const [a, b] = await Promise.all([
      sara.c.request("/api/spaces/mine/leave", { body: {} }),
      youssef.c.request("/api/spaces/mine/leave", { body: {} }),
    ]);
    expect([a.status, b.status]).toEqual([200, 200]);
    expect([a.json.deleted, b.json.deleted].sort()).toEqual([false, true]);
    expect(await db().select().from(spaces).where(eq(spaces.id, spaceId))).toEqual([]);
  });
});

describe("deleting the account", () => {
  it("refuses a wrong password with the field error and changes nothing", async () => {
    const sara = await person("Sara");
    await createSpace(sara.c);
    const r = await sara.c.request("/api/me", { method: "DELETE", body: { password: "not-the-password" } });
    expect(r.status).toBe(400);
    expect(r.json.error).toMatchObject({
      code: "validation_failed",
      fields: { password: "That password isn't right." },
    });
    expect((await sara.c.me()).status).toBe(200);
    const empty = await sara.c.request("/api/me", { method: "DELETE", body: { password: "" } });
    expect(empty.status).toBe(400);
    expect((await new Client().request("/api/me", { method: "DELETE", body: { password: PASSWORD } })).status).toBe(
      401,
    );
  });

  it("deletes a solo person, their space and everything, for real", async () => {
    const sara = await person("Sara");
    const { id: spaceId } = await createSpace(sara.c);
    await fill(sara.c);
    const id = await userId(sara.c);
    const r = await sara.c.request("/api/me", { method: "DELETE", body: { password: PASSWORD } });
    expect(r.status).toBe(204);
    expect(sara.c.cookies.size).toBe(0); // the session cookies were cleared
    expect(await db().select().from(userTable).where(eq(userTable.id, id))).toEqual([]);
    expect(await db().select().from(spaces).where(eq(spaces.id, spaceId))).toEqual([]);
    expect((await sara.c.me()).status).toBe(401);
    expect((await new Client().signIn(sara.email)).status).toBe(401);
  });

  it("deletes a person nothing references (no space activity) without leaving a row", async () => {
    const lone = await person("Lina");
    const id = await userId(lone.c);
    expect((await lone.c.request("/api/me", { method: "DELETE", body: { password: PASSWORD } })).status).toBe(204);
    expect(await db().select().from(userTable).where(eq(userTable.id, id))).toEqual([]);
  });

  it("with a partner: leaves the space, keeps the partner's data, anonymises the row, and can't sign in", async () => {
    const { sara, youssef, spaceId } = await couple();
    await fill(youssef.c);
    const id = await userId(youssef.c);
    const other = new Client(); // a second device of the same person
    expect((await other.signIn(youssef.email)).status).toBe(200);

    const r = await youssef.c.request("/api/me", { method: "DELETE", body: { password: PASSWORD } });
    expect(r.status).toBe(204);
    expect(youssef.c.cookies.size).toBe(0);

    const [row] = await db().select().from(userTable).where(eq(userTable.id, id));
    expect(row).toMatchObject({ displayName: "Former partner", email: `deleted-${id}@zamane.invalid` });
    expect(await sessionCount(`deleted-${id}@zamane.invalid`)).toBe(0);

    // The partner keeps the space and its data; the code is fresh; attribution survives.
    const mine = await sara.c.request("/api/spaces/mine");
    expect(mine.json.space.id).toBe(spaceId);
    expect(mine.json.space.members).toHaveLength(1);
    expect(mine.json.space.inviteCode).toBeTruthy();
    expect((await sara.c.request("/api/goals")).json.goals).toHaveLength(1);

    // Nobody can sign in as the old or the placeholder address, or use the old session.
    expect((await new Client().signIn(youssef.email)).status).toBe(401);
    expect((await new Client().signIn(`deleted-${id}@zamane.invalid`)).status).toBe(401);
    // (Another device's signed cookie cache can answer for up to 5 minutes, as after a password change, section 6;
    // its session row is already gone, which sessionCount above checks.)
    // The freed address can be used again.
    expect((await new Client().signUp(youssef.email, "Youssef")).status).toBe(200);
  });
});

describe("changing the email", () => {
  const spy = () => vi.spyOn(console, "log");
  afterEach(() => vi.restoreAllMocks());

  async function waitForLink(log: ReturnType<typeof spy>, to: string): Promise<string> {
    for (let i = 0; i < 50; i++) {
      const lines = log.mock.calls.map((a) => String(a[0]));
      const at = lines.findIndex((l) => l.includes(`→ ${to}`));
      if (at >= 0) {
        const m = /link: (\S+)/.exec(lines[at]!);
        if (m) return m[1]!;
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error("no confirmation link");
  }

  it("asks for the current password, validates like sign-up and changes nothing until the link is opened", async () => {
    const log = spy();
    const sara = await person("Sara");
    const fresh = uniqueEmail("new");
    const wrong = await sara.c.request("/api/me/email", { body: { newEmail: fresh, password: "nope-nope-nope" } });
    expect(wrong.status).toBe(400);
    expect(wrong.json.error.fields.password).toBe("That password isn't right.");
    const bad = await sara.c.request("/api/me/email", { body: { newEmail: "not-an-email", password: PASSWORD } });
    expect(bad.json.error.fields.newEmail).toBe("Check your email address. It should look like name@example.com.");
    const same = await sara.c.request("/api/me/email", {
      body: { newEmail: sara.email.toUpperCase(), password: PASSWORD },
    });
    expect(same.status).toBe(400);
    expect(same.json.error.fields.newEmail).toBeTruthy();

    const ok = await sara.c.request("/api/me/email", { body: { newEmail: fresh, password: PASSWORD } });
    expect(ok.status).toBe(200);
    expect((await sara.c.me()).json.user.email).toBe(sara.email); // not yet

    const link = await waitForLink(log, fresh);
    const url = new URL(link);
    expect(url.pathname).toBe("/api/auth/verify-email");
    const done = await sara.c.request(url.pathname + url.search);
    expect(done.status).toBe(302);
    expect(done.headers.get("location")).toContain("/profile?email=updated");
    expect((await sara.c.me()).json.user.email).toBe(fresh);
    expect((await new Client().signIn(fresh)).status).toBe(200);
    expect((await new Client().signIn(sara.email)).status).toBe(401);
  });

  it("answers an address that already has an account exactly like a free one, and sends nothing", async () => {
    const log = spy();
    const sara = await person("Sara");
    const taken = await person("Taken");
    const r = await sara.c.request("/api/me/email", { body: { newEmail: taken.email, password: PASSWORD } });
    const free = await sara.c.request("/api/me/email", { body: { newEmail: uniqueEmail("free"), password: PASSWORD } });
    expect(r.status).toBe(200);
    expect(r.json).toEqual(free.json);
    await new Promise((res) => setTimeout(res, 300));
    expect(log.mock.calls.some((a) => String(a[0]).includes(`→ ${taken.email}`))).toBe(false);
    expect((await sara.c.me()).json.user.email).toBe(sara.email);
  });

  it("needs a session", async () => {
    const r = await new Client().request("/api/me/email", { body: { newEmail: uniqueEmail(), password: PASSWORD } });
    expect(r.status).toBe(401);
  });
});

describe("signing out other devices", () => {
  it("ends every other session and keeps this one", async () => {
    const sara = await person("Sara");
    const phone = new Client();
    const tablet = new Client();
    expect((await phone.signIn(sara.email)).status).toBe(200);
    expect((await tablet.signIn(sara.email)).status).toBe(200);
    expect(await sessionCount(sara.email)).toBe(3);

    const r = await phone.request("/api/auth/revoke-other-sessions", { body: {} });
    expect(r.status).toBe(200);
    expect(await sessionCount(sara.email)).toBe(1);
    expect((await phone.me()).status).toBe(200);
    expect((await new Client().request("/api/auth/revoke-other-sessions", { body: {} })).status).toBe(401);
  });
});
