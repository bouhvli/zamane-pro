/**
 * Spaces: create, join, switch, rotate (§4.1, §5, §12). Every function takes what it scopes on as an argument.
 * The two-member rule lives in the constraints: UNIQUE(space_id, slot) with slot ∈ {a, b}, and UNIQUE(user_id).
 */
import { and, asc, count, eq, sql } from "drizzle-orm";
import { generateInviteCode } from "../../shared/invite-code.ts";
import type { CreateSpaceInput, JoinResponse, MeResponse, MySpace, SoloSummary } from "../../shared/schemas/spaces.ts";
import type { Slot } from "../../shared/enums.ts";
import { atomic, db, withTx, type DbContext } from "../db/client.ts";
import { goals, shoppingItems, spaceMembers, spaces, trips, user } from "../db/schema.ts";
import { ApiError, isUniqueViolation, pgError } from "../errors.ts";

const INVITE_INVALID_MESSAGE = "That code didn't work. Check it with your partner, or ask them to share a new one.";
export const inviteInvalid = () => new ApiError(404, "invite_invalid", INVITE_INVALID_MESSAGE);
export const alreadyInSpace = () => new ApiError(409, "already_in_space", "You're already in a space.");

interface Membership {
  spaceId: string;
  slot: Slot;
  inviteCode: string;
}

export async function getMembership(c: DbContext, userId: string): Promise<Membership | null> {
  const [row] = await db(c)
    .select({ spaceId: spaceMembers.spaceId, slot: spaceMembers.slot, inviteCode: spaces.inviteCode })
    .from(spaceMembers)
    .innerJoin(spaces, eq(spaces.id, spaceMembers.spaceId))
    .where(eq(spaceMembers.userId, userId))
    .limit(1);
  return row ?? null;
}

async function partnerName(c: DbContext, spaceId: string, userId: string): Promise<string | null> {
  const rows = await db(c)
    .select({ userId: spaceMembers.userId, name: user.displayName })
    .from(spaceMembers)
    .innerJoin(user, eq(user.id, spaceMembers.userId))
    .where(eq(spaceMembers.spaceId, spaceId));
  return rows.find((r) => r.userId !== userId)?.name ?? null;
}

// ---------- create ----------

/** POST /api/spaces. Idempotent on the client's id: a replay answers 200 with the same space (§5). */
export async function createSpace(
  c: DbContext,
  userId: string,
  input: Required<CreateSpaceInput>,
): Promise<{ status: 200 | 201; space: MySpace }> {
  const existing = await getMembership(c, userId);
  if (existing) {
    if (existing.spaceId === input.id) return { status: 200, space: await getMySpace(c, existing.spaceId, userId) };
    throw alreadyInSpace();
  }
  const d = db(c);
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await atomic(c, [
        d.insert(spaces).values({
          id: input.id,
          name: input.name,
          currency: input.currency,
          timezone: input.timezone,
          inviteCode: generateInviteCode(),
          createdBy: userId,
        }),
        d.insert(spaceMembers).values({ spaceId: input.id, userId, slot: "a" }),
      ]);
      return { status: 201, space: await getMySpace(c, input.id, userId) };
    } catch (err) {
      if (isUniqueViolation(err, "spaces_invite_code_unique")) continue; // 1 in ~10^11: draw again
      if (isUniqueViolation(err)) {
        const now = await getMembership(c, userId);
        if (now?.spaceId === input.id) return { status: 200, space: await getMySpace(c, input.id, userId) };
        if (now) throw alreadyInSpace();
        throw new ApiError(409, "id_conflict", "That id is already used.");
      }
      throw err;
    }
  }
  throw new Error("could not draw a unique invite code");
}

// ---------- join ----------

/**
 * POST /api/spaces/join. One statement; the constraints arbitrate. Zero rows means the code is unknown or the space
 * is full, and both get the same 404 invite_invalid (§4.1). A retry by someone already in that space answers 200.
 */
