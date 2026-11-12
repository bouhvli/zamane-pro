import { useQueryClient } from "@tanstack/react-query";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState, type ReactNode } from "react";
import { TRIP_ITEM_TYPES } from "../../../../shared/enums.ts";
import { formatAmount } from "../../../../shared/money.ts";
import { localToday } from "../../../../shared/trip-days.ts";
import { days as daysOf, entryOf, status as statusOf } from "../../../../shared/trip-plan.ts";
import { isApiError } from "../../../lib/api.ts";
import { setTitle } from "../../../lib/announce.ts";
import { day } from "../../../lib/goals.ts";
import {
  createEntry,
  createPlace,
  invalidateTrip,
  putEntry,
  putPlace,
  schedulePlace,
  tripQuery,
  typeName,
  updateEntry,
  updatePlace,
  useTripWrites,
  type EntryItem,
  type PlaceItem,
  type TripData,
} from "../../../lib/trips.ts";
import { Icon } from "../../Icon.tsx";
import type { ToastOptions } from "../../Toast.tsx";
import type { TripActions } from "./actions.ts";
import type { AskOptions } from "./Confirm.tsx";
import {
  alertIn,
  announceIn,
  describedBy,
  DRAFT,
  draftStore,
  Err,
  isIso,
  MarkView,
  sel,
  type Opener,
  type People,
} from "./common.tsx";
import { C, MAX, fmtInt, type Actor } from "./copy.ts";
import { useEngine, type Canon } from "./engine.ts";
import { cfgFor, EMPTY, type FKind, type FV } from "./formModel.ts";
import { useDialog } from "./modal.ts";

export interface FormTarget {
  kind: FKind;
  key: string;
  /** ?date= on a new plan item. */
  dateParam?: string;
}
export interface FinishOpts {
  focus?: string[];
  reveal?: boolean;
  toast?: ToastOptions;
  after?: () => void;
  noNav?: boolean;
}
export interface FormHandle {
  /** The URL lost this dialog's query (Back). Returns true when it asked first (dirty) and keeps the form open. */
  urlGone(): void;
}

type Banner = { type: "tripDeleted"; trip: string } | { type: "missing" };
type Swap = { type: "taken"; entry: EntryItem } | { type: "deleted" };

const canonOf = (kind: FKind, r: EntryItem | PlaceItem | null): Record<string, Canon> => {
  if (!r) return {};
  if (kind === "entry") {
    const e = r as EntryItem;
    return {
      title: e.title,
      type: e.type,
      date: e.date,
      start: e.start,
      end: e.end,
      location: e.location,
      cost: e.cost,
      url: e.url,
      notes: e.notes,
    };
  }
  const p = r as PlaceItem;
  return {
    title: p.title,
    type: p.type,
    mustDo: p.mustDo,
    area: p.area,
    estimate: p.estimate,
    url: p.url,
    notes: p.notes,
  };
};

export const FormDialog = forwardRef<
  FormHandle,
  {
    tripId: string;
    target: FormTarget;
    data: TripData;
    people: People;
    online: boolean;
    actions: TripActions;
    ask: (o: AskOptions) => Promise<boolean>;
    opener: Opener | null;
    /** The dialog is done: the host leaves the query and settles focus. */
    onFinish: (o: FinishOpts, opener: Opener | null) => void;
    /** Push the query again (Back pressed on a dirty form). */
    onRepush: () => void;
    /** "Show in the plan": the host owns the tab switch and the focus. */
    onShowInPlan: (entryId: string) => void;
    tripGone: boolean;
  }
