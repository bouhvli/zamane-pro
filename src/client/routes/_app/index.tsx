import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { v7 as uuidv7 } from "uuid";
import { isComplete } from "../../../shared/completion.ts";
import { formatInviteCode } from "../../../shared/invite-code.ts";
import { formatAmount } from "../../../shared/money.ts";
import { localToday, nextTrip, shortDate } from "../../../shared/trip-days.ts";
import { QuickAddSheet, type SheetStep } from "../../components/QuickAddSheet.tsx";
import { Toast, type ToastHandle } from "../../components/Toast.tsx";
import { Icon } from "../../components/Icon.tsx";
import { initial } from "../../components/Seat.tsx";
import { say, setTitle } from "../../lib/announce.ts";
import {
  addEntryKey,
  removeEntryKey,
  applyEntry,
  goalDone,
  goalRatio,
  homeKey,
  homeQuery,
  plural,
  relativeTime,
  todayCaption,
  type AddEntryVars,
  type RemoveEntryVars,
  type HomeData,
  type HomeGoalView,
} from "../../lib/home.ts";
import { patchEntryRemove } from "../../lib/goals.ts";
import { focusHeading, useArrival } from "../../lib/nav.ts";
import { useOnline } from "../../lib/online.ts";
import { FORMER_PARTNER, type AvatarSlot } from "../../lib/people.ts";

/**
 * Home (.ux-forge/home/home.html, direction B · Within reach). States: loading (skeleton), error, first-run (the
 * invite), joined-empty, populated (with trip now / next / none, shopping, closest to done), all goals done, and
 * offline (cached data, adding still works and syncs later). The state's one primary floats bottom-right on
 * phones and sits in the masthead line from 48rem. Realtime updates from the partner arrive in Phase 5.
 */
export const Route = createFileRoute("/_app/")({ component: Home });

type View = "loading" | "error" | "first-run" | "joined-empty" | "all-done" | "ready";

const TITLES: Partial<Record<View | "offline", string>> = {
  "first-run": "Invite your partner",
  offline: "Home (offline)",
  error: "Can't load Home",
  loading: "Loading",
};

let lastPointer = false;
if (typeof window !== "undefined") {
  window.addEventListener("pointerdown", () => (lastPointer = true), true);
  window.addEventListener("keydown", () => (lastPointer = false), true);
}
function focusPrimary() {
  const p = document.getElementById("primary");
  if (p) p.focus({ preventScroll: true, focusVisible: !lastPointer } as FocusOptions);
}

