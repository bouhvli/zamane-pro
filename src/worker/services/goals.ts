/**
 * Goals and journal notes (§4, §5). Every function takes spaceId first and every statement filters on it: another
 * space's id behaves exactly like a missing one. Derived values are computed here, never stored (§4.3).
 */
import { sql, type SQL } from "drizzle-orm";
import { isComplete, nextCompletion } from "../../shared/completion.ts";
import { toSafeMinor } from "../../shared/money.ts";
import type {
  CreateGoalInput,
  EntryView,
  GoalStats,
  GoalsResponse,
  GoalView,
  ImageAsset,
  NoteBlock,
  NoteView,
  UpdateGoalInput,
} from "../../shared/schemas/goals.ts";
import { db, withTx, type DbContext, type Tx } from "../db/client.ts";
import { ApiError, isUniqueViolation, notFound } from "../errors.ts";
import { assertOwnAsset } from "./cloudinary.ts";

// ---------- reads ----------

/** One goal row with its derived values, as JSON (for list and detail). */
function goalJson(where: SQL): SQL {
  return sql`
    select json_build_object(
      'id', g.id, 'kind', g.kind, 'title', g.title, 'description', coalesce(g.description, ''),
      'target', g.target_amount, 'targetDate', g.target_date, 'cover', g.cover,
      'progress', case when g.kind = 'money'
          then (select coalesce(sum(e.amount), 0) from goal_entries e where e.goal_id = g.id and e.space_id = g.space_id)
          else coalesce((select e.percent from goal_entries e where e.goal_id = g.id and e.space_id = g.space_id
                         order by e.created_at desc, e.id desc limit 1), 0) end,
      'completedAt', g.completed_at, 'completedBy', g.completed_by,
      'createdAt', g.created_at, 'createdBy', g.created_by, 'updatedAt', g.updated_at,
      'last', (select json_build_object('id', e.id, 'userId', e.created_by, 'amount', e.amount, 'percent', e.percent,
                                        'note', e.note, 'at', e.created_at)
               from goal_entries e where e.goal_id = g.id and e.space_id = g.space_id
               order by e.created_at desc, e.id desc limit 1),
      'entryCount', (select count(*) from goal_entries e where e.goal_id = g.id and e.space_id = g.space_id),
      'noteCount', (select count(*) from goal_notes n where n.goal_id = g.id and n.space_id = g.space_id)
    ) as goal
    from goals g where ${where}`;
}

function toEntry(e: Record<string, unknown>): EntryView {
  return {
    id: String(e.id),
    userId: String(e.userId),
    amount: e.amount == null ? null : toSafeMinor(e.amount as number),
    percent: (e.percent as number | null) ?? null,
    note: (e.note as string | null) || null,
    at: new Date(String(e.at)).toISOString(),
  };
}
const iso = (v: unknown) => (v == null ? null : new Date(String(v)).toISOString());

function toGoal(g: Record<string, unknown>): GoalView {
  return {
    id: String(g.id),
    kind: g.kind as GoalView["kind"],
    title: String(g.title),
    description: String(g.description ?? ""),
    target: g.target == null ? null : toSafeMinor(g.target as number),
    targetDate: (g.targetDate as string | null) ?? null,
    cover: (g.cover as ImageAsset | null) ?? null,
    progress: toSafeMinor(g.progress as number),
    completedAt: iso(g.completedAt),
    completedBy: (g.completedBy as string | null) ?? null,
    createdAt: iso(g.createdAt)!,
    createdBy: String(g.createdBy),
    updatedAt: iso(g.updatedAt)!,
    last: g.last ? toEntry(g.last as Record<string, unknown>) : null,
    entryCount: Number(g.entryCount),
    noteCount: Number(g.noteCount),
  };
}

export async function listGoals(c: DbContext, spaceId: string): Promise<Omit<GoalsResponse, "images">> {
  const d = db(c);
  const [goals, meta] = await Promise.all([
    d.execute<{ goal: Record<string, unknown> }>(goalJson(sql`g.space_id = ${spaceId}`)),
    d.execute<{ currency: string; members: GoalsResponse["members"] }>(sql`
      select s.currency,
        (select json_agg(json_build_object('userId', m.user_id, 'displayName', u.display_name, 'slot', m.slot) order by m.slot)
         from space_members m join "user" u on u.id = m.user_id where m.space_id = s.id) as members
      from spaces s where s.id = ${spaceId}`),
  ]);
  return {
    currency: String(meta.rows[0]?.currency ?? "").trim(),
    goals: goals.rows.map((r) => toGoal(r.goal)),
    members: meta.rows[0]?.members ?? [],
  };
}

