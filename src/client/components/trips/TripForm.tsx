import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouter } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { v7 as uuidv7 } from "uuid";
import { formatAmount, formatAmountNumber, minorUnits, parseMoney } from "../../../shared/money.ts";
import type { ImageAsset } from "../../../shared/schemas/goals.ts";
import { TRIP_LIMITS, TRIP_MSG, type TripResponse, type TripView } from "../../../shared/schemas/trips.ts";
import { localToday } from "../../../shared/trip-days.ts";
import { dayDiff, status } from "../../../shared/trip-plan.ts";
import { api, isApiError } from "../../lib/api.ts";
import { say, setTitle } from "../../lib/announce.ts";
import { setFlash } from "../../lib/flash.ts";
import { day, plural } from "../../lib/goals.ts";
import { focusHeading, useArrival, useNoFab } from "../../lib/nav.ts";
import { useOnline } from "../../lib/online.ts";
import {
  createTrip,
  deleteTrip,
  dropTrip,
  invalidateTrip,
  putTrip,
  range,
  tripQuery,
  tripsQuery,
  updateTrip,
} from "../../lib/trips.ts";
import { checkPhoto, uploadPhoto, UploadError } from "../../lib/uploads.ts";
import { ConfirmDialog } from "../ConfirmDialog.tsx";
import { Icon } from "../Icon.tsx";
import { Toast, type ToastHandle } from "../Toast.tsx";
import { LightBand, TripDoorway } from "./Bits.tsx";
import {
  clearDraft as dropDraft,
  draftKey,
  readDraft,
  writeDraft as storeDraft,
  type TripDraft,
  type TripSnap,
} from "./form/drafts.ts";

/**
 * Create and edit a trip (.ux-forge/trips form.js, direction B · Saffron light): one view for both modes. A task
 * page (no bottom nav on phones; ✕ Cancel and the title in a sticky head), the primary in a footer bar that rides
 * the keyboard. Title in Young Serif inside its field; Optional details (destination, dates as a pair, budget, notes,
 * the cover photo in its doorway) folded on create, open on edit. Errors under the field, shown on blur after typing
 * and on submit, cleared as soon as valid. Edit shows what new dates will do before saving. Drafts on this phone
 * (form/drafts.ts). Edit saves only what changed with the updatedAt it started from; a 409 is merged three ways
 * (theirs taken where only they changed a field, marked where both did) and focus goes to the notice. Realtime
 * (Phase 5) will name the partner; until then every concurrent change reads "on another phone".
 */

// ---------- strings: form.js C, verbatim ----------
const C = {
  createHeading: "New trip",
  editHeading: "Edit trip",
  cancel: "Cancel",
  createSubmit: "Create trip",
  createPending: "Creating…",
  createWaiting: "Creating after the photo…",
  createOffline: "You're offline. You can create the trip when you're back online. What you've typed stays here.",
  createOnline: "Back online. You can create the trip now.",
  created: "Trip created.",
  createFailed: "Couldn't create the trip. Try again.",
  editSubmit: "Save changes",
  editPending: "Saving…",
  editOffline: "You're offline. You can save your changes when you're back online. What you've changed stays here.",
  editOnline: "Back online. You can save your changes now.",
  editFailed: "Couldn't save the changes. Try again.",
  saved: "Changes saved",
  titleLabel: "Title",
  titleHelp: "For example, Weekend in Fes",
  details: "Optional details",
  destLabel: "Destination",
  destHelp: "Optional. A city, a region or a country.",
  datesLegend: "Dates",
  datesHelp: "Optional. Add both days, or leave both empty.",
  firstLabel: "First day",
  lastLabel: "Last day",
  datesPassed: "These dates have passed.",
  budgetLabel: "Budget",
  budgetHelp: "Optional. What you two want to spend in total.",
  notesLabel: "Notes",
  notesHelp: "Optional. Anything you both should know.",
  coverLabel: "Cover photo",
  coverHelp: "Shown on the trip's card. Without one, the first letter of the title is used.",
  coverAdd: "Add a cover photo",
  coverReplace: "Replace",
  coverReplaceLabel: "Replace cover photo",
  coverRemove: "Remove",
  coverRemoveLabel: "Remove cover photo",
  coverUploading: "Uploading photo…",
  coverUploadingAnn: "Uploading photo.",
  coverUploadedAnn: "Photo added.",
  coverFailed: "The photo didn't upload. Try again or remove it.",
  retry: "Try again",
  retryLabel: "Try again: cover photo",
  coverOffline: "Photos need a connection.",
  coverRestore: "The cover changes when you save. Cancel keeps the current one.",
  errTitleEmpty: "Enter a title for the trip.",
  errFirstMissing: "Add the first day too, or clear the last day.",
  errLastMissing: "Add the last day too, or clear the first day.",
  errDate: TRIP_MSG.date,
  errBudgetFormat: TRIP_MSG.budget,
  errBudgetZero: "Enter a budget greater than 0, or leave it empty.",
  previewCleared: "The trip will have no dates. Dated plan items keep their dates.",
  previewNow: "The trip will be happening now.",
  previewPast: "The trip will be in the past.",
  draftRestored: "Draft restored.",
  draftDiscard: "Discard draft",
  createDiscardTitle: "Discard this trip?",
  createDiscardBody: "What you've typed will be lost.",
  editDiscardTitle: "Discard your changes?",
  keepEditing: "Keep editing",
  discard: "Discard",
  useTheirs: "Use theirs",
  emptyValue: "(empty)",
  resolvedAnn: "Their version is in the field.",
  goneSaved: "This trip was deleted. Your changes weren't saved.",
  backToTrips: "Back to Trips",
  goneHeading: "This trip isn't here any more",
  goneBody: "It may have been deleted.",
  del: "Delete trip",
  delOffline: "Deleting needs a connection.",
  delKeep: "Keep trip",
  deleting: "Deleting…",
  delCover: "The cover photo is deleted too.",
  delFailed: "Couldn't delete the trip. Try again.",
};
const sTooLong = (what: string, max: number) =>
  `Use ${max.toLocaleString("en-US")} characters or fewer for the ${what}.`;
const sBeforeFirst = (first: string) => `Choose a last day on or after ${day(first)}.`;
const sLong = (n: number) => `That's ${n} ${plural(n, "day", "days")}.`;
const sOutside = (n: number) =>
  n === 1
    ? "1 plan item will fall outside the new dates. It stays in the plan, under Outside the trip dates."
    : `${n} plan items will fall outside the new dates. They stay in the plan, under Outside the trip dates.`;
const sUnsupported = (name: string) => `${name} isn't a supported photo. Use a JPEG, PNG or WebP file.`;
const sTooLarge = (name: string) => `${name} is over 10 MB. Choose a smaller photo.`;
const sEditDiscardBody = (t: string) => `Your changes to ${t} won't be saved.`;
const sErrorCount = (n: number) => `${n} fields need your attention.`;
const sDelTitle = (t: string) => `Delete ${t}?`;
const sDeleted = (t: string) => `${t} deleted`;
const count = (n: number, one: string, other: string) => `${n} ${plural(n, one, other)}`;

