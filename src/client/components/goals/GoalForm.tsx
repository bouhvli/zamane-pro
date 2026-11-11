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
import { formatAmount, formatAmountNumber, parseMoney } from "../../../shared/money.ts";
import { GOAL_LIMITS, GOAL_MSG, type GoalView, type ImageAsset } from "../../../shared/schemas/goals.ts";
import { api, isApiError } from "../../lib/api.ts";
import { say, setTitle } from "../../lib/announce.ts";
import { setFlash } from "../../lib/flash.ts";
import {
  clearDraft as dropDraft,
  draftKey,
  readDraft,
  writeDraft as storeDraft,
  type GoalDraft,
  type GoalSnap,
} from "../../lib/goal-drafts.ts";
import {
  createGoal,
  day,
  deleteGoal,
  dropGoal,
  goalsQuery,
  invalidateGoal,
  isDone,
  notesQuery,
  plural,
  putGoal,
  toDate,
  updateGoal,
  type GoalItem,
} from "../../lib/goals.ts";
import { focusHeading, useArrival, useNoFab } from "../../lib/nav.ts";
import { useOnline } from "../../lib/online.ts";
import { checkPhoto, uploadPhoto, UploadError } from "../../lib/uploads.ts";
import { ConfirmDialog } from "../ConfirmDialog.tsx";
import { Icon } from "../Icon.tsx";
import { Toast, type ToastHandle } from "../Toast.tsx";
import { Doorway } from "./Doorway.tsx";

/**
 * Create and edit a goal (.ux-forge/goals form.js, direction B · Doorway): one view for both modes. A task page
 * (no bottom nav on phones; ✕ Cancel and the title in a sticky head), the primary in a footer bar that rides the
 * keyboard. Title in Young Serif inside its field; Type as two radio cells (read-only after create); Target for
 * money goals; Optional details (date, description with a counter from 450, the cover photo in its doorway).
 * Errors under the field, shown on blur after typing and on submit, cleared as soon as valid. Drafts on this
 * phone (lib/goal-drafts.ts). Edit saves only what changed with the updatedAt it started from; a 409 is merged
 * three ways (theirs taken where only they changed a field, marked where both did) and focus goes to the notice.
 * Realtime (Phase 5) will name the partner; until then every concurrent change reads "on another phone".
 */