export async function getGoal(c: DbContext, spaceId: string, goalId: string): Promise<GoalView | null> {
  const r = await db(c).execute<{ goal: Record<string, unknown> }>(
    goalJson(sql`g.id = ${goalId} and g.space_id = ${spaceId}`),
  );
  return r.rows[0] ? toGoal(r.rows[0].goal) : null;
}

async function goalExists(c: DbContext, spaceId: string, goalId: string): Promise<boolean> {
  const r = await db(c).execute(sql`select 1 from goals where id = ${goalId} and space_id = ${spaceId}`);
  return r.rows.length > 0;
}

/** Every entry, newest first (§4.3 order: created_at desc, id desc). Months and paging are the client's. */
export async function listEntries(c: DbContext, spaceId: string, goalId: string): Promise<EntryView[]> {
  if (!(await goalExists(c, spaceId, goalId))) throw notFound();
  const r = await db(c).execute<Record<string, unknown>>(sql`
    select id, created_by as "userId", amount, percent, note, created_at as at from goal_entries
    where goal_id = ${goalId} and space_id = ${spaceId} order by created_at desc, id desc`);
  return r.rows.map(toEntry);
}

export async function listNotes(c: DbContext, spaceId: string, goalId: string): Promise<NoteView[]> {
  if (!(await goalExists(c, spaceId, goalId))) throw notFound();
  const r = await db(c).execute<{
    id: string;
    userId: string;
    at: string;
    updatedAt: string;
    blocks: NoteView["blocks"] | null;
  }>(sql`
    select n.id, n.created_by as "userId", n.created_at as at, n.updated_at as "updatedAt",
      (select json_agg(case when b.kind = 'text' then json_build_object('type', 'text', 'text', b.text)
                            else json_build_object('type', 'image', 'image', b.image, 'alt', coalesce(b.alt, '')) end
                       order by b.position)
       from goal_note_blocks b where b.note_id = n.id and b.space_id = n.space_id) as blocks
    from goal_notes n where n.goal_id = ${goalId} and n.space_id = ${spaceId}
    order by n.created_at desc, n.id desc`);
  return r.rows.map((n) => ({
    id: n.id,
    userId: n.userId,
    at: new Date(n.at).toISOString(),
    updatedAt: new Date(n.updatedAt).toISOString(),
    blocks: n.blocks ?? [],
  }));
}

/** Stats (§4.3): month boundaries in the space's time zone; shares joined to the members' slots. */
export async function goalStats(c: DbContext, spaceId: string, goalId: string): Promise<GoalStats> {
  const r = await db(c).execute<{ s: Record<string, unknown> | null }>(sql`
    with g as (select id, kind from goals where id = ${goalId} and space_id = ${spaceId}),
    tz as (select timezone from spaces where id = ${spaceId}),
    e as (select * from goal_entries where goal_id = ${goalId} and space_id = ${spaceId}),
    month_start as (select (date_trunc('month', now() at time zone (select timezone from tz))) at time zone (select timezone from tz) as t)
    select case when not exists (select 1 from g) then null else json_build_object(
      'kind', (select kind from g),
      'count', (select count(*) from e),
      'total', (select coalesce(sum(amount), 0) from e),
      'largest', (select coalesce(max(amount), 0) from e),
      'thisMonth', (select coalesce(sum(amount), 0) from e where created_at >= (select t from month_start)),
      'monthFrom', coalesce((select percent from e where created_at < (select t from month_start)
                             order by created_at desc, id desc limit 1), 0),
      'monthTo', (select percent from e where created_at >= (select t from month_start) order by created_at desc, id desc limit 1),
      'shares', (select json_agg(json_build_object('userId', m.user_id,
                   'amount', (select coalesce(sum(amount), 0) from e where e.created_by = m.user_id),
                   'count', (select count(*) from e where e.created_by = m.user_id)) order by m.slot)
                 from space_members m where m.space_id = ${spaceId}),
      'last', (select json_build_object('id', id, 'userId', created_by, 'amount', amount, 'percent', percent,
                                        'note', note, 'at', created_at) from e order by created_at desc, id desc limit 1)
    ) end as s`);
  const s = r.rows[0]?.s;
  if (!s) throw notFound();
  const money = s.kind === "money";
  const count = Number(s.count);
  const total = toSafeMinor(s.total as number);
  const shares = (s.shares as { userId: string; amount: number; count: number }[] | null) ?? [];
  return {
    count,
    ...(money
      ? {
          total,
          average: count ? Math.round(total / count) : 0,
          largest: toSafeMinor(s.largest as number),
          thisMonth: toSafeMinor(s.thisMonth as number),
        }
      : { monthFrom: Number(s.monthFrom), monthTo: s.monthTo == null ? null : Number(s.monthTo) }),
    shares: shares.map((x) => {
      const amount = toSafeMinor(x.amount);
      const n = Number(x.count);
      return {
        userId: x.userId,
        amount,
        count: n,
        pct: money ? (total ? Math.round((amount / total) * 100) : 0) : count ? Math.round((n / count) * 100) : 0,
      };
    }),
    last: s.last ? toEntry(s.last as Record<string, unknown>) : null,
  };
}

