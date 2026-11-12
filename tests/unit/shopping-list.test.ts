import { describe, expect, it } from "vitest";
import {
  categoriesOf,
  computeLayout,
  findDuplicate,
  groupItems,
  guessCategory,
  guessUnit,
  insertIntoLayout,
  keyOf,
  reconcileLayout,
  removeFromLayout,
  sameLayout,
  spelling,
  structuralChanges,
  tidyMoves,
  totals,
  type ListItem,
} from "../../src/shared/shopping-list.ts";

let n = 0;
/** Items made 1 minute apart, in call order, unless `at` says otherwise. */
function mk(name: string, o: Partial<ListItem> = {}): ListItem {
  n++;
  const at = new Date(Date.UTC(2026, 10, 7, 18, n)).toISOString();
  return {
    id: o.id ?? `i${n}`,
    name,
    quantity: 1,
    category: null,
    unit: "piece",
    notes: "",
    boughtAt: null,
    boughtBy: null,
    createdBy: "a",
    createdAt: at,
    updatedAt: at,
    ...o,
  };
}
const ids = (xs: ListItem[]) => xs.map((x) => x.id);
const bought = (name: string, o: Partial<ListItem> = {}) =>
  mk(name, { boughtAt: "2026-11-09T09:00:00.000Z", boughtBy: "a", ...o });

describe("keys and spellings", () => {
  it("merges spellings of one category into one key", () => {
    expect(keyOf("Fruit & Veg")).toBe(keyOf("fruit &veg"));
    expect(keyOf("Frúit & veg")).toBe(keyOf("Fruit & Veg"));
    expect(keyOf(null)).toBe("");
    expect(keyOf("  ")).toBe("");
  });

  it("uses the latest spelling of a key", () => {
    const a = mk("Mint", { category: "fruit & veg", updatedAt: "2026-11-01T10:00:00.000Z" });
    const b = mk("Tomatoes", { category: "Fruit & Veg", updatedAt: "2026-11-02T10:00:00.000Z" });
    expect(spelling([a, b], "FRUIT&VEG")).toBe("Fruit & Veg");
    expect(spelling([a, b], " Dairy ")).toBe("Dairy");
    expect(spelling([a, b], "  ")).toBe("");
    expect(categoriesOf([a, b, mk("Milk", { category: "Dairy" })])).toEqual([
      { key: "dairy", name: "Dairy" },
      { key: "fruit&veg", name: "Fruit & Veg" },
    ]);
  });

  it("guesses the category from an earlier same-name item, bought ones included", () => {
    const milk = bought("Milk", { category: "Dairy" });
    expect(guessCategory([milk], "  milk ")).toBe("Dairy");
    expect(guessCategory([milk], "Yoghurt")).toBeNull();
    expect(guessCategory([milk], "")).toBeNull();
  });

  it("finds the unbought duplicate, not the bought one", () => {
    const old = bought("Milk");
    const open = mk("Milk");
    expect(findDuplicate([old, open], "milk")).toBe(open);
    expect(findDuplicate([old], "milk")).toBeNull();
  });
});

describe("groups", () => {
  it("groups by key, A to Z by display name, Other last, oldest first inside", () => {
    const tomatoes = mk("Tomatoes", { category: "Fruit & Veg" });
    const butter = mk("Butter", { category: "Dairy" });
    const batteries = mk("Batteries AA");
    const soap = mk("Dish soap", { category: "home" });
    const mint = mk("Mint", { category: "fruit &veg" });
    const g = groupItems([mint, soap, batteries, tomatoes, butter]);
    expect(g.groups.map((x) => x.name)).toEqual(["Dairy", "fruit &veg", "home", ""]);
    expect(g.groups.map((x) => x.key)).toEqual(["dairy", "fruit&veg", "home", ""]);
    expect(ids(g.groups[1]!.items)).toEqual([tomatoes.id, mint.id]);
    expect(g.groups[3]!.items).toEqual([batteries]);
  });

  it("names a group after its latest spelling", () => {
    const a = mk("Mint", { category: "fruit & veg", updatedAt: "2026-11-01T10:00:00.000Z" });
    const b = mk("Tomatoes", { category: "Fruit & Veg", updatedAt: "2026-11-05T10:00:00.000Z" });
    expect(groupItems([a, b]).groups[0]!.name).toBe("Fruit & Veg");
  });

  it("keeps bought items out of the groups, newest bought first", () => {
    const old = bought("Milk", { boughtAt: "2026-11-08T10:42:00.000Z" });
    const fresh = bought("Coffee", { boughtAt: "2026-11-09T09:15:00.000Z" });
    const open = mk("Butter");
    const g = groupItems([old, open, fresh]);
    expect(ids(g.done)).toEqual([fresh.id, old.id]);
    expect(g.groups.flatMap((x) => ids(x.items))).toEqual([open.id]);
  });

  it("puts equal-time items in id order", () => {
    const at = "2026-11-07T18:20:00.000Z";
    const b = mk("B", { id: "b", createdAt: at });
    const a = mk("A", { id: "a", createdAt: at });
    expect(ids(groupItems([b, a]).groups[0]!.items)).toEqual(["a", "b"]);
  });
});

