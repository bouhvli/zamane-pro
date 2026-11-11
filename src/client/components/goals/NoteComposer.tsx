import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouteContext, useRouter } from "@tanstack/react-router";
import { Fragment, useEffect, useLayoutEffect, useReducer, useRef, useState, type ReactNode } from "react";
import { v7 as uuidv7 } from "uuid";
import { GOAL_LIMITS, type ImageAsset, type NoteBlock, type NoteView } from "../../../shared/schemas/goals.ts";
import { api, isApiError } from "../../lib/api.ts";
import {
  createNote,
  deleteNote,
  goalsQuery,
  invalidateGoal,
  notesKey,
  notesQuery,
  plural,
  updateNote,
} from "../../lib/goals.ts";
import {
  deleteNoteDraft,
  getNoteDraft,
  noteDraftKey,
  setNoteDraft,
  type DraftBlock,
  type NoteDraft,
} from "../../lib/note-drafts.ts";
import { useOnline } from "../../lib/online.ts";
import { checkPhoto, photoUrl, uploadPhoto, UploadError } from "../../lib/uploads.ts";
import { say as sayPage } from "../../lib/announce.ts";
import { ConfirmDialog } from "../ConfirmDialog.tsx";
import { Icon, type IconName } from "../Icon.tsx";

/**
 * The note composer (.ux-forge/goals composer.js, direction B · Doorway): a modal dialog over a goal's page,
 * backed by the URL (/goals/$goalId?note=new|<noteId>). Full screen on phones (the tool bar and Save ride the
 * on-screen keyboard), a centred dialog from 48rem. A note is ordered blocks: text, and photos that are inserted
 * at the caret (a text block follows every photo). Photos upload as soon as they're picked; Save waits for them.
 * Removing a block leaves an inline Undo until the note is saved. Reorder mode moves blocks with Move up / Move
 * down. Drafts are kept on this device (lib/note-drafts.ts). Only the author edits. A 409 shows the conflict
 * banner (keep mine / load the latest); a note or goal gone shows the stop banner (copy the text, close).
 */
export interface NoteComposerProps {
  goalId: string;
  /** "new", a note id, or undefined (closed). */
  note: string | undefined;
  /**
   * Close it: the page drops ?note= (back when it pushed the entry, replace otherwise) and places focus.
   * `saved` names the note just saved (focus its heading); `deleted` the note just deleted (toast "Note deleted",
   * focus the next note or "Write a note").
   */
  onClose: (o?: { saved?: string; deleted?: string }) => void;
}

const MAX_PHOTOS = GOAL_LIMITS.photosPerNote;
const NOTE_CAP = GOAL_LIMITS.noteTotal;
const BLOCK_CAP = GOAL_LIMITS.noteBlock;
const COUNTER_FROM = GOAL_LIMITS.noteCountFrom;
const ALT_MAX = GOAL_LIMITS.alt;
/** Journal photos: 4:5 arches, capped at 28rem. */
const PHOTO_W = 448;
const PHOTO_H = 560;

// ---------- copy.md §4, verbatim (composer.js C) ----------
const fmt = (n: number) => n.toLocaleString("en-US");
const C = {
  headNew: "New note",
  headEdit: "Edit note",
  close: "Close note",
  textLabel: "Note",
  phFirst: "What do you want to remember?",
  phNext: "Keep writing",
  textLabelN: (n: number) => `Note text, part ${n}`,
  counter: (c: number, m: number) => `${fmt(c)} of ${fmt(m)}`,
  counterLabel: (r: number) => plural(r, "1 character left", `${fmt(r)} characters left`),
  tooLong: (n: number) => `This note is too long. Shorten it by ${plural(n, "1 character", `${fmt(n)} characters`)}.`,
  addPhoto: "Add photo",
  addPhotoOffline: "Photos need a connection.",
  addPhotoMax: "Up to 10 photos in a note.",
  reorder: "Reorder",
  reorderDone: "Done",
  saveNew: "Save note",
  saveEdit: "Save changes",
  saving: "Saving…",
  waiting: (d: number, t: number) => `Saving after photos (${d} of ${t})`,
  empty: "Write something or add a photo first.",
  emptyNoUploads: "Write something first.",
  blockedPhotos: (n: number) => plural(n, "1 photo didn't upload", `${n} photos didn't upload`),
  offline: "You're offline. Your note stays here. Save it when you're back online.",
  online: "Back online. You can save your note now.",
  saved: "Note saved.",
  saveFailed: "Couldn't save the note. Try again.",
  restored: "Draft restored.",
  discardDraft: "Discard draft",
  photoLabel: (n: number) => `Photo ${n}`,
  uploading: "Uploading…",
  cancel: "Cancel",
  cancelLabel: (n: number) => `Cancel upload of photo ${n}`,
  uploadingAnn: "Uploading photo.",
  uploadedAnn: "Photo added.",
  failed: "Didn't upload.",
  failedAnn: "A photo didn't upload.",
  retry: "Try again",
  remove: "Remove",
  removeLabel: (n: number) => `Remove photo ${n}`,
  describe: "Add a description",
  describeLabel: "Photo description",
  describeHelp: "Optional. Read aloud to people who can't see the photo.",
  tooLarge: (f: string) => `${f} is over 10 MB. Choose a smaller photo.`,
  unsupported: (f: string) => `${f} isn't a supported photo. Use a JPEG, PNG or WebP file.`,
  unavailable: "Photo unavailable",
  removedPhoto: "Removed photo",
  removedText: "Removed text",
  undo: "Undo",
  undoLabel: (t: string) => (t === "image" ? "Undo: restore the removed photo" : "Undo: restore the removed text"),
  reorderHelp: "Move blocks up or down to change the order.",
  reorderOn: "Reorder mode. Use Move up and Move down.",
  reorderOff: "Back to writing.",
  rowText: (w: string) => `Text: ${w}`,
  rowPhoto: "Photo",
  upLabel: (t: string, p: number) => (t === "image" ? `Move photo ${p} up` : `Move text ${p} up`),
  downLabel: (t: string, p: number) => (t === "image" ? `Move photo ${p} down` : `Move text ${p} down`),
  rmLabel: (t: string, p: number) => (t === "image" ? `Remove photo ${p}` : `Remove text ${p}`),
  moved: (t: string, p: number, n: number) => `${t === "image" ? "Photo" : "Text"} moved to ${p} of ${n}.`,
  atStart: "First in the note",
  atEnd: "Last in the note",
  discardTitle: "Discard this note?",
  discardBody: "What you wrote and any photos you added will be lost.",
  discardKeep: "Keep writing",
  discardConfirm: "Discard",
  discardEditTitle: "Discard your changes?",
  discardEditBody: "Your changes to this note won't be saved.",
  discardEditKeep: "Keep editing",
  del: "Delete note",
  delOffline: "Deleting needs a connection.",
  delTitle: "Delete this note?",
  delBody: (n: number) =>
    n === 0
      ? "You can't undo this."
      : plural(
          n,
          "Its 1 photo is deleted too. You can't undo this.",
          `Its ${n} photos are deleted too. You can't undo this.`,
        ),
  delKeep: "Keep note",
  delFailed: "Couldn't delete the note. Try again.",
  conflictTitle: "This note changed on your other device.",
  conflictBody: "Keep yours to replace it, or load the latest version.",
  keepMine: "Keep mine",
  loadLatest: "Load the latest",
  seeLatest: "See the latest version",
  loadTitle: "Replace your edits with the latest version?",
  loadBody: "Your unsaved changes to this note will be lost.",
  loadKeep: "Keep my edits",
  missing: "This note was deleted on your other device.",
  copy: "Copy text",
  closeBtn: "Close",
  copied: "Text copied",
  copyFailed: "Couldn't copy. Select the text and copy it by hand.",
  goalDeleted: (name: string, t: string) => (
    <>
      {name} deleted <bdi>{t}</bdi>. This note can&apos;t be saved.
    </>
  ),
  goalDeletedText: (name: string, t: string) => `${name} deleted ${t}. This note can't be saved.`,
  docNew: (t: string) => `New note: ${t} – Zamane`,
  docEdit: (t: string) => `Edit note: ${t} – Zamane`,
  dlgNew: (t: string) => `New note: ${t}`,
  dlgEdit: (t: string) => `Edit note: ${t}`,
};

