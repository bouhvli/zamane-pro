import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { formatAmount, minorUnits } from "../../../../../shared/money.ts";
import { ConfirmDialog } from "../../../../components/ConfirmDialog.tsx";
import { PartnerAvatarSm } from "../../../../components/goals/Avatar.tsx";
import { EntrySheet, PhotoViewer } from "../../../../components/goals/detail/Dialogs.tsx";
import { History, Journal, SkRows, Tabs, type People } from "../../../../components/goals/detail/Feeds.tsx";
import { Bar, Doorway } from "../../../../components/goals/Doorway.tsx";
import { NoteComposer } from "../../../../components/goals/NoteComposer.tsx";
import { Icon } from "../../../../components/Icon.tsx";
import { QuickAddSheet } from "../../../../components/QuickAddSheet.tsx";
import { Toast, type ToastHandle } from "../../../../components/Toast.tsx";
import { say, setTitle } from "../../../../lib/announce.ts";
import { takeFlash, type Flash } from "../../../../lib/flash.ts";
import { consumeEditReturn, markEditFrom } from "../../../../lib/goal-detail.ts";
import {
  ago,
  day,
  entriesQuery,
  goalsQuery,
  isDone,
  notesQuery,
  patchEntryRemove,
  pct,
  statsQuery,
  toDate,
  type EntryItem,
  type GoalItem,
} from "../../../../lib/goals.ts";
import { addEntryKey, homeKey, removeEntryKey, type AddEntryVars, type RemoveEntryVars } from "../../../../lib/home.ts";
import { focusHeading, useArrival, useNoFab } from "../../../../lib/nav.ts";
import { useOnline } from "../../../../lib/online.ts";
import { unknownName, unknownSlot } from "../../../../lib/people.ts";
import { photoUrl } from "../../../../lib/uploads.ts";
import { useEntryCommit } from "../../../../lib/use-entry-commit.ts";

/**
 * A goal (.ux-forge/goals detail.js, direction B · Doorway).
 * - Summary: the doorway, the title, progress, "Who put in what" and Stats (a disclosure below 64rem, a line from
 *   64rem). The floating primary sits in the DOM right after the progress block, the toast right after it.
 * - Feeds: History and Journal as tabs below 64rem (?view=, replaced) and side by side from 64rem.
 * - Dialogs: the entry sheet, its delete confirmation and the photo viewer; the quick-add sheet with this goal
 *   pre-picked; the note composer, driven by ?note= (new or a note id).
 * States: loading, error, not found, partial (the goal is known, its feeds are loading), ready, offline.
 * Realtime (the partner's changes arriving live) is Phase 5.
 */
type Search = { view?: "history" | "journal"; note?: string };

export const Route = createFileRoute("/_app/goals/$goalId/")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    view: s.view === "journal" || s.view === "history" ? s.view : undefined,
    note: typeof s.note === "string" && s.note ? s.note : undefined,
  }),
  component: GoalDetail,
});

const HISTORY_PAGE = 30;
const NOTES_PAGE = 10;
const STATS_KEY = "zamane.goals.statsOpen";
const load = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const save = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* private mode: not remembered */
  }
};
const count = (n: number, one: string, other: string) => `${n} ${n === 1 ? one : other}`;

let lastPointer = false;
if (typeof window !== "undefined") {
  window.addEventListener("pointerdown", () => (lastPointer = true), true);
  window.addEventListener("keydown", () => (lastPointer = false), true);
}
function focusEl(el: HTMLElement | null | undefined) {
  el?.focus({ preventScroll: true, focusVisible: !lastPointer } as FocusOptions);
}
const focusPrimary = () => {
  const p = document.getElementById("primary");
  if (p) focusEl(p);
  else focusHeading();
};

