/**
 * Leaving a space and deleting an account (D67, D68). Both run in one interactive transaction that locks the space
 * row first, so two partners leaving at once are serialised: the second one finds itself alone and deletes the space.
 */
import { sql } from "drizzle-orm";
import { generateInviteCode } from "../../shared/invite-code.ts";
import type { LeaveResponse } from "../../shared/schemas/spaces.ts";
import { withTx, type DbContext, type Tx } from "../db/client.ts";
import { isUniqueViolation } from "../errors.ts";

export const FORMER_PARTNER = "Former partner";

/** Every column that points at user.id without a cascade: these rows keep the person's attribution. */
const ATTRIBUTION: readonly (readonly [string, string])[] = [
  ["spaces", "created_by"],
  ["goals", "created_by"],
  ["goals", "completed_by"],
  ["goal_entries", "created_by"],
  ["goal_notes", "created_by"],
  ["goal_note_blocks", "created_by"],
  ["trips", "created_by"],
  ["trip_places", "created_by"],
  ["trip_plan_entries", "created_by"],
  ["trip_plan_entries", "done_by"],
  ["trip_checklist_items", "created_by"],
  ["trip_checklist_items", "done_by"],
  ["shopping_items", "created_by"],
  ["shopping_items", "bought_by"],
];

interface Left extends LeaveResponse {
  /** Cloudinary public ids of the deleted space's photos, to destroy after commit. */
  assets: string[];
}

/** One draw per attempt; the 1-in-10^11 collision on the unique code starts the transaction again. */
async function withFreshCode<T>(fn: (code: string) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await fn(generateInviteCode());
    } catch (err) {
      if (isUniqueViolation(err, "spaces_invite_code_unique")) continue;
      throw err;
    }
  }
  throw new Error("could not draw a unique invite code");
}

/**
 * Removes the person's membership. A partner who stays keeps the space and everything in it, and the invite code
 * is rotated so the leaver's copy is dead and the freed seat can be offered to someone new. The last member
 * leaving deletes the space (everything in it cascades).
 */
async function leaveInTx(tx: Tx, userId: string, newCode: string): Promise<Left> {
  const own = await tx.execute<{ space_id: string }>(sql`
    select s.id as space_id from space_members sm join spaces s on s.id = sm.space_id
    where sm.user_id = ${userId}
    for update of s`);
  const spaceId = own.rows[0]?.space_id;
  if (!spaceId) return { left: false, deleted: false, assets: [] };

  const members = await tx.execute<{ n: number }>(
    sql`select count(*)::int as n from space_members where space_id = ${spaceId}`,
  );
  if (Number(members.rows[0]?.n ?? 0) <= 1) {
    const photos = await tx.execute<{ id: string }>(sql`
      select cover->>'publicId' as id from goals where space_id = ${spaceId} and cover is not null
      union select cover->>'publicId' from trips where space_id = ${spaceId} and cover is not null
      union select image->>'publicId' from goal_note_blocks where space_id = ${spaceId} and image is not null`);
    await tx.execute(sql`delete from spaces where id = ${spaceId}`);
    return { left: true, deleted: true, assets: photos.rows.map((r) => r.id).filter(Boolean) };
  }

  await tx.execute(sql`delete from space_members where space_id = ${spaceId} and user_id = ${userId}`);
  await tx.execute(sql`
    update spaces set invite_code = ${newCode}, invite_code_rotated_at = now(), updated_at = now()
    where id = ${spaceId}`);
  return { left: true, deleted: false, assets: [] };
}

/** POST /api/spaces/mine/leave. Answers `left: false` when there was nothing to leave (a retry). */
export function leaveSpace(c: DbContext, userId: string): Promise<Left> {
  return withFreshCode((code) => withTx(c, (tx) => leaveInTx(tx, userId, code)));
}

/**
 * DELETE /api/me, after the password was checked. Leaves the space as above, then removes the person: the row is
 * deleted for real when nothing references it, otherwise anonymised (other tables point at user.id without cascade,
 * so partner-visible history keeps its attribution). Either way no session or password survives.
 */
export function deleteAccount(c: DbContext, userId: string): Promise<{ assets: string[]; anonymised: boolean }> {
  return withFreshCode((code) =>
    withTx(c, async (tx) => {
      const left = await leaveInTx(tx, userId, code);
      const checks = ATTRIBUTION.map(
        ([table, column]) => sql`exists (select 1 from ${sql.raw(table)} where ${sql.raw(column)} = ${userId})`,
      );
      const ref = await tx.execute<{ referenced: boolean }>(sql`select (${sql.join(checks, sql` or `)}) as referenced`);
      if (ref.rows[0]?.referenced) {
        await tx.execute(sql`
          update "user" set display_name = ${FORMER_PARTNER}, email = ${`deleted-${userId}@zamane.invalid`},
            email_verified = false, image = null, updated_at = now()
          where id = ${userId}`);
        await tx.execute(sql`delete from session where user_id = ${userId}`);
        await tx.execute(sql`delete from account where user_id = ${userId}`);
        await tx.execute(sql`delete from verification where value = ${userId}`);
        return { assets: left.assets, anonymised: true };
      }
      await tx.execute(sql`delete from "user" where id = ${userId}`); // session, account, membership cascade
      await tx.execute(sql`delete from verification where value = ${userId}`);
      return { assets: left.assets, anonymised: false };
    }),
  );
}