export async function joinSpace(c: DbContext, userId: string, code: string): Promise<JoinResponse> {
  const existing = await getMembership(c, userId);
  if (existing) {
    if (existing.inviteCode === code) return joined(c, existing.spaceId, userId);
    throw alreadyInSpace();
  }
  let rows: { space_id: string }[];
  try {
    const res = await db(c).execute<{ space_id: string }>(sql`
      insert into space_members (space_id, user_id, slot)
      select s.id, ${userId}, 'b' from spaces s where s.invite_code = ${code}
      on conflict do nothing
      returning space_id`);
    rows = res.rows;
  } catch (err) {
    if (pgError(err)?.code === "23503") throw inviteInvalid(); // the space was deleted while joining
    throw err;
  }
  if (rows[0]) return joined(c, rows[0].space_id, userId);
  // Raced from another tab, or a real refusal.
  const now = await getMembership(c, userId);
  if (now && now.inviteCode === code) return joined(c, now.spaceId, userId);
  if (now) throw alreadyInSpace();
  throw inviteInvalid();
}

async function joined(c: DbContext, spaceId: string, userId: string): Promise<JoinResponse> {
  const [s] = await db(c).select({ id: spaces.id, name: spaces.name }).from(spaces).where(eq(spaces.id, spaceId));
  if (!s) throw inviteInvalid();
  return { space: s, partnerName: await partnerName(c, spaceId, userId) };
}

/**
 * The switch (D33): someone alone in a space they started joins their partner's instead. In one transaction:
 * lock their space, check they're still alone, check the code (before anything is deleted), delete their space
 * (cascade), join. A partner joining the solo space at the same moment either commits first (→ 409 partner_joined)
 * or finds the space gone (→ invite_invalid on their side).
 */
export async function switchAndJoin(c: DbContext, userId: string, code: string): Promise<JoinResponse> {
  const spaceId = await withTx(c, async (tx) => {
    const own = await tx.execute<{ space_id: string; invite_code: string }>(sql`
      select s.id as space_id, s.invite_code from space_members sm
      join spaces s on s.id = sm.space_id
      where sm.user_id = ${userId}
      for update of s`);
    const mine = own.rows[0];
    if (!mine) return null; // no space any more: a plain join below
    if (mine.invite_code === code) throw inviteInvalid();

    const members = await tx.execute<{ user_id: string; display_name: string }>(sql`
      select sm.user_id, u.display_name from space_members sm join "user" u on u.id = sm.user_id
      where sm.space_id = ${mine.space_id}`);
    const partner = members.rows.find((m) => m.user_id !== userId);
    if (partner) {
      throw new ApiError(
        409,
        "partner_joined",
        `${partner.display_name} already joined your space.`,
        undefined,
        undefined,
      );
    }

    const target = await tx.execute<{ id: string; members: number }>(sql`
      select s.id, (select count(*)::int from space_members m where m.space_id = s.id) as members
      from spaces s where s.invite_code = ${code}`);
    const t = target.rows[0];
    if (!t || t.members >= 2) throw inviteInvalid();

    await tx.execute(sql`delete from spaces where id = ${mine.space_id}`);
    const ins = await tx.execute<{ space_id: string }>(sql`
      insert into space_members (space_id, user_id, slot) values (${t.id}, ${userId}, 'b')
      on conflict do nothing returning space_id`);
    if (!ins.rows[0]) throw inviteInvalid(); // slot b taken meanwhile: roll the delete back too
    return t.id;
  });
  if (spaceId === null) return joinSpace(c, userId, code);
  return joined(c, spaceId, userId);
}

// ---------- read, rotate ----------