function Home() {
  const { me } = Route.useRouteContext();
  const qc = useQueryClient();
  const q = useQuery(homeQuery);
  const online = useOnline();
  const toast = useRef<ToastHandle>(null);
  const [justDone, setJustDone] = useState<Set<string>>(() => new Set());
  const [sheet, setSheet] = useState<{ open: boolean; step: SheetStep; goalId: string | null }>({
    open: false,
    step: "pick",
    goalId: null,
  });
  const [retrying, setRetrying] = useState(false);
  const add = useMutation<unknown, Error, AddEntryVars>({ mutationKey: addEntryKey });
  const remove = useMutation<unknown, Error, RemoveEntryVars>({ mutationKey: removeEntryKey });

  const data = q.data;
  const view: View = !data
    ? q.isError
      ? "error"
      : "loading"
    : data.members.length === 1
      ? "first-run"
      : data.goals.length === 0
        ? "joined-empty"
        : data.goals.every((g) => goalDone(g))
          ? "all-done"
          : "ready";
  const offline = !!data && !online;

  useArrival((first) => {
    if (!first) focusHeading();
  });
  useEffect(() => setTitle(TITLES[offline ? "offline" : view] ?? "Home"), [view, offline]);
  useEffect(() => {
    document.getElementById("main")?.setAttribute("aria-busy", view === "loading" ? "true" : "false");
    return () => document.getElementById("main")?.removeAttribute("aria-busy");
  }, [view]);

  const currency = data?.currency ?? "";
  const money = (minor: number) => formatAmount(minor, currency);
  const members = new Map(data?.members.map((m) => [m.userId, m]) ?? []);
  const myId = me.user.id;
  const myName = members.get(myId)?.displayName ?? me.user.displayName;
  const openGoals = (data?.goals ?? []).filter((g) => !goalDone(g));
  const doneCount = (data?.goals ?? []).filter((g) => goalDone(g)).length;

  const onToastHidden = useCallback(() => focusPrimary(), []);

  // ---------- the quick add ----------
  function openSheet() {
    if (openGoals.length === 1) setSheet({ open: true, step: "amount", goalId: openGoals[0]!.id });
    else setSheet({ open: true, step: "pick", goalId: null });
  }
  function closeSheet() {
    setSheet((s) => ({ ...s, open: false }));
    requestAnimationFrame(focusPrimary);
  }

  function commit(goal: HomeGoalView, value: number, note: string) {
    const before = qc.getQueryData<HomeData>(homeKey);
    if (!before) return;
    const isMoney = goal.kind === "money";
    const wasDone = goalDone(goal);
    const vars: AddEntryVars = {
      goalId: goal.id,
      id: uuidv7(),
      ...(isMoney ? { amount: value } : { percent: value }),
      ...(note ? { note } : {}),
      actorId: myId,
      at: new Date().toISOString(),
    };
    const queued = !navigator.onLine;
    const after = applyEntry(before, vars, queued).goals.find((g) => g.id === goal.id)!;
    const completed = isComplete(after.kind, after.progress, after.target) && !wasDone;
    if (completed) setJustDone((s) => new Set(s).add(goal.id));
    add.mutate(vars);
    setSheet((s) => ({ ...s, open: false }));
    requestAnimationFrame(focusPrimary);

    const amountText = isMoney ? money(value) : "";
    const undo = () => undoEntry(vars, before, goal, amountText);
    const undoLabel = isMoney ? `Undo: remove ${amountText} from ${goal.title}` : "Undo";
    if (completed) {
      toast.current?.show({
        done: true,
        title: "Goal reached.",
        msg: queued
          ? "Goal reached once this syncs."
          : isMoney
            ? `${goal.title}: ${money(goal.target ?? 0)} together.`
            : `${goal.title} is at 100%.`,
        undo,
        undoLabel,
      });
    } else if (isMoney) {
      toast.current?.show({
        msg: `Added ${amountText} to ${goal.title}${queued ? ". Will sync when you're back online." : ""}`,
        undo,
        undoLabel,
      });
    } else {
      toast.current?.show({
        msg: queued
          ? `${goal.title} set to ${value}%. Will sync when you're back online.`
          : `${goal.title} is now at ${value}%`,
        undo,
        undoLabel,
      });
    }
  }

  function undoEntry(vars: AddEntryVars, before: HomeData, goal: HomeGoalView, amountText: string) {
    qc.setQueryData(homeKey, before);
    setJustDone((s) => {
      const n = new Set(s);
      n.delete(goal.id);
      return n;
    });
    focusPrimary();
    const prev = before.goals.find((g) => g.id === goal.id)?.progress ?? 0;
    toast.current?.show({
      msg: goal.kind === "money" ? `Removed ${amountText} from ${goal.title}` : `${goal.title} is back to ${prev}%`,
    });
    // Not sent yet (paused offline, or waiting behind another entry write): drop it from the queue. Otherwise queue its removal right behind it (same scope),
    // which survives a reload and waits for a connection like the add did.
    const cache = qc.getMutationCache();
    const m = cache.getAll().find((x) => (x.state.variables as AddEntryVars | undefined)?.id === vars.id);
    if (m && m.state.isPaused && m.state.status === "pending") {
      cache.remove(m);
      patchEntryRemove(qc, vars.goalId, vars.id);
      return;
    }
    remove.mutate({ goalId: vars.goalId, id: vars.id });
  }

  // ---------- page actions ----------
  const canShare = typeof navigator.share === "function";
  const code = data?.inviteCode ? formatInviteCode(data.inviteCode) : "";
  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      toast.current?.show({ msg: "Code copied" });
    } catch {
      toast.current?.show({ msg: "Couldn't copy. Select the code and copy it by hand." });
    }
  }
  function shareCode() {
    navigator.share({ text: `Join me on Zamane. Use this code: ${code}` }).catch(() => undefined);
  }
  async function retry() {
    if (retrying) return;
    setRetrying(true);
    const r = await q.refetch();
    setRetrying(false);
    if (r.data) {
      requestAnimationFrame(() => focusHeading());
      say("Home loaded.");
    }
  }

  // ---------- masthead ----------
  const caption = <p className="caption">{todayCaption()}</p>;
  let greet;
  if (view === "loading") {
    greet = (
      <div className="greet">
        <div>
          {caption}
          <h1 className="vh">Home</h1>
          <span className="sk sk-h1" aria-hidden="true" />
        </div>
      </div>
    );
  } else if (view === "error") {
    greet = (
      <div className="greet">
        <div>
          {caption}
          <h1 className="title-lg" tabIndex={-1}>
            Home
          </h1>
        </div>
      </div>
    );
  } else {
    const solo = view === "first-run";
    const sorted = [...(data?.members ?? [])].sort((a, b) => (a.slot < b.slot ? -1 : 1));
    greet = (
      <div className="greet">
        <div>
          {caption}
          <h1 className="title-lg" tabIndex={-1}>
            {solo ? `Hi, ${myName}` : "Hi, you two"}
          </h1>
        </div>
        <span
          className="zm-pair"
          role="img"
          aria-label={
            solo ? `${myName}. Your partner hasn't joined yet.` : sorted.map((m) => m.displayName).join(" and ")
          }
        >
          {sorted.map((m) => (
            <span key={m.userId} className={`zm-av zm-av-${m.slot} zm-av-md`} aria-hidden="true">
              {initial(m.displayName)}
            </span>
          ))}
        </span>
      </div>
    );
  }

  const notice = offline ? (
    <p className="notice">
      <Icon name="cloud-off" />
      <span>
        You&apos;re offline. Showing the latest data on this phone. Adding to goals still works and syncs when
        you&apos;re back online.
      </span>
    </p>
  ) : null;

  let lead;
  if (view === "loading") {
    lead = (
      <div className="lead" aria-hidden="true">
        <span className="sk sk-lbl" />
        <span className="sk sk-num" />
        <span className="sk sk-cap" />
      </div>
    );
  } else if (view === "error") {
    lead = (
      <div className="lead lead-error">
        <div role="alert">
          <h2>Home didn&apos;t load</h2>
          <p className="lead-body">Check your connection and try again.</p>
        </div>
        <button
          className="btn-primary btn-inline"
          type="button"
          id="primary"
          aria-disabled={retrying || undefined}
          onClick={retry}
        >
          {retrying ? "Trying again" : "Try again"}
        </button>
      </div>
    );
  } else if (view === "first-run") {
    lead = (
      <div className="lead invite">
        <h2 className="lbl">Invite your partner</h2>
        <div className="code-row">
          <span className="code num" dir="ltr" aria-hidden="true">
            {code}
          </span>
          <span className="vh">Invite code: {spellCode(code)}</span>
          {canShare && (
            <button className="btn-sec btn-sm" type="button" data-act="copy" onClick={copyCode}>
              <Icon name="copy" />
              Copy<span className="vh"> invite code</span>
            </button>
          )}
        </div>
        <p className="lead-body">Share this code so they can join your space.</p>
        <p className="caption waiting">Waiting for your partner to join.</p>
      </div>
    );
  } else if (view === "joined-empty") {
    lead = (
      <div className="lead">
        <h2 className="lbl">Saved together</h2>
        <span className="total">
          <span className="big num">{money(0)}</span>
        </span>
        <p className="lead-body">Nothing saved yet. Create a goal to start counting.</p>
      </div>
    );
  } else {
    const open = openGoals.length;
    const counts =
      open === 0
        ? `${doneCount} ${plural(doneCount, "goal", "goals")} done`
        : `${open} ${plural(open, "goal", "goals")} open · ${doneCount} done`;
    lead = (
      <div className="lead">
        <Link className="total" to="/goals">
          <h2 className="lbl">Saved together</h2>
          <span className="big num" id="total-num">
            {money(data!.total)}
          </span>
          <span className="counts">
            <span>{counts}</span>
            <Icon name="chevron-right" />
          </span>
        </Link>
      </div>
    );
  }

  let dock = null;
  if (view === "first-run") {
    dock = (
      <div className="dock">
        <button
          className="btn-primary"
          type="button"
          id="primary"
          data-act={canShare ? "share" : "copy"}
          onClick={canShare ? shareCode : copyCode}
        >
          <Icon name={canShare ? "share" : "copy"} />
          {canShare ? "Share code" : "Copy code"}
        </button>
      </div>
    );
  } else if (view === "joined-empty" || view === "all-done") {
    dock = (
      <div className="dock">
        <Link className="btn-primary" id="primary" to="/goals/new">
          <Icon name="plus" />
          {view === "joined-empty" ? "Create a goal" : "New goal"}
        </Link>
      </div>
    );
  } else if (view === "ready") {
    dock = (
      <div className="dock">
        <button className="btn-primary" type="button" id="primary" data-act="add" onClick={openSheet}>
          <Icon name="plus" />
          Add to a goal
        </button>
      </div>
    );
  }

  // ---------- rooms ----------
  let rooms = null;
  if (view === "loading") {
    rooms = (
      <>
        <section className="room room-trip" aria-hidden="true">
          <span className="sk sk-trip" />
        </section>
        <section className="room room-shop" aria-hidden="true">
          <span className="sk sk-row" />
        </section>
        <section className="room room-goals" aria-hidden="true">
          <div className="sec-head">
            <span className="sk sk-lbl" />
          </div>
          <span className="sk sk-goal" />
          <span className="sk sk-goal" />
        </section>
      </>
    );
  } else if (view === "first-run") {
    rooms = (
      <section className="room room-start" aria-labelledby="h-start">
        <h2 className="sec-title" id="h-start">
          Start now, together later
        </h2>
        <div className="starts">
          <Link className="btn-sec btn-block" to="/goals/new">
            <Icon name="goal" />
            Create a goal
          </Link>
          <Link className="btn-sec btn-block" to="/trips/new">
            <Icon name="map" />
            Plan a trip
          </Link>
          <Link className="btn-sec btn-block" to="/shopping">
            <Icon name="basket" />
            Start a shopping list
          </Link>
        </div>
      </section>
    );
  } else if (data) {
    rooms = (
      <>
        <TripRoom data={data} />
        <ShopRoom left={data.shoppingLeft} />
        {view !== "joined-empty" && (
          <GoalsRoom
            goals={data.goals.filter((g) => !goalDone(g) || justDone.has(g.id))}
            doneCount={doneCount}
            currency={currency}
            members={members}
          />
        )}
      </>
    );
  }

  return (
    <div className="home">
      <div id="masthead" className="masthead">
        {greet}
        {notice}
        {lead}
        {dock}
      </div>
      <Toast ref={toast} onHiddenWithFocus={onToastHidden} />
      <div id="rooms" className="rooms">
        {rooms}
      </div>
      {data && (
        <QuickAddSheet
          open={sheet.open}
          step={sheet.step}
          goal={data.goals.find((g) => g.id === sheet.goalId) ?? null}
          openGoals={openGoals}
          currency={currency}
          onPick={(goalId) => setSheet({ open: true, step: "amount", goalId })}
          onChangeGoal={() => setSheet((s) => ({ ...s, step: "pick" }))}
          onClose={closeSheet}
          onSubmit={commit}
        />
      )}
    </div>
  );
}