function GoalDetail() {
  const { goalId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const router = useRouter();
  const { me } = Route.useRouteContext();
  const qc = useQueryClient();
  const q = useQuery(goalsQuery);
  const online = useOnline();
  const offline = !online;
  const data = q.data;
  const goal = data?.goals.find((g) => g.id === goalId) ?? null;
  const view: "loading" | "error" | "notfound" | "ready" = !data
    ? q.isError
      ? "error"
      : "loading"
    : goal
      ? "ready"
      : "notfound";
  const ready = view === "ready";
  const entriesQ = useQuery({ ...entriesQuery(goalId), enabled: ready });
  const notesQ = useQuery({ ...notesQuery(goalId), enabled: ready });
  const statsQ = useQuery({ ...statsQuery(goalId), enabled: ready });
  const partial = !entriesQ.data || !notesQ.data;
  const entries = entriesQ.data ?? [];
  const notes = notesQ.data ?? [];

  const tab: "history" | "journal" = search.view === "journal" ? "journal" : "history";
  const [statsOpen, setStatsOpen] = useState(() => load(STATS_KEY) === "1");
  const [descOpen, setDescOpen] = useState(false);
  const [openNotes, setOpenNotes] = useState<Record<string, boolean>>({});
  const [histLimit, setHistLimit] = useState(HISTORY_PAGE);
  const [notesLimit, setNotesLimit] = useState(NOTES_PAGE);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [entryId, setEntryId] = useState<string | null>(null);
  const [viewer, setViewer] = useState<{ noteId: string; block: number } | null>(null);
  const [confirm, setConfirm] = useState<{
    title: string;
    body: ReactNode;
    ok: string;
    onOk: () => void;
  } | null>(null);
  const [closing, setClosing] = useState(false);
  const [turning, setTurning] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const toast = useRef<ToastHandle>(null);
  const root = useRef<HTMLDivElement>(null);
  const pushedNote = useRef(false);
  const focusNote = useRef<string | null>(null);
  /** After a note delete: the next (older) note's heading, else the Write button (composer.js settle). */
  const afterNoteDelete = useRef<{ next: string | null } | null>(null);
  /** Each note's next (older) note, as last seen: kept for a note the composer has already dropped. */
  const nextNote = useRef(new Map<string, string | null>());
  notes.forEach((n, i) => nextNote.current.set(n.id, notes[i + 1]?.id ?? null));
  const focusRowAfter = useRef<{ id: string | null } | null>(null);
  const focusAfterMore = useRef<string | null>(null);
  const rowOrder = useRef<string[]>([]);
  const remove = useMutation<unknown, Error, RemoveEntryVars>({ mutationKey: removeEntryKey });

  const currency = data?.currency ?? "";
  const cloudName = data?.images?.cloudName ?? null;
  const members = new Map(data?.members.map((m) => [m.userId, m]) ?? []);
  const solo = (data?.members.length ?? 2) === 1;
  const mad = (minor: number) => formatAmount(minor, currency);
  const p: People = {
    name: (id) => members.get(id)?.displayName ?? unknownName(members.size > 0),
    slot: (id) => members.get(id)?.slot ?? (id === me.user.id ? me.space.slot : unknownSlot(members.size > 0, "b")),
    mad,
    myId: me.user.id,
  };
  const done = !!goal && isDone(goal);
  const money = goal?.kind === "money";

  const commit = useEntryCommit({
    toast,
    myId: me.user.id,
    currency,
    focusPrimary,
    onCompleted: () => {
      setClosing(true);
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setTurning(true);
        setTimeout(() => setTurning(false), 400);
      }
    },
  });

  // ---------- arrival, title, chrome ----------
  const flash = useRef<Flash | null>(null);
  useArrival((first) => {
    // From the form: its toast ("Changes saved") and the element to focus (Edit), once (Z.flash).
    flash.current = takeFlash();
    const editReturn = consumeEditReturn(goalId);
    if (flash.current?.focus) return;
    // Back from this goal's edit form (Save or Cancel), focus returns to Edit (IA 6.3).
    if (editReturn && !search.note) {
      requestAnimationFrame(() => focusEl(document.getElementById("gd-edit")));
      return;
    }
    if (!first) focusHeading();
  });
  useEffect(() => {
    if (search.note) return; // the composer owns the title while it's open
    if (view === "loading") setTitle("Loading");
    else if (view === "error") setTitle("Can't load goal");
    else if (view === "notfound") setTitle("Goal not found");
    else if (goal) setTitle(`${goal.title}${offline ? " (offline)" : ""}`);
  }, [view, goal, offline, search.note]);
  useNoFab(!ready);
  useEffect(() => {
    const f = flash.current;
    if (!f || !ready) return;
    flash.current = null;
    // Not cancelled on cleanup: the flash is one-shot (StrictMode runs effects twice in development).
    requestAnimationFrame(() => {
      if (f.focus) focusEl(document.getElementById(f.focus));
      if (f.toast) toast.current?.show(f.toast);
    });
  }, [ready]);
  // Going offline is announced once, with this screen's own sentence.
  const wasOnline = useRef(online);
  useEffect(() => {
    if (wasOnline.current && !online && ready) say("You're offline. Adding to this goal still works.");
    wasOnline.current = online;
  }, [online, ready]);

  // ---------- clamps: "More" on the description, "Read more" on notes ----------
  const measure = useCallback(() => {
    const r = root.current;
    if (!r) return;
    const d = document.getElementById("gd-desc");
    const m = r.querySelector<HTMLButtonElement>(".gd-more");
    if (d && m && !d.classList.contains("is-open")) m.hidden = !(d.scrollHeight > d.clientHeight + 1);
    r.querySelectorAll<HTMLElement>(".gd-note:not(.is-open)").forEach((a) => {
      if (!a.offsetParent) return; // in a hidden tab panel: measured when it's shown
      const over = [...a.querySelectorAll<HTMLElement>(".gd-text")].some((t) => t.scrollHeight > t.clientHeight + 1);
      const b = a.querySelector<HTMLButtonElement>(".gd-readmore");
      if (b) b.hidden = !over;
    });
  }, []);
  useLayoutEffect(() => measure());
  useEffect(() => {
    const r = root.current;
    if (!r || !window.ResizeObserver) return;
    const ro = new ResizeObserver(() => requestAnimationFrame(measure));
    ro.observe(r);
    return () => ro.disconnect();
  }, [measure, ready]);

  // ---------- focus after re-renders ----------
  useEffect(() => {
    if (focusRowAfter.current) {
      const id = focusRowAfter.current.id;
      focusRowAfter.current = null;
      const el = id ? document.querySelector<HTMLElement>(`[data-act="entry"][data-id="${CSS.escape(id)}"]`) : null;
      focusEl(el ?? document.getElementById("gd-h-history"));
    }
    if (focusAfterMore.current) {
      const sel = focusAfterMore.current;
      focusAfterMore.current = null;
      focusEl(document.querySelector<HTMLElement>(sel));
    }
  });
  // After the composer closes on a saved note: show the journal and focus the note's heading (F5 step 3).
  useEffect(() => {
    const id = focusNote.current;
    if (!id || search.note) return;
    if (tab !== "journal") {
      void navigate({ search: (s) => ({ ...s, view: "journal" }), replace: true });
      return;
    }
    const h = document.getElementById(`note-${id}-h`);
    if (h) {
      focusNote.current = null;
      focusEl(h);
    }
  }, [search.note, tab, notesQ.data, navigate]);
  // After the composer closes on a deleted note: "Note deleted", focus the next note or the Write button.
  useEffect(() => {
    const d = afterNoteDelete.current;
    if (!d || search.note) return;
    afterNoteDelete.current = null;
    const t = setTimeout(() => {
      const el =
        (d.next && document.getElementById(`note-${d.next}-h`)) ||
        document.querySelector<HTMLElement>('[data-act="write"]') ||
        document.getElementById("gd-h-journal");
      if (el) focusEl(el);
      else focusHeading();
      toast.current?.show({ msg: "Note deleted" });
    }, 0);
    return () => clearTimeout(t);
  }, [search.note]);

  // ---------- tabs ----------
  function selectTab(t: "history" | "journal", o: { focus?: boolean } = {}) {
    const changed = t !== tab;
    if (search.view !== t) void navigate({ search: (s) => ({ ...s, view: t }), replace: true });
    if (o.focus) focusEl(document.getElementById(`gd-tab-${t}`));
    if (changed) {
      const list = document.getElementById("gd-tabs");
      const min = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
      const top = list?.getBoundingClientRect().top ?? 0;
      if (list?.offsetParent && top < min) {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: window.scrollY + top - min - 8, behavior: reduce ? "auto" : "smooth" });
      }
    }
    requestAnimationFrame(measure);
  }
  // ARIA tabs, automatic activation: ←/→ (mirrored in RTL), Home, End.
  function onTabKey(ev: KeyboardEvent<HTMLButtonElement>) {
    const order = ["history", "journal"] as const;
    const i = order.indexOf(ev.currentTarget.id.replace("gd-tab-", "") as "history");
    const rtl = getComputedStyle(ev.currentTarget).direction === "rtl";
    let n: number | null = null;
    if (ev.key === "ArrowRight") n = rtl ? i - 1 : i + 1;
    else if (ev.key === "ArrowLeft") n = rtl ? i + 1 : i - 1;
    else if (ev.key === "Home") n = 0;
    else if (ev.key === "End") n = order.length - 1;
    if (n === null) return;
    ev.preventDefault();
    selectTab(order[(n + order.length) % order.length]!, { focus: true });
  }
  // A panel with nothing focusable in it gets a Tab stop of its own (ARIA tabs pattern); roles only as tabs.
  const [wide, setWide] = useState(() => window.matchMedia("(min-width: 64rem)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 64rem)");
    const on = () => setWide(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  useLayoutEffect(() => {
    for (const t of ["history", "journal"]) {
      const panel = document.getElementById(`gd-panel-${t}`);
      if (!panel) continue;
      if (!wide && !panel.querySelector("button:not([hidden]), a[href]")) panel.tabIndex = 0;
      else panel.removeAttribute("tabindex");
    }
  });

  // ---------- note composer (pushes ?note=, keeps the tab) ----------
  function pushNote(x: string) {
    pushedNote.current = true;
    void navigate({ search: (s) => ({ ...s, view: tab === "journal" ? "journal" : undefined, note: x }) });
  }
  function closeComposer(o?: { saved?: string; deleted?: string }) {
    if (o?.saved) focusNote.current = o.saved;
    if (o?.deleted) afterNoteDelete.current = { next: nextNote.current.get(o.deleted) ?? null };
    if (pushedNote.current) {
      pushedNote.current = false;
      router.history.back();
    } else void navigate({ search: (s) => ({ ...s, note: undefined }), replace: true });
  }

  // ---------- entry sheet and delete ----------
  const entry = entries.find((e) => e.id === entryId) ?? null;
  function closeEntry(returnFocus = true) {
    const id = entryId;
    setEntryId(null);
    if (returnFocus && id) requestAnimationFrame(() => focusRowOr(id));
  }
  function focusRowOr(id: string | null) {
    const el = id ? document.querySelector<HTMLElement>(`[data-act="entry"][data-id="${CSS.escape(id)}"]`) : null;
    focusEl(el ?? document.getElementById("gd-h-history"));
  }

  function afterDelete(g: GoalItem, e: EntryItem) {
    const rest = entries.filter((x) => x.id !== e.id);
    if (g.kind === "money") {
      const saved = rest.reduce((s, x) => s + (x.amount ?? 0), 0);
      return { saved, latest: false, percent: 0, reopens: isDone(g) && saved < (g.target ?? 0) };
    }
    const latest = entries[0]?.id === e.id;
    const pc = rest.length ? (rest[0]!.percent ?? 0) : 0;
    return { saved: 0, latest, percent: latest ? pc : g.progress, reopens: isDone(g) && latest && pc !== 100 };
  }

  function askDelete(blocked: boolean) {
    if (!goal || !entry) return;
    if (blocked) {
      say("Deleting needs a connection.");
      return;
    }
    const e = entry;
    const name = p.name(e.userId);
    if (e.pending) {
      const other = data?.members.find((m) => m.userId !== e.userId);
      const partner = other?.displayName ?? "your partner";
      setConfirm({
        title: money ? `Remove this ${mad(e.amount ?? 0)}?` : `Delete ${name}'s update to ${e.percent}%?`,
        body: <p>It hasn&apos;t synced yet, so {partner} hasn&apos;t seen it.</p>,
        ok: "Remove",
        onOk: () => doDelete(e),
      });
      return;
    }
    const a = afterDelete(goal, e);
    const line = money
      ? `${goal.title} goes back to ${mad(a.saved)} of ${mad(goal.target ?? 0)}.`
      : a.latest
        ? `${goal.title} goes back to ${a.percent}%.`
        : `Progress stays at ${a.percent}%.`;
    setConfirm({
      title: money ? `Delete ${name}'s ${mad(e.amount ?? 0)}?` : `Delete ${name}'s update to ${e.percent}%?`,
      body: (
        <>
          <p>{line}</p>
          {a.reopens && <p>{goal.title} will no longer be done.</p>}
          <p>You can&apos;t undo this.</p>
        </>
      ),
      ok: "Delete",
      onOk: () => doDelete(e),
    });
  }

  // Optimistic: both dialogs close, the row goes, the figures update.
  function doDelete(e: EntryItem) {
    if (!goal) return;
    const g = goal;
    const name = p.name(e.userId);
    const order = rowOrder.current;
    const i = order.indexOf(e.id);
    const next = order[i + 1] ?? order[i - 1] ?? null;
    // What the delete leaves (the cache patch lands a moment later, in the mutation's onMutate).
    const a = afterDelete(g, e);
    closeEntry(false);
    // A queued add that hasn't been sent is dropped from the queue; anything else is deleted behind it.
    const cache = qc.getMutationCache();
    const m = cache.getAll().find((x) => (x.state.variables as AddEntryVars | undefined)?.id === e.id);
    if (m && m.state.isPaused && m.state.status === "pending" && m.options.mutationKey?.[1] === addEntryKey[1]) {
      cache.remove(m);
      patchEntryRemove(qc, g.id, e.id);
      void qc.invalidateQueries({ queryKey: homeKey });
    } else remove.mutate({ goalId: g.id, id: e.id });
    const reopened = a.reopens;
    const msg = e.pending
      ? money
        ? `Removed ${mad(e.amount ?? 0)} from ${g.title}`
        : `${g.title} is back to ${a.percent}%`
      : money
        ? `Deleted ${name}'s ${mad(e.amount ?? 0)} from ${g.title}${reopened ? ". It's open again." : ""}`
        : `Deleted ${name}'s update from ${g.title}${reopened ? ". It's open again." : ""}`;
    focusRowAfter.current = { id: next };
    toast.current?.show({ msg });
  }

  // ---------- states ----------
  const back = (
    <Link className="gd-back" to="/goals" aria-label="Back to all goals">
      <Icon name="chevron-left" />
      <span>Goals</span>
    </Link>
  );
  if (view === "loading")
    return (
      <div className="gd" aria-busy="true" ref={root}>
        {back}
        <div className="gd-mast">
          <div className="gd-door" aria-hidden="true">
            <div className="door door--detail gd-sk-door" />
          </div>
          <div className="gd-facts">
            <div className="gd-id">
              <h1 className="vh" tabIndex={-1}>
                Loading goal
              </h1>
              <span className="sk gd-sk-title" aria-hidden="true" />
              <span className="sk gd-sk-line" aria-hidden="true" />
            </div>
            <div className="gd-progress" aria-hidden="true">
              <span className="sk gd-sk-num" />
              <span className="sk gd-sk-line" />
              <span className="sk gd-sk-bar" />
            </div>
            <div className="gd-share">
              <SkShare />
            </div>
          </div>
        </div>
        <div className="gd-feeds">
          <SkRows n={4} />
        </div>
        <Region role="status" id="gd-status" text="Loading goal" />
      </div>
    );
  if (view === "error")
    return (
      <div className="gd gd--state" ref={root}>
        {back}
        <div className="gd-state">
          <h1 className="title-lg" tabIndex={-1}>
            This goal didn&apos;t load
          </h1>
          <p>Check your connection and try again.</p>
          <button
            className="btn-primary"
            type="button"
            data-act="retry"
            aria-disabled={retrying ? true : undefined}
            onClick={async () => {
              if (retrying) return;
              setRetrying(true);
              await q.refetch();
              setRetrying(false);
              requestAnimationFrame(focusHeading);
            }}
          >
            <Icon name="refresh" />
            {retrying ? "Trying again" : "Try again"}
          </button>
          <Region role="alert" id="gd-alert" text="This goal didn't load. Try again." />
        </div>
      </div>
    );
  if (view === "notfound" || !goal)
    return (
      <div className="gd gd--state" ref={root}>
        <div className="gd-state">
          <h1 className="title-lg" tabIndex={-1}>
            This goal isn&apos;t here any more
          </h1>
          <p>It may have been deleted.</p>
          <Link className="btn-primary" to="/goals">
            Back to Goals
          </Link>
        </div>
      </div>
    );

  // ---------- ready ----------
  const g = goal;
  const last = g.last;
  const progress = g.progress;
  const pc = pct(g);

  // Identity
  let meta: ReactNode = null;
  if (done && g.completedAt) {
    meta = (
      <p className="gd-reached">
        <Icon name="check" />
        <span>
          Reached {day(g.completedAt)} · {g.completedBy ? p.name(g.completedBy) : ""}
        </span>
      </p>
    );
  } else if (g.targetDate) {
    const d = toDate(g.targetDate);
    const t = new Date();
    const past =
      new Date(d.getFullYear(), d.getMonth(), d.getDate()) < new Date(t.getFullYear(), t.getMonth(), t.getDate());
    meta = (
      <p className="gd-meta">
        {past ? "Target date was " : "by "}
        {day(g.targetDate)}
      </p>
    );
  }

  // Progress
  let second: ReactNode = null;
  let figure: string;
  if (money) {
    const target = g.target ?? 0;
    figure = mad(progress);
    second =
      progress > target
        ? `of ${mad(target)} · ${mad(progress - target)} over`
        : done
          ? `of ${mad(target)}`
          : `of ${mad(target)} · ${mad(target - progress)} to go`;
  } else {
    figure = `${progress}%`;
    if (last)
      second = (
        <>
          <PartnerAvatarSm slot={p.slot(last.userId)} name={p.name(last.userId)} />
          <span>
            {p.name(last.userId)} moved it to {last.percent}% · {g.pendingSync ? "waiting to sync" : ago(last.at)}
          </span>
        </>
      );
  }

  // Shares and stats
  const st = statsQ.data;
  let share: ReactNode = null;
  if (partial) share = <SkShare />;
  else if (entries.length && st) {
    share = (
      <>
        <h2 className="gd-sec-h">{money ? "Who put in what" : "Who updated it"}</h2>
        <ul className="gd-cells" role="list">
          {st.shares.map((s) => {
            const name = p.name(s.userId);
            const lbl = money
              ? `${name}: ${mad(s.amount)}, ${s.pct}% of the total`
              : `${name}: ${count(s.count, "update", "updates")}`;
            return (
              <li key={s.userId}>
                <span className="gd-cell-vis" aria-hidden="true">
                  <PartnerAvatarSm slot={p.slot(s.userId)} name={name} size="lg" />
                  <span className="gd-cell-text">
                    <span className="gd-cell-name">{name}</span>
                    <span className="gd-cell-fig">
                      {money ? (
                        <>
                          <span className="gd-cell-amt num" dir="ltr">
                            {mad(s.amount)}
                          </span>
                          <span className="gd-cell-pct num"> · {s.pct}%</span>
                        </>
                      ) : (
                        <span className="gd-cell-amt">{count(s.count, "update", "updates")}</span>
                      )}
                    </span>
                  </span>
                </span>
                <span className="vh">{lbl}</span>
              </li>
            );
          })}
        </ul>
        {solo && <p className="gd-solo">Your partner hasn&apos;t joined yet.</p>}
      </>
    );
  }
  let stats: ReactNode = null;
  if (!partial && entries.length && st) {
    const lastAct = st.last ? `${p.name(st.last.userId)}, ${day(st.last.at)}` : "";
    let rows: [string, ReactNode][];
    let line: string;
    if (money) {
      // The average is shown in whole units, like the design's (2,036 MAD, not 2,035.71 MAD).
      const unit = 10 ** minorUnits(currency);
      const avg = Math.round((st.average ?? 0) / unit) * unit;
      rows = [
        ["Contributions", st.count],
        ["Average", mad(avg)],
        ["Largest", mad(st.largest ?? 0)],
        ["This month", mad(st.thisMonth ?? 0)],
        ["Last activity", lastAct],
      ];
      line =
        `${count(st.count, "contribution", "contributions")} · average ${mad(avg)} · largest ` +
        `${mad(st.largest ?? 0)} · this month ${mad(st.thisMonth ?? 0)} · last activity ${lastAct}`;
    } else {
      const month = st.monthTo != null ? `${st.monthFrom}% → ${st.monthTo}%` : "No updates this month";
      rows = [
        ["Updates", st.count],
        ["This month", month],
        ["Last activity", lastAct],
      ];
      line = `${count(st.count, "update", "updates")}${st.monthTo != null ? ` · this month ${month}` : ""} · last activity ${lastAct}`;
    }
    stats = (
      <>
        <h2 className="gd-stats-h">
          <button
            className="gd-stats-btn"
            type="button"
            data-act="stats"
            aria-expanded={statsOpen}
            aria-controls="gd-stats-panel"
            onClick={() => {
              save(STATS_KEY, statsOpen ? "0" : "1");
              setStatsOpen(!statsOpen);
            }}
          >
            Stats
            <Icon name="chevron-down" />
          </button>
          <span className="gd-stats-label">Stats</span>
        </h2>
        <dl className="gd-dl" id="gd-stats-panel" hidden={!statsOpen}>
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd className="num">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="gd-stats-line">{line}</p>
      </>
    );
  }

  // The primary (D4)
  const primary = done
    ? { act: "write", icon: "note" as const, text: "Write a note" }
    : { act: "add", icon: "plus" as const, text: money ? "Add to this goal" : "Update progress" };
  const openAdd = () => setSheetOpen(true);

  rowOrder.current = entries.slice(0, histLimit).map((e) => e.id);
  const viewerNote = viewer ? notes.find((n) => n.id === viewer.noteId) : null;
  const viewerBlock = viewerNote?.blocks[viewer!.block];
  const viewerImg = viewerBlock && viewerBlock.type === "image" ? viewerBlock : null;
  const tabRoles = (t: "history" | "journal") =>
    wide ? {} : { role: "tabpanel" as const, "aria-labelledby": `gd-tab-${t}` };

  return (
    <>
      <div className="gd" ref={root}>
        {back}
        <div className="gd-notice" id="gd-notice">
          {offline && (
            <p className="notice">
              <Icon name="cloud-off" />
              <span>
                <span className="gd-notice-line">
                  You&apos;re offline. Showing the latest data on this phone. Adding to goals still works and syncs when
                  you&apos;re back online.
                </span>
                <span className="gd-notice-line">Editing, deleting and saving notes need a connection.</span>
              </span>
            </p>
          )}
        </div>
        <div className="gd-mast">
          <div className={`gd-door${done ? " is-done" : ""}`} id="gd-door">
            <Doorway
              title={g.title}
              cover={g.cover}
              size="detail"
              done={done}
              closing={closing}
              cloudName={cloudName}
            />
          </div>
          <div className="gd-facts">
            <Link
              className="btn-sec btn-sm gd-edit"
              id="gd-edit"
              to="/goals/$goalId/edit"
              params={{ goalId: g.id }}
              aria-label={`Edit ${g.title}`}
              onClick={() => markEditFrom(g.id)}
            >
              Edit
            </Link>
            <div className="gd-id" id="gd-id">
              <div className="gd-titlerow">
                <h1 className="display gd-title" id="gd-title" tabIndex={-1} dir="auto">
                  {g.title}
                </h1>
                {done && (
                  <span className="badge badge-done">
                    <Icon name="check" />
                    Done
                  </span>
                )}
              </div>
              {meta}
              {g.description && (
                <div className="gd-descrow">
                  <p className={`gd-desc${descOpen ? " is-open" : ""}`} id="gd-desc" dir="auto">
                    {g.description}
                  </p>
                  <button
                    className="gd-more"
                    type="button"
                    data-act="desc"
                    aria-expanded={descOpen}
                    aria-controls="gd-desc"
                    aria-describedby="gd-more-why"
                    hidden={!descOpen}
                    onClick={() => setDescOpen(!descOpen)}
                  >
                    {descOpen ? "Less" : "More"}
                  </button>
                  <span id="gd-more-why" hidden>
                    {descOpen ? "Show less of the description" : "Show the full description"}
                  </span>
                </div>
              )}
            </div>
            <section className={`gd-progress${done && !turning ? " is-done" : ""}`} id="gd-progress">
              <h2 className="vh">Progress</h2>
              <p className="numeral gd-figure" dir="ltr">
                {figure}
              </p>
              {second && <p className="gd-second">{second}</p>}
              <div className="gd-barline">
                <Bar
                  goal={g}
                  label={g.title}
                  valueText={money ? `${mad(progress)} of ${mad(g.target ?? 0)}` : `${progress}%`}
                />
                {money && !done && (
                  <span className="gd-pct num" aria-hidden="true">
                    {pc}%
                  </span>
                )}
              </div>
              {done && (
                <button
                  className="btn-ghost gd-ghost"
                  type="button"
                  data-act="add"
                  aria-label={money ? `Add more to ${g.title}` : undefined}
                  onClick={openAdd}
                >
                  <Icon name="plus" />
                  {money ? "Add more" : "Update progress"}
                </button>
              )}
            </section>
            <div className="dock">
              <button
                className="btn-primary"
                type="button"
                id="primary"
                data-act={primary.act}
                onClick={() => (done ? pushNote("new") : openAdd())}
              >
                <Icon name={primary.icon} />
                {primary.text}
              </button>
            </div>
            <Toast ref={toast} onHiddenWithFocus={focusPrimary} />
            <section className="gd-share" id="gd-share">
              {share}
            </section>
            <section className="gd-stats" id="gd-stats">
              {stats}
            </section>
          </div>
        </div>
        <div className="gd-feeds" id="gd-feeds" aria-busy={partial ? true : undefined}>
          <Tabs
            goal={g}
            partial={partial}
            tab={tab}
            entries={entries.length}
            notes={notes.length}
            onSelect={(t) => selectTab(t)}
            onKey={onTabKey}
          />
          <section
            className={`gd-panel${tab === "history" ? " is-selected" : ""}`}
            id="gd-panel-history"
            {...tabRoles("history")}
          >
            {partial ? (
              <>
                <h2 className="gd-feed-h" id="gd-h-history" tabIndex={-1}>
                  History
                </h2>
                <SkRows n={4} />
              </>
            ) : (
              <History
                goal={g}
                entries={entries}
                limit={histLimit}
                p={p}
                onOpen={(id) => setEntryId(id)}
                onMore={() => {
                  const first = histLimit;
                  const n = Math.min(HISTORY_PAGE, entries.length - first);
                  const id = entries[first]?.id;
                  setHistLimit(histLimit + HISTORY_PAGE);
                  if (id) focusAfterMore.current = `[data-act="entry"][data-id="${CSS.escape(id)}"]`;
                  say(`${n} more loaded.`);
                }}
              />
            )}
          </section>
          <section
            className={`gd-panel${tab === "journal" ? " is-selected" : ""}`}
            id="gd-panel-journal"
            {...tabRoles("journal")}
          >
            {partial ? (
              <>
                <div className="gd-journal-head">
                  <h2 className="gd-feed-h" id="gd-h-journal" tabIndex={-1}>
                    Journal
                  </h2>
                </div>
                <SkRows n={3} />
              </>
            ) : (
              <Journal
                goal={g}
                done={done}
                notes={notes}
                limit={notesLimit}
                p={p}
                offline={offline}
                cloudName={cloudName}
                openNotes={openNotes}
                onWrite={() => pushNote("new")}
                onEdit={(id) => pushNote(id)}
                onPhoto={(noteId, block) => setViewer({ noteId, block })}
                onToggle={(id) => setOpenNotes((o) => ({ ...o, [id]: !o[id] }))}
                onMore={() => {
                  const first = notesLimit;
                  const n = Math.min(NOTES_PAGE, notes.length - first);
                  const id = notes[first]?.id;
                  setNotesLimit(notesLimit + NOTES_PAGE);
                  if (id) focusAfterMore.current = `#note-${CSS.escape(id)}-h`;
                  say(n === 1 ? "1 more note loaded." : `${n} more notes loaded.`);
                }}
              />
            )}
          </section>
        </div>
      </div>

      <QuickAddSheet
        open={sheetOpen}
        step="amount"
        goal={g}
        openGoals={[g]}
        currency={currency}
        onPick={() => {}}
        onChangeGoal={() => {}}
        onClose={() => {
          setSheetOpen(false);
          requestAnimationFrame(focusPrimary);
        }}
        onSubmit={(goal, value, note) => {
          setSheetOpen(false);
          commit(goal, value, note, { onDetail: true });
        }}
      />
      <EntrySheet
        open={!!entryId && !!entry}
        goal={g}
        entry={entry}
        p={p}
        offline={offline}
        onClose={() => closeEntry()}
        onDelete={askDelete}
      />
      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title ?? ""}
        body={confirm?.body ?? null}
        ok={confirm?.ok ?? ""}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          const ok = confirm?.onOk;
          setConfirm(null);
          // After the confirmation has closed (and handed focus back), the entry sheet closes too.
          if (ok) requestAnimationFrame(ok);
        }}
      />
      <PhotoViewer
        open={!!viewerImg}
        src={viewerImg && cloudName ? photoUrl(cloudName, viewerImg.image, 1200) : null}
        alt={
          viewerImg && viewerNote
            ? viewerImg.alt || `Photo from a note by ${p.name(viewerNote.userId)}, ${day(viewerNote.at)}`
            : ""
        }
        onClose={() => {
          const v = viewer;
          setViewer(null);
          if (v)
            requestAnimationFrame(() =>
              focusEl(
                document.querySelector<HTMLElement>(
                  `[data-act="photo"][data-id="${CSS.escape(v.noteId)}"][data-block="${v.block}"]`,
                ),
              ),
            );
        }}
      />
      <NoteComposer goalId={g.id} note={search.note} onClose={closeComposer} />
    </>
  );
}

function SkShare() {
  return (
    <div aria-hidden="true">
      <span className="sk gd-sk-lbl" />
      <span className="gd-sk-cells">
        <span className="sk gd-sk-cell" />
        <span className="sk gd-sk-cell" />
      </span>
    </div>
  );
}

/** Live regions are inserted empty and filled a moment later, so screen readers notice them. */
function Region({ role, id, text }: { role: "status" | "alert"; id: string; text: string }) {
  const [t, setT] = useState("");
  useEffect(() => {
    const h = setTimeout(() => setT(text), 50);
    return () => clearTimeout(h);
  }, [text]);
  return (
    <p className="vh" role={role} id={id}>
      {t}
    </p>
  );
}
