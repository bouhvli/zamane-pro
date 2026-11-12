/**
 * The shared shopping list (§4, §5, D62). Every function takes spaceId first and every statement filters on it:
 * another space's id behaves exactly like a missing one. Rows are built as JSON (money safe integers, timestamps
 * ISO). Grouping and totals are the device's; the server keeps one spelling per category key.
 */
import { sql, type SQL } from "drizzle-orm";
import { categoryKey } from "../../shared/category.ts";
import type {
  CreateItemInput,
  RestoreInput,
  ShoppingItemView,
  ShoppingResponse,
  UpdateItemInput,
} from "../../shared/schemas/shopping.ts";
import { db, type DbContext } from "../db/client.ts";
import { ApiError } from "../errors.ts";

type Row = Record<string, unknown>;
const iso = (v: unknown) => (v == null ? null : new Date(String(v)).toISOString());
const nul = (s: string | null | undefined) => (s && s.trim() ? s.trim() : null);
const asOf = (v: string) => sql`${new Date(v).toISOString()}::timestamptz`;

function itemJson(where: SQL, order: SQL = sql``): SQL {
  return sql`
    select json_build_object(
      'id', i.id, 'name', i.name, 'quantity', i.quantity, 'category', i.category, 'unit', i.unit,
      'notes', coalesce(i.notes, ''), 'boughtAt', i.bought_at, 'boughtBy', i.bought_by,
      'createdBy', i.created_by, 'createdAt', i.created_at, 'updatedAt', i.updated_at
    ) as v from shopping_items i where ${where} ${order}`;
}
function toItem(r: Row): ShoppingItemView {
  return {
    id: String(r.id),
    name: String(r.name),
    quantity: Number(r.quantity),
    category: (r.category as string | null) ?? null,
    unit: r.unit as ShoppingItemView["unit"],
    notes: r.notes == null ? "" : String(r.notes),
    boughtAt: iso(r.boughtAt),
    boughtBy: (r.boughtBy as string | null) ?? null,
    createdBy: String(r.createdBy),
    createdAt: iso(r.createdAt)!,
    updatedAt: iso(r.updatedAt)!,
  };
}
async function many(c: DbContext, q: SQL): Promise<ShoppingItemView[]> {
  const r = await db(c).execute<{ v: Row }>(q);
  return r.rows.map((x) => toItem(x.v));
}
async function one(c: DbContext, q: SQL) {
  return (await many(c, q))[0] ?? null;
}

const idConflict = () => new ApiError(409, "id_conflict", "That id is already used.");

/**
 * The category as it will be stored: when the space already has this key the existing (latest) spelling wins, so
 * groups don't split (§4.3). `exceptId` keeps an item from matching itself, so re-spelling a lone category works.
 */
function categoryValue(spaceId: string, typed: string | null, exceptId?: string): { value: SQL; key: string | null } {
  const key = categoryKey(typed);
  if (key == null) return { value: sql`null`, key: null };
  const except = exceptId ? sql`and id <> ${exceptId}` : sql``;
  return {
    key,
    value: sql`coalesce((select category from shopping_items
                         where space_id = ${spaceId} and category_key = ${key} ${except}
                         order by updated_at desc limit 1), ${typed})`,
  };
}

// ---------- reads ----------

export async function listShopping(c: DbContext, spaceId: string): Promise<ShoppingResponse> {
  const [items, meta] = await Promise.all([
    many(c, itemJson(sql`i.space_id = ${spaceId}`, sql`order by i.created_at desc, i.id`)),
    db(c).execute<{ currency: string; members: ShoppingResponse["members"] }>(sql`
      select s.currency,
        (select json_agg(json_build_object('userId', m.user_id, 'displayName', u.display_name, 'slot', m.slot) order by m.slot)
         from space_members m join "user" u on u.id = m.user_id where m.space_id = s.id) as members
      from spaces s where s.id = ${spaceId}`),
  ]);
  return { currency: String(meta.rows[0]?.currency ?? "").trim(), items, members: meta.rows[0]?.members ?? [] };
}

export function getItem(c: DbContext, spaceId: string, itemId: string) {
  return one(c, itemJson(sql`i.id = ${itemId} and i.space_id = ${spaceId}`));
}

/** The distinct categories, the latest spelling for each key (§4.3). */
export async function listCategories(c: DbContext, spaceId: string): Promise<string[]> {
  const r = await db(c).execute<{ category: string }>(sql`
    select category from (
      select distinct on (category_key) category, updated_at from shopping_items
      where space_id = ${spaceId} and category_key is not null
      order by category_key, updated_at desc) t
    order by lower(category)`);
  return r.rows.map((x) => x.category);
}

// ---------- writes ----------

/** POST: idempotent on the client's id (200 on a replay, 201 when created). */
export async function createItem(
  c: DbContext,
  spaceId: string,
  userId: string,
  input: CreateItemInput,
): Promise<{ status: 200 | 201; item: ShoppingItemView }> {
  const typed = nul(input.category);
  const cat = categoryValue(spaceId, typed);
  const r = await db(c).execute<{ id: string }>(sql`
    insert into shopping_items (id, space_id, name, quantity, category, category_key, unit, notes, created_by)
    values (${input.id}, ${spaceId}, ${input.name.trim()}, ${input.quantity ?? 1}, ${cat.value}, ${cat.key},
            ${input.unit ?? "piece"}, ${nul(input.notes)}, ${userId})
    on conflict (id) do nothing returning id`);
  const item = await getItem(c, spaceId, input.id);
  if (!item) throw idConflict();
  return { status: r.rows.length ? 201 : 200, item };
}

