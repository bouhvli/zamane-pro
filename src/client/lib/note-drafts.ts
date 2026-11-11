import type { ImageAsset } from "../../shared/schemas/goals.ts";

/**
 * Note drafts (composer.js "drafts"): this device only, in localStorage under
 * "zamane.goals.noteDraft:<goalId>:<new|noteId>", written as you type, cleared on save, discard or logout.
 * Only uploaded photos are kept (an upload in flight is lost with the page). Every storage call is guarded:
 * private windows and full storage just mean no draft.
 */
export const NOTE_DRAFT_PREFIX = "zamane.goals.noteDraft:";

export type DraftBlock = { type: "text"; text: string } | { type: "image"; image: ImageAsset; alt: string };
export interface NoteDraft {
  v: 1;
  /** The note's updatedAt the edit started from (null for a new note). */
  base: string | null;
  blocks: DraftBlock[];
  at: number;
}

export const noteDraftKey = (goalId: string, key: string) => `${NOTE_DRAFT_PREFIX}${goalId}:${key}`;

export function getNoteDraft(k: string): NoteDraft | null {
  try {
    const v = localStorage.getItem(k);
    const d = v ? (JSON.parse(v) as NoteDraft) : null;
    return d && Array.isArray(d.blocks) ? d : null;
  } catch {
    return null;
  }
}

export function setNoteDraft(k: string, d: NoteDraft): boolean {
  try {
    localStorage.setItem(k, JSON.stringify(d));
    return true;
  } catch {
    return false;
  }
}

export function deleteNoteDraft(k: string) {
  try {
    localStorage.removeItem(k);
  } catch {
    /* storage blocked */
  }
}

/** Every note draft on this device (call on logout). */
export function clearNoteDrafts() {
  try {
    Object.keys(localStorage).forEach((k) => {
      if (k.startsWith(NOTE_DRAFT_PREFIX)) localStorage.removeItem(k);
    });
  } catch {
    /* storage blocked */
  }
}
