import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { TripView } from "../../../../shared/schemas/trips.ts";
import { localToday } from "../../../../shared/trip-days.ts";
import { sections as sectionsOf, status, type SectionKey } from "../../../../shared/trip-plan.ts";
import { Icon } from "../../../components/Icon.tsx";
import { LightBand, TripDoorway } from "../../../components/trips/Bits.tsx";
import { Toast, type ToastHandle } from "../../../components/Toast.tsx";
import { setTitle } from "../../../lib/announce.ts";
import { takeFlash } from "../../../lib/flash.ts";
import { focusHeading, useArrival, useNoFab } from "../../../lib/nav.ts";
import { useOnline } from "../../../lib/online.ts";
import { range, rangeSr, tripsQuery, type TripsData } from "../../../lib/trips.ts";

/**
 * The Trips list (.ux-forge/trips list.js, direction B · Saffron light). Sections in time order (ia D2): Happening
 * now, Coming up, No dates yet, Past; empty sections are left out. The lead trip (the first now, else the first
 * upcoming) spans the row: its doorway sits on the light band, the one saffron block on the screen. Other trips are
 * doorway tiles with a text countdown; past trips are flat rows. Each card is one link whose name is its visible
 * content. States: loading, error, empty, only past, populated, offline (cached data) and stale (a refresh failed).
 * The order is fixed while the list is on screen: a change updates a card in place, a new trip is inserted at its
 * date position, a deleted one goes; it is recomputed on arrival and on a return to the foreground.
 */
export const Route = createFileRoute("/_app/trips/")({ component: TripsList });

/** Where the list was and which card was opened, for the way back (list.js lastOpened, Z.scrollFor). */
const memory: { y: number | null; opened: string | null } = { y: null, opened: null };

const SECTION: Record<SectionKey, string> = {
  now: "Happening now",
  upcoming: "Coming up",
  undated: "No dates yet",
  past: "Past",
};
type Order = Partial<Record<SectionKey, string[]>>;

function computeOrder(trips: TripView[]): Order {
  const o: Order = {};
  for (const s of sectionsOf(trips, localToday())) o[s.key] = s.trips.map((t) => t.id);
  return o;
}

/** The frozen order, minus deleted trips, plus new ones at their date position (list.js insertNew). */
function frozen(order: Order, trips: TripView[]): { key: SectionKey; trips: TripView[] }[] {
  const byId = new Map(trips.map((t) => [t.id, t]));
  const known = new Set(Object.values(order).flat());
  const lists: Order = {};
  for (const k of Object.keys(order) as SectionKey[]) lists[k] = (order[k] ?? []).filter((id) => byId.has(id));
  for (const s of sectionsOf(trips, localToday())) {
    const fresh = s.trips.map((t) => t.id);
    for (const id of fresh) {
      if (known.has(id)) continue;
      const list = lists[s.key] ?? [];
      const before = fresh
        .slice(0, fresh.indexOf(id))
        .filter((x) => list.includes(x))
        .pop();
      list.splice(before ? list.indexOf(before) + 1 : 0, 0, id);
      lists[s.key] = list;
    }
  }
  return (["now", "upcoming", "undated", "past"] as SectionKey[])
    .map((key) => ({ key, trips: (lists[key] ?? []).map((id) => byId.get(id)!).filter(Boolean) }))
    .filter((s) => s.trips.length);
}

