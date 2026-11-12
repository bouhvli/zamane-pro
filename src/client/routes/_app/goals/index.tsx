import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { formatAmount, formatAmountNumber } from "../../../../shared/money.ts";
import { Bar, Doorway } from "../../../components/goals/Doorway.tsx";
import { Icon } from "../../../components/Icon.tsx";
import { Toast, type ToastHandle } from "../../../components/Toast.tsx";
import { takeFlash } from "../../../lib/flash.ts";
import { PartnerAvatarSm } from "../../../components/goals/Avatar.tsx";
import { setTitle } from "../../../lib/announce.ts";
import {
  ago,
  day,
  doneGoals,
  goalsQuery,
  isDone,
  openGoals,
  pct,
  plural,
  toDate,
  totalSaved,
  type GoalItem,
  type GoalsData,
} from "../../../lib/goals.ts";
import { focusHeading, useArrival, useNoFab } from "../../../lib/nav.ts";
import { useOnline } from "../../../lib/online.ts";
import { unknownName, unknownSlot, type AvatarSlot } from "../../../lib/people.ts";

/**
 * The Goals list (.ux-forge/goals list.js, direction B · Doorway): open goals as doorway tiles on subgrid rows,
 * done goals as flat rows wearing the zellige surround. States: loading (static skeleton tiles), error, empty,
 * all done, populated, offline (cached data) and stale (a refresh failed, cached data shown).
 * D1: open goals closest to done first, done goals newest first. The order is fixed while the list is on screen
 * (a change updates a tile in place, a new goal is appended) and recomputed on arrival or a return to the
 * foreground. Coming back from a goal restores the scroll position and focuses the card just opened.
 */
export const Route = createFileRoute("/_app/goals/")({ component: GoalsList });

/** Where the list was and which card was opened, for the way back (list.js lastOpened, Z.scrollFor). */
const memory: { y: number | null; opened: string | null } = { y: null, opened: null };

type Order = { open: string[]; done: string[] };
const computeOrder = (gs: GoalItem[]): Order => ({
  open: openGoals(gs).map((g) => g.id),
  done: doneGoals(gs).map((g) => g.id),
});