// ---------- goal writes ----------

/** POST /api/goals: idempotent on the client's id (§5). */
export async function createGoal(
  c: DbContext,
  spaceId: string,
  userId: string,
  input: CreateGoalInput,
): Promise<{ status: 200 | 201; goal: GoalView }> {
  assertOwnAsset(spaceId, input.cover);
  const money = input.kind === "money";
  const r = await db(c).execute<{ id: string }>(sql`
    insert into goals (id, space_id, kind, title, description, target_amount, target_date, cover, created_by)
    values (${input.id}, ${spaceId}, ${input.kind}, ${input.title.trim()}, ${input.description?.trim() || null},
            ${money ? input.target! : null}, ${input.targetDate ?? null}, ${input.cover ? JSON.stringify(input.cover) : null}::jsonb,
            ${userId})
    on conflict (id) do nothing returning id`);
  const goal = await getGoal(c, spaceId, input.id);
  if (!goal) throw new ApiError(409, "id_conflict", "That id is already used.");
  return { status: r.rows.length ? 201 : 200, goal };
}

type GoalRow = {
  id: string;
  kind: "money" | "general";
  title: string;
  description: string | null;
  target_amount: string | number | null;
  target_date: string | null;
  cover: ImageAsset | null;
  completed_at: Date | string | null;
  completed_by: string | null;
  updated_at: Date | string;
};

async function progressOf(tx: Tx, spaceId: string, goalId: string, kind: "money" | "general"): Promise<number> {
  const r =
    kind === "money"
      ? await tx.execute<{ p: string | number }>(
          sql`select coalesce(sum(amount), 0) as p from goal_entries where goal_id = ${goalId} and space_id = ${spaceId}`,
        )
      : await tx.execute<{ p: string | number }>(sql`
          select coalesce((select percent from goal_entries where goal_id = ${goalId} and space_id = ${spaceId}
                           order by created_at desc, id desc limit 1), 0) as p`);
  return toSafeMinor(r.rows[0]!.p);
}

export type UpdateResult =
  | { kind: "ok"; goal: GoalView; completed: boolean; reopened: boolean; oldCover: string | null }
  | { kind: "conflict"; current: GoalView }
  | { kind: "not_found" };

/**
 * PATCH with optimistic concurrency (§5): the row is locked, its updated_at compared to the client's, the fields
 * changed, and completion recomputed in the same transaction (a target change can complete or reopen a goal).
 */
