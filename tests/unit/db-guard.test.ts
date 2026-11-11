import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { assertSafeBranch, endpointId } from "../../scripts/db-guard.ts";

const URL_DEV = "postgresql://u:p@ep-quiet-frog-a1b2c3.eu-central-1.aws.neon.tech/neondb?sslmode=require";

function neonApi(branch: { name: string; default?: boolean; protected?: boolean }) {
  return vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes("/endpoints/ep-quiet-frog-a1b2c3")) return Response.json({ endpoint: { branch_id: "br-1" } });
    if (url.includes("/branches/br-1"))
      return Response.json({ branch: { default: false, protected: false, ...branch } });
    return new Response("not found", { status: 404 });
  });
}

describe("db guard", () => {
  const saved = { ...process.env };
  beforeEach(() => {
    process.env.APP_ENV = "development";
    process.env.DATABASE_URL = URL_DEV;
    process.env.NEON_API_KEY = "test-key";
    process.env.NEON_PROJECT_ID = "proj-test";
  });
  afterEach(() => {
    process.env = { ...saved };
    vi.unstubAllGlobals();
  });

  it("reads the endpoint id from the host, pooled or not", () => {
    expect(endpointId(URL_DEV)).toBe("ep-quiet-frog-a1b2c3");
    expect(endpointId(URL_DEV.replace("a1b2c3.", "a1b2c3-pooler."))).toBe("ep-quiet-frog-a1b2c3");
  });

  it("allows a dev branch", async () => {
    vi.stubGlobal("fetch", neonApi({ name: "dev" }));
    await expect(assertSafeBranch()).resolves.toBe("dev");
  });

  it.each([
    [{ name: "main" }, /"main" branch/],
    [{ name: "production", default: true }, /default branch/],
    [{ name: "staging", protected: true }, /protected branch/],
  ])("refuses %o", async (branch, message) => {
    vi.stubGlobal("fetch", neonApi(branch));
    await expect(assertSafeBranch()).rejects.toThrow(message);
  });

  it("refuses outside development", async () => {
    process.env.APP_ENV = "production";
    vi.stubGlobal("fetch", neonApi({ name: "dev" }));
    await expect(assertSafeBranch()).rejects.toThrow(/APP_ENV/);
  });

  it("refuses when it can't look the branch up, and says so", async () => {
    process.env.NEON_API_KEY = "";
    await expect(assertSafeBranch()).rejects.toThrow(/NEON_API_KEY/);
  });

  it("never puts the URL or the key in its messages", async () => {
    vi.stubGlobal("fetch", neonApi({ name: "main" }));
    const err = await assertSafeBranch().catch((e: Error) => e.message);
    expect(err).not.toContain("neon.tech");
    expect(err).not.toContain("test-key");
  });
});
