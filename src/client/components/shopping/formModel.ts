import { SHOP_LIMITS, SHOP_MSG, SHOP_UNITS } from "../../../shared/schemas/shopping.ts";
import { UNIT_NAME, type ShoppingItem } from "../../lib/shopping.ts";
import type { FormValues, Snap } from "./drafts.ts";

/**
 * The item form without the DOM (.ux-forge/shopping form.js): the fields, their validation, and the three-way merge
 * (base = what I opened, mine = the fields, theirs = the row now).
 */
export const FIELDS = ["name", "quantity", "unit", "category", "notes"] as const;
export type Field = (typeof FIELDS)[number];

export const LABEL: Record<Field, string> = {
  name: "Name",
  quantity: "Quantity",
  category: "Category",
  unit: "Unit",
  notes: "Notes",
};
export const NAME_COUNT_FROM = 100;

/** Who changed a field under the person: the partner (named when known) or another phone. */
export type Actor = { kind: "partner"; id: string; name: string } | { kind: "other" };
export type Mark =
  | { type: "changed"; actor: Actor }
  | {
      type: "conflict";
      actor: Actor;
      /** The field text to write for "Use theirs". */ value: string;
      /** How the message names it ("150 MAD"). */ text: string;
    };
export type Marks = Partial<Record<Field, Mark>>;

export const snapOf = (it: Pick<ShoppingItem, "name" | "quantity" | "category" | "unit" | "notes">): Snap => ({
  name: it.name,
  quantity: it.quantity,
  category: it.category ?? "",
  unit: it.unit,
  notes: it.notes,
});
export const valuesOfSnap = (s: Snap): FormValues => ({
  name: s.name,
  quantity: String(s.quantity),
  category: s.category,
  unit: s.unit,
  notes: s.notes,
});
export const EMPTY: FormValues = { name: "", quantity: "1", category: "", unit: "piece", notes: "" };

/** A field in one comparable form: trimmed text. */
export const canonValue = (f: Field, v: FormValues): string => v[f].trim();
export function canonSnap(f: Field, s: Snap): string {
  return f === "quantity" ? String(s.quantity) : String(s[f]).trim();
}

/** What a mark says the other side changed it to ("2 L", "Other", "no notes"). */
export function shown(f: Field, s: Snap): string {
  switch (f) {
    case "unit":
      return UNIT_NAME[s.unit];
    case "category":
      return s.category || "Other";
    case "notes":
      return s.notes.length > 60 ? `${s.notes.slice(0, 60)}…` : s.notes || "no notes";
    case "quantity":
      return String(s.quantity);
    default:
      return s.name;
  }
}

/** The merge (Goals §6.7). Only they changed a field: theirs goes in and is marked. Both changed it: mine stays, theirs is offered. */
export function mergeFields(
  base: Snap,
  mine: FormValues,
  theirs: Snap,
  marks: Marks,
  actor: Actor,
): { values: FormValues; marks: Marks; n: number } {
  const values = { ...mine };
  const next: Marks = { ...marks };
  const t = valuesOfSnap(theirs);
  let n = 0;
  for (const f of FIELDS) {
    const b = canonSnap(f, base);
    const m = canonValue(f, mine);
    const th = canonSnap(f, theirs);
    if (b === th) continue; // they didn't change it
    if (m === b) {
      next[f] = { type: "changed", actor };
      values[f] = t[f];
      n++;
    } else if (m !== th) {
      next[f] = { type: "conflict", actor, value: t[f], text: shown(f, theirs) };
      n++;
    } else delete next[f];
  }
  return { values, marks: next, n };
}

/** The message for a field's current text, or "". */
export function validate(f: Field, v: FormValues): string {
  const t = v[f].trim();
  switch (f) {
    case "name":
      return !t ? SHOP_MSG.nameEmpty : Array.from(t).length > SHOP_LIMITS.name ? SHOP_MSG.nameLong : "";
    case "quantity": {
      if (!/^\d+$/.test(t) || parseInt(t, 10) < 1) return SHOP_MSG.quantity;
      return parseInt(t, 10) > SHOP_LIMITS.quantityMax ? SHOP_MSG.quantityMax : "";
    }
    case "category":
      return Array.from(t).length > SHOP_LIMITS.category ? SHOP_MSG.categoryLong : "";
    case "unit":
      return (SHOP_UNITS as readonly string[]).includes(t) ? "" : SHOP_MSG.unit;
    case "notes":
      return Array.from(t).length > SHOP_LIMITS.notes ? SHOP_MSG.notesLong : "";
  }
}

export const left = (n: number) => `${n} ${n === 1 ? "character" : "characters"} left`;
export const summaryText = (n: number) => (n === 1 ? "Fix 1 field to continue." : `Fix ${n} fields to continue.`);
export const noticeText = (a: Actor) =>
  a.kind === "partner"
    ? `${a.name} changed this item while you were editing. Check the marked fields, then save again.`
    : "This item changed on another phone while you were editing. Check the marked fields, then save again.";
export const changedBy = (a: Actor) => (a.kind === "partner" ? `Changed by ${a.name}` : "Changed on another phone");
export const conflictText = (a: Actor, v: string) =>
  a.kind === "partner" ? `${a.name} changed this to "${v}".` : `Another phone changed this to "${v}".`;
