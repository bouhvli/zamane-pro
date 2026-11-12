import { queryOptions, useMutation, useQuery, type QueryClient } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { useMemo, useSyncExternalStore } from "react";
import {
  type ShopUnit,
  type ShoppingItemView,
  type ShoppingResponse,
  type UpdateItemInput,
} from "../../shared/schemas/shopping.ts";
import { guessCategory, guessUnit, spelling } from "../../shared/shopping-list.ts";
import { api } from "./api.ts";
import { unknownName, unknownSlot, type AvatarSlot } from "./people.ts";

/**
 * The shopping list (§5, .ux-forge/shopping): one query with every row and the two members (D62).
 * Grouping, totals and the frozen order are the device's (`src/shared/shopping-list.ts`). Two writes work offline and
 * replay in order (§9): an add and a tick. They patch the cache at once and mark the row `pending` until the server
 * answers; an add that never reached the server is `unsynced` too. Everything else needs a connection and says so.
 * Phase 5 (realtime) will call `invalidateShopping` from the socket; nothing else here changes.
 */
export const shoppingKey = ["shopping"] as const;

/** A row as the client holds it: the server's, plus marks while a write waits (or failed). */
export type ShoppingItem = ShoppingItemView & {
  /** An add or a tick is queued: "Waiting to sync". */
  pending?: boolean;
  /** The add itself is queued: the row isn't on the server yet. */
  unsynced?: boolean;
  /** The server refused the queued add: "Couldn't sync". */
  failed?: boolean;
};
export type ShoppingData = Omit<ShoppingResponse, "items"> & { items: ShoppingItem[] };

export const shoppingQuery = queryOptions({
  queryKey: shoppingKey,
  queryFn: () => api<ShoppingResponse>("/api/shopping") as Promise<ShoppingData>,
  staleTime: 15_000,
});

// ---------- the offline-capable writes (§9): ['shopping','add'] and ['shopping','setBought'] ----------

export const addItemKey = ["shopping", "add"] as const;
export const setBoughtKey = ["shopping", "setBought"] as const;
/** One queue for both: they run one at a time, in order, even across a reload. */
const scope = { id: "shoppingWrites" };

/** JSON-only, so a paused mutation survives a reload in IndexedDB. */
export interface AddItemVars {
  id: string;
  name: string;
  quantity: number;
  /** The spelling to store (null = Other); the server keeps one spelling per key. */
  category: string | null;
  unit: ShopUnit;
  notes: string;
  actorId: string;
  at: string;
}
export interface SetBoughtVars {
  id: string;
  bought: boolean;
  actorId: string;
  at: string;
}

type Ctx = { before?: ShoppingData };

export function patchShopping(qc: QueryClient, fn: (d: ShoppingData) => ShoppingData): ShoppingData | undefined {
  const before = qc.getQueryData<ShoppingData>(shoppingKey);
  if (before) qc.setQueryData<ShoppingData>(shoppingKey, fn(before));
  return before;
}
const restore = (qc: QueryClient, ctx: Ctx | undefined) => {
  if (ctx?.before) qc.setQueryData(shoppingKey, ctx.before);
};

/** After any write: the list and Home's "n left to buy" are fetched again. */
export function invalidateShopping(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: shoppingKey });
  void qc.invalidateQueries({ queryKey: ["home"] });
}

export function itemFromVars(v: AddItemVars, marks: { pending: boolean }): ShoppingItem {
  return {
    id: v.id,
    name: v.name,
    quantity: v.quantity,
    category: v.category,
    unit: v.unit,
    notes: v.notes,
    boughtAt: null,
    boughtBy: null,
    createdBy: v.actorId,
    createdAt: v.at,
    updatedAt: v.at,
    ...(marks.pending ? { pending: true, unsynced: true } : {}),
  };
}

/** A tick sets state, it doesn't toggle; ticking what the partner already bought keeps the first buyer (A1). */
export function applyBought(d: ShoppingData, v: SetBoughtVars, pending: boolean): ShoppingData {
  return {
    ...d,
    items: d.items.map((i) =>
      i.id === v.id
        ? {
            ...i,
            boughtAt: v.bought ? (i.boughtAt ?? v.at) : null,
            boughtBy: v.bought ? (i.boughtBy ?? v.actorId) : null,
            ...(pending ? { pending: true } : {}),
          }
        : i,
    ),
  };
}

// Adds the server refused: kept on this device so the row can say "Couldn't sync" and offer Try again / Remove.
let failedList: AddItemVars[] = [];
const failedSubs = new Set<() => void>();
const setFailed = (next: AddItemVars[]) => {
  failedList = next;
  failedSubs.forEach((f) => f());
};
export const failedAdds = {
  mark: (v: AddItemVars) => setFailed([...failedList.filter((x) => x.id !== v.id), v]),
  clear: (id: string) => setFailed(failedList.filter((x) => x.id !== id)),
  clearAll: () => setFailed([]),
  get: (id: string) => failedList.find((x) => x.id === id),
};
const useFailedAdds = () =>
  useSyncExternalStore(
    (f) => {
      failedSubs.add(f);
      return () => failedSubs.delete(f);
    },
    () => failedList,
    () => failedList,
  );