// ---------- the block model ----------
type TextB = { k: string; type: "text"; text: string };
type ImgB = {
  k: string;
  type: "image";
  asset: ImageAsset | null;
  /** A local preview (object URL) while it uploads, kept until the composer closes. */
  preview: string | null;
  alt: string;
  status: "uploading" | "failed" | "done";
  progress: number;
  describe: boolean;
  file: File | null;
  ctrl: AbortController | null;
};
type RemovedB = { k: string; type: "removed"; was: TextB | ImgB };
type Block = TextB | ImgB | RemovedB;
type Banner = { type: "missing" } | { type: "goalDeleted"; name: string; title: string };

interface Session {
  goalId: string;
  key: string;
  title: string;
  noteId: string | null;
  newId: string;
  editing: boolean;
  mode: "write" | "reorder";
  base: string | null;
  baseJSON: string;
  storeKey: string;
  blocks: Block[];
  restored: boolean;
  banner: Banner | null;
  conflict: { current: NoteView; open: boolean } | null;
  msg: string;
  saveError: boolean;
  saving: boolean;
  waiting: boolean;
  show: { save?: boolean; add?: boolean };
  whyShown: Set<string>;
  caret: { k: string; pos: number } | null;
  lastF: string | null;
  closing: boolean;
  asking: boolean;
  guardPending: boolean;
  copyStatus: string;
  moved: string | null;
  prevTitle: string;
  ownTitle: string | null;
  opener: HTMLElement | null;
}

let seq = 0;
const txt = (text = ""): TextB => ({ k: `b${++seq}`, type: "text", text });
const pic = (o: Partial<ImgB>): ImgB => ({
  k: `b${++seq}`,
  type: "image",
  asset: o.asset ?? null,
  preview: o.preview ?? null,
  alt: o.alt ?? "",
  status: o.status ?? "done",
  progress: o.progress ?? 0,
  describe: !!o.alt,
  file: o.file ?? null,
  ctrl: null,
});
function toModel(blocks: (NoteView["blocks"][number] | DraftBlock)[]): Block[] {
  return blocks.map((b) => (b.type === "image" ? pic({ asset: b.image, alt: b.alt }) : txt(b.text)));
}
const isImg = (b: Block): b is ImgB => b.type === "image";
const isText = (b: Block): b is TextB => b.type === "text";
/** What would be saved: empty text blocks and removed blocks are dropped (D6). */
function serial(blocks: Block[]): unknown[] {
  const out: unknown[] = [];
  for (const b of blocks) {
    if (b.type === "text") {
      if (b.text.trim()) out.push({ type: "text", text: b.text.trim() });
    } else if (b.type === "image")
      out.push(b.asset ? { type: "image", id: b.asset.publicId, alt: b.alt.trim() } : { type: "image", pending: b.k });
  }
  return out;
}
function toSave(blocks: Block[]): NoteBlock[] {
  const out: NoteBlock[] = [];
  for (const b of blocks) {
    if (b.type === "text") {
      if (b.text.trim()) out.push({ type: "text", text: b.text.trim() });
    } else if (b.type === "image" && b.asset) out.push({ type: "image", image: b.asset, alt: b.alt.trim() });
  }
  return out;
}
function firstWords(t: string) {
  const w = t.trim().split(/\s+/);
  return w.length > 6 ? `${w.slice(0, 6).join(" ")}…` : w.join(" ");
}

/** Side effects kept out of the component body (the React compiler checks it for purity). */
const now = () => Date.now();
const setDocTitle = (t: string) => {
  document.title = t;
};

let lastPointer = false;
if (typeof window !== "undefined") {
  window.addEventListener("pointerdown", () => (lastPointer = true), true);
  window.addEventListener("keydown", () => (lastPointer = false), true);
}
/** What opened the composer, even if the page re-renders before the dialog shows (composer.js lastActivated). */
let lastActivated: { el: HTMLElement; at: number } | null = null;
if (typeof document !== "undefined") {
  document.addEventListener(
    "click",
    (e) => {
      const el = (e.target as Element | null)?.closest?.<HTMLElement>("#main a[href], #main button");
      if (el && !el.closest("dialog")) lastActivated = { el, at: now() };
    },
    true,
  );
}

type ConfirmState = {
  title: string;
  body: string;
  ok: string;
  cancel: string;
  resolve: (yes: boolean) => void;
} | null;