function GoalsList() {
  const { me } = Route.useRouteContext();
  const qc = useQueryClient();
  const q = useQuery(goalsQuery);
  const online = useOnline();
  const data = q.data;
  const [order, setOrder] = useState<Order | null>(() => (data ? computeOrder(data.goals) : null));
  const [retrying, setRetrying] = useState(false);
  const toast = useRef<ToastHandle>(null);
  const focusPrimary = useCallback(() => {
    const p = document.getElementById("primary");
    if (p) p.focus({ preventScroll: true });
    else focusHeading();
  }, []);
  // A toast from the screen before (shared.js Z.flash), e.g. "Wedding fund deleted".
  useEffect(() => {
    const f = takeFlash();
    if (f?.toast) {
      const t = f.toast;
      setTimeout(() => toast.current?.show(t), 0);
    }
    if (f?.focus) document.getElementById(f.focus)?.focus({ preventScroll: true });
  }, []);

  const view: "loading" | "error" | "ready" = data ? "ready" : q.isError ? "error" : "loading";
  const stale = !!data && q.isRefetchError && online;
  const offline = !!data && !online;

  useEffect(() => {
    if (data && !order) setOrder(computeOrder(data.goals));
  }, [data, order]);
  // Back in the foreground: the order is recomputed (D1).
  useEffect(() => {
    const onVis = () => {
      const d = qc.getQueryData<GoalsData>(goalsQuery.queryKey);
      if (document.visibilityState === "visible" && d) setOrder(computeOrder(d.goals));
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [qc]);

  useArrival((first) => {
    if (!first && !(memory.opened && memory.y != null)) focusHeading();
  });
  // Returning from a goal: same scroll position, focus on the card just opened (F1 step 4).
  useLayoutEffect(() => {
    if (memory.y == null || !memory.opened) return;
    const y = memory.y;
    const href = memory.opened;
    memory.opened = null;
    window.scrollTo(0, y);
    const a = document.querySelector<HTMLAnchorElement>(`#main a[href="${CSS.escape(href)}"]`);
    a?.focus({ preventScroll: true });
  }, []);

  const goals = useMemo(() => data?.goals ?? [], [data]);
  const empty = view === "ready" && goals.length === 0;
  const allDone = view === "ready" && goals.length > 0 && goals.every((g) => isDone(g));
  useEffect(() => {
    setTitle(
      view === "loading"
        ? "Loading"
        : view === "error"
          ? "Can't load Goals"
          : offline
            ? "Goals (offline)"
            : empty
              ? "No goals yet"
              : allDone
                ? "All goals reached"
                : "Goals",
    );
  }, [view, offline, empty, allDone]);
  useEffect(() => {
    const main = document.getElementById("main");
    main?.setAttribute("aria-busy", view === "loading" ? "true" : "false");
    return () => main?.removeAttribute("aria-busy");
  }, [view]);
  useNoFab(view !== "ready");

  const byId = useMemo(() => new Map(goals.map((g) => [g.id, g])), [goals]);
  const members = useMemo(() => new Map(data?.members.map((m) => [m.userId, m]) ?? []), [data]);
  const currency = data?.currency ?? "";
  const cloudName = data?.images?.cloudName ?? null;

  // The fixed order, plus goals created since (appended to Open), minus deleted ones.
  const ord = order ?? (data ? computeOrder(goals) : { open: [], done: [] });
  const known = new Set([...ord.open, ...ord.done]);
  const openList = [...ord.open, ...goals.filter((g) => !known.has(g.id)).map((g) => g.id)]
    .map((id) => byId.get(id))
    .filter((g): g is GoalItem => !!g);
  const doneList = ord.done.map((id) => byId.get(id)).filter((g): g is GoalItem => !!g);

  const name = (userId: string) => members.get(userId)?.displayName ?? unknownName(members.size > 0);
  const slot = (userId: string): AvatarSlot =>
    members.get(userId)?.slot ?? (userId === me.user.id ? me.space.slot : unknownSlot(members.size > 0, "b"));
  const fmt = (minor: number) => formatAmountNumber(minor, currency);
  const mad = (minor: number) => formatAmount(minor, currency);

  function summaryText() {
    const open = goals.filter((g) => !isDone(g)).length;
    const done = goals.length - open;
    const amount = `${mad(totalSaved(goals))} saved together`;
    if (open === 0) return `${done} ${plural(done, "goal", "goals")} done · ${amount}`;
    if (done === 0) return `${open} ${plural(open, "goal", "goals")} open · ${amount}`;
    return `${open} ${plural(open, "goal", "goals")} open · ${done} done · ${amount}`;
  }

  async function retry() {
    if (retrying) return;
    setRetrying(true);
    const r = await q.refetch();
    setRetrying(false);
    if (r.data) {
      setOrder(computeOrder(r.data.goals));
      requestAnimationFrame(focusHeading);
    }
  }

  const remember = (href: string) => () => {
    memory.y = window.scrollY;
    memory.opened = href;
  };

  const h1 = (
    <h1 className="title-lg" id="list-h1" tabIndex={-1}>
      Goals
    </h1>
  );
  const primary =
    view === "ready" ? (
      <div className="dock">
        <Link className="btn-primary" id="primary" to="/goals/new">
          <Icon name="plus" />
          {empty ? "Create a goal" : "New goal"}
        </Link>
      </div>
    ) : null;

  let head;
  if (view === "loading")
    head = (
      <div className="list-head">
        {h1}
        <span className="sk sk-summary" aria-hidden="true" />
      </div>
    );
  else if (view === "error" || empty)
    head = (
      <div className="list-head">
        {h1}
        {primary}
      </div>
    );
  else
    head = (
      <div className="list-head">
        {h1}
        <p className="list-summary num" id="list-summary">
          {summaryText()}
        </p>
        {primary}
      </div>
    );

  const notice = offline ? (
    <p className="notice list-notice">
      <Icon name="cloud-off" />
      <span>
        You&apos;re offline. Showing the latest data on this phone. Adding to goals still works and syncs when
        you&apos;re back online.
      </span>
    </p>
  ) : stale ? (
    <div className="notice list-notice notice-stale">
      <Icon name="refresh" />
      <span>Couldn&apos;t refresh. Showing the latest data on this phone.</span>
      <button
        className="link-btn"
        type="button"
        data-act="refresh"
        aria-disabled={retrying ? true : undefined}
        onClick={retry}
      >
        {retrying ? "Trying again" : "Try again"}
      </button>
    </div>
  ) : null;

  let body;
  if (view === "loading") {
    const sk = (k: number) => (
      <li key={k} className="tile tile-sk" aria-hidden="true">
        <span className="sk sk-door" />
        <span className="sk sk-line" />
        <span className="sk sk-fig" />
        <span className="sk sk-of" />
        <span className="sk sk-bar" />
        <span className="sk sk-line" />
        <span className="sk sk-of" />
      </li>
    );
    body = (
      <>
        <LoadingStatus />
        <ul className="tiles" role="list" aria-hidden="true">
          {[0, 1, 2].map(sk)}
        </ul>
      </>
    );
  } else if (view === "error") {
    body = (
      <div className="list-error">
        <div role="alert">
          <h2 className="title">Goals didn&apos;t load</h2>
          <p>Check your connection and try again.</p>
        </div>
        <button
          className="btn-primary"
          type="button"
          data-act="retry"
          aria-disabled={retrying ? true : undefined}
          onClick={retry}
        >
          {retrying ? "Trying again" : "Try again"}
        </button>
      </div>
    );
  } else if (empty) {
    body = (
      <div className="prompt list-empty">
        <Icon name="goal" />
        <div>
          <h2 className="title">No goals yet.</h2>
          <p>A goal is something you save for together. Give it a name and, for money, a target.</p>
        </div>
      </div>
    );
  } else {
    const anyCover = !!cloudName && openList.some((g) => g.cover);
    body = (
      <>
        {openList.length ? (
          <section aria-labelledby="h-open">
            <h2 className="vh" id="h-open">
              Open goals
            </h2>
            <ul className={`tiles${anyCover ? "" : " no-covers"}`} role="list">
              {openList.map((g) => (
                <Tile
                  key={g.id}
                  g={g}
                  cloudName={cloudName}
                  fmt={fmt}
                  mad={mad}
                  name={name}
                  slot={slot}
                  onOpen={remember(`/goals/${g.id}`)}
                />
              ))}
            </ul>
          </section>
        ) : (
          <div className="prompt list-alldone">
            <span className="badge badge-done">
              <Icon name="check" />
              Done
            </span>
            <div>
              <h2 className="title">All goals reached</h2>
              <p>
                You finished {doneList.length} {plural(doneList.length, "goal", "goals")} together.
              </p>
            </div>
          </div>
        )}
        {doneList.length > 0 && (
          <section className="done-sec" aria-labelledby="h-done">
            <h2 className="sec-title" id="h-done">
              Done · {doneList.length}
            </h2>
            <ul className="done-rows" role="list">
              {doneList.map((g) => (
                <DoneRow
                  key={g.id}
                  g={g}
                  cloudName={cloudName}
                  mad={mad}
                  name={name}
                  onOpen={remember(`/goals/${g.id}`)}
                />
              ))}
            </ul>
          </section>
        )}
      </>
    );
  }

  return (
    <div className="list-view">
      {head}
      <Toast ref={toast} onHiddenWithFocus={focusPrimary} />
      {notice}
      <div className="list-body">{body}</div>
    </div>
  );
}

/** "Loading goals", set after a beat so it's announced (list.js #list-status). */
function LoadingStatus() {
  const [text, setText] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setText("Loading goals"), 50);
    return () => clearTimeout(t);
  }, []);
  return (
    <p className="vh" role="status" id="list-status">
      {text}
    </p>
  );
}