/** Who changed the trip. Without realtime (Phase 5) the actor is unknown: "another phone". */
type Actor = { kind: "other" };
const sNotice = (_a: Actor) =>
  "This trip changed on another phone while you were editing. Check the marked fields, then save again.";
const sChangedBy = (_a: Actor) => "Changed on another phone";
const sConflict = (_a: Actor, v: string) => `Another phone changed this to "${v}".`;
const sConflictDates = (_a: Actor, r: string) => `Another phone changed the dates to ${r}.`;
const sConflictCover = (_a: Actor) => "Another phone changed the cover photo.";

// ---------- model ----------
type Field = "title" | "destination" | "first" | "last" | "budget" | "notes";
type Editable = "title" | "destination" | "dates" | "budget" | "notes" | "cover";
const F: Record<Field, { input: string; help: string; err: string; mark: string }> = {
  title: { input: "f-title", help: "f-title-help", err: "f-title-err", mark: "f-title-mark" },
  destination: { input: "f-dest", help: "f-dest-help", err: "f-dest-err", mark: "f-dest-mark" },
  first: { input: "f-first", help: "f-dates-help", err: "f-first-err", mark: "f-dates-mark" },
  last: { input: "f-last", help: "f-dates-help", err: "f-last-err", mark: "f-dates-mark" },
  budget: { input: "f-budget", help: "f-budget-help", err: "f-budget-err", mark: "f-budget-mark" },
  notes: { input: "f-notes", help: "f-notes-help", err: "f-notes-err", mark: "f-notes-mark" },
};
const INPUTS: Field[] = ["title", "destination", "first", "last", "budget", "notes"];
const LABEL: Record<Editable, string> = {
  title: C.titleLabel,
  destination: C.destLabel,
  dates: C.datesLegend,
  budget: C.budgetLabel,
  notes: C.notesLabel,
  cover: C.coverLabel,
};
const mergeKey = (f: Field): Editable => (f === "first" || f === "last" ? "dates" : f);
const isIso = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

type Cover =
  | { state: "none" }
  | { state: "done"; asset: ImageAsset; url?: string }
  | { state: "uploading"; pct: number; url: string; file: File }
  | { state: "failed"; url: string; file: File };

interface Mark {
  type: "changed" | "conflict";
  actor: Actor;
  value?: unknown;
}

interface St {
  mode: "create" | "edit";
  id: string | null;
  values: Record<Field, string>;
  base: TripSnap | null;
  cover: Cover;
  errors: Partial<Record<Field, string>>;
  touched: Partial<Record<Field, boolean>>;
  marks: Partial<Record<Editable, Mark>>;
  pending: boolean;
  waiting: boolean;
  deleting: boolean;
  retried: boolean;
  detailsOpen: boolean;
  coverError: string;
  alert: string;
  countAlert: boolean;
  notice: string;
  restored: boolean;
  closed: boolean;
  dirtyByUser: boolean;
  gone: false | "missing" | "after-save";
  urls: string[];
}

function snap(t: TripView): TripSnap {
  return {
    title: t.title,
    destination: t.destination,
    dates: `${t.startDate ?? ""}|${t.startDate ? (t.endDate ?? t.startDate) : ""}`,
    budget: t.budget,
    notes: t.notes,
    cover: t.cover,
    updatedAt: t.updatedAt,
  };
}

function initState(mode: "create" | "edit", t: TripView | null, currency: string): St {
  return {
    mode,
    id: t?.id ?? null,
    values: {
      title: t?.title ?? "",
      destination: t?.destination ?? "",
      first: t?.startDate ?? "",
      last: t?.startDate ? (t.endDate ?? t.startDate) : "",
      budget: t?.budget != null ? formatAmountNumber(t.budget, currency) : "",
      notes: t?.notes ?? "",
    },
    base: t ? snap(t) : null,
    cover: t?.cover ? { state: "done", asset: t.cover } : { state: "none" },
    errors: {},
    touched: {},
    marks: {},
    pending: false,
    waiting: false,
    deleting: false,
    retried: false,
    detailsOpen: mode === "edit",
    coverError: "",
    alert: "",
    countAlert: false,
    notice: "",
    restored: false,
    closed: false,
    dirtyByUser: false,
    gone: false,
    urls: [],
  };
}

// ---------- the page: finds the trip, then the form ----------

export function TripForm({
  mode,
  tripId,
  currency,
  focus,
}: {
  mode: "create" | "edit";
  tripId?: string;
  /** The space's currency (the route context), until the list brings its own. */
  currency: string;
  /** ?focus=dates|budget: arriving from "Add dates" or "Set a budget" (D12). */
  focus?: "dates" | "budget";
}) {
  const q = useQuery({ ...tripQuery(tripId ?? ""), enabled: mode === "edit" && !!tripId });
  const trip = mode === "edit" ? (q.data?.trip ?? null) : null;
  if (mode === "edit" && !q.data) {
    // The trip isn't on this phone yet: the form waits for it.
    return q.isError ? <Gone afterSave={false} /> : <div className="form-page" aria-busy="true" />;
  }
  if (mode === "edit" && !trip) return <Gone afterSave={false} />;
  return (
    <FormBody
      key={tripId ?? "new"}
      mode={mode}
      initial={trip}
      detail={q.data ?? null}
      spaceCurrency={currency}
      focus={focus}
    />
  );
}

function Gone({ afterSave }: { afterSave: boolean }) {
  const navigate = useNavigate();
  useNoFab(true);
  // The form's task chrome goes: the nav comes back (form.js renderGone: Z.setChrome('')).
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.chrome = "app";
    return () => {
      root.dataset.chrome = "task";
    };
  }, []);
  useEffect(() => {
    setTitle("Trip not found");
    if (afterSave) focusHeading();
  }, [afterSave]);
  return (
    <div className="form-page gone">
      <h1 className="title-lg" id="form-h" tabIndex={-1}>
        {afterSave ? C.goneSaved : C.goneHeading}
      </h1>
      {!afterSave && <p>{C.goneBody}</p>}
      <p>
        <a
          className="btn-primary"
          href="/trips"
          id="to-trips"
          data-act="to-trips"
          onClick={(e) => {
            e.preventDefault();
            void navigate({ to: "/trips", replace: true });
          }}
        >
          {C.backToTrips}
        </a>
      </p>
    </div>
  );
}

let lastPointer = false;
if (typeof window !== "undefined") {
  window.addEventListener("pointerdown", () => (lastPointer = true), true);
  window.addEventListener("keydown", () => (lastPointer = false), true);
}
function focusEl(el: HTMLElement | null | undefined) {
  el?.focus({ preventScroll: true, focusVisible: !lastPointer } as FocusOptions);
}

