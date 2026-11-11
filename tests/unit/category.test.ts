import { describe, expect, it } from "vitest";
import { categoryKey } from "../../src/shared/category.ts";

describe("categoryKey", () => {
  it("groups spellings of the same category", () => {
    const key = categoryKey("Fruit & Veg");
    expect(key).toBe("fruit&veg");
    expect(categoryKey("fruit &veg")).toBe(key);
    expect(categoryKey("Frúit & veg")).toBe(key);
    expect(categoryKey("  FRUIT\t&\nVEG ")).toBe(key);
  });
  it("strips diacritics after NFKD", () => {
    expect(categoryKey("Épicerie")).toBe("epicerie");
    expect(categoryKey("ﬁsh")).toBe("fish"); // the ﬁ ligature decomposes
  });
  it("has no key for empty or missing categories", () => {
    expect(categoryKey("")).toBeNull();
    expect(categoryKey("   ")).toBeNull();
    expect(categoryKey(null)).toBeNull();
    expect(categoryKey(undefined)).toBeNull();
  });
  it("keeps non-Latin scripts", () => {
    expect(categoryKey("خضر وفواكه")).toBe("خضروفواكه");
  });
});