function byText(g: GoalItem): string {
  if (!g.targetDate) return "";
  const d = toDate(g.targetDate);
  d.setHours(23, 59);
  return d < new Date() ? `Target date was ${day(g.targetDate)}` : `by ${day(g.targetDate)}`;
}

/** Remembers each goal's last percentage, so a bar animates from where it was when the list comes back. */
const lastPct = new Map<string, number>();

function Tile({
  g,
  cloudName,
  fmt,
  mad,
  name,
  slot,
  onOpen,
}: {
  g: GoalItem;
  cloudName: string | null;
  fmt: (m: number) => string;
  mad: (m: number) => string;
  name: (id: string) => string;
  slot: (id: string) => AvatarSlot;
  onOpen: () => void;
}) {
  const money = g.kind === "money";
  const done = isDone(g);
  const e = g.last;
  const pending = !!g.pendingSync;
  const when = pending ? "waiting to sync" : e ? ago(e.at) : "";
  const text = !e
    ? "No contributions yet"
    : money
      ? `${name(e.userId)} added ${fmt(e.amount ?? 0)} · ${when}`
      : `${name(e.userId)} moved it to ${e.percent}% · ${when}`;
  const from = lastPct.get(g.id);
  const now = pct(g);
  useEffect(() => {
    lastPct.set(g.id, now);
  }, [g.id, now]);
  // The surround closes when a goal is reached while the list is on screen.
  const [wasDone] = useState(done);
  const by = done ? (
    <span className="badge badge-done">
      <Icon name="check" />
      Done
    </span>
  ) : (
    byText(g)
  );
  return (
    <li className={`tile${done ? " is-done" : ""}`} data-id={g.id}>
      <Doorway
        title={g.title}
        cover={g.cover}
        size="tile"
        done={done}
        closing={done && !wasDone}
        cloudName={cloudName}
      />
      <h3 className="tile-title">
        <Link to="/goals/$goalId" params={{ goalId: g.id }} onClick={onOpen}>
          {g.title}
        </Link>
      </h3>
      <p className="tile-fig num">{money ? mad(g.progress) : `${g.progress}%`}</p>
      <p className="tile-of num">{money ? `of ${mad(g.target ?? 0)}` : ""}</p>
      <div className="tile-bar">
        <Bar
          goal={g}
          from={from}
          valueText={money ? `${mad(g.progress)} of ${mad(g.target ?? 0)}` : `${g.progress}%`}
        />
      </div>
      <p
        className="tile-foot"
        aria-label={pending && e ? `${name(e.userId)} added ${mad(e.amount ?? 0)} waiting to sync` : undefined}
      >
        {e ? (
          <>
            <PartnerAvatarSm slot={slot(e.userId)} name={name(e.userId)} />
            <span>
              {pending && <Icon name="cloud-off" className="ic-pending" />}
              {text}
            </span>
          </>
        ) : (
          <span>{text}</span>
        )}
      </p>
      <p className="tile-by">{by}</p>
    </li>
  );
}

