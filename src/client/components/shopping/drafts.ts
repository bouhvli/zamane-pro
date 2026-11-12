/**
 * Item form drafts (form.js): this phone only, in localStorage 'zamane.shopping.draft:new' and
 * 'zamane.shopping.draft:<id>'. Written while the form is dirty (debounced, and on pagehide), cleared on save, add,
 * discard and close. localStorage can be missing or throw (private mode): every call is guarded.
 */
import type { ShopUnit } from "../../../shared/schemas/shopping.ts";

const PREFIX = "zamane.shopping.draft:";

/** What the form holds: all text, as typed. */
export interface FormValues {
  name: string;
  quantity: string;
  category: string;
  unit: string;
  notes: string;
}
/** The row's editable fields as stored (price in minor units): the base a draft and a merge compare against. */
export interface Snap {
  name: string;
  quantity: number;
  category: string;
  unit: ShopUnit;
  notes: string;
}
export interface ShopDraft {
  v: 1;
  values: FormValues;
  base: Snap | null;
  updatedAt: string | null;
}

export const draftKey = (key: string) => PREFIX + key;

export function readDraft(key: string): ShopDraft | null {
  try {
    const s = localStorage.getItem(key);
    const d = s ? (JSON.parse(s) as ShopDraft) : null;
    return d && d.v === 1 && d.values ? d : null;
  } catch {
    return null;
  }
}
export function writeDraft(key: string, d: ShopDraft) {
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
/** Sign-out: every shopping draft on this phone. */
export function clearAllShoppingDrafts() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k?.startsWith("zamane.shopping.draft")) localStorage.removeItem(k);
    }
  } catch {
    /* nothing to clear */
  }
}