describe("totals", () => {
  const list = [
    bought("Milk", { category: "Dairy" }),
    bought("Sponges", { category: "Home" }),
    mk("Butter", { category: "Dairy" }),
    mk("Tomatoes", { category: "Fruit & Veg", quantity: 6 }),
    mk("Mint", { category: "Fruit & Veg" }),
    mk("Batteries AA"),
  ];

  it("counts what is left and what is bought", () => {
    const t = totals(list);
    expect(t.any).toBe(true);
    expect(t.left).toBe(4);
    expect(t.boughtCount).toBe(2);
  });

  it("counts the items of each group, Other last", () => {
    expect(totals(list).groups.map((g) => [g.name, g.count])).toEqual([
      ["Dairy", 1],
      ["Fruit & Veg", 2],
      ["", 1],
    ]);
  });

  it("is empty for no items", () => {
    expect(totals([])).toMatchObject({ any: false, left: 0, boughtCount: 0, groups: [] });
  });
});

describe("unit guess", () => {
  it("takes the unit of the latest earlier item with the same name", () => {
    const a = mk("Milk", { unit: "l", updatedAt: "2026-11-01T10:00:00.000Z" });
    const b = bought("milk", { unit: "kg", updatedAt: "2026-11-05T10:00:00.000Z" });
    expect(guessUnit([a, b], "MILK")).toBe("kg");
    expect(guessUnit([a, b], "Eggs")).toBeNull();
  });
});

describe("the frozen layout", () => {
  const a = mk("Butter", { id: "butter", category: "Dairy" });
  const b = mk("Tomatoes", { id: "tomatoes", category: "Fruit & Veg" });
  const c = mk("Dish soap", { id: "soap", category: "Home" });
  const d = bought("Milk", { id: "milk", category: "Dairy" });
  const base = computeLayout([a, b, c, d]);

  it("is the from-scratch order", () => {
    expect(base).toEqual({
      groups: [
        { key: "dairy", ids: ["butter"] },
        { key: "fruit&veg", ids: ["tomatoes"] },
        { key: "home", ids: ["soap"] },
      ],
      done: ["milk"],
    });
  });

  it("leaves a ticked row in place and counts it for Tidy up", () => {
    const ticked = { ...b, boughtAt: "2026-11-09T10:00:00.000Z", boughtBy: "a" };
    const items = [a, ticked, c, d];
    expect(sameLayout(reconcileLayout(base, items), base)).toBe(true);
    expect(tidyMoves(base, new Map(items.map((x) => [x.id, x])))).toBe(1);
    // Tidy up rebuilds: the ticked row joins the bought group, the group is gone
    expect(computeLayout(items)).toEqual({
      groups: [
        { key: "dairy", ids: ["butter"] },
        { key: "home", ids: ["soap"] },
      ],
      done: ["tomatoes", "milk"],
    });
  });

  it("counts an un-ticked row still in the bought group as a move", () => {
    const back = { ...d, boughtAt: null, boughtBy: null };
    const items = [a, b, c, back];
    expect(sameLayout(reconcileLayout(base, items), base)).toBe(true);
    expect(tidyMoves(base, new Map(items.map((x) => [x.id, x])))).toBe(1);
  });

  it("drops deleted rows and empty groups, without moving the others", () => {
    const next = reconcileLayout(base, [a, c, d]);
    expect(next.groups.map((g) => g.key)).toEqual(["dairy", "home"]);
    expect(structuralChanges(base, next)).toEqual(["tomatoes"]);
    expect(removeFromLayout(base, "butter").groups.map((g) => g.key)).toEqual(["fruit&veg", "home"]);
  });

  it("inserts a new item oldest-last in its group, and a new group A to Z with Other last", () => {
    const more = mk("Cheese", { id: "cheese", category: "dairy" });
    const pasta = mk("Pasta", { id: "pasta", category: "Pantry" });
    const loose = mk("Batteries", { id: "batteries" });
    const next = reconcileLayout(base, [a, b, c, d, more, pasta, loose]);
    expect(next.groups.map((g) => [g.key, g.ids])).toEqual([
      ["dairy", ["butter", "cheese"]],
      ["fruit&veg", ["tomatoes"]],
      ["home", ["soap"]],
      ["pantry", ["pasta"]],
      ["", ["batteries"]],
    ]);
    expect(structuralChanges(base, next).sort()).toEqual(["batteries", "cheese", "pasta"]);
  });

  it("puts a new bought item into the bought group, newest first", () => {
    const e = bought("Coffee", { id: "coffee", boughtAt: "2026-11-10T09:00:00.000Z" });
    const next = reconcileLayout(base, [a, b, c, d, e]);
    expect(next.done).toEqual(["coffee", "milk"]);
  });

  it("moves a row whose category changed, and nothing else", () => {
    const moved = { ...b, category: "Home" };
    const next = reconcileLayout(base, [a, moved, c, d]);
    expect(next.groups.map((g) => [g.key, g.ids])).toEqual([
      ["dairy", ["butter"]],
      ["home", ["tomatoes", "soap"]],
    ]);
    expect(structuralChanges(base, next)).toEqual(["tomatoes"]);
  });

  it("inserts into an existing group by age", () => {
    const old = mk("Old", { id: "old", category: "Dairy", createdAt: "2026-01-01T00:00:00.000Z" });
    const next = insertIntoLayout(base, old, new Map([a, old].map((x) => [x.id, x])));
    expect(next.groups[0]!.ids).toEqual(["old", "butter"]);
  });

  it("reports no change for an edit that keeps the category", () => {
    const edited = { ...a, name: "Salted butter", updatedAt: "2026-11-10T10:00:00.000Z" };
    expect(structuralChanges(base, reconcileLayout(base, [edited, b, c, d]))).toEqual([]);
  });
});
