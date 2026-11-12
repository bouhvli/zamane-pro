import { z } from "zod";
import { CAPS, type Slot } from "../enums.ts";
import { parseInviteCode } from "../invite-code.ts";

/** Messages are the design's, verbatim (.ux-forge/auth/setup.js). */
export const SPACE_MSG = {
  nameEmpty: "Give your space a name.",
  nameLong: "Use 120 characters or fewer.",
  currencyEmpty: "Choose a currency.",
  tzEmpty: "Choose a time zone.",
  codeLength: "Codes have 8 letters and numbers, like K7QM-4XPA.",
  codeLetters: "Codes don't use 0, O, 1, I or L. Check the code again.",
} as const;

export function isTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export const createSpaceSchema = z.object({
  id: z.uuid(),
  name: z
    .string()
    .trim()
    .superRefine((v, ctx) => {
      if (!v) ctx.addIssue({ code: "custom", message: SPACE_MSG.nameEmpty });
      else if (Array.from(v).length > CAPS.name) ctx.addIssue({ code: "custom", message: SPACE_MSG.nameLong });
    }),
  currency: z.string().regex(/^[A-Z]{3}$/, SPACE_MSG.currencyEmpty),
  timezone: z.string().refine((v) => v !== "" && isTimeZone(v), SPACE_MSG.tzEmpty),
});
export type CreateSpaceInput = z.input<typeof createSpaceSchema>;

/** PATCH /api/spaces/mine: the same name rule as create. Currency and time zone are fixed at creation. */
export const renameSpaceSchema = createSpaceSchema.pick({ name: true });
export type RenameSpaceInput = z.input<typeof renameSpaceSchema>;

/** The code arrives as typed (or pasted); the server normalises it with the same parser as the client. */
export const inviteCodeSchema = z.string().transform((raw, ctx) => {
  const p = parseInviteCode(raw);
  if (!p.ok) {
    ctx.addIssue({ code: "custom", message: p.reason === "letters" ? SPACE_MSG.codeLetters : SPACE_MSG.codeLength });
    return z.NEVER;
  }
  return p.code;
});

export const joinSpaceSchema = z.object({
  code: inviteCodeSchema,
  /** The switch (D33): delete my solo space and join this one, in one transaction. */
  replaceSolo: z.boolean().optional(),
});
export type JoinSpaceInput = z.input<typeof joinSpaceSchema>;

// ---------- response shapes ----------

export interface SpaceMember {
  userId: string;
  displayName: string;
  slot: Slot;
  joinedAt: string;
}

export interface MySpace {
  id: string;
  name: string;
  currency: string;
  timezone: string;
  /** Only while the space has one member: once the partner has joined, the code isn't sent. */
  inviteCode: string | null;
  inviteCodeRotatedAt: string | null;
  slot: Slot;
  members: SpaceMember[];
}

export interface MeResponse {
  user: { id: string; displayName: string; email: string };
  space: null | {
    id: string;
    name: string;
    currency: string;
    timezone: string;
    slot: Slot;
    memberCount: number;
  };
}

export interface JoinResponse {
  space: { id: string; name: string };
  /** The partner's display name, which fills their seat in the join moment. */
  partnerName: string | null;
}

export interface SoloSummary {
  goals: number;
  trips: number;
  items: number;
}

/** POST /api/spaces/mine/leave. `deleted` is true when the leaver was the last member and the space went too. */
export interface LeaveResponse {
  left: boolean;
  deleted: boolean;
}
