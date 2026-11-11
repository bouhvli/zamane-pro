import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { verification } from "../../src/worker/db/schema.ts";
import { Client, db, PASSWORD, person, resetTokenFor, sessionCount, uniqueEmail } from "./helpers.ts";

describe("sign-up, sign-in, sign-out and session", () => {
  it("signs up, reads the session from /api/me, signs out", async () => {
    const c = new Client();
    const email = uniqueEmail("sara");
    const up = await c.signUp(`  ${email.toUpperCase()} `, "Sara");
    expect(up.status).toBe(200);
    expect(c.cookies.size).toBeGreaterThan(0);

    const me = await c.me();
    expect(me.status).toBe(200);
    expect(me.json).toMatchObject({ user: { displayName: "Sara", email }, space: null });
    expect(me.json.user.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-/); // UUID v7

    const out = await c.request("/api/auth/sign-out", { body: {} });
    expect(out.status).toBe(200);
    expect((await c.me()).status).toBe(401);
  });

  it("signs in, and refuses a wrong password with one message", async () => {
    const { email } = await person("Youssef");
    const c = new Client();
    const wrong = await c.signIn(email, "not-the-password");
    expect(wrong.status).toBe(401);
    expect(wrong.json.error.code).toBe("invalid_credentials");
    const unknown = await new Client().signIn(uniqueEmail("nobody"), "not-the-password");
    expect(unknown.status).toBe(401);
    expect(unknown.json).toEqual(wrong.json);
    const ok = await c.signIn(email);
    expect(ok.status).toBe(200);
    expect((await c.me()).json.user.email).toBe(email);
  });

  it("answers a taken email with email_taken", async () => {
    const { email } = await person();
    const again = await new Client().signUp(email, "Other");
    expect(again.status).toBe(422);
    expect(again.json.error).toMatchObject({ code: "email_taken", fields: { email: expect.any(String) } });
  });

  it("validates with the shared schemas (10 to 128 characters, a first name)", async () => {
    const c = new Client();
    const short = await c.signUp(uniqueEmail(), "Sara", "sesame");
    expect(short.status).toBe(400);
    expect(short.json.error.fields.password).toBe("Use at least 10 characters.");
    const long = await c.signUp(uniqueEmail(), "Sara", "x".repeat(129));
    expect(long.json.error.fields.password).toBe("Use 128 characters or fewer.");
    const noName = await c.signUp(uniqueEmail(), "   ");
    expect(noName.json.error.fields.name).toBe("Enter your first name.");
    const badEmail = await c.signUp("sara@example", "Sara");
    expect(badEmail.json.error.fields.email).toMatch(/Check your email address/);
  });

  it("only exposes the endpoints the app uses", async () => {
    const { c } = await person();
    expect((await c.request("/api/auth/delete-user", { body: {} })).status).toBe(404);
    expect((await c.request("/api/auth/list-sessions")).status).toBe(404);
  });
});

