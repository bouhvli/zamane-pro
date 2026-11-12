import { useCallback, useRef, useState } from "react";
import { C, sChangedBy, sConflict, sNotice, type Actor } from "./copy.ts";

/**
 * The field engine of dialogs.js (validation, descriptions, the three-way merge), over React state. A form keeps
 * its typed `vals` (V); each *field* reads to a canonical value (`Canon`) used to compare against the record the
 * person opened (base), the version on the server now (theirs) and what they typed (mine): Goals §6.7.
 */
export type Canon = string | number | boolean | null;
export type Mark = { type: "changed"; actor: Actor } | { type: "conflict"; actor: Actor; value: Canon };

export interface Def {
  label: string;
  /** Id of the mark slot; the mark's text is `${markId}-text`. */
  markId: string;
  norm(c: Canon): string;
  shown(c: Canon): string;
  /** Lives under "Optional details": opened when the field needs focus. */
  inDetails?: boolean;
}

export interface Cfg<V> {
  defs: Record<string, Def>;
  read(v: V): Record<string, Canon>;
  /** The vals after writing one canonical value into one field. */
  write(v: V, field: string, c: Canon): V;
  validate(v: V): Record<string, string>;
}

export interface Snapshot<V> {
  vals: V;
  base: Record<string, Canon>;
  updatedAt: string | null;
}

interface State<V> extends Snapshot<V> {
  marks: Record<string, Mark>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  notice: { actor: Actor; text: string; focus: boolean; n: number } | null;
  initialJSON: string;
}

export function useEngine<V>(cfg: Cfg<V>, init: () => Snapshot<V>) {
  const cfgRef = useRef(cfg);
  cfgRef.current = cfg;
  const ref = useRef<State<V> | null>(null);
  if (!ref.current) {
    const s = init();
    ref.current = {
      ...s,
      marks: {},
      errors: {},
      touched: {},
      notice: null,
      initialJSON: JSON.stringify(cfg.read(s.vals)),
    };
  }
  const [, force] = useState(0);
  const set = useCallback((fn: (s: State<V>) => State<V>) => {
    ref.current = fn(ref.current!);
    force((n) => n + 1);
    return ref.current;
  }, []);

  const api = {
    get s() {
      return ref.current!;
    },
    values: () => cfgRef.current.read(ref.current!.vals),
    dirty: () => JSON.stringify(cfgRef.current.read(ref.current!.vals)) !== ref.current!.initialJSON,
    /** Re-initialise (open another record): nothing carries over. */
    reset(s: Snapshot<V>) {
      set(() => ({
        ...s,
        marks: {},
        errors: {},
        touched: {},
        notice: null,
        initialJSON: JSON.stringify(cfgRef.current.read(s.vals)),
      }));
    },
    /** A typed or chosen change: the field becomes "touched"; an error clears as soon as the value is valid. */
    change(field: string | null, vals: V) {
      set((s) => {
        const touched = field ? { ...s.touched, [field]: true } : s.touched;
        let errors = s.errors;
        if (field && errors[field]) {
          const all = cfgRef.current.validate(vals);
          errors = { ...errors, [field]: all[field] ?? "" };
        }
        // Start and end are one row: fixing the start clears "Add a start time first".
        if (field === "start" && errors.end) errors = { ...errors, end: cfgRef.current.validate(vals).end ?? "" };
        return { ...s, vals, touched, errors };
      });
    },
    blur(field: string) {
      const s = ref.current!;
      if (!s.touched[field]) return;
      set((x) => ({ ...x, errors: { ...x.errors, [field]: cfgRef.current.validate(x.vals)[field] ?? "" } }));
    },
    setError(field: string, msg: string) {
      set((x) => ({ ...x, errors: { ...x.errors, [field]: msg } }));
    },
    /** All validators at once; returns the first field with an error, or null. */
    validateAll(): string | null {
      const all = cfgRef.current.validate(ref.current!.vals);
      let first: string | null = null;
      for (const f of Object.keys(all)) if (all[f] && !first) first = f;
      set((x) => ({
        ...x,
        errors: all,
        touched: Object.fromEntries(Object.keys(all).map((f) => [f, true])),
      }));
      return first;
    },
    /** theirs: the record as the server has it now. Returns how many fields it touched. */
    merge(theirs: Record<string, Canon>, updatedAt: string, actor: Actor, noun: string, focusNotice: boolean): number {
      const s = ref.current!;
      const mine = cfgRef.current.read(s.vals);
      let vals = s.vals;
      const marks = { ...s.marks };
      const errors = { ...s.errors };
      let n = 0;
      for (const f of Object.keys(cfgRef.current.defs)) {
        const d = cfgRef.current.defs[f]!;
        const b = d.norm(s.base[f] ?? null);
        const m = d.norm(mine[f] ?? null);
        const t = d.norm(theirs[f] ?? null);
        if (b === t) continue; // they didn't change it
        if (m === b) {
          // only they did
          marks[f] = { type: "changed", actor };
          vals = cfgRef.current.write(vals, f, theirs[f] ?? null);
          errors[f] = "";
          n++;
        } else if (m !== t) {
          // both, differently: keep mine, offer theirs
          marks[f] = { type: "conflict", actor, value: theirs[f] ?? null };
          n++;
        } else delete marks[f];
      }
      set((x) => ({
        ...x,
        vals,
        marks,
        errors,
        base: { ...theirs },
        updatedAt,
        notice: n ? { actor, text: sNotice(actor, noun), focus: focusNotice, n } : x.notice,
      }));
      return n;
    },
    useTheirs(field: string): boolean {
      const m = ref.current!.marks[field];
      if (!m || m.type !== "conflict") return false;
      set((x) => {
        const marks = { ...x.marks };
        delete marks[field];
        return {
          ...x,
          marks,
          vals: cfgRef.current.write(x.vals, field, m.value),
          errors: { ...x.errors, [field]: "" },
        };
      });
      return true;
    },
    clearNotice() {
      set((x) => ({ ...x, notice: null }));
    },
    /** After a discard of a restored draft: back to what was opened. */
    discardTo(vals: V) {
      set((x) => ({ ...x, vals, marks: {}, errors: {}, touched: {}, notice: null }));
    },
    setVals(fn: (v: V) => V) {
      set((x) => ({ ...x, vals: fn(x.vals) }));
    },
    markText(field: string): string {
      const m = ref.current!.marks[field];
      const d = cfgRef.current.defs[field]!;
      if (!m) return "";
      return m.type === "changed" ? sChangedBy(m.actor) : sConflict(m.actor, d.shown(m.value));
    },
  };
  return api;
}
export type Engine<V> = ReturnType<typeof useEngine<V>>;

export const textNorm = (v: Canon) => String(v ?? "").trim();
export const textShown = (v: Canon) => {
  const s = String(v ?? "").trim();
  return !s ? C.emptyValue : s.length > 60 ? `${s.slice(0, 57).trim()}…` : s;
};
