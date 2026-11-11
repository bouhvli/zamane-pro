import { sql } from "drizzle-orm";
import { isComplete, nextCompletion } from "../../shared/completion.ts";
import { toSafeMinor } from "../../shared/money.ts";
import type { EntryResponse } from "../../shared/schemas/home.ts";
import { withTx, type DbContext, type Tx } from "../db/client.ts";
import { ApiError } from "../errors.ts";

/**
 * Goal entries (§4.3, §5): insert and delete run in one interactive transaction with the goal row locked
 * FOR UPDATE, so two partners adding at once are serialised and completion is recomputed exactly once each.
 * Every statement filters on spaceId: another space's goal behaves like a missing one.
 */
type LockedGoal = {
  id: string;
  kind: "money" | "general";
  target_amount: string | number | null;
  completed_at: Date | string | null;
  completed_by: string | null;
};

async function lockGoal(tx: Tx, spaceId: string, goalId: string): Promise<LockedGoal | null> {
  const r = await tx.execute<LockedGoal>(sql`
    select id, kind, target_amount, completed_at, completed_by from goals
    where id = ${goalId} and space_id = ${spaceId} for update`);
  return r.rows[0] ?? null;
}

async function progressOf(tx: Tx, spaceId: string, goal: LockedGoal): Promise<number> {
  const r =
    goal.kind === "money"
      ? await tx.execute<{ p: string | number }>(sql`
          select coalesce(sum(amount), 0) as p from goal_entries where goal_id = ${goal.id} and space_id = ${spaceId}`)
      : await tx.execute<{ p: string | number }>(sql`
          select coalesce((select percent from goal_entries where goal_id = ${goal.id} and space_id = ${spaceId}
                           order by created_at desc, id desc limit 1), 0) as p`);
  return toSafeMinor(r.rows[0]!.p);
}

/** Recomputes completion for a locked goal and saves it when it changes. Returns the state after. */
async function settleCompletion(tx: Tx, spaceId: string, goal: LockedGoal, actor: string) {
  const progress = await progressOf(tx, spaceId, goal);
  const target = goal.target_amount == null ? null : toSafeMinor(goal.target_amount);
  const before = {
    completedAt: goal.completed_at ? new Date(goal.completed_at) : null,
    completedBy: goal.completed_by,
  };
  const change = nextCompletion(before, isComplete(goal.kind, progress, target), actor, new Date());
  if (change) {
    await tx.execute(sql`
      update goals set completed_at = ${change.completedAt}, completed_by = ${change.completedBy}, updated_at = now()
      where id = ${goal.id} and space_id = ${spaceId}`);
  }
  const after = change ?? before;
  return { progress, completedAt: after.completedAt, crossed: !before.completedAt && !!after.completedAt };
}

export async function addEntry(
  c: DbContext,
  spaceId: string,
  goalId: string,
  actor: string,
  input: { id: string; amount?: number; percent?: number; note?: string },
): Promise<{ status: 200 | 201; body: EntryResponse }> {
  return withTx(c, async (tx) => {
    const goal = await lockGoal(tx, spaceId, goalId);
    if (!goal) throw new ApiError(404, "not_found", "Not found.");
    if (goal.kind === "money" && input.amount === undefined)
      throw new ApiError(400, "validation_failed", "Check the highlighted fields.", { amount: "Enter an amount." });
    if (goal.kind === "general" && input.percent === undefined)
      throw new ApiError(400, "validation_failed", "Check the highlighted fields.", { percent: "Enter a percent." });

    const inserted = await tx.execute<{
      id: string;
      amount: string | null;
      percent: number | null;
      note: string | null;
      created_at: Date | string;
    }>(sql`
      insert into goal_entries (id, space_id, goal_id, amount, percent, note, created_by)
      values (${input.id}, ${spaceId}, ${goalId}, ${input.amount ?? null}, ${input.percent ?? null},
              ${input.note || null}, ${actor})
      on conflict (id) do nothing
      returning id, amount, percent, note, created_at`);
    let row = inserted.rows[0];
    let status: 200 | 201 = 201;
    if (!row) {
      // A replay of the same create (offline queue, retry) answers 200; an id used elsewhere is a conflict.
      const again = await tx.execute<NonNullable<typeof row>>(sql`
        select id, amount, percent, note, created_at from goal_entries
        where id = ${input.id} and space_id = ${spaceId} and goal_id = ${goalId}`);
      row = again.rows[0];
      if (!row) throw new ApiError(409, "id_conflict", "That id is already used.");
      status = 200;
    }
    const settled = await settleCompletion(tx, spaceId, goal, actor);
    return {
      status,
      body: {
        entry: {
          id: row.id,
          goalId,
          amount: row.amount == null ? null : toSafeMinor(row.amount),
          percent: row.percent,
          note: row.note,
          createdAt: new Date(row.created_at).toISOString(),
        },
        goal: { id: goalId, progress: settled.progress, completedAt: settled.completedAt?.toISOString() ?? null },
        completed: status === 201 && settled.crossed,
      },
    };
  });
}

/** Idempotent (D17): 204 whether or not the entry existed in the caller's space. */
export async function deleteEntry(c: DbContext, spaceId: string, goalId: string, entryId: string, actor: string) {
  await withTx(c, async (tx) => {
    const goal = await lockGoal(tx, spaceId, goalId);
    if (!goal) return;
    const r = await tx.execute(sql`
      delete from goal_entries where id = ${entryId} and goal_id = ${goalId} and space_id = ${spaceId} returning id`);
    if (r.rows.length) await settleCompletion(tx, spaceId, goal, actor);
  });
}
