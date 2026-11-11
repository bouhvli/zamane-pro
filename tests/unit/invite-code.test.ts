import { describe, expect, it } from "vitest";
import {
  formatInviteCode,
  generateInviteCode,
  INVITE_ALPHABET,
  parseInviteCode,
} from "../../src/shared/invite-code.ts";

describe("generateInviteCode", () => {
  it("draws 8 characters from the alphabet without 0, O, 1, I or L", () => {
    expect(INVITE_ALPHABET).toHaveLength(31);
    for (const ch of "0O1IL") expect(INVITE_ALPHABET).not.toContain(ch);
    for (let i = 0; i < 500; i++) {
      const c = generateInviteCode();
      expect(c).toMatch(/^[2-9A-HJKMNP-Z]{8}$/);
    }
  });
  it("rejects biased bytes (rejection sampling)", () => {
    // 248..255 must be skipped: with only those bytes first, the next usable byte decides.
    let call = 0;
    const code = generateInviteCode((buf) => {
      buf.fill(call++ === 0 ? 255 : 0);
    });
    expect(code).toBe("22222222");
  });
  it("is roughly uniform", () => {
    const counts = new Map<string, number>();
    for (let i = 0; i < 4000; i++) for (const ch of generateInviteCode()) counts.set(ch, (counts.get(ch) ?? 0) + 1);
    const expected = (4000 * 8) / 31;
    for (const ch of INVITE_ALPHABET) expect(Math.abs((counts.get(ch) ?? 0) - expected) / expected).toBeLessThan(0.2);
  });
});

describe("parseInviteCode (the prototype's A.normCode)", () => {
  it("normalises case, spaces and dashes", () => {
    for (const raw of ["K7QM-4XPA", "k7qm4xpa", " k7qm 4xpa ", "K7QM–4XPA".replace("–", "-"), "k7qm-4xpa"]) {
      expect(parseInviteCode(raw)).toEqual({ code: "K7QM4XPA", display: "K7QM-4XPA", ok: true, reason: "" });
    }
  });
  it("picks the last code from a pasted message", () => {
    const msg = "Join me on Zamane. Use this code: K7QM-4XPA";
    expect(parseInviteCode(msg).code).toBe("K7QM4XPA");
    expect(parseInviteCode("Old: H3RT-9WCN\nNew: K7QM-4XPA").code).toBe("K7QM4XPA");
  });
  it("explains why a code is malformed", () => {
    expect(parseInviteCode("").reason).toBe("empty");
    expect(parseInviteCode("K7QM-4XP").reason).toBe("length");
    expect(parseInviteCode("K7QM-4XP0").reason).toBe("letters");
    expect(parseInviteCode("K7QM-4XPO").reason).toBe("letters");
  });
  it("formats", () => {
    expect(formatInviteCode("K7QM4XPA")).toBe("K7QM-4XPA");
  });
});