function TripsList() {
  const qc = useQueryClient();
  const q = useQuery(tripsQuery);
  const online = useOnline();
  const data = q.data;
  const [order, setOrder] = useState<Order | null>(() => (data ? computeOrder(data.trips) : null));
  const [retrying, setRetrying] = useState(false);
  const toast = useRef<ToastHandle>(null);
  const focusPrimary = useCallback(() => {
    const p = document.getElementById("primary");
    if (p) p.focus({ preventScroll: true });
    else focusHeading();
  }, []);
  // A toast from the screen before (shared.js Z.flash), e.g. "Chefchaouen deleted".
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
    if (data && !order) setOrder(computeOrder(data.trips));
  }, [data, order]);
  // Back in the foreground: statuses and order are recomputed (ia D2, D15).
  useEffect(() => {
    const onVis = () => {
      const d = qc.getQueryData<TripsData>(tripsQuery.queryKey);
      if (document.visibilityState === "visible" && d) setOrder(computeOrder(d.trips));
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [qc]);

  useArrival((first) => {
    if (!first && !(memory.opened && memory.y != null)) focusHeading();
  });
  // Returning from a trip: same scroll position, focus on the card just opened.
  useLayoutEffect(() => {
    if (memory.y == null || !memory.opened) return;
    const y = memory.y;
    const href = memory.opened;
    memory.opened = null;
    window.scrollTo(0, y);
    document.querySelector<HTMLAnchorElement>(`#main a[href="${CSS.escape(href)}"]`)?.focus({ preventScroll: true });
  }, []);

  const trips = useMemo(() => data?.trips ?? [], [data]);
  const empty = view === "ready" && trips.length === 0;
  useEffect(() => {
    setTitle(
      view === "loading"
        ? "Loading"
        : view === "error"
          ? "Can't load Trips"
          : offline
            ? "Trips (offline)"
            : empty
              ? "No trips yet"
              : "Trips",
    );
  }, [view, offline, empty]);
  useEffect(() => {
    const main = document.getElementById("main");
    main?.setAttribute("aria-busy", view === "loading" ? "true" : "false");
    return () => main?.removeAttribute("aria-busy");
  }, [view]);
  useNoFab(view !== "ready");

  const secs = useMemo(() => (data ? frozen(order ?? computeOrder(trips), trips) : []), [data, order, trips]);
  const today = localToday();
  const leadSec = secs.find((s) => s.key === "now" || s.key === "upcoming");
  const lead = leadSec?.trips[0]?.id ?? null;
  const cloudName = data?.images?.cloudName ?? null;
  const covers = !!cloudName && trips.some((t) => t.cover && t.id !== lead);

  async function retry() {
    if (retrying) return;
    setRetrying(true);
    const r = await q.refetch();
    setRetrying(false);
    if (r.data) {
      setOrder(computeOrder(r.data.trips));
      requestAnimationFrame(focusHeading);
    }
  }
  const remember = (href: string) => () => {
    memory.y = window.scrollY;
    memory.opened = href;
  };

  const h1 = (
    <h1 className="title-lg" id="list-h1" tabIndex={-1}>
      Trips
    </h1>
  );
  const primary =
    view === "ready" ? (
      <div className="dock">
        <Link className="btn-primary" id="primary" to="/trips/new">
          <Icon name="plus" />
          {trips.length ? "Plan a trip" : "Plan your first trip"}
        </Link>
      </div>
    ) : null;

  const notice = offline ? (
    <p className="notice list-notice">
      <Icon name="cloud-off" />
      <span>
        You&apos;re offline. Showing the latest data on this phone. Ticking things off and adding places still work and
        sync when you&apos;re back online.
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
    body = (
      <>
        <LoadingStatus />
        <div className="list-sk" aria-hidden="true">
          <span className="sk sk-h2" />
          <div className="sk-lead">
            <span className="sk sk-door" />
            <span className="sk sk-band" />
            <span className="sk sk-line" />
            <span className="sk sk-line short" />
          </div>
          <span className="sk sk-h2" />
          <div className="sk-tiles">
            <span className="sk sk-tile" />
            <span className="sk sk-tile" />
          </div>
        </div>
      </>
    );
  } else if (view === "error") {
    body = (
      <div className="list-error">
        <div role="alert">
          <h2 className="title">Trips didn&apos;t load</h2>
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
        <Icon name="map" />
        <div>
          <h2 className="title">No trips yet. Plan your first one.</h2>
          <p>
            A trip holds your plan, the places you&apos;d like to see and what to pack. Only the title is needed to
            start.
          </p>
        </div>
      </div>
    );
  } else {
    body = (
      <>
        {!lead && !secs.some((s) => s.key === "undated") && (
          <div className="prompt list-empty only-past">
            <Icon name="calendar" />
            <div>
              <h2 className="title">Nothing coming up.</h2>
              <p>Plan your next trip, or look back at the past ones below.</p>
            </div>
          </div>
        )}
        {secs.map((s) => (
          <section key={s.key} className={`trip-sec trip-sec--${s.key}`} aria-labelledby={`h-${s.key}`}>
            <h2 className="sec-title" id={`h-${s.key}`}>
              {SECTION[s.key]}
            </h2>
            {s.key === "past" ? (
              <ul className="past-rows" role="list">
                {s.trips.map((t) => (
                  <PastRow key={t.id} t={t} today={today} cloudName={cloudName} onOpen={remember(`/trips/${t.id}`)} />
                ))}
              </ul>
            ) : (
              <ul className={`trip-tiles${covers ? "" : " no-covers"}`} role="list">
                {s.trips.map((t) =>
                  t.id === lead ? (
                    <LeadCard
                      key={t.id}
                      t={t}
                      today={today}
                      cloudName={cloudName}
                      onOpen={remember(`/trips/${t.id}`)}
                    />
                  ) : (
                    <TileCard
                      key={t.id}
                      t={t}
                      today={today}
                      cloudName={cloudName}
                      onOpen={remember(`/trips/${t.id}`)}
                    />
                  ),
                )}
              </ul>
            )}
          </section>
        ))}
      </>
    );
  }

  return (
    <div className="list-view">
      <div className="list-head">
        {h1}
        {primary}
      </div>
      <Toast ref={toast} onHiddenWithFocus={focusPrimary} />
      {notice}
      <div className="list-body">{body}</div>
    </div>
  );
}

/** "Loading trips", set after a beat so it's announced (list.js #list-status). */
function LoadingStatus() {
  const [text, setText] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setText("Loading trips"), 50);
    return () => clearTimeout(t);
  }, []);
  return (
    <p className="vh" role="status" id="list-status">
      {text}
    </p>
  );
}

