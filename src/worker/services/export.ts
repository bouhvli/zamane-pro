/**
 * GET /api/me/export (D69): everything the caller can see, as one JSON document. Reads only, and every query is
 * scoped by the caller's space. People are written as names, never as ids; a person who has left shows as
 * "Former partner". Money is in minor units (cents) in the space's currency.
 */
import { asc, eq } from "drizzle-orm";
import { db, type DbContext } from "../db/client.ts";
import {
  goalEntries,
  goalNoteBlocks,
  goalNotes,
  goals,
  shoppingItems,
  spaceMembers,
  spaces,
  tripChecklistItems,
  tripPlaces,
  tripPlanEntries,
  trips,
  user,
  type ImageAsset,
} from "../db/schema.ts";
import { ApiError } from "../errors.ts";
import { FORMER_PARTNER } from "./account.ts";

const iso = (d: Date | null) => (d ? d.toISOString() : null);

export async function exportData(c: DbContext, userId: string, spaceId: string, cloudName: string) {
  const d = db(c);
  const [me] = await d
    .select({ displayName: user.displayName, email: user.email })
    .from(user)
    .where(eq(user.id, userId));
  const [space] = await d.select().from(spaces).where(eq(spaces.id, spaceId));
  if (!me || !space) throw new ApiError(404, "not_found", "Not found.");
  const members = await d
    .select({ userId: spaceMembers.userId, displayName: user.displayName, slot: spaceMembers.slot })
    .from(spaceMembers)
    .innerJoin(user, eq(user.id, spaceMembers.userId))
    .where(eq(spaceMembers.spaceId, spaceId))
    .orderBy(asc(spaceMembers.slot));

  const [g, ge, gn, gb, t, tp, te, tc, si] = await Promise.all([
    d.select().from(goals).where(eq(goals.spaceId, spaceId)).orderBy(asc(goals.createdAt), asc(goals.id)),
    d
      .select()
      .from(goalEntries)
      .where(eq(goalEntries.spaceId, spaceId))
      .orderBy(asc(goalEntries.createdAt), asc(goalEntries.id)),
    d
      .select()
      .from(goalNotes)
      .where(eq(goalNotes.spaceId, spaceId))
      .orderBy(asc(goalNotes.createdAt), asc(goalNotes.id)),
    d
      .select()
      .from(goalNoteBlocks)
      .where(eq(goalNoteBlocks.spaceId, spaceId))
      .orderBy(asc(goalNoteBlocks.noteId), asc(goalNoteBlocks.position)),
    d.select().from(trips).where(eq(trips.spaceId, spaceId)).orderBy(asc(trips.createdAt), asc(trips.id)),
    d
      .select()
      .from(tripPlaces)
      .where(eq(tripPlaces.spaceId, spaceId))
      .orderBy(asc(tripPlaces.createdAt), asc(tripPlaces.id)),
    d
      .select()
      .from(tripPlanEntries)
      .where(eq(tripPlanEntries.spaceId, spaceId))
      .orderBy(asc(tripPlanEntries.date), asc(tripPlanEntries.startTime), asc(tripPlanEntries.createdAt)),
    d
      .select()
      .from(tripChecklistItems)
      .where(eq(tripChecklistItems.spaceId, spaceId))
      .orderBy(asc(tripChecklistItems.group), asc(tripChecklistItems.position)),
    d
      .select()
      .from(shoppingItems)
      .where(eq(shoppingItems.spaceId, spaceId))
      .orderBy(asc(shoppingItems.createdAt), asc(shoppingItems.id)),
  ]);

  const names = new Map(members.map((m) => [m.userId, m.displayName]));
  const who = (id: string | null) => (id ? (names.get(id) ?? FORMER_PARTNER) : null);
  const photo = (a: ImageAsset | null) =>
    a
      ? {
          publicId: a.publicId,
          width: a.width,
          height: a.height,
          format: a.format,
          url: cloudName
            ? `https://res.cloudinary.com/${cloudName}/image/upload/v${a.version}/${a.publicId}.${a.format}`
            : null,
        }
      : null;

  return {
    format: "zamane-export",
    version: 1,
    exportedAt: new Date().toISOString(),
    notes: "Money amounts are in minor units (cents) of the space's currency. People appear by first name.",
    user: { displayName: me.displayName, email: me.email },
    space: {
      name: space.name,
      currency: space.currency.trim(),
      timezone: space.timezone,
      createdAt: iso(space.createdAt),
      members: members.map((m) => ({ displayName: m.displayName })),
    },
    goals: g.map((x) => ({
      id: x.id,
      kind: x.kind,
      title: x.title,
      description: x.description,
      targetAmount: x.targetAmount,
      targetDate: x.targetDate,
      cover: photo(x.cover),
      completedAt: iso(x.completedAt),
      completedBy: who(x.completedBy),
      createdBy: who(x.createdBy),
      createdAt: iso(x.createdAt),
      entries: ge
        .filter((e) => e.goalId === x.id)
        .map((e) => ({
          id: e.id,
          amount: e.amount,
          percent: e.percent,
          note: e.note,
          createdBy: who(e.createdBy),
          createdAt: iso(e.createdAt),
        })),
      notes: gn
        .filter((n) => n.goalId === x.id)
        .map((n) => ({
          id: n.id,
          createdBy: who(n.createdBy),
          createdAt: iso(n.createdAt),
          updatedAt: iso(n.updatedAt),
          blocks: gb
            .filter((b) => b.noteId === n.id)
            .map((b) => ({
              kind: b.kind,
              text: b.text,
              photo: photo(b.image),
              photoDescription: b.alt,
            })),
        })),
    })),
    trips: t.map((x) => ({
      id: x.id,
      title: x.title,
      destination: x.destination,
      startDate: x.startDate,
      endDate: x.endDate,
      budget: x.budget,
      notes: x.notes,
      cover: photo(x.cover),
      createdBy: who(x.createdBy),
      createdAt: iso(x.createdAt),
      plan: te
        .filter((e) => e.tripId === x.id)
        .map((e) => ({
          id: e.id,
          type: e.type,
          title: e.title,
          date: e.date,
          startTime: e.startTime,
          endTime: e.endTime,
          location: e.location,
          cost: e.cost,
          url: e.url,
          notes: e.notes,
          doneAt: iso(e.doneAt),
          doneBy: who(e.doneBy),
          placeId: e.placeId,
          createdBy: who(e.createdBy),
        })),
      places: tp
        .filter((p) => p.tripId === x.id)
        .map((p) => ({
          id: p.id,
          type: p.type,
          title: p.title,
          area: p.area,
          notes: p.notes,
          url: p.url,
          estimatedCost: p.estimatedCost,
          mustDo: p.mustDo,
          createdBy: who(p.createdBy),
        })),
      checklist: tc
        .filter((i) => i.tripId === x.id)
        .map((i) => ({
          id: i.id,
          group: i.group,
          title: i.title,
          position: i.position,
          doneAt: iso(i.doneAt),
          doneBy: who(i.doneBy),
          createdBy: i.seeded ? null : who(i.createdBy),
        })),
    })),
    shopping: si.map((s) => ({
      id: s.id,
      name: s.name,
      quantity: s.quantity,
      unit: s.unit,
      category: s.category,
      notes: s.notes,
      addedBy: who(s.createdBy),
      addedAt: iso(s.createdAt),
      boughtAt: iso(s.boughtAt),
      boughtBy: who(s.boughtBy),
    })),
  };
}
