import { z } from "zod";
import { CAPS, GOAL_KINDS, type GoalKind, type Slot } from "../enums.ts";

/**
 * Goals, entries, notes and uploads, shared by the Worker and the client. Limits and messages are the designs'
 * (.ux-forge/goals/form.js, composer.js), within the database caps of §4.1 (D50).
 */
export const GOAL_LIMITS = {
  title: 80,
  description: 500,
  descriptionCountFrom: 450,
  noteBlock: CAPS.noteText, // 10 000 per text block
  noteTotal: 20_000,
  noteCountFrom: 9_000,
  photosPerNote: 10,
  alt: CAPS.alt,
  photoBytes: 10 * 1024 * 1024,
} as const;

export const GOAL_MSG = {
  titleEmpty: "Enter a title for the goal.",
  titleLong: `Use ${GOAL_LIMITS.title} characters or fewer for the title.`,
  targetEmpty: "Enter a target amount, for example 20000.",
  targetZero: "Enter a target greater than 0.",
  targetFormat: "Use numbers only, for example 20000 or 20000,50.",
  date: "Enter a valid date.",
  descLong: `Use ${GOAL_LIMITS.description} characters or fewer for the description.`,
} as const;

/** A Cloudinary asset as stored (§8). The public id is checked against the space's prefix on save. */
export const imageAssetSchema = z.object({
  publicId: z.string().min(1).max(300),
  version: z.number().int().positive(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  format: z.string().regex(/^[a-z0-9]{2,5}$/),
});
export type ImageAsset = z.infer<typeof imageAssetSchema>;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, GOAL_MSG.date);
const title = z
  .string()
  .trim()
  .min(1, GOAL_MSG.titleEmpty)
  .refine((v) => Array.from(v).length <= GOAL_LIMITS.title, GOAL_MSG.titleLong);
const description = z
  .string()
  .trim()
  .refine((v) => v.length <= GOAL_LIMITS.description, GOAL_MSG.descLong);
const target = z.number().int().positive(GOAL_MSG.targetZero).max(Number.MAX_SAFE_INTEGER);

export const createGoalSchema = z
  .object({
    id: z.uuid(),
    kind: z.enum(GOAL_KINDS),
    title,
    target: target.nullable().optional(),
    targetDate: isoDate.nullable().optional(),
    description: description.optional(),
    cover: imageAssetSchema.nullable().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.kind === "money" && (v.target == null || v.target <= 0))
      ctx.addIssue({ code: "custom", path: ["target"], message: GOAL_MSG.targetEmpty });
  });
export type CreateGoalInput = z.input<typeof createGoalSchema>;

/** PATCH: only the fields that change, plus the updatedAt the edit started from (optimistic concurrency, §5). */
export const updateGoalSchema = z.object({
  title: title.optional(),
  target: target.nullable().optional(),
  targetDate: isoDate.nullable().optional(),
  description: description.optional(),
  cover: imageAssetSchema.nullable().optional(),
  updatedAt: z.iso.datetime({ offset: true }),
});
export type UpdateGoalInput = z.input<typeof updateGoalSchema>;

/** A journal note is saved whole: ordered blocks (D13). */
export const noteBlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), text: z.string().trim().min(1).max(GOAL_LIMITS.noteBlock) }),
  z.object({
    type: z.literal("image"),
    image: imageAssetSchema,
    alt: z.string().trim().max(GOAL_LIMITS.alt).default(""),
  }),
]);
export type NoteBlock = z.output<typeof noteBlockSchema>;

const blocks = z
  .array(noteBlockSchema)
  .min(1, "Write something or add a photo first.")
  .max(GOAL_LIMITS.photosPerNote + 11)
  .superRefine((bs, ctx) => {
    if (bs.filter((b) => b.type === "image").length > GOAL_LIMITS.photosPerNote)
      ctx.addIssue({ code: "custom", message: "Up to 10 photos in a note." });
    const total = bs.reduce((n, b) => n + (b.type === "text" ? b.text.length : 0), 0);
    if (total > GOAL_LIMITS.noteTotal) ctx.addIssue({ code: "custom", message: "This note is too long." });
  });

export const createNoteSchema = z.object({ id: z.uuid(), blocks });
export const updateNoteSchema = z.object({ blocks, updatedAt: z.iso.datetime({ offset: true }) });

export const UPLOAD_PURPOSE = ["goal-cover", "trip-cover", "note-image"] as const;
export const signUploadSchema = z.object({ purpose: z.enum(UPLOAD_PURPOSE) });

// ---------- responses ----------

export interface EntryView {
  id: string;
  userId: string;
  amount: number | null;
  percent: number | null;
  note: string | null;
  at: string;
}

export interface GoalView {
  id: string;
  kind: GoalKind;
  title: string;
  description: string;
  target: number | null;
  targetDate: string | null;
  cover: ImageAsset | null;
  /** Money: the sum of entries. General: the latest percent. */
  progress: number;
  completedAt: string | null;
  completedBy: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  last: EntryView | null;
  entryCount: number;
  noteCount: number;
}

export interface GoalsResponse {
  currency: string;
  /** Photos (§8): the Cloudinary cloud to build delivery URLs from, or null when uploads are off. */
  images: { cloudName: string } | null;
  goals: GoalView[];
  members: { userId: string; displayName: string; slot: Slot }[];
}

export interface NoteView {
  id: string;
  userId: string;
  at: string;
  updatedAt: string;
  blocks: ({ type: "text"; text: string } | { type: "image"; image: ImageAsset; alt: string })[];
}

export interface GoalStats {
  count: number;
  /** Money goals. */
  total?: number;
  average?: number;
  largest?: number;
  thisMonth?: number;
  /** Per member, in slot order. */
  shares: { userId: string; amount: number; count: number; pct: number }[];
  /** General goals: the percent before this month, and the latest this month (null: no update this month). */
  monthFrom?: number;
  monthTo?: number | null;
  last: EntryView | null;
}

export interface UploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  signatureAlgorithm: "sha256";
  publicId: string;
  allowedFormats: string;
  maxFileSize: number;
}