/** "K 7 Q M, 4 X P A": read character by character. */
function spellCode(code: string) {
  return code
    .split("-")
    .map((part) => part.split("").join(" "))
    .join(", ");
}

function TripRoom({ data }: { data: HomeData }) {
  const t = nextTrip(data.trips, localToday());
  if (!t) {
    return (
      <section className="room room-trip" aria-labelledby="h-trip">
        <h2 className="vh" id="h-trip">
          Next trip
        </h2>
        <div className="prompt">
          <Icon name="map" />
          <p>No trips yet. Plan your first one.</p>
          <Link className="btn-sec btn-sm" to="/trips/new">
            Plan a trip
          </Link>
        </div>
      </section>
    );
  }
  const now = t.status.kind === "now";
  const big = t.status.kind === "now" ? t.status.day : t.status.kind === "upcoming" ? t.status.daysUntil : 0;
  const small = t.status.kind === "now" ? `of ${t.status.totalDays} days` : plural(big, "day to go", "days to go");
  return (
    <section className="room room-trip">
      <Link className="trip" to="/trips/$tripId" params={{ tripId: t.id }}>
        <div className="trip-count">
          <b className="num">{big}</b>
          <span>{small}</span>
        </div>
        <div className="trip-body">
          <span className="trip-kicker">{now ? "Happening now" : "Next trip"}</span>
          <h2 className="trip-title">{t.title}</h2>
          <span className="trip-meta">
            {t.destination ? `${t.destination} · ` : ""}
            <span className="nowrap">
              {shortDate(t.startDate!)} – {shortDate(t.endDate!)}
            </span>
          </span>
        </div>
      </Link>
    </section>
  );
}