export async function updateGoal(
  c: DbContext,
  spaceId: string,
  userId: string,
  goalId: string,
  input: UpdateGoalInput,
): Promise<UpdateResult> {
  assertOwnAsset(spaceId, input.cover);
  const out = await withTx(c, async (tx): Promise<UpdateResult | { kind: "conflict-read" }> => {
    const r = await tx.execute<GoalRow>(sql`
      select id, kind, title, description, target_amount, target_date, cover, completed_at, completed_by, updated_at
      from goals where id = ${goalId} and space_id = ${spaceId} for update`);
    const g = r.rows[0];
    if (!g) return { kind: "not_found" };
    if (new Date(g.updated_at).getTime() !== new Date(input.updatedAt).getTime()) return { kind: "conflict-read" };
    if (g.kind === "money" && input.target === null)
      throw new ApiError(400, "validation_failed", "Check the highlighted fields.", {
        target: "Enter a target amount, for example 20000.",
      });

    const set: SQL[] = [sql`updated_at = now()`];
    if (input.title !== undefined) set.push(sql`title = ${input.title.trim()}`);
    if (input.description !== undefined) set.push(sql`description = ${input.description.trim() || null}`);
    if (input.targetDate !== undefined) set.push(sql`target_date = ${input.targetDate}`);
    if (input.target !== undefined && g.kind === "money") set.push(sql`target_amount = ${input.target}`);
    if (input.cover !== undefined) set.push(sql`cover = ${input.cover ? JSON.stringify(input.cover) : null}::jsonb`);
    await tx.execute(sql`update goals set ${sql.join(set, sql`, `)} where id = ${goalId} and space_id = ${spaceId}`);

    const target =
      g.kind === "money" ? (input.target !== undefined ? input.target : toSafeMinor(g.target_amount!)) : null;
    const progress = await progressOf(tx, spaceId, goalId, g.kind);
    const before = { completedAt: g.completed_at ? new Date(g.completed_at) : null, completedBy: g.completed_by };
    const change = nextCompletion(before, isComplete(g.kind, progress, target), userId, new Date());
    if (change) {
      await tx.execute(sql`update goals set completed_at = ${change.completedAt}, completed_by = ${change.completedBy}
                           where id = ${goalId} and space_id = ${spaceId}`);
    }
    const oldCover =
      input.cover !== undefined && g.cover && g.cover.publicId !== input.cover?.publicId ? g.cover.publicId : null;
    return {
      kind: "ok",
      goal: null as unknown as GoalView, // read after commit
      completed: !!change && !!change.completedAt,
      reopened: !!change && !change.completedAt,
      oldCover,
    };
  });
  if (out.kind === "not_found") return out;
  const goal = await getGoal(c, spaceId, goalId);
  if (!goal) return { kind: "not_found" };
  if (out.kind === "conflict-read") return { kind: "conflict", current: goal };
  if (out.kind === "conflict") return out;
  return { ...out, goal };
}

/**
 * DELETE: cascades to entries, notes and blocks. Returns the asset ids (cover and note photos) to destroy after
 * commit (§8); ids that slip through are found by `pnpm images:orphans`. Missing goals return null.
 */
export async function deleteGoal(c: DbContext, spaceId: string, goalId: string): Promise<string[] | null> {
  const photos = await noteImagesOfGoal(c, spaceId, goalId);
  const r = await db(c).execute<{ cover: string | null }>(sql`
    delete from goals where id = ${goalId} and space_id = ${spaceId} returning cover->>'publicId' as cover`);
  if (!r.rows.length) return null;
  return [...(r.rows[0]!.cover ? [r.rows[0]!.cover] : []), ...photos];
}

async function noteImagesOfGoal(c: DbContext, spaceId: string, goalId: string): Promise<string[]> {
  const r = await db(c).execute<{ id: string }>(sql`
    select b.image->>'publicId' as id from goal_note_blocks b
    join goal_notes n on n.id = b.note_id and n.space_id = b.space_id
    where n.goal_id = ${goalId} and b.space_id = ${spaceId} and b.kind = 'image'`);
  return r.rows.map((x) => x.id).filter(Boolean);
}

// ---------- notes (saved whole, D13) ----------

async function insertBlocks(tx: Tx, spaceId: string, noteId: string, userId: string, blocks: NoteBlock[]) {
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]!;
    const id = crypto.randomUUID();
    if (b.type === "text") {
      await tx.execute(sql`insert into goal_note_blocks (id, space_id, note_id, position, kind, text, created_by)
                           values (${id}, ${spaceId}, ${noteId}, ${i}, 'text', ${b.text}, ${userId})`);
    } else {
      await tx.execute(sql`insert into goal_note_blocks (id, space_id, note_id, position, kind, image, alt, created_by)
                           values (${id}, ${spaceId}, ${noteId}, ${i}, 'image', ${JSON.stringify(b.image)}::jsonb,
                                   ${b.alt || null}, ${userId})`);
    }
  }
}

async function getNote(c: DbContext, spaceId: string, goalId: string, noteId: string): Promise<NoteView | null> {
  const all = await listNotes(c, spaceId, goalId).catch(() => []);
  return all.find((n) => n.id === noteId) ?? null;
}