// ---------- strings: form.js C, verbatim ----------
const C = {
  createHeading: "New goal",
  editHeading: "Edit goal",
  cancel: "Cancel",
  createSubmit: "Create goal",
  createPending: "Creating…",
  createWaiting: "Creating after the photo…",
  createOffline: "You're offline. You can create the goal when you're back online. What you've typed stays here.",
  createOnline: "Back online. You can create the goal now.",
  created: "Goal created.",
  createFailed: "Couldn't create the goal. Try again.",
  editSubmit: "Save changes",
  editPending: "Saving…",
  editOffline: "You're offline. You can save your changes when you're back online. What you've changed stays here.",
  editOnline: "Back online. You can save your changes now.",
  editFailed: "Couldn't save the changes. Try again.",
  saved: "Changes saved",
  titleLabel: "Title",
  titleHelp: "For example, Wedding fund or New sofa",
  typeLegend: "Type",
  money: "Money",
  percent: "Percent",
  moneyHelp: "Save toward an amount of money.",
  percentHelp: "Track progress from 0 to 100%.",
  typeFixed: "You can't change this later.",
  roMoney: "Money goal. The type can't be changed.",
  roPercent: "Percent goal. The type can't be changed.",
  targetLabel: "Target",
  targetHelp: "For example 20000 or 20 000",
  details: "Optional details",
  dateLabel: "Target date",
  dateHelp: "Optional.",
  datePassed: "This date has passed.",
  descLabel: "Description",
  descHelp: "Optional. What is this goal for?",
  coverLabel: "Cover photo",
  coverHelp: "Shown on the goal's card. Without one, the first letter of the title is used.",
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
  coverOffline: "Photos need a connection.",
  coverRestore: "The cover changes when you save. Cancel keeps the current one.",
  errTargetZero: GOAL_MSG.targetZero,
  errTargetEmpty: GOAL_MSG.targetEmpty,
  errTargetFormat: GOAL_MSG.targetFormat,
  errTitleEmpty: GOAL_MSG.titleEmpty,
  errDate: GOAL_MSG.date,
  draftRestored: "Draft restored.",
  draftDiscard: "Discard draft",
  createDiscardTitle: "Discard this goal?",
  createDiscardBody: "What you've typed will be lost.",
  editDiscardTitle: "Discard your changes?",
  keepEditing: "Keep editing",
  discard: "Discard",
  useTheirs: "Use theirs",
  emptyValue: "(empty)",
  resolvedAnn: "Their version is in the field.",
  goneSaved: "This goal was deleted. Your changes weren't saved.",
  backToGoals: "Back to Goals",
  goneHeading: "This goal isn't here any more",
  goneBody: "It may have been deleted.",
  del: "Delete goal",
  delOffline: "Deleting needs a connection.",
  delKeep: "Keep goal",
  delFailed: "Couldn't delete the goal. Try again.",
};
const sUnsupported = (name: string) => `${name} isn't a supported photo. Use a JPEG, PNG or WebP file.`;
const sTooLarge = (name: string) => `${name} is over 10 MB. Choose a smaller photo.`;
const sSavedReopened = (t: string) => `Changes saved. ${t} is open again.`;
const sSavedCompleted = (t: string) => `Changes saved. ${t} is done.`;
const sEditDiscardBody = (t: string) => `Your changes to ${t} won't be saved.`;
const sErrorCount = (n: number) => `${n} fields need your attention.`;
const sDelTitle = (t: string) => `Delete ${t}?`;
const sDeleted = (t: string) => `${t} deleted`;
const count = (n: number, one: string, other: string) => `${n} ${plural(n, one, other)}`;

/** Who changed the goal. Without realtime (Phase 5) the actor is unknown: "another phone". */
type Actor = { kind: "other" };
const sNotice = (_a: Actor) =>
  "This goal changed on another phone while you were editing. Check the marked fields, then save again.";
const sChangedBy = (_a: Actor) => "Changed on another phone";
const sConflict = (_a: Actor, v: string) => `Another phone changed this to "${v}".`;
const sConflictCover = (_a: Actor) => "Another phone changed the cover photo.";

// ---------- model ----------
type Field = "title" | "target" | "targetDate" | "description";
type Editable = Field | "cover";
const F: Record<Field, { input: string; help: string; err: string; mark: string }> = {
  title: { input: "f-title", help: "f-title-help", err: "f-title-err", mark: "f-title-mark" },
  target: { input: "f-target", help: "f-target-help", err: "f-target-err", mark: "f-target-mark" },
  targetDate: { input: "f-date", help: "f-date-help", err: "f-date-err", mark: "f-date-mark" },
  description: { input: "f-desc", help: "f-desc-help", err: "f-desc-err", mark: "f-desc-mark" },
};
const FIELDS: Field[] = ["title", "target", "targetDate", "description"];

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
  kind: "money" | "general";
  values: Record<Field, string>;
  base: GoalSnap | null;
  cover: Cover;
  errors: Partial<Record<Field, string>>;
  touched: Partial<Record<Field, boolean>>;
  marks: Partial<Record<Editable, Mark>>;
  pending: boolean;
  waiting: boolean;
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

function snap(g: GoalView): GoalSnap {
  return {
    title: g.title,
    target: g.target,
    targetDate: g.targetDate ?? "",
    description: g.description ?? "",
    cover: g.cover,
    updatedAt: g.updatedAt,
  };
}

const dateFromIso = (v: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? toDate(v) : null);

