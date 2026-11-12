import { z } from "zod";
import type { Slot } from "../enums.ts";

/**
 * The shared shopping list, shared by the Worker and the client. Limits and messages are the design's
 * (.ux-forge/shopping copy.md and form.js), within the database caps of §4.1 (D62).
 */
/** The units a quantity is counted in; the code is stored, the label is the client's. */
export const SHOP_UNITS = ["piece", "l", "g", "kg"] as const;
export type ShopUnit = (typeof SHOP_UNITS)[number];

export const SHOP_LIMITS = {
  name: 120,
  category: 120,
  notes: 4000,
  notesCountFrom: 3800,
  quantityMax: 9999,
  /** One restore (Undo of clear bought) carries at most this many rows. */
  restoreMax: 200,
} as const;

const sentence = (n: number) => `Use ${n.toLocaleString("en-US")} characters or fewer.`;

export const SHOP_MSG = {
  nameEmpty: "Add a name.",
  nameLong: sentence(SHOP_LIMITS.name),
  quantity: "Use a whole number from 1.",
  quantityMax: `Use a number up to ${SHOP_LIMITS.quantityMax}.`,
  categoryLong: sentence(SHOP_LIMITS.category),
  unit: "Pick a unit from the list.",
  notesLong: sentence(SHOP_LIMITS.notes),
} as const;

const text = (max: number, tooLong: string) =>
  z
    .string()
    .trim()
    .refine((v) => Array.from(v).length <= max, tooLong);
const name = z
  .string()
  .trim()
  .min(1, SHOP_MSG.nameEmpty)
  .refine((v) => Array.from(v).length <= SHOP_LIMITS.name, SHOP_MSG.nameLong);
const quantity = z
  .number()
  .int(SHOP_MSG.quantity)
  .min(1, SHOP_MSG.quantity)
  .max(SHOP_LIMITS.quantityMax, SHOP_MSG.quantityMax);
const unit = z.enum(SHOP_UNITS, SHOP_MSG.unit);
const category = text(SHOP_LIMITS.category, SHOP_MSG.categoryLong);
const notes = text(SHOP_LIMITS.notes, SHOP_MSG.notesLong);

/** Quick capture needs the name alone (§5); the id is the client's, so a replayed add is a no-op. */
export const createItemSchema = z.object({
  id: z.uuid(),
  name,
  quantity: quantity.optional(),
  category: category.nullable().optional(),
  unit: unit.optional(),
  notes: notes.nullable().optional(),
});
export type CreateItemInput = z.input<typeof createItemSchema>;

export const updateItemSchema = z.object({
  name: name.optional(),
  quantity: quantity.optional(),
  category: category.nullable().optional(),
  unit: unit.optional(),
  notes: notes.nullable().optional(),
  updatedAt: z.iso.datetime({ offset: true }),
});
export type UpdateItemInput = z.input<typeof updateItemSchema>;

/** Ticks set state, they don't toggle (D9). */
export const boughtSchema = z.object({ bought: z.boolean() });

/** Undo of a delete or of clear bought: the rows come back with their ids and attribution (D62). */
export const restoreSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.uuid(),
        name,
        quantity,
        category: category.nullable(),
        unit,
        notes: notes.nullable(),
        boughtAt: z.iso.datetime({ offset: true }).nullable(),
        boughtBy: z.uuid().nullable(),
        createdBy: z.uuid(),
        createdAt: z.iso.datetime({ offset: true }),
      }),
    )
    .min(1)
    .max(SHOP_LIMITS.restoreMax),
});
export type RestoreInput = z.input<typeof restoreSchema>;

// ---------- views ----------

export interface ShoppingItemView {
  id: string;
  name: string;
  quantity: number;
  /** As typed (the existing spelling when the key already exists); null = Other. */
  category: string | null;
  unit: ShopUnit;
  notes: string;
  boughtAt: string | null;
  boughtBy: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShoppingResponse {
  currency: string;
  items: ShoppingItemView[];
  members: { userId: string; displayName: string; slot: Slot }[];
}