/**
 * Registered before the persisted cache is restored (main.tsx), so a paused mutation rehydrated from IndexedDB finds
 * its mutationFn and replays in order once the phone is back online.
 */
export function registerShoppingMutations(qc: QueryClient) {
  qc.setMutationDefaults(addItemKey, {
    scope,
    mutationFn: (v: AddItemVars) =>
      api<{ item: ShoppingItemView }>("/api/shopping", {
        body: {
          id: v.id,
          name: v.name,
          quantity: v.quantity,
          category: v.category,
          unit: v.unit,
          notes: v.notes,
        },
      }),
    onMutate: async (v: AddItemVars): Promise<Ctx> => {
      failedAdds.clear(v.id);
      await qc.cancelQueries({ queryKey: shoppingKey });
      return {
        before: patchShopping(qc, (d) =>
          d.items.some((i) => i.id === v.id)
            ? d
            : { ...d, items: [itemFromVars(v, { pending: !navigator.onLine }), ...d.items] },
        ),
      };
    },
    onError: (_e: unknown, v: AddItemVars, ctx: Ctx | undefined) => {
      restore(qc, ctx);
      failedAdds.mark(v);
    },
    onSettled: () => invalidateShopping(qc),
  });
  qc.setMutationDefaults(setBoughtKey, {
    scope,
    mutationFn: (v: SetBoughtVars) =>
      api(`/api/shopping/${v.id}/bought`, { method: "PUT", body: { bought: v.bought } }),
    onMutate: async (v: SetBoughtVars): Promise<Ctx> => {
      await qc.cancelQueries({ queryKey: shoppingKey });
      return { before: patchShopping(qc, (d) => applyBought(d, v, !navigator.onLine)) };
    },
    onError: (_e: unknown, _v: SetBoughtVars, ctx: Ctx | undefined) => restore(qc, ctx),
    onSettled: () => invalidateShopping(qc),
  });
}

/** What the add row and the form hand over; `category: undefined` means "the same as an earlier item of that name". */
export interface NewItem {
  name: string;
  quantity?: number;
  category?: string | null;
  unit?: ShopUnit;
  notes?: string;
}

/**
 * The two offline-capable writes as functions. `addItem` returns the row as it now shows (for its toast); `mutate`
 * queues when offline and resolves when the server has answered, the cache is patched at once either way.
 */
