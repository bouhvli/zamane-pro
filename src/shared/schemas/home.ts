import { z } from "zod";
import { CAPS, type GoalKind, type Slot } from "../enums.ts";

/** POST /api/goals/:goalId/entries. Exactly one of amount (money goals, minor units) or percent (general goals). */
export const createEntrySchema = z
  .object({
    id: z.uuid(),
    amount: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional(),
    percent: z.number().int().min(0).max(100).optional(),
    note: z.string().trim().max(CAPS.notes).optional(),
  })
  .refine((v) => (v.amount === undefined) !== (v.percent === undefined), {
    message: "Send an amount or a percent.",
    path: ["amount"],
  });
export type CreateEntryInput = z.input<typeof createEntrySchema>;

export interface LastEntry {
  userId: string;
  amount: number | null;
  percent: number | null;
  note: string | null;
  at: string;
}

export interface HomeGoal {
  id: string;
  kind: GoalKind;
  title: string;
  /** Money: the sum of entries (minor units). General: the latest percent. */
  progress: number;
  target: number | null;
  completedAt: string | null;
  last: LastEntry | null;
}

export interface HomeTrip {
  id: string;
  title: string;
  destination: string | null;
  startDate: string | null;
  endDate: string | null;
}

export interface HomeResponse {
  currency: string;
  /** Every money-goal entry in the space, completed goals included (§4.3). */
  total: number;
  goals: HomeGoal[];
  /** Dated trips that haven't ended (by the server's date, give or take a day); the device picks "now / next". */
  trips: HomeTrip[];
  shoppingLeft: number;
  members: { userId: string; displayName: string; slot: Slot }[];
  /** Only while the space has one member (first-run): the code to share. */
  inviteCode: string | null;
}

export interface EntryResponse {
  entry: {
    id: string;
    goalId: string;
    amount: number | null;
    percent: number | null;
    note: string | null;
    createdAt: string;
  };
  goal: { id: string; progress: number; completedAt: string | null };
  /** True when this entry made the goal cross its target. */
  completed: boolean;
}
