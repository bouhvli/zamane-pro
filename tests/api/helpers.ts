import { env, exports } from "cloudflare:workers";
import { eq, like } from "drizzle-orm";
import { dbFor } from "../../src/worker/db/client.ts";
import { session as sessionTable, user as userTable, verification } from "../../src/worker/db/schema.ts";

export const ORIGIN = "http://localhost:3000";
export const db = () => dbFor((env as unknown as { DATABASE_URL: string }).DATABASE_URL);

let ipCounter = Math.floor(Math.random() * 200);
/** A fresh client IP, so the IP-keyed rate limits of one test don't spill into another. */
export function freshIp(): string {
  ipCounter = (ipCounter + 1) % 250;
  return `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${ipCounter + 1}`;
}

export const uniqueEmail = (tag = "t") => `${tag}-${crypto.randomUUID().slice(0, 12)}@example.com`;
export const PASSWORD = "olive-tree-2026";

/** A browser stand-in: one cookie jar, one IP, same-origin JSON requests. */
export class Client {
  cookies = new Map<string, string>();
  constructor(readonly ip = freshIp()) {}

  cookieHeader() {
    return [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  async request(path: string, init: { method?: string; body?: unknown } = {}) {
    const headers = new Headers({ Origin: ORIGIN, "cf-connecting-ip": this.ip });
    if (init.body !== undefined) headers.set("Content-Type", "application/json");
    if (this.cookies.size) headers.set("Cookie", this.cookieHeader());
    const res = await exports.default.fetch(
      new Request(`${ORIGIN}${path}`, {
        method: init.method ?? (init.body !== undefined ? "POST" : "GET"),
        headers,
        body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      }),
    );
    for (const c of res.headers.getSetCookie()) {
      const [pair, ...attrs] = c.split(";");
      const i = pair!.indexOf("=");
      const name = pair!.slice(0, i).trim();
      const value = pair!.slice(i + 1).trim();
      const expired = attrs.some((a) => /max-age=0/i.test(a)) || value === "";
      if (expired) this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
    const text = await res.text();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test responses are checked field by field
    let json: any;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = text;
    }
    return { status: res.status, json, headers: res.headers };
  }

  signUp(email: string, name = "Sara", password = PASSWORD) {
    return this.request("/api/auth/sign-up/email", { body: { name, email, password } });
  }
  signIn(email: string, password = PASSWORD) {
    return this.request("/api/auth/sign-in/email", { body: { email, password } });
  }
  me() {
    return this.request("/api/me");
  }
}

/** Signs up a new person on a fresh client. */
export async function person(name = "Sara") {
  const c = new Client();
  const email = uniqueEmail(name.toLowerCase());
  const r = await c.signUp(email, name);
  if (r.status !== 200) throw new Error(`sign-up failed: ${r.status} ${JSON.stringify(r.json)}`);
  return { c, email, name };
}

/** Creates a space for a signed-in client. */
export async function createSpace(c: Client, name = "Our space") {
  const id = crypto.randomUUID();
  const r = await c.request("/api/spaces", {
    body: { id, name, currency: "EUR", timezone: "Europe/Brussels" },
  });
  return { id, r };
}

/** The reset token Better Auth stored for this email (identifier "reset-password:<token>"). */
export async function resetTokenFor(email: string): Promise<string> {
  const [u] = await db().select({ id: userTable.id }).from(userTable).where(eq(userTable.email, email));
  if (!u) throw new Error("no user");
  for (let i = 0; i < 20; i++) {
    const rows = await db()
      .select({ identifier: verification.identifier, value: verification.value })
      .from(verification)
      .where(like(verification.identifier, "reset-password:%"));
    const mine = rows.find((r) => r.value === u.id);
    if (mine) return mine.identifier.slice("reset-password:".length);
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("no reset token");
}

export async function sessionCount(email: string): Promise<number> {
  const [u] = await db().select({ id: userTable.id }).from(userTable).where(eq(userTable.email, email));
  if (!u) return 0;
  return (await db().select().from(sessionTable).where(eq(sessionTable.userId, u.id))).length;
}