export function useShoppingWrites() {
  const { me } = useRouteContext({ from: "/_app" });
  const add = useMutation<unknown, Error, AddItemVars>({ mutationKey: addItemKey });
  const bought = useMutation<unknown, Error, SetBoughtVars>({ mutationKey: setBoughtKey });
  const actorId = me.user.id;
  return useMemo(
    () => ({
      addItem(f: NewItem, items: readonly ShoppingItem[]): ShoppingItem {
        const category = f.category === undefined ? guessCategory(items, f.name) : spelling(items, f.category) || null;
        const v: AddItemVars = {
          id: crypto.randomUUID(),
          name: f.name.trim(),
          quantity: f.quantity ?? 1,
          category,
          unit: f.unit ?? guessUnit(items, f.name) ?? "piece",
          notes: f.notes?.trim() ?? "",
          actorId,
          at: new Date().toISOString(),
        };
        add.mutate(v);
        return itemFromVars(v, { pending: !navigator.onLine });
      },
      /** Puts a row back in the queue as it was (the Undo of "Remove from the queue"). */
      readd(it: ShoppingItem) {
        add.mutate({
          id: it.id,
          name: it.name,
          quantity: it.quantity,
          category: it.category,
          unit: it.unit,
          notes: it.notes,
          actorId: it.createdBy,
          at: it.createdAt,
        });
      },
      /** Try again after "Couldn't sync". */
      retryAdd(id: string): boolean {
        const v = failedAdds.get(id);
        if (!v) return false;
        add.mutate(v);
        return true;
      },
      setBought(id: string, isBought: boolean) {
        bought.mutate({ id, bought: isBought, actorId, at: new Date().toISOString() });
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `mutate` is stable
    [actorId, add.mutate, bought.mutate],
  );
}

/** Takes a queued add out of the queue (it never reached the server), and forgets a failed one. */
export function removeQueuedAdd(qc: QueryClient, id: string) {
  const mc = qc.getMutationCache();
  for (const m of mc.findAll({ mutationKey: addItemKey }))
    if (m.state.status === "pending" && (m.state.variables as AddItemVars | undefined)?.id === id) mc.remove(m);
  failedAdds.clear(id);
}

// ---------- the online writes (the form and the sheets say so when offline) ----------

const base = "/api/shopping";
export const updateShoppingItem = (id: string, input: UpdateItemInput) =>
  api<{ item: ShoppingItemView }>(`${base}/${id}`, { method: "PATCH", body: input as Record<string, unknown> });
export const deleteShoppingItem = (id: string) => api<void>(`${base}/${id}`, { method: "DELETE" });
/** Removes every bought row and answers them, so Undo can restore them. */
export const clearBoughtItems = () => api<{ items: ShoppingItemView[] }>(`${base}/clear-bought`, { body: {} });
/** The Undo of a delete and of clear bought: rows come back with their ids and attribution. */
export const restoreShoppingItems = (items: ShoppingItemView[]) =>
  api<{ items: ShoppingItemView[] }>(`${base}/restore`, {
    body: {
      items: items.map((i) => ({
        id: i.id,
        name: i.name,
        quantity: i.quantity,
        category: i.category,
        unit: i.unit,
        notes: i.notes,
        boughtAt: i.boughtAt,
        boughtBy: i.boughtBy,
        createdBy: i.createdBy,
        createdAt: i.createdAt,
      })),
    },
  });

// ---------- cache patches after a write, so the screen shows it at once ----------

const upsert = (list: ShoppingItem[], row: ShoppingItemView): ShoppingItem[] =>
  list.some((x) => x.id === row.id) ? list.map((x) => (x.id === row.id ? row : x)) : [row, ...list];

export const putShoppingItems = (qc: QueryClient, rows: ShoppingItemView[]) =>
  patchShopping(qc, (d) => ({ ...d, items: rows.reduce(upsert, d.items) }));
export const dropShoppingItems = (qc: QueryClient, ids: string[]) =>
  patchShopping(qc, (d) => ({ ...d, items: d.items.filter((i) => !ids.includes(i.id)) }));

// ---------- reading ----------

export interface ShopPeople {
  meId: string;
  /** The partner hasn't joined, or there is only one member: everything is yours. */
  solo: boolean;
  /** The other member, when there is one. */
  partnerId: string | null;
  /** "Sara", "Youssef"; "Your partner" when unknown. */
  name: (id: string | null | undefined) => string;
  /** Sara's name in the pair, "you" when you're on your own (Shop.who). */
  who: (id: string | null | undefined) => string;
  slot: (id: string) => AvatarSlot;
}

/** The list, with the adds this device couldn't sync merged in as failed rows, and who is who. */
export function useShoppingData() {
  const q = useQuery(shoppingQuery);
  const failed = useFailedAdds();
  const { me } = useRouteContext({ from: "/_app" });
  const data = q.data;
  const items = useMemo<ShoppingItem[] | null>(() => {
    if (!data) return null;
    const have = new Set(data.items.map((i) => i.id));
    const lost = failed
      .filter((v) => !have.has(v.id))
      .map((v) => ({ ...itemFromVars(v, { pending: false }), failed: true }));
    return [...lost, ...data.items];
  }, [data, failed]);
  const people = useMemo<ShopPeople>(() => {
    const members = new Map((data?.members ?? []).map((m) => [m.userId, m]));
    const solo = (data?.members.length ?? 2) < 2;
    const loaded = members.size > 0;
    const name = (id: string | null | undefined) =>
      !id
        ? "Your partner"
        : id === me.user.id
          ? me.user.displayName
          : (members.get(id)?.displayName ?? unknownName(loaded));
    return {
      meId: me.user.id,
      solo,
      partnerId: [...members.keys()].find((k) => k !== me.user.id) ?? null,
      name,
      // Alone, what you did is "you"; what a partner who left did keeps their placeholder name.
      who: (id) => (solo && (!id || id === me.user.id) ? "you" : name(id)),
      slot: (id) =>
        id === me.user.id
          ? me.space.slot
          : (members.get(id)?.slot ?? unknownSlot(loaded, me.space.slot === "a" ? "b" : "a")),
    };
  }, [data, me]);
  return { q, data, items, people };
}

const UNIT_LABEL: Record<ShopUnit, string> = { piece: "pcs", l: "L", g: "g", kg: "kg" };
/** The unit as the select names it. */
export const UNIT_NAME: Record<ShopUnit, string> = {
  piece: "Pieces",
  l: "Litres (L)",
  g: "Grams (g)",
  kg: "Kilograms (kg)",
};
/** "2 L", "500 g", "1 kg", "3 pcs", "1 pc". */
export function qtyText(quantity: number, unit: ShopUnit): string {
  if (unit === "piece") return `${quantity} ${quantity === 1 ? "pc" : "pcs"}`;
  return `${quantity} ${UNIT_LABEL[unit]}`;
}
