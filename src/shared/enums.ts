/** One list per enum, shared by the database CHECKs, the Zod schemas and the TypeScript types (§4). */
export const SLOTS = ["a", "b"] as const;
export type Slot = (typeof SLOTS)[number];

export const GOAL_KINDS = ["money", "general"] as const;
export type GoalKind = (typeof GOAL_KINDS)[number];

export const NOTE_BLOCK_KINDS = ["text", "image"] as const;
export type NoteBlockKind = (typeof NOTE_BLOCK_KINDS)[number];

export const TRIP_ITEM_TYPES = ["flight", "transport", "stay", "food", "sight", "activity", "other"] as const;
export type TripItemType = (typeof TRIP_ITEM_TYPES)[number];

export const CHECKLIST_GROUPS = ["packing", "documents", "bookings", "todo"] as const;
export type ChecklistGroup = (typeof CHECKLIST_GROUPS)[number];

export const UPLOAD_PURPOSES = ["goal-cover", "trip-cover", "note-image"] as const;
export type UploadPurpose = (typeof UPLOAD_PURPOSES)[number];

/** Text caps (§4.1), mirrored by CHECK (char_length(...) <= n). */
export const CAPS = {
  title: 120,
  name: 120,
  notes: 4000,
  noteText: 10000,
  url: 2048,
  alt: 250,
} as const;

export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 128;