export function NoteComposer({ goalId, note, onClose }: NoteComposerProps) {
  const qc = useQueryClient();
  const router = useRouter();
  const { me } = useRouteContext({ from: "/_app" });
  const myId = me.user.id;
  const goalsQ = useQuery(goalsQuery);
  const notesQ = useQuery({ ...notesQuery(goalId), enabled: !!note });
  const online = useOnline();
  const cloudName = goalsQ.data?.images?.cloudName ?? null;
  const uploadsEnabled = !!cloudName;

  const [, force] = useReducer((x: number) => x + 1, 0);
  const sRef = useRef<Session | null>(null);
  const S = sRef.current;
  const dlg = useRef<HTMLDialogElement>(null);
  const liveEl = useRef<HTMLParagraphElement>(null);
  const alertEl = useRef<HTMLParagraphElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const persistTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const afterRender = useRef<(() => void)[]>([]);
  const flipFrom = useRef<Record<string, number> | null>(null);
  /** A close in progress: the URL still has ?note= until the page navigates; don't reopen it. */
  const suppress = useRef<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const live = useRef({ online, uploadsEnabled, cloudName });
  live.current = { online, uploadsEnabled, cloudName };

  const render = (then?: () => void) => {
    if (then) afterRender.current.push(then);
    force();
  };
  useLayoutEffect(() => {
    const fns = afterRender.current;
    afterRender.current = [];
    fns.forEach((f) => f());
    const before = flipFrom.current;
    flipFrom.current = null;
    if (before && window.matchMedia("(prefers-reduced-motion: no-preference)").matches && dlg.current) {
      const dur = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--dur-move")) || 160;
      dlg.current.querySelectorAll<HTMLElement>(".cmp-row[data-k]").forEach((r) => {
        const from = before[r.dataset.k!];
        const dy = (from ?? 0) - r.getBoundingClientRect().top;
        if (from != null && Math.abs(dy) > 1)
          r.animate([{ transform: `translateY(${dy}px)` }, { transform: "none" }], {
            duration: dur,
            easing: "cubic-bezier(.2,.8,.2,1)",
          });
      });
    }
  });

  // ---------- small helpers over the session ----------
  const kept = (s = sRef.current!) => s.blocks.filter((b): b is TextB | ImgB => b.type !== "removed");
  const photos = (s = sRef.current!) => kept(s).filter(isImg);
  const indexOf = (k: string) => sRef.current!.blocks.findIndex((b) => b.k === k);
  const find = (k: string) => sRef.current!.blocks.find((b) => b.k === k) ?? null;
  const nextKept = (blocks: Block[], i: number) => blocks.slice(i + 1).find((b) => b.type !== "removed") ?? null;
  const prevKept = (blocks: Block[], i: number) =>
    blocks
      .slice(0, i)
      .reverse()
      .find((b) => b.type !== "removed") ?? null;
  const isDirty = () => !!sRef.current && JSON.stringify(serial(sRef.current.blocks)) !== sRef.current.baseJSON;
  const hasContent = () => kept().some((b) => b.type === "image" || b.text.trim());
  const textLength = () => kept().reduce((n, b) => n + (b.type === "text" ? b.text.length : 0), 0);
  const stopped = (s = sRef.current) => !!s?.banner;
  const canReorder = () => {
    const ks = kept().filter((b) => b.type === "image" || b.text.trim());
    return ks.length >= 2 && ks.some(isImg);
  };
  /** Every photo is followed by a text block; tidy also drops empty text blocks nothing needs. */
  function normalize(tidy: boolean) {
    const s = sRef.current!;
    const out: Block[] = [];
    s.blocks.forEach((b, i) => {
      out.push(b);
      if (b.type === "image") {
        const n = nextKept(s.blocks, i);
        if (!n || n.type !== "text") out.push(txt(""));
      }
    });
    s.blocks = out;
    if (tidy && kept().length > 1) {
      const all = s.blocks;
      s.blocks = all.filter((b, i) => {
        if (b.type !== "text" || b.text.trim()) return true;
        for (let j = i - 1; j >= 0; j--) if (all[j]!.type !== "removed") return all[j]!.type === "image";
        return false;
      });
    }
    if (!s.blocks.some(isText)) s.blocks.push(txt(""));
  }

  // ---------- announcements (the page region is inert under a modal) ----------
  function say(msg: string, assertive = false) {
    const l = assertive ? alertEl.current : liveEl.current;
    if (!l) return;
    l.textContent = "";
    setTimeout(() => (l.textContent = msg), 50);
  }

  // ---------- focus ----------
  function focusF(f: string, caret?: number): boolean {
    const el = dlg.current?.querySelector<HTMLElement>(`[data-f="${f}"]`);
    if (!el || el.closest("[hidden]")) return false;
    el.focus({ focusVisible: !lastPointer } as FocusOptions);
    if (caret != null && el instanceof HTMLTextAreaElement) {
      el.setSelectionRange(caret, caret);
      trackCaret(el);
    }
    return true;
  }
  const focusHead = () => dlg.current?.querySelector<HTMLElement>("#cmp-h")?.focus({ preventScroll: true });
  function focusBanner() {
    const h = dlg.current?.querySelector<HTMLElement>(".cmp-banner-h");
    if (h) {
      h.focus();
      return true;
    }
    return false;
  }
  function focusDefault() {
    const s = sRef.current;
    if (!s) return;
    if (stopped() && focusBanner()) return;
    if (s.editing) {
      focusHead();
      return;
    }
    const t = kept().filter(isText)[0];
    if (!(t && focusF(`t:${t.k}`, t.text.length))) focusHead();
  }
  const restoreLast = () => {
    const s = sRef.current;
    if (!(s?.lastF && focusF(s.lastF))) focusDefault();
  };
  function focusLostTo() {
    const a = document.activeElement;
    if (!a || a === document.body || !dlg.current?.contains(a) || a.closest("[hidden]")) {
      if (!focusBanner()) focusDefault();
    }
  }
  function trackCaret(t: EventTarget | null) {
    const s = sRef.current;
    if (s && t instanceof HTMLTextAreaElement && t.classList.contains("cmp-text"))
      s.caret = { k: t.dataset.k!, pos: t.selectionStart || 0 };
  }

  // ---------- persistence ----------
  function persistNow() {
    clearTimeout(persistTimer.current);
    const s = sRef.current;
    if (!s || s.closing) return;
    if (!isDirty()) {
      deleteNoteDraft(s.storeKey);
      return;
    }
    const blocks: DraftBlock[] = [];
    for (const b of s.blocks) {
      if (b.type === "text") blocks.push({ type: "text", text: b.text });
      else if (b.type === "image" && b.status === "done" && b.asset)
        blocks.push({ type: "image", image: b.asset, alt: b.alt });
    }
    const rec: NoteDraft = { v: 1, base: s.base, blocks, at: now() };
    if (!setNoteDraft(s.storeKey, rec))
      setNoteDraft(s.storeKey, { ...rec, blocks: blocks.filter((b) => b.type === "text") });
  }
  const schedulePersist = () => {
    clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(persistNow, 250);
  };
  const clearDraft = () => {
    clearTimeout(persistTimer.current);
    if (sRef.current) deleteNoteDraft(sRef.current.storeKey);
  };
  function onChange() {
    if (!sRef.current) return;
    sRef.current.show.save = false;
    render();
    schedulePersist();
  }

  // ---------- uploads ----------
  const inSession = (b: ImgB) =>
    !!sRef.current && sRef.current.blocks.some((x) => x === b || (x.type === "removed" && x.was === b));
  const stopUpload = (b: ImgB) => {
    b.ctrl?.abort();
    b.ctrl = null;
  };
  function stopAll(s = sRef.current) {
    s?.blocks.forEach((b) => {
      if (b.type === "image") stopUpload(b);
      if (b.type === "removed" && b.was.type === "image") stopUpload(b.was);
    });
  }
  function revokeAll(s: Session) {
    s.blocks.forEach((b) => {
      const p = b.type === "image" ? b : b.type === "removed" && b.was.type === "image" ? b.was : null;
      if (p?.preview) URL.revokeObjectURL(p.preview);
    });
  }
  function startUpload(b: ImgB) {
    stopUpload(b);
    b.status = "uploading";
    b.progress = 0;
    if (!b.file || !live.current.online) {
      // Photos need a connection: it fails at once, like the prototype's tick() when offline.
      setTimeout(() => inSession(b) && b.status === "uploading" && failUpload(b), 0);
      return;
    }
    const ctrl = new AbortController();
    b.ctrl = ctrl;
    uploadPhoto(b.file, "note-image", {
      signal: ctrl.signal,
      onProgress: (p) => {
        if (!inSession(b) || b.ctrl !== ctrl) return;
        b.progress = Math.min(100, Math.round(p * 100));
        render();
      },
    }).then(
      (asset) => {
        if (!inSession(b) || b.ctrl !== ctrl) return;
        b.ctrl = null;
        completeUpload(b, asset);
      },
      (e: unknown) => {
        if (e instanceof UploadError && e.reason === "aborted") return;
        if (!inSession(b) || b.ctrl !== ctrl) return;
        b.ctrl = null;
        failUpload(b);
      },
    );
  }
  function completeUpload(b: ImgB, asset: ImageAsset) {
    const s = sRef.current!;
    b.asset = asset;
    b.status = "done";
    b.progress = 100;
    b.file = null;
    render();
    say(C.uploadedAnn);
    schedulePersist();
    if (s.waiting && b.type === "image" && !photos().some((x) => x.status === "uploading")) {
      s.waiting = false;
      if (photos().some((x) => x.status === "failed")) render();
      else void doSave();
    }
  }
  function failUpload(b: ImgB) {
    const s = sRef.current!;
    stopUpload(b);
    b.status = "failed";
    s.waiting = false;
    const a = document.activeElement;
    const typing = !!a && !!dlg.current?.contains(a) && /^(TEXTAREA|INPUT)$/.test(a.tagName);
    // Never pull focus out of a field someone is typing in.
    render(() => {
      if (!typing) focusF(`r:${b.k}`);
    });
    say(C.failedAnn, true);
  }
  function pickFiles(files: File[]) {
    const s = sRef.current!;
    const room = MAX_PHOTOS - photos().length;
    const msgs: string[] = [];
    const ok: File[] = [];
    for (const f of files) {
      const bad = checkPhoto(f);
      if (bad === "type") msgs.push(C.unsupported(f.name));
      else if (bad === "size") msgs.push(C.tooLarge(f.name));
      else if (ok.length >= room) {
        if (!msgs.includes(C.addPhotoMax)) msgs.push(C.addPhotoMax);
      } else ok.push(f);
    }
    s.msg = msgs.join(" ");
    if (ok.length) insertPhotos(ok.map((f) => pic({ preview: URL.createObjectURL(f), file: f, status: "uploading" })));
    else render();
    if (msgs.length) say(s.msg, true);
  }
  /** Insert at the caret: the text block is split there, and a text block follows every photo (D6). */
  function insertPhotos(ps: ImgB[]) {
    const s = sRef.current!;
    let c = s.caret ? find(s.caret.k) : null;
    if (!c || c.type !== "text") {
      const ts = kept().filter(isText);
      c = ts[ts.length - 1]!;
      s.caret = { k: c.k, pos: c.text.length };
    }
    const tb = c as TextB;
    const i = indexOf(tb.k);
    const pos = Math.min(s.caret!.pos, tb.text.length);
    const after = tb.text.slice(pos).replace(/^\s+/, "");
    tb.text = tb.text.slice(0, pos).replace(/\s+$/, "");
    const add: Block[] = [];
    let tail: TextB | null = null;
    ps.forEach((p, n) => {
      tail = txt(n === ps.length - 1 ? after : "");
      add.push(p, tail);
    });
    s.blocks.splice(i + 1, 0, ...add);
    normalize(true);
    const tk = (tail as TextB | null)!.k;
    render(() => focusF(`t:${tk}`, 0));
    ps.forEach((p) => startUpload(p));
    say(C.uploadingAnn);
    schedulePersist();
  }
  function cancelUpload(k: string) {
    const s = sRef.current!;
    const i = indexOf(k);
    const b = s.blocks[i] as ImgB;
    stopUpload(b);
    if (b.preview) URL.revokeObjectURL(b.preview);
    const prev = s.blocks[i - 1];
    const next = s.blocks[i + 1];
    let fk: string | null = null;
    let pos = 0;
    s.blocks.splice(i, 1);
    if (prev && next && prev.type === "text" && next.type === "text") {
      // re-join the text the photo had split
      pos = prev.text.length;
      if (next.text) prev.text = prev.text ? `${prev.text}\n${next.text}` : next.text;
      s.blocks.splice(i, 1);
      fk = prev.k;
    } else if (next && next.type === "text") fk = next.k;
    else if (prev && prev.type === "text") {
      fk = prev.k;
      pos = prev.text.length;
    }
    normalize(false);
    render(() => {
      if (!(fk && focusF(`t:${fk}`, pos))) focusDefault();
    });
    onChange();
  }
  function retryUpload(k: string) {
    const s = sRef.current!;
    const b = find(k) as ImgB;
    if (!live.current.online) {
      s.msg = C.addPhotoOffline;
      render();
      say(C.addPhotoOffline);
      return;
    }
    startUpload(b);
    render(() => focusF(`c:${k}`));
    say(C.uploadingAnn);
  }

  // ---------- block actions ----------
  function removeBlock(k: string) {
    const s = sRef.current!;
    const i = indexOf(k);
    const b = s.blocks[i];
    if (!b || b.type === "removed") return;
    if (b.type === "image") stopUpload(b);
    s.blocks[i] = { k: b.k, type: "removed", was: b }; // inline Undo, no timer, until saved (6.9)
    render(() => focusF(`u:${k}`));
    onChange();
  }
  function undo(k: string) {
    const s = sRef.current!;
    const i = indexOf(k);
    const r = s.blocks[i];
    if (!r || r.type !== "removed") return;
    const b = r.was;
    if (b.type === "image" && photos().length >= MAX_PHOTOS) {
      s.msg = C.addPhotoMax;
      render();
      say(C.addPhotoMax);
      return;
    }
    s.blocks[i] = b;
    if (b.type === "image" && b.status === "uploading") startUpload(b);
    if (s.mode === "write") normalize(false);
    render(() => focusF(s.mode === "reorder" || b.type === "image" ? `rm:${k}` : `t:${k}`));
    onChange();
  }
  function toggleDescribe(k: string) {
    const b = find(k) as ImgB;
    b.describe = !b.describe;
    render(() => focusF(b.describe ? `di:${k}` : `d:${k}`));
  }
  function move(k: string, dir: "up" | "down") {
    const s = sRef.current!;
    const i = indexOf(k);
    let j = i;
    const step = dir === "up" ? -1 : 1;
    do j += step;
    while (j >= 0 && j < s.blocks.length && s.blocks[j]!.type === "removed");
    if (j < 0 || j >= s.blocks.length) return;
    const tops: Record<string, number> = {};
    dlg.current
      ?.querySelectorAll<HTMLElement>(".cmp-row[data-k]")
      .forEach((r) => (tops[r.dataset.k!] = r.getBoundingClientRect().top));
    flipFrom.current = tops;
    const b = s.blocks[i]!;
    s.blocks[i] = s.blocks[j]!;
    s.blocks[j] = b;
    s.moved = k;
    const ks = kept();
    const pos = ks.indexOf(b as TextB | ImgB) + 1;
    const atEnd = dir === "up" ? pos === 1 : pos === ks.length;
    // F6: the other move button at an end
    render(() => focusF(`${atEnd ? (dir === "up" ? "down" : "up") : dir}:${k}`));
    say(C.moved(b.type === "removed" ? "text" : b.type, pos, ks.length));
    schedulePersist();
  }
  function toggleReorder() {
    const s = sRef.current!;
    if (s.mode === "write") {
      if (kept().length > 1) s.blocks = s.blocks.filter((b) => b.type !== "text" || b.text.trim());
      s.mode = "reorder";
      s.moved = null;
      render();
      say(C.reorderOn);
    } else {
      s.mode = "write";
      normalize(true);
      const m = s.moved ? find(s.moved) : null;
      render(() => {
        if (!(m && focusF(`${m.type === "image" ? "rm" : "t"}:${m.k}`))) focusF("reorder");
      });
      say(C.reorderOff);
    }
    schedulePersist();
  }

  // ---------- confirmations (the shared alertdialog) ----------
  const ask = (o: Omit<NonNullable<ConfirmState>, "resolve">) =>
    new Promise<boolean>((resolve) => setConfirm({ ...o, resolve }));
  const afterConfirm = (fn: () => void) => setTimeout(fn, 0); // after the alertdialog has given focus back

  // ---------- save, discard, delete ----------
  function saveWhy(): { text: string; persist: boolean; icon?: IconName } | null {
    if (!live.current.online) return { text: C.offline, persist: true, icon: "cloud-off" };
    const failed = photos().filter((b) => b.status === "failed").length;
    if (failed) return { text: C.blockedPhotos(failed), persist: true, icon: "alert" };
    const over = textLength() - NOTE_CAP;
    if (over > 0) return { text: C.tooLong(over), persist: true, icon: "alert" };
    if (!hasContent()) return { text: live.current.uploadsEnabled ? C.empty : C.emptyNoUploads, persist: false };
    return null;
  }
  function pressSave() {
    const s = sRef.current;
    if (!s || s.saving || s.waiting) return;
    s.saveError = false;
    if (photos().some((b) => b.status === "uploading")) {
      s.waiting = true; // Save waits instead of refusing
      render();
      return;
    }
    void doSave();
  }
  async function doSave() {
    const s = sRef.current;
    if (!s || s.closing) return;
    s.saving = true;
    s.saveError = false;
    render();
    if (!live.current.online) {
      s.saving = false;
      s.saveError = true;
      render();
      say(C.saveFailed, true);
      return;
    }
    const blocks = toSave(s.blocks);
    try {
      const r = s.noteId
        ? await updateNote(s.goalId, s.noteId, { blocks, updatedAt: s.base! })
        : await createNote(s.goalId, { id: s.newId, blocks });
      if (sRef.current !== s || s.closing) return;
      qc.setQueryData<NoteView[]>(notesKey(s.goalId), (list) =>
        list
          ? list.some((n) => n.id === r.note.id)
            ? list.map((n) => (n.id === r.note.id ? r.note : n))
            : [r.note, ...list]
          : list,
      );
      invalidateGoal(qc, s.goalId);
      clearDraft();
      finish({ saved: r.note.id, announce: C.saved });
    } catch (e) {
      if (sRef.current !== s || s.closing) return;
      s.saving = false;
      if (isApiError(e) && e.status === 409) {
        const current = await latestNote(s);
        if (sRef.current !== s) return;
        if (current) {
          s.conflict = { current, open: false };
          s.mode = "write";
          normalize(false);
          render(focusBanner);
          return;
        }
        s.banner = { type: "missing" };
      } else if (isApiError(e) && e.status === 404) {
        s.banner = (await goalGone(s)) ? goalDeletedBanner(s) : { type: "missing" };
        if (sRef.current !== s) return;
      } else {
        s.saveError = true;
        render();
        say(C.saveFailed, true);
        return;
      }
      stopAll(s);
      render(focusBanner);
    }
  }
  async function latestNote(s: Session): Promise<NoteView | null> {
    try {
      const notes = await qc.fetchQuery({ ...notesQuery(s.goalId), staleTime: 0 });
      return notes.find((n) => n.id === s.noteId) ?? null;
    } catch {
      return null;
    }
  }
  async function goalGone(s: Session): Promise<boolean> {
    try {
      await api(`/api/goals/${s.goalId}`);
      return false;
    } catch (e) {
      return isApiError(e) && e.status === 404;
    }
  }
  /** Who deleted it isn't known without live updates (Phase 5): the prototype's default is the partner. */
  function goalDeletedBanner(s: Session): Banner {
    const partner = goalsQ.data?.members.find((m) => m.userId !== myId);
    return { type: "goalDeleted", name: partner?.displayName ?? "Your partner", title: s.title };
  }
  function confirmDiscard() {
    const ed = sRef.current!.editing;
    return ask({
      title: ed ? C.discardEditTitle : C.discardTitle,
      body: ed ? C.discardEditBody : C.discardBody,
      ok: C.discardConfirm,
      cancel: ed ? C.discardEditKeep : C.discardKeep,
    });
  }
  function askDiscard() {
    const s = sRef.current!;
    s.asking = true;
    void confirmDiscard().then((yes) => {
      if (sRef.current !== s) return;
      s.asking = false;
      if (yes) {
        clearDraft();
        finish({});
      } else afterConfirm(restoreLast);
    });
  }
  function requestClose() {
    const s = sRef.current;
    if (!s || s.asking || s.closing || s.saving) return;
    if (isDirty()) askDiscard();
    else {
      clearDraft();
      finish({});
    }
  }
  function discardDraft() {
    const s = sRef.current!;
    s.asking = true;
    void confirmDiscard().then((yes) => {
      if (sRef.current !== s) return;
      s.asking = false;
      if (!yes) {
        afterConfirm(restoreLast);
        return;
      }
      clearDraft();
      const saved = s.noteId ? qc.getQueryData<NoteView[]>(notesKey(s.goalId))?.find((n) => n.id === s.noteId) : null;
      if (s.editing && !saved) {
        finish({});
        return;
      }
      stopAll(s);
      s.base = saved ? saved.updatedAt : null;
      s.baseJSON = JSON.stringify(serial(toModel(saved ? saved.blocks : [])));
      s.blocks = toModel(saved ? saved.blocks : []);
      s.restored = false;
      s.mode = "write";
      s.lastF = null;
      normalize(false);
      render(() => afterConfirm(focusDefault));
    });
  }
  function keepMine() {
    const s = sRef.current!;
    s.base = s.conflict!.current.updatedAt;
    s.conflict = null;
    render(() => focusF("save"));
    void doSave();
  }
  function loadLatest() {
    const s = sRef.current!;
    const cur = s.conflict!.current;
    s.asking = true;
    void ask({ title: C.loadTitle, body: C.loadBody, ok: C.loadLatest, cancel: C.loadKeep }).then((yes) => {
      if (sRef.current !== s) return;
      s.asking = false;
      if (!yes) {
        afterConfirm(() => focusF("load-latest"));
        return;
      }
      stopAll(s);
      s.blocks = toModel(cur.blocks);
      s.base = cur.updatedAt;
      s.baseJSON = JSON.stringify(serial(toModel(cur.blocks)));
      s.conflict = null;
      s.restored = false;
      s.mode = "write";
      s.lastF = null;
      normalize(false);
      clearDraft();
      render(() =>
        afterConfirm(() => {
          const t = kept().filter(isText)[0];
          if (!(t && focusF(`t:${t.k}`, t.text.length))) focusHead();
        }),
      );
    });
  }
  function pressDelete() {
    const s = sRef.current!;
    const saved = qc.getQueryData<NoteView[]>(notesKey(s.goalId))?.find((n) => n.id === s.noteId);
    const n = saved ? saved.blocks.filter((b) => b.type === "image").length : 0;
    s.asking = true;
    void ask({ title: C.delTitle, body: C.delBody(n), ok: C.del, cancel: C.delKeep }).then(async (yes) => {
      if (sRef.current !== s) return;
      s.asking = false;
      if (!yes) return;
      if (!live.current.online) {
        say(C.delFailed, true);
        return;
      }
      try {
        await deleteNote(s.goalId, s.noteId!);
      } catch {
        if (sRef.current === s) say(C.delFailed, true);
        return;
      }
      if (sRef.current !== s) return;
      qc.setQueryData<NoteView[]>(notesKey(s.goalId), (list) => list?.filter((x) => x.id !== s.noteId));
      invalidateGoal(qc, s.goalId);
      clearDraft();
      finish({ deleted: s.noteId! });
    });
  }
  function copyText() {
    const s = sRef.current!;
    const text = kept()
      .filter(isText)
      .map((b) => b.text.trim())
      .filter(Boolean)
      .join("\n\n");
    const done = (ok: boolean) => {
      if (sRef.current !== s) return;
      s.copyStatus = ok ? C.copied : C.copyFailed;
      render();
      say(s.copyStatus, !ok);
    };
    const fallback = () => {
      const back = document.activeElement as HTMLElement | null;
      const ta = document.createElement("textarea");
      let ok: boolean;
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.className = "vh";
      dlg.current!.appendChild(ta);
      ta.select();
      try {
        ok = document.execCommand("copy");
      } catch {
        ok = false;
      }
      ta.remove();
      back?.focus();
      done(ok);
    };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(() => done(true), fallback);
    else fallback();
  }

  // ---------- opening and closing ----------
  function place() {
    const d = dlg.current;
    const vv = window.visualViewport;
    if (!d?.open) return;
    // Phones: the composer is the visual viewport, so the tool bar and Save ride the on-screen keyboard.
    const phone = window.matchMedia("(max-width: 47.99rem)").matches;
    if (!vv || !phone || vv.scale > 1.01) {
      d.style.top = d.style.height = d.style.bottom = d.style.maxHeight = "";
      return;
    }
    d.style.top = `${vv.offsetTop}px`;
    d.style.bottom = "auto";
    d.style.height = `${vv.height}px`;
    d.style.maxHeight = "none";
  }
  function hide() {
    const d = dlg.current;
    if (d?.open) d.close();
    if (d) d.style.top = d.style.height = d.style.bottom = d.style.maxHeight = "";
  }
  function setOwnTitle(s: Session) {
    const dt = s.editing ? C.docEdit(s.title) : C.docNew(s.title);
    if (document.title !== dt) {
      s.ownTitle = dt;
      setDocTitle(dt);
    }
  }

  function open(key: string): boolean {
    const g = goalsQ.data?.goals.find((x) => x.id === goalId);
    if (!g) return false; // the page shows its own not-found state
    const editing = key !== "new";
    const saved = editing ? (notesQ.data?.find((n) => n.id === key) ?? null) : null;
    if (saved && saved.userId !== myId) {
      onClose(); // author only (D6)
      return false;
    }
    const sk = noteDraftKey(goalId, key);
    const stored = getNoteDraft(sk);
    if (editing && !saved && !stored?.blocks.length) {
      onClose();
      return false;
    }
    const recent = lastActivated && now() - lastActivated.at < 4000 ? lastActivated.el : null;
    const a = document.activeElement;
    const s: Session = {
      goalId,
      key,
      title: g.title,
      noteId: editing ? key : null,
      newId: uuidv7(),
      editing,
      mode: "write",
      base: saved ? saved.updatedAt : null,
      baseJSON: JSON.stringify(serial(toModel(saved ? saved.blocks : []))),
      storeKey: sk,
      blocks: toModel(saved ? saved.blocks : []),
      restored: false,
      banner: null,
      conflict: null,
      msg: "",
      saveError: false,
      saving: false,
      waiting: false,
      show: {},
      whyShown: new Set(),
      caret: null,
      lastF: null,
      closing: false,
      asking: false,
      guardPending: false,
      copyStatus: "",
      moved: null,
      prevTitle: document.title,
      ownTitle: null,
      opener: recent ?? (a instanceof HTMLElement && a.closest("#main") && a.tagName !== "H1" ? a : null),
    };
    sRef.current = s;
    if (stored) {
      const back = toModel(stored.blocks);
      if (JSON.stringify(serial(back)) !== s.baseJSON) {
        s.blocks = back;
        s.restored = true;
        if (stored.base) s.base = stored.base;
      }
    }
    if (editing && !saved) s.banner = { type: "missing" };
    normalize(false);
    const t0 = kept().filter(isText)[0];
    if (t0) s.caret = { k: t0.k, pos: t0.text.length };
    render(() => {
      if (!dlg.current!.open) dlg.current!.showModal();
      place();
      focusDefault();
    });
    return true;
  }

  /** Close: the page drops ?note= and places focus. Uploads stop; previews are released. */
  function finish(o: { saved?: string; deleted?: string; announce?: string; viaUrl?: boolean }) {
    const s = sRef.current;
    if (!s || s.closing) return;
    s.closing = true;
    clearTimeout(persistTimer.current);
    stopAll(s);
    revokeAll(s);
    hide();
    sRef.current = null;
    if (document.title === s.ownTitle) setDocTitle(s.prevTitle);
    force();
    if (o.viaUrl) {
      // The URL already lost ?note= (Back): give focus back to what opened it.
      const op = s.opener;
      setTimeout(() => {
        if (op?.isConnected && op.getClientRects().length) op.focus({ focusVisible: !lastPointer } as FocusOptions);
      }, 0);
      return;
    }
    suppress.current = `${s.goalId}:${s.key}`;
    onClose(o.saved ? { saved: o.saved } : o.deleted ? { deleted: o.deleted } : undefined);
    if (o.announce) {
      const msg = o.announce;
      setTimeout(() => sayPage(msg), 0);
    }
  }
  /** The route left this note without a close (another note or another page): keep the draft. */
  function leave() {
    const s = sRef.current;
    if (!s) return;
    persistNow();
    stopAll(s);
    revokeAll(s);
    s.closing = true;
    hide();
    sRef.current = null;
    if (document.title === s.ownTitle) setDocTitle(s.prevTitle);
  }

  // Sync with the URL (composer.js sync()): opens when ?note= is set, closes when it isn't.
  const ready = !!goalsQ.data && (note === undefined || note === "new" || !!notesQ.data || notesQ.isError);
  useEffect(() => {
    const s = sRef.current;
    if (!note) {
      suppress.current = null;
      if (!s || s.closing || s.guardPending) return;
      // Browser Back while dirty: the URL has already lost ?note=, so push it again and ask.
      if (isDirty()) {
        s.guardPending = true;
        const url = new URL(window.location.href);
        url.searchParams.set("note", s.key);
        router.history.push(url.pathname + url.search);
        return;
      }
      clearDraft();
      finish({ viaUrl: true });
      return;
    }
    if (suppress.current === `${goalId}:${note}`) return;
    if (s && s.goalId === goalId && s.key === note) {
      if (s.guardPending) {
        s.guardPending = false;
        askDiscard();
      }
      return;
    }
    if (!ready) return;
    if (s) leave();
    open(note);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the session lives in a ref; this follows the URL
  }, [note, goalId, ready]);

  // Leaving the page altogether keeps the draft.
  useEffect(() => {
    const onHide = () => persistNow();
    const onVis = () => document.visibilityState === "hidden" && persistNow();
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onVis);
      leave();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once
  }, []);

  // Phones: keep the dialog on the visual viewport.
  const isOpen = !!S;
  useEffect(() => {
    if (!isOpen) return;
    const vv = window.visualViewport;
    vv?.addEventListener("resize", place);
    vv?.addEventListener("scroll", place);
    window.addEventListener("resize", place);
    return () => {
      vv?.removeEventListener("resize", place);
      vv?.removeEventListener("scroll", place);
      window.removeEventListener("resize", place);
    };
  }, [isOpen]);

  // The connection: the composer's own sentence, once (a11y M1).
  const wasOnline = useRef(online);
  useEffect(() => {
    if (wasOnline.current === online) return;
    wasOnline.current = online;
    if (sRef.current && !sRef.current.closing) say(online ? C.online : C.offline);
  }, [online]);

  // The goal or the note went away, or the goal was renamed, while the composer is open.
  const goal = goalsQ.data?.goals.find((g) => g.id === goalId);
  useEffect(() => {
    const s = sRef.current;
    if (!s || s.closing || !goalsQ.data) return;
    let banner: Banner | null = null;
    if (!goal) banner = goalDeletedBanner(s);
    else if (s.editing && notesQ.data && !notesQ.data.some((n) => n.id === s.noteId) && !notesQ.isFetching)
      banner = { type: "missing" };
    else if (goal.title !== s.title) {
      s.title = goal.title;
      render();
    }
    if (!banner || s.banner) return;
    s.banner = banner;
    s.conflict = null;
    s.saving = s.waiting = false;
    stopAll(s);
    photos(s).forEach((b) => {
      if (b.status === "uploading") b.status = "failed";
    });
    if (s.mode === "reorder") {
      s.mode = "write";
      normalize(true);
    }
    render(() => {
      say(dlg.current?.querySelector(".cmp-banner-h")?.textContent ?? "", true);
      focusLostTo();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reacts to the data only
  }, [goal, goalsQ.data, notesQ.data, notesQ.isFetching]);

  // The composer owns the document title while it's open.
  useEffect(() => {
    if (sRef.current && !sRef.current.closing) setOwnTitle(sRef.current);
  });

  // ---------- events ----------
  function onClick(e: React.MouseEvent) {
    const el = (e.target as Element).closest<HTMLElement>("[data-act]");
    const s = sRef.current;
    if (!el || !dlg.current?.contains(el) || !s) return;
    const act = el.dataset.act!;
    const k = el.dataset.k!;
    if (el.getAttribute("aria-disabled") === "true") {
      disabledPress(act, k);
      return;
    }
    switch (act) {
      case "close":
        requestClose();
        break;
      case "add":
        s.msg = "";
        render();
        fileInput.current?.click();
        break;
      case "reorder":
        toggleReorder();
        break;
      case "save":
        pressSave();
        break;
      case "remove":
      case "rm":
        removeBlock(k);
        break;
      case "cancel":
        cancelUpload(k);
        break;
      case "retry":
        retryUpload(k);
        break;
      case "describe":
        toggleDescribe(k);
        break;
      case "undo":
        undo(k);
        break;
      case "up":
      case "down":
        move(k, act);
        break;
      case "delete":
        pressDelete();
        break;
      case "discard-draft":
        discardDraft();
        break;
      case "keep-mine":
        keepMine();
        break;
      case "load-latest":
        loadLatest();
        break;
      case "see-latest":
        s.conflict!.open = !s.conflict!.open;
        render();
        break;
      case "copy":
        copyText();
        break;
      case "close-now":
        clearDraft();
        finish({});
        break;
    }
  }
  /** A press on an aria-disabled control changes nothing but shows and announces its reason (6.8). */
  function disabledPress(act: string, k: string) {
    const s = sRef.current!;
    if (act === "add") {
      s.show.add = true;
      render();
      say(addWhyText());
    } else if (act === "save") {
      if (s.saving || s.waiting) return;
      s.show.save = true;
      render();
      say(saveWhy()?.text ?? "");
    } else if (act === "up" || act === "down") {
      s.whyShown.add(`${act}:${k}`);
      render();
      say(act === "up" ? C.atStart : C.atEnd);
    } else if (act === "delete") say(C.delOffline);
  }
  const addWhyText = () =>
    !live.current.online ? C.addPhotoOffline : photos().length >= MAX_PHOTOS ? C.addPhotoMax : "";

  // ---------- rendering ----------
  let content: ReactNode = null;
  let barEl: ReactNode = null;
  if (S) {
    const ks = kept(S);
    const total = ks.length;
    const imgUrl = (b: { asset: ImageAsset | null; preview?: string | null }) =>
      b.preview ?? (b.asset && cloudName ? photoUrl(cloudName, b.asset, PHOTO_W, PHOTO_H) : null);

    const removedRow = (b: RemovedB) => (
      <div className="cmp-removed" data-k={b.k}>
        <span>{b.was.type === "image" ? C.removedPhoto : C.removedText}</span>
        <button
          type="button"
          className="link-btn"
          data-act="undo"
          data-k={b.k}
          data-f={`u:${b.k}`}
          aria-label={C.undoLabel(b.was.type)}
        >
          {C.undo}
        </button>
      </div>
    );

    let banner: ReactNode = null;
    if (S.banner) {
      banner = (
        <section className="cmp-banner" aria-labelledby="cmp-stop-h">
          <h3 id="cmp-stop-h" className="cmp-banner-h" tabIndex={-1}>
            {S.banner.type === "missing" ? C.missing : C.goalDeleted(S.banner.name, S.banner.title)}
          </h3>
          <div className="cmp-banner-actions">
            <button type="button" className="btn-sec" data-act="copy" data-f="copy">
              {C.copy}
            </button>
            <button type="button" className="btn-sec" data-act="close-now" data-f="close-now">
              {C.closeBtn}
            </button>
          </div>
          <p className="help cmp-copied" id="cmp-copy-status">
            {S.copyStatus}
          </p>
        </section>
      );
    } else if (S.conflict) {
      const op = S.conflict.open;
      banner = (
        <section className="cmp-banner" aria-labelledby="cmp-cf-h">
          <h3 id="cmp-cf-h" className="cmp-banner-h" tabIndex={-1}>
            {C.conflictTitle}
          </h3>
          <p>{C.conflictBody}</p>
          <div className="cmp-banner-actions">
            <button type="button" className="btn-sec" data-act="keep-mine" data-f="keep-mine">
              {C.keepMine}
            </button>
            <button type="button" className="btn-sec" data-act="load-latest" data-f="load-latest">
              {C.loadLatest}
            </button>
          </div>
          <button
            type="button"
            className="link-btn cmp-see"
            data-act="see-latest"
            data-f="see-latest"
            aria-expanded={op}
            aria-controls="cmp-latest"
          >
            <Icon name="chevron-down" className="cmp-chev" />
            {C.seeLatest}
          </button>
          <div className="cmp-latest" id="cmp-latest" hidden={!op}>
            {S.conflict.current.blocks.map((b, i) => {
              if (b.type === "text")
                return (
                  <p key={i} dir="auto">
                    {b.text}
                  </p>
                );
              const u = uploadsEnabled ? imgUrl({ asset: b.image }) : null;
              return (
                <div key={i} className="cmp-latest-photo">
                  <span className="cmp-thumb">{u ? <img src={u} alt={b.alt} /> : <Icon name="image" />}</span>
                  <span className="caption">{uploadsEnabled ? C.rowPhoto : C.unavailable}</span>
                </div>
              );
            })}
          </div>
        </section>
      );
    }

    let main: ReactNode;
    if (S.mode === "reorder") {
      let pos = 0;
      main = (
        <>
          <p className="help cmp-help">{C.reorderHelp}</p>
          <ol className="cmp-rows" role="list">
            {S.blocks.map((b) => {
              if (b.type === "removed")
                return (
                  <li key={b.k} className="cmp-row is-removed" data-k={b.k}>
                    {removedRow(b)}
                  </li>
                );
              pos++;
              const p = pos;
              const u = b.type === "image" && uploadsEnabled ? imgUrl(b) : null;
              const sq = (act: "up" | "down" | "rm", off: boolean) => (
                <button
                  type="button"
                  className="btn-sec cmp-sq"
                  data-act={act}
                  data-k={b.k}
                  data-f={`${act}:${b.k}`}
                  aria-label={
                    act === "up" ? C.upLabel(b.type, p) : act === "down" ? C.downLabel(b.type, p) : C.rmLabel(b.type, p)
                  }
                  aria-disabled={off ? true : undefined}
                  aria-describedby={off ? `${act === "up" ? "cmp-wu-" : "cmp-wd-"}${b.k}` : undefined}
                >
                  <Icon name={act === "up" ? "arrow-up" : act === "down" ? "arrow-down" : "x"} />
                </button>
              );
              return (
                <li key={b.k} className="cmp-row" data-k={b.k}>
                  <span className="cmp-pos num" aria-hidden="true">
                    {p}
                  </span>
                  <span className="cmp-what">
                    {b.type === "image" ? (
                      <>
                        <span className="cmp-thumb">{u ? <img src={u} alt="" /> : <Icon name="image" />}</span>
                        <span>{C.rowPhoto}</span>
                      </>
                    ) : (
                      <span className="cmp-snip" dir="auto">
                        {C.rowText(firstWords(b.text))}
                      </span>
                    )}
                  </span>
                  <span className="cmp-row-btns">
                    {sq("up", p === 1)}
                    {sq("down", p === total)}
                    {sq("rm", false)}
                  </span>
                  <p className="caption cmp-row-why" id={`cmp-wu-${b.k}`} hidden={!S.whyShown.has(`up:${b.k}`)}>
                    {C.atStart}
                  </p>
                  <p className="caption cmp-row-why" id={`cmp-wd-${b.k}`} hidden={!S.whyShown.has(`down:${b.k}`)}>
                    {C.atEnd}
                  </p>
                </li>
              );
            })}
          </ol>
        </>
      );
    } else {
      let tn = 0;
      let pn = 0;
      main = (
        <div className="cmp-blocks">
          {S.blocks.map((b, i) => {
            if (b.type === "removed") return <Fragment key={b.k}>{removedRow(b)}</Fragment>;
            if (b.type === "text") {
              tn++;
              const n = tn;
              const prev = prevKept(S.blocks, i);
              const id = `cmp-t-${b.k}`;
              const counted = b.text.length >= COUNTER_FROM;
              return (
                <div key={b.k} className={`cmp-tb${total === 1 ? " is-alone" : ""}`}>
                  {n === 1 && (
                    <label className="vh" htmlFor={id}>
                      {C.textLabel}
                    </label>
                  )}
                  <TextBlock
                    id={id}
                    k={b.k}
                    value={b.text}
                    rows={total === 1 ? 8 : 2}
                    placeholder={prev && prev.type === "image" ? C.phNext : C.phFirst}
                    label={n === 1 ? undefined : C.textLabelN(n)}
                    describedBy={counted ? `cmp-c-${b.k}` : undefined}
                    onInput={(v, el) => {
                      b.text = v;
                      trackCaret(el);
                      onChange();
                    }}
                  />
                  {counted && (
                    <p className="cmp-count" id={`cmp-c-${b.k}`}>
                      <span aria-hidden="true" className="num">
                        {C.counter(b.text.length, BLOCK_CAP)}
                      </span>
                      <span className="vh">{C.counterLabel(BLOCK_CAP - b.text.length)}</span>
                    </p>
                  )}
                </div>
              );
            }
            pn++;
            const n = pn;
            const u = uploadsEnabled ? imgUrl(b) : null;
            return (
              <div
                key={b.k}
                className={`cmp-photo${uploadsEnabled ? "" : " is-off"}`}
                role="group"
                aria-label={C.photoLabel(n)}
                data-k={b.k}
              >
                <button
                  type="button"
                  className="btn-sec cmp-remove"
                  data-act="remove"
                  data-k={b.k}
                  data-f={`rm:${b.k}`}
                  aria-label={C.removeLabel(n)}
                >
                  <Icon name="x" />
                  <span>{C.remove}</span>
                </button>
                <div className="cmp-arch">
                  {u ? (
                    <img src={u} alt="" decoding="async" />
                  ) : (
                    <span className="photo-example">
                      <Icon name="image" />
                      <span>{C.unavailable}</span>
                    </span>
                  )}
                  {b.status === "uploading" && (
                    <div className="cmp-pill">
                      <span className="cmp-pill-text">
                        {C.uploading} <span className="num">{b.progress}%</span>
                      </span>
                      <button
                        type="button"
                        className="cmp-pill-btn"
                        data-act="cancel"
                        data-k={b.k}
                        data-f={`c:${b.k}`}
                        aria-label={C.cancelLabel(n)}
                      >
                        {C.cancel}
                      </button>
                      <span className="cmp-pill-bar" aria-hidden="true">
                        <span style={{ width: `${b.progress}%` }} />
                      </span>
                    </div>
                  )}
                  {b.status === "failed" && (
                    <div className="cmp-pill is-failed">
                      <Icon name="alert" />
                      <span id={`cmp-fail-${b.k}`}>{C.failed}</span>
                      <button
                        type="button"
                        className="cmp-pill-btn"
                        data-act="retry"
                        data-k={b.k}
                        data-f={`r:${b.k}`}
                        aria-describedby={`cmp-fail-${b.k}`}
                      >
                        {C.retry}
                      </button>
                    </div>
                  )}
                </div>
                {uploadsEnabled && (
                  <>
                    <button
                      type="button"
                      className="link-btn cmp-describe"
                      data-act="describe"
                      data-k={b.k}
                      data-f={`d:${b.k}`}
                      aria-expanded={b.describe}
                      aria-controls={`cmp-d-${b.k}`}
                    >
                      {C.describe}
                    </button>
                    <div className="cmp-desc" id={`cmp-d-${b.k}`} hidden={!b.describe}>
                      <label className="field-label" htmlFor={`cmp-di-${b.k}`}>
                        {C.describeLabel}
                      </label>
                      <div className="field field-text">
                        <input
                          id={`cmp-di-${b.k}`}
                          type="text"
                          data-k={b.k}
                          data-f={`di:${b.k}`}
                          data-role="alt"
                          maxLength={ALT_MAX}
                          autoComplete="off"
                          enterKeyHint="done"
                          dir="auto"
                          aria-describedby={`cmp-dh-${b.k}`}
                          value={b.alt}
                          onChange={(e) => {
                            b.alt = e.target.value;
                            onChange();
                          }}
                        />
                      </div>
                      <p className="help" id={`cmp-dh-${b.k}`}>
                        {C.describeHelp}
                      </p>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    content = (
      <>
        {banner}
        {S.restored && !stopped(S) && (
          <div className="cmp-restored">
            <p>{C.restored}</p>
            <button type="button" className="link-btn" data-act="discard-draft" data-f="discard-draft">
              {C.discardDraft}
            </button>
          </div>
        )}
        {main}
        {S.editing && !stopped(S) && (
          <div className="cmp-end">
            <button
              type="button"
              className="btn-danger"
              data-act="delete"
              data-f="delete"
              aria-disabled={!online ? true : undefined}
              aria-describedby={!online ? "cmp-del-why" : undefined}
            >
              <Icon name="trash" />
              {C.del}
            </button>
            <p className="help" id="cmp-del-why" hidden={online}>
              {C.delOffline}
            </p>
          </div>
        )}
      </>
    );

    // The tool bar (composer.js paintBar)
    const reorder = S.mode === "reorder";
    const addHidden = !uploadsEnabled || reorder;
    const addWhy = addWhyText();
    const ps = photos(S);
    const doneN = ps.filter((b) => b.status === "done").length;
    const why = saveWhy();
    const busy = S.saving || S.waiting;
    const roHidden = !uploadsEnabled || !(reorder || canReorder());
    const line = (id: string, text: string, icon?: IconName | null, extra = "") => (
      <p className={`cmp-line${extra}`} id={id} hidden={!text}>
        {text && (
          <>
            {icon && <Icon name={icon} />}
            <span>{text}</span>
          </>
        )}
      </p>
    );
    barEl = (
      <div className="cmp-bar" hidden={stopped(S)}>
        {line("cmp-err", S.saveError ? C.saveFailed : "", "alert", " cmp-err")}
        {line("cmp-msg", S.msg, "alert")}
        {line("cmp-add-why", addWhy && !addHidden ? addWhy : "", !online ? "cloud-off" : null)}
        {line("cmp-save-why", why && (why.persist || S.show.save) ? why.text : "", why?.icon)}
        <span className="vh" id="cmp-add-desc">
          {addWhy}
        </span>
        <span className="vh" id="cmp-save-desc">
          {!busy && why ? why.text : ""}
        </span>
        <div className="cmp-tools">
          <button
            type="button"
            className="btn-sec cmp-tool"
            data-act="add"
            data-f="add"
            hidden={addHidden}
            aria-disabled={addWhy ? true : undefined}
            aria-describedby={addWhy ? "cmp-add-desc" : undefined}
          >
            <Icon name="image-plus" />
            <span className="cmp-lbl">{C.addPhoto}</span>
          </button>
          <button
            type="button"
            className={`btn-sec cmp-tool cmp-ro${reorder ? " is-on" : ""}`}
            data-act="reorder"
            data-f="reorder"
            hidden={roHidden}
          >
            <Icon name="list-order" />
            <span className="cmp-lbl">{reorder ? C.reorderDone : C.reorder}</span>
          </button>
          <button
            type="button"
            className="btn-primary cmp-save"
            data-act="save"
            data-f="save"
            aria-keyshortcuts="Control+Enter Meta+Enter"
            aria-disabled={busy || why ? true : undefined}
            aria-describedby={!busy && why ? "cmp-save-desc" : undefined}
          >
            {S.saving ? C.saving : S.waiting ? C.waiting(doneN, ps.length) : S.editing ? C.saveEdit : C.saveNew}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <dialog
        ref={dlg}
        id="composer"
        className="sheet composer"
        aria-label={S ? (S.editing ? C.dlgEdit(S.title) : C.dlgNew(S.title)) : undefined}
        onClick={onClick}
        onKeyDown={(e) => {
          if (!sRef.current) return;
          // Esc goes through the discard guard. Handled on keydown so the close watcher can't skip the guard.
          if (e.key === "Escape" && !e.nativeEvent.isComposing) {
            e.preventDefault();
            requestClose();
            return;
          }
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            if (!stopped()) dlg.current?.querySelector<HTMLButtonElement>('[data-act="save"]')?.click();
          }
        }}
        onKeyUp={(e) => trackCaret(e.target)}
        onSelect={(e) => trackCaret(e.target)}
        onFocus={(e) => {
          trackCaret(e.target);
          const f = (e.target as HTMLElement).dataset?.f;
          if (sRef.current && f) sRef.current.lastF = f;
        }}
        onCancel={(e) => {
          e.preventDefault();
          requestClose();
        }}
        onClose={() => {
          // Something else closed it while the URL still says it's open: show it again, and let the guard decide.
          const s = sRef.current;
          if (!s || s.closing) return;
          setTimeout(() => {
            if (sRef.current !== s || s.closing || dlg.current?.open) return;
            dlg.current?.showModal();
            place();
            restoreLast();
            if (!s.guardPending && !s.asking) requestClose();
          }, 0);
        }}
      >
        {S && (
          <>
            <div className="cmp-head">
              <button type="button" className="icon-btn cmp-x" data-act="close" data-f="close" aria-label={C.close}>
                <Icon name="x" />
              </button>
              <div className="cmp-titles">
                <h2 id="cmp-h" tabIndex={-1}>
                  {S.editing ? C.headEdit : C.headNew}
                </h2>
                <p className="caption" id="cmp-sub" dir="auto">
                  {S.title}
                </p>
              </div>
            </div>
            <div className="cmp-body" id="cmp-body">
              {content}
            </div>
            {barEl}
          </>
        )}
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          hidden
          tabIndex={-1}
          data-role="file"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            if (sRef.current && files.length) pickFiles(files);
          }}
        />
        <p className="vh dlg-live" role="status" ref={liveEl} />
        <p className="vh" role="alert" ref={alertEl} />
      </dialog>
      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title ?? ""}
        body={confirm ? <p>{confirm.body}</p> : null}
        ok={confirm?.ok ?? ""}
        cancel={confirm?.cancel}
        onConfirm={() => {
          const c = confirm;
          setConfirm(null);
          c?.resolve(true);
        }}
        onCancel={() => {
          const c = confirm;
          setConfirm(null);
          c?.resolve(false);
        }}
      />
    </>
  );
}

/** A text block: written straight on the sheet; grows with its content (field-sizing, or a height fallback). */
const FIELD_SIZING = typeof CSS !== "undefined" && CSS.supports?.("field-sizing", "content");
function TextBlock({
  id,
  k,
  value,
  rows,
  placeholder,
  label,
  describedBy,
  onInput,
}: {
  id: string;
  k: string;
  value: string;
  rows: number;
  placeholder: string;
  label?: string;
  describedBy?: string;
  onInput: (v: string, el: HTMLTextAreaElement) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const t = ref.current;
    if (FIELD_SIZING || !t) return;
    t.style.height = "auto";
    t.style.height = `${t.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      id={id}
      className="cmp-text"
      data-k={k}
      data-f={`t:${k}`}
      rows={rows}
      maxLength={BLOCK_CAP}
      dir="auto"
      autoComplete="off"
      enterKeyHint="enter"
      placeholder={placeholder}
      aria-label={label}
      aria-describedby={describedBy}
      value={value}
      onChange={(e) => onInput(e.target.value, e.target)}
    />
  );
}
