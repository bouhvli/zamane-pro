import { categoryKey } from "./category.ts";
import type { ShopUnit } from "./schemas/shopping.ts";

/**
 * Everything the shopping list shows that is worked out on the device (§4.3, D62; .ux-forge/shopping shared.js
 * Shop.groups / Shop.totals and list.js layout): the groups, the totals, and the frozen order of rows. Pure: no
 * clock, no network, no DOM. Amounts are integer minor units, so the sums are exact.
 */
export interface ListItem {
  id: string;
  name: string;
  quantity: number;
  /** As typed (one spelling per key); null = Other. */
  category: string | null;
  unit: ShopUnit;
  notes: string;
  boughtAt: string | null;
  boughtBy: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

const collator = new Intl.Collator("en", { sensitivity: "base" });
const ms = (iso: string | null) => (iso ? Date.parse(iso) : 0);

/** The category key; "" is Other (shared.js Shop.key). */
export const keyOf = (category: string | null | undefined): string => categoryKey(category) ?? "";

/** Newest edit first, then newest created (shared.js `newest`). */
function newest(a: ListItem, b: ListItem): number {
  return ms(b.updatedAt) - ms(a.updatedAt) || ms(b.createdAt) - ms(a.createdAt);
}
/** Oldest first inside a group (shared.js `oldest`). */
function oldest(a: ListItem, b: ListItem): number {
  return ms(a.createdAt) - ms(b.createdAt) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}
/** The bought group: newest bought first. */
function boughtNewest(a: ListItem, b: ListItem): number {
  return ms(b.boughtAt) - ms(a.boughtAt) || (b.id < a.id ? -1 : 1);
}

/** The group's display name: the latest spelling among its items; "" when none has a category (shown as Other). */
export function groupNameOf(items: readonly ListItem[]): string {
  const named = items.filter((i) => i.category).sort(newest)[0];
  return named?.category ?? "";
}

/** The spelling the list already uses for this text's key, else the trimmed text; "" for nothing (Shop.spelling). */
export function spelling(items: readonly ListItem[], text: string | null | undefined): string {
  const t = (text ?? "").trim();
  const k = keyOf(t);
  if (!k) return "";
  const same = items.filter((i) => i.category && keyOf(i.category) === k).sort(newest);
  return same[0]?.category ?? t;
}

/** The distinct categories, the latest spelling of each key, A to Z: the combobox suggestions (Shop.categories). */
export function categoriesOf(items: readonly ListItem[]): { key: string; name: string }[] {
  const seen = new Set<string>();
  const out: { key: string; name: string }[] = [];
  for (const i of items.filter((x) => x.category).sort(newest)) {
    const k = keyOf(i.category);
    if (k && !seen.has(k)) {
      seen.add(k);
      out.push({ key: k, name: i.category! });
    }
  }
  return out.sort((a, b) => collator.compare(a.name, b.name));
}

/** The category of the latest earlier item with the same name key, bought ones included (Shop.guess). */
export function guessCategory(items: readonly ListItem[], name: string): string | null {
  const k = keyOf(name);
  if (!k) return null;
  const m = items.filter((i) => i.category && keyOf(i.name) === k).sort(newest);
  return m[0]?.category ?? null;
}

/** The unit of the latest earlier item with the same name key, bought ones included. */
export function guessUnit(items: readonly ListItem[], name: string): ShopUnit | null {
  const k = keyOf(name);
  if (!k) return null;
  return items.filter((i) => keyOf(i.name) === k).sort(newest)[0]?.unit ?? null;
}

/** The unbought item with the same name key, the oldest (Shop.duplicate): the "already on the list" hint. */
export function findDuplicate<T extends ListItem>(items: readonly T[], name: string): T | null {
  const k = keyOf(name);
  if (!k) return null;
  return (
    items.filter((i) => !i.boughtAt && keyOf(i.name) === k).sort((a, b) => ms(a.createdAt) - ms(b.createdAt))[0] ?? null
  );
}

export interface Group<T extends ListItem = ListItem> {
  /** "" = Other. */
  key: string;
  name: string;
  items: T[];
}

/**
 * The order built from scratch (Shop.groups): unbought items by category key, groups A to Z by display name with
 * Other last, oldest first inside a group; the bought items separate, newest bought first.
 */
export function groupItems<T extends ListItem>(items: readonly T[]): { groups: Group<T>[]; done: T[] } {
  const by = new Map<string, Group<T>>();
  const done: T[] = [];
  for (const i of items) {
    if (i.boughtAt) {
      done.push(i);
      continue;
    }
    const k = keyOf(i.category);
    let g = by.get(k);
    if (!g) by.set(k, (g = { key: k, name: "", items: [] }));
    g.items.push(i);
  }
  const groups = [...by.values()];
  for (const g of groups) {
    g.items.sort(oldest);
    g.name = groupNameOf(g.items);
  }
  groups.sort((a, b) => (!a.key ? 1 : !b.key ? -1 : collator.compare(a.name, b.name)));
  done.sort(boughtNewest);
  return { groups, done };
}

export interface GroupTotal {
  key: string;
  name: string;
  count: number;
}
export interface Totals {
  any: boolean;
  /** Not bought yet. */
  left: number;
  boughtCount: number;
  groups: GroupTotal[];
}

/** From item state, never from row positions: a ticked row leaves the left-to-buy count at once (Shop.totals). */
export function totals(items: readonly ListItem[]): Totals {
  const g = groupItems(items);
  const groups = g.groups.map((gr) => ({ key: gr.key, name: gr.name, count: gr.items.length }));
  return {
    any: items.length > 0,
    left: groups.reduce((n, x) => n + x.count, 0),
    boughtCount: g.done.length,
    groups,
  };
}

// ---------- the frozen order (ia S3): a layout of ids ----------

export interface Layout {
  groups: { key: string; ids: string[] }[];
  done: string[];
}

export function computeLayout(items: readonly ListItem[]): Layout {
  const g = groupItems(items);
  return {
    groups: g.groups.map((x) => ({ key: x.key, ids: x.items.map((i) => i.id) })),
    done: g.done.map((i) => i.id),
  };
}

export const cloneLayout = (l: Layout): Layout => ({
  groups: l.groups.map((g) => ({ key: g.key, ids: [...g.ids] })),
  done: [...l.done],
});

/** A group's display name, read from the items now in it (list.js groupName). */
export function layoutGroupName(ids: readonly string[], byId: ReadonlyMap<string, ListItem>): string {
  return groupNameOf(ids.map((id) => byId.get(id)).filter((i): i is ListItem => !!i));
}

export function removeFromLayout(layout: Layout, id: string): Layout {
  return {
    groups: layout.groups.map((g) => ({ key: g.key, ids: g.ids.filter((x) => x !== id) })).filter((g) => g.ids.length),
    done: layout.done.filter((x) => x !== id),
  };
}

function insertSorted(
  ids: string[],
  it: ListItem,
  byId: ReadonlyMap<string, ListItem>,
  before: (a: ListItem, b: ListItem) => boolean,
) {
  let at = ids.length;
  for (let i = 0; i < ids.length; i++) {
    const o = byId.get(ids[i]!);
    if (o && before(it, o)) {
      at = i;
      break;
    }
  }
  ids.splice(at, 0, it.id);
}

/**
 * One item put where the from-scratch order would put it, leaving every other row where it is (list.js
 * insertLayout): a bought item into the bought group, an unbought one into its category's group (a new group goes
 * A to Z, Other last), oldest first inside.
 */
export function insertIntoLayout(layout: Layout, it: ListItem, byId: ReadonlyMap<string, ListItem>): Layout {
  const next = removeFromLayout(layout, it.id);
  if (it.boughtAt) {
    insertSorted(next.done, it, byId, (a, b) => ms(a.boughtAt) > ms(b.boughtAt));
    return next;
  }
  const k = keyOf(it.category);
  let gr = next.groups.find((g) => g.key === k);
  if (!gr) {
    gr = { key: k, ids: [] };
    let at = next.groups.length;
    if (k) {
      for (let i = 0; i < next.groups.length; i++) {
        const o = next.groups[i]!;
        if (!o.key || collator.compare(it.category ?? "", layoutGroupName(o.ids, byId)) < 0) {
          at = i;
          break;
        }
      }
    }
    next.groups.splice(at, 0, gr);
  }
  insertSorted(
    gr.ids,
    it,
    byId,
    (a, b) => ms(a.createdAt) < ms(b.createdAt) || (a.createdAt === b.createdAt && a.id < b.id),
  );
  return next;
}

/**
 * The layout brought up to date with the items without moving anything that is on screen: rows whose item is gone
 * are dropped, new items are inserted at their place, and an item whose category key changed moves to its new
 * group. A tick or an un-tick changes nothing here: the row stays until Tidy up (list.js handleChange).
 */
export function reconcileLayout<T extends ListItem>(layout: Layout, items: readonly T[]): Layout {
  const byId = new Map(items.map((i) => [i.id, i]));
  let next: Layout = {
    groups: layout.groups
      .map((g) => ({ key: g.key, ids: g.ids.filter((id) => byId.has(id)) }))
      .filter((g) => g.ids.length),
    done: layout.done.filter((id) => byId.has(id)),
  };
  for (const g of [...next.groups]) {
    for (const id of g.ids) {
      const it = byId.get(id)!;
      if (keyOf(it.category) !== g.key) next = insertIntoLayout(next, it, byId);
    }
  }
  const known = new Set([...next.groups.flatMap((g) => g.ids), ...next.done]);
  // Oldest first, so a burst of new items lands in the order they were made
  for (const it of [...items].sort(oldest)) if (!known.has(it.id)) next = insertIntoLayout(next, it, byId);
  return next;
}

export function sameLayout(a: Layout, b: Layout): boolean {
  return (
    a.done.length === b.done.length &&
    a.done.every((id, i) => id === b.done[i]) &&
    a.groups.length === b.groups.length &&
    a.groups.every(
      (g, i) =>
        g.key === b.groups[i]!.key &&
        g.ids.length === b.groups[i]!.ids.length &&
        g.ids.every((id, j) => id === b.groups[i]!.ids[j]),
    )
  );
}

/** Ids that were added, removed or moved to another group between two layouts: what a quiet moment waits for. */
export function structuralChanges(prev: Layout, next: Layout): string[] {
  const place = (l: Layout) => {
    const m = new Map<string, string>();
    for (const g of l.groups) for (const id of g.ids) m.set(id, `g:${g.key}`);
    for (const id of l.done) m.set(id, "done");
    return m;
  };
  const a = place(prev);
  const b = place(next);
  const out: string[] = [];
  for (const [id, p] of b) if (a.get(id) !== p) out.push(id);
  for (const id of a.keys()) if (!b.has(id)) out.push(id);
  return out;
}

/** How many rows Tidy up would move: ticked rows still in a group, un-ticked rows still in the bought group. */
export function tidyMoves(layout: Layout, byId: ReadonlyMap<string, ListItem>): number {
  let n = 0;
  for (const g of layout.groups) for (const id of g.ids) if (byId.get(id)?.boughtAt) n++;
  for (const id of layout.done) {
    const it = byId.get(id);
    if (it && !it.boughtAt) n++;
  }
  return n;
}