describe("password reset", () => {
  it("answers the same whether or not the account exists", async () => {
    const { email } = await person();
    const known = await new Client().request("/api/auth/request-password-reset", { body: { email } });
    const unknown = await new Client().request("/api/auth/request-password-reset", {
      body: { email: uniqueEmail("ghost") },
    });
    expect(known.status).toBe(200);
    expect(unknown.status).toBe(200);
    expect(unknown.json).toEqual(known.json);
  });

  it("resets with a valid token, signs every session out, and the token works once", async () => {
    const { c: deviceA, email } = await person();
    const deviceB = new Client();
    await deviceB.signIn(email);
    expect(await sessionCount(email)).toBe(2);

    await new Client().request("/api/auth/request-password-reset", { body: { email } });
    const token = await resetTokenFor(email);
    const check = await new Client().request(`/api/password-reset/check?token=${encodeURIComponent(token)}`);
    expect(check.json).toEqual({ valid: true });

    const reset = await new Client().request("/api/auth/reset-password", {
      body: { newPassword: "a-brand-new-password", token },
    });
    expect(reset.status).toBe(200);
    expect(await sessionCount(email)).toBe(0); // revokeSessionsOnPasswordReset

    const reused = await new Client().request("/api/auth/reset-password", {
      body: { newPassword: "another-new-password", token },
    });
    expect(reused.status).toBe(400);
    expect(reused.json.error.code).toBe("invalid_token");
    expect((await new Client().request(`/api/password-reset/check?token=${token}`)).json).toEqual({ valid: false });

    expect((await new Client().signIn(email)).status).toBe(401);
    expect((await new Client().signIn(email, "a-brand-new-password")).status).toBe(200);
    void deviceA;
  });

  it("refuses an expired token (expired and used look the same)", async () => {
    const { email } = await person();
    await new Client().request("/api/auth/request-password-reset", { body: { email } });
    const token = await resetTokenFor(email);
    await db()
      .update(verification)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(verification.identifier, `reset-password:${token}`));
    expect((await new Client().request(`/api/password-reset/check?token=${token}`)).json).toEqual({ valid: false });
    const r = await new Client().request("/api/auth/reset-password", {
      body: { newPassword: "a-brand-new-password", token },
    });
    expect(r.status).toBe(400);
    expect(r.json.error.code).toBe("invalid_token");
  });

  it("sets the token to expire after 1 hour", async () => {
    const { email } = await person();
    const before = Date.now();
    await new Client().request("/api/auth/request-password-reset", { body: { email } });
    const token = await resetTokenFor(email);
    const [row] = await db()
      .select({ expiresAt: verification.expiresAt })
      .from(verification)
      .where(eq(verification.identifier, `reset-password:${token}`));
    const ms = row!.expiresAt.getTime() - before;
    expect(ms).toBeGreaterThan(59 * 60_000);
    expect(ms).toBeLessThanOrEqual(61 * 60_000);
  });
});

describe("change password", () => {
  it("changes it and revokes the other sessions", async () => {
    const { c, email } = await person();
    const other = new Client();
    await other.signIn(email);
    expect(await sessionCount(email)).toBe(2);
    const wrong = await c.request("/api/auth/change-password", {
      body: { currentPassword: "not-it-at-all", newPassword: "a-fresh-password-1" },
    });
    expect(wrong.status).toBe(400);
    expect(wrong.json.error.fields.currentPassword).toBeTruthy();

    // revokeOtherSessions is forced by the server even when the client doesn't ask.
    const r = await c.request("/api/auth/change-password", {
      body: { currentPassword: PASSWORD, newPassword: "a-fresh-password-1" },
    });
    expect(r.status).toBe(200);
    expect(await sessionCount(email)).toBe(1);
    expect((await c.me()).status).toBe(200);
    expect((await new Client().signIn(email, "a-fresh-password-1")).status).toBe(200);
  });
});

describe("display name", () => {
  it("updates through PATCH /api/me", async () => {
    const { c } = await person("Sara");
    const r = await c.request("/api/me", { method: "PATCH", body: { displayName: "  Sarah " } });
    expect(r.status).toBe(200);
    expect(r.json.user.displayName).toBe("Sarah");
    const bad = await c.request("/api/me", { method: "PATCH", body: { displayName: "" } });
    expect(bad.status).toBe(400);
    expect(bad.json.error).toMatchObject({
      code: "validation_failed",
      fields: { displayName: "Enter your first name." },
    });
  });
});

describe("rate limits", () => {
  it("answers 429 with Retry-After after 10 sign-in tries a minute from one IP", async () => {
    const { email } = await person();
    const c = new Client();
    const statuses: number[] = [];
    for (let i = 0; i < 12; i++) statuses.push((await c.signIn(email, `wrong-password-${i}`)).status);
    expect(statuses.slice(0, 10).every((s) => s === 401)).toBe(true);
    const last = await c.signIn(email, "wrong-password-x");
    expect(last.status).toBe(429);
    expect(last.json.error).toEqual({
      code: "rate_limited",
      message: "Too many tries. Wait a minute, then try again.",
    });
    expect(last.headers.get("Retry-After")).toBe("60");
  });

  it("limits per email too, whatever the IP", async () => {
    const { email } = await person();
    const statuses: number[] = [];
    for (let i = 0; i < 11; i++) statuses.push((await new Client().signIn(email, `wrong-${i}-password`)).status);
    expect(statuses.at(-1)).toBe(429);
  });
});

describe("the test-only reset-link route", () => {
  it("doesn't exist in a build without E2E (production never has it; check:secrets proves its code is absent)", async () => {
    const r = await new Client().request("/api/test/last-reset-link?email=someone@example.com");
    expect(r.status).toBe(404);
  });
});
