/**
 * pnpm db:seed (§4.4), guarded. Creates Sara and Youssef with known dev passwords and a shared space (EUR,
 * Europe/Brussels) with demo data:
 *   - a money goal with entries from both, a completed money goal, a general goal at 60%;
 *   - a trip with plan entries across three days (one empty day, one entry dated outside the range), places (one
 *     scheduled, one must-do) and a checklist;
 *   - a shopping list with categories and one bought item.
 * Re-running replaces the demo couple and their space. Tests reuse the same builders (tests/fixtures.ts).
 */
import { neon } from "@neondatabase/serverless";
import { hashPassword } from "better-auth/crypto";
import { inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { existsSync } from "node:fs";
import { v7 as uuidv7 } from "uuid";
import { categoryKey } from "../src/shared/category.ts";
import { generateInviteCode } from "../src/shared/invite-code.ts";
import * as schema from "../src/worker/db/schema.ts";
import { assertSafeBranch } from "./db-guard.ts";

export const DEMO = {
  sara: { name: "Sara", email: "sara@example.com", password: "sara-dev-password" },
  youssef: { name: "Youssef", email: "youssef@example.com", password: "youssef-dev-password" },
  space: { name: "Our space", currency: "EUR", timezone: "Europe/Brussels" },
} as const;

const day = (offset: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};
const ago = (days: number) => new Date(Date.now() - days * 86_400_000);

async function main() {
  try {
    const name = await assertSafeBranch();
    console.log(`db guard: OK, branch "${name}".`);
  } catch (e) {
    console.error(`db guard: refused. ${e instanceof Error ? e.message : "unknown error"}`);
    process.exit(1);
  }
  if (existsSync(".env")) process.loadEnvFile(".env");
  const db = drizzle({ client: neon(process.env.DATABASE_URL!), schema });
  const s = schema;

  // Replace the demo couple: their spaces (cascade) first, then the users (cascade: sessions, accounts).
  const old = await db
    .select({ id: s.user.id })
    .from(s.user)
    .where(inArray(s.user.email, [DEMO.sara.email, DEMO.youssef.email]));
  if (old.length) {
    const ids = old.map((u) => u.id);
    const spaces = await db
      .select({ id: s.spaceMembers.spaceId })
      .from(s.spaceMembers)
      .where(inArray(s.spaceMembers.userId, ids));
    if (spaces.length)
      await db.delete(s.spaces).where(
        inArray(
          s.spaces.id,
          spaces.map((x) => x.id),
        ),
      );
    await db.delete(s.user).where(inArray(s.user.id, ids));
  }

  const sara = uuidv7();
  const youssef = uuidv7();
  const spaceId = uuidv7();
  const [saraHash, youssefHash] = await Promise.all([
    hashPassword(DEMO.sara.password),
    hashPassword(DEMO.youssef.password),
  ]);

  const wedding = uuidv7();
  const sofa = uuidv7();
  const spanish = uuidv7();
  const trip = uuidv7();
  const riad = uuidv7();
  const souk = uuidv7();
  const tripStart = day(14);

  await db.batch([
    db.insert(s.user).values([
      { id: sara, displayName: DEMO.sara.name, email: DEMO.sara.email, emailVerified: false },
      { id: youssef, displayName: DEMO.youssef.name, email: DEMO.youssef.email, emailVerified: false },
    ]),
    db.insert(s.account).values([
      { id: uuidv7(), accountId: sara, providerId: "credential", userId: sara, password: saraHash },
      { id: uuidv7(), accountId: youssef, providerId: "credential", userId: youssef, password: youssefHash },
    ]),
    db.insert(s.spaces).values({ id: spaceId, ...DEMO.space, inviteCode: generateInviteCode(), createdBy: sara }),
    db.insert(s.spaceMembers).values([
      { spaceId, userId: sara, slot: "a" },
      { spaceId, userId: youssef, slot: "b" },
    ]),
    // Goals: open money goal, completed money goal, general goal at 60%.
    db.insert(s.goals).values([
      {
        id: wedding,
        spaceId,
        kind: "money",
        title: "Wedding fund",
        targetAmount: 2_000_000,
        targetDate: day(240),
        createdBy: sara,
      },
      {
        id: sofa,
        spaceId,
        kind: "money",
        title: "New sofa",
        targetAmount: 120_000,
        completedAt: ago(3),
        completedBy: youssef,
        createdBy: youssef,
      },
      { id: spanish, spaceId, kind: "general", title: "Learn Spanish", createdBy: sara },
    ]),
    db.insert(s.goalEntries).values([
      { id: uuidv7(), spaceId, goalId: wedding, amount: 500_000, createdBy: sara, createdAt: ago(40) },
      {
        id: uuidv7(),
        spaceId,
        goalId: wedding,
        amount: 350_000,
        note: "Bonus",
        createdBy: youssef,
        createdAt: ago(20),
      },
      { id: uuidv7(), spaceId, goalId: wedding, amount: 50_000, createdBy: sara, createdAt: ago(2) },
      { id: uuidv7(), spaceId, goalId: sofa, amount: 80_000, createdBy: youssef, createdAt: ago(30) },
      { id: uuidv7(), spaceId, goalId: sofa, amount: 40_000, createdBy: sara, createdAt: ago(3) },
      { id: uuidv7(), spaceId, goalId: spanish, percent: 30, createdBy: sara, createdAt: ago(25) },
      { id: uuidv7(), spaceId, goalId: spanish, percent: 60, createdBy: sara, createdAt: ago(5) },
    ]),
    // A trip of three days: day 2 is empty; one entry falls outside the dates.
    db.insert(s.trips).values({
      id: trip,
      spaceId,
      title: "Chefchaouen",
      destination: "Rif mountains",
      startDate: tripStart,
      endDate: day(16),
      budget: 80_000,
      createdBy: sara,
    }),
    db.insert(s.tripPlaces).values([
      {
        id: riad,
        spaceId,
        tripId: trip,
        type: "stay",
        title: "Riad Lina",
        area: "Medina",
        estimatedCost: 30_000,
        createdBy: sara,
      },
      {
        id: souk,
        spaceId,
        tripId: trip,
        type: "sight",
        title: "Ras El Maa",
        area: "Old town",
        mustDo: true,
        createdBy: youssef,
      },
    ]),
    db.insert(s.tripPlanEntries).values([
      {
        id: uuidv7(),
        spaceId,
        tripId: trip,
        type: "transport",
        title: "Bus from Fes",
        date: tripStart,
        startTime: "08:30",
        cost: 6_000,
        createdBy: youssef,
      },
      {
        id: uuidv7(),
        spaceId,
        tripId: trip,
        type: "stay",
        title: "Riad Lina",
        date: tripStart,
        location: "Medina",
        cost: 30_000,
        placeId: riad,
        createdBy: sara,
      },
      {
        id: uuidv7(),
        spaceId,
        tripId: trip,
        type: "food",
        title: "Dinner at Bab Ssour",
        date: day(16),
        startTime: "20:00",
        cost: 2_500,
        createdBy: sara,
      },
      {
        id: uuidv7(),
        spaceId,
        tripId: trip,
        type: "other",
        title: "Pick up the car",
        date: day(13),
        createdBy: youssef,
      },
    ]),
    db.insert(s.tripChecklistItems).values(
      [
        ["packing", "Warm jumper"],
        ["packing", "Walking shoes"],
        ["documents", "ID cards"],
        ["bookings", "Confirm the riad"],
        ["todo", "Water the plants"],
      ].map(([group, title], position) => ({
        id: uuidv7(),
        spaceId,
        tripId: trip,
        group: group as "packing" | "documents" | "bookings" | "todo",
        title: title!,
        position,
        createdBy: sara,
      })),
    ),
    db.insert(s.shoppingItems).values(
      [
        { name: "Olive oil", quantity: 2, unit: "l", category: "Pantry", by: sara },
        { name: "Mint", category: "Fruit & Veg", notes: "fresh, big bunch", by: youssef },
        { name: "Tomatoes", quantity: 1, unit: "kg", category: "fruit & veg", by: sara },
        { name: "Dish soap", category: "Home", by: youssef },
        { name: "Milk", quantity: 2, unit: "l", category: "Dairy", by: youssef, bought: true },
      ].map((i) => ({
        id: uuidv7(),
        spaceId,
        name: i.name,
        quantity: i.quantity ?? 1,
        category: i.category,
        categoryKey: categoryKey(i.category),
        unit: i.unit ?? "piece",
        notes: i.notes ?? null,
        boughtAt: i.bought ? ago(1) : null,
        boughtBy: i.bought ? sara : null,
        createdBy: i.by,
      })),
    ),
  ]);

  console.log(
    `Seeded "${DEMO.space.name}" for ${DEMO.sara.email} and ${DEMO.youssef.email} (dev passwords are in scripts/seed.ts).`,
  );
}

await main();