function ShopRoom({ left }: { left: number }) {
  if (left === 0) {
    return (
      <section className="room room-shop" aria-labelledby="h-shop">
        <div className="prompt">
          <Icon name="basket" />
          <div className="prompt-text">
            <h2 className="prompt-title" id="h-shop">
              Shopping
            </h2>
            <p className="row-meta">Nothing on the list yet.</p>
          </div>
          <Link className="btn-sec btn-sm" to="/shopping">
            Add an item
          </Link>
        </div>
      </section>
    );
  }
  return (
    <section className="room room-shop">
      <Link className="row-link" to="/shopping">
        <Icon name="basket" />
        <h2 className="row-title">Shopping</h2>
        <span className="row-meta">{left} left to buy</span>
        <Icon name="chevron-right" />
      </Link>
    </section>
  );
}

function GoalsRoom({
  goals,
  doneCount,
  currency,
  members,
}: {
  goals: HomeGoalView[];
  doneCount: number;
  currency: string;
  members: Map<string, { displayName: string; slot: "a" | "b" }>;
}) {
  const shown = [...goals].sort((a, b) => goalRatio(b) - goalRatio(a)).slice(0, 3);
  const seeAll = (
    <Link className="see-all" to="/goals">
      See all<span className="vh"> goals</span>
    </Link>
  );
  if (shown.length === 0) {
    return (
      <section className="room room-goals" aria-labelledby="h-goals">
        <div className="sec-head">
          <h2 id="h-goals">All goals reached</h2>
          {seeAll}
        </div>
        <div className="prompt">
          <span className="badge-done">
            <Icon name="check" />
            Done
          </span>
          <p>
            You finished {doneCount} {plural(doneCount, "goal", "goals")} together.
          </p>
        </div>
      </section>
    );
  }
  return (
    <section className="room room-goals" aria-labelledby="h-goals">
      <div className="sec-head">
        <h2 id="h-goals">Closest to done</h2>
        {seeAll}
      </div>
      <ul className="goals" role="list">
        {shown.map((g) => (
          <GoalCard key={g.id} goal={g} currency={currency} members={members} />
        ))}
      </ul>
    </section>
  );
}

