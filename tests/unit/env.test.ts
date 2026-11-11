import { describe, expect, it, vi } from "vitest";
import { getConfig, senderFor } from "../../src/worker/env.ts";

const base = {
  APP_ENV: "development",
  DATABASE_URL: "postgresql://u:p@ep-cool-name-123.eu-central-1.aws.neon.tech/db?sslmode=require",
  BETTER_AUTH_SECRET: "x".repeat(44),
  APP_URL: "http://localhost:3000",
};

describe("env validation", () => {
  it("accepts a local config with uploads off", () => {
    const c = getConfig({ ...base });
    expect(c.uploadsEnabled).toBe(false);
    expect(c.authUrl).toBe("http://localhost:3000");
  });

  it("names missing keys, never values", () => {
    const secret = "super-secret-value-that-must-not-leak";
    expect(() => getConfig({ ...base, BETTER_AUTH_SECRET: secret.slice(0, 10), DATABASE_URL: "" })).toThrowError(
      /BETTER_AUTH_SECRET.*|DATABASE_URL/,
    );
    try {
      getConfig({ ...base, BETTER_AUTH_SECRET: "short" });
    } catch (e) {
      expect(String(e)).not.toContain("short");
    }
  });

  it("treats Cloudinary keys as all-or-nothing", () => {
    expect(() => getConfig({ ...base, CLOUDINARY_CLOUD_NAME: "demo" })).toThrowError(/CLOUDINARY_API_KEY/);
    const all = getConfig({
      ...base,
      CLOUDINARY_CLOUD_NAME: "demo",
      CLOUDINARY_API_KEY: "k",
      CLOUDINARY_API_SECRET: "s",
    });
    expect(all.uploadsEnabled).toBe(true);
  });

  it("requires Resend outside development", () => {
    expect(() => getConfig({ ...base, APP_ENV: "production" })).toThrowError(/RESEND_API_KEY/);
    expect(getConfig({ ...base, RESEND_API_KEY: "re_x" }).RESEND_API_KEY).toBe("re_x");
  });

  it("warns about a -pooler host (D32)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    getConfig({ ...base, DATABASE_URL: base.DATABASE_URL.replace("ep-cool-name-123", "ep-cool-name-123-pooler") });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("-pooler"));
    expect(warn.mock.calls.flat().join(" ")).not.toContain("neon.tech");
    warn.mockRestore();
  });

  it("uses the app's origin for auth and picks the sender (D45)", () => {
    const dev = getConfig({ ...base });
    expect(dev.authUrl).toBe("http://localhost:3000");
    expect(dev.emailFrom).toBe("Zamane <onboarding@resend.dev>");
    expect(senderFor("production", "https://www.zamane.app")).toBe("Zamane <no-reply@zamane.app>");
    expect(senderFor("preview", "https://pr-4.zamane.app")).toBe("Zamane <no-reply@pr-4.zamane.app>");
  });
});