export async function createNote(
  c: DbContext,
  spaceId: string,
  goalId: string,
  userId: string,
  input: { id: string; blocks: NoteBlock[] },
): Promise<{ status: 200 | 201; note: NoteView }> {
  for (const b of input.blocks) if (b.type === "image") assertOwnAsset(spaceId, b.image);
  let status: 200 | 201 = 201;
  try {
    await withTx(c, async (tx) => {
      const g = await tx.execute(sql`select 1 from goals where id = ${goalId} and space_id = ${spaceId}`);
      if (!g.rows.length) throw notFound();
      const r = await tx.execute<{ id: string }>(sql`
        insert into goal_notes (id, space_id, goal_id, created_by) values (${input.id}, ${spaceId}, ${goalId}, ${userId})
        on conflict (id) do nothing returning id`);
      if (!r.rows.length) {
        status = 200; // a replay: the note is already there
        return;
      }
      await insertBlocks(tx, spaceId, input.id, userId, input.blocks);
    });
  } catch (err) {
    if (isUniqueViolation(err)) throw new ApiError(409, "id_conflict", "That id is already used.");
    throw err;
  }
  const note = await getNote(c, spaceId, goalId, input.id);
  if (!note) throw new ApiError(409, "id_conflict", "That id is already used.");
  return { status, note };
}

export type NoteUpdate =
  | { kind: "ok"; note: NoteView; removedImages: string[] }
  | { kind: "conflict"; current: NoteView }
  | { kind: "not_found" }
  | { kind: "forbidden" };

/** PUT: replaces the blocks in one transaction with the optimistic check; only the author edits (D6 of the designs). */
export async function updateNote(
  c: DbContext,
  spaceId: string,
  goalId: string,
  noteId: string,
  userId: string,
  input: { blocks: NoteBlock[]; updatedAt: string },
): Promise<NoteUpdate> {
  for (const b of input.blocks) if (b.type === "image") assertOwnAsset(spaceId, b.image);
  const res = await withTx(c, async (tx) => {
    const r = await tx.execute<{ created_by: string; updated_at: string }>(sql`
      select created_by, updated_at from goal_notes where id = ${noteId} and goal_id = ${goalId} and space_id = ${spaceId}
      for update`);
    const n = r.rows[0];
    if (!n) return { kind: "not_found" as const };
    if (n.created_by !== userId) return { kind: "forbidden" as const };
    if (new Date(n.updated_at).getTime() !== new Date(input.updatedAt).getTime()) return { kind: "conflict" as const };
    const old = await tx.execute<{ id: string }>(sql`
      select image->>'publicId' as id from goal_note_blocks where note_id = ${noteId} and space_id = ${spaceId} and kind = 'image'`);
    await tx.execute(sql`delete from goal_note_blocks where note_id = ${noteId} and space_id = ${spaceId}`);
    await insertBlocks(tx, spaceId, noteId, userId, input.blocks);
    await tx.execute(sql`update goal_notes set updated_at = now() where id = ${noteId} and space_id = ${spaceId}`);
    const keep = new Set(input.blocks.flatMap((b) => (b.type === "image" ? [b.image.publicId] : [])));
    return { kind: "ok" as const, removedImages: old.rows.map((x) => x.id).filter((id) => id && !keep.has(id)) };
  });
  if (res.kind === "not_found" || res.kind === "forbidden") return res;
  const note = await getNote(c, spaceId, goalId, noteId);
  if (!note) return { kind: "not_found" };
  if (res.kind === "conflict") return { kind: "conflict", current: note };
  return { kind: "ok", note, removedImages: res.removedImages };
}

/** DELETE: idempotent (D17); only the author. Returns the images to destroy. */
export async function deleteNote(
  c: DbContext,
  spaceId: string,
  goalId: string,
  noteId: string,
  userId: string,
): Promise<string[]> {
  const imgs = await db(c).execute<{ id: string; author: string }>(sql`
    select b.image->>'publicId' as id, n.created_by as author from goal_notes n
    left join goal_note_blocks b on b.note_id = n.id and b.space_id = n.space_id and b.kind = 'image'
    where n.id = ${noteId} and n.goal_id = ${goalId} and n.space_id = ${spaceId}`);
  if (!imgs.rows.length) return [];
  if (imgs.rows[0]!.author !== userId)
    throw new ApiError(403, "forbidden", "Only the person who wrote a note can delete it.");
  await db(c).execute(
    sql`delete from goal_notes where id = ${noteId} and goal_id = ${goalId} and space_id = ${spaceId}`,
  );
  return imgs.rows.map((x) => x.id).filter(Boolean);
}
