import { z } from "zod";
import { CHECKLIST_GROUPS, TRIP_ITEM_TYPES, type ChecklistGroup, type Slot, type TripItemType } from "../enums.ts";
import { imageAssetSchema, type ImageAsset } from "./goals.ts";

/**
 * Trips, their plan, places and checklist, shared by the Worker and the client. Limits and messages are the
 * designs' (.ux-forge/trips form.js and dialogs.js), within the database caps of §4.1 (D59).
 */
export const TRIP_LIMITS = {
  title: 80,
  destination: 80,
  notes: 4000,
  notesCountFrom: 3600,
  location: 120,
  area: 80,
  url: 2000,
  item: 80,
  /** In whole currency units (dialogs.js MONEY_MAX); the form turns it into minor units for the currency. */
  moneyMax: 1_000_000,
  /** The server's outer bound in minor units (covers a currency with three decimals). */
  moneyMaxMinor: 1_000_000_000,
  longTripDays: 31,
  photoBytes: 10 * 1024 * 1024,
} as const;

const sentence = (n: number, what: string) => `Use ${n.toLocaleString("en-US")} characters or fewer for the ${what}.`;

export const TRIP_MSG = {
  titleEmpty: "Enter a title for the trip.",
  titleLong: sentence(TRIP_LIMITS.title, "title"),
  destinationLong: sentence(TRIP_LIMITS.destination, "destination"),
  notesLong: sentence(TRIP_LIMITS.notes, "notes"),
  date: "Enter a valid date.",
  dates: "The end can't be before the start.",
  budget: "Use numbers only, for example 8000 or 8000,50.",
  entryTitleEmpty: "Enter a title, for example Dinner on the square.",
  entryTitleLong: sentence(TRIP_LIMITS.title, "title"),
  entryEnd: "Add a start time first.",
  entryCost: "Use numbers only, for example 350 or 350,50.",
  placeTitleEmpty: "Enter a title, for example Pena Palace.",
  placeEstimate: "Use numbers only, for example 150 or 150,50.",
  itemEmpty: "Enter a title for the item.",
  url: "Use a web address starting with https://",
  locationLong: sentence(TRIP_LIMITS.location, "location"),
  areaLong: sentence(TRIP_LIMITS.area, "area"),
  urlLong: sentence(TRIP_LIMITS.url, "link"),
  itemLong: sentence(TRIP_LIMITS.item, "title"),
} as const;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, TRIP_MSG.date);
const hm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Enter a valid time.");
const money = z.number().int().min(0, TRIP_MSG.entryCost).max(TRIP_LIMITS.moneyMaxMinor, "That amount is too large.");
const text = (max: number, tooLong: string) =>
  z
    .string()
    .trim()
    .refine((v) => Array.from(v).length <= max, tooLong);
const title = (empty: string, tooLong: string, max = TRIP_LIMITS.title) =>
  z
    .string()
    .trim()
    .min(1, empty)
    .refine((v) => Array.from(v).length <= max, tooLong);