function DoneRow({
  g,
  cloudName,
  mad,
  name,
  onOpen,
}: {
  g: GoalItem;
  cloudName: string | null;
  mad: (m: number) => string;
  name: (id: string) => string;
  onOpen: () => void;
}) {
  const done = isDone(g);
  const money = g.kind === "money";
  const p = g.progress;
  const reached = g.completedAt ? day(g.completedAt) : "";
  const who = g.completedBy ? name(g.completedBy) : "";
  let meta: string;
  if (!done) meta = money ? `${mad(p)} of ${mad(g.target ?? 0)}` : `${p}%`;
  else if (money && p > (g.target ?? 0))
    meta = `${mad(p)} of ${mad(g.target ?? 0)} · ${mad(p - (g.target ?? 0))} over · reached ${reached} · ${who}`;
  else if (money) meta = `${mad(g.target ?? 0)} · reached ${reached} · ${who}`;
  else meta = `Reached ${reached} · ${who}`;
  const label = done
    ? `${g.title}: done`
    : money
      ? `${g.title}: ${mad(p)} of ${mad(g.target ?? 0)}, ${pct(g)}%`
      : `${g.title}: ${p}% done`;
  return (
    <li className="done-row" data-id={g.id}>
      <Doorway title={g.title} cover={g.cover} size="row" done={done} cloudName={cloudName} />
      <div className="done-body">
        <h3 className="done-title">
          <Link to="/goals/$goalId" params={{ goalId: g.id }} aria-label={label} onClick={onOpen}>
            {g.title}
          </Link>
        </h3>
        <p className="done-meta num">{meta}</p>
      </div>
      {done && (
        <span className="badge badge-done">
          <Icon name="check" />
          Done
        </span>
      )}
    </li>
  );
}