export type ItemUpdate =
  { kind: "ok"; item: ShoppingItemView } | { kind: "conflict"; current: ShoppingItemView } | { kind: "not_found" };

/** PATCH with optimistic concurrency (§5): the update compares updated_at, so a stale edit changes nothing. */
export async function updateItem(
  c: DbContext,
  spaceId: string,
  itemId: string,
  input: UpdateItemInput,
): Promise<ItemUpdate> {
  const cur = await getItem(c, spaceId, itemId);
  if (!cur) return { kind: "not_found" };
  if (new Date(cur.updatedAt).getTime() !== new Date(input.updatedAt).getTime())
    return { kind: "conflict", current: cur };

  const set: SQL[] = [sql`updated_at = now()`];
  if (input.name !== undefined) set.push(sql`name = ${input.name.trim()}`);
  if (input.quantity !== undefined) set.push(sql`quantity = ${input.quantity}`);
  if (input.category !== undefined) {
    const cat = categoryValue(spaceId, nul(input.category), itemId);
    set.push(sql`category = ${cat.value}`, sql`category_key = ${cat.key}`);
  }
  if (input.unit !== undefined) set.push(sql`unit = ${input.unit}`);
  if (input.notes !== undefined) set.push(sql`notes = ${nul(input.notes)}`);
  const r = await db(c).execute(sql`
    update shopping_items set ${sql.join(set, sql`, `)}
    where id = ${itemId} and space_id = ${spaceId} and updated_at = ${asOf(input.updatedAt)} returning id`);
  const item = await getItem(c, spaceId, itemId);
  if (!item) return { kind: "not_found" };
  if (!r.rows.length) return { kind: "conflict", current: item };
  return { kind: "ok", item };
}

/**
 * Ticks set state (D9): replayed with the same body they leave the same row, the first buyer is kept, and a tick
 * doesn't touch updated_at, so it never makes a partner's open edit conflict (D62).
 */
export async function setBought(
  c: DbContext,
  spaceId: string,
  userId: string,
  itemId: string,
  bought: boolean,
): Promise<ShoppingItemView | null> {
  await db(c).execute(sql`
    update shopping_items set
      bought_at = case when ${bought} then coalesce(bought_at, now()) else null end,
      bought_by = case when ${bought} then coalesce(bought_by, ${userId}::uuid) else null end
    where id = ${itemId} and space_id = ${spaceId}`);
  return getItem(c, spaceId, itemId);
}

export async function deleteItem(c: DbContext, spaceId: string, itemId: string): Promise<void> {
  await db(c).execute(sql`delete from shopping_items where id = ${itemId} and space_id = ${spaceId}`);
}

/** Removes every bought item and answers them, so the client can offer Undo (restore) with ids and buyers intact. */
export async function clearBought(c: DbContext, spaceId: string): Promise<ShoppingItemView[]> {
  const r = await db(c).execute<{ v: Row }>(sql`
    with d as (delete from shopping_items where space_id = ${spaceId} and bought_at is not null returning *)
    select json_build_object(
      'id', i.id, 'name', i.name, 'quantity', i.quantity, 'category', i.category, 'unit', i.unit,
      'notes', coalesce(i.notes, ''), 'boughtAt', i.bought_at, 'boughtBy', i.bought_by,
      'createdBy', i.created_by, 'createdAt', i.created_at, 'updatedAt', i.updated_at
    ) as v from d i order by i.bought_at desc, i.id`);
  return r.rows.map((x) => toItem(x.v));
}

/**
 * Undo of a delete or of clear bought: the rows come back with the same ids, adders and buyers. A row that exists
 * already (a double Undo) is left alone; people who aren't in the space are refused.
 */
export async function restoreItems(c: DbContext, spaceId: string, input: RestoreInput): Promise<ShoppingItemView[]> {
  const m = await db(c).execute<{ user_id: string }>(
    sql`select user_id from space_members where space_id = ${spaceId}`,
  );
  const members = new Set(m.rows.map((x) => x.user_id));
  for (const i of input.items) {
    if (!members.has(i.createdBy) || (i.boughtBy && !members.has(i.boughtBy)))
      throw new ApiError(400, "validation_failed", "Check the highlighted fields.");
    if ((i.boughtAt == null) !== (i.boughtBy == null))
      throw new ApiError(400, "validation_failed", "Check the highlighted fields.");
  }
  const rows = input.items.map((i) => {
    const typed = nul(i.category);
    return sql`(${i.id}::uuid, ${spaceId}::uuid, ${i.name.trim()}, ${i.quantity}::int, ${typed}, ${categoryKey(typed)},
      ${i.unit}, ${nul(i.notes)}, ${i.boughtAt ? asOf(i.boughtAt) : sql`null::timestamptz`},
      ${i.boughtBy}::uuid, ${i.createdBy}::uuid, ${asOf(i.createdAt)})`;
  });
  await db(c).execute(sql`
    insert into shopping_items (id, space_id, name, quantity, category, category_key, unit, notes, bought_at, bought_by, created_by, created_at)
    values ${sql.join(rows, sql`, `)}
    on conflict (id) do nothing`);
  const ids = sql.join(
    input.items.map((i) => sql`${i.id}::uuid`),
    sql`, `,
  );
  return many(c, itemJson(sql`i.space_id = ${spaceId} and i.id in (${ids})`, sql`order by i.created_at desc, i.id`));
}
