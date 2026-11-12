import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  computeLayout,
  reconcileLayout,
  sameLayout,
  structuralChanges,
  tidyMoves,
  type Layout,
} from "../../../shared/shopping-list.ts";
import type { ShoppingItem } from "../../lib/shopping.ts";
import { focusRow } from "./util.ts";

/**
 * The order rows keep while the list is on screen (.ux-forge/shopping list.js, ia S3): a layout of ids built on
 * arrival, after >= 30 s in the background, on Tidy up and when Clear bought opens. A tick changes a row in place; my
 * own adds, deletes and edits apply at once; what the partner added, removed or re-filed waits for a quiet moment
 * (S5): no pointer down on the page and none for 1 s after, capped at 5 s, and never while keyboard focus
 * (:focus-visible) is inside the list. A dialog being open counts as quiet. Totals are never held (they come from the
 * items). When the focused row is removed, focus moves to its nearest surviving neighbour.
 */
function focusInBody(): boolean {
  const b = document.getElementById("body");
  const a = document.activeElement;
  try {
    return !!(b && a && a !== b && b.contains(a) && a.matches(":focus-visible"));
  } catch {
    return false;
  }
}

export function useFrozenOrder(items: ShoppingItem[] | null) {
  const [layout, setLayout] = useState<Layout | null>(null);
  const layoutRef = useRef<Layout | null>(null);
  layoutRef.current = layout;
  const itemsRef = useRef(items);
  itemsRef.current = items;
  /** The last row seen for every id, so a row the partner removed stays drawn until the order is released. */
  const seen = useRef(new Map<string, ShoppingItem>());
  const mine = useRef(new Set<string>());
  const first = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const down = useRef(false);
  const lastUp = useRef(0);
  const hiddenAt = useRef(0);
  const pendingFocus = useRef<string | null>(null);
  const [fresh, setFresh] = useState<ReadonlySet<string>>(new Set());

  const quiet = useCallback(() => {
    if (document.querySelector("dialog[open]")) return true;
    if (focusInBody()) return false;
    if (down.current) return false;
    return Date.now() - lastUp.current > 1000;
  }, []);

  useEffect(() => {
    const main = document.getElementById("main");
    const onDown = () => {
      down.current = true;
    };
    const onUp = () => {
      if (down.current) {
        down.current = false;
        lastUp.current = Date.now();
      }
    };
    main?.addEventListener("pointerdown", onDown, true);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      main?.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      clearTimeout(timer.current);
    };
  }, []);

  /** Put `next` on screen. Keeps keyboard focus on a row that moves, or hands it to a neighbour when it goes. */
  const commit = useCallback((prev: Layout, next: Layout) => {
    const changed = structuralChanges(prev, next);
    const had = new Set([...prev.groups.flatMap((g) => g.ids), ...prev.done]);
    const added = changed.filter((id) => !had.has(id));
    const a = document.activeElement;
    const li = a && a !== document.body ? a.closest<HTMLElement>("li.row") : null;
    const id = li?.dataset.id;
    if (id && changed.includes(id)) {
      const alive = new Set([...next.groups.flatMap((g) => g.ids), ...next.done]);
      if (alive.has(id)) pendingFocus.current = id;
      else {
        const order = [...document.querySelectorAll<HTMLElement>("#main li.row[data-id]")].map((r) => r.dataset.id!);
        const at = order.indexOf(id);
        let pick: string | null = null;
        for (let d = 1; d < order.length && !pick; d++)
          for (const c of [order[at + d], order[at - d]])
            if (!pick && c && alive.has(c) && !changed.includes(c)) pick = c;
        pendingFocus.current = pick ?? "";
      }
    }
    mine.current.clear();
    first.current = 0;
    clearTimeout(timer.current);
    layoutRef.current = next;
    setLayout(next);
    if (added.length) {
      setFresh((f) => new Set([...f, ...added]));
      setTimeout(() => setFresh((f) => new Set([...f].filter((x) => !added.includes(x)))), 2100);
    }
  }, []);
  useLayoutEffect(() => {
    const id = pendingFocus.current;
    if (id === null) return;
    pendingFocus.current = null;
    focusRow(id || null);
  }, [layout]);

  const flush = useRef<() => void>(() => {});
  const tryFlush = useCallback(() => {
    timer.current = undefined;
    const L = layoutRef.current;
    const I = itemsRef.current;
    if (!L || !I) return;
    const next = reconcileLayout(L, I);
    if (sameLayout(next, L)) {
      first.current = 0;
      return;
    }
    if (quiet() || (Date.now() - first.current >= 5000 && !focusInBody())) commit(L, next);
    else timer.current = setTimeout(() => flush.current(), 200);
  }, [commit, quiet]);
  flush.current = tryFlush;

  // The items changed: ticks and edits show in place; adds, removals and moves go through the quiet moment.
  useLayoutEffect(() => {
    if (!items) return;
    for (const i of items) seen.current.set(i.id, i);
    const L = layoutRef.current;
    if (!L) {
      const l = computeLayout(items);
      layoutRef.current = l;
      setLayout(l);
      return;
    }
    const next = reconcileLayout(L, items);
    if (sameLayout(next, L)) return;
    const changed = structuralChanges(L, next);
    if (changed.every((id) => mine.current.has(id)) || quiet()) {
      commit(L, next);
      return;
    }
    if (!first.current) first.current = Date.now();
    if (!timer.current) timer.current = setTimeout(() => flush.current(), 200);
  }, [items, commit, quiet]);
  // Forget rows that are no longer on screen
  useEffect(() => {
    if (!layout) return;
    const on = new Set([...layout.groups.flatMap((g) => g.ids), ...layout.done]);
    for (const k of [...seen.current.keys()])
      if (!on.has(k) && !itemsRef.current?.some((i) => i.id === k)) seen.current.delete(k);
  }, [layout]);

  // Back in the foreground after >= 30 s: the order is rebuilt (ia S3)
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt.current = Date.now();
        return;
      }
      const I = itemsRef.current;
      if (I && hiddenAt.current && Date.now() - hiddenAt.current >= 30_000 && layoutRef.current)
        commit(layoutRef.current, computeLayout(I));
      hiddenAt.current = 0;
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [commit]);

  const byId = useCallback((id: string): ShoppingItem | undefined => {
    return itemsRef.current?.find((i) => i.id === id) ?? seen.current.get(id);
  }, []);

  return {
    layout,
    fresh,
    byId,
    /** The ids of rows I just added, deleted or edited: they apply at once. */
    markMine: (ids: string[]) => ids.forEach((id) => mine.current.add(id)),
    /** Tidy up: the order is rebuilt from scratch. */
    tidy: () => {
      const I = itemsRef.current;
      if (I && layoutRef.current) commit(layoutRef.current, computeLayout(I));
    },
    moves: (map: ReadonlyMap<string, ShoppingItem>) => (layout ? tidyMoves(layout, map) : 0),
  };
}
