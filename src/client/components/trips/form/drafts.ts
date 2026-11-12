import type { ImageAsset } from "../../../../shared/schemas/goals.ts";

/**
 * Trip form drafts (form.js D13): this phone only, in localStorage 'zamane.trips.draft.new' and
 * 'zamane.trips.draft.edit.<id>'. Written on input, kept through navigation and reload, cleared on create, save,
 * delete and discard. localStorage can be missing or throw (private mode): every call is guarded.
 */
const PREFIX = "zamane.trips.draft.";

/** The editable fields of a trip row: the base a draft (and a merge) compares against. */
export interface TripSnap {
  title: string;
  destination: string;
  /** "YYYY-MM-DD|YYYY-MM-DD", or "|" with no dates. */
  dates: string;
  /** Minor units. */
  budget: number | null;
  notes: string;
  cover: ImageAsset | null;
  updatedAt: string;
}

export interface TripDraft {
  v: 1;
  title: string;
  destination: string;
  start: string;
  end: string;
  budget: string;
  notes: string;
  details: boolean;
  /** An unsaved upload can't outlive the page: "keep" means the saved cover. */
  cover: "none" | "keep";
  base: TripSnap | null;
}

export const draftKey = (tripId: string | null) => PREFIX + (tripId ? `edit.${tripId}` : "new");

export function readDraft(key: string): TripDraft | null {
  try {
    const s = localStorage.getItem(key);
    const d = s ? (JSON.parse(s) as TripDraft) : null;
    return d && d.v === 1 ? d : null;
  } catch {
    return null;
  }
}

export function writeDraft(key: string, d: TripDraft) {
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

/** Logout: every trip draft on this phone. */
export function clearAllTripDrafts() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k?.startsWith(PREFIX)) localStorage.removeItem(k);
    }
  } catch {
    /* nothing to clear */
  }
}