/** The design system's GoalCard, as Home draws it: the whole card is one link via a stretched title. */
function GoalCard({
  goal: g,
  currency,
  members,
}: {
  goal: HomeGoalView;
  currency: string;
  members: Map<string, { displayName: string; slot: "a" | "b" }>;
}) {
  const isMoney = g.kind === "money";
  const pct = Math.round(goalRatio(g) * 100);
  const done = goalDone(g);
  const num = (minor: number) => formatAmount(minor, currency);
  // A contributor who has left keeps their contributions: shown as a former partner, with a neutral avatar.
  const who: { displayName: string; slot: AvatarSlot } | undefined = g.last
    ? (members.get(g.last.userId) ?? { displayName: FORMER_PARTNER, slot: "former" })
    : undefined;
  let lastText = "";
  if (g.last && who) {
    const when = g.pendingSync ? "waiting to sync" : g.last.note || relativeTime(g.last.at);
    lastText =
      g.last.amount !== null
        ? `${who.displayName} added ${num(g.last.amount).replace(` ${currency}`, "")} · ${when}`
        : `${who.displayName} moved it to ${g.last.percent}% · ${g.pendingSync ? "waiting to sync" : relativeTime(g.last.at)}`;
  }
  return (
    <li className={`goal${done ? " is-done" : ""}`}>
      <div className="goal-cover arch" aria-hidden="true">
        {initial(g.title)}
      </div>
      <div className="goal-body">
        <div className="goal-top">
          <h3 className="goal-title">
            <Link to="/goals/$goalId" params={{ goalId: g.id }}>
              {g.title}
            </Link>
          </h3>
          {done && (
            <span className="badge-done">
              <Icon name="check" />
              Done
            </span>
          )}
        </div>
        <div className="goal-amt num">
          {isMoney ? (
            <>
              <b>{num(g.progress)}</b>
              <span> of {num(g.target ?? 0)}</span>
            </>
          ) : (
            <>
              <b>{g.progress}%</b>
              <span> complete</span>
            </>
          )}
        </div>
        <div
          className="track"
          role="progressbar"
          aria-label={g.title}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-valuetext={isMoney ? `${num(g.progress)} of ${num(g.target ?? 0)}` : `${g.progress}%`}
        >
          <div className="fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="goal-foot">
          {g.last && who ? (
            <>
              <span className={`zm-av zm-av-${who.slot} zm-av-sm`} aria-hidden="true">
                {initial(who.displayName)}
              </span>
              {g.pendingSync && <Icon name="cloud-off" />}
              <span>{lastText}</span>
            </>
          ) : (
            <span>No contributions yet</span>
          )}
        </div>
      </div>
    </li>
  );
}
