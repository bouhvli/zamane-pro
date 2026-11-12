import { useQueryClient } from "@tanstack/react-query";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { SHOP_LIMITS, SHOP_UNITS, type ShopUnit } from "../../../shared/schemas/shopping.ts";
import { categoriesOf, guessCategory, guessUnit, keyOf, spelling } from "../../../shared/shopping-list.ts";
import { isApiError } from "../../lib/api.ts";
import {
  invalidateShopping,
  putShoppingItems,
  shoppingQuery,
  UNIT_NAME,
  updateShoppingItem,
  type NewItem,
  type ShopPeople,
  type ShoppingItem,
} from "../../lib/shopping.ts";
import { Icon } from "../Icon.tsx";
import { initial } from "../Seat.tsx";
import { useDialog } from "../trips/dialogs/modal.ts";
import type { ShopConfirm } from "./Confirm.tsx";
import { clearDraft, draftKey, readDraft, writeDraft, type FormValues, type Snap } from "./drafts.ts";
import {
  EMPTY,
  FIELDS,
  LABEL,
  NAME_COUNT_FROM,
  canonValue,
  changedBy,
  conflictText,
  left,
  mergeFields,
  noticeText,
  snapOf,
  summaryText,
  validate,
  valuesOfSnap,
  type Actor,
  type Field,
  type Marks,
} from "./formModel.ts";
import { alertIn, announce } from "./util.ts";

/**
 * The item form (.ux-forge/shopping form.js, #item-form): add with details, and edit. A URL-backed dialog
 * (?item=new[&name=] or ?item=<id>), a tall bottom sheet on phones with the footer always visible, centred 28 rem from
 * 48 rem. Back closes it behind the discard guard; a reload restores the draft ("Draft restored."). The category is a
 * combobox over the categories already on the list (ARIA 1.2: focus stays in the input). An edit holds the row's
 * updatedAt; a 409 (or a change that arrives while the form is open) runs the three-way merge: the fields only they
 * changed take their value and are marked, a field both changed keeps mine and offers "Use theirs". The row deleted
 * meanwhile swaps in a banner. Offline: Save is aria-disabled with the reason and the draft stays; a new item still
 * queues. Phase 5 (realtime) will name the partner in the marks; until then a change is "another phone".
 */
const C = {
  titleNew: "Add item",
  titleEdit: "Edit item",
  close: "Close",
  cancel: "Cancel",
  add: "Add item",
  save: "Save changes",
  saving: "Saving…",
  nameHelp: 'The name only, for example "Rice". Set the amount and unit below.',
  dec: "Decrease quantity",
  inc: "Increase quantity",
  catHelp: "Optional. Items with no category go under Other.",
  catList: "Existing categories",
  catNone: "No matching category. This will be a new one.",
  unit: "Unit",
  notesHelp: "Optional. Brand, size, or where to find it.",
  restored: "Draft restored.",
  discardDraft: "Discard draft",
  saveFail: "Couldn't save. Try again.",
  rSave: "You're offline. You can save your changes when you're back online. What you've changed stays here.",
  rNew: "You're offline. This item will be added when you're back online.",
  copy: "Copy text",
  copied: "Text copied",
  copyFailed: "Couldn't copy. Select the text and copy it by hand.",
  useTheirs: "Use theirs",
  resolved: "Their version is in the field.",
  saved: "Saved.",
  dTitle: "Discard changes?",
  dBody: "What you've typed won't be kept.",
  keepEditing: "Keep editing",
  discard: "Discard",
};

export interface FinishOpts {
  /** Said politely once the form is gone ("Saved."). */
  say?: string;
  /** The URL has already lost the query (Back): don't navigate. */
  noNav?: boolean;
  /** Runs once the form is gone, before focus lands. */
  before?: () => void;
}
export interface FormHandle {
  /** Back removed ?item=: ask first when there are changes, else close. */
  urlGone: () => void;
}
export interface ItemFormProps {
  /** "new" or the row's id. */
  targetKey: string;
  /** The name More handed over (new only). */
  nameParam: string;
  items: readonly ShoppingItem[];
  people: ShopPeople;
  online: boolean;
  ask: ShopConfirm["ask"];
  /** An add: the host patches the list, toasts, and the form closes. */
  onAdd: (f: NewItem) => void;
  onFinish: (o: FinishOpts) => void;
  /** Put ?item= back in the URL (Back while there are changes). */
  onRepush: () => void;
}