function Dates({ t }: { t: TripView }) {
  return (
    <>
      <span aria-hidden="true">{range(t.startDate, t.endDate)}</span>
      <span className="vh">{rangeSr(t.startDate, t.endDate)}</span>
    </>
  );
}
/** "Rif mountains · Sat 21 – Wed 25 Nov", read with commas (list.js meta). */
function Meta({ t }: { t: TripView }) {
  const sep = (
    <>
      <span aria-hidden="true"> · </span>
      <span className="vh">, </span>
    </>
  );
  return (
    <>
      {t.destination}
      {t.destination && t.startDate && sep}
      {t.startDate && <Dates t={t} />}
    </>
  );
}
function statusLine(t: TripView, today: string): string {
  const s = status(t, today);
  if (s.kind === "upcoming") return s.days === 1 ? "Tomorrow" : `in ${s.days} days`;
  if (s.kind === "now") return `Day ${s.day} of ${s.total} · ${s.last ? "Last day" : "Happening now"}`;
  if (s.kind === "undated") return "No dates yet";
  return s.ago === 1 ? "Ended yesterday" : `Ended ${s.ago} days ago`;
}

type CardProps = { t: TripView; today: string; cloudName: string | null; onOpen: () => void };

/** The lead: the doorway on the light band, then the title and where / when. The whole card is one link. */
function LeadCard({ t, today, cloudName, onOpen }: CardProps) {
  return (
    <li className="trip-lead" data-id={t.id}>
      <Link className="trip-card" to="/trips/$tripId" params={{ tripId: t.id }} onClick={onOpen}>
        <div className="lead-door">
          <TripDoorway title={t.title} cover={t.cover} size="lead" cloudName={cloudName} />
        </div>
        <div className="lead-body">
          <LightBand trip={t} today={today} lead />
          <h3 className="lead-title">{t.title}</h3>
          <p className="lead-meta">
            <Meta t={t} />
          </p>
        </div>
      </Link>
    </li>
  );
}

function TileCard({ t, today, cloudName, onOpen }: CardProps) {
  return (
    <li className="trip-tile" data-id={t.id}>
      <Link className="trip-card" to="/trips/$tripId" params={{ tripId: t.id }} onClick={onOpen}>
        <TripDoorway title={t.title} cover={t.cover} size="tile" cloudName={cloudName} />
        <h3 className="tile-title">{t.title}</h3>
        {(t.destination || t.startDate) && (
          <p className="tile-meta">
            <Meta t={t} />
          </p>
        )}
        <p className="tile-status">{statusLine(t, today)}</p>
      </Link>
    </li>
  );
}

function PastRow({ t, today, cloudName, onOpen }: CardProps) {
  return (
    <li className="trip-past" data-id={t.id}>
      <Link className="trip-card" to="/trips/$tripId" params={{ tripId: t.id }} onClick={onOpen}>
        <TripDoorway title={t.title} cover={t.cover} size="row" cloudName={cloudName} />
        <div className="past-body">
          <h3 className="past-title">{t.title}</h3>
          <p className="past-meta">
            <Meta t={t} />
          </p>
        </div>
        <p className="past-ago">{statusLine(t, today)}</p>
      </Link>
    </li>
  );
}