export async function getMySpace(c: DbContext, spaceId: string, userId: string): Promise<MySpace> {
  const d = db(c);
  const [s] = await d.select().from(spaces).where(eq(spaces.id, spaceId));
  if (!s) throw new ApiError(404, "not_found", "Not found.");
  const members = await d
    .select({
      userId: spaceMembers.userId,
      displayName: user.displayName,
      slot: spaceMembers.slot,
      joinedAt: spaceMembers.joinedAt,
    })
    .from(spaceMembers)
    .innerJoin(user, eq(user.id, spaceMembers.userId))
    .where(eq(spaceMembers.spaceId, spaceId))
    .orderBy(asc(spaceMembers.slot));
  const me = members.find((m) => m.userId === userId);
  if (!me) throw new ApiError(404, "not_found", "Not found.");
  return {
    id: s.id,
    name: s.name,
    currency: s.currency,
    timezone: s.timezone,
    // Once the partner has joined, nobody needs the code: it isn't sent (it comes back when someone leaves).
    inviteCode: members.length >= 2 ? null : s.inviteCode,
    inviteCodeRotatedAt: s.inviteCodeRotatedAt?.toISOString() ?? null,
    slot: me.slot,
    members: members.map((m) => ({ ...m, joinedAt: m.joinedAt.toISOString() })),
  };
}

export async function rotateInviteCode(c: DbContext, spaceId: string): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateInviteCode();
    try {
      const [row] = await db(c)
        .update(spaces)
        .set({ inviteCode: code, inviteCodeRotatedAt: new Date(), updatedAt: new Date() })
        .where(
          and(
            eq(spaces.id, spaceId),
            sql`(select count(*) from space_members m where m.space_id = ${spaces.id}) < 2`, // a partner joining meanwhile wins
          ),
        )
        .returning({ inviteCode: spaces.inviteCode });
      if (!row) throw new ApiError(409, "partner_joined", "Your partner has already joined.");
      return row.inviteCode;
    } catch (err) {
      if (isUniqueViolation(err, "spaces_invite_code_unique")) continue;
      throw err;
    }
  }
  throw new Error("could not draw a unique invite code");
}

/** PATCH /api/spaces/mine: any member may rename. Currency and time zone never change. */
export async function renameSpace(c: DbContext, spaceId: string, name: string): Promise<void> {
  const rows = await db(c)
    .update(spaces)
    .set({ name, updatedAt: new Date() })
    .where(eq(spaces.id, spaceId))
    .returning({ id: spaces.id });
  if (!rows[0]) throw new ApiError(404, "not_found", "Not found.");
}

/** What the switch would delete: shown in its confirmation. */
export async function soloSummary(c: DbContext, spaceId: string): Promise<SoloSummary> {
  const d = db(c);
  const [g, t, i] = await Promise.all([
    d.select({ n: count() }).from(goals).where(eq(goals.spaceId, spaceId)),
    d.select({ n: count() }).from(trips).where(eq(trips.spaceId, spaceId)),
    d.select({ n: count() }).from(shoppingItems).where(eq(shoppingItems.spaceId, spaceId)),
  ]);
  return { goals: g[0]?.n ?? 0, trips: t[0]?.n ?? 0, items: i[0]?.n ?? 0 };
}

// ---------- me ----------

export async function getMe(c: DbContext, userId: string): Promise<MeResponse | null> {
  const [row] = await db(c)
    .select({
      id: user.id,
      displayName: user.displayName,
      email: user.email,
      spaceId: spaces.id,
      spaceName: spaces.name,
      currency: spaces.currency,
      timezone: spaces.timezone,
      slot: spaceMembers.slot,
      memberCount: sql<number>`(select count(*)::int from space_members m where m.space_id = ${spaces.id})`,
    })
    .from(user)
    .leftJoin(spaceMembers, eq(spaceMembers.userId, user.id))
    .leftJoin(spaces, eq(spaces.id, spaceMembers.spaceId))
    .where(eq(user.id, userId))
    .limit(1);
  if (!row) return null;
  return {
    user: { id: row.id, displayName: row.displayName, email: row.email },
    space:
      row.spaceId && row.spaceName && row.currency && row.timezone && row.slot
        ? {
            id: row.spaceId,
            name: row.spaceName,
            currency: row.currency,
            timezone: row.timezone,
            slot: row.slot,
            memberCount: Number(row.memberCount),
          }
        : null,
  };
}

export async function updateDisplayName(c: DbContext, userId: string, displayName: string): Promise<void> {
  await db(c)
    .update(user)
    .set({ displayName, updatedAt: new Date() })
    .where(and(eq(user.id, userId)));
}