function initState(mode: "create" | "edit", g: GoalItem | null, currency: string): St {
  const amount = (n: number | null) => (n != null ? formatAmountNumber(n, currency) : "");
  return {
    mode,
    id: g?.id ?? null,
    kind: g?.kind ?? "money",
    values: {
      title: g?.title ?? "",
      target: amount(g?.target ?? null),
      targetDate: g?.targetDate ?? "",
      description: g?.description ?? "",
    },
    base: g ? snap(g) : null,
    cover: g?.cover ? { state: "done", asset: g.cover } : { state: "none" },
    errors: {},
    touched: {},
    marks: {},
    pending: false,
    waiting: false,
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

// ---------- the page: finds the goal, then the form ----------

export function GoalForm({
  mode,
  goalId,
  currency: spaceCurrency,
}: {
  mode: "create" | "edit";
  goalId?: string;
  /** The space's currency (the route context), until the list brings its own. */
  currency: string;
}) {
  const q = useQuery(goalsQuery);
  const goal = mode === "edit" ? (q.data?.goals.find((g) => g.id === goalId) ?? null) : null;
  if (mode === "edit" && !q.data) {
    // The list isn't on this phone yet: the form waits for it (it holds the goal).
    return q.isError ? <Gone afterSave={false} /> : <div className="form-page" aria-busy="true" />;
  }
  if (mode === "edit" && !goal) return <Gone afterSave={false} />;
  return <FormBody key={goalId ?? "new"} mode={mode} initial={goal} spaceCurrency={spaceCurrency} />;
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
    setTitle("Goal not found");
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
          href="/goals"
          data-act="to-goals"
          onClick={(e) => {
            e.preventDefault();
            void navigate({ to: "/goals", replace: true });
          }}
        >
          {C.backToGoals}
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
  spaceCurrency,
}: {
  mode: "create" | "edit";
  initial: GoalItem | null;
  spaceCurrency: string;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const router = useRouter();
  const online = useOnline();
  const offline = !online;
  const data = useQuery(goalsQuery).data;
  const currency = data?.currency ?? spaceCurrency;
  const uploadsEnabled = !!data?.images;
  const cloudName = data?.images?.cloudName ?? null;
  const create = mode === "create";
  const goal = create ? null : (data?.goals.find((g) => g.id === initial?.id) ?? null);
  const notes = useQuery({ ...notesQuery(initial?.id ?? ""), enabled: !create && !!initial });

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
  const dateRef = useRef<HTMLInputElement>(null);
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
  function parseTarget(raw: string): { value?: number; error?: string } {
    const str = String(raw ?? "").replace(/[\s\u00a0\u202f]/g, "");
    if (str === "") return { error: C.errTargetEmpty };
    const v = parseMoney(str, currency);
    if (v === null) return { error: /^0+([.,]0+)?$/.test(str) ? C.errTargetZero : C.errTargetFormat };
    if (!(v > 0)) return { error: C.errTargetZero };
    return { value: v };
  }

  // ---------- comparisons (three-way merge, dirty) ----------
  const coverKey = (c: ImageAsset | null | undefined) => c?.publicId ?? "";
  const coverValue = (): ImageAsset | null => (s.cover.state === "done" ? s.cover.asset : null);
  const coverNow = () =>
    s.cover.state === "none" ? "" : s.cover.state === "done" ? s.cover.asset.publicId : `pending:${s.cover.url}`;
  function norm(f: Editable, v: unknown): string {
    if (f === "title" || f === "description") return String(v ?? "").trim();
    if (f === "target") {
      if (v == null || String(v).trim() === "") return "";
      if (typeof v === "number") return String(v);
      const p = parseTarget(String(v));
      return p.value != null ? String(p.value) : `raw:${String(v).trim()}`;
    }
    if (f === "targetDate") return v ? String(v) : "";
    return coverKey(v as ImageAsset | null);
  }
  const editable = (): Editable[] => {
    const f: Editable[] = ["title"];
    if (s.kind === "money") f.push("target");
    f.push("targetDate", "description");
    if (uploadsEnabled) f.push("cover");
    return f;
  };
  const mine = (f: Editable): unknown => (f === "cover" ? null : s.values[f]);
  const mineNorm = (f: Editable) => (f === "cover" ? coverNow() : norm(f, mine(f)));
  function dirty(): boolean {
    if (create)
      return !!(
        s.values.title.trim() ||
        s.values.target.trim() ||
        s.values.targetDate ||
        s.values.description.trim() ||
        s.cover.state !== "none"
      );
    return editable().some((f) => mineNorm(f) !== norm(f, s.base![f]));
  }
  const coverChanged = () => !create && coverNow() !== coverKey(s.base!.cover);
  const curTitle = () => s.values.title.trim();

  // ---------- drafts ----------
  function writeDraftNow() {
    if (s.closed) return;
    if (!dirty()) {
      dropDraft(key);
      return;
    }
    const d: GoalDraft = {
      v: 1,
      kind: s.kind,
      title: s.values.title,
      target: s.values.target,
      targetDate: s.values.targetDate,
      description: s.values.description,
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
  const fieldActive = (f: Field) => (f === "target" ? s.kind === "money" : true);
  function validate(f: Field): string {
    if (!fieldActive(f)) return "";
    if (f === "title") {
      const t = s.values.title.trim();
      return !t ? C.errTitleEmpty : Array.from(t).length > GOAL_LIMITS.title ? GOAL_MSG.titleLong : "";
    }
    if (f === "target") return parseTarget(s.values.target).error ?? "";
    if (f === "targetDate") return dateRef.current?.validity.badInput ? C.errDate : "";
    return s.values.description.length > GOAL_LIMITS.description ? GOAL_MSG.descLong : "";
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
    for (const f of FIELDS) {
      if (!fieldActive(f)) continue;
      const m = validate(f);
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
    if (f === "cover") return focusAfter("cover-retry");
    if ((f === "targetDate" || f === "description") && !s.detailsOpen) s.detailsOpen = true;
    focusAfter(F[f].input);
  }

  // ---------- derived ----------
  const progress = goal?.progress ?? initial?.progress ?? 0;
  const was = goal ? isDone(goal) : false;
  let will = was;
  if (!create && s.kind === "money") {
    const p = parseTarget(s.values.target);
    if (p.value != null) will = progress >= p.value;
  }
  const projectedDone = !create && will;
  const previewMsg =
    !create && goal
      ? will && !was
        ? `${goal.title} will be done: ${formatAmount(progress, currency)} is already saved.`
        : !will && was
          ? `${goal.title} will no longer be done.`
          : ""
      : "";
  const descLen = s.values.description.length;
  const countShown = descLen >= GOAL_LIMITS.descriptionCountFrom;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateV = dateFromIso(s.values.targetDate);
  const dateHelp = dateV && dateV < today ? C.datePassed : C.dateHelp;
  function describedBy(f: Field) {
    const ids: string[] = [];
    if (s.errors[f]) ids.push(F[f].err);
    ids.push(F[f].help);
    if (f === "target" && previewMsg) ids.push("f-target-preview");
    if (f === "description" && countShown) ids.push("f-desc-count");
    if (s.marks[f]) ids.push(`${F[f].mark}-text`);
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
    uploadPhoto(c.file, "goal-cover", {
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

  // ---------- merge (ia.md §6.7) ----------
  function apply(f: Editable, v: unknown) {
    if (f === "cover") {
      stopUpload();
      s.cover = v ? { state: "done", asset: v as ImageAsset } : { state: "none" };
      return;
    }
    if (f === "target") s.values.target = v != null && v !== "" ? amountText(v as number) : "";
    else s.values[f] = String(v ?? "");
    setError(f, "");
  }
  function merge(T: GoalSnap, actor: Actor): number {
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
  function showNotice(actor: Actor, focus: boolean) {
    s.notice = sNotice(actor);
    if (focus) focusAfter("merge-text");
    else say(s.notice);
  }
  function takeTheirs(f: Editable) {
    const m = s.marks[f];
    if (!m) return;
    delete s.marks[f];
    apply(f, m.value);
    if (f === "cover") focusAfter(s.cover.state === "none" ? "cover-add" : "cover-replace");
    else focusAfter(F[f].input);
    say(C.resolvedAnn);
    s.dirtyByUser = true;
    saveDraft();
    force();
  }
  function shown(f: Editable, v: unknown): string {
    if (v == null || v === "") return C.emptyValue;
    if (f === "target") return formatAmount(v as number, currency);
    if (f === "targetDate") return day(String(v));
    if (f === "description") {
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
    if (s.closed || s.pending || s.waiting) return; // a double tap is ignored
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
  const leaveUrls = (keep?: string) => {
    for (const u of s.urls) if (u !== keep) URL.revokeObjectURL(u);
    s.urls = [];
  };
  async function commitCreate() {
    const money = s.kind === "money";
    const cover = uploadsEnabled ? coverValue() : null;
    try {
      const { goal: g } = await createGoal({
        id: uuidv7(),
        kind: s.kind,
        title: s.values.title.trim(),
        ...(money ? { target: parseTarget(s.values.target).value } : {}),
        targetDate: s.values.targetDate || null,
        description: s.values.description.trim(),
        ...(cover ? { cover } : {}),
      });
      s.closed = true;
      clearDraft();
      putGoal(qc, g);
      invalidateGoal(qc, g.id);
      void navigate({ to: "/goals/$goalId", params: { goalId: g.id }, replace: true }); // create replaces /goals/new
      say(C.created);
    } catch {
      s.pending = false;
      s.alert = C.createFailed;
      force();
    }
  }
  async function commitEdit() {
    const id = s.id!;
    const body: Record<string, unknown> = { updatedAt: s.base!.updatedAt };
    for (const f of editable()) {
      if (mineNorm(f) === norm(f, s.base![f])) continue;
      if (f === "title") body.title = s.values.title.trim();
      else if (f === "target") body.target = parseTarget(s.values.target).value;
      else if (f === "targetDate") body.targetDate = s.values.targetDate || null;
      else if (f === "description") body.description = s.values.description.trim();
      else body.cover = coverValue();
    }
    try {
      const res = await updateGoal(id, body as Parameters<typeof updateGoal>[1]);
      s.closed = true;
      clearDraft();
      putGoal(qc, res.goal);
      invalidateGoal(qc, id);
      const g = res.goal;
      setFlash({
        toast: { msg: res.completed ? sSavedCompleted(g.title) : res.reopened ? sSavedReopened(g.title) : C.saved },
        focus: "gd-edit",
      });
      // Save pops back to the goal when that's where the edit came from; otherwise it replaces this entry.
      if (router.history.canGoBack()) router.history.back();
      else void navigate({ to: "/goals/$goalId", params: { goalId: id }, replace: true });
    } catch (e) {
      s.pending = false;
      if (isApiError(e, "not_found")) {
        s.closed = true;
        clearDraft();
        dropGoal(qc, id);
        s.gone = "after-save";
        return force();
      }
      if (isApiError(e, "conflict")) {
        // 409: merge with the goal as it is now. The actor is unknown (no realtime yet).
        let current: GoalView | null = null;
        try {
          current = (await api<{ goal: GoalView }>(`/api/goals/${id}`)).goal;
        } catch (e2) {
          if (isApiError(e2, "not_found")) {
            s.closed = true;
            clearDraft();
            dropGoal(qc, id);
            s.gone = "after-save";
            return force();
          }
        }
        if (current) {
          putGoal(qc, current);
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
    if (offline) return say(C.delOffline); // the reason is shown under the button
    setConfirm("delete");
  }
  function delBody(): string {
    const g = goal ?? initial!;
    const ns = notes.data ?? [];
    const photos = ns.reduce((n, x) => n + x.blocks.filter((b) => b.type === "image").length, 0) + (g.cover ? 1 : 0);
    const nNotes = notes.data ? ns.length : g.noteCount;
    if (!g.entryCount && !nNotes && !photos) return "This deletes the goal for both of you. You can't undo this.";
    const tail = `${count(nNotes, "note", "notes")} and ${count(photos, "photo", "photos")}, for both of you. You can't undo this.`;
    if (g.kind === "money")
      return `This deletes its ${count(g.entryCount, "contribution", "contributions")} (${formatAmount(g.progress, currency)}), ${tail}`;
    return `This deletes its ${count(g.entryCount, "update", "updates")}, ${tail}`;
  }
  async function doDelete() {
    setConfirm(null);
    const g = goal ?? initial!;
    try {
      await deleteGoal(g.id);
    } catch {
      s.alert = C.delFailed;
      return force();
    }
    s.closed = true;
    clearDraft();
    dropGoal(qc, g.id);
    invalidateGoal(qc);
    setFlash({ toast: { msg: sDeleted(g.title) } });
    void navigate({ to: "/goals", replace: true });
  }

  // ---------- cancel ----------
  function leave() {
    if (!create) setFlash({ focus: "gd-edit" });
    s.closed = true;
    stopUpload();
    clearDraft();
    if (router.history.canGoBack()) router.history.back();
    else if (create) void navigate({ to: "/goals", replace: true });
    else void navigate({ to: "/goals/$goalId", params: { goalId: s.id! }, replace: true });
  }
  function cancel() {
    if (!dirty()) return leave();
    setConfirm("discard");
  }

  // ---------- draft restore and discard ----------
  function restoreDraft(d: GoalDraft) {
    if (create && d.kind === "general") s.kind = "general";
    s.values = { title: d.title, target: d.target, targetDate: d.targetDate, description: d.description };
    if (d.cover === "none") s.cover = { state: "none" };
    if (create && (d.details || d.targetDate || d.description)) s.detailsOpen = true;
    s.restored = true;
    s.dirtyByUser = true;
    if (!create && d.base && goal) {
      // The goal may have changed since the draft was written: merge against the row it was based on.
      const now = snap(goal);
      s.base = d.base;
      if (new Date(d.base.updatedAt).getTime() !== new Date(now.updatedAt).getTime()) {
        if (merge(now, { kind: "other" })) showNotice({ kind: "other" }, false);
      } else s.base = now;
    }
  }
  function discardDraft() {
    clearDraft();
    stopUpload();
    leaveUrls();
    S.current = initState(mode, goal ?? initial, currency);
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
    // Create: Title is focused (quick capture), even on the first load. Edit: the h1 on an in-app arrival.
    if (create) focusEl(titleRef.current);
    else if (!first) focusHeading();
  });
  useEffect(() => {
    if (s.gone) return;
    setTitle(create ? "New goal" : `Edit ${initial!.title}`);
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

  // The goal changed elsewhere while editing (a refetch brought a newer row): merge it in, say so politely.
  const goalUpdatedAt = goal?.updatedAt;
  useEffect(() => {
    if (create || s.closed || s.pending || !goal || !s.base) return;
    if (new Date(goal.updatedAt).getTime() === new Date(s.base.updatedAt).getTime()) return;
    if (merge(snap(goal), { kind: "other" })) showNotice({ kind: "other" }, false);
    force();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs when the row's version changes
  }, [goalUpdatedAt]);
  // Deleted elsewhere while editing.
  const goalMissing = !create && !!data && !goal;
  useEffect(() => {
    if (!goalMissing || s.closed) return;
    s.closed = true;
    stopUpload();
    clearDraft();
    s.gone = "after-save";
    force();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once the row is gone
  }, [goalMissing]);

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
      if (s.errors[f]) {
        const m = validate(f);
        if (m !== s.errors[f]) setError(f, m);
      }
      if (s.marks[f]) delete s.marks[f]; // the mark stays until the field is edited
      if (f === "targetDate" && s.errors.targetDate) setError("targetDate", validate("targetDate"));
      saveDraft();
      force();
    };
  }
  function onBlur(f: Field) {
    return (e: React.FocusEvent) => {
      if (s.closed || !s.touched[f]) return;
      const rt = e.relatedTarget as HTMLElement | null;
      if (rt?.closest?.('[data-act="cancel"]')) return; // don't nag on the way out
      setError(f, validate(f));
      force();
    };
  }
  function onTitleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Title is a textarea, so Enter never adds a line. Quick capture: on create it moves on to Target when a
    // money goal has none yet; otherwise it submits.
    if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
    e.preventDefault();
    const t = $("#f-target") as HTMLInputElement | null;
    if (create && s.kind === "money" && t && !t.value.trim() && e.currentTarget.value.trim()) return t.focus();
    const form = $("#goal-form") as HTMLFormElement | null;
    form?.requestSubmit($("#primary") as HTMLButtonElement);
  }
  function setKind(k: "money" | "general") {
    s.kind = k;
    if (k !== "money") setError("target", "");
    s.dirtyByUser = true;
    saveDraft();
    force();
  }

  // ---------- markup ----------
  const money = s.kind === "money";
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
  const markSlot = (f: Editable, slotId?: string) => {
    const m = s.marks[f];
    const textId = `${f === "cover" ? "cover-mark" : F[f].mark}-text`;
    const content = !m ? null : m.type === "changed" ? (
      <p className="mark">
        <Icon name="refresh" />
        <span className="mark-text" id={textId}>
          {sChangedBy(m.actor)}
        </span>
      </p>
    ) : (
      <div className="mark mark-conflict">
        <Icon name="refresh" />
        <span className="mark-text" id={textId}>
          {f === "cover" ? sConflictCover(m.actor) : sConflict(m.actor, shown(f, m.value))}
        </span>
        <button
          type="button"
          className="link-btn"
          data-act="use-theirs"
          data-field={f}
          aria-describedby={textId}
          onClick={() => takeTheirs(f)}
        >
          {C.useTheirs}
        </button>
      </div>
    );
    if (f === "cover") return content;
    return (
      <div className="mark-slot" id={slotId}>
        {content}
      </div>
    );
  };
  const invalid = (f: Field) => (s.errors[f] ? " is-invalid" : "");

  let coverGroup: ReactNode = null;
  if (uploadsEnabled) {
    const c = s.cover;
    const has = c.state !== "none";
    const failed = c.state === "failed";
    const ce = failed ? C.coverFailed : s.coverError;
    const offId = offline ? " cover-offline" : "";
    const dis = offline ? true : undefined;
    const preview = c.state === "uploading" || c.state === "failed" ? c.url : c.state === "done" ? c.url : undefined;
    coverGroup = (
      <div className="fg cover-group" role="group" aria-labelledby="cover-label">
        <p className="field-label" id="cover-label">
          {C.coverLabel}
        </p>
        <div className="cover-stage">
          <Doorway
            title={curTitle()}
            cover={c.state === "done" ? c.asset : null}
            size="form"
            done={projectedDone}
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
        {markSlot("cover")}
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

  const typeCell = (value: "money" | "general", name: string, help: string) => (
    <div className="type-cell">
      <input
        type="radio"
        name="kind"
        id={`type-${value}`}
        value={value}
        checked={s.kind === value}
        onChange={() => setKind(value)}
        aria-describedby={`type-${value}-help type-fixed`}
      />
      <label htmlFor={`type-${value}`}>{name}</label>
      <span className="type-help" id={`type-${value}-help`}>
        {help}
      </span>
    </div>
  );

  const g0 = goal ?? initial;
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
      <form className="goal-form" id="goal-form" noValidate aria-labelledby="form-h" onSubmit={onSubmit}>
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
            <p className="notice notice-merge" id="merge-text" tabIndex={-1}>
              <Icon name="refresh" />
              <span>{s.notice}</span>
            </p>
          ) : null}
        </div>
        <div className="form-slot" id="draft-notice">
          {s.restored ? (
            <p className="notice notice-draft">
              <Icon name="note" />
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
              inputMode="text"
              enterKeyHint={create ? "next" : "done"}
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

        {/* 2 · Type: a radio group on create, read-only text on edit */}
        {create ? (
          <fieldset className="fg type">
            <legend className="field-label">{C.typeLegend}</legend>
            <div className="type-cells">
              {typeCell("money", C.money, C.moneyHelp)}
              {typeCell("general", C.percent, C.percentHelp)}
            </div>
            <p className="help" id="type-fixed">
              {C.typeFixed}
            </p>
          </fieldset>
        ) : (
          <div className="fg">
            <p className="field-label">{C.typeLegend}</p>
            <p className="ro-value">{money ? C.roMoney : C.roPercent}</p>
          </div>
        )}

        {/* 3 · Target: money only (kept, just hidden, when create switches to Percent) */}
        {(create || money) && (
          <div className="fg" id="g-target" hidden={!money}>
            <label className="field-label" htmlFor="f-target">
              {C.targetLabel}
              <span className="vh"> amount in {currency}</span>
            </label>
            <div className={`field field-num field-target${invalid("target")}`}>
              <input
                id="f-target"
                name="target"
                type="text"
                inputMode="decimal"
                required
                autoComplete="off"
                enterKeyHint="done"
                value={s.values.target}
                aria-describedby={describedBy("target")}
                aria-invalid={s.errors.target ? true : undefined}
                onChange={onInput("target")}
                onBlur={onBlur("target")}
              />
              <span className="suffix" aria-hidden="true">
                {currency}
              </span>
            </div>
            <p className="help num" id="f-target-help">
              {C.targetHelp}
            </p>
            {err("target")}
            {!create && (
              <p className={`preview${previewMsg && will ? " is-done" : ""}`} id="f-target-preview" aria-live="polite">
                {previewMsg ? (
                  <>
                    {will && <Icon name="check" />}
                    <span>{previewMsg}</span>
                  </>
                ) : null}
              </p>
            )}
            {markSlot("target", "f-target-mark")}
          </div>
        )}

        {/* 4 · Optional details: folded on create, unfolded (no toggle) on edit */}
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
            <label className="field-label" htmlFor="f-date">
              {C.dateLabel}
            </label>
            <div className={`field field-date${invalid("targetDate")}`}>
              <input
                ref={dateRef}
                id="f-date"
                name="targetDate"
                type="date"
                autoComplete="off"
                enterKeyHint="next"
                value={s.values.targetDate}
                aria-describedby={describedBy("targetDate")}
                aria-invalid={s.errors.targetDate ? true : undefined}
                onChange={onInput("targetDate")}
                onBlur={onBlur("targetDate")}
              />
            </div>
            <p className="help" id="f-date-help">
              {dateHelp}
            </p>
            {err("targetDate")}
            {markSlot("targetDate", "f-date-mark")}
          </div>
          <div className="fg">
            <label className="field-label" htmlFor="f-desc">
              {C.descLabel}
            </label>
            <div className={`field field-area${invalid("description")}`}>
              <textarea
                id="f-desc"
                name="description"
                rows={3}
                autoComplete="off"
                enterKeyHint="enter"
                value={s.values.description}
                aria-describedby={describedBy("description")}
                aria-invalid={s.errors.description ? true : undefined}
                onChange={onInput("description")}
                onBlur={onBlur("description")}
              />
            </div>
            <p className="help help-row">
              <span id="f-desc-help">{C.descHelp}</span>
              <span className={`count num${descLen > GOAL_LIMITS.description ? " is-over" : ""}`} id="f-desc-count">
                {countShown ? `${descLen.toLocaleString("en-US")} of ${GOAL_LIMITS.description}` : ""}
              </span>
            </p>
            {err("description")}
            {markSlot("description", "f-desc-mark")}
          </div>
          <div id="cover-slot">{coverGroup}</div>
        </div>

        {/* 5 · The primary: a footer bar on phones (rides the keyboard); ends the form from 48rem, then Cancel */}
        <div className="form-actions">
          <div className="dock">
            <button
              type="submit"
              className="btn-primary"
              id="primary"
              aria-disabled={busy || offline ? true : undefined}
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
            aria-disabled={offline ? true : undefined}
            aria-describedby={offline ? "delete-reason" : undefined}
            onClick={askDelete}
          >
            <Icon name="trash" />
            {C.del}
          </button>
          <p className="help" id="delete-reason" hidden={!offline}>
            {C.delOffline}
          </p>
        </div>
      )}
      <ConfirmDialog
        open={confirm !== null}
        title={confirm === "delete" ? sDelTitle(g0?.title ?? "") : create ? C.createDiscardTitle : C.editDiscardTitle}
        body={
          <p>{confirm === "delete" ? delBody() : create ? C.createDiscardBody : sEditDiscardBody(g0?.title ?? "")}</p>
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
