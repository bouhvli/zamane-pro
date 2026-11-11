import { describe, expect, it } from "vitest";
import { formatMoney, minorUnits, parseMoney, toSafeMinor } from "../../src/shared/money.ts";

describe("minor units (ISO 4217 table, not Intl)", () => {
  it("defaults to 2 and knows the 0 and 3 decimal currencies", () => {
    expect(minorUnits("EUR")).toBe(2);
    expect(minorUnits("MAD")).toBe(2);
    expect(minorUnits("JPY")).toBe(0);
    expect(minorUnits("XOF")).toBe(0);
    expect(minorUnits("KWD")).toBe(3);
    expect(minorUnits("TND")).toBe(3);
    expect(minorUnits("eur")).toBe(2);
  });
});

describe("parseMoney", () => {
  it.each([
    ["12,50", "EUR", 1250],
    ["12.50", "EUR", 1250],
    ["12", "EUR", 1200],
    ["12.5", "EUR", 1250],
    [",5", "EUR", 50],
    ["1 234,56", "EUR", 123456],
    ["1 234,56", "EUR", 123456],
    ["1.234,56", "EUR", 123456],
    ["1,234.56", "USD", 123456],
    ["1,234", "EUR", 123400],
    ["12.345", "EUR", 1234500],
    ["1.234.567", "EUR", 123456700],
    ["1'000", "CHF", 100000],
    ["500", "JPY", 500],
    ["1.234", "KWD", 1234],
    ["0", "MAD", 0],
  ])("%s %s → %i", (input, cur, expected) => {
    expect(parseMoney(input, cur)).toBe(expected);
  });

  it.each([
    ["", "EUR"],
    ["abc", "EUR"],
    ["-5", "EUR"],
    ["12.3456", "EUR"],
    ["12,5,0", "EUR"],
    ["1.2.3", "EUR"],
    ["5.5", "JPY"],
    ["99999999999999999", "EUR"],
  ])("rejects %s %s", (input, cur) => {
    expect(parseMoney(input, cur)).toBeNull();
  });

  it("never uses floats: 0.1 + 0.2 style amounts stay exact", () => {
    expect(parseMoney("0.10", "EUR")! + parseMoney("0.20", "EUR")!).toBe(30);
  });
});

describe("formatMoney", () => {
  it("uses the table's digits", () => {
    expect(formatMoney(1250, "EUR", "en")).toBe("€12.50");
    expect(formatMoney(500, "JPY", "en")).toBe("¥500");
    expect(formatMoney(1234, "KWD", "en")).toMatch(/1\.234/);
  });
  it("refuses unsafe integers", () => {
    expect(() => formatMoney(Number.MAX_SAFE_INTEGER + 2, "EUR")).toThrow(RangeError);
  });
});

describe("toSafeMinor", () => {
  it("reads bigint strings from Postgres", () => {
    expect(toSafeMinor("123456")).toBe(123456);
    expect(toSafeMinor(42n)).toBe(42);
    expect(() => toSafeMinor("9007199254740993")).toThrow(RangeError);
  });
});
