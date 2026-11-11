import type { ImageAsset } from "../../shared/schemas/goals.ts";

/**
 * Goal form drafts (form.js D8): this phone only, in localStorage 'zamane.goals.draft.new' and
 * 'zamane.goals.draft.edit.<id>'. Written on input, kept through navigation and reload, cleared on create, save,
 * delete and discard. localStorage can be missing or throw (private mode): every call is guarded.
 */
const PREFIX = "zamane.goals.draft.";

/** The editable fields of a goal row: the base a draft (and a merge) compares against. */
export interface GoalSnap {
  title: string;
  /** Minor units. */
  target: number | null;
  /** YYYY-MM-DD or "". */
  targetDate: string;
  description: string;
  cover: ImageAsset | null;
  updatedAt: string;
}

export interface GoalDraft {
  v: 1;
  kind: "money" | "general";
  title: string;
  target: string;
  targetDate: string;
  description: string;
  details: boolean;
  /** An unsaved upload can't outlive the page: "keep" means the saved cover. */
  cover: "none" | "keep";
  base: GoalSnap | null;
}

export const draftKey = (goalId: string | null) => PREFIX + (goalId ? `edit.${goalId}` : "new");

export function readDraft(key: string): GoalDraft | null {
  try {
    const s = localStorage.getItem(key);
    const d = s ? (JSON.parse(s) as GoalDraft) : null;
    return d && d.v === 1 ? d : null;
  } catch {
    return null;
  }
}

export function writeDraft(key: string, d: GoalDraft) {
  try {
    localStorage.setItem(key, JSON.stringify(d));
  } catch {
    /* private mode: the draft lives only in this page */
  }
}

export function clearDraft(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* nothing to clear */
  }
}

/** Logout: every goal draft on this phone. */
export function clearAllGoalDrafts() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k?.startsWith(PREFIX)) localStorage.removeItem(k);
    }
  } catch {
    /* nothing to clear */
  }
}