interface S {
  values: FormValues;
  marks: Marks;
  errors: Partial<Record<Field, string>>;
  base: Snap;
  updatedAt: string | null;
  restored: boolean;
  notice: { text: string; focus: boolean; seq: number } | null;
  banner: string | null;
  saving: boolean;
  failed: string;
  summary: number;
  copied: string;
}

const ids = {
  name: { input: "if-name", err: "if-name-err", mark: "if-name-mark" },
  quantity: { input: "if-qty", err: "if-qty-err", mark: "if-qty-mark" },
  category: { input: "if-cat", err: "if-cat-err", mark: "if-cat-mark" },
  unit: { input: "if-unit", err: "if-unit-err", mark: "if-unit-mark" },
  notes: { input: "if-notes", err: "if-notes-err", mark: "if-notes-mark" },
} as const;

const byId = (id: string) => document.getElementById(id);

export const ItemForm = forwardRef<FormHandle, ItemFormProps>(function ItemForm(p, ref) {
  const { targetKey, items, people, online } = p;
  const qc = useQueryClient();
  const editing = targetKey !== "new";
  const rec = editing ? (items.find((i) => i.id === targetKey) ?? null) : null;
  const storeKey = draftKey(targetKey);

  // ----- the first state: the row (or a blank), then a stored draft over it -----
  const init = useMemo(() => {
    const base: Snap = rec ? snapOf(rec) : { name: p.nameParam, quantity: 1, category: "", unit: "piece", notes: "" };
    const initial0 = valuesOfSnap(base);
    let s: S = {
      values: initial0,
      marks: {},
      errors: {},
      base,
      updatedAt: rec?.updatedAt ?? null,
      restored: false,
      notice: null,
      banner: null,
      saving: false,
      failed: "",
      summary: 0,
      copied: "",
    };
    const draft = readDraft(storeKey);
    if (draft && JSON.stringify(draft.values) !== JSON.stringify(initial0)) {
      s = { ...s, values: { ...EMPTY, ...draft.values }, restored: true };
      // A draft older than the row merges against the row as it is now.
      if (rec && draft.updatedAt && Date.parse(draft.updatedAt) !== Date.parse(rec.updatedAt)) {
        const b = draft.base ?? base;
        const m = mergeFields(b, s.values, snapOf(rec), s.marks, { kind: "other" });
        s = { ...s, values: m.values, marks: m.marks };
        if (m.n) s.notice = { text: noticeText({ kind: "other" }), focus: false, seq: 1 };
      }
    }
    return { s, initialJSON: JSON.stringify(initial0) };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when the form opens
  }, []);
  const [s, setS] = useState<S>(init.s);
  const sRef = useRef(s);
  sRef.current = s;
  const patch = useCallback((x: Partial<S>) => setS((cur) => ({ ...cur, ...x })), []);
  const initialJSON = useRef(init.initialJSON);
  const touched = useRef<Partial<Record<Field, boolean>>>({});
  const closing = useRef(false);
  const asking = useRef(false);
  const guardPending = useRef(false);
  const retried = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const propsRef = useRef(p);
  propsRef.current = p;

  const dirty = () => JSON.stringify(sRef.current.values) !== initialJSON.current;

  // ----- the dialog -----
  const requestClose = useCallback(() => {
    if (closing.current || asking.current) return;
    if (!sRef.current.banner && dirty()) void askDiscard();
    else {
      clearDraft(storeKey);
      finish({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reads the latest through refs
  }, []);
  const dlg = useDialog(true, requestClose, "sheet");

  function finish(o: FinishOpts) {
    if (closing.current) return;
    closing.current = true;
    clearTimeout(timer.current);
    propsRef.current.onFinish(o);
  }
  async function askDiscard() {
    asking.current = true;
    const yes = await propsRef.current.ask({
      title: C.dTitle,
      body: [C.dBody],
      confirm: C.discard,
      cancel: C.keepEditing,
    });
    asking.current = false;
    guardPending.current = false;
    if (yes && !closing.current) {
      clearDraft(storeKey);
      finish({});
    }
  }
  useImperativeHandle(ref, () => ({
    urlGone() {
      if (closing.current || guardPending.current) return;
      if (!sRef.current.banner && dirty()) {
        guardPending.current = true;
        propsRef.current.onRepush();
        if (!asking.current) void askDiscard();
        return;
      }
      clearDraft(storeKey);
      finish({ noNav: true });
    },
  }));

  // ----- drafts: this phone only, while there are changes -----
  const persistNow = useCallback(() => {
    if (closing.current || sRef.current.banner) return;
    if (!dirty()) {
      clearDraft(storeKey);
      return;
    }
    writeDraft(storeKey, {
      v: 1,
      values: sRef.current.values,
      base: sRef.current.base,
      updatedAt: sRef.current.updatedAt,
    });
  }, [storeKey]);
  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(persistNow, 250);
    return () => clearTimeout(timer.current);
  }, [s.values, s.banner, persistNow]);
  useEffect(() => {
    const hide = () => document.visibilityState === "hidden" && persistNow();
    window.addEventListener("pagehide", persistNow);
    document.addEventListener("visibilitychange", hide);
    return () => {
      window.removeEventListener("pagehide", persistNow);
      document.removeEventListener("visibilitychange", hide);
    };
  }, [persistNow]);

  // ----- focus on open -----
  useEffect(() => {
    if (!sRef.current.banner) byId("if-name")?.focus({ preventScroll: true });
  }, []);

  // ----- values and errors -----
  const setValue = (f: Field, v: string) => {
    touched.current[f] = true;
    setS((cur) => {
      const values = { ...cur.values, [f]: v };
      const errors = cur.errors[f] ? { ...cur.errors, [f]: validate(f, values) } : cur.errors;
      const summary = cur.summary ? FIELDS.filter((x) => errors[x]).length : 0;
      return { ...cur, values, errors, summary };
    });
  };
  const checkField = (f: Field) => {
    if (!touched.current[f]) return;
    setS((cur) => ({ ...cur, errors: { ...cur.errors, [f]: validate(f, cur.values) } }));
  };

  // ----- category combobox (ARIA 1.2: focus stays in the input) -----
  const [cb, setCb] = useState({ open: false, active: -1 });
  const all = useMemo(() => categoriesOf(items), [items]);
  const catKey = keyOf(s.values.category);
  const options = useMemo(() => (catKey ? all.filter((c) => c.key.includes(catKey)) : all), [all, catKey]);
  const listOpen = cb.open && options.length > 0;
  const cbTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const openList = (say: boolean) => {
    setCb({ open: true, active: -1 });
    clearTimeout(cbTimer.current);
    if (say && options.length) announce(`${options.length} ${options.length === 1 ? "suggestion" : "suggestions"}`);
  };
  const closeList = () => setCb((c) => (c.open ? { open: false, active: -1 } : c));
  const pick = (i: number) => {
    const c = options[i];
    if (!c) return;
    touched.current.category = true;
    setValue("category", c.name);
    closeList();
  };
  // After typing: one count, once the person pauses
  const countSoon = () => {
    clearTimeout(cbTimer.current);
    cbTimer.current = setTimeout(() => {
      const n = optionsRef.current.length;
      if (n) announce(`${n} ${n === 1 ? "suggestion" : "suggestions"}`);
    }, 600);
  };
  const optionsRef = useRef(options);
  optionsRef.current = options;
  useEffect(() => () => clearTimeout(cbTimer.current), []);
  const onCatKey = (e: KeyboardEvent<HTMLInputElement>) => {
    const k = e.key;
    if (k === "ArrowDown" || k === "ArrowUp") {
      e.preventDefault();
      if (!options.length) return;
      if (!listOpen) {
        announce(`${options.length} ${options.length === 1 ? "suggestion" : "suggestions"}`);
        setCb({ open: true, active: k === "ArrowDown" ? 0 : options.length - 1 });
      } else
        setCb((c) => ({ ...c, active: (c.active + (k === "ArrowDown" ? 1 : -1) + options.length) % options.length }));
    } else if (k === "Enter" && listOpen && cb.active > -1) {
      e.preventDefault();
      pick(cb.active);
    } else if ((k === "Home" || k === "End") && listOpen && cb.active > -1) {
      e.preventDefault();
      setCb((c) => ({ ...c, active: k === "Home" ? 0 : options.length - 1 }));
    } else if (k === "Escape" && listOpen) {
      e.preventDefault();
      e.stopPropagation();
      closeList();
    } else if (k === "Tab") closeList();
  };
  useEffect(() => {
    if (cb.active > -1) byId(`if-opt-${cb.active}`)?.scrollIntoView?.({ block: "nearest" });
  }, [cb.active]);

  // Feed-forward: the spelling the list already uses, or "this will be a new one"
  const typed = s.values.category.trim();
  const sp = typed ? spelling(items, typed) : "";
  const matchText = typed && sp && sp !== typed ? `Will be filed under "${sp}".` : "";
  const isNew = !!typed && !all.some((c) => c.key.includes(keyOf(typed)));
  const noneShown = useRef(false);
  useEffect(() => {
    if (isNew && !noneShown.current) announce(C.catNone);
    noneShown.current = isNew;
  }, [isNew]);

  // Tesler: a new item named like an earlier one is filed like it, visibly, and the person can change it.
  const guess = () => {
    if (editing) return;
    const v = sRef.current.values;
    const g = guessCategory(items, v.name);
    const u = guessUnit(items, v.name);
    const next = { ...v };
    if (g && !v.category.trim() && !touched.current.category) next.category = g;
    if (u && !touched.current.unit) next.unit = u;
    if (next.category !== v.category || next.unit !== v.unit) patch({ values: next });
  };

  // ----- quantity -----
  const step = (d: number) => {
    const n = parseInt(s.values.quantity, 10);
    const next = Number.isNaN(n) ? 1 : n + d;
    touched.current.quantity = true;
    setValue("quantity", String(Math.min(SHOP_LIMITS.quantityMax, Math.max(1, next))));
  };

  // ----- merge (409, or a change that arrives while the form is open) -----
  const doMerge = useCallback((theirs: ShoppingItem, actor: Actor, focus: boolean): number => {
    const cur = sRef.current;
    const m = mergeFields(cur.base, cur.values, snapOf(theirs), cur.marks, actor);
    setS((x) => ({
      ...x,
      values: m.values,
      marks: m.marks,
      base: snapOf(theirs),
      updatedAt: theirs.updatedAt,
      errors: Object.fromEntries(
        FIELDS.filter((f) => x.errors[f] && m.values[f] === x.values[f]).map((f) => [f, x.errors[f]]),
      ),
    }));
    if (m.n) {
      const text = noticeText(actor);
      setS((x) => ({ ...x, notice: { text, focus, seq: (x.notice?.seq ?? 0) + 1 } }));
      if (!focus) announce(text);
    }
    return m.n;
  }, []);
  // The row changed under the form (a refetch brought the other person's save)
  useEffect(() => {
    if (!editing || !rec || sRef.current.banner || sRef.current.saving) return;
    if (rec.updatedAt === sRef.current.updatedAt) return;
    doMerge(rec, { kind: "other" }, false);
  }, [rec, editing, doMerge]);
  // The row is gone: banner
  useEffect(() => {
    if (editing && !rec && !sRef.current.banner && !closing.current) {
      const by = people.solo ? null : propsRef.current.people.name(null);
      const text = `${by ? `${by} deleted ${sRef.current.base.name}.` : `${sRef.current.base.name} was deleted.`} This can't be saved.`;
      patch({ banner: text, saving: false });
      alertIn(dlg.ref.current, text);
    }
  }, [editing, rec, people, patch, dlg.ref]);
  useEffect(() => {
    if (s.banner) byId("if-banner-h")?.focus();
  }, [s.banner]);
  useEffect(() => {
    if (s.notice?.focus) byId("if-notice")?.focus();
  }, [s.notice]);

  // ----- footer -----
  const blocked = s.saving || (!online && editing);
  let why = "";
  if (!online) why = editing ? C.rSave : C.rNew;
  else if (s.failed) why = s.failed;
  const label = s.saving ? C.saving : editing ? C.save : C.add;

  // ----- submit -----
  function validateAll() {
    const errors: Partial<Record<Field, string>> = {};
    let first: Field | null = null;
    let n = 0;
    for (const f of FIELDS) {
      touched.current[f] = true;
      const m = validate(f, sRef.current.values);
      errors[f] = m;
      if (m) {
        n++;
        first ??= f;
      }
    }
    patch({ errors });
    return { first, n };
  }
  function press() {
    const cur = sRef.current;
    if (cur.saving || cur.banner || closing.current) return;
    if (!propsRef.current.online && editing) {
      announce(C.rSave);
      return;
    }
    const v = validateAll();
    if (v.first) {
      patch({ summary: v.n });
      byId(ids[v.first].input)?.focus();
      return;
    }
    patch({ summary: 0, failed: "" });
    void commit();
  }
  function fieldsOut() {
    const v = sRef.current.values;
    return {
      name: v.name.trim(),
      quantity: parseInt(v.quantity, 10),
      category: v.category.trim(),
      unit: v.unit as ShopUnit,
      notes: v.notes.replace(/\s+$/, ""),
    };
  }
  async function commit() {
    const out = fieldsOut();
    if (!editing) {
      // An empty Category is sent as Other: the guess was already shown in the field
      propsRef.current.onAdd({
        name: out.name,
        quantity: out.quantity,
        category: out.category || null,
        unit: out.unit,
        notes: out.notes,
      });
      clearDraft(storeKey);
      const typedName = propsRef.current.nameParam;
      finish({
        before: () => {
          const add = byId("primary") as HTMLInputElement | null;
          // More leaves the typed text in the add field; once it has become the item it would only invite a double add.
          if (add && typedName && add.value.trim() === typedName.trim()) {
            const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
            set?.call(add, "");
            add.dispatchEvent(new Event("input", { bubbles: true }));
          }
        },
      });
      return;
    }
    if (!propsRef.current.online) {
      announce(C.rSave);
      return;
    }
    patch({ saving: true });
    try {
      const r = await updateShoppingItem(targetKey, {
        name: out.name,
        quantity: out.quantity,
        category: out.category || null,
        unit: out.unit,
        notes: out.notes || null,
        updatedAt: sRef.current.updatedAt ?? "",
      });
      putShoppingItems(qc, [r.item]);
      invalidateShopping(qc);
      clearDraft(storeKey);
      finish({ say: C.saved });
    } catch (e) {
      if (closing.current) return;
      patch({ saving: false });
      if (isApiError(e, "not_found")) {
        const text = `${sRef.current.base.name} was deleted. This can't be saved.`;
        patch({ banner: text });
        alertIn(dlg.ref.current, text);
        return;
      }
      if (isApiError(e, "conflict")) {
        const fresh = await qc.fetchQuery({ ...shoppingQuery, staleTime: 0 }).catch(() => null);
        const cur = fresh?.items.find((i) => i.id === targetKey);
        if (fresh && !cur) {
          const text = `${sRef.current.base.name} was deleted. This can't be saved.`;
          patch({ banner: text });
          alertIn(dlg.ref.current, text);
          return;
        }
        if (cur) {
          const n = doMerge(cur, { kind: "other" }, true);
          if (!n && !retried.current) {
            retried.current = true; // nothing editable differs (a tick, say): one silent retry
            await commit();
            return;
          }
          retried.current = false;
          return;
        }
      }
      patch({ failed: C.saveFail });
      alertIn(dlg.ref.current, C.saveFail);
    }
  }

  // ----- the rest of the actions -----
  const applyTheirs = (f: Field) => {
    const m = s.marks[f];
    if (!m || m.type !== "conflict") return;
    setS((cur) => {
      const marks = { ...cur.marks };
      delete marks[f];
      return { ...cur, marks, values: { ...cur.values, [f]: m.value }, errors: { ...cur.errors, [f]: "" } };
    });
    byId(ids[f].input)?.focus();
    announce(C.resolved);
  };
  async function discardDraft() {
    asking.current = true;
    const yes = await propsRef.current.ask({
      title: C.dTitle,
      body: [C.dBody],
      confirm: C.discard,
      cancel: C.keepEditing,
    });
    asking.current = false;
    if (!yes || closing.current) return;
    clearDraft(storeKey);
    touched.current = {};
    patch({
      values: JSON.parse(initialJSON.current) as FormValues,
      marks: {},
      errors: {},
      notice: null,
      summary: 0,
      restored: false,
    });
    byId("if-name")?.focus();
  }
  async function copyText() {
    const v = sRef.current.values;
    const text = [v.name.trim(), v.notes.trim()].filter(Boolean).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      patch({ copied: C.copied });
    } catch {
      patch({ copied: C.copyFailed });
      alertIn(dlg.ref.current, C.copyFailed);
    }
  }

  // ----- describing the fields -----
  const nameLen = s.values.name.length;
  const notesLen = s.values.notes.length;
  const nameCount = nameLen >= NAME_COUNT_FROM ? left(SHOP_LIMITS.name - nameLen) : "";
  const notesCount = notesLen >= SHOP_LIMITS.notesCountFrom ? left(SHOP_LIMITS.notes - notesLen) : "";
  const desc = (f: Field, help: (string | false)[]) =>
    [s.errors[f] && ids[f].err, ...help, s.marks[f] && `${ids[f].mark}-text`].filter(Boolean).join(" ") || undefined;

  const errView = (f: Field) => (
    <p className="err" id={ids[f].err} hidden={!s.errors[f]}>
      {s.errors[f] ? (
        <>
          <Icon name="alert" />
          <span>{s.errors[f]}</span>
        </>
      ) : null}
    </p>
  );
  const markView = (f: Field) => {
    const m = s.marks[f];
    if (!m) return null;
    const id = `${ids[f].mark}-text`;
    const who =
      m.actor.kind === "partner" ? (
        <span className={`zm-av zm-av-${people.slot(m.actor.id)} zm-av-xs`} aria-hidden="true">
          {initial(m.actor.name) || "?"}
        </span>
      ) : (
        <Icon name="refresh" />
      );
    if (m.type === "changed")
      return (
        <p className="if-mark">
          {who}
          <span id={id}>{changedBy(m.actor)}</span>
        </p>
      );
    return (
      <div className="if-mark if-mark-conflict">
        {who}
        <span className="if-mark-text" id={id}>
          {conflictText(m.actor, m.text)}
        </span>
        <button
          type="button"
          className="link-btn"
          aria-label={`${C.useTheirs} for ${LABEL[f]}`}
          aria-describedby={id}
          onClick={() => applyTheirs(f)}
        >
          {C.useTheirs}
        </button>
      </div>
    );
  };
  const invalid = (f: Field) => (s.errors[f] ? " is-invalid" : "");

  return (
    <dialog
      ref={dlg.ref}
      id="item-form"
      className="sheet if-form"
      aria-labelledby="if-h"
      data-mode={editing ? "edit" : "new"}
      {...dlg.props}
      onKeyDown={(e) => {
        dlg.props.onKeyDown(e);
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          press();
        }
      }}
    >
      <form
        className="if-f"
        id="if-f"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          press();
        }}
      >
        <div className="if-head">
          <h2 id="if-h" tabIndex={-1}>
            {editing ? C.titleEdit : C.titleNew}
          </h2>
          <button type="button" className="icon-btn" aria-label={C.close} onClick={requestClose}>
            <Icon name="x" />
          </button>
        </div>
        <div className="if-body" id="if-body">
          <div className="if-slot" id="if-banner">
            {s.banner && (
              <div className="if-banner">
                <p className="if-banner-h" id="if-banner-h" tabIndex={-1}>
                  <Icon name="alert" />
                  <span>{s.banner}</span>
                </p>
                <div className="if-banner-acts">
                  <button type="button" className="btn-sec" onClick={() => void copyText()}>
                    {C.copy}
                  </button>
                  <button
                    type="button"
                    className="btn-sec"
                    onClick={() => {
                      clearDraft(storeKey);
                      finish({});
                    }}
                  >
                    {C.close}
                  </button>
                </div>
                <p className="caption" role="status">
                  {s.copied}
                </p>
              </div>
            )}
          </div>
          <div className="if-slot" id="if-restored">
            {s.restored && (
              <p className="notice if-restored">
                <span>{C.restored}</span>
                <button type="button" className="link-btn" onClick={() => void discardDraft()}>
                  {C.discardDraft}
                </button>
              </p>
            )}
          </div>
          <div className="if-slot" id="if-merge">
            {s.notice && (
              <p className="notice if-notice" id="if-notice" role="status" tabIndex={-1}>
                <Icon name="refresh" />
                <span>{s.notice.text}</span>
              </p>
            )}
          </div>

          <div className="if-g" id="if-g-name">
            <label className="field-label" htmlFor="if-name">
              Name<span className="vh"> (required)</span>
            </label>
            <div className={`field${invalid("name")}`}>
              <input
                id="if-name"
                type="text"
                maxLength={SHOP_LIMITS.name}
                autoComplete="off"
                autoCapitalize="sentences"
                enterKeyHint="next"
                aria-required="true"
                aria-invalid={s.errors.name ? true : undefined}
                aria-describedby={desc("name", ["if-name-help", !!nameCount && "if-name-count"])}
                dir="auto"
                value={s.values.name}
                onChange={(e) => setValue("name", e.target.value)}
                onBlur={() => {
                  checkField("name");
                  guess();
                }}
              />
            </div>
            <p className="help" id="if-name-help">
              {C.nameHelp}
            </p>
            <p className="help if-count" id="if-name-count" hidden={!nameCount}>
              {nameCount}
            </p>
            {errView("name")}
            <div id={ids.name.mark} className="if-markslot">
              {markView("name")}
            </div>
          </div>

          <div className="if-pair">
            <div className="if-g" id="if-g-quantity">
              <label className="field-label" htmlFor="if-qty">
                Quantity
              </label>
              <div className="if-step">
                <button type="button" className="icon-btn if-stepbtn" aria-label={C.dec} onClick={() => step(-1)}>
                  <Icon name="minus" />
                </button>
                <div className={`field field-num${invalid("quantity")}`}>
                  <input
                    id="if-qty"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={4}
                    enterKeyHint="next"
                    aria-invalid={s.errors.quantity ? true : undefined}
                    aria-describedby={desc("quantity", [])}
                    value={s.values.quantity}
                    onChange={(e) => setValue("quantity", e.target.value)}
                    onBlur={() => checkField("quantity")}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowUp") {
                        e.preventDefault();
                        step(1);
                      } else if (e.key === "ArrowDown") {
                        e.preventDefault();
                        step(-1);
                      }
                    }}
                  />
                </div>
                <button type="button" className="icon-btn if-stepbtn" aria-label={C.inc} onClick={() => step(1)}>
                  <Icon name="plus" />
                </button>
              </div>
              {errView("quantity")}
            </div>
            <div className="if-g" id="if-g-unit">
              <label className="field-label" htmlFor="if-unit">
                {C.unit}
              </label>
              <div className={`field${invalid("unit")}`}>
                <select
                  id="if-unit"
                  aria-invalid={s.errors.unit ? true : undefined}
                  aria-describedby={desc("unit", [])}
                  value={s.values.unit}
                  onChange={(e) => setValue("unit", e.target.value)}
                  onBlur={() => checkField("unit")}
                >
                  {SHOP_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {UNIT_NAME[u]}
                    </option>
                  ))}
                </select>
              </div>
              {errView("unit")}
            </div>
          </div>
          {/* The two marks sit under the pair, full width: a conflict line needs the room. */}
          <div className="if-g if-markrow">
            <div id={ids.quantity.mark} className="if-markslot">
              {markView("quantity")}
            </div>
            <div id={ids.unit.mark} className="if-markslot">
              {markView("unit")}
            </div>
          </div>

          <div className="if-g" id="if-g-category">
            <label className="field-label" htmlFor="if-cat">
              Category
            </label>
            <div className="if-combo">
              <div className={`field${invalid("category")}`}>
                <input
                  id="if-cat"
                  type="text"
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={listOpen}
                  aria-controls="if-cat-list"
                  aria-activedescendant={listOpen && cb.active > -1 ? `if-opt-${cb.active}` : undefined}
                  aria-invalid={s.errors.category ? true : undefined}
                  aria-describedby={desc("category", [
                    "if-cat-help",
                    !!matchText && "if-cat-match",
                    isNew && "if-cat-none",
                  ])}
                  maxLength={SHOP_LIMITS.category + 20}
                  autoComplete="off"
                  autoCapitalize="words"
                  enterKeyHint="next"
                  dir="auto"
                  value={s.values.category}
                  onChange={(e) => {
                    setValue("category", e.target.value);
                    setCb({ open: true, active: -1 });
                    countSoon();
                  }}
                  onKeyDown={onCatKey}
                  onClick={() => (listOpen ? closeList() : openList(true))}
                  onBlur={() => {
                    closeList();
                    checkField("category");
                  }}
                />
              </div>
              <ul
                id="if-cat-list"
                className="if-list"
                role="listbox"
                aria-label={C.catList}
                hidden={!listOpen}
                onMouseDown={(e) => e.preventDefault()} // the input keeps focus
              >
                {options.map((c, i) => (
                  <li
                    key={c.key}
                    role="option"
                    id={`if-opt-${i}`}
                    className="if-opt"
                    aria-selected={i === cb.active}
                    dir="auto"
                    onClick={() => pick(i)}
                  >
                    {c.name}
                  </li>
                ))}
              </ul>
            </div>
            <p className="help" id="if-cat-help">
              {C.catHelp}
            </p>
            <p className="help if-ff" id="if-cat-match" hidden={!matchText}>
              {matchText}
            </p>
            <p className="help if-ff" id="if-cat-none" hidden={!isNew}>
              {isNew ? C.catNone : ""}
            </p>
            {errView("category")}
            <div id={ids.category.mark} className="if-markslot">
              {markView("category")}
            </div>
          </div>

          <div className="if-g" id="if-g-notes">
            <label className="field-label" htmlFor="if-notes">
              Notes
            </label>
            <div className={`field${invalid("notes")}`}>
              <textarea
                id="if-notes"
                rows={3}
                maxLength={SHOP_LIMITS.notes + 100}
                autoComplete="off"
                dir="auto"
                aria-invalid={s.errors.notes ? true : undefined}
                aria-describedby={desc("notes", ["if-notes-help", !!notesCount && "if-notes-count"])}
                value={s.values.notes}
                onChange={(e) => setValue("notes", e.target.value)}
                onBlur={() => checkField("notes")}
              />
            </div>
            <p className="help" id="if-notes-help">
              {C.notesHelp}
            </p>
            <p className="help if-count" id="if-notes-count" hidden={!notesCount}>
              {notesCount}
            </p>
            {errView("notes")}
            <div id={ids.notes.mark} className="if-markslot">
              {markView("notes")}
            </div>
          </div>
        </div>

        <div className="if-bar" id="if-bar" hidden={!!s.banner}>
          <p className={`if-why${s.failed && online ? " is-error" : ""}`} id="if-why" hidden={!why}>
            {why ? (
              <>
                <Icon name={online ? "alert" : "cloud-off"} />
                <span>{why}</span>
              </>
            ) : null}
          </p>
          <p className="err if-summary" id="if-summary" role="alert">
            {s.summary ? summaryText(s.summary) : ""}
          </p>
          <div className="if-acts">
            <button type="button" className="btn-sec" onClick={requestClose}>
              {C.cancel}
            </button>
            <button
              type="submit"
              className="btn-primary"
              id="if-submit"
              aria-keyshortcuts="Control+Enter Meta+Enter"
              aria-disabled={blocked || undefined}
              aria-describedby={why ? "if-why" : undefined}
            >
              {label}
            </button>
          </div>
        </div>
      </form>
      <p className="vh dlg-live" role="status" />
      <p className="vh" role="alert" id="if-alert" />
    </dialog>
  );
});

// `canonValue` is part of the merge's contract; re-exported for the tests of the model.
export { canonValue };