const url = z
  .string()
  .trim()
  .refine((v) => v === "" || /^https?:\/\//i.test(v), TRIP_MSG.url)
  .refine((v) => v.length <= TRIP_LIMITS.url, TRIP_MSG.urlLong);
const itemType = z.enum(TRIP_ITEM_TYPES);
const group = z.enum(CHECKLIST_GROUPS);

// ---------- trips ----------

const tripDates = (v: { startDate?: string | null; endDate?: string | null }, ctx: z.RefinementCtx) => {
  if (v.startDate && v.endDate && v.endDate < v.startDate)
    ctx.addIssue({ code: "custom", path: ["endDate"], message: TRIP_MSG.dates });
};

export const createTripSchema = z
  .object({
    id: z.uuid(),
    title: title(TRIP_MSG.titleEmpty, TRIP_MSG.titleLong),
    destination: text(TRIP_LIMITS.destination, TRIP_MSG.destinationLong).optional(),
    startDate: isoDate.nullable().optional(),
    /** Omitted with a start date: a one-day trip. */
    endDate: isoDate.nullable().optional(),
    budget: money.nullable().optional(),
    notes: text(TRIP_LIMITS.notes, TRIP_MSG.notesLong).optional(),
    cover: imageAssetSchema.nullable().optional(),
  })
  .superRefine(tripDates);
export type CreateTripInput = z.input<typeof createTripSchema>;

export const updateTripSchema = z
  .object({
    title: title(TRIP_MSG.titleEmpty, TRIP_MSG.titleLong).optional(),
    destination: text(TRIP_LIMITS.destination, TRIP_MSG.destinationLong).optional(),
    startDate: isoDate.nullable().optional(),
    endDate: isoDate.nullable().optional(),
    budget: money.nullable().optional(),
    notes: text(TRIP_LIMITS.notes, TRIP_MSG.notesLong).optional(),
    cover: imageAssetSchema.nullable().optional(),
    updatedAt: z.iso.datetime({ offset: true }),
  })
  .superRefine(tripDates);
export type UpdateTripInput = z.input<typeof updateTripSchema>;

// ---------- plan entries ----------

const entryFields = {
  type: itemType,
  title: title(TRIP_MSG.entryTitleEmpty, TRIP_MSG.entryTitleLong),
  date: isoDate.nullable().optional(),
  start: hm.nullable().optional(),
  end: hm.nullable().optional(),
  location: text(TRIP_LIMITS.location, TRIP_MSG.locationLong).optional(),
  cost: money.nullable().optional(),
  url: url.optional(),
  notes: text(TRIP_LIMITS.notes, TRIP_MSG.notesLong).optional(),
};
const timesOk = (v: { start?: string | null; end?: string | null }, ctx: z.RefinementCtx) => {
  if (v.end && !v.start) ctx.addIssue({ code: "custom", path: ["end"], message: TRIP_MSG.entryEnd });
};

export const createEntrySchema = z.object({ id: z.uuid(), ...entryFields }).superRefine(timesOk);
export type CreatePlanEntryInput = z.input<typeof createEntrySchema>;
export const updateEntrySchema = z
  .object({
    ...entryFields,
    type: itemType.optional(),
    title: entryFields.title.optional(),
    updatedAt: z.iso.datetime({ offset: true }),
  })
  .superRefine(timesOk);
export type UpdatePlanEntryInput = z.input<typeof updateEntrySchema>;

/** Ticks set state, they don't toggle (D9). */
export const doneSchema = z.object({ done: z.boolean() });

// ---------- places ----------

const placeFields = {
  type: itemType,
  title: title(TRIP_MSG.placeTitleEmpty, TRIP_MSG.entryTitleLong),
  area: text(TRIP_LIMITS.area, TRIP_MSG.areaLong).optional(),
  notes: text(TRIP_LIMITS.notes, TRIP_MSG.notesLong).optional(),
  url: url.optional(),
  estimate: money.nullable().optional(),
  mustDo: z.boolean().optional(),
};
export const createPlaceSchema = z.object({ id: z.uuid(), ...placeFields });
export type CreatePlaceInput = z.input<typeof createPlaceSchema>;
export const updatePlaceSchema = z.object({
  ...placeFields,
  type: itemType.optional(),
  title: placeFields.title.optional(),
  updatedAt: z.iso.datetime({ offset: true }),
});
export type UpdatePlaceInput = z.input<typeof updatePlaceSchema>;

/** Scheduling creates the plan entry (D11); its id is the client's, so a replay answers the same entry. */
export const scheduleSchema = z
  .object({
    id: z.uuid(),
    date: isoDate.nullable().optional(),
    start: hm.nullable().optional(),
    end: hm.nullable().optional(),
  })
  .superRefine(timesOk);
export type ScheduleInput = z.input<typeof scheduleSchema>;

// ---------- checklist ----------

export const createItemSchema = z.object({
  id: z.uuid(),
  group,
  title: title(TRIP_MSG.itemEmpty, TRIP_MSG.itemLong, TRIP_LIMITS.item),
});
export type CreateItemInput = z.input<typeof createItemSchema>;
export const updateItemSchema = z.object({
  title: createItemSchema.shape.title.optional(),
  group: group.optional(),
  updatedAt: z.iso.datetime({ offset: true }),
});
export type UpdateItemInput = z.input<typeof updateItemSchema>;
export const moveItemSchema = z.object({ direction: z.enum(["up", "down"]) });

// ---------- responses ----------

export interface TripView {
  id: string;
  title: string;
  destination: string;
  startDate: string | null;
  endDate: string | null;
  budget: number | null;
  notes: string;
  cover: ImageAsset | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlanEntryView {
  id: string;
  tripId: string;
  type: TripItemType;
  title: string;
  date: string | null;
  start: string | null;
  end: string | null;
  location: string;
  cost: number | null;
  url: string;
  notes: string;
  doneAt: string | null;
  doneBy: string | null;
  placeId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlaceView {
  id: string;
  tripId: string;
  type: TripItemType;
  title: string;
  area: string;
  notes: string;
  url: string;
  estimate: number | null;
  mustDo: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChecklistItemView {
  id: string;
  tripId: string;
  group: ChecklistGroup;
  title: string;
  position: number;
  doneAt: string | null;
  doneBy: string | null;
  /** Created with the trip: no "Added by" line. */
  seeded: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TripsResponse {
  currency: string;
  /** Photos (§8): the Cloudinary cloud to build delivery URLs from, or null when uploads are off. */
  images: { cloudName: string } | null;
  trips: TripView[];
  members: { userId: string; displayName: string; slot: Slot }[];
}

/** One trip with everything in it (D59): the plan, the places and the checklist. */
export interface TripResponse {
  trip: TripView;
  entries: PlanEntryView[];
  places: PlaceView[];
  items: ChecklistItemView[];
}