function FormBody({
  mode,
  initial,
  detail,
  spaceCurrency,
  focus,
}: {
  mode: "create" | "edit";
  initial: TripView | null;
  detail: TripResponse | null;
  spaceCurrency: string;
  focus?: "dates" | "budget";
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const router = useRouter();
  const online = useOnline();
  const offline = !online;
  const list = useQuery(tripsQuery).data;
  const currency = list?.currency ?? spaceCurrency;
  const uploadsEnabled = !!list?.images;
  const cloudName = list?.images?.cloudName ?? null;
  const create = mode === "create";
  const trip = initial;

  const S = useRef<St>(null as unknown as St);
  if (!S.current) S.current = initState(mode, initial, currency);
  const s = S.current;
  const [, force] = useReducer((x: number) => x + 1, 0);
  const toast = useRef<ToastHandle>(null);
  const [confirm, setConfirm] = useState<null | "delete" | "discard">(null);
  const root = useRef<HTMLDivElement>(null);
  const upload = useRef<AbortController | null>(null);
  const draftT = useRef<ReturnType<typeof setTimeout>>(undefined);
  const focusNext = useRef<string | null>(null);
  const firstRef = useRef<HTMLInputElement>(null);
  const lastRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const key = draftKey(create ? null : s.id);

  const $ = (sel: string) => root.current?.querySelector<HTMLElement>(sel) ?? null;
  const focusAfter = (id: string) => {
    focusNext.current = id;
  };
  useLayoutEffect(() => {
    const id = focusNext.current;
    if (!id) return;
    focusNext.current = null;
    const el = document.getElementById(id);
    if (el) focusEl(el);
  });

  // ---------- amounts ----------
  const amountText = (minor: number) => formatAmountNumber(minor, currency);
  function parseBudget(raw: string): { value?: number | null; error?: string } {
    const str = String(raw ?? "").replace(/\s/g, ""); // \s also covers no-break and narrow no-break spaces
    if (str === "") return { value: null };
    const v = parseMoney(str, currency);
    if (v === null) return { error: C.errBudgetFormat };
    if (v === 0) return { error: C.errBudgetZero };
    if (v > TRIP_LIMITS.moneyMax * 10 ** minorUnits(currency))
      return {
        error: `That amount is too large. Enter ${formatAmount(TRIP_LIMITS.moneyMax * 10 ** minorUnits(currency), currency)} or less.`,
      };
    return { value: v };
  }

  // ---------- comparisons (three-way merge, dirty) ----------
  const coverKey = (c: ImageAsset | null | undefined) => c?.publicId ?? "";
  const coverValue = (): ImageAsset | null => (s.cover.state === "done" ? s.cover.asset : null);
  const coverNow = () =>
    s.cover.state === "none" ? "" : s.cover.state === "done" ? s.cover.asset.publicId : `pending:${s.cover.url}`;
  function norm(f: Editable, v: unknown): string {
    if (f === "title" || f === "destination" || f === "notes") return String(v ?? "").trim();
    if (f === "budget") {
      if (v == null || String(v).trim() === "") return "";
      if (typeof v === "number") return String(v);
      const p = parseBudget(String(v));
      return p.value != null ? String(p.value) : `raw:${String(v).trim()}`;
    }
    if (f === "dates") return String(v || "|");
    return coverKey(v as ImageAsset | null);
  }
  const editable = (): Editable[] => {
    const f: Editable[] = ["title", "destination", "dates", "budget", "notes"];
    if (uploadsEnabled) f.push("cover");
    return f;
  };
  const mine = (f: Editable): unknown => {
    if (f === "cover") return null;
    if (f === "dates") return `${s.values.first}|${s.values.last}`;
    return s.values[f];
  };
  const mineNorm = (f: Editable) => (f === "cover" ? coverNow() : norm(f, mine(f)));
  function dirty(): boolean {
    if (create)
      return !!(
        s.values.title.trim() ||
        s.values.destination.trim() ||
        s.values.first ||
        s.values.last ||
        s.values.budget.trim() ||
        s.values.notes.trim() ||
        s.cover.state !== "none"
      );
    return editable().some((f) => mineNorm(f) !== norm(f, s.base![f]));
  }
  const coverChanged = () => !create && coverNow() !== coverKey(s.base!.cover);
  const curTitle = () => s.values.title.trim();

  // A pair the form would save: both empty, or both set with last ≥ first.
  function datePair(): { start: string | null; end: string | null } | null {
    const a = s.values.first;
    const b = s.values.last;
    if (firstRef.current?.validity.badInput || lastRef.current?.validity.badInput) return null;
    if (!a && !b) return { start: null, end: null };
    if (isIso(a) && isIso(b) && b >= a) return { start: a, end: b };
    return null;
  }

  // ---------- drafts ----------
  function writeDraftNow() {
    if (s.closed) return;
    if (!dirty()) {
      dropDraft(key);
      return;
    }
    const d: TripDraft = {
      v: 1,
      title: s.values.title,
      destination: s.values.destination,
      start: s.values.first,
      end: s.values.last,
      budget: s.values.budget,
      notes: s.values.notes,
      details: s.detailsOpen,
      cover: s.cover.state === "none" ? "none" : "keep",
      base: s.base,
    };
    storeDraft(key, d);
  }
  function saveDraft() {
    if (s.closed || !s.dirtyByUser) return;
    clearTimeout(draftT.current);
    draftT.current = setTimeout(writeDraftNow, 300);
  }
  function clearDraft() {
    clearTimeout(draftT.current);
    dropDraft(key);
  }

  // ---------- validation ----------
  // full: also check the pair (one date only), which waits for submit so filling the second day isn't nagged.
  function validate(f: Field, full: boolean): string {
    if (f === "title") {
      const t = s.values.title.trim();
      return !t ? C.errTitleEmpty : Array.from(t).length > TRIP_LIMITS.title ? TRIP_MSG.titleLong : "";
    }
    if (f === "destination")
      return Array.from(s.values.destination.trim()).length > TRIP_LIMITS.destination
        ? sTooLong("destination", TRIP_LIMITS.destination)
        : "";
    if (f === "notes") return s.values.notes.length > TRIP_LIMITS.notes ? sTooLong("notes", TRIP_LIMITS.notes) : "";
    if (f === "budget") return parseBudget(s.values.budget).error ?? "";
    const el = f === "first" ? firstRef.current : lastRef.current;
    if (el?.validity.badInput) return C.errDate;
    const a = s.values.first;
    const b = s.values.last;
    if (f === "first") return full && !a && b ? C.errFirstMissing : "";
    if (full && !b && a) return C.errLastMissing;
    if (isIso(a) && isIso(b) && b < a) return sBeforeFirst(a); // neither value is changed
    return "";
  }
  function setError(f: Field, msg: string) {
    s.errors[f] = msg;
    if (!msg && s.countAlert) {
      s.countAlert = false;
      s.alert = "";
    }
  }
  function validateAll(): Field | "cover" | null {
    let first: Field | "cover" | null = null;
    let n = 0;
    for (const f of INPUTS) {
      const m = validate(f, true);
      setError(f, m);
      if (m) {
        n++;
        first ??= f;
      }
    }
    if (s.cover.state === "failed") {
      n++;
      first ??= "cover";
    }
    // Several errors: say how many at the top (role=alert); focus still goes to the first.
    if (n > 1) {
      s.alert = sErrorCount(n);
      s.countAlert = true;
    }
    return first;
  }
  function focusField(f: Field | "cover" | null) {
    if (!f) return;
    if (f !== "title" && !s.detailsOpen) s.detailsOpen = true;
    if (f === "cover") return focusAfter("cover-retry");
    focusAfter(F[f].input);
  }

  // ---------- derived ----------
  const pair = datePair();
  const dateHelp = (() => {
    if (pair?.start && pair.end) {
      const n = dayDiff(pair.start, pair.end) + 1;
      if (pair.end < localToday()) return C.datesPassed;
      if (n > TRIP_LIMITS.longTripDays) return sLong(n);
    }
    return C.datesHelp;
  })();
  // Edit: what the new dates will do, before saving (D12).
  const previewLines: string[] = [];
  if (!create && trip && pair) {
    const oldStart = trip.startDate;
    const oldEnd = trip.startDate ? (trip.endDate ?? trip.startDate) : null;
    if (pair.start !== oldStart || pair.end !== oldEnd) {
      if (!pair.start) {
        if (oldStart) previewLines.push(C.previewCleared);
      } else {
        const n = (detail?.entries ?? []).filter((e) => {
          if (!e.date) return false;
          const wasIn = !oldStart || (e.date >= oldStart && e.date <= oldEnd!);
          return wasIn && (e.date < pair.start! || e.date > pair.end!);
        }).length;
        if (n) previewLines.push(sOutside(n));
        const today = localToday();
        const was = status(trip, today).kind;
        const will = status({ startDate: pair.start, endDate: pair.end }, today).kind;
        if (will === "now" && was !== "now") previewLines.push(C.previewNow);
        else if (will === "past" && was !== "past") previewLines.push(C.previewPast);
      }
    }
  }
  const previewMsg = previewLines.join(" ");
  function describedBy(f: Field) {
    const ids: string[] = [];
    if (s.errors[f]) ids.push(F[f].err);
    ids.push(F[f].help);
    if ((f === "first" || f === "last") && previewMsg) ids.push("f-dates-preview");
    if (s.marks[mergeKey(f)]) ids.push(`${F[f].mark}-text`);
    return ids.join(" ");
  }

  // ---------- cover ----------
  function stopUpload() {
    upload.current?.abort();
    upload.current = null;
  }
  function startUpload(c: Extract<Cover, { state: "uploading" }>) {
    stopUpload();
    const ac = new AbortController();
    upload.current = ac;
    uploadPhoto(c.file, "trip-cover", {
      signal: ac.signal,
      onProgress: (p) => {
        if (s.cover !== c) return;
        c.pct = Math.min(100, Math.round(p * 100));
        force();
      },
    }).then(
      (asset) => {
        if (s.cover !== c || s.closed) return;
        upload.current = null;
        s.cover = { state: "done", asset, url: c.url };
        say(C.coverUploadedAnn);
        force();
        settled(true);
      },
      (e: unknown) => {
        if (s.cover !== c || s.closed || (e instanceof UploadError && e.reason === "aborted")) return;
        upload.current = null;
        s.cover = { state: "failed", url: c.url, file: c.file };
        // The error is an alert at the field. Focus moves there unless the person is typing somewhere else.
        const a = document.activeElement;
        const slot = $("#cover-slot");
        const take = !a || a === document.body || (slot && slot.contains(a)) || a.id === "primary";
        if (take) focusAfter("cover-retry");
        force();
        settled(false);
      },
    );
  }
  function pickCover() {
    if (offline) return say(C.coverOffline); // the reason is already shown beside it
    const inp = $("#cover-file") as HTMLInputElement | null;
    if (!inp) return;
    inp.value = "";
    inp.click();
  }
  function onFile(file: File | undefined) {
    if (!file) return;
    s.coverError = "";
    const bad = checkPhoto(file);
    if (bad === "type") s.coverError = sUnsupported(file.name);
    else if (bad === "size") s.coverError = sTooLarge(file.name);
    if (s.coverError) {
      focusAfter(s.cover.state === "none" ? "cover-add" : "cover-replace");
      return force();
    }
    stopUpload();
    const url = URL.createObjectURL(file);
    s.urls.push(url);
    const c = { state: "uploading" as const, pct: 0, url, file };
    s.cover = c;
    focusAfter("cover-replace"); // focus stays on the next control
    say(C.coverUploadingAnn);
    startUpload(c);
    s.dirtyByUser = true;
    saveDraft();
    force();
  }
  function retryCover() {
    if (offline) return say(C.coverOffline);
    if (s.cover.state !== "failed") return;
    const c = { state: "uploading" as const, pct: 0, url: s.cover.url, file: s.cover.file };
    s.cover = c;
    focusAfter("cover-replace");
    say(C.coverUploadingAnn);
    startUpload(c);
    force();
  }
  function removeCover() {
    stopUpload();
    s.coverError = "";
    s.cover = { state: "none" };
    delete s.marks.cover;
    if (s.waiting) s.waiting = false;
    focusAfter("cover-add");
    s.dirtyByUser = true;
    saveDraft();
    force();
  }
  function settled(ok: boolean) {
    if (!s.waiting) return;
    s.waiting = false;
    if (ok) void doSubmit();
    else force();
  }

  // ---------- merge (ia.md §6.7; the dates are one field) ----------
  function apply(f: Editable, v: unknown) {
    if (f === "cover") {
      stopUpload();
      s.cover = v ? { state: "done", asset: v as ImageAsset } : { state: "none" };
      return;
    }
    if (f === "dates") {
      const p = String(v || "|").split("|");
      s.values.first = p[0] ?? "";
      s.values.last = p[1] ?? "";
      setError("first", "");
      setError("last", "");
      return;
    }
    if (f === "budget") s.values.budget = v != null && v !== "" ? amountText(v as number) : "";
    else s.values[f] = String(v ?? "");
    setError(f, "");
  }
  function merge(T: TripSnap, actor: Actor): number {
    let n = 0;
    for (const f of editable()) {
      const b = norm(f, s.base![f]);
      const m = mineNorm(f);
      const t = norm(f, T[f]);
      if (b === t) continue; // they didn't change it: keep mine
      if (m === b) {
        s.marks[f] = { type: "changed", actor }; // only they did: take theirs, marked
        apply(f, T[f]);
        n++;
      } else if (m !== t) {
        s.marks[f] = { type: "conflict", actor, value: T[f] }; // both, differently: keep mine, offer theirs
        n++;
      } else delete s.marks[f];
    }
    s.base = T;
    return n;
  }
  function showNotice(actor: Actor, focusIt: boolean) {
    s.notice = sNotice(actor);
    if (focusIt) focusAfter("merge-text");
    else say(s.notice);
  }
  function takeTheirs(f: Editable) {
    const m = s.marks[f];
    if (!m) return;
    delete s.marks[f];
    apply(f, m.value);
    if (f === "cover") focusAfter(s.cover.state === "none" ? "cover-add" : "cover-replace");
    else focusAfter(F[f === "dates" ? "first" : f].input);
    say(C.resolvedAnn);
    s.dirtyByUser = true;
    saveDraft();
    force();
  }
  function shown(f: Editable, v: unknown): string {
    if (v == null || v === "") return C.emptyValue;
    if (f === "budget") return formatAmount(v as number, currency);
    if (f === "notes") {
      const t = String(v).trim();
      return t.length > 60 ? `${t.slice(0, 57).trim()}…` : t;
    }
    return String(v);
  }

  // ---------- submit ----------
  function disabledPress(msg: string) {
    if (window.matchMedia("(max-width: 47.99rem)").matches) toast.current?.show({ msg });
    else say(msg);
  }
  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (s.closed || s.pending || s.waiting || s.deleting) return; // a double tap is ignored
    if (offline) return disabledPress(create ? C.createOffline : C.editOffline);
    s.alert = "";
    const first = validateAll();
    if (first) {
      focusField(first);
      return force();
    }
    if (s.cover.state === "uploading") {
      s.waiting = true; // "Creating after the photo…"
      return force();
    }
    void doSubmit();
  }
  async function doSubmit() {
    s.pending = true;
    force();
    if (create) await commitCreate();
    else await commitEdit();
  }
  function datesOut() {
    const p = datePair() ?? { start: null, end: null };
    return { startDate: p.start, endDate: p.end };
  }
  async function commitCreate() {
    const cover = uploadsEnabled ? coverValue() : null;
    const dates = datesOut();
    const budget = parseBudget(s.values.budget).value;
    const destination = s.values.destination.trim();
    const notes = s.values.notes.trim();
    try {
      const { trip: t } = await createTrip({
        id: uuidv7(),
        title: s.values.title.trim(),
        ...(destination ? { destination } : {}),
        ...(dates.startDate ? dates : {}),
        ...(budget != null ? { budget } : {}),
        ...(notes ? { notes } : {}),
        ...(cover ? { cover } : {}),
      });
      s.closed = true;
      clearDraft();
      putTrip(qc, t);
      invalidateTrip(qc, t.id);
      void navigate({ to: "/trips/$tripId", params: { tripId: t.id }, replace: true }); // create replaces /trips/new
      say(C.created);
    } catch {
      s.pending = false;
      s.alert = C.createFailed;
      force();
    }
  }
  function gone() {
    s.closed = true;
    clearDraft();
    dropTrip(qc, s.id!);
    s.gone = "after-save";
    force();
  }
  async function commitEdit() {
    const id = s.id!;
    const body: Record<string, unknown> = { updatedAt: s.base!.updatedAt };
    for (const f of editable()) {
      if (mineNorm(f) === norm(f, s.base![f])) continue;
      if (f === "title") body.title = s.values.title.trim();
      else if (f === "destination") body.destination = s.values.destination.trim();
      else if (f === "dates") Object.assign(body, datesOut());
      else if (f === "budget") body.budget = parseBudget(s.values.budget).value ?? null;
      else if (f === "notes") body.notes = s.values.notes.trim();
      else body.cover = coverValue();
    }
    try {
      const res = await updateTrip(id, body as Parameters<typeof updateTrip>[1]);
      s.closed = true;
      clearDraft();
      putTrip(qc, res.trip);
      invalidateTrip(qc, id);
      setFlash({ toast: { msg: C.saved }, focus: "td-edit" });
      // Save pops back to the trip when that's where the edit came from; otherwise it replaces this entry.
      if (router.history.canGoBack()) router.history.back();
      else void navigate({ to: "/trips/$tripId", params: { tripId: id }, replace: true });
    } catch (e) {
      s.pending = false;
      if (isApiError(e, "not_found")) return gone();
      if (isApiError(e, "conflict")) {
        // 409: merge with the trip as it is now. The actor is unknown (no realtime yet).
        let current: TripView | null = null;
        try {
          current = (await api<TripResponse>(`/api/trips/${id}`)).trip;
        } catch (e2) {
          if (isApiError(e2, "not_found")) return gone();
        }
        if (current) {
          putTrip(qc, current);
          const n = merge(snap(current), { kind: "other" });
          if (!n && !s.retried) {
            s.retried = true; // nothing editable differs: one silent retry
            return void doSubmit();
          }
          s.retried = false;
          showNotice({ kind: "other" }, true);
          return force();
        }
      }
      s.alert = C.editFailed;
      force();
    }
  }

  // ---------- delete ----------
  function askDelete() {
    if (offline) return disabledPress(C.delOffline); // the reason is shown under the button
    if (s.deleting) return;
    setConfirm("delete");
  }
  function delBody(): string {
    return `This deletes its ${count(detail?.entries.length ?? 0, "plan item", "plan items")}, ${count(detail?.places.length ?? 0, "place", "places")} and ${count(detail?.items.length ?? 0, "checklist item", "checklist items")}, for both of you. You can't undo this.`;
  }
  async function doDelete() {
    setConfirm(null);
    const t = trip!;
    s.deleting = true;
    force(); // "Deleting…" before the work
    try {
      await deleteTrip(t.id);
    } catch {
      s.deleting = false;
      s.alert = C.delFailed;
      return force();
    }
    s.closed = true;
    clearDraft();
    dropTrip(qc, t.id);
    invalidateTrip(qc);
    setFlash({ toast: { msg: sDeleted(t.title) } });
    void navigate({ to: "/trips", replace: true });
  }

  // ---------- cancel ----------
  function leave() {
    if (!create) setFlash({ focus: "td-edit" });
    s.closed = true;
    stopUpload();
    clearDraft();
    if (router.history.canGoBack()) router.history.back();
    else if (create) void navigate({ to: "/trips", replace: true });
    else void navigate({ to: "/trips/$tripId", params: { tripId: s.id! }, replace: true });
  }
  function cancel() {
    if (!dirty()) return leave();
    setConfirm("discard");
  }

  // ---------- draft restore and discard ----------
  function restoreDraft(d: TripDraft) {
    s.values = {
      title: d.title,
      destination: d.destination,
      first: d.start,
      last: d.end,
      budget: d.budget,
      notes: d.notes,
    };
    if (d.cover === "none") s.cover = { state: "none" };
    if (create && (d.details || d.destination || d.start || d.end || d.budget || d.notes)) s.detailsOpen = true;
    s.restored = true;
    s.dirtyByUser = true;
    if (!create && d.base && trip) {
      // The trip may have changed since the draft was written: merge against the row it was based on.
      const now = snap(trip);
      s.base = d.base;
      if (new Date(d.base.updatedAt).getTime() !== new Date(now.updatedAt).getTime()) {
        if (merge(now, { kind: "other" })) showNotice({ kind: "other" }, false);
      } else s.base = now;
    }
  }
  function discardDraft() {
    clearDraft();
    stopUpload();
    for (const u of s.urls) URL.revokeObjectURL(u);
    S.current = initState(mode, trip, currency);
    if (create) focusAfter("f-title");
    else requestAnimationFrame(focusHeading);
    force();
  }

  // ---------- mount / unmount ----------
  useLayoutEffect(() => {
    const d = readDraft(key);
    if (d) {
      restoreDraft(d);
      force();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, like form.js mount()
  }, []);
  useArrival((first) => {
    // Create: Title is focused (quick capture), even on the first load. Edit: ?focus= goes to its field, else the
    // h1 on an in-app arrival (no keyboard pop-up on phones).
    if (create) return focusEl(titleRef.current);
    if (focus) {
      const el = document.getElementById(focus === "dates" ? "f-first" : "f-budget");
      if (el) {
        s.detailsOpen = true;
        focusEl(el);
        setTimeout(() => el.scrollIntoView({ block: "center" }), 0); // after the arrival's scrollTo(0, 0)
        return;
      }
    }
    if (!first) focusHeading();
  });
  useEffect(() => {
    if (s.gone) return;
    setTitle(create ? "New trip" : `Edit ${initial!.title}`);
  }, [create, initial, s.gone]);
  useEffect(
    () => () => {
      const st = S.current;
      if (!st.closed && st.dirtyByUser) {
        clearTimeout(draftT.current);
        writeDraftNow(); // drafts outlast navigation
      }
      upload.current?.abort();
      for (const u of st.urls) URL.revokeObjectURL(u);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- unmount only
    [],
  );

  // One connection announcement, in this screen's words.
  const wasOnline = useRef(online);
  useEffect(() => {
    if (wasOnline.current === online) return;
    wasOnline.current = online;
    if (s.closed) return;
    say(online ? (create ? C.createOnline : C.editOnline) : create ? C.createOffline : C.editOffline);
  }, [online, create, s]);

  // The trip changed elsewhere while editing (a refetch brought a newer row): merge it in, say so politely.
  const tripUpdatedAt = trip?.updatedAt;
  useEffect(() => {
    if (create || s.closed || s.pending || !trip || !s.base) return;
    if (new Date(trip.updatedAt).getTime() === new Date(s.base.updatedAt).getTime()) return;
    if (merge(snap(trip), { kind: "other" })) showNotice({ kind: "other" }, false);
    force();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs when the row's version changes
  }, [tripUpdatedAt]);

  // The footer bar rides the on-screen keyboard (iOS ignores interactive-widget).
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const phone = window.matchMedia("(max-width: 47.99rem)");
    const place = () => {
      const d = $(".dock");
      if (!d) return;
      if (!phone.matches || vv.scale > 1.01) {
        d.style.bottom = "";
        return;
      }
      const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      d.style.bottom = kb > 0 ? `${kb}px` : "";
    };
    place();
    vv.addEventListener("resize", place);
    vv.addEventListener("scroll", place);
    return () => {
      vv.removeEventListener("resize", place);
      vv.removeEventListener("scroll", place);
    };
  }, []);

  // Title grows with its text where field-sizing isn't supported.
  useLayoutEffect(() => {
    const t = titleRef.current;
    if (!t || CSS.supports?.("field-sizing", "content")) return;
    t.style.height = "auto";
    t.style.height = `${t.scrollHeight}px`;
  });

  const onToastHidden = useCallback(() => focusEl(document.getElementById("primary")), []);

  if (s.gone) return <Gone afterSave={s.gone === "after-save"} />;

  // ---------- events ----------
  function onInput(f: Field) {
    return (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (s.closed) return;
      let v = e.target.value;
      if (f === "title" && /[\r\n]/.test(v)) {
        // pasted line breaks
        const t = e.target as HTMLTextAreaElement;
        const at = t.selectionStart;
        v = v.replace(/[\r\n]+/g, " ");
        requestAnimationFrame(() => t.setSelectionRange(at, at));
      }
      s.values[f] = v;
      s.touched[f] = true;
      s.dirtyByUser = true;
      const mk = mergeKey(f);
      if (s.marks[mk]) delete s.marks[mk]; // the mark stays until the field is edited
      if (f === "first" || f === "last") {
        // An error on either day is re-checked on every change to either: it clears as soon as the pair is valid.
        requestAnimationFrame(() => {
          for (const k of ["first", "last"] as const)
            if (s.errors[k]) {
              const m = validate(k, true);
              if (m !== s.errors[k]) {
                setError(k, m);
                force();
              }
            }
        });
      } else if (s.errors[f]) {
        const m = validate(f, true);
        if (m !== s.errors[f]) setError(f, m);
      }
      saveDraft();
      force();
    };
  }
  function onBlur(f: Field) {
    return (e: React.FocusEvent) => {
      if (s.closed || !s.touched[f]) return;
      const rt = e.relatedTarget as HTMLElement | null;
      if (rt?.closest?.('[data-act="cancel"]')) return; // don't nag on the way out
      if (f === "first" || f === "last") {
        if (rt && (rt.id === "f-first" || rt.id === "f-last")) return; // moving between the two days: wait
        // "The last day is before the first day": on blur of either field; the error sits on Last day.
        if (s.touched.first || s.touched.last) {
          setError("first", validate("first", !!s.errors.first));
          setError("last", validate("last", !!s.errors.last));
          force();
        }
        return;
      }
      setError(f, validate(f, false));
      force();
    };
  }
  function onTitleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Title is a textarea, so Enter never adds a line: it submits, as Enter does in a single-line field.
    if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
    e.preventDefault();
    const form = $("#trip-form") as HTMLFormElement | null;
    form?.requestSubmit($("#primary") as HTMLButtonElement);
  }

  // ---------- markup ----------
  const busy = s.pending || s.waiting;
  const label = s.pending
    ? create
      ? C.createPending
      : C.editPending
    : s.waiting
      ? create
        ? C.createWaiting
        : C.editPending
      : create
        ? C.createSubmit
        : C.editSubmit;

  const err = (f: Field) => (
    <p className="err" id={F[f].err} hidden={!s.errors[f]}>
      {s.errors[f] ? (
        <>
          <Icon name="alert" />
          <span>{s.errors[f]}</span>
        </>
      ) : null}
    </p>
  );
  const markContent = (f: Editable) => {
    const m = s.marks[f];
    if (!m) return null;
    const textId = `${f === "cover" ? "cover-mark" : f === "dates" ? "f-dates-mark" : F[f].mark}-text`;
    if (m.type === "changed")
      return (
        <p className="mark">
          <Icon name="refresh" />
          <span className="mark-text" id={textId}>
            {sChangedBy(m.actor)}
          </span>
        </p>
      );
    let text: string;
    if (f === "cover") text = sConflictCover(m.actor);
    else if (f === "dates") {
      const p = String(m.value || "|").split("|");
      text = p[0] ? sConflictDates(m.actor, range(p[0], p[1] || null)) : sConflict(m.actor, C.emptyValue);
    } else text = sConflict(m.actor, shown(f, m.value));
    return (
      <div className="mark mark-conflict">
        <Icon name="refresh" />
        <span className="mark-text" id={textId}>
          {text}
        </span>
        <button
          type="button"
          className="link-btn"
          data-act="use-theirs"
          data-field={f}
          aria-label={`${C.useTheirs}: ${LABEL[f]}`}
          aria-describedby={textId}
          onClick={() => takeTheirs(f)}
        >
          {C.useTheirs}
        </button>
      </div>
    );
  };
  const markSlot = (f: Editable, slotId: string) => (
    <div className="mark-slot" id={slotId}>
      {markContent(f)}
    </div>
  );
  const invalid = (...fs: Field[]) => (fs.some((f) => s.errors[f]) ? " is-invalid" : "");

  const band =
    create && pair?.start ? (
      <LightBand trip={{ startDate: pair.start, endDate: pair.end }} today={localToday()} lead={false} nights />
    ) : null;

  let coverGroup: ReactNode = null;
  if (uploadsEnabled) {
    const c = s.cover;
    const has = c.state !== "none";
    const failed = c.state === "failed";
    const ce = failed ? C.coverFailed : s.coverError;
    const offId = offline ? " cover-offline" : "";
    const dis = offline ? true : undefined;
    const preview = c.state === "none" ? undefined : c.url;
    coverGroup = (
      <div className="fg cover-group" role="group" aria-labelledby="cover-label">
        <p className="field-label" id="cover-label">
          {C.coverLabel}
        </p>
        <div className="cover-stage">
          <TripDoorway
            title={curTitle()}
            cover={c.state === "done" ? c.asset : null}
            size="form"
            cloudName={cloudName}
            src={preview}
          />
          {c.state === "uploading" && (
            <p className="cover-pill">
              <span>{C.coverUploading}</span>{" "}
              <span className="num" id="cover-pct">
                {c.pct}%
              </span>
            </p>
          )}
        </div>
        {create && (
          <div className="band-slot" id="band-slot">
            {band}
          </div>
        )}
        {ce && (
          <p className="err" id="cover-err" role="alert">
            <Icon name="alert" />
            <span>{ce}</span>
          </p>
        )}
        <div className="cover-actions">
          {failed ? (
            <button
              type="button"
              className="btn-sec"
              id="cover-retry"
              data-act="cover-retry"
              aria-label={C.retryLabel}
              aria-describedby={`cover-err${offId}`}
              aria-disabled={dis}
              onClick={retryCover}
            >
              <Icon name="refresh" />
              {C.retry}
            </button>
          ) : has ? (
            <button
              type="button"
              className="btn-sec"
              id="cover-replace"
              data-act="cover-add"
              aria-label={C.coverReplaceLabel}
              aria-describedby={`cover-help${offId}`}
              aria-disabled={dis}
              onClick={pickCover}
            >
              <Icon name="image" />
              {C.coverReplace}
            </button>
          ) : (
            <button
              type="button"
              className="btn-sec"
              id="cover-add"
              data-act="cover-add"
              aria-describedby={`${ce ? "cover-err " : ""}cover-help${offId}`}
              aria-disabled={dis}
              onClick={pickCover}
            >
              <Icon name="image-plus" />
              {C.coverAdd}
            </button>
          )}
          {has && (
            <button
              type="button"
              className="btn-sec"
              id="cover-remove"
              data-act="cover-remove"
              aria-label={C.coverRemoveLabel}
              aria-describedby={failed ? "cover-err" : undefined}
              onClick={removeCover}
            >
              {C.coverRemove}
            </button>
          )}
        </div>
        {offline && (
          <p className="help" id="cover-offline">
            {C.coverOffline}
          </p>
        )}
        <p className="help" id="cover-help">
          {C.coverHelp}
        </p>
        {coverChanged() && (
          <p className="help" id="cover-restore">
            {C.coverRestore}
          </p>
        )}
        {markContent("cover")}
        <input
          type="file"
          id="cover-file"
          accept="image/*"
          hidden
          onChange={(e) => onFile(e.target.files?.[0] ?? undefined)}
        />
      </div>
    );
  }

  const t0 = trip ?? initial;
  return (
    <div className="form-page" ref={root}>
      <header className="task-head">
        <button type="button" className="link-btn task-cancel" data-act="cancel" onClick={cancel}>
          <Icon name="x" />
          <span>{C.cancel}</span>
        </button>
        <h1 className="task-title" id="form-h">
          {create ? C.createHeading : C.editHeading}
        </h1>
      </header>
      <form className="trip-form" id="trip-form" noValidate aria-labelledby="form-h" onSubmit={onSubmit}>
        <div className="form-slot" id="form-alert" role="alert">
          {s.alert ? (
            <p className="notice notice-danger">
              <Icon name="alert" />
              <span>{s.alert}</span>
            </p>
          ) : null}
        </div>
        <div className="form-slot" id="merge-notice">
          {s.notice ? (
            <p className="notice notice-merge" id="merge-text" role="status" tabIndex={-1}>
              <Icon name="refresh" />
              <span>{s.notice}</span>
            </p>
          ) : null}
        </div>
        <div className="form-slot" id="draft-notice">
          {s.restored ? (
            <p className="notice notice-draft">
              <Icon name="pencil" />
              <span>{C.draftRestored}</span>
              <button type="button" className="link-btn" data-act="discard-draft" onClick={discardDraft}>
                {C.draftDiscard}
              </button>
            </p>
          ) : null}
        </div>

        {/* 1 · Title: Young Serif 28/34 in the field */}
        <div className="fg">
          <label className="field-label" htmlFor="f-title">
            {C.titleLabel}
          </label>
          <div className={`field field-title${invalid("title")}`}>
            <textarea
              ref={titleRef}
              id="f-title"
              name="title"
              rows={1}
              required
              autoComplete="off"
              autoCapitalize="sentences"
              enterKeyHint="done"
              aria-describedby={describedBy("title")}
              aria-invalid={s.errors.title ? true : undefined}
              value={s.values.title}
              onChange={onInput("title")}
              onBlur={onBlur("title")}
              onKeyDown={onTitleKey}
            />
          </div>
          <p className="help" id="f-title-help">
            {C.titleHelp}
          </p>
          {err("title")}
          {markSlot("title", "f-title-mark")}
        </div>

        {/* 2 · Optional details: folded on create, unfolded (no toggle) on edit (D12) */}
        {create && (
          <button
            type="button"
            className="details-toggle"
            data-act="details"
            aria-expanded={s.detailsOpen}
            aria-controls="details"
            onClick={() => {
              s.detailsOpen = !s.detailsOpen;
              saveDraft();
              force();
            }}
          >
            <span>{C.details}</span>
            <Icon name="chevron-down" />
          </button>
        )}
        <div className="details" id="details" hidden={!s.detailsOpen}>
          <div className="fg">
            <label className="field-label" htmlFor="f-dest">
              {C.destLabel}
            </label>
            <div className={`field${invalid("destination")}`}>
              <input
                id="f-dest"
                name="destination"
                type="text"
                autoComplete="off"
                autoCapitalize="words"
                enterKeyHint="next"
                value={s.values.destination}
                aria-describedby={describedBy("destination")}
                aria-invalid={s.errors.destination ? true : undefined}
                onChange={onInput("destination")}
                onBlur={onBlur("destination")}
              />
            </div>
            <p className="help" id="f-dest-help">
              {C.destHelp}
            </p>
            {err("destination")}
            {markSlot("destination", "f-dest-mark")}
          </div>

          {/* Dates: one fieldset, both or neither, last ≥ first. The last-day picker opens at the first day (min). */}
          <fieldset className="fg dates" id="g-dates">
            <legend className="field-label">{C.datesLegend}</legend>
            <div className="dates-grid">
              <div className="date-cell">
                <label className="field-label sub-label" htmlFor="f-first">
                  {C.firstLabel}
                </label>
                <div className={`field field-date${invalid("first")}`}>
                  <input
                    ref={firstRef}
                    id="f-first"
                    name="start"
                    type="date"
                    autoComplete="off"
                    value={s.values.first}
                    aria-describedby={describedBy("first")}
                    aria-invalid={s.errors.first ? true : undefined}
                    onChange={onInput("first")}
                    onBlur={onBlur("first")}
                  />
                </div>
                {err("first")}
              </div>
              <div className="date-cell">
                <label className="field-label sub-label" htmlFor="f-last">
                  {C.lastLabel}
                </label>
                <div className={`field field-date${invalid("last")}`}>
                  <input
                    ref={lastRef}
                    id="f-last"
                    name="end"
                    type="date"
                    autoComplete="off"
                    min={isIso(s.values.first) ? s.values.first : undefined}
                    value={s.values.last}
                    aria-describedby={describedBy("last")}
                    aria-invalid={s.errors.last ? true : undefined}
                    onChange={onInput("last")}
                    onBlur={onBlur("last")}
                  />
                </div>
                {err("last")}
              </div>
            </div>
            <p className="help" id="f-dates-help">
              {dateHelp}
            </p>
            {!create && (
              <div className="preview" id="f-dates-preview" role="status">
                {previewLines.map((l) => (
                  <p key={l}>{l}</p>
                ))}
              </div>
            )}
            {markSlot("dates", "f-dates-mark")}
          </fieldset>

          <div className="fg" id="g-budget">
            <label className="field-label" htmlFor="f-budget">
              {C.budgetLabel}
              <span className="vh"> in {currency}</span>
            </label>
            <div className={`field field-num field-budget${invalid("budget")}`}>
              <input
                id="f-budget"
                name="budget"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                enterKeyHint="next"
                value={s.values.budget}
                aria-describedby={describedBy("budget")}
                aria-invalid={s.errors.budget ? true : undefined}
                onChange={onInput("budget")}
                onBlur={onBlur("budget")}
              />
              <span className="suffix" aria-hidden="true">
                {currency}
              </span>
            </div>
            <p className="help" id="f-budget-help">
              {C.budgetHelp}
            </p>
            {err("budget")}
            {markSlot("budget", "f-budget-mark")}
          </div>

          <div className="fg">
            <label className="field-label" htmlFor="f-notes">
              {C.notesLabel}
            </label>
            <div className={`field field-area${invalid("notes")}`}>
              <textarea
                id="f-notes"
                name="notes"
                rows={3}
                autoComplete="off"
                enterKeyHint="enter"
                value={s.values.notes}
                aria-describedby={describedBy("notes")}
                aria-invalid={s.errors.notes ? true : undefined}
                onChange={onInput("notes")}
                onBlur={onBlur("notes")}
              />
            </div>
            <p className="help" id="f-notes-help">
              {C.notesHelp}
            </p>
            {err("notes")}
            {markSlot("notes", "f-notes-mark")}
          </div>

          <div id="cover-slot">{coverGroup}</div>
          {/* Uploads off: no cover preview to sit under, so the light-band preview ends the details (create only) */}
          {create && !uploadsEnabled && (
            <div className="band-slot" id="band-slot">
              {band}
            </div>
          )}
        </div>

        {/* 3 · The primary: a footer bar on phones (rides the keyboard); ends the form from 48rem, then Cancel */}
        <div className="form-actions">
          <div className="dock">
            <button
              type="submit"
              className="btn-primary"
              id="primary"
              aria-disabled={busy || offline || s.deleting ? true : undefined}
              aria-describedby={offline ? "submit-reason" : undefined}
            >
              <Icon name="check" />
              <span className="primary-text">{label}</span>
            </button>
          </div>
          <Toast ref={toast} onHiddenWithFocus={onToastHidden} />
          <button type="button" className="btn-sec form-cancel" data-act="cancel" onClick={cancel}>
            {C.cancel}
          </button>
        </div>
        <p className="notice submit-reason" id="submit-reason" hidden={!offline}>
          <Icon name="cloud-off" />
          <span>{offline ? (create ? C.createOffline : C.editOffline) : ""}</span>
        </p>
      </form>
      {!create && (
        <div className="delete-zone">
          <button
            type="button"
            className="btn-danger"
            id="delete"
            data-act="delete"
            aria-disabled={offline || s.deleting ? true : undefined}
            aria-describedby={offline ? "delete-reason" : undefined}
            onClick={askDelete}
          >
            <Icon name="trash" />
            <span className="delete-text">{s.deleting ? C.deleting : C.del}</span>
          </button>
          <p className="help" id="delete-reason" hidden={!offline}>
            {C.delOffline}
          </p>
        </div>
      )}
      <ConfirmDialog
        open={confirm !== null}
        title={confirm === "delete" ? sDelTitle(t0?.title ?? "") : create ? C.createDiscardTitle : C.editDiscardTitle}
        body={
          confirm === "delete" ? (
            <>
              <p>{delBody()}</p>
              {t0?.cover && uploadsEnabled && <p>{C.delCover}</p>}
            </>
          ) : (
            <p>{create ? C.createDiscardBody : sEditDiscardBody(t0?.title ?? "")}</p>
          )
        }
        ok={confirm === "delete" ? C.del : C.discard}
        cancel={confirm === "delete" ? C.delKeep : C.keepEditing}
        onConfirm={() => {
          if (confirm === "delete") void doDelete();
          else {
            setConfirm(null);
            if (!s.closed) leave();
          }
        }}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