>(function FormDialog(
  { tripId, target, data, people, online, actions, ask, opener, onFinish, onRepush, onShowInPlan, tripGone },
  ref,
) {
  const qc = useQueryClient();
  const writes = useTripWrites();
  const { kind } = target;
  const editing = kind !== "schedule" && target.key !== "new";
  const rec: EntryItem | PlaceItem | null = useMemo(
    () =>
      kind === "entry" && editing
        ? (data.entries.find((e) => e.id === target.key) ?? null)
        : kind !== "entry"
          ? (data.places.find((p) => p.id === target.key) ?? null)
          : null,
    // the record as opened; later versions arrive through the 409 / refetch merge
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const placeSnap = useRef<PlaceItem | null>(kind === "schedule" ? (rec as PlaceItem | null) : null);
  const newId = useRef(crypto.randomUUID());
  const entryId = useRef(crypto.randomUUID());

  // ----- days -----
  const today = localToday();
  const dayList = useMemo(() => daysOf(data.trip, data.entries, today).days, [data.trip, data.entries, today]);
  const dayOptsBase = dayList.map((d) => d.date);

  const dayKey = dayOptsBase.join(",");
  const startCfg = useMemo(
    () => cfgFor(kind, { currency: people.currency, dayOpts: dayKey ? dayKey.split(",") : [] }),
    [kind, people.currency, dayKey],
  );
  const storeKey = `${DRAFT}${tripId}:${kind}:${target.key}`;

  const [detailsOpen, setDetailsOpen] = useState(editing);
  const [restored, setRestored] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState("");
  const [banner, setBanner] = useState<Banner | null>(null);
  const [swap, setSwap] = useState<Swap | null>(null);
  const [copied, setCopied] = useState("");
  const closing = useRef(false);
  const asking = useRef(false);
  const busy = useRef(false);
  const retried = useRef(false);
  const submitting = useRef(false);

  const en = useEngine(startCfg, () => {
    let vals: FV = { ...EMPTY };
    const cfg = startCfg;
    if (editing && rec) {
      for (const [f, c] of Object.entries(canonOf(kind, rec))) vals = cfg.write(vals, f, c);
    } else if (kind === "entry") {
      vals = cfg.write(vals, "date", isIso(target.dateParam) ? target.dateParam : null);
    } else if (kind === "schedule") {
      const st = statusOf(data.trip, today);
      vals = cfg.write(vals, "date", st.kind === "now" ? today : "");
    }
    const base = editing && rec ? canonOf(kind, rec) : cfg.read(vals);
    return { vals, base, updatedAt: rec ? rec.updatedAt : null };
  });
  const s = en.s;
  const v = s.vals;
  const markFor = (f: string) => s.marks[f];

  // The Day select lists each day's load (ia §6.10); a chosen day that left the range stays, labelled (ia F2).
  const dayOpts = [...dayOptsBase];
  const extraDay = isIso(v.day) && !dayOptsBase.includes(v.day) ? v.day : null;
  if (extraDay) dayOpts.push(extraDay);
  // (cfgFor sees the base options; `extraDay` is only ever set from the select itself.)

  const dlgRef = useRef<HTMLDialogElement | null>(null);

  // ----- a stored draft -----
  const restoredOnce = useRef(false);
  useEffect(() => {
    if (restoredOnce.current) return;
    restoredOnce.current = true;
    if (kind === "schedule") return;
    const stored = draftStore.get(storeKey) as {
      v: number;
      values: Record<string, Canon>;
      base?: Record<string, Canon>;
      updatedAt?: string;
      details?: boolean;
    } | null;
    const init = JSON.parse(en.s.initialJSON) as Record<string, Canon>;
    if (stored?.values && JSON.stringify(stored.values) !== JSON.stringify(init)) {
      let vals = en.s.vals;
      for (const f of Object.keys(stored.values)) vals = startCfg.write(vals, f, stored.values[f] ?? null);
      en.setVals(() => vals);
      if (stored.details) setDetailsOpen(true);
      setRestored(true);
      if (
        editing &&
        rec &&
        stored.updatedAt &&
        new Date(stored.updatedAt).getTime() !== new Date(rec.updatedAt).getTime()
      ) {
        // The record changed since the draft was written: keep their edits, mark what is new.
        const cfgBase = stored.base;
        if (cfgBase) en.reset({ vals, base: cfgBase, updatedAt: stored.updatedAt });
        const n = en.merge(
          canonOf(kind, rec),
          rec.updatedAt,
          { kind: "other" },
          kind === "entry" ? "plan item" : "place",
          false,
        );
        if (n) announceIn(dlgRef.current, en.s.notice?.text ?? "");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once on open
  }, []);

  const persistNow = () => {
    if (kind === "schedule" || closing.current || banner) return;
    if (!en.dirty()) {
      draftStore.del(storeKey);
      return;
    }
    draftStore.set(storeKey, {
      v: 1,
      values: en.values(),
      base: en.s.base,
      updatedAt: en.s.updatedAt,
      details: detailsOpen,
    });
  };
  const persistRef = useRef(persistNow);
  persistRef.current = persistNow;
  const clearDraft = () => draftStore.del(storeKey);
  useEffect(() => {
    if (kind === "schedule") return;
    const t = setTimeout(() => persistRef.current(), 250);
    return () => clearTimeout(t);
  }, [s.vals, detailsOpen, kind]);
  useEffect(() => {
    const flush = () => persistRef.current();
    const vis = () => document.visibilityState === "hidden" && flush();
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", vis);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", vis);
      // the route left this dialog without a close (another trip, another page): keep the draft
      if (!closing.current) persistRef.current();
    };
  }, []);

  // ----- head and title -----
  const tripTitle = data.trip.title;
  const recTitle = rec?.title ?? "";
  const head =
    kind === "entry"
      ? editing
        ? C.pHeadEdit
        : C.pHeadNew
      : kind === "place"
        ? editing
          ? C.plHeadEdit
          : C.plHeadNew
        : C.sHead;
  useEffect(() => {
    const prev = document.title;
    const doc = `${kind === "schedule" ? `Schedule ${recTitle}` : editing ? `Edit ${recTitle}` : head}: ${tripTitle}`;
    setTitle(doc);
    const own = document.title;
    return () => {
      if (document.title === own) document.title = prev;
    };
  }, [kind, editing, recTitle, head, tripTitle]);

  // ----- focus on open -----
  useEffect(() => {
    if (banner) document.getElementById("dg-banner-h")?.focus();
    else if (swap) document.getElementById("dg-swap-first")?.focus();
    else if (kind === "schedule") document.getElementById("dgf-day")?.focus();
    else if (editing) document.getElementById("dg-f-h")?.focus();
    else document.getElementById("dgf-title")?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once on open
  }, []);

  // ----- finishing -----
  const finish = (o: FinishOpts) => {
    if (closing.current) return;
    closing.current = true;
    onFinish(o, opener);
  };
  const askDiscard = async () => {
    asking.current = true;
    const yes = await ask({
      title: editing ? C.discardEditTitle : kind === "entry" ? C.pDiscardTitle : C.plDiscardTitle,
      body: [editing ? `Your changes to ${recTitle} won't be saved.` : C.discardBody],
      confirm: C.discard,
      cancel: C.keepEditing,
    });
    asking.current = false;
    if (yes) {
      clearDraft();
      finish({});
    }
  };
  const requestClose = () => {
    if (asking.current || closing.current || saving) return;
    if (kind !== "schedule" && !banner && en.dirty()) void askDiscard();
    else {
      clearDraft();
      finish({});
    }
  };
  useImperativeHandle(ref, () => ({
    urlGone() {
      if (closing.current) return;
      if (kind !== "schedule" && !banner && en.dirty()) {
        onRepush();
        if (!asking.current) void askDiscard();
        return;
      }
      clearDraft();
      finish({ noNav: true });
    },
  }));
  const dlg = useDialog(true, requestClose, "form");
  dlgRef.current = dlg.ref.current;

  // ----- trip gone -----
  useEffect(() => {
    if (tripGone && !banner) showBanner({ type: "tripDeleted", trip: tripTitle });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripGone]);
  // The record deleted behind an open edit (the list refetched): the banner, with Copy text.
  const stillThere =
    kind === "entry" ? data.entries.some((e) => e.id === target.key) : data.places.some((p) => p.id === target.key);
  useEffect(() => {
    if ((editing || kind === "schedule") && !stillThere && !busy.current && !banner && !swap) {
      if (kind === "schedule") {
        setSwap({ type: "deleted" });
        announceIn(dlgRef.current, `${people.name(null)} deleted this place.`);
      } else showBanner({ type: "missing" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stillThere]);
  // A place scheduled by the partner while this dialog is open: "already in the plan".
  const taken = kind === "schedule" && rec ? entryOf(rec, data.entries) : null;
  useEffect(() => {
    if (taken && !swap && !saving) setSwap({ type: "taken", entry: taken });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taken?.id]);

  function showBanner(b: Banner) {
    setBanner(b);
    setSaving(false);
    submitting.current = false;
    const plain =
      b.type === "tripDeleted"
        ? `${people.name(null)} deleted ${b.trip}. This can't be saved.`
        : kind === "entry"
          ? C.pMissing
          : C.plMissing;
    alertIn(dlgRef.current, plain);
    setTimeout(() => {
      const a = document.activeElement;
      if (!a || !dlgRef.current?.contains(a)) document.getElementById("dg-banner-h")?.focus();
    }, 0);
  }

  // ----- field handlers -----
  const notesLen = v.notes.length;
  const overnight = !!(v.start && v.end && v.end < v.start);
  const set = (f: string | null, patch: Partial<FV>) => en.change(f, { ...en.s.vals, ...patch });
  const focusField = (f: string) => {
    const d = startCfg.defs[f];
    if (d?.inDetails) setDetailsOpen(true);
    setTimeout(() => {
      const ids: Record<string, string> = {
        title: "dgf-title",
        location: "dgf-location",
        cost: "dgf-cost",
        url: "dgf-url",
        notes: "dgf-notes",
        area: "dgf-area",
        estimate: "dgf-estimate",
        start: "dgf-start",
        end: "dgf-end",
        mustDo: "dgf-mustdo",
        date: kind === "entry" && en.s.vals.day === "another" ? "dgf-date" : "dgf-day",
      };
      if (f === "type")
        (
          document.querySelector<HTMLInputElement>('input[name="dgf-type"]:checked') ??
          document.querySelector<HTMLInputElement>('input[name="dgf-type"]')
        )?.focus();
      else document.getElementById(ids[f] ?? "")?.focus();
    }, 0);
  };
  const applyTheirs = (f: string) => {
    if (en.useTheirs(f)) {
      announceIn(dlgRef.current, C.resolved);
      focusField(f);
    }
  };
  const noticeRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (s.notice?.focus) noticeRef.current?.focus();
    else if (s.notice) announceIn(dlgRef.current, s.notice.text);
  }, [s.notice]);

  const err = (f: string) => s.errors[f] ?? "";
  const aria = (f: string, ...help: (string | false)[]) =>
    describedBy(
      err(f) && `dgf-${f === "date" ? (kind === "entry" ? "date" : "day") : f}-err`,
      ...help,
      s.marks[f] && `${startCfg.defs[f]?.markId}-text`,
    );

  // ----- submit -----
  const blocked = !online && !(kind === "place" && !editing);
  const label = saving
    ? editing
      ? C.saving
      : C.adding
    : kind === "entry"
      ? editing
        ? C.saveChanges
        : C.pSubmitNew
      : kind === "place"
        ? editing
          ? C.saveChanges
          : C.plSubmitNew
        : isIso(v.day)
          ? `Add to ${day(v.day)}`
          : C.sSubmit;
  const reason = !online
    ? kind === "place" && !editing
      ? ""
      : kind === "schedule"
        ? C.rSchedule
        : editing
          ? C.rSave
          : C.rAdd
    : "";
  const info = !online && kind === "place" && !editing ? C.placeOfflineNew : "";
  const why = reason || info || failed;

  async function conflict(fresh: TripData | null) {
    const cur =
      fresh &&
      (kind === "entry"
        ? fresh.entries.find((e) => e.id === target.key)
        : fresh.places.find((p) => p.id === target.key));
    if (!cur) {
      showBanner({ type: "missing" });
      return;
    }
    const n = en.merge(
      canonOf(kind, cur),
      cur.updatedAt,
      { kind: "other" } as Actor,
      kind === "entry" ? "plan item" : "place",
      true,
    );
    if (!n && !retried.current) {
      retried.current = true;
      void commit();
      return;
    }
    retried.current = false;
  }

  async function commit() {
    const val = en.values();
    const notes = v.notes.replace(/\s+$/, "");
    const money = (c: Canon) => (typeof c === "number" ? c : null);
    submitting.current = true;
    setSaving(true);
    setFailed("");
    try {
      if (kind === "entry") {
        const out = {
          type: v.type,
          title: String(val.title),
          date: (val.date as string | null) || null,
          start: (val.start as string | null) || null,
          end: val.start ? (val.end as string | null) || null : null,
          location: String(val.location ?? ""),
          cost: money(val.cost ?? null),
          url: String(val.url ?? ""),
          notes,
        };
        if (!editing) {
          const r = await createEntry(tripId, { id: newId.current, ...out });
          putEntry(qc, tripId, r.entry);
          invalidateTrip(qc, tripId);
          clearDraft();
          finish({ focus: [sel("entry", r.entry.id)], reveal: true, toast: actions.entryAddedToast(r.entry) });
          return;
        }
        busy.current = true;
        const r = await updateEntry(tripId, target.key, { ...out, updatedAt: en.s.updatedAt! });
        putEntry(qc, tripId, r.entry);
        invalidateTrip(qc, tripId);
        clearDraft();
        finish({ focus: [sel("entry", target.key)], reveal: true, toast: { msg: C.saved } });
      } else if (kind === "place") {
        const out = {
          type: v.type,
          title: String(val.title),
          mustDo: !!val.mustDo,
          area: String(val.area ?? ""),
          estimate: money(val.estimate ?? null),
          url: String(val.url ?? ""),
          notes,
        };
        if (!editing) {
          const queued = !navigator.onLine;
          let place: PlaceItem;
          if (queued) {
            const at = new Date().toISOString();
            writes.addPlace({ tripId, id: newId.current, ...out, actorId: people.meId, at });
            place = {
              id: newId.current,
              tripId,
              ...out,
              area: out.area,
              notes,
              url: out.url,
              createdBy: people.meId,
              createdAt: at,
              updatedAt: at,
              pending: true,
            };
          } else {
            const r = await createPlace(tripId, { id: newId.current, ...out });
            putPlace(qc, tripId, r.place);
            invalidateTrip(qc, tripId);
            place = r.place;
          }
          clearDraft();
          finish({ focus: [sel("place", place.id)], reveal: true, toast: actions.placeAddedToast(place, queued) });
          return;
        }
        busy.current = true;
        const r = await updatePlace(tripId, target.key, { ...out, updatedAt: en.s.updatedAt! });
        putPlace(qc, tripId, r.place);
        invalidateTrip(qc, tripId);
        clearDraft();
        finish({ focus: [sel("place", target.key)], reveal: true, toast: { msg: C.saved } });
      } else {
        const d = v.day;
        const r = await schedulePlace(tripId, target.key, {
          id: entryId.current,
          date: isIso(d) ? d : null,
          start: v.start || null,
          end: v.start ? v.end || null : null,
        });
        putEntry(qc, tripId, r.entry);
        invalidateTrip(qc, tripId);
        finish({
          focus: [sel("inplan", target.key), sel("place", target.key)],
          toast: actions.scheduledToast((rec ?? placeSnap.current)?.title ?? "", r.entry),
        });
      }
    } catch (e) {
      busy.current = false;
      submitting.current = false;
      setSaving(false);
      if (isApiError(e, "not_found")) {
        if (kind === "schedule") {
          setSwap({ type: "deleted" });
          announceIn(dlgRef.current, `${people.name(null)} deleted this place.`);
        } else if (!editing) showBanner({ type: "tripDeleted", trip: tripTitle });
        else showBanner({ type: "missing" });
        return;
      }
      if (isApiError(e, "conflict")) {
        const fresh = await qc.fetchQuery({ ...tripQuery(tripId), staleTime: 0 }).catch(() => null);
        if (kind === "schedule") {
          const held = fresh && rec ? entryOf(rec, fresh.entries) : null;
          if (held) {
            setSwap({ type: "taken", entry: held });
            return;
          }
        } else {
          await conflict(fresh as TripData | null);
          return;
        }
      }
      setFailed(kind === "schedule" ? C.sFailed : editing ? C.pFailedEdit : kind === "entry" ? C.pFailed : C.plFailed);
    }
  }

  async function press() {
    if (saving || banner || swap || closing.current || submitting.current) return;
    if (blocked) {
      if (why) announceIn(dlgRef.current, why);
      return;
    }
    const first = en.validateAll();
    if (first) {
      focusField(first);
      return;
    }
    await commit();
  }

  async function formDelete() {
    const r = rec;
    if (!r) {
      showBanner({ type: "missing" });
      return;
    }
    if (!online) {
      announceIn(dlgRef.current, C.rDelete);
      return;
    }
    asking.current = true;
    const yes = await ask(
      kind === "entry"
        ? actions.confirmEntry(r as EntryItem)
        : actions.confirmPlace(r as PlaceItem, people.name(null) === "Your partner" ? null : people.name(null)),
    );
    asking.current = false;
    if (!yes) return;
    busy.current = true;
    const res = await (kind === "entry"
      ? actions.deleteEntryNow(r as EntryItem)
      : actions.deletePlaceNow(r as PlaceItem));
    if (!res) {
      busy.current = false;
      showBanner({ type: "missing" });
      return;
    }
    clearDraft();
    finish({ focus: res.focus, reveal: true, toast: res.toast });
  }

  async function copyText() {
    const val = en.values();
    const text = [
      String(val.title ?? ""),
      String(val.location || val.area || ""),
      String(val.url ?? ""),
      v.notes.trim(),
    ]
      .filter(Boolean)
      .join("\n");
    const done = (ok: boolean) => {
      setCopied(ok ? C.copied : C.copyFailed);
      if (ok) announceIn(dlgRef.current, C.copied);
      else alertIn(dlgRef.current, C.copyFailed);
    };
    try {
      await navigator.clipboard.writeText(text);
      done(true);
    } catch {
      done(false);
    }
  }

  function discardDraft() {
    void (async () => {
      asking.current = true;
      const yes = await ask({
        title: editing ? C.discardEditTitle : kind === "entry" ? C.pDiscardTitle : C.plDiscardTitle,
        body: [editing ? `Your changes to ${recTitle} won't be saved.` : C.discardBody],
        confirm: C.discard,
        cancel: C.keepEditing,
      });
      asking.current = false;
      if (!yes) return;
      const init = JSON.parse(en.s.initialJSON) as Record<string, Canon>;
      let vals: FV = { ...EMPTY, ...(kind === "schedule" ? {} : {}) };
      for (const f of Object.keys(init)) vals = startCfg.write(vals, f, init[f] ?? null);
      en.discardTo(vals);
      clearDraft();
      setRestored(false);
      focusField(kind === "schedule" ? "date" : "title");
    })();
  }

  // ----- pieces of markup -----
  const mark = (f: string) => {
    const def = startCfg.defs[f];
    if (!def) return null; // the block is built for every kind, but only its own kind shows it
    return (
      <div className="dg-mark-slot" id={def.markId}>
        <MarkView
          id={def.markId}
          mark={markFor(f)}
          label={def.label}
          text={en.markText(f)}
          withLabel={f === "start" || f === "end"}
          onUseTheirs={() => applyTheirs(f)}
        />
      </div>
    );
  };
  const text = (o: {
    f: keyof FV & string;
    id: string;
    label: string;
    labelSr?: string;
    help?: string;
    type?: string;
    area?: boolean;
    suffix?: string;
    cls?: string;
    counter?: boolean;
    attrs?: Record<string, unknown>;
    field?: string;
  }) => {
    const field = o.field ?? o.f;
    const value = String(v[o.f]);
    const countShown = !!o.counter && notesLen >= 3600;
    const common = {
      id: o.id,
      value,
      "aria-invalid": err(field) ? true : undefined,
      "aria-describedby": aria(field, !!o.help && `${o.id}-help`, countShown && `${o.id}-count`),
      onChange: (e: { target: { value: string } }) => set(field, { [o.f]: e.target.value } as Partial<FV>),
      onBlur: () => en.blur(field),
      ...(o.attrs ?? {}),
    };
    return (
      <div className="dg-fg">
        <label className="field-label" htmlFor={o.id}>
          {o.label}
          {o.labelSr && <span className="vh"> {o.labelSr}</span>}
        </label>
        <div className={`field${o.cls ? ` ${o.cls}` : ""}${err(field) ? " is-invalid" : ""}`}>
          {o.area ? <textarea rows={3} dir="auto" {...common} /> : <input type={o.type ?? "text"} {...common} />}
          {o.suffix && (
            <span className="suffix" aria-hidden="true">
              {o.suffix}
            </span>
          )}
        </div>
        <Err id={`${o.id}-err`} msg={err(field)} />
        {o.help && (
          <p className="help" id={`${o.id}-help`}>
            {o.help}
          </p>
        )}
        {o.counter && (
          <p className="help dg-count" id={`${o.id}-count`} hidden={!countShown}>
            {countShown ? `${fmtInt(notesLen)} of ${fmtInt(MAX.notes)}` : ""}
          </p>
        )}
        {mark(field)}
      </div>
    );
  };
  const urlAttrs = { inputMode: "url" as const, autoComplete: "off", spellCheck: false, dir: "ltr" };
  const typeChips = (
    <fieldset className="dg-fg" id="dgf-type" aria-describedby={describedBy(s.marks.type && "dgf-type-mark-text")}>
      <legend className="field-label">{C.type}</legend>
      <div className="dg-chips">
        {TRIP_ITEM_TYPES.map((t) => (
          <label className="dg-chip" key={t}>
            <input
              type="radio"
              name="dgf-type"
              value={t}
              checked={v.type === t}
              onChange={() => set("type", { type: t })}
            />
            <Icon name={t} />
            <span>{typeName(t)}</span>
          </label>
        ))}
      </div>
      {mark("type")}
    </fieldset>
  );
  const dateOutside =
    kind === "entry" &&
    v.day === "another" &&
    !!v.date &&
    !!data.trip.startDate &&
    (v.date < data.trip.startDate || v.date > (data.trip.endDate ?? data.trip.startDate));
  const dayBlock = (
    <div className="dg-fg">
      <label className="field-label" htmlFor="dgf-day">
        {C.day}
      </label>
      <div className="field dg-select">
        <select
          id="dgf-day"
          value={v.day}
          aria-describedby={describedBy(
            kind === "entry" && s.marks.date && "dgf-day-mark-text",
            kind === "schedule" && err("date") && "dgf-day-err",
            kind === "schedule" && s.marks.date && "dgf-day-mark-text",
          )}
          aria-invalid={kind === "schedule" && err("date") ? true : undefined}
          onChange={(e) => set("date", { day: e.target.value })}
          onBlur={() => en.blur("date")}
        >
          {kind === "schedule" && <option value="">{C.sPlaceholder}</option>}
          {dayOpts.map((d) => {
            const g = dayList.find((x) => x.date === d);
            const n = g?.entries.length ?? 0;
            return (
              <option key={d} value={d}>
                {g
                  ? `${day(d)}${g.n != null ? ` · Day ${g.n}` : ""} · ${n ? `${n} planned` : "nothing planned"}`
                  : `${day(d)} · outside the new dates`}
              </option>
            );
          })}
          <option value="none">{C.noDate}</option>
          {kind === "entry" && <option value="another">{C.another}</option>}
        </select>
        <Icon name="chevron-down" />
      </div>
      <Err id="dgf-day-err" msg={kind === "schedule" ? err("date") : ""} />
      {kind === "entry" && (
        <div className="dg-another" id="dgf-another" hidden={v.day !== "another"}>
          <label className="field-label" htmlFor="dgf-date">
            {C.date}
          </label>
          <div className={`field dg-datefield${err("date") ? " is-invalid" : ""}`}>
            <input
              id="dgf-date"
              type="date"
              value={v.date}
              aria-invalid={err("date") ? true : undefined}
              aria-describedby={describedBy(err("date") && "dgf-date-err", dateOutside && "dgf-date-help")}
              onChange={(e) => set("date", { date: e.target.value })}
              onBlur={() => en.blur("date")}
            />
          </div>
          <Err id="dgf-date-err" msg={err("date")} />
          <p className="help" id="dgf-date-help" hidden={!dateOutside}>
            {C.outside}
          </p>
        </div>
      )}
      {mark("date")}
    </div>
  );
  const timeBlock = (
    <fieldset className="dg-fg">
      <legend className="field-label">{C.time}</legend>
      <div className="dg-times">
        <div className="dg-t">
          <label className="dg-sub" htmlFor="dgf-start">
            {C.start}
          </label>
          <div className="field dg-tf">
            <input
              id="dgf-start"
              type="time"
              value={v.start}
              aria-describedby={describedBy("dgf-time-help", s.marks.start && "dgf-start-mark-text")}
              onChange={(e) => set("start", { start: e.target.value })}
              onBlur={() => en.blur("start")}
            />
          </div>
        </div>
        <span className="dg-dash" aria-hidden="true">
          –
        </span>
        <div className="dg-t">
          <label className="dg-sub" htmlFor="dgf-end">
            {C.end}
          </label>
          <div className="field dg-tf">
            <input
              id="dgf-end"
              type="time"
              value={v.end}
              aria-invalid={err("end") ? true : undefined}
              aria-describedby={describedBy(
                err("end") && "dgf-end-err",
                "dgf-time-help",
                overnight && "dgf-overnight",
                s.marks.end && "dgf-end-mark-text",
              )}
              onChange={(e) => set("end", { end: e.target.value })}
              onBlur={() => en.blur("end")}
            />
          </div>
        </div>
      </div>
      <Err id="dgf-end-err" msg={err("end")} />
      {mark("start")}
      {mark("end")}
      <p className="help" id="dgf-time-help">
        {C.timeHelp}
      </p>
      <p className="help" id="dgf-overnight" hidden={!overnight}>
        {C.overnight}
      </p>
    </fieldset>
  );

  const details = (inner: ReactNode) => (
    <>
      {!editing && (
        <button
          type="button"
          className="dg-toggle"
          data-act="details"
          aria-expanded={detailsOpen}
          aria-controls="dgf-details"
          onClick={() => setDetailsOpen((o) => !o)}
        >
          <span>{C.optional}</span>
          <Icon name="chevron-down" />
        </button>
      )}
      <div className="dg-details" id="dgf-details" hidden={!editing && !detailsOpen}>
        {inner}
      </div>
    </>
  );
  const endBlock = rec && editing && (
    <div className="dg-end">
      <button
        type="button"
        className="btn-danger"
        id="dgf-delete"
        data-act="delete"
        aria-label={`Delete ${rec.title}`}
        aria-disabled={!online ? true : undefined}
        aria-describedby={!online ? "dgf-del-why" : undefined}
        onClick={() => void formDelete()}
      >
        <Icon name="trash" />
        {C.del}
      </button>
      <p className="caption dg-reasons" id="dgf-del-why" hidden={online}>
        {C.rDelete}
      </p>
    </div>
  );

  const slots = (
    <>
      <div className="dg-slot" id="dgf-banner">
        {banner && (
          <div className="dg-banner">
            <p className="dg-banner-h" id="dg-banner-h" tabIndex={-1}>
              <Icon name="alert" />
              <span>
                {banner.type === "tripDeleted" ? (
                  <>
                    {people.name(null)} deleted <bdi>{banner.trip}</bdi>. This can&apos;t be saved.
                  </>
                ) : kind === "entry" ? (
                  C.pMissing
                ) : (
                  C.plMissing
                )}
              </span>
            </p>
            <div className="dg-banner-acts">
              {kind !== "schedule" && !swap && (
                <button type="button" className="btn-sec" data-act="copy" onClick={() => void copyText()}>
                  {C.copyText}
                </button>
              )}
              <button
                type="button"
                className="btn-sec"
                data-act="close-now"
                onClick={() => {
                  clearDraft();
                  finish({});
                }}
              >
                {C.close}
              </button>
            </div>
            <p className="caption dg-copied" id="dg-copied">
              {copied}
            </p>
          </div>
        )}
      </div>
      <div className="dg-slot" id="dgf-restored">
        {restored && (
          <p className="notice dg-restored">
            <span>{C.restored}</span>
            <button type="button" className="link-btn" data-act="discard-draft" onClick={discardDraft}>
              {C.discardDraft}
            </button>
          </p>
        )}
      </div>
      <div className="dg-slot" id="dgf-merge">
        {s.notice && (
          <p className="notice dg-notice" id="dgf-merge-text" tabIndex={-1} ref={noticeRef}>
            <Icon name="refresh" />
            <span>{s.notice.text}</span>
          </p>
        )}
      </div>
    </>
  );

  const place = (kind === "schedule" ? (rec ?? placeSnap.current) : null) as PlaceItem | null;
  const what =
    place &&
    (() => {
      const vis =
        typeName(place.type) +
        (place.estimate === 0
          ? " · Free"
          : place.estimate != null
            ? ` · ~${formatAmount(place.estimate, people.currency)}`
            : "");
      const sr = `${place.title}, ${typeName(place.type)}${place.estimate === 0 ? ", free" : place.estimate != null ? `, about ${formatAmount(place.estimate, people.currency)}` : ""}`;
      return (
        <div className="idea dg-what">
          <Icon name={place.type} />
          <p>
            <span aria-hidden="true">
              <b dir="auto">{place.title}</b>
              <span className="dg-what-meta">{vis}</span>
            </span>
            <span className="vh">{sr}</span>
          </p>
        </div>
      );
    })();

  let bodyContent: ReactNode;
  if (swap) {
    const msg =
      swap.type === "taken"
        ? swap.entry.date
          ? swap.entry.createdBy !== people.meId
            ? `${people.name(swap.entry.createdBy)} already put this on ${day(swap.entry.date)}.`
            : `This place is already in the plan on ${day(swap.entry.date)}.`
          : swap.entry.createdBy !== people.meId
            ? `${people.name(swap.entry.createdBy)} already put this in the plan, with no date yet.`
            : "This place is already in the plan, with no date yet."
        : `${people.name(null)} deleted this place.`;
    bodyContent = (
      <>
        {slots}
        {what}
        <div className="dg-swap">
          <p className="dg-swap-msg" id="dg-swap-msg">
            {msg}
          </p>
          <div className="dg-swap-acts">
            {swap.type === "taken" ? (
              <>
                <button
                  type="button"
                  className="btn-primary"
                  data-act="taken-show"
                  data-id={swap.entry.id}
                  id="dg-swap-first"
                  aria-describedby="dg-swap-msg"
                  onClick={() => finish({ after: () => onShowInPlan(swap.entry.id) })}
                >
                  {C.showInPlan}
                </button>
                <button type="button" className="btn-sec" data-act="close-now" onClick={() => finish({})}>
                  {C.close}
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn-sec"
                data-act="close-now"
                id="dg-swap-first"
                aria-describedby="dg-swap-msg"
                onClick={() => finish({})}
              >
                {C.close}
              </button>
            )}
          </div>
        </div>
      </>
    );
  } else if (kind === "entry") {
    const from =
      rec && (rec as EntryItem).placeId ? data.places.find((p) => p.id === (rec as EntryItem).placeId) : null;
    bodyContent = (
      <>
        {slots}
        {from && <p className="dg-info">From Places: {from.title}</p>}
        {text({
          f: "title",
          id: "dgf-title",
          label: C.title,
          help: C.pTitleHelp,
          attrs: { autoComplete: "off", enterKeyHint: "done", required: true, dir: "auto" },
        })}
        {typeChips}
        {dayBlock}
        {timeBlock}
        {details(
          <>
            {text({
              f: "location",
              id: "dgf-location",
              label: C.location,
              help: C.locationHelp,
              attrs: { autoComplete: "off", dir: "auto" },
            })}
            {text({
              f: "cost",
              id: "dgf-cost",
              label: C.cost,
              labelSr: `in ${people.currency}`,
              suffix: people.currency,
              help: C.costHelp,
              cls: "dg-money",
              attrs: { inputMode: "decimal", autoComplete: "off" },
            })}
            {text({ f: "url", id: "dgf-url", label: C.link, type: "url", help: C.urlHelp, attrs: urlAttrs })}
            {text({ f: "notes", id: "dgf-notes", label: C.notes, area: true, help: C.notesHelp, counter: true })}
          </>,
        )}
        {endBlock}
      </>
    );
  } else if (kind === "place") {
    const inPlan = rec ? entryOf(rec, data.entries) : null;
    bodyContent = (
      <>
        {slots}
        {inPlan && (
          <p className="dg-info" id="dgf-editnote">
            {C.editNote}
          </p>
        )}
        {text({
          f: "title",
          id: "dgf-title",
          label: C.title,
          help: C.plTitleHelp,
          attrs: { autoComplete: "off", enterKeyHint: "done", required: true, dir: "auto" },
        })}
        {typeChips}
        <div className="dg-fg">
          <div className="dg-check">
            <input
              type="checkbox"
              id="dgf-mustdo"
              checked={v.mustDo}
              aria-describedby={describedBy("dgf-mustdo-help", s.marks.mustDo && "dgf-mustdo-mark-text")}
              onChange={(e) => set("mustDo", { mustDo: e.target.checked })}
            />
            <label htmlFor="dgf-mustdo">
              <Icon name="star" />
              {C.mustDo}
            </label>
          </div>
          <p className="help" id="dgf-mustdo-help">
            {C.mustHelp}
          </p>
          {mark("mustDo")}
        </div>
        {details(
          <>
            {text({
              f: "area",
              id: "dgf-area",
              label: C.area,
              help: C.areaHelp,
              attrs: { autoComplete: "off", dir: "auto" },
            })}
            {text({
              f: "estimate",
              id: "dgf-estimate",
              label: C.estimate,
              labelSr: `in ${people.currency}`,
              suffix: people.currency,
              help: C.estHelp,
              cls: "dg-money",
              attrs: { inputMode: "decimal", autoComplete: "off" },
            })}
            {text({ f: "url", id: "dgf-url", label: C.link, type: "url", help: C.urlHelp, attrs: urlAttrs })}
            {text({ f: "notes", id: "dgf-notes", label: C.notes, area: true, help: C.notesHelp, counter: true })}
          </>,
        )}
        {endBlock}
      </>
    );
  } else {
    bodyContent = (
      <>
        {slots}
        {what}
        {dayBlock}
        {timeBlock}
        <p className="help dg-note">{C.sNote}</p>
      </>
    );
  }

  const barHidden = !!(banner || swap);

  return (
    <dialog
      ref={dlg.ref}
      id="dg-form"
      className={`sheet dg-form${kind === "schedule" ? " is-schedule" : ""}`}
      data-no-place=""
      aria-label={`${kind === "schedule" ? `Schedule ${recTitle}` : head}: ${tripTitle}`}
      {...dlg.props}
      onKeyDown={(e) => {
        dlg.props.onKeyDown(e);
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          void press();
        }
      }}
    >
      <form
        className="dg-f"
        id="dg-f"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void press();
        }}
      >
        <div className="dg-head">
          <button type="button" className="icon-btn dg-x" data-act="close" aria-label={C.close} onClick={requestClose}>
            <Icon name="x" />
          </button>
          <div className="dg-titles">
            <h2 id="dg-f-h" tabIndex={-1}>
              {head}
            </h2>
            <p className="caption" id="dg-f-sub" dir="auto">
              {tripTitle}
            </p>
          </div>
        </div>
        <div className="dg-body" id="dg-f-body">
          {bodyContent}
        </div>
        <div className="dg-bar" id="dg-bar" hidden={barHidden}>
          <p className="dg-why" id="dg-why" hidden={!why}>
            {why && (
              <>
                <Icon name={!online ? "cloud-off" : "alert"} />
                <span>{why}</span>
              </>
            )}
          </p>
          <div className="dg-bar-acts">
            <button type="button" className="btn-sec dg-cancel" data-act="close" onClick={requestClose}>
              {C.cancel}
            </button>
            <button
              type="submit"
              className="btn-primary dg-submit"
              id="dg-submit"
              aria-keyshortcuts="Control+Enter Meta+Enter"
              aria-disabled={saving || blocked ? true : undefined}
              aria-describedby={why ? "dg-why" : undefined}
            >
              {label}
            </button>
          </div>
        </div>
      </form>
      <p className="vh dlg-live" role="status" />
      <p className="vh" role="alert" id="dg-f-alert" />
    </dialog>
  );
});
